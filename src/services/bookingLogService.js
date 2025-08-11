const BookingLog = require('../models/BookingLog');
const User = require('../models/User');

class BookingLogService {
  
  // Create a booking log entry
  static async logBookingAction({
    booking,
    action,
    performedBy,
    previousStatus = null,
    newStatus = null,
    details = {},
    changes = [],
    systemInfo = {},
    severity = 'medium',
    tags = []
  }) {
    try {
      // Get performer details if user ID is provided
      let performerData = performedBy;
      if (typeof performedBy === 'string' || performedBy._id) {
        const userId = typeof performedBy === 'string' ? performedBy : performedBy._id;
        const user = await User.findById(userId).select('fullName role');
        
        performerData = {
          user: userId,
          role: performedBy.role || user?.role || 'guest',
          name: user?.fullName || 'Unknown User'
        };
      }
      
      const log = new BookingLog({
        booking,
        action,
        previousStatus,
        newStatus,
        performedBy: performerData,
        details,
        changes,
        systemInfo,
        severity,
        tags
      });
      
      await log.save();
      return log;
      
    } catch (error) {
      console.error('Failed to create booking log:', error);
      // Don't throw error to avoid breaking main booking flow
    }
  }
  
  // Log booking creation
  static async logBookingCreated(booking, guestId, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'booking_created',
      performedBy: {
        user: guestId,
        role: 'guest',
        name: 'Guest'
      },
      newStatus: booking.status,
      details: {
        message: `New booking created for ${booking.nights} nights`,
        additionalInfo: {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalAmount: booking.pricing.totalAmount,
          guests: booking.totalGuests,
          hasPets: booking.petDetails.hasPets
        }
      },
      systemInfo,
      severity: 'medium',
      tags: ['booking_lifecycle', 'creation']
    });
  }
  
  // Log booking confirmation
  static async logBookingConfirmed(booking, hostId, hostResponse = null, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'booking_confirmed',
      performedBy: {
        user: hostId,
        role: 'host',
        name: 'Host'
      },
      previousStatus: 'pending',
      newStatus: 'confirmed',
      details: {
        message: 'Booking confirmed by host',
        reason: hostResponse || 'Booking approved',
        automaticAction: booking.bookingType === 'instant'
      },
      systemInfo,
      severity: 'high',
      tags: ['booking_lifecycle', 'confirmation', 'host_action']
    });
  }
  
  // Log booking cancellation
  static async logBookingCancelled(booking, userId, userRole, reason, refundAmount = 0, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'booking_cancelled',
      performedBy: {
        user: userId,
        role: userRole,
        name: userRole === 'host' ? 'Host' : userRole === 'admin' ? 'Admin' : 'Guest'
      },
      previousStatus: booking.status,
      newStatus: 'cancelled',
      details: {
        message: `Booking cancelled by ${userRole}`,
        reason: reason,
        additionalInfo: {
          refundAmount: refundAmount,
          cancellationPolicy: booking.cancellation?.cancellationPolicy
        }
      },
      changes: [
        {
          field: 'status',
          oldValue: booking.status,
          newValue: 'cancelled'
        },
        {
          field: 'cancellation.reason',
          oldValue: null,
          newValue: reason
        }
      ],
      systemInfo,
      severity: 'high',
      tags: ['booking_lifecycle', 'cancellation', `${userRole}_action`]
    });
  }
  
  // Log payment status update
  static async logPaymentUpdated(booking, previousPaymentStatus, newPaymentStatus, performedBy, amount = null, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'payment_updated',
      performedBy,
      details: {
        message: `Payment status updated from ${previousPaymentStatus} to ${newPaymentStatus}`,
        additionalInfo: {
          amount: amount,
          paymentMethod: booking.payment.method
        }
      },
      changes: [
        {
          field: 'payment.paymentStatus',
          oldValue: previousPaymentStatus,
          newValue: newPaymentStatus
        }
      ],
      systemInfo,
      severity: newPaymentStatus === 'completed' ? 'high' : 'medium',
      tags: ['payment', 'status_update']
    });
  }
  
  // Log check-in
  static async logCheckIn(booking, actualCheckInTime, checkInMethod, performedBy, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'check_in',
      performedBy,
      previousStatus: 'confirmed',
      newStatus: 'checked-in',
      details: {
        message: 'Guest checked in',
        additionalInfo: {
          actualCheckIn: actualCheckInTime,
          checkInMethod: checkInMethod,
          scheduledCheckIn: booking.checkIn
        }
      },
      changes: [
        {
          field: 'status',
          oldValue: 'confirmed',
          newValue: 'checked-in'
        },
        {
          field: 'checkInDetails.actualCheckIn',
          oldValue: null,
          newValue: actualCheckInTime
        }
      ],
      systemInfo,
      severity: 'high',
      tags: ['booking_lifecycle', 'check_in']
    });
  }
  
  // Log check-out
  static async logCheckOut(booking, actualCheckOutTime, propertyCondition, damages = [], performedBy, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'check_out',
      performedBy,
      previousStatus: 'checked-in',
      newStatus: 'checked-out',
      details: {
        message: 'Guest checked out',
        additionalInfo: {
          actualCheckOut: actualCheckOutTime,
          propertyCondition: propertyCondition,
          damagesReported: damages.length > 0,
          numberOfDamages: damages.length
        }
      },
      changes: [
        {
          field: 'status',
          oldValue: 'checked-in',
          newValue: 'checked-out'
        },
        {
          field: 'checkOutDetails.actualCheckOut',
          oldValue: null,
          newValue: actualCheckOutTime
        }
      ],
      systemInfo,
      severity: damages.length > 0 ? 'high' : 'medium',
      tags: ['booking_lifecycle', 'check_out', damages.length > 0 ? 'damages' : 'clean_checkout']
    });
  }
  
  // Log availability blocking
  static async logAvailabilityBlocked(booking, listingId, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'availability_blocked',
      performedBy: {
        user: null,
        role: 'system',
        name: 'System'
      },
      details: {
        message: 'Listing availability blocked for booking dates',
        automaticAction: true,
        additionalInfo: {
          listingId: listingId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut
        }
      },
      systemInfo,
      severity: 'medium',
      tags: ['availability', 'system_action', 'blocking']
    });
  }
  
  // Log availability release
  static async logAvailabilityReleased(booking, listingId, reason, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'availability_released',
      performedBy: {
        user: null,
        role: 'system',
        name: 'System'
      },
      details: {
        message: 'Listing availability released due to booking changes',
        reason: reason,
        automaticAction: true,
        additionalInfo: {
          listingId: listingId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut
        }
      },
      systemInfo,
      severity: 'medium',
      tags: ['availability', 'system_action', 'release']
    });
  }
  
  // Log admin status update
  static async logAdminStatusUpdate(booking, adminId, previousStatus, newStatus, reason, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'status_updated',
      performedBy: {
        user: adminId,
        role: 'admin',
        name: 'Admin'
      },
      previousStatus,
      newStatus,
      details: {
        message: `Booking status updated by admin from ${previousStatus} to ${newStatus}`,
        reason: reason
      },
      changes: [
        {
          field: 'status',
          oldValue: previousStatus,
          newValue: newStatus
        }
      ],
      systemInfo,
      severity: 'high',
      tags: ['admin_action', 'status_update', 'manual_override']
    });
  }
  
  // Log host response
  static async logHostResponse(booking, hostId, response, systemInfo = {}) {
    return await this.logBookingAction({
      booking: booking._id,
      action: 'host_response_added',
      performedBy: {
        user: hostId,
        role: 'host',
        name: 'Host'
      },
      details: {
        message: 'Host added response to booking',
        additionalInfo: {
          responseLength: response.length,
          hasResponse: true
        }
      },
      changes: [
        {
          field: 'hostResponse',
          oldValue: booking.hostResponse || null,
          newValue: response
        }
      ],
      systemInfo,
      severity: 'low',
      tags: ['communication', 'host_action']
    });
  }
  
  // Get booking activity logs
  static async getBookingLogs(bookingId, limit = 50) {
    try {
      return await BookingLog.findByBooking(bookingId, limit);
    } catch (error) {
      throw error;
    }
  }
  
  // Get user activity logs
  static async getUserLogs(userId, limit = 50) {
    try {
      return await BookingLog.findByUser(userId, limit);
    } catch (error) {
      throw error;
    }
  }
  
  // Get recent system activity
  static async getRecentActivity(hours = 24, limit = 100) {
    try {
      return await BookingLog.findRecentActivity(hours, limit);
    } catch (error) {
      throw error;
    }
  }
  
  // Get critical logs
  static async getCriticalLogs(limit = 20) {
    try {
      return await BookingLog.findCriticalLogs(limit);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BookingLogService;
