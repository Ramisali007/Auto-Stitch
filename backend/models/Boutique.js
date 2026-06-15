const mongoose = require('mongoose');

const boutiqueSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'BoutiqueOwner', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    category: [{ type: String }],
    address: {
      street: String,
      city: String,
      province: String,
      postalCode: String,
    },
    contact: {
      phone: String,
      email: String,
      website: String,
    },
    kyc: {
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      cnic: { type: String },
      businessCertificate: { type: String },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewNotes: { type: String },
    },
    reputationScore: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    onTimeDeliveryRate: { type: Number, default: 0 },
    bidAcceptanceRate: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    shippingZones: [{ type: String }],
    socialLinks: {
      instagram: String,
      facebook: String,
    },
  },
  { timestamps: true }
);

boutiqueSchema.index({ owner: 1 });
boutiqueSchema.index({ isApproved: 1 });
boutiqueSchema.index({ name: 'text' }); // Text search support


module.exports = mongoose.model('Boutique', boutiqueSchema);
