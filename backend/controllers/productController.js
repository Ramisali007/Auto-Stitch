const Product = require('../models/Product');
const Boutique = require('../models/Boutique');
const { z } = require('zod');

// Validation schema for product creation/update
const productSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().min(2).max(5000),
  category: z.string().min(1),
  subCategory: z.string().optional().default(''),
  price: z.number().positive(),
  discountPrice: z.number().min(0).optional().default(0),
  images: z.array(z.string().url()).max(8).optional().default([]),
  sizes: z.array(z.string()).optional().default([]),
  colors: z.array(z.string()).optional().default([]),
  material: z.string().optional().default(''),
  stock: z.number().int().min(0).optional().default(0),
  sku: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  customizationOptions: z.object({
    neckline: z.boolean().optional().default(false),
    sleeves: z.boolean().optional().default(false),
    hemline: z.boolean().optional().default(false),
    embroidery: z.boolean().optional().default(false),
  }).optional(),
  tryOnEnabled: z.boolean().optional().default(true),
});

// @desc    Get all products (with filters)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, boutique, boutiqueId, fabric, search, sort, page = 1, limit = 12 } = req.query;

    const query = { status: 'approved', isActive: true };
    if (category) query.category = category;
    if (fabric) query.material = fabric;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      // Find boutiques that match search
      const matchingBoutiques = await Boutique.find({ name: { $regex: search, $options: 'i' } }).select('_id');
      const boutiqueIds = matchingBoutiques.map(b => b._id);

      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { boutique: { $in: boutiqueIds } }
      ];
    }

    // Support boutique filter by ID or name
    if (boutiqueId) {
      query.boutique = boutiqueId;
    } else if (boutique) {
      const boutiqueDoc = await Boutique.findOne({ name: { $regex: new RegExp(`^${boutique}$`, 'i') } });
      if (boutiqueDoc) {
        query.boutique = boutiqueDoc._id;
      } else {
        // No matching boutique found, return empty
        return res.json({ success: true, products: [], pagination: { total: 0, page: 1, limit: Number(limit), pages: 0 } });
      }
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      popular: { soldCount: -1 },
      rating: { avgRating: -1 },
    };

    const sortBy = sortOptions[sort] || sortOptions.newest;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('boutique', 'name logo reputationScore')
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit))
      .select('-embedding -reviews')
      .lean();

    res.json({
      success: true,
      products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('boutique', 'name logo reputationScore address contact')
      .populate('reviews.user', 'name avatar');

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create product (boutique owner)
// @route   POST /api/products
// @access  Private (boutique_owner)
const createProduct = async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ success: false, message: errors });
    }

    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found. Please create your boutique first.' });
    }
    if (!boutique.isApproved) {
      return res.status(403).json({ success: false, message: 'Boutique not yet approved by admin.' });
    }

    const { generateProductEmbedding } = require('../utils/embeddingService');
    const embedding = generateProductEmbedding(parsed.data);

    const product = await Product.create({
      ...parsed.data,
      boutique: boutique._id,
      status: 'pending',
      embedding
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (boutique_owner)
const updateProduct = async (req, res) => {
  try {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ success: false, message: errors });
    }

    const product = await Product.findById(req.params.id).populate('boutique');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.boutique.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { generateProductEmbedding } = require('../utils/embeddingService');
    const mergedData = { ...product.toObject(), ...parsed.data };
    const embedding = generateProductEmbedding(mergedData);

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...parsed.data, embedding },
      { new: true, runValidators: true }
    );
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (boutique_owner)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('boutique');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.boutique.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    product.isActive = false;
    await product.save();
    res.json({ success: true, message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Add or update customer review
// @route   POST /api/products/:id/reviews
// @access  Private (customer)
const addReview = async (req, res) => {
  try {
    const { rating, comment, fitFeedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5 stars' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const reviewIndex = product.reviews.findIndex((r) => r.user.toString() === req.user._id.toString());
    const Review = require('../models/Review');

    if (reviewIndex !== -1) {
      // Update existing review
      product.reviews[reviewIndex].rating = Number(rating);
      product.reviews[reviewIndex].comment = comment || '';
      await Review.findOneAndUpdate(
        { product: product._id, customer: req.user._id },
        { 
          rating: Number(rating), 
          comment: comment || '', 
          fitFeedback: fitFeedback || 'True to Size',
          customerName: req.user.name || 'Customer'
        },
        { upsert: true }
      );
    } else {
      // Add new review
      product.reviews.push({ user: req.user._id, rating: Number(rating), comment: comment || '' });
      await Review.create({
        product: product._id,
        customer: req.user._id,
        customerName: req.user.name || 'Customer',
        rating: Number(rating),
        comment: comment || '',
        fitFeedback: fitFeedback || 'True to Size'
      });
    }

    product.updateAvgRating();
    await product.save();

    res.status(201).json({ 
      success: true, 
      message: 'Review submitted successfully',
      avgRating: product.avgRating,
      numReviews: product.numReviews 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all reviews for a product
// @route   GET /api/products/:id/reviews
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const Review = require('../models/Review');
    const reviews = await Review.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all products for logged in boutique
// @route   GET /api/products/my-products
// @access  Private (boutique_owner)
const getMyProducts = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    const products = await Product.find({ boutique: boutique._id })
      .sort('-createdAt')
      .lean();

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get dynamic AI-driven product recommendations
// @route   GET /api/products/recommendations
// @access  Public
const getRecommendations = async (req, res) => {
  try {
    const { category, viewedCategories, viewedProductIds, limit = 8 } = req.query;
    
    const parsedViewedIds = viewedProductIds ? viewedProductIds.split(',').filter(Boolean) : [];
    const parsedCategories = viewedCategories ? viewedCategories.split(',').filter(Boolean) : [];

    const baseQuery = { status: 'approved', isActive: true };
    if (category && category !== 'all') {
      baseQuery.category = category;
    }

    // 1. Trending Items (Weighted Sales Velocity & Views)
    const trending = await Product.find(baseQuery)
      .populate('boutique', 'name logo')
      .sort({ soldCount: -1, views: -1, createdAt: -1 })
      .limit(Number(limit))
      .select('-embedding -reviews')
      .lean();

    // 2. Top Rated / High Craftsmanship (Bayesian Rating Weighted)
    const topRated = await Product.find({ ...baseQuery, avgRating: { $gt: 0 } })
      .populate('boutique', 'name logo')
      .sort({ avgRating: -1, numReviews: -1 })
      .limit(Number(limit))
      .select('-embedding -reviews')
      .lean();

    // 3. New Boutique Drops
    const newArrivals = await Product.find(baseQuery)
      .populate('boutique', 'name logo')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select('-embedding -reviews')
      .lean();

    // 4. Personalized "For Your Style"
    let forYouQuery = { ...baseQuery };
    if (parsedCategories.length > 0) {
      forYouQuery.category = { $in: parsedCategories };
    }
    if (parsedViewedIds.length > 0) {
      forYouQuery._id = { $nin: parsedViewedIds };
    }

    let forYou = await Product.find(forYouQuery)
      .populate('boutique', 'name logo')
      .sort({ avgRating: -1, createdAt: -1 })
      .limit(Number(limit))
      .select('-embedding -reviews')
      .lean();

    // Fallback for "forYou" if user hasn't viewed enough or category is empty
    if (forYou.length < 4) {
      const fallback = await Product.find(baseQuery)
        .populate('boutique', 'name logo')
        .sort({ soldCount: -1, createdAt: -1 })
        .limit(Number(limit))
        .select('-embedding -reviews')
        .lean();
      forYou = fallback;
    }

    // Attach AI Reason Badges to products
    const attachReason = (products, defaultReason) => {
      return products.map(p => {
        let reason = defaultReason;
        if (p.avgRating >= 4.5) {
          reason = `⭐ ${p.avgRating.toFixed(1)} Rating · Top Boutique Craftsmanship`;
        } else if (p.soldCount > 0) {
          reason = `🔥 High Demand · Popular in ${p.category || 'Fashion'}`;
        } else if (p.category) {
          reason = `✨ Matches ${p.category} Style Profile`;
        }
        return { ...p, aiReason: reason };
      });
    };

    res.json({
      success: true,
      data: {
        forYou: attachReason(forYou, 'Curated for your style profile'),
        trending: attachReason(trending, 'Trending this week on Auto Stitch'),
        topRated: attachReason(topRated.length ? topRated : trending, 'Top rated by fashion stylists'),
        newArrivals: attachReason(newArrivals, 'Fresh from boutique ateliers')
      }
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Semantic & Vector Similarity Search
// @route   GET /api/products/semantic/search
// @access  Public
const semanticSearchProducts = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, limit = 12 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query string is required' });
    }

    const baseFilter = { status: 'approved', isActive: true };
    if (category && category !== 'All') {
      baseFilter.category = category;
    }
    if (minPrice || maxPrice) {
      baseFilter.price = {};
      if (minPrice) baseFilter.price.$gte = Number(minPrice);
      if (maxPrice) baseFilter.price.$lte = Number(maxPrice);
    }

    const candidateProducts = await Product.find(baseFilter)
      .populate('boutique', 'name logo reputationScore')
      .select('-reviews')
      .lean();

    const { rankProductsBySimilarity } = require('../utils/embeddingService');
    const ranked = rankProductsBySimilarity(q, candidateProducts, 0.05);

    const limited = ranked.slice(0, Number(limit));

    res.json({
      success: true,
      query: q,
      count: limited.length,
      products: limited
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ success: false, message: 'Semantic search failed', error: error.message });
  }
};

module.exports = { 
  getProducts, 
  getProduct, 
  getRecommendations,
  semanticSearchProducts,
  createProduct, 
  updateProduct, 
  deleteProduct, 
  addReview, 
  getProductReviews,
  getMyProducts 
};

