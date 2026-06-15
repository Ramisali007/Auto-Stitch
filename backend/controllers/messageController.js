const Message = require('../models/Message');
const Boutique = require('../models/Boutique');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { receiverId, boutiqueId, content, attachment } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    // Determine sender model
    const senderModel = req.user.role === 'customer' ? 'Customer' : 
                       req.user.role === 'boutique_owner' ? 'BoutiqueOwner' : 'Admin';

    // Find receiver to get their model - Search across all potential collections
    const { Customer, BoutiqueOwner, Admin } = require('../models/User');
    const receiver = await Customer.findById(receiverId) || 
                     await BoutiqueOwner.findById(receiverId) || 
                     await Admin.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }
    const receiverModel = receiver.role === 'customer' ? 'Customer' : 
                         receiver.role === 'boutique_owner' ? 'BoutiqueOwner' : 'Admin';

    const message = await Message.create({
      sender: req.user._id,
      senderModel,
      receiver: receiverId,
      receiverModel,
      boutique: boutiqueId,
      content: content || '📎 Attachment',
      attachment: attachment || ''
    });

    // Create Notification for receiver
    await Notification.create({
      recipient: receiverId,
      recipientModel: receiverModel,
      sender: req.user._id,
      senderModel,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${req.user.name}`,
      link: '/chat'
    });

    // Emit Socket Event
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      
      // Emit to recipient's personal room
      io.to(receiverId.toString()).emit('new_message', message);
      
      // Also emit to a "chat" room if users are currently viewing the conversation
      // We'll use a room name format: chat_userA_userB (sorted IDs)
      const ids = [req.user._id.toString(), receiverId.toString()].sort();
      const chatRoom = `chat_${ids[0]}_${ids[1]}`;
      io.to(chatRoom).emit('receive_message', message);
    } catch (err) {
      console.error('[SOCKET] Message emission failed:', err.message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get conversation between current user and another user
// @route   GET /api/messages/:otherUserId
// @access  Private
const getConversation = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.otherUserId },
        { sender: req.params.otherUserId, receiver: req.user._id }
      ],
      deletedBy: { $ne: req.user._id },
      isDeletedForEveryone: false
    }).sort('createdAt');

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
// @access  Private
const getMyConversations = async (req, res) => {
  try {
    // Find unique users I've chatted with
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      deletedBy: { $ne: req.user._id }
    })
    .sort('-createdAt')
    .populate('sender', 'name avatar')
    .populate('receiver', 'name avatar')
    .populate('boutique', 'name logo');

    const conversationsMap = new Map();

    messages.forEach(msg => {
      if (!msg.sender || !msg.receiver) return;

      const senderId = msg.sender._id ? msg.sender._id.toString() : msg.sender.toString();
      const currentUserId = req.user._id.toString();
      const otherUser = senderId === currentUserId ? msg.receiver : msg.sender;
      if (!otherUser) return;

      const otherUserId = otherUser._id ? otherUser._id.toString() : otherUser.toString();

      if (!conversationsMap.has(otherUserId)) {
        // If message is deleted for everyone, show placeholder
        const lastMsg = msg.isDeletedForEveryone ? { ...msg._doc, content: 'Message deleted' } : msg;
        
        conversationsMap.set(otherUserId, {
          otherUser,
          lastMessage: lastMsg,
          boutique: msg.boutique
        });
      }
    });

    res.status(200).json({ success: true, data: Array.from(conversationsMap.values()) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete a specific message
// @route   DELETE /api/messages/:messageId
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { forEveryone } = req.body;
    const message = await Message.findById(messageId);

    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (forEveryone) {
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      message.isDeletedForEveryone = true;
    } else {
      if (!message.deletedBy.includes(req.user._id)) {
        message.deletedBy.push(req.user._id);
      }
    }

    await message.save();
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete entire conversation
// @route   DELETE /api/messages/conversation/:otherUserId
const deleteConversation = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    await Message.updateMany(
      {
        $or: [
          { sender: req.user._id, receiver: otherUserId },
          { sender: otherUserId, receiver: req.user._id }
        ]
      },
      { $addToSet: { deletedBy: req.user._id } }
    );
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getMyConversations,
  deleteMessage,
  deleteConversation
};
