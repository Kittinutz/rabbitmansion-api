// ================================================================
// BOOKING MANAGEMENT DOMAIN - REFERENCE DOCUMENTATION
// ================================================================
// Models: Booking, Payment, Refund, Service, BookingService, Review

// ================================
// BOOKING MODEL DOCUMENTATION
// ================================

/*
Key Features:
- Complete reservation lifecycle management
- Financial tracking with historical pricing
- Guest preference handling
- Admin audit trail
*/

interface BookingModel {
  id: string;
  bookingNumber: string; // "BK-2024-001234"
  guestId: string;
  roomId: string;

  // Timeline
  checkInDate: Date;
  checkOutDate: Date;
  actualCheckIn?: Date;
  actualCheckOut?: Date;

  // Guest Details
  numberOfGuests: number;
  numberOfChildren: number;
  specialRequests?: string; // Dietary, accessibility needs

  // Financial
  roomRate: number; // Rate at booking time
  totalAmount: number; // Total booking amount
  taxAmount: number;
  serviceCharges: number;
  status: BookingStatus;

  // Audit Trail
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
  updatedById?: string;

  // Relations
  guest: Guest;
  room: Room;
  createdBy?: Admin;
  updatedBy?: Admin;
  payments: Payment[];
  services: BookingService[];
  reviews: Review[];
}

// ================================
// PAYMENT MODEL DOCUMENTATION
// ================================

interface PaymentModel {
  id: string;
  bookingId: string;
  amount: number;
  currency: string; // "THB", "USD", etc.
  paymentMethod: PaymentMethod;
  status: PaymentStatus;

  // Transaction Details
  transactionId?: string; // Gateway transaction ID
  gatewayResponse?: Json; // Gateway response data

  // Metadata
  paidAt?: Date;
  description?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  booking: Booking;
  refunds: Refund[];
}

// ================================
// COMMON BOOKING QUERIES
// ================================

/*
Today's Arrivals:
{
  where: {
    checkInDate: {
      gte: startOfDay(today),
      lte: endOfDay(today)
    },
    status: "CONFIRMED"
  }
}

Available Rooms for Period:
{
  where: {
    isActive: true,
    status: "AVAILABLE",
    bookings: {
      none: {
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        OR: [
          { checkInDate: { lt: checkOut }, checkOutDate: { gt: checkIn } }
        ]
      }
    }
  }
}

Revenue by Date Range:
{
  where: {
    createdAt: { gte: startDate, lte: endDate },
    status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] }
  },
  include: { payments: true }
}
*/

export type { BookingModel, PaymentModel };
