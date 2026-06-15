const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, getMyProducts } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getProducts);
router.get('/my-products', protect, authorize('boutique_owner'), getMyProducts);
router.get('/:id', getProduct);
router.post('/', protect, authorize('boutique_owner'), createProduct);
router.put('/:id', protect, authorize('boutique_owner'), updateProduct);
router.delete('/:id', protect, authorize('boutique_owner'), deleteProduct);
router.post('/:id/reviews', protect, authorize('customer'), addReview);

module.exports = router;
