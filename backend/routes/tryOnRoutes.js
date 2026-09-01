const express = require('express');
const router = express.Router();
const { getTryOnCatalog, processTryOn } = require('../controllers/tryOnController');

router.get('/catalog', getTryOnCatalog);
router.post('/process', processTryOn);

module.exports = router;
