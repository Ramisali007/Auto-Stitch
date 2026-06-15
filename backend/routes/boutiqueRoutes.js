const express = require('express');
const router = express.Router();
const { getBoutiqueById, getAllBoutiques } = require('../controllers/boutiqueController');

router.get('/', getAllBoutiques);
router.get('/:id', getBoutiqueById);

module.exports = router;
