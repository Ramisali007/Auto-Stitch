const mongoose = require('mongoose');

const tryOnJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    sessionToken: {
      type: String,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    boutique: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    category: {
      type: String,
      default: 'dresses',
    },
    personObjectKey: {
      type: String,
      default: '',
    },
    garmentObjectKey: {
      type: String,
      default: '',
    },
    resultObjectKey: {
      type: String,
      default: '',
    },
    resultUrl: {
      type: String,
      default: '',
    },
    modelVersion: {
      type: String,
      default: 'fashn-vton-1.5',
    },
    pipelineVersion: {
      type: String,
      default: 'vto-pipeline-1.0.0',
    },
    failureCode: {
      type: String,
      default: '',
    },
    errorDescription: {
      type: String,
      default: '',
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TryOnJob', tryOnJobSchema);
