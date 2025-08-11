// Comprehensive Admin service for all management operations
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const BookingLog = require('../models/BookingLog');
const Payment = require('../models/Payment');
const PaymentLog = require('../models/PaymentLog');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const ListingLog = require('../models/ListingLog');
// Use shared pagination response
const { createPaginationResponse } = require('../middleware/pagination');

// ================================
// USER MANAGEMENT SERVICES
// ================================

exports.createUser = async ({ fullName, email, password, role }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already in use');
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ fullName, email, password: hash, role });
  return user;
};

exports.getAllUsers = async () => {
  return await User.find();
};

exports.getUserById = async (id) => {
  return await User.findById(id);
};

exports.updateUser = async (id, data) => {
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return await User.findByIdAndUpdate(id, data, { new: true });
};

exports.deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};

// ================================
// LISTING MANAGEMENT SERVICES
// ================================

exports.getAllListingsAdmin = async (filters) => {
  const {
    page = 1,
    limit = 20,
    status,
    listingType,
    hostId,
    city,
    state,
    country,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = filters;

  // Build query
  let query = {};

  if (status && status !== 'all') {
    query.verificationStatus = status;
  }
  if (listingType && listingType !== 'all') {
    query.listingType = listingType;
  }
  if (hostId) query.host = hostId;
  if (city) query.city = { $regex: city, $options: 'i' };
  if (state) query.state = { $regex: state, $options: 'i' };
  if (country) query.country = { $regex: country, $options: 'i' };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = minPrice;
    if (maxPrice) query.price.$lte = maxPrice;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { readableId: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  
  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with population
  const listings = await Listing.find(query)
    .populate('host', 'fullName email phone')
    
    .populate('images', 'url filename isMain')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const totalItems = await Listing.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    listings,
    currentPage: page,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

exports.getListingStatistics = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalListings,
    activeListings,
    pendingListings,
    suspendedListings,
    todayListings,
    weeklyListings,
    monthlyListings,
    verifiedListings
  ] = await Promise.all([
    Listing.countDocuments(),
    Listing.countDocuments({ verificationStatus: 'Verified' }),
    Listing.countDocuments({ verificationStatus: 'Pending' }),
    Listing.countDocuments({ verificationStatus: 'Rejected' }),
    Listing.countDocuments({ createdAt: { $gte: startOfDay } }),
    Listing.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Listing.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Listing.countDocuments({ verificationStatus: 'Verified' })
  ]);

  // Get listings by type
  const listingsByType = await Listing.aggregate([
    { $group: { _id: '$listingType', count: { $sum: 1 } } }
  ]);

  // Get average price
  const averagePrice = await Listing.aggregate([
    { $group: { _id: null, avgPrice: { $avg: '$price' } } }
  ]);

  return {
    totals: {
      total: totalListings,
      active: activeListings,
      pending: pendingListings,
      suspended: suspendedListings,
      verified: verifiedListings
    },
    periods: {
      today: todayListings,
      week: weeklyListings,
      month: monthlyListings
    },
    byType: listingsByType,
    averagePrice: averagePrice[0]?.avgPrice || 0
  };
};

exports.getListingByIdAdmin = async (id) => {
  return await Listing.findById(id)
    .populate('host', 'fullName email phone profileImage role createdAt')
    
    .populate('images', 'url filename isMain createdAt')
    .lean();
};

exports.createListingForHost = async (listingData, hostId, images) => {
  // Verify host exists
  const host = await User.findById(hostId);
  if (!host) throw new Error('Host not found');

  const listing = await Listing.create({
    ...listingData,
    host: hostId,
    verificationStatus: 'Verified' // Admin created listings are automatically verified
  });

  // Handle image uploads if provided
  if (images && images.length > 0) {
    const imageService = require('./imageService');
    await imageService.addListingImages(listing._id, images);
  }

  return await this.getListingByIdAdmin(listing._id);
};

exports.updateListingAdmin = async (id, updateData) => {
  const listing = await Listing.findByIdAndUpdate(id, updateData, { new: true })
    .populate('host', 'fullName email')
    
    .populate('images', 'url filename isMain');

  if (!listing) throw new Error('Listing not found');
  return listing;
};

exports.updateListingStatus = async (id, status, reason, admin, notifyHost = true) => {
  const listing = await Listing.findById(id);
  if (!listing) throw new Error('Listing not found');

  // Build performedBy context
  const performedBy = (admin && typeof admin === 'object' && admin.user)
    ? admin
    : { user: admin, role: 'admin' };

  // Determine what to update: verificationStatus or isActive
  const prev = {
    verificationStatus: listing.verificationStatus,
    isActive: listing.isActive
  };

  const update = {};
  const verificationStatuses = ['Pending', 'Verified', 'Rejected'];
  if (verificationStatuses.includes(status)) {
    update.verificationStatus = status;
  } else if (['active', 'inactive', 'suspended'].includes(String(status).toLowerCase())) {
    update.isActive = String(status).toLowerCase() === 'active';
  } else {
    // Fallback: treat as verificationStatus if unknown
    update.verificationStatus = status;
  }

  // Apply update
  const updated = await Listing.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  );

  // Log via ListingLog with proper performedBy object
  await ListingLog.create({
    listing: id,
    action: 'status_updated',
    performedBy: {
      user: performedBy.user,
      role: performedBy.role,
      name: performedBy.name
    },
    previousStatus: JSON.stringify(prev),
    newStatus: JSON.stringify({
      verificationStatus: updated.verificationStatus,
      isActive: updated.isActive
    }),
    details: {
      reason,
      notifyHost
    },
    timestamp: new Date()
  });

  // TODO: Send notification to host if required (out of scope)
  return updated;
};

exports.bulkUpdateListingStatus = async (listingIds, status, reason, admin) => {
  const performedBy = (admin && typeof admin === 'object' && admin.user)
    ? admin
    : { user: admin, role: 'admin' };

  const update = {};
  const verificationStatuses = ['Pending', 'Verified', 'Rejected'];
  if (verificationStatuses.includes(status)) {
    update.verificationStatus = status;
  } else if (['active', 'inactive', 'suspended'].includes(String(status).toLowerCase())) {
    update.isActive = String(status).toLowerCase() === 'active';
  } else {
    update.verificationStatus = status;
  }

  const result = await Listing.updateMany(
    { _id: { $in: listingIds } },
    { $set: update }
  );

  // Log bulk operation in ListingLog
  await ListingLog.create({
    listing: listingIds[0], // anchor first listing for indexing; details will include all
    action: 'bulk_status_update',
    performedBy: {
      user: performedBy.user,
      role: performedBy.role,
      name: performedBy.name
    },
    details: {
      listingIds,
      newStatus: status,
      reason,
      count: result.modifiedCount
    },
    timestamp: new Date()
  });

  return result;
};

exports.deleteListingAdmin = async (id, reason, admin) => {
  const listing = await Listing.findById(id);
  if (!listing) throw new Error('Listing not found');

  const performedBy = (admin && typeof admin === 'object' && admin.user)
    ? admin
    : { user: admin, role: 'admin' };

  // Soft delete by deactivating listing to avoid schema changes
  const updated = await Listing.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true }
  );

  // Log deletion in ListingLog
  await ListingLog.create({
    listing: id,
    action: 'listing_deleted',
    performedBy: {
      user: performedBy.user,
      role: performedBy.role,
      name: performedBy.name
    },
    details: { reason },
    timestamp: new Date()
  });

  return { success: true, listing: updated };
};

exports.getListingsByHost = async (hostId, { page = 1, limit = 20, status }) => {
  // Build query
  const query = { host: hostId };
  if (status) query.status = status;

  // Fetch with pagination
  const skip = (page - 1) * limit;
  const [listings, total] = await Promise.all([
    Listing.find(query)
      .populate('images', 'url isMain')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Listing.countDocuments(query)
  ]);

  // Create a fake req-like object for response builder
  const reqLike = { pagination: { page, limit } };
  return createPaginationResponse(listings, total, reqLike);
};

exports.getListingActivity = async (listingId, req) => {
  const page = req?.pagination?.page || 1;
  const limit = req?.pagination?.limit || 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ListingLog.find({ listing: listingId })
      .populate('performedBy.user', 'fullName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ListingLog.countDocuments({ listing: listingId })
  ]);

  return createPaginationResponse(logs, total, { pagination: { page, limit } });
};

// ================================
// BOOKING MANAGEMENT SERVICES
// ================================

exports.getAllBookingsAdmin = async (filters) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    hostId,
    guestId,
    listingId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = filters;

  let query = {};

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (hostId) query.host = hostId;
  if (guestId) query.guest = guestId;
  if (listingId) query.listing = listingId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { bookingNumber: { $regex: search, $options: 'i' } },
      { bookingId: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const bookings = await Booking.find(query)
    .populate('guest', 'fullName email phone')
    .populate('host', 'fullName email phone')
    .populate('listing', 'title readableId images price city')
    .populate('payment', 'paymentId status amount provider')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const totalItems = await Booking.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    bookings,
    currentPage: page,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

exports.getBookingStatistics = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    todayBookings,
    weeklyBookings,
    monthlyBookings
  ] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'pending' }),
    Booking.countDocuments({ status: 'confirmed' }),
    Booking.countDocuments({ status: 'completed' }),
    Booking.countDocuments({ status: 'cancelled' }),
    Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
    Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Booking.countDocuments({ createdAt: { $gte: startOfMonth } })
  ]);

  // Revenue stats
  const revenueStats = await Booking.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        averageBookingValue: { $avg: '$totalAmount' }
      }
    }
  ]);

  return {
    totals: {
      total: totalBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      completed: completedBookings,
      cancelled: cancelledBookings
    },
    periods: {
      today: todayBookings,
      week: weeklyBookings,
      month: monthlyBookings
    },
    revenue: revenueStats[0] || { totalRevenue: 0, averageBookingValue: 0 }
  };
};

exports.getTodayBookingSummary = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [newBookings, checkIns, checkOuts, completedBookings] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Booking.countDocuments({ 
      checkIn: { $gte: startOfDay, $lte: endOfDay },
      status: 'confirmed'
    }),
    Booking.countDocuments({ 
      checkOut: { $gte: startOfDay, $lte: endOfDay },
      status: 'confirmed'
    }),
    Booking.countDocuments({ 
      updatedAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed'
    })
  ]);

  return {
    date: today.toISOString().split('T')[0],
    newBookings,
    checkIns,
    checkOuts,
    completedBookings
  };
};

exports.getBookingByIdAdmin = async (id) => {
  return await Booking.findById(id)
    .populate('guest', 'fullName email phone profileImage')
    .populate('host', 'fullName email phone profileImage')
    .populate('listing', 'title readableId images price address city state country')
    .populate('payment', 'paymentId status amount provider createdAt')
    .lean();
};

exports.createBookingForGuest = async (bookingData, guestId, adminId) => {
  // Verify guest exists
  const guest = await User.findById(guestId);
  if (!guest) throw new Error('Guest not found');

  // Verify listing exists and get host info
  const listing = await Listing.findById(bookingData.listing);
  if (!listing) throw new Error('Listing not found');

  const booking = await Booking.create({
    ...bookingData,
    guest: guestId,
    host: listing.host,
    status: 'confirmed', // Admin bookings are auto-confirmed
    createdBy: adminId
  });

  // Log the booking creation
  await BookingLog.create({
    booking: booking._id,
    action: 'booking_created_by_admin',
    performedBy: adminId,
    details: { guestId, listingId: listing._id },
    timestamp: new Date()
  });

  return await this.getBookingByIdAdmin(booking._id);
};

exports.updateBookingStatusAdmin = async (id, status, reason, adminId, notifyGuest = true, notifyHost = true) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new Error('Booking not found');

  const oldStatus = booking.status;
  booking.status = status;
  booking.statusUpdatedAt = new Date();
  booking.statusUpdatedBy = adminId;

  if (reason) {
    booking.statusReason = reason;
  }

  await booking.save();

  // Log the status change
  await BookingLog.create({
    booking: id,
    action: 'status_updated_by_admin',
    performedBy: adminId,
    details: {
      oldStatus,
      newStatus: status,
      reason,
      notifyGuest,
      notifyHost
    },
    timestamp: new Date()
  });

  return booking;
};

exports.cancelBookingAdmin = async (id, options) => {
  const { reason, refundAmount, refundReason, notifyGuest, notifyHost, cancelledBy } = options;
  
  const booking = await Booking.findById(id).populate('payment');
  if (!booking) throw new Error('Booking not found');

  booking.status = 'cancelled';
  booking.cancellationReason = reason;
  booking.cancelledBy = cancelledBy;
  booking.cancelledAt = new Date();

  await booking.save();

  let refundResult = null;
  if (refundAmount && booking.payment) {
    const paymentService = require('./paymentService');
    refundResult = await paymentService.processRefund(booking.payment._id, refundAmount, refundReason);
  }

  // Log the cancellation
  await BookingLog.create({
    booking: id,
    action: 'booking_cancelled_by_admin',
    performedBy: cancelledBy,
    details: {
      reason,
      refundAmount,
      refundReason,
      notifyGuest,
      notifyHost
    },
    timestamp: new Date()
  });

  return { booking, refund: refundResult };
};

exports.completeBookingAdmin = async (id, reason, adminId) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new Error('Booking not found');

  booking.status = 'completed';
  booking.completedAt = new Date();
  booking.completedBy = adminId;
  if (reason) booking.completionReason = reason;

  await booking.save();

  // Log completion
  await BookingLog.create({
    booking: id,
    action: 'booking_completed_by_admin',
    performedBy: adminId,
    details: { reason },
    timestamp: new Date()
  });

  return booking;
};

exports.getBookingsByGuest = async (guestId, { page = 1, limit = 20, status }) => {
  let query = { guest: guestId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  
  const bookings = await Booking.find(query)
    .populate('listing', 'title readableId images price city')
    .populate('host', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Booking.countDocuments(query);

  return {
    bookings,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: total
    }
  };
};

exports.getBookingsByHost = async (hostId, { page = 1, limit = 20, status }) => {
  let query = { host: hostId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  
  const bookings = await Booking.find(query)
    .populate('listing', 'title readableId images price city')
    .populate('guest', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Booking.countDocuments(query);

  return {
    bookings,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: total
    }
  };
};

exports.getBookingActivity = async (bookingId, limit = 50) => {
  return await BookingLog.find({ booking: bookingId })
    .populate('performedBy', 'fullName email')
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

exports.bulkUpdateBookingStatus = async (bookingIds, status, reason, adminId) => {
  const result = await Booking.updateMany(
    { _id: { $in: bookingIds } },
    {
      status,
      statusUpdatedAt: new Date(),
      statusUpdatedBy: adminId,
      ...(reason && { statusReason: reason })
    }
  );

  // Log bulk operation
  await BookingLog.create({
    booking: null,
    action: 'bulk_booking_status_update',
    performedBy: adminId,
    details: {
      bookingIds,
      newStatus: status,
      reason,
      count: result.modifiedCount
    },
    timestamp: new Date()
  });

  return result;
};

// ================================
// PAYMENT MANAGEMENT SERVICES
// ================================

exports.getAllPaymentsAdmin = async (filters) => {
  const {
    page = 1,
    limit = 20,
    status,
    provider,
    bookingId,
    userId,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  let query = {};

  if (status) query.status = status;
  if (provider) query.provider = provider;
  if (bookingId) query.booking = bookingId;
  if (userId) query.user = userId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (minAmount || maxAmount) {
    query.amount = {};
    if (minAmount) query.amount.$gte = minAmount * 100; // Convert to cents
    if (maxAmount) query.amount.$lte = maxAmount * 100;
  }

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const payments = await Payment.find(query)
    .populate('user', 'fullName email')
    .populate('booking', 'bookingNumber checkIn checkOut totalAmount listing')
    .populate('booking.listing', 'title readableId')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const totalItems = await Payment.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    payments,
    currentPage: page,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

exports.getPaymentStatistics = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalPayments,
    completedPayments,
    pendingPayments,
    failedPayments,
    refundedPayments,
    todayPayments,
    weeklyPayments,
    monthlyPayments
  ] = await Promise.all([
    Payment.countDocuments(),
    Payment.countDocuments({ status: 'completed' }),
    Payment.countDocuments({ status: 'pending' }),
    Payment.countDocuments({ status: 'failed' }),
    Payment.countDocuments({ status: 'refunded' }),
    Payment.countDocuments({ createdAt: { $gte: startOfDay } }),
    Payment.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Payment.countDocuments({ createdAt: { $gte: startOfMonth } })
  ]);

  // Revenue calculations
  const revenueStats = await Payment.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        averagePayment: { $avg: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const todayRevenue = await Payment.aggregate([
    { 
      $match: { 
        status: 'completed',
        createdAt: { $gte: startOfDay }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return {
    totals: {
      total: totalPayments,
      completed: completedPayments,
      pending: pendingPayments,
      failed: failedPayments,
      refunded: refundedPayments
    },
    periods: {
      today: todayPayments,
      week: weeklyPayments,
      month: monthlyPayments
    },
    revenue: {
      total: revenueStats[0]?.totalRevenue || 0,
      average: revenueStats[0]?.averagePayment || 0,
      today: todayRevenue[0]?.total || 0
    }
  };
};

exports.getPaymentByIdAdmin = async (id) => {
  return await Payment.findById(id)
    .populate('user', 'fullName email phone')
    .populate('booking', 'bookingNumber checkIn checkOut totalAmount listing guest host')
    .populate('booking.listing', 'title readableId images')
    .populate('booking.guest', 'fullName email')
    .populate('booking.host', 'fullName email')
    .lean();
};

exports.generateInvoiceData = async (paymentId) => {
  const payment = await this.getPaymentByIdAdmin(paymentId);
  if (!payment) throw new Error('Payment not found');

  const invoiceData = {
    invoice: {
      number: `INV-${payment.paymentId}`,
      date: payment.createdAt,
      dueDate: payment.createdAt, // Immediate payment
      status: payment.status
    },
    payment: {
      id: payment.paymentId,
      method: payment.provider,
      status: payment.status,
      amount: payment.amount / 100, // Convert from cents
      currency: payment.currency || 'USD',
      transactionId: payment.transactionId
    },
    booking: payment.booking ? {
      id: payment.booking.bookingNumber,
      checkIn: payment.booking.checkIn,
      checkOut: payment.booking.checkOut,
      totalAmount: payment.booking.totalAmount / 100,
      listing: payment.booking.listing
    } : null,
    customer: {
      name: payment.user.fullName,
      email: payment.user.email,
      phone: payment.user.phone
    },
    company: {
      name: 'Gharfar',
      address: 'Your Company Address',
      email: 'billing@gharfar.com',
      phone: '+1-xxx-xxx-xxxx'
    },
    breakdown: {
      subtotal: payment.amount / 100,
      taxes: 0, // Calculate if needed
      fees: 0, // Platform fees if any
      total: payment.amount / 100
    }
  };

  return invoiceData;
};

exports.getPaymentReports = async (options) => {
  const { startDate, endDate, groupBy = 'day', provider } = options;
  
  let matchStage = { status: 'completed' };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  if (provider) matchStage.provider = provider;

  let groupStage;
  switch (groupBy) {
    case 'hour':
      groupStage = {
        $dateToString: { format: "%Y-%m-%d-%H", date: "$createdAt" }
      };
      break;
    case 'day':
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
      break;
    case 'week':
      groupStage = {
        $dateToString: { format: "%Y-%U", date: "$createdAt" }
      };
      break;
    case 'month':
      groupStage = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      };
      break;
    default:
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
  }

  const reports = await Payment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupStage,
        totalAmount: { $sum: '$amount' },
        totalCount: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return reports.map(report => ({
    period: report._id,
    totalAmount: report.totalAmount / 100, // Convert from cents
    totalCount: report.totalCount,
    averageAmount: report.averageAmount / 100
  }));
};

exports.processManualRefund = async (paymentId, amount, reason, adminId) => {
  const paymentService = require('./paymentService');
  
  const refund = await paymentService.processRefund(paymentId, amount, reason);
  
  // Log the manual refund
  await PaymentLog.create({
    payment: paymentId,
    action: 'manual_refund_processed',
    performedBy: adminId,
    details: { amount, reason },
    timestamp: new Date()
  });

  return refund;
};

exports.updatePaymentStatusAdmin = async (id, status, reason, adminId) => {
  const payment = await Payment.findById(id);
  if (!payment) throw new Error('Payment not found');

  const oldStatus = payment.status;
  payment.status = status;
  payment.statusUpdatedAt = new Date();
  payment.statusUpdatedBy = adminId;

  if (reason) {
    payment.statusReason = reason;
  }

  await payment.save();

  // Log the status change
  await PaymentLog.create({
    payment: id,
    action: 'status_updated_by_admin',
    performedBy: adminId,
    details: {
      oldStatus,
      newStatus: status,
      reason
    },
    timestamp: new Date()
  });

  return payment;
};

// ================================
// DASHBOARD & ANALYTICS SERVICES
// ================================

exports.getDashboardOverview = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalUsers,
    totalListings,
    totalBookings,
    totalRevenue,
    todayBookings,
    todayRevenue,
    monthlyBookings,
    monthlyRevenue
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['guest', 'host'] } }),
    Listing.countDocuments({ verificationStatus: 'Verified' }),
    Booking.countDocuments(),
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
    Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfDay }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  return {
    totals: {
      users: totalUsers,
      listings: totalListings,
      bookings: totalBookings,
      revenue: (totalRevenue[0]?.total || 0) / 100
    },
    today: {
      bookings: todayBookings,
      revenue: (todayRevenue[0]?.total || 0) / 100
    },
    month: {
      bookings: monthlyBookings,
      revenue: (monthlyRevenue[0]?.total || 0) / 100
    }
  };
};

exports.getDailyCounters = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [
    newUsers,
    newListings,
    newBookings,
    completedBookings,
    totalRevenue,
    newPayments,
    failedPayments,
    pendingListings,
    activeListings
  ] = await Promise.all([
    User.countDocuments({ 
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      role: { $in: ['guest', 'host'] }
    }),
    Listing.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Booking.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Booking.countDocuments({ 
      status: 'completed',
      updatedAt: { $gte: startOfDay, $lte: endOfDay }
    }),
    Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Payment.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Payment.countDocuments({ 
      status: 'failed',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }),
    Listing.countDocuments({ verificationStatus: 'Pending' }),
    Listing.countDocuments({ verificationStatus: 'Verified' })
  ]);

  return {
    date: today.toISOString().split('T')[0],
    counters: {
      newUsers,
      newListings,
      newBookings,
      completedBookings,
      totalRevenue: (totalRevenue[0]?.total || 0) / 100,
      newPayments,
      failedPayments,
      pendingListings,
      activeListings
    }
  };
};

exports.getRevenueAnalytics = async (period = '30d', groupBy = 'day') => {
  const days = parseInt(period.replace('d', ''));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let groupStage;
  switch (groupBy) {
    case 'day':
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
      break;
    case 'week':
      groupStage = {
        $dateToString: { format: "%Y-%U", date: "$createdAt" }
      };
      break;
    case 'month':
      groupStage = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      };
      break;
    default:
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
  }

  const analytics = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: groupStage,
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return analytics.map(item => ({
    period: item._id,
    revenue: item.revenue / 100, // Convert from cents
    transactionCount: item.count
  }));
};

exports.getUserGrowthAnalytics = async (period = '30d', groupBy = 'day') => {
  const days = parseInt(period.replace('d', ''));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let groupStage;
  switch (groupBy) {
    case 'day':
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
      break;
    case 'week':
      groupStage = {
        $dateToString: { format: "%Y-%U", date: "$createdAt" }
      };
      break;
    case 'month':
      groupStage = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      };
      break;
    default:
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
  }

  const analytics = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        role: { $in: ['guest', 'host'] }
      }
    },
    {
      $group: {
        _id: {
          period: groupStage,
          role: '$role'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.period': 1 } }
  ]);

  // Organize data by period
  const result = {};
  analytics.forEach(item => {
    const period = item._id.period;
    if (!result[period]) {
      result[period] = { period, guests: 0, hosts: 0, total: 0 };
    }
    result[period][item._id.role + 's'] = item.count;
    result[period].total += item.count;
  });

  return Object.values(result);
};

exports.getBookingTrends = async (period = '30d', groupBy = 'day') => {
  const days = parseInt(period.replace('d', ''));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let groupStage;
  switch (groupBy) {
    case 'day':
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
      break;
    case 'week':
      groupStage = {
        $dateToString: { format: "%Y-%U", date: "$createdAt" }
      };
      break;
    case 'month':
      groupStage = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      };
      break;
    default:
      groupStage = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      };
  }

  const trends = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          period: groupStage,
          status: '$status'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.period': 1 } }
  ]);

  // Organize data by period
  const result = {};
  trends.forEach(item => {
    const period = item._id.period;
    if (!result[period]) {
      result[period] = { 
        period, 
        total: 0, 
        pending: 0, 
        confirmed: 0, 
        completed: 0, 
        cancelled: 0,
        totalRevenue: 0
      };
    }
    result[period][item._id.status] = item.count;
    result[period].total += item.count;
    if (item._id.status === 'completed') {
      result[period].totalRevenue = item.totalAmount / 100;
    }
  });

  return Object.values(result);
};

exports.getTopPerformingListings = async (limit = 10, period = '30d') => {
  const days = parseInt(period.replace('d', ''));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const topListings = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $in: ['confirmed', 'completed'] }
      }
    },
    {
      $group: {
        _id: '$listing',
        bookingCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageAmount: { $avg: '$totalAmount' }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'listings',
        localField: '_id',
        foreignField: '_id',
        as: 'listing'
      }
    },
    { $unwind: '$listing' },
    {
      $lookup: {
        from: 'users',
        localField: 'listing.host',
        foreignField: '_id',
        as: 'host'
      }
    },
    { $unwind: '$host' }
  ]);

  return topListings.map(item => ({
    listing: {
      id: item.listing._id,
      title: item.listing.title,
      readableId: item.listing.readableId,
      city: item.listing.city,
      price: item.listing.price
    },
    host: {
      id: item.host._id,
      name: item.host.fullName,
      email: item.host.email
    },
    metrics: {
      bookingCount: item.bookingCount,
      totalRevenue: item.totalRevenue / 100,
      averageAmount: item.averageAmount / 100
    }
  }));
};

exports.getCriticalAlerts = async () => {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const [
    failedPayments,
    pendingListings,
    cancelledBookings,
    disputedPayments,
    suspendedListings
  ] = await Promise.all([
    Payment.countDocuments({ 
      status: 'failed',
      createdAt: { $gte: yesterday }
    }),
    Listing.countDocuments({ verificationStatus: 'Pending' }),
    Booking.countDocuments({ 
      status: 'cancelled',
      updatedAt: { $gte: yesterday }
    }),
    Payment.countDocuments({ 
      status: 'disputed',
      createdAt: { $gte: yesterday }
    }),
    Listing.countDocuments({ isActive: false })
  ]);

  const alerts = [];

  if (failedPayments > 0) {
    alerts.push({
      type: 'payment_failures',
      severity: 'high',
      count: failedPayments,
      message: `${failedPayments} payments failed in the last 24 hours`
    });
  }

  if (pendingListings > 10) {
    alerts.push({
      type: 'pending_listings',
      severity: 'medium',
      count: pendingListings,
      message: `${pendingListings} listings are pending approval`
    });
  }

  if (cancelledBookings > 5) {
    alerts.push({
      type: 'booking_cancellations',
      severity: 'medium',
      count: cancelledBookings,
      message: `${cancelledBookings} bookings were cancelled in the last 24 hours`
    });
  }

  if (disputedPayments > 0) {
    alerts.push({
      type: 'payment_disputes',
      severity: 'high',
      count: disputedPayments,
      message: `${disputedPayments} payment disputes need attention`
    });
  }

  if (suspendedListings > 0) {
    alerts.push({
      type: 'suspended_listings',
      severity: 'high',
      count: suspendedListings,
      message: `${suspendedListings} listings are currently inactive`
    });
  }

  return alerts;
};

// ================================
// REPORT GENERATION SERVICES
// ================================

exports.generateOverviewReport = async (options) => {
  const { period = 'month', startDate, endDate, format = 'json' } = options;
  
  // Set date range based on period if no specific dates provided
  let queryStartDate, queryEndDate;
  
  if (startDate && endDate) {
    queryStartDate = new Date(startDate);
    queryEndDate = new Date(endDate);
  } else {
    const today = new Date();
    switch (period) {
      case 'week':
        queryStartDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        queryStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        queryStartDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        queryStartDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        queryStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    queryEndDate = today;
  }

  // Generate all component reports
  const [
    bookingReport,
    revenueReport,
    listingReport,
    userReport
  ] = await Promise.all([
    this.generateBookingReport({ 
      startDate: queryStartDate, 
      endDate: queryEndDate, 
      format: 'summary' 
    }),
    this.generateRevenueReport({ 
      startDate: queryStartDate, 
      endDate: queryEndDate, 
      format: 'summary',
      groupBy: period === 'week' ? 'day' : period === 'month' ? 'day' : 'week'
    }),
    this.generateListingReport({ 
      startDate: queryStartDate, 
      endDate: queryEndDate, 
      format: 'summary' 
    }),
    this.generateUserReport({ 
      startDate: queryStartDate, 
      endDate: queryEndDate, 
      format: 'summary' 
    })
  ]);

  // Calculate key metrics
  const dashboardOverview = await this.getDashboardOverview();
  const dashboardMetrics = await this.getDashboardMetrics(period);
  const criticalAlerts = await this.getCriticalAlerts();

  // Performance insights
  const topListings = await this.getTopPerformingListings(5, `${Math.ceil((queryEndDate - queryStartDate) / (24 * 60 * 60 * 1000))}d`);
  
  // Growth analytics
  const userGrowth = await this.getUserGrowthAnalytics(`${Math.ceil((queryEndDate - queryStartDate) / (24 * 60 * 60 * 1000))}d`, 'week');
  const bookingTrends = await this.getBookingTrends(`${Math.ceil((queryEndDate - queryStartDate) / (24 * 60 * 60 * 1000))}d`, 'week');

  // Compile comprehensive overview
  const overview = {
    reportInfo: {
      type: 'comprehensive_overview',
      period,
      dateRange: {
        start: queryStartDate,
        end: queryEndDate,
        duration: `${Math.ceil((queryEndDate - queryStartDate) / (24 * 60 * 60 * 1000))} days`
      },
      generatedAt: new Date(),
      format
    },
    
    executiveSummary: {
      totalUsers: dashboardOverview.totals.users,
      totalListings: dashboardOverview.totals.listings,
      totalBookings: dashboardOverview.totals.bookings,
      totalRevenue: dashboardOverview.totals.revenue,
      
      periodHighlights: {
        newUsers: userReport.summary.totalUsers,
        newListings: listingReport.summary.totalListings,
        newBookings: bookingReport.summary.totalBookings,
        periodRevenue: revenueReport.summary.totalRevenue
      },
      
      keyMetrics: {
        averageBookingValue: bookingReport.summary.averageBookingValue,
        averageListingPrice: listingReport.summary.averagePrice,
        conversionRate: dashboardOverview.totals.bookings > 0 
          ? ((dashboardOverview.totals.bookings / dashboardOverview.totals.users) * 100).toFixed(2) + '%'
          : '0%',
        revenuePerUser: dashboardOverview.totals.users > 0 
          ? (dashboardOverview.totals.revenue / dashboardOverview.totals.users).toFixed(2)
          : 0
      }
    },

    platformOverview: {
      currentTotals: dashboardOverview.totals,
      periodMetrics: dashboardMetrics.overview,
      alerts: criticalAlerts
    },

    detailedReports: {
      bookings: {
        summary: bookingReport.summary,
        trends: bookingTrends.slice(0, 10) // Last 10 periods
      },
      revenue: {
        summary: revenueReport.summary,
        chartData: revenueReport.data.slice(0, 30) // Last 30 data points
      },
      listings: {
        summary: listingReport.summary,
        topPerforming: topListings
      },
      users: {
        summary: userReport.summary,
        growthData: userGrowth.slice(0, 10) // Last 10 periods
      }
    },

    insights: {
      performance: {
        bestPerformingListings: topListings.length,
        totalListingRevenue: topListings.reduce((sum, l) => sum + l.metrics.totalRevenue, 0),
        averageListingBookings: topListings.length > 0 
          ? (topListings.reduce((sum, l) => sum + l.metrics.bookingCount, 0) / topListings.length).toFixed(1)
          : 0
      },
      
      trends: {
        userGrowthTrend: userGrowth.length > 1 
          ? userGrowth[userGrowth.length - 1].total > userGrowth[userGrowth.length - 2].total 
            ? 'increasing' : 'decreasing'
          : 'stable',
        bookingTrend: bookingTrends.length > 1 
          ? bookingTrends[bookingTrends.length - 1].total > bookingTrends[bookingTrends.length - 2].total 
            ? 'increasing' : 'decreasing'
          : 'stable',
        revenueTrend: revenueReport.data.length > 1 
          ? revenueReport.data[revenueReport.data.length - 1].revenue > revenueReport.data[revenueReport.data.length - 2].revenue 
            ? 'increasing' : 'decreasing'
          : 'stable'
      },

      recommendations: [
        criticalAlerts.length > 0 ? 'Address critical alerts to improve platform health' : 'Platform health is good',
        dashboardMetrics.overview.listings.pending > 5 ? 'Review pending listings to improve host satisfaction' : null,
        dashboardMetrics.overview.payments.successRate < 95 ? 'Investigate payment failures to improve success rate' : null,
        bookingReport.summary.averageBookingValue < 100 ? 'Consider strategies to increase average booking value' : null
      ].filter(Boolean)
    }
  };

  return overview;
};

exports.generateBookingReport = async (options) => {
  const { startDate, endDate, format = 'json', ...filters } = options;
  
  let query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Apply additional filters
  Object.keys(filters).forEach(key => {
    if (filters[key] && key !== 'format') {
      query[key] = filters[key];
    }
  });

  const bookings = await Booking.find(query)
    .populate('guest', 'fullName email')
    .populate('host', 'fullName email')
    .populate('listing', 'title city price')
    .sort({ createdAt: -1 })
    .lean();

  const summary = {
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / 100,
    averageBookingValue: bookings.length > 0 
      ? bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / (bookings.length * 100)
      : 0,
    statusBreakdown: {}
  };

  // Calculate status breakdown
  bookings.forEach(booking => {
    summary.statusBreakdown[booking.status] = 
      (summary.statusBreakdown[booking.status] || 0) + 1;
  });

  return {
    summary,
    bookings: format === 'summary' ? [] : bookings,
    generatedAt: new Date(),
    filters: { startDate, endDate, ...filters }
  };
};

exports.generateRevenueReport = async (options) => {
  const { startDate, endDate, format = 'json', groupBy = 'day' } = options;
  
  let matchStage = { status: 'completed' };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  let groupStage;
  switch (groupBy) {
    case 'day':
      groupStage = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      break;
    case 'week':
      groupStage = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
      break;
    case 'month':
      groupStage = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
      break;
    default:
      groupStage = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
  }

  const revenueData = await Payment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupStage,
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        averageTransaction: { $avg: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalTransactions = revenueData.reduce((sum, item) => sum + item.transactionCount, 0);

  return {
    summary: {
      totalRevenue: totalRevenue / 100,
      totalTransactions,
      averageTransaction: totalTransactions > 0 ? totalRevenue / (totalTransactions * 100) : 0,
      periodCount: revenueData.length
    },
    data: revenueData.map(item => ({
      period: item._id,
      revenue: item.totalRevenue / 100,
      transactionCount: item.transactionCount,
      averageTransaction: item.averageTransaction / 100
    })),
    generatedAt: new Date(),
    filters: { startDate, endDate, groupBy }
  };
};

exports.generateListingReport = async (options) => {
  const { startDate, endDate, format = 'json', ...filters } = options;
  
  let query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Apply additional filters
  Object.keys(filters).forEach(key => {
    if (filters[key] && key !== 'format') {
      query[key] = filters[key];
    }
  });

  const listings = await Listing.find(query)
    .populate('host', 'fullName email')
    .sort({ createdAt: -1 })
    .lean();

  const summary = {
    totalListings: listings.length,
    averagePrice: listings.length > 0 
      ? listings.reduce((sum, l) => sum + (l.price || 0), 0) / listings.length
      : 0,
    statusBreakdown: {},
    typeBreakdown: {}
  };

  // Calculate breakdowns
  listings.forEach(listing => {
    summary.statusBreakdown[listing.status] = 
      (summary.statusBreakdown[listing.status] || 0) + 1;
    summary.typeBreakdown[listing.listingType] = 
      (summary.typeBreakdown[listing.listingType] || 0) + 1;
  });

  return {
    summary,
    listings: format === 'summary' ? [] : listings,
    generatedAt: new Date(),
    filters: { startDate, endDate, ...filters }
  };
};

exports.generateUserReport = async (options) => {
  const { startDate, endDate, format = 'json', ...filters } = options;
  
  let query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Apply additional filters
  Object.keys(filters).forEach(key => {
    if (filters[key] && key !== 'format') {
      query[key] = filters[key];
    }
  });

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .lean();

  const summary = {
    totalUsers: users.length,
    roleBreakdown: {},
    verificationBreakdown: {
      verified: 0,
      unverified: 0
    }
  };

  // Calculate breakdowns
  users.forEach(user => {
    summary.roleBreakdown[user.role] = 
      (summary.roleBreakdown[user.role] || 0) + 1;
    
    if (user.isVerified) {
      summary.verificationBreakdown.verified++;
    } else {
      summary.verificationBreakdown.unverified++;
    }
  });

  return {
    summary,
    users: format === 'summary' ? [] : users,
    generatedAt: new Date(),
    filters: { startDate, endDate, ...filters }
  };
};

exports.exportBookingReport = async (format, filters) => {
  const report = await this.generateBookingReport({ ...filters, format: 'full' });
  
  if (format === 'csv') {
    const csv = require('csv-writer');
    // Implementation for CSV export
    // This would require csv-writer package
    return 'CSV export not implemented yet';
  } else if (format === 'pdf') {
    // Implementation for PDF export
    // This would require a PDF library like puppeteer or pdfkit
    return 'PDF export not implemented yet';
  }
  
  return JSON.stringify(report, null, 2);
};

exports.exportRevenueReport = async (format, filters) => {
  const report = await this.generateRevenueReport({ ...filters, format: 'full' });
  
  if (format === 'csv') {
    // Implementation for CSV export
    return 'CSV export not implemented yet';
  } else if (format === 'pdf') {
    // Implementation for PDF export
    return 'PDF export not implemented yet';
  }
  
  return JSON.stringify(report, null, 2);
};
