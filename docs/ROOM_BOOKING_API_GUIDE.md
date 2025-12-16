# Room-Booking Management API Documentation

## Overview

This API provides comprehensive room and booking management capabilities with many-to-many room-booking relationships, enabling single-room, multi-room, and group bookings with advanced availability checking and room assignment features.

## Key Changes from Direct Relationship

### Previous Model (Direct Relationship)

```
Booking ←→ Room (One-to-One via roomId field)
```

### New Model (Many-to-Many via Junction Table)

```
Booking ←→ RoomBooking ←→ Room (Many-to-Many)
```

### Benefits

- **Multi-room bookings**: Single booking can include multiple rooms
- **Flexible pricing**: Different rates per room within same booking
- **Enhanced availability**: Better conflict detection and room assignment
- **Group management**: Corporate and family bookings with room-specific notes
- **Detailed tracking**: Individual room check-in/out status

## Database Schema

### RoomBooking Junction Table

```prisma
model RoomBooking {
  id          String   @id @default(uuid())
  roomId      String
  bookingId   String
  roomRate    Float              // Individual room rate
  checkInDate DateTime           // Can differ from booking dates
  checkOutDate DateTime          // Can differ from booking dates
  assignedAt  DateTime @default(now())
  status      RoomBookingStatus  // ASSIGNED, CHECKED_IN, CHECKED_OUT, CANCELLED
  notes       String?            // Room-specific notes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@unique([roomId, bookingId])
  @@map("room_bookings")
}
```

### Updated Booking Model

```prisma
model Booking {
  id                 String           @id @default(cuid())
  bookingNumber      String           @unique
  guestId            String
  // Removed: roomId (now handled via RoomBooking)
  // Removed: roomRate (now in RoomBooking)
  checkInDate        DateTime
  checkOutDate       DateTime
  // ... other fields remain the same
  roomBookings       RoomBooking[]    // New relationship
}
```

## API Endpoints

### Booking Management

#### Create Booking

**POST** `/bookings`

Creates a new booking with room assignments.

**Request Body:**

```json
{
  "guestId": "uuid",
  "roomIds": ["room-uuid-1", "room-uuid-2"],
  "checkInDate": "2024-12-20T15:00:00.000Z",
  "checkOutDate": "2024-12-25T11:00:00.000Z",
  "numberOfGuests": 4,
  "numberOfChildren": 2,
  "specialRequests": "Connecting rooms preferred",
  "source": "Website",
  "notes": "Family vacation booking"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "bookingNumber": "BK20241220001",
    "guestId": "guest-uuid",
    "totalAmount": 5000.00,
    "taxAmount": 500.00,
    "serviceCharges": 350.00,
    "finalAmount": 5850.00,
    "status": "PENDING",
    "roomBookings": [...]
  },
  "message": "Booking created successfully"
}
```

#### Get All Bookings

**GET** `/bookings`

**Query Parameters:**

- `status`: BookingStatus filter
- `guestId`: Filter by guest
- `checkInDate`: Filter by check-in date
- `checkOutDate`: Filter by check-out date
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

#### Get Booking by ID

**GET** `/bookings/:id`

Returns detailed booking with all room assignments, guest info, services, and payments.

#### Update Booking

**PUT** `/bookings/:id`

Updates booking details. Date changes trigger availability revalidation.

#### Check-In

**POST** `/bookings/:id/check-in`

Marks booking as checked-in and updates all assigned rooms to OCCUPIED status.

#### Check-Out

**POST** `/bookings/:id/check-out`

Marks booking as checked-out and updates rooms to CLEANING status.

#### Cancel Booking

**PUT** `/bookings/:id/cancel`

**Request Body:**

```json
{
  "reason": "Guest cancellation due to flight delay"
}
```

### Room Assignment Management

#### Assign Room to Booking

**POST** `/bookings/rooms/assign`

**Request Body:**

```json
{
  "roomId": "room-uuid",
  "bookingId": "booking-uuid",
  "roomRate": 2500.0,
  "checkInDate": "2024-12-20T15:00:00.000Z", // Optional, defaults to booking dates
  "checkOutDate": "2024-12-25T11:00:00.000Z", // Optional
  "notes": "Guest requested this specific room"
}
```

#### Remove Room from Booking

**DELETE** `/bookings/rooms/:roomId/booking/:bookingId`

Removes room assignment from booking. Automatically updates room status if no other active bookings.

#### Get Bookings for Room

**GET** `/bookings/rooms/:roomId`

Returns all bookings for a specific room with optional status filtering.

#### Get Bookings for Guest

**GET** `/bookings/guest/:guestId`

Returns all bookings for a specific guest with pagination.

### Enhanced Room Availability

#### Get Available Rooms

**GET** `/rooms/available`

Enhanced with date-based availability checking.

**Query Parameters:**

- `checkInDate`: ISO date string (required for availability check)
- `checkOutDate`: ISO date string (required for availability check)
- `roomTypeId`: Filter by room type
- `floor`: Filter by floor
- `capacity`: Minimum capacity required

**Example:**

```
GET /rooms/available?checkInDate=2024-12-20T15:00:00.000Z&checkOutDate=2024-12-25T11:00:00.000Z&floor=2
```

#### Check Room Availability

**GET** `/rooms/:id/availability`

**Query Parameters:**

- `startDate`: Start date (ISO string)
- `endDate`: End date (ISO string)

**Response:**

```json
{
  "room": {
    "id": "room-uuid",
    "roomNumber": "201",
    "status": "AVAILABLE",
    "roomType": {...}
  },
  "isAvailable": false,
  "conflictingBookings": [
    {
      "id": "booking-uuid",
      "bookingNumber": "BK20241218001",
      "guestName": "John Doe",
      "checkInDate": "2024-12-20T15:00:00.000Z",
      "checkOutDate": "2024-12-23T11:00:00.000Z",
      "status": "ASSIGNED"
    }
  ]
}
```

### Reporting and Analytics

#### Occupancy Report

**GET** `/rooms/reports/occupancy`

**Query Parameters:**

- `startDate`: Report start date (optional, defaults to today)
- `endDate`: Report end date (optional, defaults to 30 days from start)

**Response:**

```json
{
  "totalRooms": 30,
  "occupiedRooms": 18,
  "availableRooms": 12,
  "occupancyRate": 60.00,
  "totalRevenue": 45000.00,
  "averageDailyRate": 2500.00,
  "period": {
    "startDate": "2024-12-16T00:00:00.000Z",
    "endDate": "2025-01-15T00:00:00.000Z"
  },
  "roomDetails": [...]
}
```

## Implementation Guide for Admins

### 1. Creating Single-Room Bookings

Traditional hotel booking with one room per booking.

```javascript
// Create single-room booking
const response = await fetch('/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guestId: 'guest-uuid',
    roomIds: ['room-101-uuid'], // Single room
    checkInDate: '2024-12-20T15:00:00.000Z',
    checkOutDate: '2024-12-22T11:00:00.000Z',
    numberOfGuests: 2,
    specialRequests: 'Late check-out requested',
  }),
});
```

### 2. Creating Multi-Room Family Bookings

Family staying in multiple connected rooms.

```javascript
// Create family multi-room booking
const familyBooking = await fetch('/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guestId: 'family-guest-uuid',
    roomIds: ['room-201-uuid', 'room-202-uuid', 'room-203-uuid'], // 3 rooms
    checkInDate: '2024-12-20T15:00:00.000Z',
    checkOutDate: '2024-12-27T11:00:00.000Z',
    numberOfGuests: 6,
    numberOfChildren: 3,
    specialRequests: 'Connecting rooms, baby cot in parents room',
  }),
});
```

### 3. Creating Corporate Group Bookings

Business group with multiple rooms and special rates.

```javascript
// Create corporate booking first
const corporateBooking = await fetch('/bookings', {
  method: 'POST',
  body: JSON.stringify({
    guestId: 'corporate-contact-uuid',
    roomIds: [], // Will assign rooms individually
    checkInDate: '2024-12-20T15:00:00.000Z',
    checkOutDate: '2024-12-23T11:00:00.000Z',
    numberOfGuests: 5,
    source: 'Agent',
    notes: 'TechCorp annual meeting',
  }),
});

// Assign rooms with corporate rates
const corporateRooms = [
  '301-uuid',
  '302-uuid',
  '303-uuid',
  '304-uuid',
  '305-uuid',
];
for (const roomId of corporateRooms) {
  await fetch('/bookings/rooms/assign', {
    method: 'POST',
    body: JSON.stringify({
      roomId,
      bookingId: corporateBooking.data.id,
      roomRate: 2125.0, // 15% corporate discount
      notes: `Corporate guest - discounted rate`,
    }),
  });
}
```

### 4. Managing Room Assignments

#### Adding Room to Existing Booking

```javascript
// Add additional room to existing booking
await fetch('/bookings/rooms/assign', {
  method: 'POST',
  body: JSON.stringify({
    roomId: 'additional-room-uuid',
    bookingId: 'existing-booking-uuid',
    roomRate: 2500.0,
    notes: 'Guest requested upgrade',
  }),
});
```

#### Removing Room from Booking

```javascript
// Remove room from booking
await fetch('/bookings/rooms/room-uuid/booking/booking-uuid', {
  method: 'DELETE',
});
```

### 5. Checking Availability Before Booking

```javascript
// Check room availability for specific dates
const availability = await fetch(
  `/rooms/available?checkInDate=2024-12-20T15:00:00.000Z&checkOutDate=2024-12-25T11:00:00.000Z&floor=2`,
);

// Check specific room availability
const roomAvailability = await fetch(
  `/rooms/room-uuid/availability?startDate=2024-12-20T15:00:00.000Z&endDate=2024-12-25T11:00:00.000Z`,
);
```

### 6. Handling Check-in/Check-out Process

```javascript
// Check-in booking (updates all rooms to OCCUPIED)
await fetch(`/bookings/booking-uuid/check-in`, { method: 'POST' });

// Check-out booking (updates all rooms to CLEANING)
await fetch(`/bookings/booking-uuid/check-out`, { method: 'POST' });

// Cancel booking (updates all rooms to AVAILABLE)
await fetch(`/bookings/booking-uuid/cancel`, {
  method: 'PUT',
  body: JSON.stringify({
    reason: 'Guest requested cancellation',
  }),
});
```

### 7. Room Status Management

The system automatically manages room status based on bookings:

- **ASSIGNED**: Room assigned to future booking
- **OCCUPIED**: Guest currently checked in
- **CLEANING**: Guest checked out, room needs cleaning
- **MAINTENANCE**: Room under maintenance
- **AVAILABLE**: Room ready for new booking

### 8. Generating Reports

```javascript
// Get occupancy report for specific period
const occupancyReport = await fetch(
  `/rooms/reports/occupancy?startDate=2024-12-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.000Z`,
);

// Get bookings for specific room
const roomBookings = await fetch(`/bookings/rooms/room-uuid?status=CONFIRMED`);

// Get guest booking history
const guestBookings = await fetch(`/bookings/guest/guest-uuid?page=1&limit=10`);
```

## Best Practices for Admin Implementation

### 1. Always Check Availability First

Before creating bookings, especially multi-room bookings, check availability for all required rooms.

### 2. Handle Partial Failures

When assigning multiple rooms, handle cases where some rooms might not be available.

### 3. Use Transaction-like Approach

For multi-room bookings, if any room assignment fails, consider canceling the entire booking or allowing partial assignment with guest approval.

### 4. Monitor Room Status

Regularly check room status and update based on housekeeping completion.

### 5. Validate Date Ranges

Always validate that check-out date is after check-in date and dates are in the future for new bookings.

### 6. Provide Detailed Error Messages

When room assignment fails, provide clear information about conflicts and alternative suggestions.

## Error Handling

### Common Error Scenarios

1. **Room Not Available**: Room already booked for overlapping dates
2. **Invalid Date Range**: Check-in after check-out or past dates
3. **Room Not Found**: Invalid room ID provided
4. **Booking Not Found**: Invalid booking ID provided
5. **Guest Not Found**: Invalid guest ID provided
6. **Already Assigned**: Room already assigned to the same booking

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_AVAILABLE",
    "message": "Room 201 is not available for the selected dates",
    "details": {
      "roomNumber": "201",
      "conflictingBookings": [
        {
          "bookingNumber": "BK20241218001",
          "checkIn": "2024-12-20T15:00:00.000Z",
          "checkOut": "2024-12-23T11:00:00.000Z"
        }
      ]
    }
  }
}
```

This API provides a complete solution for modern hotel room and booking management with support for complex booking scenarios, detailed availability checking, and comprehensive admin controls.
