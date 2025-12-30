import { BookingStatus } from '../../../prisma/generated/prisma';

export interface BookingListQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  guestEmail?: string;
  guestPhone?: string;
  bookingNumber?: string;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BookingItem {
  id: string;
  bookingNumber: string;
  guest: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  numberOfGuests: number;
  roomType: {
    id: string;
    name: string;
  } | null;
  numberOfRooms: number;
  assignedRooms?: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: Date;
}

export interface BookingListResponse {
  data: BookingItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
