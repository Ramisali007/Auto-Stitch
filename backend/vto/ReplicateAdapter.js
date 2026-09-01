/**
 * Replicate Cloud GPU Virtual Try-On Adapter (IDM-VTON A100)
 * Uses high-performance state-of-the-art diffusion inpainting via Replicate API.
 */

const VirtualTryOnEngine = require('./VirtualTryOnEngine');

class ReplicateAdapter extends VirtualTryOnEngine {
  constructor(apiToken = process.env.REPLICATE_API_TOKEN) {
    super('replicate-idm-vton', '1.0.0');
    this.apiToken = apiToken || null;
    this.modelVersion = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';
  }

  async healthCheck() {
    if (!this.apiToken) return { ready: false, name: this.name };
    try {
      const res = await fetch('https://api.replicate.com/v1/models/cuuupid/idm-vton', {
        headers: { Authorization: `Token ${this.apiToken}` },
        signal: AbortSignal.timeout(4000),
      });
      return { ready: res.ok, name: this.name, version: this.version, cloud: 'Replicate A100' };
    } catch (_) {
      return { ready: false, name: this.name };
    }
  }

  async generate(personBuffer, garmentBuffer, options = {}) {
    if (!this.apiToken) throw new Error('REPLICATE_API_TOKEN is not configured');

    const { category = 'dresses', garmentName = 'garment' } = options;
    const humanBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${garmentBuffer.toString('base64')}`;

    // 1. Create Prediction on Replicate
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
          garment_des: garmentName || `Luxury ${category}`,
          category: category === 'tops' ? 'upper_body' : category === 'bottoms' ? 'lower_body' : 'dresses',
          steps: 30,
          seed: 42,
          crop: false,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Replicate API creation failed (${createRes.status}): ${errText}`);
    }

    const prediction = await createRes.json();
    const predictionId = prediction.id;

    // 2. Poll for Completion (typically 10-18 seconds on A100)
    let attempts = 0;
    const maxAttempts = 40;

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${this.apiToken}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();

      if (pollData.status === 'succeeded') {
        const outputUrl = pollData.output;
        if (!outputUrl) throw new Error('Replicate output image URL was empty');

        const imgRes = await fetch(outputUrl);
        const arrayBuf = await imgRes.arrayBuffer();
        return Buffer.from(arrayBuf);
      }

      if (pollData.status === 'failed' || pollData.status === 'canceled') {
        throw new Error(`Replicate prediction ${pollData.status}: ${pollData.error || 'Unknown error'}`);
      }
    }

    throw new Error('Replicate try-on inference timed out');
  }
}

module.exports = ReplicateAdapter;
