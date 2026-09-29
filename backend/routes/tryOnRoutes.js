const express = require('express');
const router = express.Router();
const {
  createSession,
  createJob,
  getJobStatus,
  cancelJob,
  getTryOnCatalog,
  processTryOn,
  getProviderHealth,
  downloadRender,
} = require('../controllers/tryOnController');
const { optionalAuth, protect } = require('../middleware/authMiddleware');
const { vtoLimiter } = require('../middleware/rateLimiter');

// Direct Device Download Stream (Forces Attachment Save)
router.get('/download', downloadRender);

// Provider Health & Diagnostics
router.get('/health', getProviderHealth);

// Production Asynchronous Endpoints
router.post('/session', optionalAuth, createSession);
router.post('/jobs', vtoLimiter, optionalAuth, createJob);
router.get('/jobs/:jobId', optionalAuth, getJobStatus);
router.delete('/jobs/:jobId', optionalAuth, cancelJob);
router.get('/catalog', getTryOnCatalog);

// Instant Synchronous Endpoint
router.post('/process', vtoLimiter, processTryOn);

module.exports = router;
