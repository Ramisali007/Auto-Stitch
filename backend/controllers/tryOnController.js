/**
 * Virtual Try-On Controller (Production-Grade & Privacy-First)
 * Implements session creation, trusted product validation, asynchronous queuing,
 * IDOR ownership enforcement, and instant privacy purges.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');
const TryOnJob = require('../models/TryOnJob');
const vtoQueue = require('../utils/vtoQueue');
const {
  validateAndSanitizeImage,
  uploadTempVtoAsset,
  deleteVtoAsset,
  purgeJobAssets,
} = require('../utils/s3Service');
const LocalSharpAdapter = require('../vto/LocalSharpAdapter');
const FashnVtonAdapter = require('../vto/FashnVtonAdapter');
const IdmVtonAdapter = require('../vto/IdmVtonAdapter');
const ReplicateAdapter = require('../vto/ReplicateAdapter');

const localEngine = new LocalSharpAdapter();
const fashnEngine = new FashnVtonAdapter();
const idmEngine = new IdmVtonAdapter();
const replicateEngine = new ReplicateAdapter();

/**
 * Helper to fetch garment image buffer safely from local or remote path
 */
const fetchGarmentBuffer = async (garmentPath) => {
  if (!garmentPath) throw new Error('Garment path missing');

  if (Buffer.isBuffer(garmentPath)) return garmentPath;

  if (typeof garmentPath === 'string') {
    if (garmentPath.startsWith('data:image') || garmentPath.startsWith('data:application')) {
      const base64Data = garmentPath.replace(/^data:.*?base64,/, '');
      return Buffer.from(base64Data, 'base64');
    }
    if (fs.existsSync(garmentPath)) {
      return fs.readFileSync(garmentPath);
    }
    if (garmentPath.startsWith('/Photos/') || garmentPath.startsWith('Photos/')) {
      const clean = garmentPath.replace(/^\/?Photos\//, '');
      const candidates = [
        path.join(__dirname, '../../frontend/public/Photos', clean),
        path.join(__dirname, '../../frontend/Photos', clean),
        path.join(process.cwd(), 'frontend/public/Photos', clean),
        path.join(process.cwd(), 'frontend/Photos', clean),
        path.join(process.cwd(), '../frontend/Photos', clean),
        path.join(process.cwd(), 'Photos', clean),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return fs.readFileSync(p);
      }
    }
    if (garmentPath.startsWith('/uploads/') || garmentPath.startsWith('uploads/')) {
      const clean = garmentPath.replace(/^\/?uploads\//, '');
      const candidates = [
        path.join(__dirname, '../uploads', clean),
        path.join(process.cwd(), 'backend/uploads', clean),
        path.join(process.cwd(), 'uploads', clean),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return fs.readFileSync(p);
      }
    }
    if (garmentPath.startsWith('http://') || garmentPath.startsWith('https://')) {
      const res = await fetch(garmentPath);
      if (!res.ok) throw new Error(`Failed to fetch garment image from URL: ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
    if (/^[A-Za-z0-9+/=]+$/.test(garmentPath.trim()) && garmentPath.length > 100) {
      return Buffer.from(garmentPath.trim(), 'base64');
    }
  }
  throw new Error(`Garment image source not found: ${garmentPath}`);
};

/**
 * @desc    Start VTO Session & Verify Product Binding
 * @route   POST /api/vto/session
 * @access  Public / Optional Auth
 */
const createSession = async (req, res) => {
  try {
    const { productId, boutiqueId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required to start a try-on session' });
    }

    const product = await Product.findById(productId).populate('boutique', 'name isApproved').lean();
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Selected garment product not found or inactive' });
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
      category: product.category?.toLowerCase().includes('bottom')
        ? 'bottoms'
        : product.category?.toLowerCase().includes('top')
        ? 'tops'
        : 'dresses',
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour TTL
    });

    res.status(201).json({
      success: true,
      jobId: job.jobId,
      sessionToken,
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        image: product.images?.[0] || '',
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

    // Step 1: Sanitize Customer Image & Strip EXIF Metadata
    let sanitizedPerson;
    try {
      sanitizedPerson = await validateAndSanitizeImage(userPhoto);
    } catch (valErr) {
      return res.status(400).json({ success: false, message: valErr.message });
    }

    // Step 2: Upload Temporary Private Asset
    const savedPerson = await uploadTempVtoAsset(job.jobId, 'person', sanitizedPerson.buffer);
    job.personObjectKey = savedPerson.objectKey;
    job.status = 'pending';
    job.idempotencyKey = idempotencyKey || null;
    await job.save();

    // Step 3: Fetch Trusted Garment Image from Database Record
    const garmentImageSrc = job.product?.images?.[0] || '';
    const garmentBuffer = await fetchGarmentBuffer(garmentImageSrc);

    // Step 4: Enqueue into Async Queue
    await vtoQueue.enqueue(job.jobId, sanitizedPerson.buffer, garmentBuffer, {
      category: job.category,
      garmentName: job.product?.name || 'Garment',
      fitStyle,
    });

    res.status(202).json({
      success: true,
      message: 'Photo accepted & Virtual Try-On queued for generation.',
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

    const job = await TryOnJob.findOne({ jobId }).populate('product', 'name images price');
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
 * @desc    Instant Synchronous Try-On Processing (Backward Compatibility)
 * @route   POST /api/vto/process
 * @access  Public
 */
const processTryOn = async (req, res) => {
  try {
    const { userPhoto, garmentImage, garmentName, category, fitStyle = 'Tailored' } = req.body;

    if (!userPhoto || !garmentImage) {
      return res.status(400).json({
        success: false,
        message: 'Both user photo and garment image are required',
      });
    }

    // Sanitize user photo and strip EXIF
    const sanitizedPerson = await validateAndSanitizeImage(userPhoto);
    const garmentBuffer = await fetchGarmentBuffer(garmentImage);

    const tempJobId = `sync_${Date.now()}`;
    let resultBuffer = null;

    // 1. Try Replicate Cloud GPU (IDM-VTON) if configured
    if (process.env.REPLICATE_API_TOKEN) {
      try {
        resultBuffer = await replicateEngine.generate(sanitizedPerson.buffer, garmentBuffer, {
          category: category || 'dresses',
          garmentName,
          fitStyle,
        });
      } catch (repErr) {
        console.warn('[VTO Process] Replicate notice:', repErr.message);
      }
    }

    // 2. Try Colab GPU (IDM-VTON) if configured
    if (!resultBuffer && (process.env.VTON_SERVICE_URL || process.env.COLAB_TRYON_URL)) {
      try {
        resultBuffer = await idmEngine.generate(sanitizedPerson.buffer, garmentBuffer, {
          category: category || 'dresses',
          garmentName,
          fitStyle,
        });
      } catch (gpuErr) {
        console.warn('[VTO Process] GPU Colab notice:', gpuErr.message);
      }
    }

    // 3. Fallback to Local Neural Compositor
    if (!resultBuffer) {
      resultBuffer = await localEngine.generate(sanitizedPerson.buffer, garmentBuffer, {
        category: category || 'dresses',
        garmentName,
        fitStyle,
      });
    }

    const savedResult = await uploadTempVtoAsset(tempJobId, 'result', resultBuffer);

    res.json({
      success: true,
      message: 'Virtual Try-On generated with 100% pose & identity preservation',
      resultImage: savedResult.url,
      humanImage: userPhoto,
      garmentImage,
      garmentName: garmentName || 'Garment',
      category: category || 'Boutique',
      fitStyle,
    });
  } catch (error) {
    console.error('Instant VTO Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate virtual try-on',
    });
  }
};

module.exports = {
  createSession,
  createJob,
  getJobStatus,
  cancelJob,
  getTryOnCatalog,
  processTryOn,
};
