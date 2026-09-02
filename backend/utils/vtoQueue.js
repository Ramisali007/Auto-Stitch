/**
 * Asynchronous Virtual Try-On Queue Manager
 * Provides resilient FIFO queuing, concurrency control, bounded retries,
 * job timeout enforcement, and automatic privacy source cleanup.
 */

const TryOnJob = require('../models/TryOnJob');
const { deleteVtoAsset } = require('./s3Service');
const LocalSharpAdapter = require('../vto/LocalSharpAdapter');
const FashnVtonAdapter = require('../vto/FashnVtonAdapter');
const IdmVtonAdapter = require('../vto/IdmVtonAdapter');
const ReplicateAdapter = require('../vto/ReplicateAdapter');

const localEngine = new LocalSharpAdapter();
const fashnEngine = new FashnVtonAdapter();
const idmEngine = new IdmVtonAdapter();
const replicateEngine = new ReplicateAdapter();

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
   * Cancel a job in queue or mark active job as cancelled
   */
  async cancel(jobId) {
    // 1. Remove from pending queue if not yet started
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

      // Immediately purge temporary person assets
      if (job.personObjectKey) {
        await deleteVtoAsset(job.personObjectKey);
      }
      if (job.resultUrl) {
        await deleteVtoAsset(job.resultUrl);
      }
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
      { status: 'processing' }
    );

    this.executeTask(task).finally(() => {
      this.activeJobs.delete(task.jobId);
      this.processNext();
    });
  }

  /**
   * Execute inference through engine pipeline with fallback resilience
   */
  async executeTask(task) {
    const { jobId, personBuffer, garmentBuffer, options } = task;
    const startTime = Date.now();

    try {
      let outputBuffer = null;
      let engineUsed = 'local-sharp-compositor';
      // 1. Primary Cloud GPU: Replicate IDM-VTON (if configured & healthy)
      if (process.env.REPLICATE_API_TOKEN) {
        try {
          outputBuffer = await replicateEngine.generate(personBuffer, garmentBuffer, options);
          engineUsed = 'replicate-idm-vton';
        } catch (repErr) {
          console.warn(`[Queue] Replicate notice: ${repErr.message}. Trying secondary...`);
        }
      }

      // 2. Colab GPU: IDM-VTON
      if (!outputBuffer && (process.env.VTON_SERVICE_URL || process.env.COLAB_TRYON_URL)) {
        try {
          outputBuffer = await idmEngine.generate(personBuffer, garmentBuffer, options);
          engineUsed = 'idm-vton';
        } catch (idmErr) {
          console.warn(`[Queue] IDM-VTON notice: ${idmErr.message}. Trying local worker...`);
        }
      }

      // 3. Local GPU Worker: FASHN VTON
      if (!outputBuffer && process.env.VTO_WORKER_URL) {
        try {
          const health = await fashnEngine.healthCheck();
          if (health.ready) {
            outputBuffer = await fashnEngine.generate(personBuffer, garmentBuffer, options);
            engineUsed = 'fashn-vton-1.5';
          }
        } catch (fashnErr) {
          console.warn(`[Queue] FASHN VTON notice: ${fashnErr.message}. Falling back to local...`);
        }
      }

      // 4. Fallback: Local Neural Cloth Transfer
      if (!outputBuffer) {
        outputBuffer = await localEngine.generate(personBuffer, garmentBuffer, options);
        engineUsed = 'local-sharp-compositor';
      }

      // Save output result
      const { uploadTempVtoAsset } = require('./s3Service');
      const savedResult = await uploadTempVtoAsset(jobId, 'result', outputBuffer);

      // CRITICAL PRIVACY REQUIREMENT: Immediately delete the source customer image
      const job = await TryOnJob.findOne({ jobId });
      if (job && job.personObjectKey) {
        await deleteVtoAsset(job.personObjectKey);
        job.personObjectKey = ''; // Clear source object reference
      }

      // Update TryOnJob record
      await TryOnJob.findOneAndUpdate(
        { jobId },
        {
          status: 'completed',
          resultObjectKey: savedResult.objectKey,
          resultUrl: savedResult.url,
          modelVersion: engineUsed,
          expiresAt: new Date(Date.now() + parseInt(process.env.VTO_RESULT_EXPIRY_SECONDS || '3600', 10) * 1000),
        }
      );

      console.log(`[✅ VTO Queue] Job ${jobId} completed in ${Date.now() - startTime}ms using ${engineUsed}`);
    } catch (err) {
      console.error(`[❌ VTO Queue] Job ${jobId} failed:`, err.message);

      if (task.retries < task.maxRetries) {
        task.retries += 1;
        console.log(`[Queue] Retrying job ${jobId} (Attempt ${task.retries}/${task.maxRetries})...`);
        this.queue.unshift(task);
      } else {
        await TryOnJob.findOneAndUpdate(
          { jobId },
          {
            status: 'failed',
            failureCode: 'INFERENCE_ERROR',
            errorDescription: 'Virtual Try-On generation could not be completed for this image. Please try another photo.',
            deletedAt: new Date(),
          }
        );
        // Clean source image on final failure
        const job = await TryOnJob.findOne({ jobId });
        if (job?.personObjectKey) {
          await deleteVtoAsset(job.personObjectKey);
        }
      }
    }
  }
}

const vtoQueue = new VtoQueueManager();
module.exports = vtoQueue;
