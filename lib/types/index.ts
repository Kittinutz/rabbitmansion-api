// TypeScript Types for Hotel Management System
// Generated types based on Prisma schema with additional utility types

import type {
  Admin,
  Guest,
  Room,
  Booking,
  Payment,
  Service,
  Review,
  RoomType,
  RoomStatus,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  ServiceCategory,
  GuestStatus,
  RefundStatus,
  AuditAction,
} from '../../generated/prisma';

// ================================
// UTILITY TYPES
// ================================

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> &
  Omit<T, K>;

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ================================
// MULTI-LANGUAGE CONTENT
// ================================

export interface MultiLanguageContent {
  en: string;
  th?: string;
}

export interface TranslatableContent {
  name: MultiLanguageContent;
  description?: MultiLanguageContent;
}

// ================================
// ROOM TYPES
// ================================

export interface RoomCreateInput {
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  maxOccupancy?: number;
  bedCount?: number;
  bedType?: string;
  basePrice: number;
  seasonalPricing?: Record<string, number>;
  size?: number;
  view?: string;
  smokingAllowed?: boolean;
  petFriendly?: boolean;
  accessible?: boolean;
  name: MultiLanguageContent;
  description?: MultiLanguageContent;
  amenities?: string[];
  mainImage?: string;
  galleryImages?: string[];
  bannerImage?: string;
}

export interface RoomUpdateInput extends Partial<RoomCreateInput> {
  id: string;
  status?: RoomStatus;
  notes?: string;
}

export interface RoomWithDetails extends Room {
  _count?: {
    bookings: number;
    roomImages: number;
  };
  isAvailable?: boolean;
  nextBooking?: Booking | null;
  currentOccupancy?: number;
}

export interface RoomAvailabilityQuery {
  checkInDate: Date;
  checkOutDate: Date;
  roomType?: RoomType;
  maxOccupancy?: number;
  amenities?: string[];
}

export interface RoomAvailabilityResult {
  room: RoomWithDetails;
  isAvailable: boolean;
  price: number;
  conflictingBookings?: Booking[];
}

// ================================
// BOOKING TYPES
// ================================

export interface BookingCreateInput {
  guestId: string;
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  numberOfChildren?: number;
  specialRequests?: string;
  roomRate: number;
  serviceIds?: string[]; // Additional services
  discountAmount?: number;
  source?: string;
  notes?: string;
}

export interface BookingUpdateInput {
  id: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  numberOfGuests?: number;
  numberOfChildren?: number;
  specialRequests?: string;
  status?: BookingStatus;
  notes?: string;
  cancellationReason?: string;
}

export interface BookingWithDetails extends Booking {
  guest: Guest;
  room: RoomWithDetails;
  payments: Payment[];
  services: Array<{
    service: Service;
    quantity: number;
    totalPrice: number;
  }>;
  reviews?: Review[];
  totalNights?: number;
  remainingBalance?: number;
}

export interface BookingFilters {
  status?: BookingStatus;
  roomType?: RoomType;
  checkInDate?: DateRange;
  guestName?: string;
  roomNumber?: string;
  paymentStatus?: PaymentStatus;
}

// ================================
// GUEST TYPES
// ================================

export interface GuestCreateInput {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  nationality?: string;
  passport?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  preferences?: string[];
  notes?: string;
}

export interface GuestUpdateInput extends Partial<GuestCreateInput> {
  id: string;
  status?: GuestStatus;
  vipLevel?: number;
}

export interface GuestWithStats extends Guest {
  _count?: {
    bookings: number;
    reviews: number;
  };
  lastStayDate?: Date;
  averageRating?: number;
  lifetimeValue?: number;
}

// ================================
// PAYMENT TYPES
// ================================

export interface PaymentCreateInput {
  bookingId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  description?: string;
  notes?: string;
}

export interface PaymentProcessResult {
  success: boolean;
  payment?: Payment;
  transactionId?: string;
  error?: string;
  gatewayResponse?: Record<string, any>;
}

export interface RefundCreateInput {
  paymentId: string;
  amount: number;
  reason: string;
  notes?: string;
}

// ================================
// SERVICE TYPES
// ================================

export interface ServiceCreateInput {
  code: string;
  name: MultiLanguageContent;
  description?: MultiLanguageContent;
  category: ServiceCategory;
  price: number;
  unit?: string;
  maxQuantity?: number;
  requiresApproval?: boolean;
  availableDays?: string[];
  availableFrom?: string;
  availableTo?: string;
  notes?: string;
}

export interface ServiceUpdateInput extends Partial<ServiceCreateInput> {
  id: string;
  isActive?: boolean;
}

export interface ServiceWithBookings extends Service {
  _count?: {
    bookingServices: number;
  };
  totalRevenue?: number;
}

// ================================
// ANALYTICS TYPES
// ================================

export interface DashboardMetrics {
  overview: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    outOfOrderRooms: number;
    occupancyRate: number;
    adr: number; // Average Daily Rate
    revpar: number; // Revenue Per Available Room
  };
  revenue: {
    today: number;
    thisMonth: number;
    thisYear: number;
    comparison: {
      todayVsYesterday: number;
      monthVsLastMonth: number;
      yearVsLastYear: number;
    };
  };
  bookings: {
    totalToday: number;
    totalThisMonth: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    cancelled: number;
  };
  guests: {
    totalActive: number;
    newThisMonth: number;
    vipGuests: number;
    averageStayDuration: number;
  };
}

export interface RevenueAnalytics {
  period: DateRange;
  totalRevenue: number;
  roomRevenue: number;
  serviceRevenue: number;
  dailyBreakdown: Array<{
    date: Date;
    roomRevenue: number;
    serviceRevenue: number;
    totalRevenue: number;
    occupancyRate: number;
  }>;
  topPerformingRooms: Array<{
    room: RoomWithDetails;
    revenue: number;
    occupancyRate: number;
  }>;
}

export interface OccupancyReport {
  period: DateRange;
  averageOccupancyRate: number;
  totalBookings: number;
  totalNights: number;
  roomTypeBreakdown: Array<{
    roomType: RoomType;
    totalRooms: number;
    occupiedNights: number;
    occupancyRate: number;
    revenue: number;
  }>;
}

// ================================
// FILTER & SEARCH TYPES
// ================================

export interface RoomFilters {
  roomType?: RoomType[];
  status?: RoomStatus[];
  floor?: number[];
  priceRange?: {
    min: number;
    max: number;
  };
  amenities?: string[];
  search?: string;
}

export interface AdvancedSearchFilters {
  dateRange?: DateRange;
  roomFilters?: RoomFilters;
  bookingFilters?: BookingFilters;
  guestFilters?: {
    status?: GuestStatus;
    vipLevel?: number;
    nationality?: string;
    hasLoyaltyProgram?: boolean;
  };
}

// ================================
// AUDIT & LOGGING TYPES
// ================================

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  admin: {
    username: string;
    firstName: string;
    lastName: string;
  };
}

// ================================
// ERROR TYPES
// ================================

export class HotelManagementError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'HotelManagementError';
  }
}

export class ValidationError extends HotelManagementError {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends HotelManagementError {
  constructor(entity: string, id: string) {
    super(`${entity} with ID ${id} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HotelManagementError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends HotelManagementError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

// ================================
// EXPORT PRISMA TYPES
// ================================

export type {
  Admin,
  Guest,
  Room,
  Booking,
  Payment,
  Service,
  Review,
  RoomType,
  RoomStatus,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  ServiceCategory,
  GuestStatus,
  RefundStatus,
  AuditAction,
};
