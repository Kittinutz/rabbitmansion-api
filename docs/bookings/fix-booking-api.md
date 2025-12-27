# Booking API Enhancement Plan

## Date: December 28, 2025

## Overview

This document outlines the plan to enhance the booking system with improved guest management and a streamlined booking creation process.

---

## 1. Guest Table Enhancement

### Current State

The `Guest` model currently has:

- email (unique)
- phone (optional)
- firstName, lastName
- Various optional fields (dateOfBirth, nationality, passport, address, etc.)
- Missing: whatsapp field

### Required Changes

#### 1.1 Database Schema Update (Prisma)

**File:** `prisma/schema/users.prisma`

Add whatsapp field to Guest model:

```prisma
model Guest {
  id             String          @id @default(uuid())
  email          String          @unique
  phone          String?
  whatsapp       String?         // NEW FIELD
  firstName      String
  lastName       String
  // ... rest of fields
}
```

#### 1.2 Migration

- Create migration: `prisma migrate dev --name add_whatsapp_to_guest`
- Update existing guests with null whatsapp values

---

## 2. Booking Creation API Enhancement

### Current State

The current `POST /bookings` endpoint requires:

- `guestId` (must exist in database)
- `roomIds[]` (array of room IDs)
- `checkInDate`, `checkOutDate`
- `numberOfGuests`, `numberOfChildren`
- Optional: `specialRequests`, `source`, `notes`

### Required Changes

#### 2.1 New Request DTO

**File:** `src/booking/dto/create-booking-request.dto.ts` (NEW)

```typescript
export class CreateBookingRequestDto {
  // Guest Information (will create or find guest)
  fullName: string; // Will split into firstName/lastName
  email: string; // Required
  phone: string; // Required
  whatsapp?: string; // Optional

  // Booking Details
  checkIn: Date; // ISO string format
  checkOut: Date; // ISO string format
  roomType: string; // Room Type ID
  roomName?: string; // Optional room preference
  numberOfRooms: number; // How many rooms of this type
  guests: number; // Total number of guests
  note?: string; // Special requests

  // Payment
  paymentMethod: 'QR_CODE' | 'VISA';
}
```

#### 2.2 Response DTO Enhancement

**File:** `src/booking/dto/booking-response.dto.ts` (NEW)

```typescript
export class BookingResponseDto {
  id: string;
  bookingNumber: string;

  // Guest Info
  guest: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    whatsapp?: string;
  };

  // Dates
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number; // CALCULATED

  // Room Request (not assigned yet)
  roomType: {
    id: string;
    name: string;
    ratePerNight: number;
  };
  numberOfRooms: number; // Requested number of rooms

  // Guests
  numberOfGuests: number;

  // Price Breakdown (CALCULATED)
  priceBreakdown: {
    totalPrice: number; // roomRate * numberOfNights * numberOfRooms (what customer pays)
    cityTax: number; // 1% of total (for admin breakdown)
    vat: number; // 7% of total (for admin breakdown)
    netAmount: number; // totalPrice - cityTax - vat (hotel receives)
    discountAmount: number; // if any discount applied
  };

  // Payment
  paymentMethod: string;
  paymentStatus: string;

  // Status
  status: string;
  note?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Business Logic Implementation

### 3.1 Guest Management Flow

**File:** `src/booking/booking.service.ts`

```typescript
async findOrCreateGuest(data: {
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
}): Promise<Guest> {
  // 1. Check if guest exists by email
  let guest = await this.prisma.guest.findUnique({
    where: { email: data.email }
  });

  // 2. If not exists, create new guest
  if (!guest) {
    const [firstName, ...lastNameParts] = data.fullName.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    guest = await this.prisma.guest.create({
      data: {
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        firstName,
        lastName,
        status: 'ACTIVE'
      }
    });
  } else {
    // 3. Update guest info if exists (phone/whatsapp may have changed)
    guest = await this.prisma.guest.update({
      where: { id: guest.id },
      data: {
        phone: data.phone,
        whatsapp: data.whatsapp || guest.whatsapp,
      }
    });
  }

  return guest;
}
```

### 3.2 Room Type Validation

**File:** `src/booking/booking.service.ts`

```typescript
async getRoomTypeById(roomTypeId: string): Promise<RoomType> {
  // 1. Find room type by ID
  const roomType = await this.prisma.roomType.findUnique({
    where: { id: roomTypeId }
  });

  // 2. Validate room type exists
  if (!roomType) {
    throw new NotFoundException(
      `Room type with ID ${roomTypeId} not found`
    );
  }

  return roomType;
}
```

**Note:** Room assignment will be handled by admin later. This endpoint only creates a booking request with calculated pricing.

### 3.3 Price Calculation

**File:** `src/booking/booking.service.ts`

```typescript
calculatePriceBreakdown(
  basePrice: number,
  numberOfNights: number,
  numberOfRooms: number
): PriceBreakdown {
  // 1. Calculate total price (room rate * nights * number of rooms)
  // This is the final amount customer pays
  const totalPrice = basePrice * numberOfNights * numberOfRooms;

  // 2. Calculate city tax (1% of total) - for admin breakdown
  const cityTax = totalPrice * 0.01;

  // 3. Calculate VAT (7% of total) - for admin breakdown
  const vat = totalPrice * 0.07;

  // 4. Calculate net amount (what hotel receives after taxes)
  const netAmount = totalPrice - cityTax - vat;

  return {
    totalPrice,
    numberOfNights,
    numberOfRooms,
    cityTax,
    vat,
    netAmount,
    discountAmount: 0
  };
}
```

### 3.4 Main Booking Creation

**File:** `src/booking/booking.service.ts`

```typescript
import * as dayjs from 'dayjs';

async createBookingFromRequest(
  dto: CreateBookingRequestDto
): Promise<BookingResponseDto> {
  // 1. Find or create guest
  const guest = await this.findOrCreateGuest({
    fullName: dto.fullName,
    email: dto.email,
    phone: dto.phone,
    whatsapp: dto.whatsapp
  });

  // 2. Get room type and validate it exists
  const roomType = await this.getRoomTypeById(dto.roomType);

  // 3. Calculate number of nights using dayjs
  const numberOfNights = dayjs(dto.checkOut).diff(dayjs(dto.checkIn), 'day');

  // 4. Calculate price breakdown
  const priceBreakdown = this.calculatePriceBreakdown(
    roomType.basePrice,
    numberOfNights,
    dto.numberOfRooms
  );

  // 5. Generate booking number
  const bookingNumber = await this.generateBookingNumber();

  // 6. Create booking in transaction
  const booking = await this.prisma.$transaction(async (tx) => {
    // Create booking
    const newBooking = await tx.booking.create({
      data: {
        bookingNumber,
        guestId: guest.id,
        checkInDate: dto.checkIn,
        checkOutDate: dto.checkOut,
        numberOfGuests: dto.guests,
        numberOfChildren: 0,
        specialRequests: dto.note,
        totalAmount: priceBreakdown.totalPrice,
        taxAmount: priceBreakdown.cityTax,
        serviceCharges: priceBreakdown.vat,
        discountAmount: 0,
        finalAmount: priceBreakdown.totalPrice,
        status: 'PENDING',
        notes: dto.note
      }
    });

    // Note: Room assignment will be handled by admin later
    // No RoomBooking records created at this stage

    // Create payment record
    await tx.payment.create({
      data: {
        bookingId: newBooking.id,
        amount: priceBreakdown.totalPrice,
        method: dto.paymentMethod === 'QR_CODE'
          ? 'MOBILE_PAYMENT'
          : 'CREDIT_CARD',
        status: 'PENDING',
        currency: 'THB'
      }
    });

    return newBooking;
  });

  // 7. Return formatted response
  return this.formatBookingResponse(
    booking,
    roomType,
    priceBreakdown,
    guest,
    dto.numberOfRooms,
    numberOfNights
  );
}
```

**Note:** This creates a booking request without assigning specific rooms. Admin will assign rooms later through a separate endpoint.

---

## 4. Payment Method Enhancement

### Current State

PaymentMethod enum has: CREDIT_CARD, DEBIT_CARD, CASH, BANK_TRANSFER, MOBILE_PAYMENT

### Required Changes

#### 4.1 Update Enum (Optional - use existing)

**File:** `prisma/schema/enums.prisma`

The current enum can accommodate:

- QR_CODE → map to `MOBILE_PAYMENT`
- VISA → map to `CREDIT_CARD`

No schema changes needed. Handle mapping in service layer.

---

## 5. API Endpoint Updates

### 5.1 Controller Changes

**File:** `src/booking/booking.controller.ts`

```typescript
@Post()
@ApiOperation({ summary: 'Create booking from guest request' })
@ApiBody({ type: CreateBookingRequestDto })
@ApiResponse({
  status: 201,
  description: 'Booking created successfully',
  type: BookingResponseDto
})
async createBookingRequest(
  @Body(ValidationPipe) dto: CreateBookingRequestDto
): Promise<BookingResponseDto> {
  return this.bookingService.createBookingFromRequest(dto);
}

// Keep existing createBooking for admin/internal use
@Post('admin')
@ApiOperation({ summary: 'Create booking (Admin)' })
async createBooking(
  @Body(ValidationPipe) dto: CreateBookingDto
): Promise<Booking> {
  return this.bookingService.createBooking(dto);
}
```

---

## 6. Validation Rules

### 6.1 DTO Validation

**File:** `src/booking/dto/create-booking-request.dto.ts`

```typescript
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateBookingRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z\s]+$/, { message: 'Full name must contain only letters' })
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9\s\-()]+$/, { message: 'Invalid phone number' })
  phone: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]+$/, { message: 'Invalid WhatsApp number' })
  whatsapp?: string;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsString()
  @IsNotEmpty()
  roomType: string; // Room Type ID (UUID)

  @IsOptional()
  @IsString()
  roomName?: string;

  @IsNumber()
  @Min(1, { message: 'Must book at least 1 room' })
  numberOfRooms: number;

  @IsNumber()
  @Min(1, { message: 'Must have at least 1 guest' })
  guests: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsEnum(['QR_CODE', 'VISA'])
  @IsNotEmpty()
  paymentMethod: 'QR_CODE' | 'VISA';
}
```

### 6.2 Business Validation

- checkOut must be after checkIn
- roomType must exist in database
- numberOfRooms must be at least 1
- guests must be at least 1
- guests should not exceed room capacity (numberOfRooms \* roomType.maxOccupancy)
- checkIn must not be in the past (allow same day with time check)

**Note:** Room availability is not checked at booking request stage. Admin will verify and assign rooms later.

---

## 7. Implementation Steps

### Phase 1: Database Changes

1. ✅ Add `whatsapp` field to Guest model
2. ✅ Run migration
3. ✅ Test with existing data
4. ✅ Install dayjs: `npm install dayjs`

### Phase 2: DTOs and Types

1. ✅ Create `CreateBookingRequestDto`
2. ✅ Create `BookingResponseDto`
3. ✅ Add validation decorators
4. ✅ Create interface for `PriceBreakdown`

### Phase 3: Service Layer

1. ✅ Implement `findOrCreateGuest()`
2. ✅ Implement `getRoomTypeById()`
3. ✅ Implement `calculatePriceBreakdown()` (with basePrice, nights, numberOfRooms)
4. ✅ Implement `createBookingFromRequest()` (without room assignment)
5. ✅ Implement `formatBookingResponse()`

### Phase 4: Controller

1. ✅ Add new endpoint `POST /bookings`
2. ✅ Keep old endpoint as `POST /bookings/admin`
3. ✅ Update Swagger documentation

### Phase 5: Testing

1. ✅ Unit tests for service methods
2. ✅ Integration tests for booking flow
3. ✅ Test edge cases (no rooms available, invalid dates, etc.)

### Phase 6: Documentation

1. ✅ Update API documentation
2. ✅ Create example requests/responses
3. ✅ Document price calculation logic

---

## 8. Example Request/Response

### Request Example

```json
POST /bookings
{
  "fullName": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+66812345678",
  "whatsapp": "+66812345678",
  "checkIn": "2025-01-15T14:00:00.000Z",
  "checkOut": "2025-01-18T12:00:00.000Z",
  "roomType": "cm123456789",
  "numberOfRooms": 2,
  "guests": 4,
  "note": "Late check-in expected",
  "paymentMethod": "QR_CODE"
}
```

### Response Example

```json
{
  "id": "cm987654321",
  "bookingNumber": "BK20250115001",
  "guest": {
    "id": "cm111222333",
    "fullName": "John Smith",
    "email": "john.smith@example.com",
    "phone": "+66812345678",
    "whatsapp": "+66812345678"
  },
  "checkInDate": "2025-01-15T14:00:00.000Z",
  "checkOutDate": "2025-01-18T12:00:00.000Z",
  "numberOfNights": 3,
  "roomType": {
    "id": "cm123456789",
    "name": "Deluxe Room",
    "ratePerNight": 2000
  },
  "numberOfRooms": 2,
  "numberOfGuests": 4,
  "priceBreakdown": {
    "totalPrice": 12000,
    "cityTax": 120,
    "vat": 840,
    "netAmount": 11040,
    "discountAmount": 0
  },
  "paymentMethod": "MOBILE_PAYMENT",
  "paymentStatus": "PENDING",
  "status": "PENDING",
  "note": "Late check-in expected",
  "createdAt": "2025-12-28T10:00:00.000Z",
  "updatedAt": "2025-12-28T10:00:00.000Z"
}
```

**Calculation Breakdown:**

- 2 rooms × 2000 THB/night × 3 nights = **12,000 THB** (Total Price - what customer pays)

**Admin Breakdown (from total):**

- City Tax (1%): 120 THB
- VAT (7%): 840 THB
- Net Amount (hotel receives): 11,040 THB

---

## 9. Database Schema Summary

### Updated Guest Model

```prisma
model Guest {
  id             String          @id @default(uuid())
  email          String          @unique
  phone          String?
  whatsapp       String?         // ← NEW
  firstName      String
  lastName       String
  // ... existing fields
}
```

### Payment Model (verify exists)

```prisma
model Payment {
  id              String        @id @default(uuid())
  bookingId       String
  amount          Float
  method          PaymentMethod
  status          PaymentStatus
  currency        String        @default("THB")
  transactionId   String?
  paidAt          DateTime?
  refundedAt      DateTime?
  refundAmount    Float?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  booking         Booking       @relation(fields: [bookingId], references: [id])
}
```

---

## 10. Error Handling

### Common Errors to Handle

1. **No rooms available**: Return 400 with message
2. **Invalid date range**: checkOut before checkIn
3. **Guest creation fails**: Email already exists but phone conflict
4. **Room type not found**: 404 error
5. **Insufficient capacity**: Total guests exceed room capacity
6. **Past date booking**: checkIn is in the past

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Only 1 room available of type requested",
  "error": "Bad Request"
}
```

---

## 11. Next Steps After Implementation

1. **Add booking confirmation email** to guest
2. **Add SMS/WhatsApp notification** integration
3. **Add payment gateway** integration (QR Code, Visa)
4. **Add booking modification** endpoint
5. **Add cancellation policy** logic
6. **Add automatic room assignment** optimization
7. **Add deposit/advance payment** handling

---

## Notes

- All prices in Thai Baht (THB)
- Total price = nights × roomRate × numberOfRooms (customer pays this amount)
- City Tax: 1% of total (extracted for tax purposes)
- VAT: 7% of total (extracted for tax purposes)
- Net Amount: 92% of total (hotel receives after taxes)
- Booking number format: BK{YYYYMMDD}{sequence}
- Time zone: UTC (convert to local in frontend)
