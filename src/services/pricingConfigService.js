const PricingConfig = require('../models/PricingConfig');

class PricingConfigService {
  static async upsertGlobal(payload) {
    return PricingConfig.findOneAndUpdate(
      { scope: 'global' },
      { scope: 'global', ...payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async upsertHost(hostId, payload) {
    return PricingConfig.findOneAndUpdate(
      { scope: 'host', host: hostId },
      { scope: 'host', host: hostId, ...payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async upsertListing(listingId, payload) {
    return PricingConfig.findOneAndUpdate(
      { scope: 'listing', listing: listingId },
      { scope: 'listing', listing: listingId, ...payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async getGlobal() {
    return PricingConfig.findOne({ scope: 'global' }).lean();
  }

  static async getHost(hostId) {
    return PricingConfig.findOne({ scope: 'host', host: hostId }).lean();
  }

  static async getListing(listingId) {
    return PricingConfig.findOne({ scope: 'listing', listing: listingId }).lean();
  }

  static resolveValue(field) {
    // field: { value, isFree, mode? }
    if (!field) return { value: undefined, isFree: false, mode: undefined };
    if (field.isFree) return { value: 0, isFree: true, mode: field.mode };
    return { value: field.value ?? undefined, isFree: false, mode: field.mode };
  }

  static mergeConfigs(base = {}, override = {}) {
    const merged = { ...base };
    ['serviceFee', 'tax', 'cleaningFee', 'petFeePerNight', 'petDepositPerPet'].forEach(key => {
      if (override && override[key] !== undefined) {
        merged[key] = { ...(base[key] || {}), ...(override[key] || {}) };
      }
    });
    merged.enabled = override.enabled !== undefined ? override.enabled : (base.enabled ?? true);
    return merged;
  }

  static async getEffectiveConfigForListing(listing) {
    const [global, hostCfg, listingCfg] = await Promise.all([
      this.getGlobal(),
      this.getHost(listing.host),
      this.getListing(listing._id)
    ]);

    let effective = this.mergeConfigs({}, global || {});
    effective = this.mergeConfigs(effective, hostCfg || {});
    effective = this.mergeConfigs(effective, listingCfg || {});

    return effective;
  }
}

module.exports = PricingConfigService;
