/**
 * Abstract Base Virtual Try-On Engine Interface
 * Defines the contract for all VTO model adapters.
 */

class VirtualTryOnEngine {
  constructor(name = 'base-engine', version = '1.0.0') {
    this.name = name;
    this.version = version;
    this.isReady = false;
  }

  /**
   * Initialize model weights, GPU context, and dependencies
   */
  async initialize() {
    throw new Error('initialize() must be implemented by adapter subclass');
  }

  /**
   * Health check / readiness verification
   */
  async healthCheck() {
    return { ready: this.isReady, name: this.name, version: this.version };
  }

  /**
   * Preprocess person photo
   */
  async preprocessPerson(personBuffer) {
    return personBuffer;
  }

  /**
   * Preprocess catalog garment
   */
  async preprocessGarment(garmentBuffer, category) {
    return garmentBuffer;
  }

  /**
   * Execute try-on inference
   * @param {Buffer} personBuffer - Sanitized customer image buffer
   * @param {Buffer} garmentBuffer - Sanitized garment image buffer
   * @param {Object} options - { category, garmentName, fitStyle, seed }
   * @returns {Promise<Buffer>} - Output generated try-on image buffer
   */
  async generate(personBuffer, garmentBuffer, options = {}) {
    throw new Error('generate() must be implemented by adapter subclass');
  }

  /**
   * Post-process output buffer
   */
  async postprocess(resultBuffer) {
    return resultBuffer;
  }
}

module.exports = VirtualTryOnEngine;
