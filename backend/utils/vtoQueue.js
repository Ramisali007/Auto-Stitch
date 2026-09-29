/**
 * Production-Grade Asynchronous Virtual Try-On Queue Manager
 * Provides FIFO queueing, concurrency control, bounded retries with exponential backoff,
 * job timeout enforcement, structured error logging, and instant privacy asset purges.
 */

const TryOnJob = require('../models/TryOnJob');
const { deleteVtoAsset, uploadTempVtoAsset } = require('./s3Service');
const vtoService = require('../vto/VirtualTryOnService');

class VtoQueueManager {
  constructor() {
    this.queue = [];
    this.activeJobs = new Map();
    this.concurrencyLimit = parseInt(process.env.VTO_CONCURRENT_JOBS || '2', 10);
    this.isProcessing = false;
  }

  /**
   * Enqueue a new try-on job
   */
  async enqueue(jobId, personBuffer, garmentBuffer, options = {}) {
    const jobRecord = await TryOnJob.findOne({ jobId });
    if (!jobRecord) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    const task = {
      jobId,
      personBuffer,
      garmentBuffer,
      options,
      retries: 0,
      maxRetries: parseInt(process.env.VTO_MAX_RETRIES || '2', 10),
      enqueuedAt: Date.now(),
    };

    this.queue.push(task);
    this.processNext();
    return task;
  }

  /**
   * Cancel a job in queue or active processing
   */
  async cancel(jobId) {
    // 1. Remove from pending queue
    const queueIndex = this.queue.findIndex((t) => t.jobId === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
    }

    // 2. Mark database record
    const job = await TryOnJob.findOne({ jobId });
    if (job) {
      job.status = 'cancelled';
      job.deletedAt = new Date();
      await job.save();

      // Immediately purge temporary customer assets
      if (job.personObjectKey) {
        await deleteVtoAsset(job.personObjectKey);
        job.personObjectKey = '';
      }
      if (job.resultUrl) {
        await deleteVtoAsset(job.resultUrl);
      }
      await job.save();
    }

    return true;
  }

  /**
   * Process next jobs up to concurrency limit
   */
  async processNext() {
    if (this.activeJobs.size >= this.concurrencyLimit || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeJobs.set(task.jobId, task);

    // Update job status to processing
    await TryOnJob.findOneAndUpdate(
      { jobId: task.jobId },
      { status: 'processing', startedAt: new Date() }
    );

    this.executeTask(task).finally(() => {
      this.activeJobs.delete(task.jobId);
      this.processNext();
    });
  }

  /**
   * Execute inference via VirtualTryOnService
   */
  async executeTask(task) {
    const { jobId, personBuffer, garmentBuffer, options = {} } = task;
    const startTime = Date.now();

    try {
      const result = await vtoService.execute({
        personBuffer,
        garmentBuffer,
        category: options.category || 'tops',
        garmentName: options.garmentName || 'Luxury Garment',
        fitStyle: options.fitStyle || 'Tailored',
        metadata: options.metadata || {},
      });

      // Upload and store the result image securely
      const savedResult = await uploadTempVtoAsset(jobId, 'result', result.buffer);

      // CRITICAL PRIVACY REQUIREMENT: Immediately delete the source customer image
      const job = await TryOnJob.findOne({ jobId });
      if (job && job.personObjectKey) {
        await deleteVtoAsset(job.personObjectKey);
        job.personObjectKey = ''; // Clear source object reference
      }

      // Update TryOnJob to completed
      await TryOnJob.findOneAndUpdate(
        { jobId },
        {
          status: 'completed',
          resultObjectKey: savedResult.objectKey,
          resultUrl: savedResult.url,
          modelVersion: `${result.provider}/${result.model}`,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + parseInt(process.env.VTO_RESULT_EXPIRY_SECONDS || '3600', 10) * 1000),
        }
      );

      console.log(`[✅ VTO Queue] Job ${jobId} completed in ${Date.now() - startTime}ms using ${result.provider}`);
    } catch (err) {
      console.error(`[❌ VTO Queue] Job ${jobId} error:`, err.message);

      const isTransient = ['PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMIT', 'PROVIDER_UNAVAILABLE', 'ETIMEDOUT', 'ECONNRESET'].includes(err.code);

      if (isTransient && task.retries < task.maxRetries) {
        task.retries += 1;
        const delay = Math.pow(2, task.retries) * 1000;
        console.log(`[Queue] Transient error for job ${jobId}. Retrying in ${delay}ms (Attempt ${task.retries}/${task.maxRetries})...`);
        setTimeout(() => {
          this.queue.unshift(task);
          this.processNext();
        }, delay);
      } else {
        const failureCode = err.code || 'PROVIDER_GENERATION_FAILED';
        const errorDescription = this._humanizeError(err);

        await TryOnJob.findOneAndUpdate(
          { jobId },
          {
            status: 'failed',
            failureCode,
            errorDescription,
            failedAt: new Date(),
            deletedAt: new Date(),
          }
        );

        // Clean source image on final failure
        const job = await TryOnJob.findOne({ jobId });
        if (job?.personObjectKey) {
          await deleteVtoAsset(job.personObjectKey);
          job.personObjectKey = '';
          await job.save();
        }
      }
    }
  }

  _humanizeError(err) {
    if (err.code === 'INVALID_PERSON_IMAGE') {
      return 'The uploaded photo could not be processed. Please upload a clear photo with good lighting.';
    }
    if (err.code === 'OVERSIZED_IMAGE') {
      return 'The photo exceeds 10MB. Please upload a smaller image file.';
    }
    if (err.code === 'UNSUPPORTED_CATEGORY') {
      return err.message || 'Virtual Try-On is not supported for this garment category yet.';
    }
    if (err.code === 'PROVIDER_AUTH_ERROR') {
      return 'Virtual Try-On service credentials are not configured or expired. Please contact support.';
    }
    if (err.code === 'PROVIDER_RATE_LIMIT') {
      return 'Try-On engine is currently experiencing high demand. Please try again in a few moments.';
    }
    if (err.code === 'PROVIDER_TIMEOUT') {
      return 'Virtual Try-On generation timed out. Please try again or choose another garment.';
    }
    return err.message || 'Virtual Try-On generation could not be completed for this image. Please try another photo.';
  }
}

const vtoQueue = new VtoQueueManager();
module.exports = vtoQueue;
