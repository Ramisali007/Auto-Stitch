const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipientModel' },
    recipientModel: { 
      type: String, 
      required: true, 
      enum: ['Admin', 'BoutiqueOwner', 'Customer'],
      default: 'Customer'
    },
    sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'senderModel' },
    senderModel: { 
      type: String, 
      enum: ['Admin', 'BoutiqueOwner', 'Customer']
    },
    type: {
      type: String,
      enum: ['order_update', 'bid_received', 'bid_accepted', 'bid_rejected', 'tryon_complete', 'customization_ready', 'payment_confirmed', 'system', 'message'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

notificationSchema.post('save', function(doc) {
  try {
    const { getIO } = require('../socket');
    const io = getIO();
    io.to(doc.recipient.toString()).emit('new_notification', doc);
    console.log(`[SOCKET] Notification emitted to user: ${doc.recipient}`);
  } catch (err) {
    // Socket might not be initialized in all environments (e.g. scripts)
  }
});


module.exports = mongoose.model('Notification', notificationSchema);
