const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    boutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0 },
    images: [{ type: String }], // Up to 8 images (S3 URLs)
    sizes: [{ type: String }],
    colors: [{ type: String }],
    material: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, default: '' },
    tags: [{ type: String }],
    customizationOptions: {
      neckline: { type: Boolean, default: false },
      sleeves: { type: Boolean, default: false },
      hemline: { type: Boolean, default: false },
      embroidery: { type: Boolean, default: false },
    },
    tryOnEnabled: { type: Boolean, default: true },
    reviews: [reviewSchema],
    avgRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'draft'], default: 'pending' },
    isActive: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    // FashionCLIP embedding placeholder (stored as array)
    embedding: [{ type: Number }],
  },
  { timestamps: true }
);

productSchema.index({ status: 1, isActive: 1 });
productSchema.index({ boutique: 1, status: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1 });


// Update average rating on review change
productSchema.methods.updateAvgRating = function () {
  if (this.reviews.length === 0) {
    this.avgRating = 0;
    this.numReviews = 0;
  } else {
    this.avgRating = this.reviews.reduce((acc, r) => acc + r.rating, 0) / this.reviews.length;
    this.numReviews = this.reviews.length;
  }
};

module.exports = mongoose.model('Product', productSchema);
