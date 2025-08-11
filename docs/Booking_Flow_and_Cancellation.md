# Gharfar Booking & Cancellation – Quick Guide

This document summarizes the booking lifecycle, cancellation rules, and refunds implemented in the backend.

## Key Statuses
- pending: request waiting for host approval
- confirmed: accepted (or instant book)
- checked-in: guest has checked in
- checked-out: guest has checked out
- completed: stay completed
- cancelled: cancelled by guest/host/admin
- declined: request declined by host
- expired: pending request auto-expires

## Booking Creation Flow
1. Client submits a booking for a listing.
   - Dates accepted as checkIn/checkOut or checkInDate/checkOutDate (ISO format).
   - Guests: adults (or guests) + optional children/infants.
   - Pets: either petDetails or pets[] (alias) if listing allows pets.
   - Payment: payment.method or paymentMethod alias (maps to credit_card, debit_card, paypal, bank_transfer). Defaults to credit_card when missing.
2. Server validations:
   - Listing exists and isActive.
   - check-in date cannot be in the past (same-day allowed). Range must be valid (nights > 0).
   - totalGuests <= listing.maxGuests.
   - Pets allowed, count <= maxPets, types allowed.
   - Availability: no overlapping bookings (considers pending, confirmed, checked-in).
3. Pricing computed server-side:
   - subtotal = pricePerNight * nights.
   - cleaningFee (listing), serviceFee (12% of subtotal), petFee (per pet per night), petDeposit (per pet), taxes (10% of taxable amount).
   - totalAmount = subtotal + cleaningFee + serviceFee + petFee + petDeposit + taxes.
4. Booking type & status:
   - bookingType = instant if listing.instantBook else request.
   - status = confirmed for instant; pending otherwise (expires in 24h).
5. Response includes populated listing/guest/host and a human-readable bookingId (BKG-YYYYMMDD-#####).

Example minimal payload
{
  "listing": "<listingId>",
  "checkInDate": "2025-08-01",
  "checkOutDate": "2025-08-05",
  "adults": 2,
  "children": 0,
  "paymentMethod": "stripe_card",
  "guestMessage": "Any ground-floor room?"
}

Notes
- You do not need to send pricing; server calculates it.
- paymentMethod aliases like "stripe_card", "card" map to credit_card.

## Host/Admin Actions
- Host can confirm/decline pending bookings. Confirming blocks availability.
- Admin can update booking status and also block/release availability.
- Admin force-cancel can process refunds via payment integration where applicable.

## Check-in / Check-out Flow
- Check-in allowed only when status = confirmed; sets status to checked-in and records check-in details.
- Check-out allowed only when status = checked-in; sets status to checked-out and records check-out details.

## Cancellation Flow (Guest)
- Guest cancellation endpoint requires the same authenticated user who created the booking.
- Server rule (canBeCancelled):
  - Allowed only when status is pending or confirmed
  - And more than 24 hours remain until check-in
- If allowed, booking.status becomes cancelled and cancellation details are saved (reason, timestamp, refundAmount per policy).
- Refund is calculated and returned; payment refund handling is not automatically executed for guest cancellations in the current flow.

## Cancellation Flow (Admin)
- Admin cancellation bypasses the 24-hour rule.
- On admin cancel:
  - booking.status = cancelled
  - Optional refund can be processed (PaymentService)
  - Availability is released for those dates
  - Action is logged

## Refund Policy (calculateRefund)
- flexible
  - >= 1 day before check-in: 100%
  - < 1 day: 0%
- moderate
  - >= 5 days: 100%
  - 1–4 days: 50%
  - < 1 day: 0%
- strict
  - >= 7 days: 100%
  - 1–6 days: 50%
  - < 1 day: 0%
- Pet deposit (if any) is always refunded in addition to the policy refund.

## Expiration
- Pending bookings auto-expire after 24 hours (expiresAt).

## Availability
- Overlaps are checked against bookings in statuses: pending, confirmed, checked-in.
- On confirm, availability is blocked; on admin cancel, availability is released.

