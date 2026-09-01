const mongoose = require('mongoose');

const customizationRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    product: { type: String, required: true }, // Changed from ObjectId to String to support Mock IDs (e.g. 'e1')
    selectedRegions: [{ type: String, enum: ['neckline', 'sleeves', 'hemline', 'embroidery', 'collar', 'cuffs'] }],
    referenceImages: [{ type: String }],
    description: { type: String, default: '' },
    previewImage: { type: String },
    status: {
      type: String,
      enum: ['processing', 'preview_ready', 'submitted', 'bidding', 'bid_accepted', 'completed', 'expired', 'cancelled'],
      default: 'processing',
    },
    budget: { type: Number },
    notes: { type: String },
    expiresAt: { type: Date },
    bids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bid' }],
    acceptedBid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
    category: { type: String },
    revisionHistory: [
      {
        previewImage: String,
        regions: [String],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

customizationRequestSchema.index({ customer: 1, createdAt: -1 });
customizationRequestSchema.index({ status: 1 });


module.exports = mongoose.model('CustomizationRequest', customizationRequestSchema);
