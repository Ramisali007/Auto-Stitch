/**
 * AWS S3 & Privacy-First Isolated Storage Service for Auto Stitch Virtual Try-On
 * Implements unpredictable object keys, EXIF stripping, magic-byte validation,
 * pre-signed access URLs, and immediate source deletion.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const isS3Configured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    (process.env.AWS_S3_VTO_BUCKET || process.env.AWS_S3_BUCKET_NAME)
  );
};

const getS3Client = () => {
  if (!isS3Configured()) return null;
  try {
    const AWS = require('aws-sdk');
    return new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      signatureVersion: 'v4',
    });
  } catch (err) {
    console.warn('[Storage] AWS SDK unavailable, using isolated storage engine.');
    return null;
  }
};

/**
 * Validate image magic bytes and strip EXIF metadata
 */
const validateAndSanitizeImage = async (bufferOrBase64) => {
  let buffer;
  if (typeof bufferOrBase64 === 'string') {
    if (bufferOrBase64.startsWith('data:image') || bufferOrBase64.startsWith('data:application')) {
      const base64Data = bufferOrBase64.replace(/^data:.*?base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else if (bufferOrBase64.startsWith('http://') || bufferOrBase64.startsWith('https://')) {
      const res = await fetch(bufferOrBase64);
      if (!res.ok) throw new Error(`Failed to load image from URL: ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else if (fs.existsSync(bufferOrBase64)) {
      buffer = fs.readFileSync(bufferOrBase64);
    } else if (bufferOrBase64.startsWith('/Photos/') || bufferOrBase64.startsWith('Photos/')) {
      const cleanPath = bufferOrBase64.replace(/^\/?Photos\//, '');
      const candidates = [
        path.join(__dirname, '../../frontend/public/Photos', cleanPath),
        path.join(__dirname, '../../frontend/Photos', cleanPath),
        path.join(process.cwd(), 'frontend/public/Photos', cleanPath),
        path.join(process.cwd(), 'frontend/Photos', cleanPath),
        path.join(process.cwd(), '../frontend/Photos', cleanPath),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          buffer = fs.readFileSync(p);
          break;
        }
      }
      if (!buffer) {
        throw new Error(`Local photo asset not found: ${bufferOrBase64}`);
      }
    } else if (bufferOrBase64.startsWith('/uploads/') || bufferOrBase64.startsWith('uploads/')) {
      const cleanPath = bufferOrBase64.replace(/^\/?uploads\//, '');
      const candidates = [
        path.join(__dirname, '../uploads', cleanPath),
        path.join(process.cwd(), 'backend/uploads', cleanPath),
        path.join(process.cwd(), 'uploads', cleanPath),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          buffer = fs.readFileSync(p);
          break;
        }
      }
      if (!buffer) {
        throw new Error(`Upload asset not found: ${bufferOrBase64}`);
      }
    } else if (/^[A-Za-z0-9+/=]+$/.test(bufferOrBase64.trim()) && bufferOrBase64.length > 100) {
      buffer = Buffer.from(bufferOrBase64.trim(), 'base64');
    } else {
      throw new Error('Invalid image input source');
    }
  } else if (Buffer.isBuffer(bufferOrBase64)) {
    buffer = bufferOrBase64;
  } else {
    throw new Error('Unsupported image payload format');
  }

  // Magic byte validation
  if (buffer.length < 12) {
    throw new Error('Image file is corrupted or too small');
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error('Unsupported image format. Only JPEG, PNG, and WebP are allowed.');
  }

  // Sanitize with Sharp & Strip EXIF / Device metadata
  const sanitized = await sharp(buffer, { failOnError: false })
    .rotate() // Automatically correct orientation based on EXIF before stripping
    .withMetadata(false) // Strip all EXIF, GPS, camera model tags
    .webp({ quality: 92 })
    .toBuffer();

  const meta = await sharp(sanitized).metadata();
  if ((meta.width && meta.width < 250) || (meta.height && meta.height < 250)) {
    throw new Error('Image resolution too low. Minimum 250x250 pixels required.');
  }

  return {
    buffer: sanitized,
    width: meta.width,
    height: meta.height,
    format: 'webp',
  };
};

/**
 * Generate unpredictable random object key
 */
const generateTempObjectKey = (jobId, type = 'person') => {
  const randomId = crypto.randomBytes(12).toString('hex');
  const prefix = process.env.AWS_S3_VTO_PREFIX || 'vto/temp/';
  return `${prefix}${jobId}/${type}/${randomId}.webp`;
};

/**
 * Upload temporary VTO asset to private S3 or isolated local directory
 */
const uploadTempVtoAsset = async (jobId, type, imageBufferOrInput) => {
  const sanitized = await validateAndSanitizeImage(imageBufferOrInput);
  const objectKey = generateTempObjectKey(jobId, type);
  const s3 = getS3Client();

  if (s3) {
    const bucket = process.env.AWS_S3_VTO_BUCKET || process.env.AWS_S3_BUCKET_NAME;
    await s3
      .putObject({
        Bucket: bucket,
        Key: objectKey,
        Body: sanitized.buffer,
        ContentType: 'image/webp',
        ServerSideEncryption: 'AES256',
        Tagging: 'Retention=TemporaryVTO&AutoExpire=1Hour',
      })
      .promise();

    // Generate short-lived 15-minute signed URL
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: objectKey,
      Expires: parseInt(process.env.VTO_UPLOAD_EXPIRY_SECONDS || '900', 10),
    });

    return { objectKey, url: signedUrl, isLocal: false };
  }

  // Local storage fallback
  const tempDir = path.join(__dirname, '../uploads/vto_temp', jobId, type);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filename = path.basename(objectKey);
  const filepath = path.join(tempDir, filename);
  fs.writeFileSync(filepath, sanitized.buffer);

  const serverBase = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  const relativeUrl = `/uploads/vto_temp/${jobId}/${type}/${filename}`;
  return {
    objectKey,
    filepath,
    url: `${serverBase}${relativeUrl}`,
    isLocal: true,
  };
};

/**
 * Immediately delete temporary asset from S3 or local disk
 */
const deleteVtoAsset = async (objectKeyOrPath) => {
  if (!objectKeyOrPath) return false;

  const s3 = getS3Client();
  if (s3 && !objectKeyOrPath.startsWith('/') && !objectKeyOrPath.includes(':\\')) {
    try {
      const bucket = process.env.AWS_S3_VTO_BUCKET || process.env.AWS_S3_BUCKET_NAME;
      await s3.deleteObject({ Bucket: bucket, Key: objectKeyOrPath }).promise();
      return true;
    } catch (err) {
      console.warn(`[Privacy] S3 delete notice for key ${objectKeyOrPath}:`, err.message);
    }
  }

  // Local path or URL deletion
  let localPath = objectKeyOrPath;
  if (localPath.includes('/uploads/')) {
    const subPath = localPath.split('/uploads/')[1];
    localPath = path.join(__dirname, '../uploads', subPath);
  }

  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
      return true;
    } catch (err) {
      console.warn(`[Privacy] Local delete notice for ${localPath}:`, err.message);
    }
  }

  return false;
};

/**
 * Purge all temporary assets belonging to a try-on job
 */
const purgeJobAssets = async (jobId) => {
  if (!jobId) return;

  const s3 = getS3Client();
  if (s3) {
    try {
      const bucket = process.env.AWS_S3_VTO_BUCKET || process.env.AWS_S3_BUCKET_NAME;
      const prefix = `${process.env.AWS_S3_VTO_PREFIX || 'vto/temp/'}${jobId}/`;
      const listed = await s3.listObjectsV2({ Bucket: bucket, Prefix: prefix }).promise();
      if (listed.Contents && listed.Contents.length > 0) {
        const deleteParams = {
          Bucket: bucket,
          Delete: { Objects: listed.Contents.map((item) => ({ Key: item.Key })) },
        };
        await s3.deleteObjects(deleteParams).promise();
      }
    } catch (err) {
      console.warn(`[Privacy] Notice during job S3 purge (${jobId}):`, err.message);
    }
  }

  // Local directory purge
  const localJobDir = path.join(__dirname, '../uploads/vto_temp', jobId);
  if (fs.existsSync(localJobDir)) {
    try {
      fs.rmSync(localJobDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[Privacy] Notice during local folder purge (${jobId}):`, err.message);
    }
  }
};

/**
 * Backward compatibility wrapper
 */
const uploadToS3OrLocal = async (fileBufferOrPath, filename, contentType = 'image/png') => {
  const sanitized = await validateAndSanitizeImage(fileBufferOrPath);
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const destPath = path.join(uploadDir, filename);
  fs.writeFileSync(destPath, sanitized.buffer);

  const serverBase = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${serverBase}/uploads/${filename}`;
};

module.exports = {
  isS3Configured,
  validateAndSanitizeImage,
  generateTempObjectKey,
  uploadTempVtoAsset,
  deleteVtoAsset,
  purgeJobAssets,
  uploadToS3OrLocal,
};
