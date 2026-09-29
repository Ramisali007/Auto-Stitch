/**
 * MockVtonProvider - Offline Deterministic Test Fixture Provider
 * Used STRICTLY for unit tests and local offline CI test suites.
 *
 * CRITICAL SAFETY GATE:
 * If process.env.NODE_ENV === 'production', this provider throws immediately
 * and CANNOT be instantiated or called.
 */

const VirtualTryOnProvider = require('./VirtualTryOnProvider');
const sharp = require('sharp');

class MockVtonProvider extends VirtualTryOnProvider {
  constructor() {
    super('mock-test-provider', 'mock-fixture-v1', '1.0.0');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY VIOLATION: MockVtonProvider is strictly forbidden in production mode.');
    }
  }

  async healthCheck() {
    if (process.env.NODE_ENV === 'production') {
      return { ready: false, name: this.name, model: this.model, error: 'Disabled in production' };
    }
    return { ready: true, name: this.name, model: this.model, mode: 'test-fixture' };
  }

  async createTryOn(input) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY VIOLATION: MockVtonProvider cannot be executed in production.');
    }

    const { personBuffer, category = 'tops', garmentName = 'Test Garment' } = input;

    // Simulate genuine AI processing delay in tests if needed (minimal)
    // Create a high-quality test result with valid dimensions and metadata
    const meta = await sharp(personBuffer).metadata();
    const width = meta.width || 800;
    const height = meta.height || 1200;

    const testCanvas = await sharp(personBuffer)
      .tint({ r: 245, g: 240, b: 248 }) // Subtle tint indicating processed model
      .webp({ quality: 90 })
      .toBuffer();

    return {
      status: 'completed',
      resultBuffer: testCanvas,
      metadata: {
        provider: 'mock-test-provider',
        model: 'mock-fixture-v1',
        category,
        garmentName,
        isTestFixture: true,
      },
    };
  }

  async getStatus(providerJobId) {
    return {
      status: 'completed',
      metadata: { provider: 'mock-test-provider', jobId: providerJobId },
    };
  }
}

module.exports = MockVtonProvider;
