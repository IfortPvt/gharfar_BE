const PricingConfigService = require('../services/pricingConfigService');
const Listing = require('../models/Listing');

exports.upsertGlobal = async (req, res, next) => {
  try {
    const config = await PricingConfigService.upsertGlobal(req.body);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

exports.upsertHost = async (req, res, next) => {
  try {
    const { hostId } = req.params;
    const config = await PricingConfigService.upsertHost(hostId, req.body);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

exports.upsertListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const config = await PricingConfigService.upsertListing(listingId, req.body);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

exports.getGlobal = async (req, res, next) => {
  try {
    const config = await PricingConfigService.getGlobal();
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

exports.getHost = async (req, res, next) => {
  try {
    const { hostId } = req.params;
    const config = await PricingConfigService.getHost(hostId);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

exports.getListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const config = await PricingConfigService.getListing(listingId);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

exports.getEffectiveForListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const listing = await Listing.findById(listingId).select('host');
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    const effective = await PricingConfigService.getEffectiveConfigForListing(listing);
    res.json({ success: true, data: effective });
  } catch (err) { next(err); }
};

exports.getEffectiveForHost = async (req, res, next) => {
  try {
    const { hostId } = req.params;
    const [global, hostCfg] = await Promise.all([
      PricingConfigService.getGlobal(),
      PricingConfigService.getHost(hostId)
    ]);
    const effective = PricingConfigService.mergeConfigs(global || {}, hostCfg || {});
    res.json({ success: true, data: effective });
  } catch (err) { next(err); }
};
