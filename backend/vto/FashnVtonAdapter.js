/**
 * FASHN VTON v1.5 Model Adapter
 * Connects to self-hosted PyTorch / FastAPI GPU inference worker running FASHN VTON v1.5.
 */

const VirtualTryOnEngine = require('./VirtualTryOnEngine');

class FashnVtonAdapter extends VirtualTryOnEngine {
  constructor(workerUrl = process.env.VTO_WORKER_URL || 'http://localhost:8000') {
    super('fashn-vton-1.5', '1.5.0');
    this.workerUrl = workerUrl.replace(/\/+$/, '');
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.workerUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json();
        this.isReady = !!data.ready;
        return { ready: this.isReady, name: this.name, version: this.version, details: data };
      }
    } catch (_) {}
    return { ready: false, name: this.name, version: this.version };
  }

  async generate(personBuffer, garmentBuffer, options = {}) {
    const { category = 'dresses', garmentName = '', fitStyle = 'Tailored' } = options;

    const payload = {
      human_image: `data:image/webp;base64,${personBuffer.toString('base64')}`,
      garment_image: `data:image/webp;base64,${garmentBuffer.toString('base64')}`,
      category,
      garment_description: garmentName,
      fit_style: fitStyle,
    };

    const response = await fetch(`${this.workerUrl}/api/vto/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(parseInt(process.env.VTO_TIMEOUT_SECONDS || '90', 10) * 1000),
    });

    if (!response.ok) {
      throw new Error(`FASHN VTON Worker Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultBase64 = data.result_image || data.image;
    if (!resultBase64) {
      throw new Error('No output image returned from FASHN VTON worker');
    }

    const cleanBase64 = resultBase64.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(cleanBase64, 'base64');
  }
}

module.exports = FashnVtonAdapter;
