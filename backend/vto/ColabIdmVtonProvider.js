/**
 * ColabIdmVtonProvider - Self-Hosted Google Colab GPU IDM-VTON Provider
 * Connects to a dedicated Colab GPU instance running IDM-VTON FastAPI service.
 */

const VirtualTryOnProvider = require('./VirtualTryOnProvider');

class ColabIdmVtonProvider extends VirtualTryOnProvider {
  constructor(serviceUrl = null) {
    super('colab-idm-vton', 'idm-vton-colab-gpu', '1.0.0');
    this.serviceUrl = serviceUrl;
  }

  getServiceUrl() {
    try {
      if (process.env.NODE_ENV !== 'test') {
        const savedEnv = process.env.NODE_ENV;
        require('dotenv').config({ override: true });
        if (savedEnv) process.env.NODE_ENV = savedEnv;
      }
    } catch (_) {}
    return (process.env.VTON_SERVICE_URL || process.env.COLAB_TRYON_URL || this.serviceUrl || '').trim().replace(/\/+$/, '');
  }

  async healthCheck() {
    const serviceUrl = this.getServiceUrl();
    if (!serviceUrl) return { ready: false, name: this.name, model: this.model, details: { message: 'VTON_SERVICE_URL not configured' } };
    try {
      const health = await fetch(`${serviceUrl}/health`, { signal: AbortSignal.timeout(4000) });
      if (health.ok) return { ready: true, name: this.name, model: this.model, mode: 'colab-gpu', serviceUrl };
    } catch (_) {}
    return { ready: false, name: this.name, model: this.model };
  }

  async createTryOn(input) {
    const serviceUrl = this.getServiceUrl();
    if (!serviceUrl) {
      const err = new Error('Colab GPU VTON_SERVICE_URL is not configured.');
      err.code = 'PROVIDER_AUTH_ERROR';
      throw err;
    }

    const { personBuffer, garmentBuffer, category = 'tops', garmentName = 'Garment', fitStyle = 'Tailored' } = input;

    let idmCategory = 'upper_body';
    if (category === 'bottoms' || category === 'lower_body') idmCategory = 'lower_body';
    else if (category === 'one-pieces' || category === 'dresses') idmCategory = 'dresses';
    else if (category === 'outerwear' || category === 'tops') idmCategory = 'upper_body';

    const humanBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${garmentBuffer.toString('base64')}`;

    console.log(`[ColabIdmVtonProvider] Sending inference request to Colab at ${serviceUrl}...`);

    const endpoints = ['/tryon_direct', '/api/tryon', '/tryon'];
    const timeoutMs = parseInt(process.env.VTO_TIMEOUT_SECONDS || '300', 10) * 1000;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${serviceUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            human_image: humanBase64,
            garment_image: garmentBase64,
            category: idmCategory,
            garment_name: garmentName,
            fit_style: fitStyle,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          const data = await response.json();
          const resultImg = data.result_image || data.image;
          if (resultImg) {
            let buffer;
            if (typeof resultImg === 'string' && (resultImg.startsWith('http://') || resultImg.startsWith('https://'))) {
              const res = await fetch(resultImg);
              const arr = await res.arrayBuffer();
              buffer = Buffer.from(arr);
            } else {
              const clean = resultImg.replace(/^data:image\/\w+;base64,/, '');
              buffer = Buffer.from(clean, 'base64');
            }

            return {
              status: 'completed',
              resultBuffer: buffer,
              metadata: { provider: 'colab-idm-vton', endpoint, serviceUrl },
            };
          }
        }
      } catch (err) {
        console.warn(`[ColabIdmVtonProvider] Attempt on ${endpoint} failed:`, err.message);
      }
    }

    const err = new Error('All Colab IDM-VTON endpoints failed or timed out.');
    err.code = 'PROVIDER_GENERATION_FAILED';
    throw err;
  }
}

module.exports = ColabIdmVtonProvider;
