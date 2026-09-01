/**
 * Semantic Vector Embedding & Cosine Similarity Service
 * Provides vector representation and similarity scoring for FashionCLIP-style discovery.
 */

// Simple deterministic hash-based embedding extractor (64-dimensional)
// Complements external LLM APIs with zero-latency local fallback.
const generateFeatureVector = (text = '', dimensions = 64) => {
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
    const weight = 1.0 + (tokens.length - idx) / tokens.length;
    vector[pos] += weight;
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
 * Generate semantic vector embedding for a product document
 */
const generateProductEmbedding = (product) => {
  if (!product) return new Array(64).fill(0);

  const textContext = [
    product.name || '',
    product.category || '',
    product.subCategory || '',
    product.material || '',
    (product.tags || []).join(' '),
    (product.colors || []).join(' '),
    (product.description || '').substring(0, 300)
  ].join(' ');

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
      : generateProductEmbedding(p);

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
