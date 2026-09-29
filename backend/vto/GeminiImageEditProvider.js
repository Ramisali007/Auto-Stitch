/**
 * GeminiImageEditProvider - Multimodal Generative Fitting via Google Gemini
 * Uses Google Generative AI multimodal image editing to preserve person identity,
 * pose, and background while transferring the authentic garment.
 */

const VirtualTryOnProvider = require('./VirtualTryOnProvider');

class GeminiImageEditProvider extends VirtualTryOnProvider {
  constructor(apiKey = process.env.GEMINI_API_KEY) {
    super('gemini-fitting', 'gemini-2.0-flash-exp', '1.0.0');
    this.apiKey = apiKey || null;
  }

  async healthCheck() {
    if (!this.apiKey) {
      return { ready: false, name: this.name, model: this.model, details: { message: 'GEMINI_API_KEY not configured' } };
    }
    return { ready: true, name: this.name, model: this.model, mode: 'google-multimodal-genai' };
  }

  async createTryOn(input) {
    if (!this.apiKey) {
      const err = new Error('GEMINI_API_KEY is not configured.');
      err.code = 'PROVIDER_AUTH_ERROR';
      throw err;
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);

    const { personBuffer, garmentBuffer, category = 'tops', garmentName = 'Garment' } = input;

    // Use Gemini multimodal generation with image inlining
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Task: High-Fidelity Virtual Try-On synthesis.
Input 1: A customer photograph.
Input 2: A luxury boutique garment (${category}: ${garmentName}).
Requirement: Synthesize a photorealistic image of the EXACT same customer wearing the garment from Input 2.
Strict Constraints:
1. Preserve the person's face, facial features, hair, skin tone, and body pose identically.
2. Replace only the clothing with the new garment.
3. Preserve realistic cloth drape, folds, shadows, and natural occlusion (e.g. hands in front of garment).
4. Preserve the background of the original photograph.`;

    const parts = [
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: personBuffer.toString('base64'),
        },
      },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: garmentBuffer.toString('base64'),
        },
      },
    ];

    try {
      const result = await model.generateContent(parts);
      const response = await result.response;
      
      // If the model returned an image part or inline data
      const candidates = response.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData?.data) {
            return {
              status: 'completed',
              resultBuffer: Buffer.from(part.inlineData.data, 'base64'),
              metadata: { provider: 'gemini', model: this.model },
            };
          }
        }
      }

      // If text-only was returned because image output isn't enabled on this endpoint
      throw new Error('Gemini model did not return image data for virtual try-on');
    } catch (err) {
      const error = new Error(`Gemini VTO failed: ${err.message}`);
      error.code = 'PROVIDER_GENERATION_FAILED';
      throw error;
    }
  }
}

module.exports = GeminiImageEditProvider;
