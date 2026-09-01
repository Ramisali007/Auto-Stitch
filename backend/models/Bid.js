const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    customizationRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomizationRequest', required: true },
    boutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
    price: { type: Number, required: true },
    timeline: { type: Number, required: true }, // days
    portfolioImages: [{ type: String }],
    notes: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'not_selected', 'withdrawn'],
      default: 'pending',
    },
    reputationScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bid', bidSchema);
