const express = require('express');
const router = express.Router();
const { 
  sendMessage, 
  getConversation, 
  getMyConversations, 
  deleteMessage, 
  deleteConversation 
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', sendMessage);
router.get('/conversations', getMyConversations);
router.get('/:otherUserId', getConversation);
router.delete('/:messageId', deleteMessage);
router.delete('/conversation/:otherUserId', deleteConversation);

module.exports = router;
