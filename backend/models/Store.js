const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    hours: { type: String, default: 'Mon - Sat: 10 AM - 08 PM' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    mapUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeSchema.index({ city: 1 });

module.exports = mongoose.model('Store', storeSchema);
