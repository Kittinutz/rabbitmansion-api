import {
  BookingStatus,
  RoomBookingStatus,
} from '../../../prisma/generated/prisma';

export interface BookingDetailResponse {
  id: string;
  bookingNumber: string;

  // Guest Information
  guest: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    whatsapp?: string;
    totalStays: number;
    totalSpent: number;
  };

  // Booking Dates
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  actualCheckIn?: Date;
  actualCheckOut?: Date;

  // Room Information
  roomType: {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    capacity: number;
    bedType: string;
    amenities: string[];
  } | null;
  numberOfRooms: number;

  // Assigned Rooms (if any)
  assignedRooms?: {
    id: string;
    roomId: string;
    roomNumber: string;
    floor: number;
    roomRate: number;
    status: RoomBookingStatus;
    assignedAt: Date;
  }[];

  // Guest Details
  numberOfGuests: number;
  numberOfChildren: number;

  // Pricing
  priceBreakdown: {
    totalPrice: number;
    cityTax: number;
    vat: number;
    netAmount: number;
    discountAmount: number;
  };

  // Payment
  payments?: {
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt?: Date;
  }[];

  // Additional Info
  status: BookingStatus;
  specialRequests?: string;
  notes?: string;
  source?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    name: string;
  };
}
