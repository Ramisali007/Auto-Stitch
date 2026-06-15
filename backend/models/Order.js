const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  size: { type: String },
  color: { type: String },
});

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    boutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
    items: [orderItemSchema],
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      province: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ['cod', 'card', 'stripe_full', 'stripe_installment'], default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    stripePaymentIntentId: { type: String },
    itemsTotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: { type: String },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['placed', 'accepted', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'dispute', 'refund_requested', 'refunded'],
      default: 'placed',
    },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    statusHistory: [
      {
        status: String,
        note: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    isCustomOrder: { type: Boolean, default: false },
    customizationRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomizationRequest' },
    installmentPlan: {
      enabled: { type: Boolean, default: false },
      installments: [
        {
          amount: Number,
          dueDate: Date,
          paidAt: Date,
          status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
        },
      ],
    },
    notes: { type: String },
    returnRequest: {
      reason: String,
      evidenceImages: [String],
      requestedAt: Date,
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    },
    referenceId: { type: String, index: true },
  },
  { timestamps: true }
);

orderSchema.pre('save', function () {
  if (!this.referenceId) {
    this.referenceId = this._id.toString().slice(-6).toUpperCase();
  }
});

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ boutique: 1, createdAt: -1 });
orderSchema.index({ status: 1 });


module.exports = mongoose.model('Order', orderSchema);
