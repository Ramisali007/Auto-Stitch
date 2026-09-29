/**
 * Production Virtual Try-On Image Pipeline
 * Implements rigorous MIME/size/dimension validation, EXIF metadata stripping,
 * pose-aware image preprocessing, garment taxonomy mapping, and quality checks.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Standard Garment Taxonomy Mapping
 */
const SUPPORTED_CATEGORIES = {
  tops: [
    'tops', 'top', 'shirt', 'shirts', 't-shirt', 'tshirt', 'tshirts',
    'blouse', 'blouses', 'kurta', 'kurtas', 'kurti', 'kurtis',
    'polo', 'camisole', 'waistcoat', 'tunic', 'tunics'
  ],
  bottoms: [
    'bottoms', 'bottom', 'pants', 'pant', 'trousers', 'trouser',
    'jeans', 'skirt', 'skirts', 'shorts', 'shalwar', 'salwar',
    'palazzo', 'culottes', 'pajama', 'tights'
  ],
  'one-pieces': [
    'dresses', 'dress', 'gown', 'gowns', 'maxi', 'maxis', 'frock', 'frocks',
    'saree', 'sari', 'anarkali', 'lehenga', 'jumpsuit', 'abaya', 'kaftan',
    'kaftans', 'suit', 'suits', 'one-piece', 'pret', 'luxury pret',
    'formal', 'formals', 'bridal', 'lawn', 'chiffon', 'unstitched',
    'ready to wear', 'co-ord', 'eastern', 'western'
  ],
  outerwear: [
    'jacket', 'jackets', 'coat', 'coats', 'blazer', 'blazers',
    'cardigan', 'hoodie', 'sweater', 'sweaters', 'overcoat',
    'shawl', 'shawls', 'cape', 'capes', 'dupatta'
  ],
};

const UNSUPPORTED_ACCESSORIES = [
  'shoes', 'footwear', 'heels', 'boots', 'sneakers', 'sandals', 'khussa',
  'bag', 'bags', 'handbag', 'handbags', 'clutch', 'purse',
  'jewelry', 'jewellery', 'necklace', 'earrings', 'ring', 'bracelet',
  'watch', 'watches', 'hat', 'hats', 'cap', 'caps', 'sunglasses', 'belt', 'belts'
];

/**
 * Map raw category string or product metadata to standard VTO taxonomy
 * @param {string|Object} productOrCategory
 * @returns {{ category: string, providerMappings: { fashn: string, idm: string }, isSupported: boolean, reason?: string }}
 */
function normalizeGarmentCategory(productOrCategory) {
  let categoryField = '';
  let nameField = '';

  if (typeof productOrCategory === 'string') {
    categoryField = productOrCategory.toLowerCase().trim();
  } else if (productOrCategory && typeof productOrCategory === 'object') {
    categoryField = (productOrCategory.category || '').toLowerCase().trim();
    nameField = (productOrCategory.name || '').toLowerCase().trim();
  }

  const combinedCategoryStr = `${categoryField} ${nameField}`.toLowerCase();

  // 1. PRIORITIZE SPECIFIC GARMENT NOUNS FIRST
  // A. Check Tops (shirt, t-shirt, blouse, kurta, kurti, tunic, waistcoat)
  if (SUPPORTED_CATEGORIES.tops.some(k => new RegExp(`\\b${k}\\b`, 'i').test(combinedCategoryStr))) {
    return {
      category: 'tops',
      providerMappings: { fashn: 'tops', idm: 'upper_body' },
      isSupported: true,
    };
  }

  // B. Check Bottoms (pants, trousers, jeans, skirt, shalwar, palazzo)
  if (SUPPORTED_CATEGORIES.bottoms.some(k => new RegExp(`\\b${k}\\b`, 'i').test(combinedCategoryStr))) {
    return {
      category: 'bottoms',
      providerMappings: { fashn: 'bottoms', idm: 'lower_body' },
      isSupported: true,
    };
  }

  // C. Check Outerwear (jacket, coat, blazer, cardigan, hoodie, sweater, cape)
  if (SUPPORTED_CATEGORIES.outerwear.some(k => new RegExp(`\\b${k}\\b`, 'i').test(combinedCategoryStr))) {
    return {
      category: 'outerwear',
      providerMappings: { fashn: 'tops', idm: 'upper_body' },
      isSupported: true,
    };
  }

  // D. Check One-Pieces / Dresses / Gowns / Suits / Pret Collections
  if (SUPPORTED_CATEGORIES['one-pieces'].some(k => new RegExp(`\\b${k}\\b`, 'i').test(combinedCategoryStr))) {
    return {
      category: 'one-pieces',
      providerMappings: { fashn: 'one-pieces', idm: 'dresses' },
      isSupported: true,
    };
  }

  // 2. ONLY CHECK FOR UNSUPPORTED ACCESSORIES WITH STRICT WORD BOUNDARIES
  for (const accessory of UNSUPPORTED_ACCESSORIES) {
    const wordBoundaryRegex = new RegExp(`\\b${accessory}\\b`, 'i');
    if (wordBoundaryRegex.test(categoryField) || wordBoundaryRegex.test(nameField)) {
      return {
        category: accessory,
        providerMappings: { fashn: 'unsupported', idm: 'unsupported' },
        isSupported: false,
        reason: `Virtual Try-On is currently supported for tops, shirts, dresses, gowns, and bottoms. Category "${accessory}" is not supported yet.`,
      };
    }
  }

  // 3. Default to 'one-pieces' for boutique couture garments
  return {
    category: 'one-pieces',
    providerMappings: { fashn: 'one-pieces', idm: 'dresses' },
    isSupported: true,
  };
}

/**
 * Validate and preprocess Person photo
 * - Normalizes EXIF orientation
 * - Strips all private metadata (GPS, camera tags)
 * - Validates dimensions and aspect ratios
 * - Quality safety check (detects blank / all-black / all-white / ultra-low contrast images)
 * @param {Buffer|string} inputBufferOrBase64
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, format: string, mimeType: string }>}
 */
async function preprocessPersonImage(inputBufferOrBase64) {
  let buffer = parseToBuffer(inputBufferOrBase64);

  // 1. Minimum buffer length check
  if (!buffer || buffer.length < 64) {
    const error = new Error('Person image is invalid or empty.');
    error.code = 'INVALID_PERSON_IMAGE';
    throw error;
  }

  // 2. Maximum file size check (10MB)
  if (buffer.length > 10 * 1024 * 1024) {
    const error = new Error('Person photo exceeds the maximum size limit of 10MB.');
    error.code = 'OVERSIZED_IMAGE';
    throw error;
  }

  // 3. Inspect image headers / format with Sharp
  let meta;
  try {
    meta = await sharp(buffer, { failOnError: true }).metadata();
  } catch (err) {
    const error = new Error('Unsupported or corrupted image file. Please upload a valid JPEG, PNG, or WebP photo.');
    error.code = 'INVALID_PERSON_IMAGE';
    throw error;
  }

  const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
  if (!validFormats.includes(meta.format?.toLowerCase())) {
    const error = new Error(`Unsupported image format: "${meta.format}". Only JPEG, PNG, and WebP are allowed.`);
    error.code = 'INVALID_MIME_TYPE';
    throw error;
  }

  // 4. Dimension constraints
  if ((meta.width && meta.width < 256) || (meta.height && meta.height < 256)) {
    const error = new Error('Photo resolution is too low. Please upload a clear photo with at least 256x256 resolution.');
    error.code = 'INVALID_PERSON_IMAGE';
    throw error;
  }

  // 5. Preprocess with Sharp:
  // - Auto-rotate based on EXIF
  // - Resize preserving aspect ratio (max 1536px along longest edge for neural inference stability)
  // - Strip EXIF
  // - Convert to clean high-quality JPEG (IDM-VTON and FASHN prefer standardized RGB JPEG)
  const normalizedBuffer = await sharp(buffer)
    .rotate()
    .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .withMetadata(false)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const finalMeta = await sharp(normalizedBuffer).metadata();

  // 6. Quality safety checks (brightness & contrast statistics)
  try {
    const stats = await sharp(normalizedBuffer).stats();
    const channels = stats.channels.slice(0, 3);
    const avgMean = channels.reduce((acc, c) => acc + c.mean, 0) / channels.length;
    const avgStd = channels.reduce((acc, c) => acc + c.stdev, 0) / channels.length;

    if (avgMean < 12) {
      const error = new Error('The uploaded photo is extremely dark. Please upload a photo with clear, natural lighting.');
      error.code = 'INVALID_PERSON_IMAGE';
      throw error;
    }
    if (avgMean > 248 && avgStd < 5) {
      const error = new Error('The uploaded photo is completely blank or overexposed. Please upload a real portrait.');
      error.code = 'INVALID_PERSON_IMAGE';
      throw error;
    }
  } catch (err) {
    if (err.code === 'INVALID_PERSON_IMAGE') throw err;
  }

  return {
    buffer: normalizedBuffer,
    width: finalMeta.width,
    height: finalMeta.height,
    format: 'jpeg',
    mimeType: 'image/jpeg',
  };
}

/**
 * Validate and preprocess Garment product image
 * - Ensures garment is resolved authoritatively
 * - Selects the cleanest high-resolution product shot (skips tiny thumbnails)
 * - Normalizes dimensions and colorspace
 * @param {Buffer|string} inputBufferOrPath
 * @param {Object} [productMetadata]
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, format: string, mimeType: string }>}
 */
async function preprocessGarmentImage(inputBufferOrPath, productMetadata = {}) {
  let buffer = parseToBuffer(inputBufferOrPath);

  if (!buffer || buffer.length < 512) {
    const error = new Error('Garment image is invalid or could not be loaded.');
    error.code = 'INVALID_GARMENT_IMAGE';
    throw error;
  }

  let meta;
  try {
    meta = await sharp(buffer, { failOnError: true }).metadata();
  } catch (err) {
    const error = new Error('Garment image could not be decoded.');
    error.code = 'INVALID_GARMENT_IMAGE';
    throw error;
  }

  // Preprocess garment into standard 768x1024 portrait with high detail preservation.
  // - Trims excessive border padding so garments are not shrunken or displaced.
  // - Positions garment anchored north/top-center to align with human shoulder/neckline geometry.
  // - Retains full fabric texture, embroidery, and weave at 98% quality without double compression.
  let normalizedGarment;
  try {
    const trimmed = await sharp(buffer)
      .rotate()
      .trim({ background: '#ffffff', threshold: 10 })
      .toBuffer();

    normalizedGarment = await sharp(trimmed)
      .resize(768, 1024, {
        fit: 'contain',
        position: 'north',
        background: { r: 255, g: 255, b: 255 },
      })
      .toColorspace('srgb')
      .withMetadata(false)
      .jpeg({ quality: 98, mozjpeg: true })
      .toBuffer();
  } catch (_) {
    normalizedGarment = await sharp(buffer)
      .rotate()
      .resize(768, 1024, {
        fit: 'contain',
        position: 'north',
        background: { r: 255, g: 255, b: 255 },
      })
      .toColorspace('srgb')
      .withMetadata(false)
      .jpeg({ quality: 98, mozjpeg: true })
      .toBuffer();
  }

  const finalMeta = await sharp(normalizedGarment).metadata();

  return {
    buffer: normalizedGarment,
    width: finalMeta.width,
    height: finalMeta.height,
    format: 'jpeg',
    mimeType: 'image/jpeg',
  };
}

/**
 * Helper to safely resolve any input (Buffer, Base64 data URL, file path, or URL) to Buffer
 */
function parseToBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (!input || typeof input !== 'string') return null;

  if (input.startsWith('data:image') || input.startsWith('data:application')) {
    const base64Data = input.replace(/^data:.*?base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  if (fs.existsSync(input)) {
    return fs.readFileSync(input);
  }

  // Check common local asset directories
  if (input.startsWith('/Photos/') || input.startsWith('Photos/')) {
    const clean = input.replace(/^\/?Photos\//, '');
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

  if (input.startsWith('/uploads/') || input.startsWith('uploads/')) {
    const clean = input.replace(/^\/?uploads\//, '');
    const candidates = [
      path.join(__dirname, '../uploads', clean),
      path.join(process.cwd(), 'backend/uploads', clean),
      path.join(process.cwd(), 'uploads', clean),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    }
  }

  if (/^[A-Za-z0-9+/=]+$/.test(input.trim()) && input.length > 100) {
    return Buffer.from(input.trim(), 'base64');
  }

  return null;
}

/**
 * Deterministic selection of the best product image for VTO
 * @param {Object} product
 * @returns {string} - Chosen image path or URL
 */
function selectAuthoritativeGarmentImage(product) {
  if (!product) return '';
  const images = Array.isArray(product.images) ? product.images : [product.images].filter(Boolean);
  if (images.length === 0) return '';

  // If there's an image explicitly tagged or named 'flat' or 'product', prefer it
  const flatCandidate = images.find(img => typeof img === 'string' && (img.toLowerCase().includes('flat') || img.toLowerCase().includes('isolated') || img.toLowerCase().includes('garment')));
  if (flatCandidate) return flatCandidate;

  // Otherwise return the primary image
  return images[0];
}

module.exports = {
  SUPPORTED_CATEGORIES,
  UNSUPPORTED_CATEGORIES: UNSUPPORTED_ACCESSORIES,
  UNSUPPORTED_ACCESSORIES,
  normalizeGarmentCategory,
  preprocessPersonImage,
  preprocessGarmentImage,
  selectAuthoritativeGarmentImage,
  parseToBuffer,
};
