const IcalService = require('../services/icalService');

exports.addCalendar = async (req, res, next) => {
  try {
    const { id: listingId } = req.params;
    const { url, provider, feedToken } = req.body;
    const cal = await IcalService.upsertCalendar(listingId, { url, provider, feedToken });
    res.json({ success: true, data: cal });
  } catch (err) { next(err); }
};

exports.listCalendars = async (req, res, next) => {
  try {
    const { id: listingId } = req.params;
    const items = await IcalService.listCalendars(listingId);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

exports.removeCalendar = async (req, res, next) => {
  try {
    const { id: listingId, calendarId } = req.params;
    const result = await IcalService.removeCalendar(listingId, calendarId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.syncCalendar = async (req, res, next) => {
  try {
    const { id: listingId, calendarId } = req.params;
    const result = await IcalService.syncCalendar(listingId, calendarId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.syncAllCalendars = async (req, res, next) => {
  try {
    const { id: listingId } = req.params;
    const result = await IcalService.syncAllForListing(listingId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.exportListingIcs = async (req, res, next) => {
  try {
    const { id: listingId } = req.params;
    const ics = await IcalService.generateListingIcs(listingId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=listing-${listingId}.ics`);
    res.send(ics);
  } catch (err) { next(err); }
};
