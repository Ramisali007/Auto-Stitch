const fs = require('fs');
const path = require('path');

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Background worker to automatically clean up temporary try-on images older than 1 hour
 */
const cleanupTryOnImages = () => {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) return;

    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    let deletedCount = 0;

    files.forEach((file) => {
      if (file.startsWith('tryon_')) {
        const filePath = path.join(uploadDir, file);
        try {
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > ONE_HOUR_MS) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (_) {}
      }
    });

    if (deletedCount > 0) {
      console.log(`🧹 [Try-On Auto-Delete] Cleaned up ${deletedCount} temporary silhouette/try-on images older than 1 hour.`);
    }
  } catch (error) {
    console.error('Error during Try-On cleanup cron:', error.message);
  }
};

const initTryOnCleanupScheduler = () => {
  // Run once after 1 minute of server start
  setTimeout(cleanupTryOnImages, 60 * 1000);

  // Run recurring check every 15 minutes
  const interval = setInterval(cleanupTryOnImages, 15 * 60 * 1000);
  if (interval.unref) interval.unref();

  console.log('🛡️ Auto Stitch 1-Hour Privacy Auto-Delete Scheduler initialized.');
};

module.exports = { initTryOnCleanupScheduler, cleanupTryOnImages };
