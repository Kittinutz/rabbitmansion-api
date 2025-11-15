// Zod Validation Schemas for Hotel Management System
// Comprehensive validation for all API inputs

import { z } from 'zod';

// ================================
// ENUM SCHEMAS
// ================================

export const RoomTypeSchema = z.enum([
  'STANDARD',
  'DELUXE',
  'SUITE',
  'PRESIDENTIAL',
  'FAMILY',
  'ACCESSIBLE',
]);

export const RoomStatusSchema = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'OUT_OF_ORDER',
  'CLEANING',
]);

export const BookingStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'NO_SHOW',
]);

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'PARTIALLY_PAID',
  'REFUNDED',
  'FAILED',
]);

export const PaymentMethodSchema = z.enum([
  'CREDIT_CARD',
  'DEBIT_CARD',
  'CASH',
  'BANK_TRANSFER',
  'MOBILE_PAYMENT',
]);

export const ServiceCategorySchema = z.enum([
  'ROOM_SERVICE',
  'SPA',
  'TRANSPORTATION',
  'DINING',
  'LAUNDRY',
  'ENTERTAINMENT',
  'BUSINESS',
]);

export const GuestStatusSchema = z.enum(['ACTIVE', 'BLOCKED', 'VIP']);

// ================================
// UTILITY SCHEMAS
// ================================

export const MultiLanguageContentSchema = z.object({
  en: z.string().min(1, 'English content is required'),
  th: z.string().optional(),
});

export const DateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const CuidSchema = z.string().cuid();
export const EmailSchema = z.string().email();
export const PhoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{8,20}$/, 'Invalid phone number format');

// ================================
// ADMIN SCHEMAS
// ================================

export const AdminCreateSchema = z.object({
  email: EmailSchema,
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores',
    ),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    ),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.string().default('ADMIN'),
});

export const AdminUpdateSchema = AdminCreateSchema.partial().extend({
  id: CuidSchema,
  isActive: z.boolean().optional(),
});

export const AdminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// ================================
// GUEST SCHEMAS
// ================================

export const GuestCreateSchema = z.object({
  email: EmailSchema,
  phone: PhoneSchema.optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.coerce.date().optional(),
  nationality: z.string().max(100).optional(),
  passport: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  preferences: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional(),
});

export const GuestUpdateSchema = GuestCreateSchema.partial().extend({
  id: CuidSchema,
  status: GuestStatusSchema.optional(),
  vipLevel: z.number().int().min(0).max(10).optional(),
});

export const GuestSearchSchema = z
  .object({
    query: z.string().min(1),
    status: GuestStatusSchema.optional(),
    vipLevel: z.number().int().min(0).max(10).optional(),
    nationality: z.string().optional(),
    hasLoyaltyProgram: z.boolean().optional(),
  })
  .merge(PaginationSchema);

// ================================
// ROOM SCHEMAS
// ================================

export const RoomCreateSchema = z.object({
  roomNumber: z.string().min(1).max(20),
  roomType: RoomTypeSchema,
  floor: z.number().int().min(1).max(100),
  maxOccupancy: z.number().int().min(1).max(20).default(2),
  bedCount: z.number().int().min(1).max(10).default(1),
  bedType: z.string().max(50).optional(),
  basePrice: z.number().positive(),
  seasonalPricing: z.record(z.string(), z.number().positive()).optional(),
  size: z.number().positive().optional(),
  view: z.string().max(100).optional(),
  smokingAllowed: z.boolean().default(false),
  petFriendly: z.boolean().default(false),
  accessible: z.boolean().default(false),
  name: MultiLanguageContentSchema,
  description: MultiLanguageContentSchema.optional(),
  amenities: z.array(z.string()).default([]),
  mainImage: z.string().url().optional(),
  galleryImages: z.array(z.string().url()).default([]),
  bannerImage: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

export const RoomUpdateSchema = RoomCreateSchema.partial().extend({
  id: CuidSchema,
  status: RoomStatusSchema.optional(),
  lastCleaned: z.coerce.date().optional(),
  lastMaintenance: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const RoomFilterSchema = z
  .object({
    roomType: z.array(RoomTypeSchema).optional(),
    status: z.array(RoomStatusSchema).optional(),
    floor: z.array(z.number().int()).optional(),
    priceRange: z
      .object({
        min: z.number().min(0),
        max: z.number().positive(),
      })
      .optional(),
    amenities: z.array(z.string()).optional(),
    search: z.string().optional(),
  })
  .merge(PaginationSchema);

export const RoomAvailabilitySchema = z
  .object({
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    roomType: RoomTypeSchema.optional(),
    maxOccupancy: z.number().int().min(1).optional(),
    amenities: z.array(z.string()).optional(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: 'Check-out date must be after check-in date',
    path: ['checkOutDate'],
  });

// ================================
// BOOKING SCHEMAS
// ================================

export const BookingCreateSchema = z
  .object({
    guestId: CuidSchema,
    roomId: CuidSchema,
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    numberOfGuests: z.number().int().min(1).max(20),
    numberOfChildren: z.number().int().min(0).max(10).default(0),
    specialRequests: z.string().max(1000).optional(),
    roomRate: z.number().positive(),
    serviceIds: z.array(CuidSchema).optional(),
    discountAmount: z.number().min(0).default(0),
    source: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: 'Check-out date must be after check-in date',
    path: ['checkOutDate'],
  })
  .refine(
    (data) => data.checkInDate >= new Date(new Date().setHours(0, 0, 0, 0)),
    {
      message: 'Check-in date cannot be in the past',
      path: ['checkInDate'],
    },
  );

export const BookingUpdateSchema = z
  .object({
    id: CuidSchema,
    checkInDate: z.coerce.date().optional(),
    checkOutDate: z.coerce.date().optional(),
    numberOfGuests: z.number().int().min(1).max(20).optional(),
    numberOfChildren: z.number().int().min(0).max(10).optional(),
    specialRequests: z.string().max(1000).optional(),
    status: BookingStatusSchema.optional(),
    notes: z.string().max(1000).optional(),
    cancellationReason: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.checkInDate && data.checkOutDate) {
        return data.checkOutDate > data.checkInDate;
      }
      return true;
    },
    {
      message: 'Check-out date must be after check-in date',
      path: ['checkOutDate'],
    },
  );

export const BookingFilterSchema = z
  .object({
    status: BookingStatusSchema.optional(),
    roomType: RoomTypeSchema.optional(),
    checkInDate: DateRangeSchema.optional(),
    guestName: z.string().optional(),
    roomNumber: z.string().optional(),
    paymentStatus: PaymentStatusSchema.optional(),
  })
  .merge(PaginationSchema);

export const CheckInSchema = z.object({
  bookingId: CuidSchema,
  actualCheckIn: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

export const CheckOutSchema = z.object({
  bookingId: CuidSchema,
  actualCheckOut: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

// ================================
// PAYMENT SCHEMAS
// ================================

export const PaymentCreateSchema = z.object({
  bookingId: CuidSchema,
  amount: z.number().positive(),
  paymentMethod: PaymentMethodSchema,
  transactionId: z.string().optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const PaymentUpdateSchema = z.object({
  id: CuidSchema,
  status: PaymentStatusSchema,
  transactionId: z.string().optional(),
  paidAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

export const RefundCreateSchema = z.object({
  paymentId: CuidSchema,
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});

export const RefundUpdateSchema = z.object({
  id: CuidSchema,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED']),
  notes: z.string().max(1000).optional(),
});

// ================================
// SERVICE SCHEMAS
// ================================

export const ServiceCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[A-Z0-9_]+$/,
      'Service code must be uppercase letters, numbers, and underscores only',
    ),
  name: MultiLanguageContentSchema,
  description: MultiLanguageContentSchema.optional(),
  category: ServiceCategorySchema,
  price: z.number().positive(),
  unit: z.string().max(50).optional(),
  maxQuantity: z.number().int().positive().optional(),
  requiresApproval: z.boolean().default(false),
  availableDays: z
    .array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']))
    .optional(),
  availableFrom: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format')
    .optional(),
  availableTo: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format')
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const ServiceUpdateSchema = ServiceCreateSchema.partial().extend({
  id: CuidSchema,
  isActive: z.boolean().optional(),
});

export const BookingServiceCreateSchema = z.object({
  bookingId: CuidSchema,
  serviceId: CuidSchema,
  quantity: z.number().int().positive().default(1),
  notes: z.string().max(1000).optional(),
});

// ================================
// REVIEW SCHEMAS
// ================================

export const ReviewCreateSchema = z.object({
  bookingId: CuidSchema,
  guestId: CuidSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
  isPublic: z.boolean().default(true),
});

export const ReviewUpdateSchema = z.object({
  id: CuidSchema,
  response: z.string().max(1000).optional(),
  isVerified: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

// ================================
// MAINTENANCE SCHEMAS
// ================================

export const MaintenanceLogCreateSchema = z.object({
  roomId: CuidSchema,
  type: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  cost: z.number().positive().optional(),
  performedBy: z.string().min(1).max(200),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

export const MaintenanceLogUpdateSchema =
  MaintenanceLogCreateSchema.partial().extend({
    id: CuidSchema,
    isCompleted: z.boolean().optional(),
  });

// ================================
// ANALYTICS SCHEMAS
// ================================

export const AnalyticsQuerySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    roomType: RoomTypeSchema.optional(),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const RevenueReportSchema = AnalyticsQuerySchema.extend({
  includeServices: z.boolean().default(true),
  currency: z.string().length(3).default('THB'),
});

// ================================
// SETTINGS SCHEMAS
// ================================

export const SettingsUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  category: z.string().optional(),
});

// ================================
// API RESPONSE SCHEMAS
// ================================

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
});

// ================================
// FILE UPLOAD SCHEMAS
// ================================

export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  folder: z.string().optional(),
  maxSize: z
    .number()
    .positive()
    .default(5 * 1024 * 1024), // 5MB
  allowedTypes: z
    .array(z.string())
    .default(['image/jpeg', 'image/png', 'image/webp']),
});

export const ImageUploadSchema = FileUploadSchema.extend({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  quality: z.number().min(1).max(100).default(80),
});

// ================================
// BULK OPERATION SCHEMAS
// ================================

export const BulkRoomUpdateSchema = z.object({
  roomIds: z.array(CuidSchema).min(1),
  updates: RoomUpdateSchema.omit({ id: true }),
});

export const BulkBookingStatusUpdateSchema = z.object({
  bookingIds: z.array(CuidSchema).min(1),
  status: BookingStatusSchema,
  reason: z.string().max(500).optional(),
});

// Export all schemas
export const ValidationSchemas = {
  // Enums
  RoomType: RoomTypeSchema,
  RoomStatus: RoomStatusSchema,
  BookingStatus: BookingStatusSchema,
  PaymentStatus: PaymentStatusSchema,
  PaymentMethod: PaymentMethodSchema,
  ServiceCategory: ServiceCategorySchema,
  GuestStatus: GuestStatusSchema,

  // Utilities
  MultiLanguageContent: MultiLanguageContentSchema,
  DateRange: DateRangeSchema,
  Pagination: PaginationSchema,
  Cuid: CuidSchema,
  Email: EmailSchema,
  Phone: PhoneSchema,

  // Admin
  AdminCreate: AdminCreateSchema,
  AdminUpdate: AdminUpdateSchema,
  AdminLogin: AdminLoginSchema,

  // Guest
  GuestCreate: GuestCreateSchema,
  GuestUpdate: GuestUpdateSchema,
  GuestSearch: GuestSearchSchema,

  // Room
  RoomCreate: RoomCreateSchema,
  RoomUpdate: RoomUpdateSchema,
  RoomFilter: RoomFilterSchema,
  RoomAvailability: RoomAvailabilitySchema,

  // Booking
  BookingCreate: BookingCreateSchema,
  BookingUpdate: BookingUpdateSchema,
  BookingFilter: BookingFilterSchema,
  CheckIn: CheckInSchema,
  CheckOut: CheckOutSchema,

  // Payment
  PaymentCreate: PaymentCreateSchema,
  PaymentUpdate: PaymentUpdateSchema,
  RefundCreate: RefundCreateSchema,
  RefundUpdate: RefundUpdateSchema,

  // Service
  ServiceCreate: ServiceCreateSchema,
  ServiceUpdate: ServiceUpdateSchema,
  BookingServiceCreate: BookingServiceCreateSchema,

  // Review
  ReviewCreate: ReviewCreateSchema,
  ReviewUpdate: ReviewUpdateSchema,

  // Maintenance
  MaintenanceLogCreate: MaintenanceLogCreateSchema,
  MaintenanceLogUpdate: MaintenanceLogUpdateSchema,

  // Analytics
  AnalyticsQuery: AnalyticsQuerySchema,
  RevenueReport: RevenueReportSchema,

  // Settings
  SettingsUpdate: SettingsUpdateSchema,

  // API
  ApiResponse: ApiResponseSchema,

  // File Upload
  FileUpload: FileUploadSchema,
  ImageUpload: ImageUploadSchema,

  // Bulk Operations
  BulkRoomUpdate: BulkRoomUpdateSchema,
  BulkBookingStatusUpdate: BulkBookingStatusUpdateSchema,
};
