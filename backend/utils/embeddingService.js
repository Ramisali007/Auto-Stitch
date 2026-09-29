/**
 * Semantic Vector Embedding & Cosine Similarity Service
 * Provides vector representation and similarity scoring for FashionCLIP-style discovery.
 */

// Domain weights for luxury tailoring discovery
const FASHION_KEYWORDS = {
  'pret': 2.5, 'couture': 2.8, 'bridal': 3.0, 'embroidered': 2.2, 'chiffon': 2.0,
  'organza': 2.0, 'silk': 2.2, 'velvet': 2.5, 'lawn': 1.8, 'bespoke': 2.8,
  'handcrafted': 2.4, 'festive': 2.0, 'zardozi': 2.6, 'formal': 2.0
};

// Generates 128-dimensional high-fidelity vector representation
const generateFeatureVector = (text = '', dimensions = 128) => {
  const vector = new Array(dimensions).fill(0);
  if (!text || typeof text !== 'string') return vector;

  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return vector;

  tokens.forEach((token, idx) => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }

    const pos = Math.abs(hash) % dimensions;
    const domainMultiplier = FASHION_KEYWORDS[token] || 1.0;
    const positionWeight = 1.0 + (tokens.length - idx) / tokens.length;
    vector[pos] += domainMultiplier * positionWeight;
  });

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = Number((vector[i] / magnitude).toFixed(6));
    }
  }

  return vector;
};

/**
 * Optional HuggingFace FashionCLIP Inference Pipeline
 */
const generateHuggingFaceEmbedding = async (text) => {
  if (!process.env.HUGGINGFACE_API_KEY) return null;
  try {
    const response = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/clip-ViT-B-32", {
      headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
      method: "POST",
      body: JSON.stringify({ inputs: text }),
      signal: AbortSignal.timeout(3500)
    });
    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result) && typeof result[0] === 'number') {
        return result;
      }
    }
  } catch (_) {}
  return null;
};

/**
 * Generate semantic vector embedding for a product document
 */
const generateProductEmbedding = async (product) => {
  if (!product) return new Array(128).fill(0);

  const textContext = [
    product.name || '',
    product.category || '',
    product.subCategory || '',
    product.material || '',
    (product.tags || []).join(' '),
    (product.colors || []).join(' '),
    (product.description || '').substring(0, 300)
  ].join(' ');

  const hfVec = await generateHuggingFaceEmbedding(textContext);
  if (hfVec) return hfVec;

  return generateFeatureVector(textContext);
};

/**
 * Generate semantic vector embedding for user search query
 */
const generateQueryEmbedding = (query) => {
  return generateFeatureVector(query);
};

/**
 * Calculate Cosine Similarity between two equal-length vectors
 */
const cosineSimilarity = (vecA = [], vecB = []) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Rank a list of product documents by similarity to a search prompt
 */
const rankProductsBySimilarity = (query, products = [], threshold = 0.15) => {
  if (!query || !products || products.length === 0) return products;

  const queryVec = generateQueryEmbedding(query);

  const scored = products.map(p => {
    const prodVec = (p.embedding && p.embedding.length === queryVec.length)
      ? p.embedding
      : generateFeatureVector([p.name, p.category, p.material, p.description].filter(Boolean).join(' '));

    const score = cosineSimilarity(queryVec, prodVec);
    return { product: p, score };
  });

  // Sort descending by similarity score
  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter(item => item.score >= threshold)
    .map(item => ({
      ...item.product,
      similarityScore: Number(item.score.toFixed(4))
    }));
};

module.exports = {
  generateProductEmbedding,
  generateQueryEmbedding,
  cosineSimilarity,
  rankProductsBySimilarity
};
