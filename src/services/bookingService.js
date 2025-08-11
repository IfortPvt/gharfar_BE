const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const User = require('../models/User');
const BaseService = require('./baseService');
const PricingConfigService = require('./pricingConfigService');
const BlockedDate = require('../models/BlockedDate');

// Create a new booking
exports.createBooking = async (bookingData, guestId) => {
  try {
    // Validate listing exists and is active
    const listing = await Listing.findById(bookingData.listing);
    if (!listing || !listing.isActive) {
      throw new Error('Listing not found or not available');
    }

    // Normalize date fields (accept checkIn/checkOut or checkInDate/checkOutDate)
    const checkInRaw = bookingData.checkIn || bookingData.checkInDate;
    const checkOutRaw = bookingData.checkOut || bookingData.checkOutDate;

    if (!checkInRaw || !checkOutRaw) {
      throw new Error('checkIn and checkOut are required');
    }

    const checkInDate = new Date(checkInRaw);
    const checkOutDate = new Date(checkOutRaw);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error('Invalid check-in or check-out date');
    }

    // Prevent past-date bookings (allow same-day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (checkInDate < todayStart) {
      throw new Error('Check-in date cannot be in the past');
    }

    // Compute nights early (required in schema)
    const MS_PER_NIGHT = 1000 * 60 * 60 * 24;
    const nights = Math.ceil((checkOutDate - checkInDate) / MS_PER_NIGHT);
    if (nights <= 0) {
      throw new Error('Invalid date range');
    }

    // Normalize guests
    const adults = bookingData.adults ?? bookingData.guests ?? 1;
    const children = bookingData.children || 0;
    const totalGuests = adults + children;
    if (totalGuests > listing.maxGuests) {
      throw new Error(`Property can accommodate maximum ${listing.maxGuests} guests`);
    }

    // Normalize pets: accept petDetails or pets[] alias
    const mapPetType = (t) => {
      const s = (t || '').toString().toLowerCase();
      if (s.startsWith('dog')) return 'Dog';
      if (s.startsWith('cat')) return 'Cat';
      if (s.startsWith('bird')) return 'Bird';
      if (s.startsWith('fish')) return 'Fish';
      if (s.startsWith('rabbit')) return 'Rabbit';
      return 'Other';
    };

    let petDetails = bookingData.petDetails;
    if (!petDetails && Array.isArray(bookingData.pets)) {
      const petsArr = bookingData.pets;
      petDetails = {
        hasPets: petsArr.length > 0,
        numberOfPets: petsArr.length,
        petTypes: [...new Set(petsArr.map(p => mapPetType(p.type)))],
        petInfo: petsArr.map(p => ({
          name: p.name,
          type: mapPetType(p.type),
          breed: p.breed,
          weight: p.weight,
          age: p.age,
          vaccinated: p.vaccinated === true,
          notes: p.specialNeeds
        }))
      };
    }

    // Validate pet policy if pets are included
    if (petDetails?.hasPets || (petDetails && (petDetails.numberOfPets || 0) > 0)) {
      if (!listing.petPolicy?.petsAllowed) {
        throw new Error('Pets are not allowed at this property');
      }
      const numberOfPets = petDetails.numberOfPets || 0;
      if (listing.petPolicy.maxPets != null && numberOfPets > listing.petPolicy.maxPets) {
        throw new Error(`Property allows maximum ${listing.petPolicy.maxPets} pets`);
      }
      // Filter petTypes to allowed ones if configured
      if (petDetails.petTypes && Array.isArray(listing.petPolicy.petTypes) && listing.petPolicy.petTypes.length) {
        const allowedPetTypes = listing.petPolicy.petTypes;
        const invalidPetTypes = petDetails.petTypes.filter(type => !allowedPetTypes.includes(type));
        if (invalidPetTypes.length > 0) {
          throw new Error(`Pet types not allowed: ${invalidPetTypes.join(', ')}`);
        }
      }
    }

    // Check availability for the requested dates
    const isAvailable = await this.checkAvailability(
      bookingData.listing,
      checkInDate,
      checkOutDate
    );
    if (!isAvailable) {
      throw new Error('Property is not available for the selected dates');
    }

    // Calculate pricing
    const pricing = await this.calculateBookingPrice(
      listing,
      checkInDate,
      checkOutDate,
      totalGuests,
      petDetails?.numberOfPets || 0
    );

    // Determine booking type
    const bookingType = listing.instantBook ? 'instant' : 'request';

    // Normalize payment: accept payment or paymentMethod alias
    let payment = bookingData.payment || {};
    if (!payment.method) {
      const m = bookingData.paymentMethod || bookingData.payment_method;
      if (m) {
        const norm = m.toString().toLowerCase();
        if (['credit_card', 'credit', 'card', 'stripe', 'stripe_card', 'visa', 'mastercard'].includes(norm)) {
          payment.method = 'credit_card';
        } else if (['debit_card', 'debit'].includes(norm)) {
          payment.method = 'debit_card';
        } else if (norm === 'paypal') {
          payment.method = 'paypal';
        } else if (['bank', 'bank_transfer', 'wire'].includes(norm)) {
          payment.method = 'bank_transfer';
        }
      }
    }
    // Default to credit_card if still missing
    if (!payment.method) {
      payment.method = 'credit_card';
    }

    // Create booking object (include required nights & totalGuests)
    const booking = new Booking({
      listing: bookingData.listing,
      guest: guestId,
      host: listing.host,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      adults,
      children,
      infants: bookingData.infants || 0,
      totalGuests,
      petDetails: petDetails || { hasPets: false, numberOfPets: 0 },
      pricing,
      status: bookingType === 'instant' ? 'confirmed' : 'pending',
      bookingType,
      payment,
      guestMessage: bookingData.guestMessage,
      specialRequests: bookingData.specialRequests || []
    });

    await booking.save();

    // Optionally record internal block (so generateListingIcs always reflects it). External ICS already includes bookings via DB read.
    try {
      const BlockedDate = require('../models/BlockedDate');
      await BlockedDate.create({
        listing: bookingData.listing,
        source: 'internal',
        provider: 'other',
        summary: 'Booked',
        start: checkInDate,
        end: checkOutDate,
        importedAt: new Date()
      });
    } catch (e) {
      // best-effort; ignore duplicates
    }

    return await Booking.findById(booking._id)
      .populate('listing', 'title images location host')
      .populate('guest', 'fullName email profileImage')
      .populate('host', 'fullName email profileImage');

  } catch (error) {
    throw error;
  }
};

// Get bookings by user (guest or host)
exports.getBookingsByUser = async (req, userId, userType = 'guest') => {
  try {
    const userField = userType === 'guest' ? 'guest' : 'host';

    // Pick only allowed filters from query
    const { status, startDate, endDate, listingId, hasPets } = req.query;

    const filters = { [userField]: userId };

    // Status filter (ignore 'all')
    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        filters.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        filters.status = { $in: status.split(',').map(s => s.trim()).filter(Boolean) };
      } else {
        filters.status = status;
      }
    }

    // Date range filter on checkIn
    if (startDate || endDate) {
      filters.checkIn = {};
      if (startDate) filters.checkIn.$gte = new Date(startDate);
      if (endDate) filters.checkIn.$lte = new Date(endDate);
    }

    // Listing filter
    if (listingId) {
      filters.listing = listingId;
    }

    // Pets filter
    if (typeof hasPets !== 'undefined') {
      filters['petDetails.hasPets'] = hasPets === true || hasPets === 'true';
    }

    const populateOptions = [
      { path: 'listing', select: 'title images location' },
      { path: 'guest', select: 'fullName email profileImage' },
      { path: 'host', select: 'fullName email profileImage' }
    ];

    return BaseService.findWithPagination(
      Booking,
      filters,
      req,
      populateOptions,
      `${userType} bookings retrieved successfully`,
      { checkIn: 1, createdAt: -1 }
    );
  } catch (error) {
    throw error;
  }
};

// Get a specific booking by ID
exports.getBookingById = async (bookingId, userId = null) => {
  try {
    let query = { _id: bookingId };
    
    // If userId provided, ensure user has access to this booking
    if (userId) {
      query.$or = [{ guest: userId }, { host: userId }];
    }

    const booking = await Booking.findOne(query)
      .populate('listing')
      .populate('guest', 'fullName email profileImage phone')
      .populate('host', 'fullName email profileImage phone');

    if (!booking) {
      throw new Error('Booking not found or access denied');
    }

    return booking;
  } catch (error) {
    throw error;
  }
};

// Get booking by human-readable ID
exports.getBookingByReadableId = async (bookingId, userId = null) => {
  try {
    let query = { bookingId };
    
    // If userId provided, ensure user has access to this booking
    if (userId) {
      query.$or = [{ guest: userId }, { host: userId }];
    }

    const booking = await Booking.findOne(query)
      .populate('listing')
      .populate('guest', 'fullName email profileImage phone')
      .populate('host', 'fullName email profileImage phone');

    if (!booking) {
      throw new Error('Booking not found or access denied');
    }

    return booking;
  } catch (error) {
    throw error;
  }
};

// Update booking status
exports.updateBookingStatus = async (bookingId, status, userId, userType) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify user has permission to update this booking
    const userField = userType === 'guest' ? 'guest' : 'host';
    if (booking[userField].toString() !== userId.toString()) {
      throw new Error('Access denied');
    }

    // Validate status transitions
    const validTransitions = {
      pending: ['confirmed', 'declined', 'cancelled'],
      confirmed: ['checked-in', 'cancelled'],
      'checked-in': ['checked-out'],
      'checked-out': ['completed'],
      declined: [],
      cancelled: [],
      completed: []
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      throw new Error(`Cannot change status from ${booking.status} to ${status}`);
    }

    // Update status and related fields
    booking.status = status;
    if (status === 'confirmed') {
      booking.confirmedAt = new Date();
      booking.expiresAt = undefined; // Remove expiration
    }

    await booking.save();

    return await this.getBookingById(bookingId);
  } catch (error) {
    throw error;
  }
};

// Cancel booking
exports.cancelBooking = async (bookingId, userId, userType, reason = '') => {
  try {
    const booking = await this.getBookingById(bookingId, userId);
    
    if (!booking.canBeCancelled()) {
      throw new Error('Booking cannot be cancelled within 24 hours of check-in or after check-in');
    }

    // Calculate refund
    const listing = await Listing.findById(booking.listing._id);
    const refundDetails = booking.calculateRefund(listing.cancellationPolicy);

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: userId,
      cancelledAt: new Date(),
      reason,
      refundAmount: refundDetails.refundAmount,
      cancellationPolicy: listing.cancellationPolicy
    };

    await booking.save();

    return {
      booking,
      refundDetails
    };
  } catch (error) {
    throw error;
  }
};

// Check availability for specific dates
exports.checkAvailability = async (listingId, checkIn, checkOut) => {
  try {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error('Invalid check-in or check-out date');
    }

    // Find overlapping bookings
    const overlappingBookings = await Booking.findByDateRange(
      listingId, 
      checkInDate, 
      checkOutDate
    );

    if (overlappingBookings.length > 0) return false;

    // Find overlapping external/internal blocks from synced calendars
    const blocked = await BlockedDate.findOne({
      listing: listingId,
      deletedAt: { $exists: false },
      $or: [
        { start: { $lt: checkOutDate }, end: { $gt: checkInDate } },
        { start: { $gte: checkInDate, $lt: checkOutDate } },
        { end: { $gt: checkInDate, $lte: checkOutDate } }
      ]
    }).lean();

    return !blocked;
  } catch (error) {
    throw error;
  }
};

// Calculate booking price including pet fees
exports.calculateBookingPrice = async (listing, checkIn, checkOut, guests = 1, pets = 0) => {
  try {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error('Invalid check-in or check-out date');
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      throw new Error('Invalid date range');
    }

    // Base pricing (consider salePrice/effective price per night via Listing model if needed)
    const baseNightPrice = listing.price;
    const subtotal = baseNightPrice * nights;

    // Pull effective pricing config for this listing (global -> host -> listing)
    const effectiveCfg = await PricingConfigService.getEffectiveConfigForListing(listing);

    // Cleaning fee
    let cleaningFee = 0;
    if (effectiveCfg?.cleaningFee && effectiveCfg.cleaningFee.isFree !== true) {
      cleaningFee = Number(effectiveCfg.cleaningFee.value || 0);
    }

    // Service fee
    let serviceFee = 0;
    if (effectiveCfg?.serviceFee && effectiveCfg.serviceFee.isFree !== true) {
      const mode = effectiveCfg.serviceFee.mode || 'percentage';
      const val = Number(effectiveCfg.serviceFee.value || 0);
      serviceFee = mode === 'fixed' ? val : Math.round(subtotal * (val / 100));
    }

    // Pet fees (respect config overrides; fall back to listing.petPolicy when config not present)
    let petFee = 0;
    let petDeposit = 0;
    if (pets > 0 && listing.petPolicy?.petsAllowed) {
      const perNight = effectiveCfg?.petFeePerNight;
      const perPetDep = effectiveCfg?.petDepositPerPet;
      const petFeePerNight = perNight ? (perNight.isFree ? 0 : Number(perNight.value || 0)) : (listing.petPolicy.petFee || 0);
      const petDepositPerPet = perPetDep ? (perPetDep.isFree ? 0 : Number(perPetDep.value || 0)) : (listing.petPolicy.petDeposit || 0);
      petFee = petFeePerNight * pets * nights;
      petDeposit = petDepositPerPet * pets;
    }

    // Taxes
    let taxes = 0;
    if (effectiveCfg?.tax && effectiveCfg.tax.isFree !== true) {
      const mode = effectiveCfg.tax.mode || 'percentage';
      const val = Number(effectiveCfg.tax.value || 0);
      const taxableAmount = subtotal + cleaningFee + serviceFee + petFee;
      taxes = mode === 'fixed' ? val : Math.round(taxableAmount * (val / 100));
    }

    const totalAmount = subtotal + cleaningFee + serviceFee + petFee + petDeposit + taxes;

    return {
      basePrice: baseNightPrice,
      pricePerNight: baseNightPrice,
      subtotal,
      cleaningFee,
      serviceFee,
      petFee,
      petDeposit,
      taxes,
      totalAmount,
      currency: 'USD'
    };
  } catch (error) {
    throw error;
  }
};

// Get upcoming bookings
exports.getUpcomingBookings = async (userId, userType = 'guest') => {
  try {
    return await Booking.findUpcomingBookings(userId, userType)
      .populate('listing', 'title images location')
      .populate('guest', 'fullName email profileImage')
      .populate('host', 'fullName email profileImage');
  } catch (error) {
    throw error;
  }
};

// Get past bookings
exports.getPastBookings = async (userId, userType = 'guest') => {
  try {
    return await Booking.findPastBookings(userId, userType)
      .populate('listing', 'title images location')
      .populate('guest', 'fullName email profileImage')
      .populate('host', 'fullName email profileImage');
  } catch (error) {
    throw error;
  }
};

// Get bookings with pets
exports.getBookingsWithPets = async (req) => {
  try {
    const filters = {
      'petDetails.hasPets': true,
      ...req.query // Allow additional filters from query params
    };

    const populateOptions = [
      { path: 'listing', select: 'title images location petPolicy' },
      { path: 'guest', select: 'fullName email profileImage' },
      { path: 'host', select: 'fullName email profileImage' }
    ];

    return BaseService.findWithPagination(
      Booking,
      filters,
      req,
      populateOptions,
      'Pet bookings retrieved successfully',
      { createdAt: -1 }
    );
  } catch (error) {
    throw error;
  }
};

// Update check-in details
exports.updateCheckInDetails = async (bookingId, checkInData, userId) => {
  try {
    const booking = await this.getBookingById(bookingId, userId);
    
    if (booking.status !== 'confirmed') {
      throw new Error('Booking must be confirmed to check in');
    }

    booking.status = 'checked-in';
    booking.checkInDetails = {
      actualCheckIn: new Date(),
      checkInMethod: checkInData.checkInMethod,
      checkInInstructions: checkInData.checkInInstructions,
      accessCodes: checkInData.accessCodes
    };

    await booking.save();
    return booking;
  } catch (error) {
    throw error;
  }
};

// Update check-out details
exports.updateCheckOutDetails = async (bookingId, checkOutData, userId) => {
  try {
    const booking = await this.getBookingById(bookingId, userId);
    
    if (booking.status !== 'checked-in') {
      throw new Error('Booking must be checked-in to check out');
    }

    booking.status = 'checked-out';
    booking.checkOutDetails = {
      actualCheckOut: new Date(),
      checkOutInstructions: checkOutData.checkOutInstructions,
      propertyCondition: checkOutData.propertyCondition,
      damages: checkOutData.damages || []
    };

    await booking.save();
    return booking;
  } catch (error) {
    throw error;
  }
};

// Search bookings with filters
exports.searchBookings = async (req) => {
  try {
    const {
      userId,
      userType = 'guest',
      status,
      startDate,
      endDate,
      listingId,
      hasPets
    } = req.query;

    let filters = {};

    // User filter
    if (userId) {
      const userField = userType === 'guest' ? 'guest' : 'host';
      filters[userField] = userId;
    }

    // Status filter
    if (status) {
      if (Array.isArray(status)) {
        filters.status = { $in: status };
      } else {
        filters.status = status;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      filters.checkIn = {};
      if (startDate) filters.checkIn.$gte = new Date(startDate);
      if (endDate) filters.checkIn.$lte = new Date(endDate);
    }

    // Listing filter
    if (listingId) {
      filters.listing = listingId;
    }

    // Pet filter
    if (hasPets !== undefined) {
      filters['petDetails.hasPets'] = hasPets;
    }

    const populateOptions = [
      { path: 'listing', select: 'title images location' },
      { path: 'guest', select: 'fullName email profileImage' },
      { path: 'host', select: 'fullName email profileImage' }
    ];

    return BaseService.findWithPagination(
      Booking,
      filters,
      req,
      populateOptions,
      'Search results retrieved successfully',
      { createdAt: -1 }
    );
  } catch (error) {
    throw error;
  }
};
