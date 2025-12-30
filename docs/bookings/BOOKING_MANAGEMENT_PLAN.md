# Booking Management APIs - Implementation Plan

## Date: December 29, 2025

## Overview

This document outlines the plan to implement booking management endpoints for listing, viewing, assigning rooms, check-in, and check-out operations.

---

## 1. API Endpoints Overview

### Public/Guest Endpoints (Already Implemented)

- ✅ `POST /bookings` - Create booking request

### Admin Endpoints (To Be Implemented)

- 🔲 `GET /bookings` - List all bookings with pagination and filters
- 🔲 `GET /bookings/:id` - Get booking details
- 🔲 `PUT /bookings/:bookingId/assign-rooms` - Assign rooms to booking
- 🔲 `PUT /bookings/:bookingId/check-in` - Check in a booking
- 🔲 `PUT /bookings/:bookingId/check-out` - Check out a booking

---

## 2. GET /bookings - List Bookings with Pagination

### 2.1 Endpoint Specification

**Method:** `GET`  
**Path:** `/bookings`  
**Auth:** Admin (to be implemented)

### 2.2 Query Parameters

```typescript
interface BookingListQuery {
  page?: number; // Default: 1
  limit?: number; // Default: 10, Max: 100
  status?: BookingStatus; // PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW
  guestEmail?: string; // Filter by guest email
  guestPhone?: string; // Filter by guest phone
  bookingNumber?: string; // Search by booking number
  checkInFrom?: string; // Filter bookings from this check-in date
  checkInTo?: string; // Filter bookings to this check-in date
  checkOutFrom?: string; // Filter bookings from this check-out date
  checkOutTo?: string; // Filter bookings to this check-out date
  sortBy?: string; // createdAt, checkInDate, checkOutDate, totalAmount
  sortOrder?: 'asc' | 'desc'; // Default: desc
}
```

### 2.3 Response Structure

```typescript
interface BookingListResponse {
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

interface BookingItem {
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
  };
  numberOfRooms: number;
  assignedRooms?: number; // Count of assigned rooms
  totalAmount: number;
  status: BookingStatus;
  createdAt: Date;
}
```

### 2.4 Service Method

```typescript
async findAllBookings(query: BookingListQuery): Promise<BookingListResponse> {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 10, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  // Apply filters
  if (query.status) where.status = query.status;
  if (query.guestEmail) where.guest = { email: { contains: query.guestEmail } };
  if (query.guestPhone) where.guest = { phone: { contains: query.guestPhone } };
  if (query.bookingNumber) where.bookingNumber = { contains: query.bookingNumber };
  if (query.checkInFrom) where.checkInDate = { gte: new Date(query.checkInFrom) };
  if (query.checkInTo) where.checkInDate = { ...where.checkInDate, lte: new Date(query.checkInTo) };
  // ... similar for checkOut dates

  const [bookings, totalItems] = await Promise.all([
    this.prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      include: {
        guest: true,
        roomBookings: { include: { room: { include: { roomType: true } } } }
      }
    }),
    this.prisma.booking.count({ where })
  ]);

  // Format response with pagination
  return { data: formatBookings(bookings), pagination: calculatePagination(page, limit, totalItems) };
}
```

---

## 3. GET /bookings/:id - Get Booking Details

### 3.1 Endpoint Specification

**Method:** `GET`  
**Path:** `/bookings/:id`  
**Auth:** Admin (to be implemented)

### 3.2 Response Structure

```typescript
interface BookingDetailResponse {
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
  };
  numberOfRooms: number;

  // Assigned Rooms (if any)
  assignedRooms?: {
    id: string;
    roomId: string;
    roomNumber: string;
    roomName: string;
    floor: number;
    roomRate: number;
    status: RoomBookingStatus; // ASSIGNED, CHECKED_IN, CHECKED_OUT, CANCELLED
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
```

### 3.3 Service Method

```typescript
async getBookingById(id: string): Promise<BookingDetailResponse> {
  const booking = await this.prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      roomBookings: {
        include: {
          room: {
            include: { roomType: true }
          }
        }
      },
      payments: true,
      createdBy: true
    }
  });

  if (!booking) {
    throw new NotFoundException(`Booking with ID ${id} not found`);
  }

  return formatBookingDetail(booking);
}
```

---

## 4. PUT /bookings/:bookingId/assign-rooms - Assign Rooms

### 4.1 Endpoint Specification

**Method:** `PUT`  
**Path:** `/bookings/:bookingId/assign-rooms`  
**Auth:** Admin (to be implemented)

### 4.2 Request DTO

```typescript
class AssignRoomsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roomIds: string[]; // Array of room IDs from rooms table

  @IsOptional()
  @IsString()
  notes?: string; // Optional notes about room assignment
}
```

### 4.3 Business Logic

#### Validations:

1. Booking must exist and be in PENDING status
2. Booking should not already have rooms assigned (or allow reassignment)
3. Number of rooms must match requested numberOfRooms
4. All rooms must exist and be AVAILABLE
5. All rooms should be of the same room type as requested in booking
6. Rooms should not have overlapping bookings for the same dates

#### Process Flow:

```typescript
async assignRooms(bookingId: string, dto: AssignRoomsDto): Promise<BookingDetailResponse> {
  // 1. Get booking and validate
  const booking = await this.getBookingById(bookingId);

  if (booking.status !== BookingStatus.PENDING) {
    throw new BadRequestException('Can only assign rooms to PENDING bookings');
  }

  if (dto.roomIds.length !== booking.numberOfRooms) {
    throw new BadRequestException(
      `Number of rooms (${dto.roomIds.length}) does not match booking requirement (${booking.numberOfRooms})`
    );
  }

  // 2. Validate all rooms
  const rooms = await this.prisma.room.findMany({
    where: { id: { in: dto.roomIds } },
    include: { roomType: true }
  });

  if (rooms.length !== dto.roomIds.length) {
    throw new BadRequestException('One or more rooms not found');
  }

  // Check all rooms are AVAILABLE
  const unavailableRooms = rooms.filter(r => r.status !== RoomStatus.AVAILABLE);
  if (unavailableRooms.length > 0) {
    throw new BadRequestException(
      `Rooms ${unavailableRooms.map(r => r.roomNumber).join(', ')} are not available`
    );
  }

  // Check all rooms are of correct room type
  const wrongTypeRooms = rooms.filter(r => r.roomTypeId !== booking.roomType.id);
  if (wrongTypeRooms.length > 0) {
    throw new BadRequestException(
      `Rooms ${wrongTypeRooms.map(r => r.roomNumber).join(', ')} are not of the requested room type`
    );
  }

  // 3. Check for booking conflicts
  await this.validateRoomsAvailability(
    dto.roomIds,
    booking.checkInDate,
    booking.checkOutDate
  );

  // 4. Create room assignments in transaction
  return await this.prisma.$transaction(async (tx) => {
    // Create RoomBooking records
    const roomBookings = dto.roomIds.map(roomId => {
      const room = rooms.find(r => r.id === roomId)!;
      return {
        roomId,
        bookingId,
        roomRate: room.roomType.basePrice,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        status: RoomBookingStatus.ASSIGNED,
        notes: dto.notes
      };
    });

    await tx.roomBooking.createMany({ data: roomBookings });

    // Update room status to OCCUPIED (or keep AVAILABLE until check-in)
    await tx.room.updateMany({
      where: { id: { in: dto.roomIds } },
      data: { status: RoomStatus.OCCUPIED }  // Or keep AVAILABLE until check-in
    });

    // Update booking status to CONFIRMED
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED }
    });

    return this.getBookingById(bookingId);
  });
}
```

### 4.4 Response

Returns the complete booking detail with assigned rooms.

---

## 5. PUT /bookings/:bookingId/check-in - Check In

### 5.1 Endpoint Specification

**Method:** `PUT`  
**Path:** `/bookings/:bookingId/check-in`  
**Auth:** Admin (to be implemented)

### 5.2 Request DTO

```typescript
class CheckInDto {
  @IsOptional()
  @IsDateString()
  actualCheckInTime?: string; // Default: now

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### 5.3 Business Logic

#### Validations:

1. Booking must exist and be in CONFIRMED status
2. Booking must have assigned rooms
3. Check-in date should be on or after the scheduled checkInDate (allow early with admin override)
4. Rooms should not already be checked in

#### Process Flow:

```typescript
async checkIn(bookingId: string, dto: CheckInDto): Promise<BookingDetailResponse> {
  const booking = await this.getBookingById(bookingId);

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new BadRequestException('Booking must be CONFIRMED to check in');
  }

  if (!booking.assignedRooms || booking.assignedRooms.length === 0) {
    throw new BadRequestException('No rooms assigned to this booking');
  }

  const checkInTime = dto.actualCheckInTime ? new Date(dto.actualCheckInTime) : new Date();

  return await this.prisma.$transaction(async (tx) => {
    // Update booking
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_IN,
        actualCheckIn: checkInTime,
        notes: dto.notes || booking.notes
      }
    });

    // Update room bookings
    await tx.roomBooking.updateMany({
      where: { bookingId },
      data: { status: RoomBookingStatus.CHECKED_IN }
    });

    // Update room status to OCCUPIED
    const roomIds = booking.assignedRooms.map(r => r.roomId);
    await tx.room.updateMany({
      where: { id: { in: roomIds } },
      data: { status: RoomStatus.OCCUPIED }
    });

    return this.getBookingById(bookingId);
  });
}
```

---

## 6. PUT /bookings/:bookingId/check-out - Check Out

### 6.1 Endpoint Specification

**Method:** `PUT`  
**Path:** `/bookings/:bookingId/check-out`  
**Auth:** Admin (to be implemented)

### 6.2 Request DTO

```typescript
class CheckOutDto {
  @IsOptional()
  @IsDateString()
  actualCheckOutTime?: string; // Default: now

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### 6.3 Business Logic

#### Validations:

1. Booking must exist and be in CHECKED_IN status
2. Check-out date should be on or after check-in date
3. Rooms should not already be checked out

#### Process Flow:

```typescript
async checkOut(bookingId: string, dto: CheckOutDto): Promise<BookingDetailResponse> {
  const booking = await this.getBookingById(bookingId);

  if (booking.status !== BookingStatus.CHECKED_IN) {
    throw new BadRequestException('Booking must be CHECKED_IN to check out');
  }

  const checkOutTime = dto.actualCheckOutTime ? new Date(dto.actualCheckOutTime) : new Date();

  return await this.prisma.$transaction(async (tx) => {
    // Update booking
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_OUT,
        actualCheckOut: checkOutTime,
        notes: dto.notes || booking.notes
      }
    });

    // Update room bookings
    await tx.roomBooking.updateMany({
      where: { bookingId },
      data: { status: RoomBookingStatus.CHECKED_OUT }
    });

    // Update room status to CLEANING (ready for next guest)
    const roomIds = booking.assignedRooms!.map(r => r.roomId);
    await tx.room.updateMany({
      where: { id: { in: roomIds } },
      data: { status: RoomStatus.CLEANING }
    });

    // Update guest stats
    await tx.guest.update({
      where: { id: booking.guest.id },
      data: {
        totalStays: { increment: 1 },
        totalSpent: { increment: booking.priceBreakdown.totalPrice }
      }
    });

    return this.getBookingById(bookingId);
  });
}
```

---

## 7. Impact on Room Type Availability

### 7.1 Current Availability Logic

The current `GET /room-types/availability` endpoint checks room availability by querying:

- Total rooms of each room type
- Rooms with bookings that overlap the requested dates

### 7.2 Integration with Room Assignment

When rooms are assigned to bookings:

1. `RoomBooking` records are created linking rooms to bookings
2. Room status is updated to `OCCUPIED`
3. The availability query already checks for overlapping `RoomBooking` records

**Current Query Logic (already works):**

```typescript
// In room-type.service.ts
const availableRooms = await this.prisma.room.findMany({
  where: {
    roomTypeId,
    status: 'AVAILABLE', // ← This will filter out OCCUPIED rooms
    NOT: {
      roomBookings: {
        some: {
          OR: [
            {
              AND: [
                { checkInDate: { lte: checkOut } },
                { checkOutDate: { gte: checkIn } },
              ],
            },
          ],
        },
      },
    },
  },
});
```

### 7.3 Required Updates

**Option 1: Keep Current Logic (Recommended)**

- Assigned rooms have status = OCCUPIED
- Availability query filters out OCCUPIED rooms
- No changes needed to availability logic

**Option 2: Only Check RoomBooking (Alternative)**

```typescript
// Update to only check RoomBooking status, ignore room.status
const availableRooms = await this.prisma.room.findMany({
  where: {
    roomTypeId,
    NOT: {
      roomBookings: {
        some: {
          status: {
            in: [RoomBookingStatus.ASSIGNED, RoomBookingStatus.CHECKED_IN],
          },
          OR: [
            {
              AND: [
                { checkInDate: { lte: checkOut } },
                { checkOutDate: { gte: checkIn } },
              ],
            },
          ],
        },
      },
    },
  },
});
```

**Recommendation:** Keep Option 1 (current implementation) as it's simpler and room status provides clear state.

---

## 8. Authentication & Authorization

### 8.1 Admin Middleware (To Be Implemented Later)

**Implementation Plan:**

```typescript
// src/auth/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    // TODO: Implement JWT verification
    // For now, bypass if token exists
    if (!token) {
      throw new UnauthorizedException('Admin token required');
    }

    // TODO: Verify token and check admin role
    // const payload = verifyJWT(token);
    // if (payload.role !== 'ADMIN') throw new ForbiddenException();

    return true; // Bypass for now
  }
}
```

### 8.2 Controller Usage

```typescript
@Controller('bookings')
export class BookingController {

  @Get()
  @UseGuards(AdminGuard)  // Add this decorator
  async findAllBookings() { ... }

  @Put(':bookingId/assign-rooms')
  @UseGuards(AdminGuard)
  async assignRooms() { ... }
}
```

---

## 9. Implementation Steps

### Phase 1: DTOs and Types

1. ✅ Create `AssignRoomsDto`
2. ✅ Create `CheckInDto`
3. ✅ Create `CheckOutDto`
4. ✅ Create `BookingListQuery` interface
5. ✅ Create `BookingListResponse` interface
6. ✅ Create `BookingDetailResponse` interface

### Phase 2: Service Layer

1. ✅ Implement `findAllBookings()` with pagination
2. ✅ Implement `getBookingById()` with full details
3. ✅ Implement `assignRooms()` with validation
4. ✅ Implement `checkIn()` with status updates
5. ✅ Implement `checkOut()` with room status updates
6. ✅ Add helper methods for validation

### Phase 3: Controller

1. ✅ Add `GET /bookings` endpoint
2. ✅ Add `GET /bookings/:id` endpoint
3. ✅ Add `PUT /bookings/:bookingId/assign-rooms` endpoint
4. ✅ Add `PUT /bookings/:bookingId/check-in` endpoint
5. ✅ Add `PUT /bookings/:bookingId/check-out` endpoint
6. ✅ Add Swagger documentation for all endpoints

### Phase 4: Authentication (Later)

1. 🔲 Create `AdminGuard`
2. 🔲 Implement JWT verification
3. 🔲 Add role-based authorization
4. 🔲 Apply guards to admin endpoints

### Phase 5: Testing

1. ✅ Test pagination with various filters
2. ✅ Test booking detail retrieval
3. ✅ Test room assignment with validations
4. ✅ Test check-in flow
5. ✅ Test check-out flow
6. ✅ Test availability updates after assignments

---

## 10. Database Schema Notes

### Current Schema (No Changes Needed)

**Booking Table:**

- Already has `actualCheckIn` and `actualCheckOut` fields
- Has `status` enum with all required states

**RoomBooking Table:**

- Already exists with proper relationships
- Has `status` field for ASSIGNED, CHECKED_IN, CHECKED_OUT

**Room Table:**

- Has `status` enum with AVAILABLE, OCCUPIED, MAINTENANCE, etc.

**Guest Table:**

- Has `totalStays` and `totalSpent` for stats tracking

✅ **No migrations needed!** The schema already supports all required functionality.

---

## 11. API Examples

### 11.1 List Bookings

```bash
GET /bookings?page=1&limit=20&status=PENDING&sortBy=createdAt&sortOrder=desc
```

### 11.2 Get Booking Detail

```bash
GET /bookings/cm123456789
```

### 11.3 Assign Rooms

```bash
PUT /bookings/cm123456789/assign-rooms
Content-Type: application/json

{
  "roomIds": ["room-uuid-1", "room-uuid-2"],
  "notes": "Assigned as per guest preference"
}
```

### 11.4 Check In

```bash
PUT /bookings/cm123456789/check-in
Content-Type: application/json

{
  "actualCheckInTime": "2025-01-15T15:30:00Z",
  "notes": "Guest arrived early"
}
```

### 11.5 Check Out

```bash
PUT /bookings/cm123456789/check-out
Content-Type: application/json

{
  "actualCheckOutTime": "2025-01-18T11:00:00Z",
  "notes": "Guest checked out on time"
}
```

---

## 12. Error Handling

### Common Error Codes

- `400 Bad Request` - Invalid input, validation errors
- `401 Unauthorized` - No admin token provided
- `403 Forbidden` - Not an admin user
- `404 Not Found` - Booking/room not found
- `409 Conflict` - Room already assigned, booking status conflict

### Example Error Response

```json
{
  "statusCode": 400,
  "message": "Booking must be CONFIRMED to check in",
  "error": "Bad Request"
}
```

---

## 13. Next Steps After Implementation

1. **Payment Integration**
   - Record payment on check-in
   - Support partial payments
   - Generate invoices

2. **Notifications**
   - Email/SMS on room assignment
   - Check-in reminders
   - Check-out confirmation

3. **Housekeeping Integration**
   - Automatically create cleaning tasks on check-out
   - Update room status after cleaning

4. **Reporting**
   - Booking statistics
   - Revenue reports
   - Occupancy reports

5. **Cancellation**
   - Implement cancellation flow
   - Handle refunds
   - Update room availability

---

## Summary

This plan provides a complete booking management system:

- ✅ List bookings with pagination and filters
- ✅ View detailed booking information
- ✅ Assign rooms with comprehensive validation
- ✅ Check-in process with status updates
- ✅ Check-out process with room cleanup

The system integrates seamlessly with existing room type availability checking and maintains data consistency through transactions.

**Ready to implement!** 🚀
