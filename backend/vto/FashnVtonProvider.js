/**
 * FashnVtonProvider - Production Virtual Try-On Provider
 * Supports:
 *  1. Official FASHN Cloud API (v1.6 / v1.5 / Try-On Max) at https://api.fashn.ai
 *  2. Self-Hosted / Local GPU FastAPI worker running open-source FASHN VTON v1.5
 *
 * Provides real cloth deformation, pose estimation, hand/hair occlusion preservation,
 * and realistic body-aware fitting without naive rectangular overlays.
 */

const VirtualTryOnProvider = require('./VirtualTryOnProvider');

class FashnVtonProvider extends VirtualTryOnProvider {
  /**
   * @param {Object} [config]
   * @param {string} [config.apiKey] - Fashn API key (or process.env.FASHN_API_KEY)
   * @param {string} [config.workerUrl] - Self-hosted worker URL (or process.env.VTO_WORKER_URL)
   * @param {string} [config.mode] - 'quality' (recommended) or 'performance'
   */
  constructor(config = {}) {
    super('fashn-vton', 'fashn-vton-v1.5', '1.5.0');
    this.apiKey = config.apiKey || process.env.FASHN_API_KEY || null;
    this.workerUrl = (config.workerUrl || process.env.VTO_WORKER_URL || '').replace(/\/+$/, '');
    this.mode = config.mode || process.env.FASHN_MODE || 'quality';
    this.isCloud = !!this.apiKey;
    this.apiUrl = 'https://api.fashn.ai/v1';
  }

  async healthCheck() {
    // 1. Check Cloud API if key is present
    if (this.apiKey) {
      return {
        ready: true,
        name: this.name,
        model: this.model,
        mode: 'cloud-api',
        details: { provider: 'fashn.ai', tier: 'production' },
      };
    }

    // 2. Check Self-Hosted Worker if configured
    if (this.workerUrl) {
      try {
        const res = await fetch(`${this.workerUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          return {
            ready: true,
            name: this.name,
            model: 'self-hosted-v1.5',
            mode: 'local-gpu-worker',
            details: data,
          };
        }
      } catch (_) {}
    }

    return {
      ready: false,
      name: this.name,
      model: this.model,
      mode: 'unconfigured',
      details: { message: 'FASHN_API_KEY or VTO_WORKER_URL is required' },
    };
  }

  /**
   * Create Try-On task on Fashn API or Local Worker
   */
  async createTryOn(input) {
    const { personBuffer, garmentBuffer, category = 'tops', garmentName = '', fitStyle = 'Tailored' } = input;

    // Map to FASHN categories: 'tops' | 'bottoms' | 'one-pieces'
    let fashnCategory = 'tops';
    if (category === 'bottoms') fashnCategory = 'bottoms';
    else if (category === 'one-pieces' || category === 'dresses') fashnCategory = 'one-pieces';

    const humanBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${garmentBuffer.toString('base64')}`;

    // A. CLOUD API EXECUTION (https://api.fashn.ai/v1/run)
    if (this.apiKey) {
      console.log(`[FashnVtonProvider] Submitting to Fashn Cloud API (category: ${fashnCategory}, mode: ${this.mode})...`);

      const payload = {
        model_image: humanBase64,
        garment_image: garmentBase64,
        category: fashnCategory,
        mode: this.mode,
        nsfw_filter: true,
        cover_feet: false,
        adjust_hands: true, // Preserves hands/arms naturally in front of garment
        restore_background: true, // Keeps original customer background intact
        restore_clothes: false, // Ensures previous clothing is cleanly replaced
        long_top: fashnCategory === 'tops' && (garmentName.toLowerCase().includes('kurta') || garmentName.toLowerCase().includes('tunic')),
      };

      const res = await fetch(`${this.apiUrl}/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const err = new Error(`FASHN API Error (${res.status}): ${errorText}`);
        if (res.status === 401 || res.status === 403) err.code = 'PROVIDER_AUTH_ERROR';
        else if (res.status === 429) err.code = 'PROVIDER_RATE_LIMIT';
        else err.code = 'PROVIDER_GENERATION_FAILED';
        throw err;
      }

      const data = await res.json();
      const jobId = data.id;

      // Poll until completion (typically 12-25s on FASHN cloud)
      return await this._pollCloudJob(jobId);
    }

    // B. SELF-HOSTED WORKER EXECUTION
    if (this.workerUrl) {
      console.log(`[FashnVtonProvider] Submitting to Self-Hosted Worker at ${this.workerUrl}...`);

      const payload = {
        human_image: humanBase64,
        garment_image: garmentBase64,
        category: fashnCategory,
        garment_description: garmentName,
        fit_style: fitStyle,
      };

      const res = await fetch(`${this.workerUrl}/api/vto/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180000),
      });

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`Self-hosted FASHN Worker Error (${res.status}): ${errText}`);
        err.code = 'PROVIDER_GENERATION_FAILED';
        throw err;
      }

      const data = await res.json();
      const resultBase64 = data.result_image || data.image;
      if (!resultBase64) {
        const err = new Error('No output image returned from FASHN worker');
        err.code = 'RESULT_VALIDATION_FAILED';
        throw err;
      }

      const clean = resultBase64.replace(/^data:image\/\w+;base64,/, '');
      return {
        status: 'completed',
        resultBuffer: Buffer.from(clean, 'base64'),
        metadata: { provider: 'fashn-self-hosted', model: 'v1.5' },
      };
    }

    const err = new Error('FashnVtonProvider is not configured with an API key or worker URL.');
    err.code = 'PROVIDER_AUTH_ERROR';
    throw err;
  }

  async _pollCloudJob(jobId) {
    const maxAttempts = 60; // Max 2 minutes
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(r => setTimeout(r, 2000));

      const statusRes = await fetch(`${this.apiUrl}/status/${jobId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!statusRes.ok) continue;

      const data = await statusRes.json();

      if (data.status === 'completed') {
        const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        if (!outputUrl) {
          const err = new Error('FASHN API returned completed status but output image URL was empty.');
          err.code = 'RESULT_DOWNLOAD_FAILED';
          throw err;
        }

        // Download result buffer
        const imgRes = await fetch(outputUrl);
        if (!imgRes.ok) {
          const err = new Error(`Failed to download output image from FASHN: ${imgRes.status}`);
          err.code = 'RESULT_DOWNLOAD_FAILED';
          throw err;
        }

        const arrayBuf = await imgRes.arrayBuffer();
        return {
          status: 'completed',
          resultBuffer: Buffer.from(arrayBuf),
          resultUrl: outputUrl,
          metadata: { provider: 'fashn.ai', jobId, duration: attempts * 2 },
        };
      }

      if (data.status === 'failed') {
        const err = new Error(`FASHN Try-On prediction failed: ${data.error || 'Unknown AI error'}`);
        err.code = 'PROVIDER_GENERATION_FAILED';
        throw err;
      }
    }

    const err = new Error('FASHN Try-On prediction timed out after 120 seconds.');
    err.code = 'PROVIDER_TIMEOUT';
    throw err;
  }
}

module.exports = FashnVtonProvider;
