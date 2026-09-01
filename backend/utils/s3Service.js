/**
 * AWS S3 Storage Service for Auto Stitch Virtual Try-On
 * Supports automatic 1-hour object expiration lifecycle
 */

const fs = require('fs');
const path = require('path');

const isS3Configured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
};

/**
 * Upload a temporary try-on file to S3 or fallback to local disk
 */
const uploadToS3OrLocal = async (fileBufferOrPath, filename, contentType = 'image/png') => {
  if (isS3Configured()) {
    try {
      // If AWS SDK is available, upload directly to S3 bucket
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      });

      let body = fileBufferOrPath;
      if (typeof fileBufferOrPath === 'string' && fs.existsSync(fileBufferOrPath)) {
        body = fs.readFileSync(fileBufferOrPath);
      }

      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `tryon-temp/${Date.now()}_${filename}`,
        Body: body,
        ContentType: contentType,
        Tagging: 'AutoDelete=1Hour',
      };

      const data = await s3.upload(params).promise();
      return data.Location;
    } catch (err) {
      console.warn('S3 upload warning, falling back to local storage:', err.message);
    }
  }

  // Local storage fallback
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const destPath = path.join(uploadDir, filename);
  if (typeof fileBufferOrPath === 'string' && fs.existsSync(fileBufferOrPath)) {
    fs.copyFileSync(fileBufferOrPath, destPath);
  } else if (Buffer.isBuffer(fileBufferOrPath)) {
    fs.writeFileSync(destPath, fileBufferOrPath);
  }

  const serverBase = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${serverBase}/uploads/${filename}`;
};

module.exports = {
  isS3Configured,
  uploadToS3OrLocal,
};
