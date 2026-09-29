/**
 * IDM-VTON Adapter (Self-Hosted / Colab GPU)
 */

const VirtualTryOnEngine = require('./VirtualTryOnEngine');
let GradioClient = null;
try {
  GradioClient = require('@gradio/client').Client;
} catch (_) {}

class IdmVtonAdapter extends VirtualTryOnEngine {
  constructor(serviceUrl = null) {
    super('idm-vton-adapter', '1.0.0');
    this.serviceUrl = serviceUrl;
    this._gradioClient = null;
  }

  getServiceUrl() {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^VTON_SERVICE_URL\s*=\s*(.+)$/m);
        if (match && match[1]) {
          const raw = match[1].trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
          if (raw && !raw.startsWith('#')) return raw;
        }
      }
    } catch (_) {}
    return (process.env.VTON_SERVICE_URL || process.env.COLAB_TRYON_URL || this.serviceUrl || '').trim().replace(/\/+$/, '');
  }

  async healthCheck() {
    const serviceUrl = this.getServiceUrl();
    if (!serviceUrl) return { ready: false, name: this.name };
    try {
      const health = await fetch(`${serviceUrl}/health`, { signal: AbortSignal.timeout(4000) });
      if (health.ok) return { ready: true, name: this.name, version: this.version, engine: 'Google Colab GPU' };
      const config = await fetch(`${serviceUrl}/config`, { signal: AbortSignal.timeout(3000) });
      return { ready: config.ok, name: this.name, version: this.version, engine: 'Google Colab GPU' };
    } catch (_) {
      return { ready: false, name: this.name };
    }
  }

  async _getClient() {
    const serviceUrl = this.getServiceUrl();
    if (!this._gradioClient && GradioClient && serviceUrl) {
      try {
        this._gradioClient = await GradioClient.connect(serviceUrl);
      } catch (err) {
        console.warn('[IdmVtonAdapter] Gradio client connection warning:', err.message);
      }
    }
    return this._gradioClient;
  }

  async generate(personBuffer, garmentBuffer, options = {}) {
    const serviceUrl = this.getServiceUrl();
    if (!serviceUrl) throw new Error('VTON service URL not configured');
    console.log(`[IdmVtonAdapter] Connecting to Colab IDM-VTON Server at: ${serviceUrl}`);

    const rawCategory = (options.category || 'upper_body').toLowerCase();
    const gName = (options.garmentName || '').toLowerCase();
    let safeCategory = 'upper_body';
    if (rawCategory.includes('bottom') || rawCategory.includes('pant') || rawCategory.includes('trouser') || rawCategory.includes('skirt') || rawCategory.includes('shalwar')) {
      safeCategory = 'bottoms';
    } else if (rawCategory.includes('gown') || rawCategory.includes('maxi') || gName.includes('gown') || gName.includes('maxi')) {
      safeCategory = 'dresses';
    } else {
      safeCategory = 'upper_body';
    }

    const rawFit = (options.fitStyle || 'Tailored').toLowerCase();
    let safeFit = 'Tailored';
    if (rawFit.includes('relax')) safeFit = 'Relaxed';
    else if (rawFit.includes('slim')) safeFit = 'Slim';

    // Strategy 1: Direct Custom REST endpoint (/tryon_direct or /api/tryon)
    const humanBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${garmentBuffer.toString('base64')}`;

    const tryEndpoints = ['/tryon_direct', '/api/tryon', '/tryon'];
    for (const endpoint of tryEndpoints) {
      try {
        const timeoutMs = parseInt(process.env.VTO_TIMEOUT_SECONDS || '300', 10) * 1000;
        const response = await fetch(`${serviceUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            human_image: humanBase64,
            garment_image: garmentBase64,
            category: safeCategory,
            garment_name: options.garmentName || 'Formal Suit',
            fit_style: safeFit,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          const data = await response.json();
          const resultImg = data.result_image || data.image;
          if (resultImg) {
            const rawBuf = await this._parseImageOutput(resultImg);
            try {
              return await this._enhanceWithAuthenticEmbroidery(rawBuf, garmentBuffer);
            } catch (_) {
              return rawBuf;
            }
          }
        } else {
          const errText = await response.text();
          console.warn(`[IdmVtonAdapter] ${endpoint} returned status ${response.status}: ${errText.slice(0, 120)}`);
        }
      } catch (err) {
        console.warn(`[IdmVtonAdapter] ${endpoint} attempt failed:`, err.message);
      }
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

  async _enhanceWithAuthenticEmbroidery(baseResultBuffer, garmentBuffer) {
    const sharp = require('sharp');
    const baseMeta = await sharp(baseResultBuffer).metadata();
    const bw = baseMeta.width;
    const bh = baseMeta.height;

    const gMeta = await sharp(garmentBuffer).metadata();
    const gw = gMeta.width;
    const gh = gMeta.height;

    const isPortrait = (gh / gw) >= 1.15;
    if (!isPortrait) return baseResultBuffer;

    // Extract authentic embroidered gala and neckline
    const galaTop = Math.round(gh * 0.35);
    const galaHeight = Math.round(gh * 0.165);
    const galaLeft = Math.round(gw * 0.37);
    const galaWidth = Math.round(gw * 0.26);

    const authenticGala = await sharp(garmentBuffer)
      .extract({ left: galaLeft, top: galaTop, width: galaWidth, height: galaHeight })
      .toBuffer();

    const targetW = Math.round(bw * 0.155);
    const targetH = Math.round(bh * 0.135);
    const targetTop = Math.round(bh * 0.252);
    const targetLeft = Math.round((bw - targetW) / 2) + Math.round(bw * 0.003);

    const resizedGala = await sharp(authenticGala)
      .resize(targetW, targetH, { fit: 'fill' })
      .png()
      .toBuffer();

    const maskSvg = `
      <svg width="${targetW}" height="${targetH}">
        <defs>
          <radialGradient id="galaFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff" stop-opacity="1" />
            <stop offset="70%" stop-color="#fff" stop-opacity="0.95" />
            <stop offset="90%" stop-color="#fff" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#fff" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="${targetW}" height="${targetH}" fill="url(#galaFade)" />
      </svg>
    `;
    const maskBuf = await sharp(Buffer.from(maskSvg)).png().toBuffer();

    const maskedGala = await sharp(resizedGala)
      .composite([{ input: maskBuf, blend: 'dest-in' }])
      .png()
      .toBuffer();

    return await sharp(baseResultBuffer)
      .composite([
        { input: maskedGala, top: targetTop, left: targetLeft, blend: 'over' }
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
  }
}

module.exports = IdmVtonAdapter;

