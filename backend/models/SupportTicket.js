const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    topic: { type: String, required: true },
    message: { type: String, required: true },
    orderNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

supportTicketSchema.index({ email: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
