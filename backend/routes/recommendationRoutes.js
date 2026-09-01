const express = require('express');
const router = express.Router();
const {
  getPersonalizedRecommendations,
  getTrendingAndOccasion,
  getAiStylistSuggestions,
} = require('../controllers/recommendationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/personalized', optionalAuth, getPersonalizedRecommendations);
router.get('/trending', getTrendingAndOccasion);
router.post('/stylist', getAiStylistSuggestions);

module.exports = router;
