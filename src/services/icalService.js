const axios = require('axios');
const ical = require('node-ical');
const Listing = require('../models/Listing');
const ListingCalendar = require('../models/ListingCalendar');
const BlockedDate = require('../models/BlockedDate');

class IcalService {
  // Add or update an external calendar URL for a listing
  static async upsertCalendar(listingId, { url, provider = 'other', feedToken }) {
    const doc = await ListingCalendar.findOneAndUpdate(
      { listing: listingId, url },
      { listing: listingId, url, provider, ...(feedToken && { feedToken }) },
      { upsert: true, new: true }
    );
    return doc;
  }

  static async listCalendars(listingId) {
    return ListingCalendar.find({ listing: listingId }).sort({ createdAt: -1 }).lean();
  }

  // Remove an external calendar
  static async removeCalendar(listingId, calendarId) {
    await ListingCalendar.deleteOne({ _id: calendarId, listing: listingId });
    return { success: true };
  }

  // Fetch and import events from a calendar URL into BlockedDate
  static async syncCalendar(listingId, calendarId) {
    const cal = await ListingCalendar.findOne({ _id: calendarId, listing: listingId });
    if (!cal) throw new Error('Calendar not found');

    try {
      const res = await axios.get(cal.url, { responseType: 'text', headers: {
        ...(cal.lastEtag ? { 'If-None-Match': cal.lastEtag } : {}),
        ...(cal.lastModified ? { 'If-Modified-Since': cal.lastModified } : {})
      }});

      const text = res.data;
      const data = ical.parseICS(text);

      const existingByUid = new Map();
      const existing = await BlockedDate.find({ listing: listingId, source: 'external' }).lean();
      existing.forEach(e => { if (e.eventUid) existingByUid.set(e.eventUid, e); });

      let imported = 0; let removed = 0;

      for (const key of Object.keys(data)) {
        const ev = data[key];
        if (!ev || ev.type !== 'VEVENT') continue;

        const uid = ev.uid || `${cal._id}:${key}`;
        const start = ev.start ? new Date(ev.start) : null;
        const end = ev.end ? new Date(ev.end) : null;
        if (!start || !end) continue;

        // Upsert blocked date
        await BlockedDate.findOneAndUpdate(
          { listing: listingId, eventUid: uid },
          {
            listing: listingId,
            source: 'external',
            provider: cal.provider,
            eventUid: uid,
            summary: ev.summary,
            description: ev.description,
            start,
            end,
            isAllDay: !!ev.datetype || false,
            raw: ev,
            importedAt: new Date()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        imported += 1;
      }

      cal.lastSyncAt = new Date();
      cal.lastStatus = 'success';
      cal.lastEtag = res.headers.etag || cal.lastEtag;
      cal.lastModified = res.headers['last-modified'] || cal.lastModified;
      cal.stats = cal.stats || {};
      cal.stats.importedEvents = (cal.stats.importedEvents || 0) + imported;
      await cal.save();

      return { success: true, imported };
    } catch (err) {
      cal.lastSyncAt = new Date();
      cal.lastStatus = 'error';
      cal.lastError = err.message;
      await cal.save();
      throw err;
    }
  }

  static async syncAllForListing(listingId) {
    const calendars = await ListingCalendar.find({ listing: listingId, active: true });
    const results = [];
    for (const cal of calendars) {
      try {
        const r = await this.syncCalendar(listingId, cal._id);
        results.push({ calendarId: cal._id.toString(), ...r });
      } catch (e) {
        results.push({ calendarId: cal._id.toString(), success: false, error: e.message });
      }
    }
    return { success: true, results };
  }

  // Export ICS feed for a listing, combining internal bookings and external blocks
  static async generateListingIcs(listingId) {
    const listing = await Listing.findById(listingId);
    if (!listing) throw new Error('Listing not found');

    // Fetch internal confirmed bookings as blocked events
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ listing: listingId, status: { $in: ['confirmed','checked-in'] } })
      .select('checkIn checkOut');

    const externals = await BlockedDate.find({ listing: listingId, source: 'external' }).select('start end summary provider eventUid');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gharfar//Calendar//EN'
    ];

    const pushEvent = (uid, start, end, summary) => {
      const dt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dt(new Date())}`);
      lines.push(`DTSTART:${dt(new Date(start))}`);
      lines.push(`DTEND:${dt(new Date(end))}`);
      if (summary) lines.push(`SUMMARY:${summary}`);
      lines.push('END:VEVENT');
    };

    bookings.forEach(b => pushEvent(`internal-${b._id}`, b.checkIn, b.checkOut, 'Booked'));
    externals.forEach(e => pushEvent(`external-${e.eventUid || e._id}`, e.start, e.end, e.summary || `Blocked (${e.provider})`));

    lines.push('END:VCALENDAR');
    return lines.join('\n');
  }
}

module.exports = IcalService;
