const Product = require('../models/Product');
const Order = require('../models/Order');
const { Customer } = require('../models/User');
const OpenAI = require('openai');

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
};

/**
 * @desc    Get personalized product recommendations
 * @route   GET /api/recommendations/personalized
 * @access  Public / Optional Auth
 */
const getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user?._id;
    let preferredCategories = new Set();
    let preferredMaterials = new Set();
    let wishlistProductIds = [];

    if (userId) {
      const user = await Customer.findById(userId).populate('wishlist').lean();
      if (user?.wishlist?.length > 0) {
        user.wishlist.forEach((item) => {
          if (item) {
            wishlistProductIds.push(item._id.toString());
            if (item.category) preferredCategories.add(item.category);
            if (item.material) preferredMaterials.add(item.material);
          }
        });
      }

      const pastOrders = await Order.find({ customer: userId }).limit(10).lean();
      pastOrders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            if (item.category) preferredCategories.add(item.category);
          });
        }
      });
    }

    const categoriesArray = Array.from(preferredCategories);
    const materialsArray = Array.from(preferredMaterials);

    let matchQuery = { status: 'approved', isActive: true };
    if (wishlistProductIds.length > 0) {
      matchQuery._id = { $nin: wishlistProductIds };
    }

    let recommended = [];

    if (categoriesArray.length > 0 || materialsArray.length > 0) {
      const preferenceQuery = {
        ...matchQuery,
        $or: [
          ...(categoriesArray.length > 0 ? [{ category: { $in: categoriesArray } }] : []),
          ...(materialsArray.length > 0 ? [{ material: { $in: materialsArray } }] : []),
        ],
      };

      recommended = await Product.find(preferenceQuery)
        .populate('boutique', 'name logo reputationScore')
        .sort({ avgRating: -1, views: -1, createdAt: -1 })
        .limit(8)
        .lean();
    }

    if (recommended.length < 8) {
      const existingIds = recommended.map((p) => p._id.toString()).concat(wishlistProductIds);
      const filler = await Product.find({
        status: 'approved',
        isActive: true,
        _id: { $nin: existingIds },
      })
        .populate('boutique', 'name logo reputationScore')
        .sort({ soldCount: -1, avgRating: -1, createdAt: -1 })
        .limit(8 - recommended.length)
        .lean();

      recommended = [...recommended, ...filler];
    }

    res.json({
      success: true,
      count: recommended.length,
      recommendations: recommended,
      matchedPreferences: {
        categories: categoriesArray,
        materials: materialsArray,
      },
    });
  } catch (error) {
    console.error('Error fetching personalized recommendations:', error);
    res.status(500).json({ success: false, message: 'Failed to generate recommendations', error: error.message });
  }
};

/**
 * @desc    Get trending and occasion-based recommendations
 * @route   GET /api/recommendations/trending
 * @access  Public
 */
const getTrendingAndOccasion = async (req, res) => {
  try {
    const { occasion, category, maxPrice } = req.query;

    const baseQuery = { status: 'approved', isActive: true };

    if (category && category !== 'All') {
      baseQuery.category = category;
    }

    if (occasion && occasion !== 'All') {
      baseQuery.$or = [
        { category: { $regex: occasion, $options: 'i' } },
        { tags: { $in: [new RegExp(occasion, 'i')] } },
        { description: { $regex: occasion, $options: 'i' } },
      ];
    }

    if (maxPrice) {
      baseQuery.price = { $lte: Number(maxPrice) };
    }

    const [trending, topRated, newArrivals] = await Promise.all([
      Product.find(baseQuery)
        .populate('boutique', 'name logo reputationScore')
        .sort({ views: -1, soldCount: -1 })
        .limit(8)
        .lean(),
      Product.find(baseQuery)
        .populate('boutique', 'name logo reputationScore')
        .sort({ avgRating: -1, numReviews: -1 })
        .limit(8)
        .lean(),
      Product.find(baseQuery)
        .populate('boutique', 'name logo reputationScore')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    res.json({
      success: true,
      trending,
      topRated,
      newArrivals,
    });
  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending products', error: error.message });
  }
};

/**
 * @desc    AI Personal Stylist recommendations
 * @route   POST /api/recommendations/stylist
 * @access  Public
 */
const getAiStylistSuggestions = async (req, res) => {
  try {
    const { query, occasion, budget } = req.body;

    const dbQuery = { status: 'approved', isActive: true };
    if (budget && Number(budget) > 0) {
      dbQuery.price = { $lte: Number(budget) };
    }

    const availableProducts = await Product.find(dbQuery)
      .populate('boutique', 'name')
      .sort({ avgRating: -1, createdAt: -1 })
      .limit(16)
      .select('name description category price material sizes colors boutique tryOnEnabled images')
      .lean();

    const groq = getGroqClient();
    if (!groq || availableProducts.length === 0) {
      return res.json({
        success: true,
        advice: `Based on your request for "${query || occasion || 'Formal Look'}", we selected these premium pieces tailored to your style criteria.`,
        recommendedProducts: availableProducts.slice(0, 4),
      });
    }

    const catalogSummary = availableProducts.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      category: p.category,
      price: `PKR ${p.price}`,
      material: p.material || 'Premium Fabric',
      boutique: p.boutique?.name || 'Partner Boutique',
    }));

    const systemPrompt = `You are "Sartoria", an elite Pakistani AI fashion stylist for Auto Stitch.
Catalog items available:
${JSON.stringify(catalogSummary, null, 2)}
Respond in STRICT JSON format:
{
  "advice": "Your styling advice (2-3 concise paragraphs)",
  "selectedProductIds": ["id1", "id2"]
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Style Request: ${query || occasion}. Budget: ${budget || 'Flexible'}` },
      ],
      response_format: { type: 'json_object' },
    });

    let parsedResult = { advice: '', selectedProductIds: [] };
    try {
      parsedResult = JSON.parse(completion.choices[0].message.content);
    } catch (_) {
      parsedResult = {
        advice: 'Here are our top curated selections for your style requirement.',
        selectedProductIds: availableProducts.slice(0, 4).map((p) => p._id.toString()),
      };
    }

    let matchedProducts = [];
    if (parsedResult.selectedProductIds?.length > 0) {
      matchedProducts = availableProducts.filter((p) =>
        parsedResult.selectedProductIds.includes(p._id.toString())
      );
    }
    if (matchedProducts.length === 0) {
      matchedProducts = availableProducts.slice(0, 4);
    }

    res.json({
      success: true,
      advice: parsedResult.advice || `Curated selections for ${query || occasion}.`,
      recommendedProducts: matchedProducts,
    });
  } catch (error) {
    console.error('Error in AI stylist:', error);
    res.status(500).json({ success: false, message: 'AI Stylist error', error: error.message });
  }
};

module.exports = {
  getPersonalizedRecommendations,
  getTrendingAndOccasion,
  getAiStylistSuggestions,
};
