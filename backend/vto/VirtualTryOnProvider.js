/**
 * VirtualTryOnProvider - Abstract Base Contract for Production VTO Engines
 * Defines standard lifecycle methods for all virtual try-on providers:
 * FASHN, Replicate (IDM-VTON), Colab GPU, Gemini, and Mock (Test-Only).
 */

class VirtualTryOnProvider {
  /**
   * @param {string} name - Human-readable provider name
   * @param {string} model - Specific AI model identifier
   * @param {string} version - Adapter version
   */
  constructor(name = 'base-vto-provider', model = 'generic-model', version = '1.0.0') {
    if (new.target === VirtualTryOnProvider) {
      throw new TypeError('Cannot construct VirtualTryOnProvider instances directly; use an implementation subclass.');
    }
    this.name = name;
    this.model = model;
    this.version = version;
    this.isReady = false;
  }

  /**
   * Verify provider credentials, connectivity, and model availability.
   * @returns {Promise<{ ready: boolean, name: string, model: string, details?: any }>}
   */
  async healthCheck() {
    throw new Error(`healthCheck() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Submit or execute a Virtual Try-On inference task.
   * @param {Object} input
   * @param {Buffer} input.personBuffer - Preprocessed human photo buffer
   * @param {Buffer} input.garmentBuffer - Preprocessed garment image buffer
   * @param {string} input.category - Normalized garment category ('tops'|'bottoms'|'one-pieces'|'outerwear')
   * @param {string} [input.garmentName] - Descriptive name of the garment
   * @param {string} [input.fitStyle] - Fit style ('Tailored'|'Relaxed'|'Slim')
   * @param {Object} [input.metadata] - Additional contextual metadata (user, boutique, product IDs)
   * @returns {Promise<{
   *   providerJobId?: string,
   *   status: 'completed'|'processing',
   *   resultBuffer?: Buffer,
   *   resultUrl?: string,
   *   metadata?: Object
   * }>}
   */
  async createTryOn(input) {
    throw new Error(`createTryOn() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Poll or check the status of an asynchronous prediction job.
   * @param {string} providerJobId - Provider's remote job identifier
   * @returns {Promise<{
   *   status: 'pending'|'processing'|'completed'|'failed'|'cancelled',
   *   resultBuffer?: Buffer,
   *   resultUrl?: string,
   *   error?: string,
   *   metadata?: Object
   * }>}
   */
  async getStatus(providerJobId) {
    throw new Error(`getStatus() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Cancel an in-flight prediction on the provider side if supported.
   * @param {string} providerJobId
   * @returns {Promise<void>}
   */
  async cancel(providerJobId) {
    // Optional implementation for providers that support cancellation
    return;
  }
}

module.exports = VirtualTryOnProvider;
