const mongoose = require('mongoose');

const FeeSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  value: { type: Number, default: 0, min: 0 },
  isFree: { type: Boolean, default: false }
}, { _id: false });

const FlatSchema = new mongoose.Schema({
  value: { type: Number, default: 0, min: 0 },
  isFree: { type: Boolean, default: false }
}, { _id: false });

const PricingConfigSchema = new mongoose.Schema({
  scope: {
    type: String,
    enum: ['global', 'host', 'listing'],
    required: true
  },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
  enabled: { type: Boolean, default: true },

  serviceFee: { type: FeeSchema, default: () => ({}) },
  tax: { type: FeeSchema, default: () => ({}) },
  cleaningFee: { type: FlatSchema, default: () => ({}) },
  petFeePerNight: { type: FlatSchema, default: () => ({}) },
  petDepositPerPet: { type: FlatSchema, default: () => ({}) },

  notes: { type: String, maxlength: 500 }
}, { timestamps: true });

// Uniqueness constraints per scope
PricingConfigSchema.index({ scope: 1 }, { unique: true, partialFilterExpression: { scope: 'global' } });
PricingConfigSchema.index({ scope: 1, host: 1 }, { unique: true, partialFilterExpression: { scope: 'host' } });
PricingConfigSchema.index({ scope: 1, listing: 1 }, { unique: true, partialFilterExpression: { scope: 'listing' } });

module.exports = mongoose.model('PricingConfig', PricingConfigSchema);
