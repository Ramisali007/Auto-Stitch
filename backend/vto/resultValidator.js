/**
 * Production Result Quality & Safety Net
 * Validates that the AI-generated Virtual Try-On output is a genuine, decodable,
 * non-corrupt image before persisting or presenting it to the user.
 */

const sharp = require('sharp');

/**
 * Validate generated try-on output buffer
 * @param {Buffer} resultBuffer
 * @param {Buffer} [personBuffer]
 * @param {Buffer} [garmentBuffer]
 * @returns {Promise<{ isValid: boolean, buffer: Buffer, width: number, height: number, error?: string }>}
 */
async function validateTryOnResult(resultBuffer, personBuffer = null, garmentBuffer = null) {
  if (!resultBuffer || !Buffer.isBuffer(resultBuffer) || resultBuffer.length < 64) {
    const error = new Error('VTO generation returned an empty or incomplete response payload.');
    error.code = 'RESULT_VALIDATION_FAILED';
    throw error;
  }

  // 1. Decodability check
  let meta;
  try {
    meta = await sharp(resultBuffer, { failOnError: true }).metadata();
  } catch (err) {
    const error = new Error('AI engine returned a corrupt or unreadable image buffer.');
    error.code = 'RESULT_VALIDATION_FAILED';
    throw error;
  }

  // 2. Minimum dimension checks
  if (!meta.width || meta.width < 200 || !meta.height || meta.height < 200) {
    const error = new Error(`Generated try-on resolution is too small (${meta.width}x${meta.height}).`);
    error.code = 'RESULT_VALIDATION_FAILED';
    throw error;
  }

  // 3. Ensure proper RGB colorspace and re-encode to high quality webp for fast delivery
  const finalBuffer = await sharp(resultBuffer)
    .toColorspace('srgb')
    .webp({ quality: 92 })
    .toBuffer();

  const finalMeta = await sharp(finalBuffer).metadata();

  return {
    isValid: true,
    buffer: finalBuffer,
    width: finalMeta.width,
    height: finalMeta.height,
  };
}

module.exports = {
  validateTryOnResult,
};
