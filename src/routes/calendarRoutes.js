const express = require('express');
const router = express.Router({ mergeParams: true });
const { auth, authorizeRoles } = require('../middlewares/auth');
const calendarController = require('../controllers/calendarController');
const { validateRequest } = require('../middleware/validator');
const { validateAddCalendar, validateSyncCalendar } = require('../validators/calendarValidator');

// Host/Admin: manage external calendars per listing
router.get('/listings/:id/calendars', [
  auth,
  authorizeRoles('host','landlord','admin','superadmin')
], calendarController.listCalendars);

router.post('/listings/:id/calendars', [
  auth,
  authorizeRoles('host','landlord','admin','superadmin'),
  validateAddCalendar,
  validateRequest
], calendarController.addCalendar);

router.delete('/listings/:id/calendars/:calendarId', [
  auth,
  authorizeRoles('host','landlord','admin','superadmin'),
  validateSyncCalendar,
  validateRequest
], calendarController.removeCalendar);

router.post('/listings/:id/calendars/:calendarId/sync', [
  auth,
  authorizeRoles('host','landlord','admin','superadmin'),
  validateSyncCalendar,
  validateRequest
], calendarController.syncCalendar);

router.post('/listings/:id/calendars/sync-all', [
  auth,
  authorizeRoles('host','landlord','admin','superadmin')
], calendarController.syncAllCalendars);

// Public ICS export for a listing (can be protected by token later)
router.get('/listings/:id/calendar.ics', calendarController.exportListingIcs);

module.exports = router;
