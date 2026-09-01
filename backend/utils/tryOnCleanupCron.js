const fs = require('fs');
const path = require('path');
const TryOnJob = require('../models/TryOnJob');
const { purgeJobAssets, deleteVtoAsset } = require('./s3Service');

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Background worker to automatically clean up temporary try-on images and expired jobs
 */
const cleanupTryOnImages = async () => {
  try {
    const now = new Date();

    // 1. Find expired or cancelled jobs in database
    const expiredJobs = await TryOnJob.find({
      $or: [
        { expiresAt: { $lt: now } },
        { status: { $in: ['cancelled', 'failed', 'expired'] }, deletedAt: { $exists: false } },
      ],
    }).limit(100);

    let purgedJobCount = 0;
    for (const job of expiredJobs) {
      try {
        await purgeJobAssets(job.jobId);
        job.status = 'expired';
        job.deletedAt = new Date();
        await job.save();
        purgedJobCount++;
      } catch (jobErr) {
        console.warn(`[Cleanup] Error purging job ${job.jobId}:`, jobErr.message);
      }
    }

    // 2. Clean temporary files in uploads directory
    const uploadDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      let deletedFileCount = 0;

      files.forEach((file) => {
        if (file.startsWith('tryon_') || file.startsWith('ai_result') || file.startsWith('local_fit')) {
          const filePath = path.join(uploadDir, file);
          try {
            const stats = fs.statSync(filePath);
            const age = Date.now() - stats.mtimeMs;

            if (age > ONE_HOUR_MS) {
              fs.unlinkSync(filePath);
              deletedFileCount++;
            }
          } catch (_) {}
        }
      });

      // Also clean old folders in uploads/vto_temp
      const vtoTempDir = path.join(uploadDir, 'vto_temp');
      if (fs.existsSync(vtoTempDir)) {
        const jobFolders = fs.readdirSync(vtoTempDir);
        jobFolders.forEach((folder) => {
          const folderPath = path.join(vtoTempDir, folder);
          try {
            const stats = fs.statSync(folderPath);
            const age = Date.now() - stats.mtimeMs;
            if (age > ONE_HOUR_MS) {
              fs.rmSync(folderPath, { recursive: true, force: true });
              deletedFileCount++;
            }
          } catch (_) {}
        });
      }

      if (purgedJobCount > 0 || deletedFileCount > 0) {
        console.log(`🛡️ [Privacy Auto-Delete] Purged ${purgedJobCount} expired try-on jobs and ${deletedFileCount} temporary server files.`);
      }
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
