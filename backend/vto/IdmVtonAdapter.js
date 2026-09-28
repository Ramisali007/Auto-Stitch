/**
 * IDM-VTON Adapter (Self-Hosted / Colab GPU)
 */

const VirtualTryOnEngine = require('./VirtualTryOnEngine');
let GradioClient = null;
try {
  GradioClient = require('@gradio/client').Client;
} catch (_) {}

class IdmVtonAdapter extends VirtualTryOnEngine {
  constructor(serviceUrl = process.env.VTON_SERVICE_URL || process.env.COLAB_TRYON_URL) {
    super('idm-vton-adapter', '1.0.0');
    this.serviceUrl = serviceUrl ? serviceUrl.trim().replace(/\/+$/, '') : null;
    this._gradioClient = null;
  }

  async healthCheck() {
    if (!this.serviceUrl) return { ready: false, name: this.name };
    try {
      const response = await fetch(`${this.serviceUrl}/config`, { signal: AbortSignal.timeout(4000) });
      if (response.ok) return { ready: true, name: this.name, version: this.version, engine: 'Google Colab GPU' };
      const health = await fetch(`${this.serviceUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return { ready: health.ok, name: this.name, version: this.version, engine: 'Google Colab GPU' };
    } catch (_) {
      return { ready: false, name: this.name };
    }
  }

  async _getClient() {
    if (!this._gradioClient && GradioClient && this.serviceUrl) {
      try {
        this._gradioClient = await GradioClient.connect(this.serviceUrl);
      } catch (err) {
        console.warn('[IdmVtonAdapter] Gradio client connection warning:', err.message);
      }
    }
    return this._gradioClient;
  }

  async generate(personBuffer, garmentBuffer, options = {}) {
    if (!this.serviceUrl) throw new Error('VTON service URL not configured');

    const rawCategory = (options.category || 'dresses').toLowerCase();
    let safeCategory = 'dresses';
    if (rawCategory.includes('top') || rawCategory.includes('shirt') || rawCategory.includes('kurti') || rawCategory.includes('blouse') || rawCategory.includes('jacket')) {
      safeCategory = 'tops';
    } else if (rawCategory.includes('bottom') || rawCategory.includes('pant') || rawCategory.includes('trouser') || rawCategory.includes('skirt') || rawCategory.includes('shalwar')) {
      safeCategory = 'bottoms';
    }

    const rawFit = (options.fitStyle || 'Tailored').toLowerCase();
    let safeFit = 'Tailored';
    if (rawFit.includes('relax')) safeFit = 'Relaxed';
    else if (rawFit.includes('slim')) safeFit = 'Slim';

    // Strategy 1: Direct REST /api/tryon (Fast, Robust, Zero Schema Overhead)
    const humanBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${garmentBuffer.toString('base64')}`;

    try {
      const response = await fetch(`${this.serviceUrl}/api/tryon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_image: humanBase64,
          garment_image: garmentBase64,
          category: safeCategory,
          fit_style: safeFit,
        }),
        signal: AbortSignal.timeout(parseInt(process.env.VTO_TIMEOUT_SECONDS || '120', 10) * 1000),
      });

      if (response.ok) {
        const data = await response.json();
        const resultImg = data.result_image || data.image;
        if (resultImg) {
          return await this._parseImageOutput(resultImg);
        }
      }
    } catch (err) {
      console.warn('[IdmVtonAdapter] Direct /api/tryon attempt failed:', err.message, 'Trying Gradio client fallback...');
    }

    // Strategy 2: Official @gradio/client with /tryon
    if (GradioClient) {
      try {
        const client = await this._getClient();
        if (client) {
          const blobPerson = new Blob([personBuffer], { type: 'image/jpeg' });
          const blobGarment = new Blob([garmentBuffer], { type: 'image/jpeg' });

          const res = await client.predict('/tryon', [
            { background: blobPerson, layers: [], composite: blobPerson },
            blobGarment,
            `luxury ${safeCategory}`,
            true,
            false,
            30,
            42,
          ]);

          if (res && res.data) {
            const rawOutput = Array.isArray(res.data) ? res.data[0] : res.data;
            return await this._parseImageOutput(rawOutput);
          }
        }
      } catch (clientErr) {
        console.warn('[IdmVtonAdapter] Gradio client predict warning:', clientErr.message);
      }
    }

    throw new Error('All VTON strategies exhausted');
  }

  async _parseImageOutput(output) {
    if (typeof output === 'object' && output !== null) {
      if (output.url) output = output.url;
      else if (output.path) output = `${this.serviceUrl}/file=${output.path}`;
    }

    if (typeof output === 'string') {
      if (output.startsWith('http://') || output.startsWith('https://')) {
        const res = await fetch(output);
        const arr = await res.arrayBuffer();
        return Buffer.from(arr);
      }
      const clean = output.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(clean, 'base64');
    }
    throw new Error('Unrecognized image format from VTON server');
  }
}

module.exports = IdmVtonAdapter;

