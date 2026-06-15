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

    const product = await Product.create({ ...parsed.data, boutique: boutique._id, status: 'pending' });
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
    const updated = await Product.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true });
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

// @desc    Add review
// @route   POST /api/products/:id/reviews
// @access  Private (customer)
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const alreadyReviewed = product.reviews.find((r) => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: 'You already reviewed this product' });
    }

    product.reviews.push({ user: req.user._id, rating: Number(rating), comment });
    product.updateAvgRating();
    await product.save();

    res.status(201).json({ success: true, message: 'Review added' });
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

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, getMyProducts };
