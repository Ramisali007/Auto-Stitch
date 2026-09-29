/**
 * VirtualTryOnService - Production Orchestrator & Provider Factory
 * Resolves active VTO provider according to environment configuration,
 * ensures multi-tenant isolation, enforces strict production safety checks,
 * and handles resilient inference execution.
 */

const FashnVtonProvider = require('./FashnVtonProvider');
const ReplicateVtonProvider = require('./ReplicateVtonProvider');
const ColabIdmVtonProvider = require('./ColabIdmVtonProvider');
const GeminiImageEditProvider = require('./GeminiImageEditProvider');
const MockVtonProvider = require('./MockVtonProvider');
const { validateTryOnResult } = require('./resultValidator');

class VirtualTryOnService {
  constructor() {
    this.providers = new Map();
    this._initProviders();
  }

  _initProviders() {
    // 1. FASHN Provider (Official Cloud API or local worker)
    this.providers.set('fashn', new FashnVtonProvider());

    // 2. Replicate Provider (IDM-VTON A100 GPU Diffusion)
    this.providers.set('replicate', new ReplicateVtonProvider());

    // 3. Colab GPU Provider (Self-hosted IDM-VTON FastAPI)
    this.providers.set('colab', new ColabIdmVtonProvider());

    // 4. Gemini Multimodal Fitting
    this.providers.set('gemini', new GeminiImageEditProvider());

    // 5. Mock Provider (Development/Tests ONLY)
    if (process.env.NODE_ENV !== 'production') {
      try {
        this.providers.set('mock', new MockVtonProvider());
      } catch (_) {}
    }
  }

  /**
   * Determine the best active provider
   */
  getActiveProvider() {
    // In automated testing environment, use deterministic mock provider unless live testing is explicitly flagged
    if (process.env.NODE_ENV === 'test' && this.providers.has('mock') && !process.env.TEST_LIVE_PROVIDER) {
      return this.providers.get('mock');
    }

    const configuredProvider = (process.env.VTO_PROVIDER || '').toLowerCase().trim();

    // If explicitly set, respect the configuration
    if (configuredProvider && this.providers.has(configuredProvider)) {
      if (configuredProvider === 'mock' && process.env.NODE_ENV === 'production') {
        const error = new Error('CRITICAL CONFIGURATION ERROR: VTO_PROVIDER=mock is forbidden in production.');
        error.code = 'PROVIDER_AUTH_ERROR';
        throw error;
      }
      return this.providers.get(configuredProvider);
    }

    // Auto-discovery priority:
    // 1. Colab GPU (if VTON_SERVICE_URL or COLAB_TRYON_URL is set)
    if (process.env.VTON_SERVICE_URL || process.env.COLAB_TRYON_URL) {
      return this.providers.get('colab');
    }

    // 2. Fashn (if FASHN_API_KEY or VTO_WORKER_URL is set)
    if (process.env.FASHN_API_KEY || process.env.VTO_WORKER_URL) {
      return this.providers.get('fashn');
    }

    // 3. Replicate (if REPLICATE_API_TOKEN is set)
    if (process.env.REPLICATE_API_TOKEN) {
      return this.providers.get('replicate');
    }

    // 4. Gemini (if GEMINI_API_KEY is set)
    if (process.env.GEMINI_API_KEY) {
      return this.providers.get('gemini');
    }

    // 5. Fallback in test/dev environment ONLY
    if (process.env.NODE_ENV !== 'production' && this.providers.has('mock')) {
      return this.providers.get('mock');
    }

    // In production with no configured credentials, fail explicitly!
    const error = new Error('No Virtual Try-On AI provider is configured. Please provide FASHN_API_KEY or REPLICATE_API_TOKEN in server configuration.');
    error.code = 'PROVIDER_AUTH_ERROR';
    throw error;
  }

  /**
   * Return ordered list of candidate providers for automatic failover/cascade
   */
  getCandidateProviders() {
    // In automated testing environment, use deterministic mock provider unless live testing is explicitly flagged
    if (process.env.NODE_ENV === 'test' && this.providers.has('mock') && !process.env.TEST_LIVE_PROVIDER) {
      return [this.providers.get('mock')];
    }

    const list = [];
    const pushIfValid = (name) => {
      if (this.providers.has(name)) {
        const p = this.providers.get(name);
        if (!list.includes(p)) list.push(p);
      }
    };

    // 1. If configured explicitly, that provider goes first
    const configured = (process.env.VTO_PROVIDER || '').toLowerCase().trim();
    if (configured && this.providers.has(configured)) {
      if (configured !== 'mock' || process.env.NODE_ENV !== 'production') {
        pushIfValid(configured);
      }
    }

    // 2. Colab GPU (Self-hosted live instance, high-speed, free)
    if (process.env.VTON_SERVICE_URL || process.env.COLAB_TRYON_URL) {
      pushIfValid('colab');
    }

    // 3. Fashn Cloud
    if (process.env.FASHN_API_KEY || process.env.VTO_WORKER_URL) {
      pushIfValid('fashn');
    }

    // 4. Replicate Cloud A100
    if (process.env.REPLICATE_API_TOKEN) {
      pushIfValid('replicate');
    }

    // 5. Gemini Inpainting
    if (process.env.GEMINI_API_KEY) {
      pushIfValid('gemini');
    }

    // 6. Mock fixture engine (development/test environments ONLY)
    if (process.env.NODE_ENV !== 'production') {
      pushIfValid('mock');
    }

    return list;
  }

  /**
   * Get health status across all configured providers
   */
  async getHealth() {
    const results = {};
    for (const [key, provider] of this.providers.entries()) {
      try {
        results[key] = await provider.healthCheck();
      } catch (err) {
        results[key] = { ready: false, error: err.message };
      }
    }
    const active = this.getActiveProvider();
    return {
      activeProvider: active.name,
      activeModel: active.model,
      providers: results,
    };
  }

  /**
   * Execute try-on inference through the active provider with automatic failover cascade
   * and strict result quality validation
   */
  async execute(input) {
    const candidates = this.getCandidateProviders();

    if (candidates.length === 0) {
      const error = new Error('No Virtual Try-On AI provider is available or configured.');
      error.code = 'PROVIDER_AUTH_ERROR';
      throw error;
    }

    let lastError = null;

    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      try {
        console.log(`[VirtualTryOnService] Executing try-on via ${provider.name} (${provider.model}) [Candidate ${i + 1}/${candidates.length}]...`);
        const result = await provider.createTryOn(input);

        if (!result || !result.resultBuffer) {
          const error = new Error(`Provider ${provider.name} did not produce a valid output buffer.`);
          error.code = 'PROVIDER_GENERATION_FAILED';
          throw error;
        }

        // Run result safety net validation
        const validated = await validateTryOnResult(result.resultBuffer, input.personBuffer, input.garmentBuffer);

        console.log(`[VirtualTryOnService] Successfully generated try-on via ${provider.name} (${provider.model})`);
        return {
          success: true,
          provider: provider.name,
          model: provider.model,
          buffer: validated.buffer,
          width: validated.width,
          height: validated.height,
          resultUrl: result.resultUrl || null,
          metadata: result.metadata || {},
        };
      } catch (err) {
        lastError = err;
        console.warn(`[VirtualTryOnService] Provider ${provider.name} failed (${err.code || 'ERROR'}): ${err.message}`);

        // If there are more candidates, continue to next provider
        if (i < candidates.length - 1) {
          console.log(`[VirtualTryOnService] Initiating automatic failover to next provider: ${candidates[i + 1].name}...`);
        }
      }
    }

    console.error('[VirtualTryOnService] All candidate providers failed.');
    throw lastError || new Error('Virtual Try-On generation could not be completed.');
  }
}

const vtoService = new VirtualTryOnService();
module.exports = vtoService;
