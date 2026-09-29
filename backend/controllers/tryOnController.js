/**
 * Virtual Try-On Controller (Production-Grade, AI-Powered, Privacy-First)
 * Implements session creation, authoritative product resolution, rigorous image preprocessing,
 * asynchronous queue handling, idempotency checks, multi-boutique isolation, and instant privacy purges.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');
const TryOnJob = require('../models/TryOnJob');
const vtoQueue = require('../utils/vtoQueue');
const vtoService = require('../vto/VirtualTryOnService');
const {
  normalizeGarmentCategory,
  preprocessPersonImage,
  preprocessGarmentImage,
  selectAuthoritativeGarmentImage,
  parseToBuffer,
} = require('../vto/imagePipeline');
const {
  uploadTempVtoAsset,
  deleteVtoAsset,
  purgeJobAssets,
} = require('../utils/s3Service');

/**
 * @desc    Start VTO Session & Verify Product Binding & Category Support
 * @route   POST /api/vto/session
 * @access  Public / Optional Auth
 */
const createSession = async (req, res) => {
  try {
    const { productId, boutiqueId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required to start a try-on session' });
    }

    // Authoritative Product Resolution
    const product = await Product.findById(productId).populate('boutique', 'name isApproved').lean();
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Selected garment product not found or inactive' });
    }

    // Category Taxonomy & Support Verification
    const categoryInfo = normalizeGarmentCategory(product);
    if (!categoryInfo.isSupported) {
      return res.status(400).json({
        success: false,
        code: 'UNSUPPORTED_CATEGORY',
        message: categoryInfo.reason || 'This garment category is not supported for Virtual Try-On.',
      });
    }

    const assignedBoutiqueId = product.boutique?._id || boutiqueId;
    const jobId = `vto_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const sessionToken = req.headers['x-vto-session'] || crypto.randomBytes(16).toString('hex');

    const job = await TryOnJob.create({
      jobId,
      user: req.user?._id || null,
      sessionToken,
      product: product._id,
      boutique: assignedBoutiqueId,
      status: 'pending',
      category: categoryInfo.category,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour TTL
    });

    const primaryImage = selectAuthoritativeGarmentImage(product);

    res.status(201).json({
      success: true,
      jobId: job.jobId,
      sessionToken,
      category: categoryInfo.category,
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        image: primaryImage,
        boutique: product.boutique?.name || 'Partner Boutique',
      },
    });
  } catch (error) {
    console.error('[VTO Session Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to initiate try-on session', error: error.message });
  }
};

/**
 * @desc    Submit Customer Photo & Enqueue Asynchronous VTO Job
 * @route   POST /api/vto/jobs
 * @access  Public / Optional Auth
 */
const createJob = async (req, res) => {
  try {
    const { jobId, userPhoto, fitStyle = 'Tailored', idempotencyKey } = req.body;

    if (!jobId || !userPhoto) {
      return res.status(400).json({
        success: false,
        message: 'jobId and userPhoto are required',
      });
    }

    const job = await TryOnJob.findOne({ jobId }).populate('product');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Try-on session expired or invalid' });
    }

    // IDOR Protection: Validate Ownership
    if (req.user?._id && job.user && job.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to submit to this try-on job' });
    }

    // Step 1: Preprocess & Validate Customer Image
    let sanitizedPerson;
    try {
      sanitizedPerson = await preprocessPersonImage(userPhoto);
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        code: valErr.code || 'INVALID_PERSON_IMAGE',
        message: valErr.message,
      });
    }

    // Step 2: Resolve Authoritative Garment Buffer
    const garmentSrc = selectAuthoritativeGarmentImage(job.product);
    let sanitizedGarment;
    try {
      sanitizedGarment = await preprocessGarmentImage(garmentSrc, job.product);
    } catch (gErr) {
      return res.status(400).json({
        success: false,
        code: gErr.code || 'INVALID_GARMENT_IMAGE',
        message: gErr.message,
      });
    }

    // Step 3: Idempotency & Duplicate Prevention
    const imageHash = crypto.createHash('sha256').update(sanitizedPerson.buffer).digest('hex').slice(0, 16);
    const resolvedIdempotency = idempotencyKey || `${job.product._id}_${imageHash}`;

    // Check if an existing completed job matches this exact photo and product in last 15 minutes
    const recentJob = await TryOnJob.findOne({
      product: job.product._id,
      idempotencyKey: resolvedIdempotency,
      status: 'completed',
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });

    if (recentJob && recentJob.resultUrl) {
      console.log(`[VTO Controller] Idempotent hit: Reusing result from Job ${recentJob.jobId}`);
      job.status = 'completed';
      job.resultUrl = recentJob.resultUrl;
      job.modelVersion = recentJob.modelVersion;
      job.completedAt = new Date();
      await job.save();

      return res.status(200).json({
        success: true,
        message: 'Reused cached high-fidelity try-on result.',
        jobId: job.jobId,
        status: 'completed',
        resultUrl: job.resultUrl,
      });
    }

    // Step 4: Upload Temporary Private Asset
    const savedPerson = await uploadTempVtoAsset(job.jobId, 'person', sanitizedPerson.buffer);
    job.personObjectKey = savedPerson.objectKey;
    job.status = 'pending';
    job.idempotencyKey = resolvedIdempotency;
    await job.save();

    // Step 5: Enqueue into Async Queue
    await vtoQueue.enqueue(job.jobId, sanitizedPerson.buffer, sanitizedGarment.buffer, {
      category: job.category,
      garmentName: job.product?.name || 'Luxury Garment',
      fitStyle,
      metadata: {
        boutiqueId: job.boutique,
        productId: job.product._id,
        userId: job.user,
      },
    });

    res.status(202).json({
      success: true,
      message: 'Photo verified. AI Virtual Try-On queued for neural generation.',
      jobId: job.jobId,
      status: 'pending',
    });
  } catch (error) {
    console.error('[VTO Job Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process try-on request', error: error.message });
  }
};

/**
 * @desc    Get Try-On Job Status & Generated Result (with IDOR check)
 * @route   GET /api/vto/jobs/:jobId
 * @access  Public / Optional Auth
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const sessionToken = req.headers['x-vto-session'];

    const job = await TryOnJob.findOne({ jobId }).populate('product', 'name images price category');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found or expired' });
    }

    // IDOR Protection Check
    if (req.user?._id && job.user && job.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this try-on result' });
    } else if (!req.user && job.sessionToken && sessionToken && job.sessionToken !== sessionToken) {
      return res.status(403).json({ success: false, message: 'Invalid session authorization' });
    }

    res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      resultUrl: job.status === 'completed' ? job.resultUrl : null,
      modelVersion: job.modelVersion,
      failureCode: job.failureCode || null,
      errorDescription: job.errorDescription || null,
      product: job.product,
      expiresAt: job.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Cancel Try-On Job & Immediately Purge Temporary Assets
 * @route   DELETE /api/vto/jobs/:jobId
 * @access  Public / Optional Auth
 */
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const sessionToken = req.headers['x-vto-session'];

    const job = await TryOnJob.findOne({ jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // IDOR check
    if (req.user?._id && job.user && job.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await vtoQueue.cancel(jobId);
    await purgeJobAssets(jobId);

    res.json({
      success: true,
      message: 'Try-on job cancelled and temporary processing files purged from server.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get catalog products for in-studio try-on
 * @route   GET /api/vto/catalog
 * @access  Public
 */
const getTryOnCatalog = async (req, res) => {
  try {
    const products = await Product.find({ status: 'approved', isActive: true, tryOnEnabled: true })
      .populate('boutique', 'name logo')
      .select('name category price discountPrice images material sizes boutique')
      .sort({ views: -1, createdAt: -1 })
      .limit(24)
      .lean();

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch catalog', error: error.message });
  }
};

/**
 * @desc    Direct Try-On Processing via Active AI Provider
 * @route   POST /api/vto/process
 * @access  Public
 */
const processTryOn = async (req, res) => {
  try {
    const { userPhoto, garmentImage, garmentName, category = 'tops', fitStyle = 'Tailored' } = req.body;

    if (!userPhoto || !garmentImage) {
      return res.status(400).json({
        success: false,
        message: 'Both user photo and garment image are required',
      });
    }

    const sanitizedPerson = await preprocessPersonImage(userPhoto);
    const sanitizedGarment = await preprocessGarmentImage(garmentImage);

    const tempJobId = `sync_${Date.now()}`;
    const categoryInfo = normalizeGarmentCategory(category);

    const result = await vtoService.execute({
      personBuffer: sanitizedPerson.buffer,
      garmentBuffer: sanitizedGarment.buffer,
      category: categoryInfo.category,
      garmentName: garmentName || 'Luxury Garment',
      fitStyle,
    });

    const savedResult = await uploadTempVtoAsset(tempJobId, 'result', result.buffer);

    res.json({
      success: true,
      message: `AI Virtual Try-On generated via ${result.provider}`,
      resultImage: savedResult.url,
      provider: result.provider,
      model: result.model,
      category: categoryInfo.category,
      fitStyle,
    });
  } catch (error) {
    console.error('[Instant VTO Error]:', error.message);
    res.status(error.code === 'INVALID_PERSON_IMAGE' ? 400 : 500).json({
      success: false,
      code: error.code || 'PROVIDER_GENERATION_FAILED',
      message: error.message || 'Failed to generate virtual try-on',
    });
  }
};

/**
 * @desc    Check VTO Provider Health & Readiness
 * @route   GET /api/vto/health
 * @access  Public
 */
const getProviderHealth = async (req, res) => {
  try {
    const health = await vtoService.getHealth();
    res.json({ success: true, ...health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Stream Try-On Render as Direct Attachment (Bypasses browser inline rendering)
 * @route   GET /api/vto/download
 * @access  Public
 */
const downloadRender = async (req, res) => {
  try {
    const { url, filename = `auto-stitch-tryon-${Date.now()}.png`, jobId } = req.query;

    let targetUrl = url;
    if (jobId && !targetUrl) {
      const job = await TryOnJob.findOne({ jobId });
      if (job && job.resultUrl) {
        targetUrl = job.resultUrl;
      }
    }

    if (!targetUrl) {
      return res.status(400).json({ success: false, message: 'Image URL or Job ID is required' });
    }

    const cleanFilename = (filename || 'auto-stitch-tryon.png').replace(/[^a-zA-Z0-9._-]/g, '_');

    // 1. If it's a local file upload on disk
    if (targetUrl.includes('/uploads/')) {
      const subPath = targetUrl.split('/uploads/')[1];
      const filePath = path.join(__dirname, '../uploads', subPath);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
        res.setHeader('Content-Type', 'image/png');
        return res.sendFile(filePath);
      }
    }

    // 2. If it's a base64 data URI
    if (targetUrl.startsWith('data:image/')) {
      const base64Data = targetUrl.replace(/^data:.*?base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // 3. Remote URL (Cloudinary / S3 / external)
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Failed to fetch remote image' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('[Download Render Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to download image', error: error.message });
  }
};

module.exports = {
  createSession,
  createJob,
  getJobStatus,
  cancelJob,
  getTryOnCatalog,
  processTryOn,
  getProviderHealth,
  downloadRender,
};
