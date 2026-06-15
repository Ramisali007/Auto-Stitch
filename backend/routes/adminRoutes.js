const express = require('express');
const router = express.Router();
const { 
  getAdminStats,
  getPendingBoutiques, 
  approveBoutique, 
  rejectBoutique,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  verifyUser,
  getAllProducts,
  updateProductStatus,
  deleteProductAdmin
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes here are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/verify', verifyUser);

router.get('/boutiques/pending', getPendingBoutiques);
router.put('/boutiques/:id/approve', approveBoutique);
router.put('/boutiques/:id/reject', rejectBoutique);

router.get('/products', getAllProducts);
router.patch('/products/:id/status', updateProductStatus);
router.delete('/products/:id', deleteProductAdmin);

module.exports = router;
