/**
 * ReplicateVtonProvider - IDM-VTON Neural Try-On via Replicate Cloud GPU (A100)
 * Uses high-performance state-of-the-art diffusion inpainting for realistic cloth
 * deformation, body-aware fitting, and drape.
 */

const VirtualTryOnProvider = require('./VirtualTryOnProvider');

class ReplicateVtonProvider extends VirtualTryOnProvider {
  constructor(apiToken = process.env.REPLICATE_API_TOKEN) {
    super('replicate-idm-vton', 'cuuupid/idm-vton', '1.0.0');
    this.apiToken = apiToken || null;
    this.modelVersion = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';
  }

  async healthCheck() {
    if (!this.apiToken) {
      return { ready: false, name: this.name, model: this.model, details: { message: 'REPLICATE_API_TOKEN is not configured' } };
    }
    try {
      const res = await fetch('https://api.replicate.com/v1/models/cuuupid/idm-vton', {
        headers: { Authorization: `Token ${this.apiToken}` },
        signal: AbortSignal.timeout(4000),
      });
      return {
        ready: res.ok,
        name: this.name,
        model: this.model,
        mode: 'cloud-gpu-a100',
        details: { status: res.status },
      };
    } catch (_) {
      return { ready: false, name: this.name, model: this.model };
    }
  }

  async createTryOn(input) {
    if (!this.apiToken) {
      const err = new Error('REPLICATE_API_TOKEN is not configured.');
      err.code = 'PROVIDER_AUTH_ERROR';
      throw err;
    }

    const { personBuffer, garmentBuffer, category = 'tops', garmentName = 'Luxury Garment' } = input;

    // Map to IDM-VTON categories: 'upper_body' | 'lower_body' | 'dresses'
    let idmCategory = 'upper_body';
    if (category === 'bottoms') idmCategory = 'lower_body';
    else if (category === 'one-pieces' || category === 'dresses') idmCategory = 'dresses';

    const humanBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${garmentBuffer.toString('base64')}`;

    console.log(`[ReplicateVtonProvider] Creating IDM-VTON prediction on Replicate (category: ${idmCategory})...`);

    // 1. Submit prediction
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: this.modelVersion,
        input: {
          human_img: humanBase64,
          garm_img: garmentBase64,
          garment_des: garmentName,
          category: idmCategory,
          steps: 30,
          seed: 42,
          crop: false,
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      const err = new Error(`Replicate API creation failed (${createRes.status}): ${errText}`);
      if (createRes.status === 401 || createRes.status === 402 || createRes.status === 403) {
        err.code = 'PROVIDER_AUTH_ERROR';
      } else if (createRes.status === 429) {
        err.code = 'PROVIDER_RATE_LIMIT';
      } else {
        err.code = 'PROVIDER_GENERATION_FAILED';
      }
      throw err;
    }

    const prediction = await createRes.json();
    const predictionId = prediction.id;

    // 2. Poll prediction status
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${this.apiToken}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();

      if (pollData.status === 'succeeded') {
        const outputUrl = pollData.output;
        if (!outputUrl) {
          const err = new Error('Replicate prediction succeeded but output URL was empty.');
          err.code = 'RESULT_DOWNLOAD_FAILED';
          throw err;
        }

        const imgRes = await fetch(outputUrl);
        if (!imgRes.ok) {
          const err = new Error(`Failed to download result image from Replicate: ${imgRes.status}`);
          err.code = 'RESULT_DOWNLOAD_FAILED';
          throw err;
        }

        const arrayBuf = await imgRes.arrayBuffer();
        return {
          status: 'completed',
          resultBuffer: Buffer.from(arrayBuf),
          resultUrl: outputUrl,
          metadata: { provider: 'replicate', predictionId, duration: attempts * 2 },
        };
      }

      if (pollData.status === 'failed' || pollData.status === 'canceled') {
        const err = new Error(`Replicate prediction ${pollData.status}: ${pollData.error || 'Unknown error'}`);
        err.code = 'PROVIDER_GENERATION_FAILED';
        throw err;
      }
    }

    const err = new Error('Replicate IDM-VTON inference timed out after 100 seconds.');
    err.code = 'PROVIDER_TIMEOUT';
    throw err;
  }
}

module.exports = ReplicateVtonProvider;
