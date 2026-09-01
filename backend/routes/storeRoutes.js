const express = require('express');
const router = express.Router();
const { getStores } = require('../controllers/storeController');

router.get('/', getStores);

module.exports = router;
