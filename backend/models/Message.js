const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'senderModel'
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['Customer', 'BoutiqueOwner', 'Admin', 'User']
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'receiverModel'
    },
    receiverModel: {
      type: String,
      required: true,
      enum: ['Customer', 'BoutiqueOwner', 'Admin', 'User']
    },
    boutique: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boutique'
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    attachment: {
      type: String, // URL to image if any
      default: ''
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false
    },
    deletedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'senderModel' // Use the same enum as sender
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
