# Room Type Availability API - Feature Planning

## Overview

Build an API endpoint that accepts check-in and check-out dates and returns available room types with the count of available rooms for each type during the requested period.

---

## API Specification

### Endpoint

```
GET /room-types/availability
```

### Query Parameters

| Parameter    | Type                | Required | Description                                               |
| ------------ | ------------------- | -------- | --------------------------------------------------------- |
| checkInDate  | DateTime (ISO 8601) | Yes      | Desired check-in date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) |
| checkOutDate | DateTime (ISO 8601) | Yes      | Desired check-out date (YYYY-MM-DDTHH:mm:ss)              |

### Request Example

```
GET /room-types/availability?checkInDate=2025-12-20&checkOutDate=2025-12-25
```

### Response Schema

```typescript
{
  checkInDate: string;          // Query check-in date
  checkOutDate: string;         // Query check-out date
  totalAvailableRooms: number;  // Sum of all available rooms
  availableRoomTypes: [
    {
      roomType: {
        id: string;
        code: string;
        name: string;
        description: string;
        basePrice: number;
        maxOccupancy: number;
        bedType: string;
        roomSize: number;
        amenities: string[];
        images: [...];
        thumbnailUrl: string;
      },
      totalRooms: number;          // Total rooms of this type
      availableRooms: number;      // Available rooms during period
      occupiedRooms: number;       // Occupied rooms during period
      availabilityPercentage: number; // (availableRooms / totalRooms) * 100
    }
  ]
}
```

### Response Example

```json
{
  "checkInDate": "2025-12-20T00:00:00.000Z",
  "checkOutDate": "2025-12-25T00:00:00.000Z",
  "totalAvailableRooms": 35,
  "availableRoomTypes": [
    {
      "roomType": {
        "id": "rt001",
        "code": "DELUXE",
        "name": "Deluxe Room",
        "description": "Spacious room with modern amenities",
        "basePrice": 1500,
        "maxOccupancy": 2,
        "bedType": "KING",
        "roomSize": 35,
        "amenities": ["WiFi", "TV", "Mini Bar"],
        "thumbnailUrl": "https://..."
      },
      "totalRooms": 10,
      "availableRooms": 7,
      "occupiedRooms": 3,
      "availabilityPercentage": 70
    },
    {
      "roomType": {
        "id": "rt002",
        "code": "SUITE",
        "name": "Executive Suite",
        "basePrice": 3000,
        "maxOccupancy": 4,
        "bedType": "KING",
        "roomSize": 60
      },
      "totalRooms": 5,
      "availableRooms": 5,
      "occupiedRooms": 0,
      "availabilityPercentage": 100
    }
  ]
}
```

---

## Database Query Logic

### Date Overlap Detection

A room is **NOT available** if there exists a booking where the dates overlap with the query period.

**Overlap Condition:**

```
(roomBooking.checkInDate < queryCheckOutDate)
AND
(roomBooking.checkOutDate > queryCheckInDate)
```

**Visual Example:**

```
Query Period:        [====checkIn========checkOut====]
Overlapping Booking:     [===booking===]           ❌ Not Available
Overlapping Booking: [===booking===]               ❌ Not Available
Overlapping Booking:              [===booking===]   ❌ Not Available
Non-overlapping:                            [==]    ✅ Available
Non-overlapping:  [==]                              ✅ Available
```

### Prisma Query Strategy

#### Step 1: Find All Occupied Rooms

```typescript
// Find all room IDs that have overlapping bookings
const occupiedRooms = await prisma.roomBooking.findMany({
  where: {
    AND: [
      { checkInDate: { lt: queryCheckOutDate } },
      { checkOutDate: { gt: queryCheckInDate } },
      {
        status: {
          in: ['ASSIGNED', 'CHECKED_IN'], // Exclude cancelled bookings
        },
      },
    ],
  },
  select: {
    roomId: true,
  },
});

const occupiedRoomIds = occupiedRooms.map((rb) => rb.roomId);
```

#### Step 2: Query All Room Types with Availability

```typescript
const roomTypes = await prisma.roomType.findMany({
  where: {
    isActive: true,
    rooms: {
      some: {}, // Has at least one room
    },
  },
  include: {
    images: {
      where: { isThumbnail: true },
      take: 1,
    },
    rooms: {
      where: {
        status: 'AVAILABLE', // Only count available status rooms
      },
      select: {
        id: true,
        roomTypeId: true,
      },
    },
  },
});
```

#### Step 3: Calculate Availability Per Room Type

```typescript
const availableRoomTypes = roomTypes.map((roomType) => {
  const totalRooms = roomType.rooms.length;
  const occupiedCount = roomType.rooms.filter((room) =>
    occupiedRoomIds.includes(room.id),
  ).length;
  const availableRooms = totalRooms - occupiedCount;

  return {
    roomType: {
      id: roomType.id,
      code: roomType.code,
      name: roomType.name,
      description: roomType.description,
      basePrice: roomType.basePrice,
      maxOccupancy: roomType.maxOccupancy,
      bedType: roomType.bedType,
      roomSize: roomType.roomSize,
      amenities: roomType.amenities,
      images: roomType.images,
      thumbnailUrl: roomType.images[0]?.url || null,
    },
    totalRooms,
    availableRooms,
    occupiedRooms: occupiedCount,
    availabilityPercentage:
      totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0,
  };
});
```

---

## Implementation Plan

### Phase 1: DTO Creation

**Location:** `src/room-type/dto/`

1. Create `check-availability.dto.ts`:

```typescript
import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Check-in date',
    example: '2025-12-20T14:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({
    description: 'Check-out date',
    example: '2025-12-25T12:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;
}
```

2. Create response types in `src/room-type/types/availability-response.type.ts`:

```typescript
export interface RoomTypeAvailability {
  roomType: {
    id: string;
    code: string;
    name: string;
    description: string;
    basePrice: number;
    maxOccupancy: number;
    bedType: string;
    roomSize: number;
    amenities: string[];
    images: any[];
    thumbnailUrl: string | null;
  };
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  availabilityPercentage: number;
}

export interface AvailabilityResponse {
  checkInDate: string;
  checkOutDate: string;
  totalAvailableRooms: number;
  availableRoomTypes: RoomTypeAvailability[];
}
```

### Phase 2: Service Implementation

**Location:** `src/room-type/room-type.service.ts`

Add new method:

```typescript
async getAvailableRoomTypes(
  checkInDate: Date,
  checkOutDate: Date
): Promise<AvailabilityResponse>
```

**Implementation Steps:**

1. Validate dates (checkOut > checkIn, not in the past)
2. Query occupied rooms using date overlap logic
3. Query all active room types with rooms
4. Calculate availability metrics per room type
5. Filter out room types with 0 available rooms (optional)
6. Sort by availability or price
7. Return formatted response

### Phase 3: Controller Implementation

**Location:** `src/room-type/room-type.controller.ts`

Add new endpoint:

```typescript
@Get('availability')
@ApiOperation({
  summary: 'Check room type availability',
  description: 'Returns available room types with slot counts for specified dates'
})
@ApiQuery({ name: 'checkInDate', type: String, description: 'Check-in date (ISO 8601)' })
@ApiQuery({ name: 'checkOutDate', type: String, description: 'Check-out date (ISO 8601)' })
@ApiResponse({
  status: 200,
  description: 'Room type availability retrieved successfully'
})
@ApiResponse({
  status: 400,
  description: 'Invalid date range'
})
async checkAvailability(
  @Query() query: CheckAvailabilityDto
): Promise<AvailabilityResponse>
```

### Phase 4: Validation & Error Handling

- Validate checkOutDate > checkInDate
- Validate dates are not in the past
- Handle invalid date formats
- Return appropriate error messages
- Add custom validation decorator if needed

### Phase 5: Testing

- Unit tests for service method
- E2E tests for endpoint
- Test edge cases (see below)

### Phase 6: Documentation

- Update Swagger documentation
- Add usage examples
- Document query performance considerations

---

## TODO List

### ✅ Planning Phase

- [x] Define API specification
- [x] Design database query logic
- [x] Create implementation plan
- [x] Document edge cases

### 🔲 Implementation Phase

#### 1. DTO & Types

- [ ] Create `src/room-type/dto/check-availability.dto.ts`
- [ ] Create `src/room-type/types/availability-response.type.ts`
- [ ] Add validation decorators
- [ ] Add Swagger decorators

#### 2. Service Layer

- [ ] Add `getAvailableRoomTypes()` method to `RoomTypeService`
- [ ] Implement date validation logic
- [ ] Implement occupied rooms query
- [ ] Implement room types with availability query
- [ ] Implement availability calculation logic
- [ ] Add error handling
- [ ] Add logging for debugging

#### 3. Controller Layer

- [ ] Add `checkAvailability()` endpoint to `RoomTypeController`
- [ ] Add query parameter validation
- [ ] Add Swagger documentation
- [ ] Add proper HTTP response codes
- [ ] Add request/response examples

#### 4. Testing

- [ ] Write unit tests for `getAvailableRoomTypes()`
- [ ] Test date overlap logic
- [ ] Test edge cases (same-day, long-stay, etc.)
- [ ] Write E2E test for endpoint
- [ ] Test with actual seed data
- [ ] Load test for performance

#### 5. Documentation

- [ ] Update API documentation
- [ ] Add usage examples in README
- [ ] Document response format
- [ ] Document error codes

#### 6. Optional Enhancements

- [ ] Add caching for frequently queried dates
- [ ] Add filters (price range, bed type, occupancy)
- [ ] Add sorting options (price, availability)
- [ ] Add option to include/exclude fully booked types
- [ ] Add minimum stay validation

---

## Edge Cases to Consider

### 1. Date Validation

- ❌ Check-out date before check-in date
- ❌ Check-in date in the past
- ❌ Invalid date formats
- ⚠️ Same-day check-in and check-out
- ⚠️ Very long stay periods (>30 days)

### 2. Room Status

- Only include rooms with status: `AVAILABLE`
- Exclude rooms with status: `MAINTENANCE`, `OUT_OF_ORDER`, `CLEANING`
- Consider what to do with `OCCUPIED` status rooms

### 3. Booking Status

- Include bookings with status: `ASSIGNED`, `CHECKED_IN`
- Exclude bookings with status: `CANCELLED`, `NO_SHOW`
- Consider `PENDING` bookings (include or exclude?)

### 4. Room Type Availability

- What to return if no rooms are available?
  - Option A: Empty array
  - Option B: All room types with availableRooms: 0
  - **Recommended:** Option A (only show available types)

### 5. Check-in/Check-out Time Logic

- Standard check-in: 14:00 (2 PM)
- Standard check-out: 12:00 (noon)
- Same-day turnover: Room available if booking checks out at 12:00 and new booking checks in at 14:00
- **Implementation:** Use date comparison without time if input is date-only

### 6. Concurrent Bookings

- Handle race conditions when multiple users book simultaneously
- Consider implementing optimistic locking or transactions
- Add real-time availability checks before confirming booking

---

## Performance Considerations

### Query Optimization

1. **Indexes:** Already in place on `roomBookings` table:
   - `@@index([checkInDate])`
   - `@@index([checkOutDate])`
   - `@@index([roomId])`

2. **Query Strategy:**
   - Two separate queries more efficient than complex joins
   - First query gets occupied room IDs (fast with indexes)
   - Second query gets room types (includes only needed relations)

3. **Caching Opportunities:**
   - Cache room type details (changes infrequently)
   - Cache availability for popular date ranges
   - Invalidate cache on new bookings

### Scalability

- Current approach scales to ~1000s of rooms
- For larger hotels (>1000 rooms), consider:
  - Database view for availability
  - Redis cache for real-time availability
  - Separate availability service

---

## Testing Scenarios

### Unit Tests

1. Date validation with various formats
2. Date overlap logic with different booking patterns
3. Availability calculation with edge cases
4. Error handling for invalid inputs

### E2E Tests

1. Query with no overlapping bookings (all rooms available)
2. Query with partial bookings (some rooms available)
3. Query with fully booked period (no rooms available)
4. Query with cancelled bookings (should not affect availability)
5. Query with same-day check-in/check-out
6. Query with very long date range (performance test)

### Data Scenarios

```sql
-- Scenario 1: No bookings (all available)
Query: 2025-12-20 to 2025-12-25
Expected: All room types show full availability

-- Scenario 2: Partial overlap
Existing booking: 2025-12-22 to 2025-12-24
Query: 2025-12-20 to 2025-12-25
Expected: Rooms in that booking are unavailable

-- Scenario 3: Exact match
Existing booking: 2025-12-20 to 2025-12-25
Query: 2025-12-20 to 2025-12-25
Expected: Those rooms unavailable

-- Scenario 4: Before existing booking
Existing booking: 2025-12-26 to 2025-12-30
Query: 2025-12-20 to 2025-12-25
Expected: All rooms available (no overlap)

-- Scenario 5: After existing booking
Existing booking: 2025-12-15 to 2025-12-19
Query: 2025-12-20 to 2025-12-25
Expected: All rooms available (no overlap)
```

---

## API Usage Examples

### Example 1: Basic Availability Check

```bash
curl -X GET "http://localhost:3001/room-types/availability?checkInDate=2025-12-20&checkOutDate=2025-12-25"
```

### Example 2: Frontend Integration

```typescript
// React/Next.js example
const checkAvailability = async (checkIn: Date, checkOut: Date) => {
  const params = new URLSearchParams({
    checkInDate: checkIn.toISOString(),
    checkOutDate: checkOut.toISOString(),
  });

  const response = await fetch(`${API_URL}/room-types/availability?${params}`);

  if (!response.ok) {
    throw new Error('Failed to check availability');
  }

  const data = await response.json();
  return data.availableRoomTypes;
};
```

### Example 3: Booking Flow Integration

```typescript
// Step 1: Check availability
const availability = await roomTypeService.getAvailableRoomTypes(
  new Date('2025-12-20'),
  new Date('2025-12-25'),
);

// Step 2: User selects room type
const selectedRoomType = availability.availableRoomTypes.find(
  (rt) => rt.roomType.code === 'DELUXE',
);

// Step 3: Get specific available rooms for that type
const availableRoomIds = await roomService.getAvailableRoomsByType(
  selectedRoomType.roomType.id,
  checkInDate,
  checkOutDate,
);

// Step 4: Create booking with selected room
await bookingService.createBooking({
  guestId: guestId,
  checkInDate: checkInDate,
  checkOutDate: checkOutDate,
  rooms: [{ roomId: availableRoomIds[0] }],
});
```

---

## Integration with Existing System

### Related Endpoints

This new endpoint complements existing endpoints:

1. **GET /rooms/available** - Returns individual available rooms
2. **GET /room-types** - Returns all room types (without availability)
3. **POST /bookings** - Creates booking (should validate availability)
4. **GET /bookings/reports/occupancy** - Shows occupancy reports

### Booking Flow Enhancement

```
User searches dates
    ↓
GET /room-types/availability  ← NEW ENDPOINT
    ↓
Display available room types with counts
    ↓
User selects room type
    ↓
GET /rooms/available?roomTypeId=xxx&checkInDate=...
    ↓
System assigns specific room
    ↓
POST /bookings (with room assignment)
```

---

## Security Considerations

1. **Rate Limiting:** Prevent abuse of availability checking
2. **Input Validation:** Strict date format and range validation
3. **SQL Injection:** Use Prisma parameterized queries (already safe)
4. **Data Exposure:** Don't expose internal IDs or sensitive pricing logic

---

## Future Enhancements

1. **Real-time Updates:** WebSocket for live availability updates
2. **Predictive Analytics:** ML model for demand forecasting
3. **Dynamic Pricing:** Adjust prices based on availability
4. **Booking Holds:** Temporary reservation during checkout process
5. **Multi-property Support:** Check availability across multiple hotels
6. **Package Deals:** Availability for room + service bundles

---

## Implementation Priority

### Must Have (MVP)

1. ✅ Basic availability query
2. ✅ Date overlap logic
3. ✅ Room type grouping with counts
4. ⬜ Input validation
5. ⬜ Swagger documentation

### Should Have (Phase 2)

1. ⬜ Filter by price/occupancy
2. ⬜ Sorting options
3. ⬜ Include room type images
4. ⬜ Performance optimization

### Nice to Have (Future)

1. ⬜ Caching layer
2. ⬜ Real-time updates
3. ⬜ Booking holds
4. ⬜ Dynamic pricing

---

## Questions to Resolve

1. Should we include room types with 0 availability in the response?
   - **Recommendation:** No, only return available types
2. Should PENDING bookings be considered as occupying rooms?
   - **Recommendation:** Yes, include PENDING to prevent double-booking
3. What timezone should we use for date comparisons?
   - **Recommendation:** Store in UTC, let frontend handle timezone display
4. Should we validate maximum booking duration?
   - **Recommendation:** Yes, add configurable max stay (e.g., 30 days)

5. How to handle same-day turnover?
   - **Recommendation:** Room available if checkout is before checkin (use time)

---

## Estimated Effort

- **DTO & Types:** 1 hour
- **Service Implementation:** 3-4 hours
- **Controller & Swagger:** 1-2 hours
- **Unit Tests:** 2-3 hours
- **E2E Tests:** 1-2 hours
- **Documentation:** 1 hour
- **Total:** ~10-14 hours

---

## Dependencies

### Packages (Already Installed)

- `@nestjs/common`
- `@nestjs/swagger`
- `class-validator`
- `class-transformer`
- `@prisma/client` (custom path)

### Database Schema (Already Implemented)

- ✅ `RoomBooking` table with date indexes
- ✅ `RoomType` table with room relations
- ✅ `Room` table with status field
- ✅ `Booking` table with status field

---

## Success Criteria

1. ✅ API returns correct availability counts for any date range
2. ✅ Date overlap logic correctly identifies occupied rooms
3. ✅ Response time < 500ms for typical queries
4. ✅ Handles all edge cases without errors
5. ✅ Comprehensive test coverage (>80%)
6. ✅ Complete Swagger documentation
7. ✅ No SQL injection vulnerabilities
8. ✅ Proper error handling and validation

---

## Rollout Plan

### Phase 1: Development (Days 1-2)

- Implement DTO, service, controller
- Write unit tests
- Local testing

### Phase 2: Testing (Day 3)

- E2E tests
- Manual testing with seed data
- Performance testing

### Phase 3: Documentation (Day 3)

- Swagger docs
- README updates
- Usage examples

### Phase 4: Review (Day 4)

- Code review
- Security review
- Final testing

### Phase 5: Deployment (Day 5)

- Deploy to staging
- Integration testing
- Deploy to production
- Monitor metrics

---

# Individual Room Type Availability Check API

## Overview

Build an API endpoint that checks availability for a **specific room type** by ID, returning detailed information about that room type along with the count of available rooms during the requested period.

**Key Difference from `/room-types/availability`:**

- The bulk endpoint returns **all** room types with availability
- This endpoint returns **one specific** room type's availability details

---

## API Specification

### Endpoint

```
GET /room-types/availability/:roomTypeId
```

### Path Parameters

| Parameter  | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| roomTypeId | String | Yes      | UUID of the room type to check |

### Query Parameters

| Parameter    | Type                | Required | Description                                               |
| ------------ | ------------------- | -------- | --------------------------------------------------------- |
| checkInDate  | DateTime (ISO 8601) | Yes      | Desired check-in date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) |
| checkOutDate | DateTime (ISO 8601) | Yes      | Desired check-out date (YYYY-MM-DDTHH:mm:ss)              |

### Request Example

```
GET /room-types/availability/cm4u1234abcd5678efgh9012?checkInDate=2025-12-20&checkOutDate=2025-12-25
```

### Response Schema

```typescript
{
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: {
    id: string;
    code: string;
    name: {
      en: string;
      th: string;
    };
    description: {
      en?: string;
      th?: string;
    };
    basePrice: number;
    capacity: number;
    bedType: string;
    amenities: string[];
    hasPoolView: boolean;
    thumbnailUrl: string | null;
    roomImages: Array<{
      id: string;
      url: string;
      alt?: string;
      caption?: any;
      isPrimary: boolean;
      sortOrder: number;
    }>;
  };
  availability: {
    totalRooms: number;           // Total rooms of this type in hotel
    availableRooms: number;       // Available during period
    occupiedRooms: number;        // Occupied during period
    availabilityPercentage: number;
    isAvailable: boolean;         // true if availableRooms > 0
  };
  availableRoomList?: Array<{   // Optional: list of specific rooms available
    roomId: string;
    roomNumber: string;
    floor: number;
    size?: number;
    accessible: boolean;
  }>;
}
```

### Response Example

```json
{
  "roomTypeId": "cm4u1234abcd5678efgh9012",
  "checkInDate": "2025-12-20T00:00:00.000Z",
  "checkOutDate": "2025-12-25T00:00:00.000Z",
  "roomType": {
    "id": "cm4u1234abcd5678efgh9012",
    "code": "DELUXE",
    "name": {
      "en": "Deluxe Room",
      "th": "ห้องดีลักซ์"
    },
    "description": {
      "en": "Spacious room with modern amenities",
      "th": "ห้องกว้างขวางพร้อมสิ่งอำนวยความสะดวกทันสมัย"
    },
    "basePrice": 1500,
    "capacity": 2,
    "bedType": "KING",
    "amenities": ["WIFI", "AIR_CONDITIONING", "TV", "MINIBAR"],
    "hasPoolView": false,
    "thumbnailUrl": "https://minio.example.com/room-types/deluxe.jpg",
    "roomImages": [
      {
        "id": "img001",
        "url": "https://minio.example.com/room-images/deluxe-1.jpg",
        "isPrimary": true,
        "sortOrder": 1
      }
    ]
  },
  "availability": {
    "totalRooms": 10,
    "availableRooms": 7,
    "occupiedRooms": 3,
    "availabilityPercentage": 70,
    "isAvailable": true
  },
  "availableRoomList": [
    {
      "roomId": "room001",
      "roomNumber": "101",
      "floor": 1,
      "size": 35,
      "accessible": false
    },
    {
      "roomId": "room002",
      "roomNumber": "102",
      "floor": 1,
      "size": 35,
      "accessible": true
    }
    // ... 5 more rooms
  ]
}
```

### Error Responses

#### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Room type with ID 'cm4u1234abcd5678efgh9012' not found",
  "error": "Not Found"
}
```

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Check-out date must be after check-in date",
  "error": "Bad Request"
}
```

---

## Database Query Logic

### Step 1: Verify Room Type Exists

```typescript
const roomType = await prisma.roomType.findUnique({
  where: { id: roomTypeId },
  include: {
    roomImages: {
      orderBy: { sortOrder: 'asc' },
    },
  },
});

if (!roomType) {
  throw new NotFoundException(`Room type with ID '${roomTypeId}' not found`);
}
```

### Step 2: Find Occupied Rooms for This Type

```typescript
// Get all rooms for this room type
const roomsForType = await prisma.room.findMany({
  where: {
    roomTypeId: roomTypeId,
    status: 'AVAILABLE', // Only consider bookable rooms
    isActive: true,
  },
  select: {
    id: true,
    roomNumber: true,
    floor: true,
    size: true,
    accessible: true,
  },
});

const roomIds = roomsForType.map((r) => r.id);

// Find which rooms are occupied during the period
const occupiedBookings = await prisma.roomBooking.findMany({
  where: {
    roomId: { in: roomIds },
    AND: [
      { checkInDate: { lt: checkOutDate } },
      { checkOutDate: { gt: checkInDate } },
      { status: { in: ['ASSIGNED', 'CHECKED_IN'] } },
    ],
  },
  select: {
    roomId: true,
  },
});

const occupiedRoomIds = occupiedBookings.map((rb) => rb.roomId);
```

### Step 3: Calculate Availability

```typescript
const totalRooms = roomsForType.length;
const occupiedRooms = occupiedRoomIds.length;
const availableRooms = totalRooms - occupiedRooms;
const availabilityPercentage =
  totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0;

const availableRoomList = roomsForType.filter(
  (room) => !occupiedRoomIds.includes(room.id),
);
```

---

## Implementation Plan

### Phase 1: Type Definition

**Location:** `src/room-type/types/`

Create `individual-availability-response.type.ts`:

```typescript
export interface IndividualRoomTypeAvailability {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: {
    id: string;
    code: string;
    name: any; // JsonValue
    description: any; // JsonValue
    basePrice: number;
    capacity: number;
    bedType: string;
    amenities: string[];
    hasPoolView: boolean;
    thumbnailUrl: string | null;
    roomImages: Array<{
      id: string;
      url: string;
      alt?: string;
      caption?: any;
      isPrimary: boolean;
      sortOrder: number;
    }>;
  };
  availability: {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    availabilityPercentage: number;
    isAvailable: boolean;
  };
  availableRoomList?: Array<{
    roomId: string;
    roomNumber: string;
    floor: number;
    size?: number;
    accessible: boolean;
  }>;
}
```

### Phase 2: Service Implementation

**Location:** `src/room-type/room-type.service.ts`

Add new method:

```typescript
async getIndividualRoomTypeAvailability(
  roomTypeId: string,
  checkInDate: Date,
  checkOutDate: Date,
  includeRoomList: boolean = true
): Promise<IndividualRoomTypeAvailability>
```

**Implementation Steps:**

1. Validate dates (same as bulk endpoint)
2. Fetch room type with images
3. Throw NotFoundException if room type doesn't exist
4. Query all rooms for this room type (status: AVAILABLE, isActive: true)
5. Query occupied rooms during the period
6. Calculate availability metrics
7. Optionally include list of specific available rooms
8. Return formatted response

**Code Structure:**

```typescript
async getIndividualRoomTypeAvailability(
  roomTypeId: string,
  checkInDate: Date,
  checkOutDate: Date,
  includeRoomList: boolean = true,
): Promise<IndividualRoomTypeAvailability> {
  // Step 1: Validate dates
  if (checkOutDate <= checkInDate) {
    throw new BadRequestException('Check-out date must be after check-in date');
  }

  // const now = new Date();
  // if (checkInDate < now) {
  //   throw new BadRequestException('Check-in date cannot be in the past');
  // }

  // Step 2: Fetch room type
  const roomType = await this.prisma.roomType.findUnique({
    where: {
      id: roomTypeId,
      isActive: true // Only active room types
    },
    include: {
      roomImages: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!roomType) {
    throw new NotFoundException(
      `Room type with ID '${roomTypeId}' not found`,
    );
  }

  // Step 3: Get all rooms for this room type
  const roomsForType = await this.prisma.room.findMany({
    where: {
      roomTypeId: roomTypeId,
      status: 'AVAILABLE',
      isActive: true,
    },
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      size: true,
      accessible: true,
    },
  });

  const roomIds = roomsForType.map((r) => r.id);

  // Step 4: Find occupied rooms during the period
  const occupiedBookings = await this.prisma.roomBooking.findMany({
    where: {
      roomId: { in: roomIds },
      AND: [
        { checkInDate: { lt: checkOutDate } },
        { checkOutDate: { gt: checkInDate } },
        { status: { in: ['ASSIGNED', 'CHECKED_IN'] } },
      ],
    },
    select: {
      roomId: true,
    },
  });

  const occupiedRoomIds = new Set(occupiedBookings.map((rb) => rb.roomId));

  // Step 5: Calculate availability
  const totalRooms = roomsForType.length;
  const occupiedRooms = occupiedRoomIds.size;
  const availableRooms = totalRooms - occupiedRooms;
  const availabilityPercentage =
    totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0;

  // Step 6: Get list of available rooms (if requested)
  const availableRoomList = includeRoomList
    ? roomsForType
        .filter((room) => !occupiedRoomIds.has(room.id))
        .map((room) => ({
          roomId: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          size: room.size ?? undefined,
          accessible: room.accessible,
        }))
    : undefined;

  // Step 7: Return response
  return {
    roomTypeId,
    checkInDate: checkInDate.toISOString(),
    checkOutDate: checkOutDate.toISOString(),
    roomType: {
      id: roomType.id,
      code: roomType.code,
      name: roomType.name,
      description: roomType.description,
      basePrice: roomType.basePrice,
      capacity: roomType.capacity,
      bedType: roomType.bedType,
      amenities: roomType.amenities,
      hasPoolView: roomType.hasPoolView,
      thumbnailUrl: roomType.thumbnailUrl,
      roomImages: roomType.roomImages,
    },
    availability: {
      totalRooms,
      availableRooms,
      occupiedRooms,
      availabilityPercentage,
      isAvailable: availableRooms > 0,
    },
    availableRoomList,
  };
}
```

### Phase 3: Controller Implementation

**Location:** `src/room-type/room-type.controller.ts`

Add new endpoint (should be placed **after** the general availability endpoint):

```typescript
@Get('availability/:roomTypeId')
@ApiOperation({
  summary: 'Check individual room type availability',
  description:
    'Returns detailed availability information for a specific room type during the specified dates',
})
@ApiParam({
  name: 'roomTypeId',
  type: String,
  required: true,
  description: 'UUID of the room type',
  example: 'cm4u1234abcd5678efgh9012',
})
@ApiQuery({
  name: 'checkInDate',
  type: String,
  required: true,
  description: 'Check-in date in ISO 8601 format',
  example: '2025-12-20T14:00:00Z',
})
@ApiQuery({
  name: 'checkOutDate',
  type: String,
  required: true,
  description: 'Check-out date in ISO 8601 format',
  example: '2025-12-25T12:00:00Z',
})
@ApiQuery({
  name: 'includeRoomList',
  type: Boolean,
  required: false,
  description: 'Include list of specific available rooms (default: true)',
  example: true,
})
@ApiResponse({
  status: 200,
  description: 'Room type availability retrieved successfully',
  schema: {
    type: 'object',
    properties: {
      roomTypeId: { type: 'string' },
      checkInDate: { type: 'string' },
      checkOutDate: { type: 'string' },
      roomType: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'object' },
          description: { type: 'object' },
          basePrice: { type: 'number' },
          capacity: { type: 'number' },
          bedType: { type: 'string' },
          amenities: { type: 'array', items: { type: 'string' } },
          hasPoolView: { type: 'boolean' },
          thumbnailUrl: { type: 'string', nullable: true },
          roomImages: { type: 'array' },
        },
      },
      availability: {
        type: 'object',
        properties: {
          totalRooms: { type: 'number', example: 10 },
          availableRooms: { type: 'number', example: 7 },
          occupiedRooms: { type: 'number', example: 3 },
          availabilityPercentage: { type: 'number', example: 70 },
          isAvailable: { type: 'boolean', example: true },
        },
      },
      availableRoomList: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            roomId: { type: 'string' },
            roomNumber: { type: 'string' },
            floor: { type: 'number' },
            size: { type: 'number', nullable: true },
            accessible: { type: 'boolean' },
          },
        },
      },
    },
  },
})
@ApiNotFoundResponse({
  description: 'Room type not found',
})
@ApiBadRequestResponse({
  description: 'Invalid date range or dates in the past',
})
async checkIndividualRoomTypeAvailability(
  @Param('roomTypeId') roomTypeId: string,
  @Query('checkInDate') checkInDate: string,
  @Query('checkOutDate') checkOutDate: string,
  @Query('includeRoomList') includeRoomList?: string,
): Promise<IndividualRoomTypeAvailability> {
  // Parse dates with UTC handling
  let checkIn: Date;
  let checkOut: Date;

  try {
    const checkInStr = checkInDate.includes('T')
      ? checkInDate
      : `${checkInDate}T00:00:00Z`;
    const checkOutStr = checkOutDate.includes('T')
      ? checkOutDate
      : `${checkOutDate}T00:00:00Z`;

    checkIn = new Date(checkInStr);
    checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
  } catch (error) {
    throw new BadRequestException(
      'Invalid date format. Use ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ',
    );
  }

  // Parse includeRoomList (default to true)
  const shouldIncludeRoomList = includeRoomList === 'false' ? false : true;

  return this.roomTypeService.getIndividualRoomTypeAvailability(
    roomTypeId,
    checkIn,
    checkOut,
    shouldIncludeRoomList,
  );
}
```

**Important:** Place this route **AFTER** `GET /room-types/availability` but **BEFORE** `GET /room-types/:id` to avoid route conflicts.

### Phase 4: Testing Strategy

#### Unit Tests

**File:** `src/room-type/room-type.service.spec.ts`

```typescript
describe('getIndividualRoomTypeAvailability', () => {
  it('should return availability for valid room type', async () => {
    // Test implementation
  });

  it('should throw NotFoundException for invalid room type ID', async () => {
    // Test implementation
  });

  it('should calculate correct availability with overlapping bookings', async () => {
    // Test implementation
  });

  it('should return empty availableRoomList when all rooms occupied', async () => {
    // Test implementation
  });

  it('should exclude room list when includeRoomList is false', async () => {
    // Test implementation
  });

  it('should only include AVAILABLE status rooms', async () => {
    // Test implementation
  });

  it('should handle room type with no rooms', async () => {
    // Test implementation
  });
});
```

#### E2E Tests

**File:** `test/room-type.e2e-spec.ts`

```typescript
describe('GET /room-types/availability/:roomTypeId', () => {
  it('should return 200 with availability data', () => {
    return request(app.getHttpServer())
      .get(
        `/room-types/availability/${roomTypeId}?checkInDate=2025-12-20&checkOutDate=2025-12-25`,
      )
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('availability');
        expect(res.body.availability).toHaveProperty('isAvailable');
      });
  });

  it('should return 404 for non-existent room type', () => {
    return request(app.getHttpServer())
      .get(
        '/room-types/availability/invalid-uuid?checkInDate=2025-12-20&checkOutDate=2025-12-25',
      )
      .expect(404);
  });

  it('should return 400 for invalid date range', () => {
    return request(app.getHttpServer())
      .get(
        `/room-types/availability/${roomTypeId}?checkInDate=2025-12-25&checkOutDate=2025-12-20`,
      )
      .expect(400);
  });

  it('should exclude room list when includeRoomList=false', () => {
    return request(app.getHttpServer())
      .get(
        `/room-types/availability/${roomTypeId}?checkInDate=2025-12-20&checkOutDate=2025-12-25&includeRoomList=false`,
      )
      .expect(200)
      .expect((res) => {
        expect(res.body.availableRoomList).toBeUndefined();
      });
  });
});
```

---

## TODO List - Individual Room Type Availability

### Phase 1: Type Definition

- [ ] Create `src/room-type/types/individual-availability-response.type.ts`
- [ ] Define `IndividualRoomTypeAvailability` interface
- [ ] Add JSDoc documentation

### Phase 2: Service Implementation

- [ ] Add `getIndividualRoomTypeAvailability()` method to RoomTypeService
- [ ] Implement room type existence check
- [ ] Implement rooms query for specific type
- [ ] Implement occupied rooms query
- [ ] Implement availability calculation
- [ ] Add optional room list feature
- [ ] Add error handling (NotFoundException)
- [ ] Add logging

### Phase 3: Controller Implementation

- [ ] Add route `GET /room-types/availability/:roomTypeId` to controller
- [ ] Add path parameter validation (roomTypeId)
- [ ] Add query parameter validation (dates, includeRoomList)
- [ ] Add UTC date handling
- [ ] Add Swagger documentation
- [ ] Add proper HTTP response codes
- [ ] Ensure route order (after /availability, before /:id)

### Phase 4: Testing

- [ ] Write unit tests for service method
- [ ] Test room type not found scenario
- [ ] Test availability calculation with various booking scenarios
- [ ] Test includeRoomList flag
- [ ] Write E2E tests for endpoint
- [ ] Test with actual seed data

### Phase 5: Documentation

- [ ] Update Swagger with examples
- [ ] Add usage examples
- [ ] Document response format
- [ ] Document error codes

---

## Use Cases

### Use Case 1: Booking Flow - Room Type Selection

**Scenario:** User wants to book a specific room type they found in the search results.

**Flow:**

1. User searches dates → GET `/room-types/availability` (bulk)
2. User sees "Deluxe Room - 7 rooms available"
3. User clicks on Deluxe Room
4. Frontend calls → GET `/room-types/availability/{deluxeRoomTypeId}?checkInDate=...&checkOutDate=...`
5. User sees detailed room type info + specific room numbers available
6. User proceeds to booking with selected room type

### Use Case 2: Hotel Staff - Specific Room Type Inquiry

**Scenario:** Front desk staff receives call asking about Executive Suite availability.

**Flow:**

1. Staff looks up Executive Suite room type ID
2. Calls → GET `/room-types/availability/{executiveSuiteId}?checkInDate=...`
3. Sees immediately: "5 out of 5 suites available (100%)"
4. Can view specific suite numbers: 801, 802, 803, 804, 805
5. Recommends specific suite based on guest preferences

### Use Case 3: Dynamic Pricing Integration

**Scenario:** Revenue management system adjusts prices based on availability.

**Flow:**

1. Pricing system calls endpoint for each room type
2. Gets `availabilityPercentage` for each type
3. Applies dynamic pricing:
   - > 70% available → Base price or discount
   - 30-70% available → Base price + 10%
   - < 30% available → Base price + 25%
   - 0% available → Not offered

### Use Case 4: Mobile App - Room Type Detail Page

**Scenario:** Mobile app user views details of a specific room type.

**Flow:**

1. App calls endpoint with `includeRoomList=false` (faster response)
2. Shows room type details + availability badge
3. If user expands "Available Rooms", second call with `includeRoomList=true`
4. Shows list of specific rooms with floor numbers

---

## Performance Considerations

### Query Optimization

**Comparison with Bulk Endpoint:**

| Metric        | Bulk Endpoint                       | Individual Endpoint                              |
| ------------- | ----------------------------------- | ------------------------------------------------ |
| Queries       | 2 (occupied rooms + all room types) | 3 (room type + rooms for type + occupied)        |
| Rows Scanned  | All room types, all bookings        | 1 room type, subset of rooms, subset of bookings |
| Response Time | ~200-400ms                          | ~50-150ms                                        |
| Use Case      | Initial search                      | Detailed view                                    |

**Optimization Tips:**

1. **Index Usage:** Existing indexes on `roomTypeId`, `status`, and date fields ensure fast queries
2. **Selective Queries:** Only fetch rooms for the specific room type
3. **Optional Room List:** Allow clients to skip room list for faster response
4. **Caching:** Cache room type details (changes infrequently)

### Caching Strategy

```typescript
// Cache room type details for 1 hour
const cacheKey = `room-type-details:${roomTypeId}`;
let roomType = await cache.get(cacheKey);

if (!roomType) {
  roomType = await prisma.roomType.findUnique({...});
  await cache.set(cacheKey, roomType, 3600); // 1 hour TTL
}

// Never cache availability data (changes frequently)
const availability = await calculateAvailability(...);
```

---

## API Comparison Table

| Feature                | Bulk Availability `/room-types/availability` | Individual Availability `/room-types/availability/:id` |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------ |
| **Purpose**            | Search all room types                        | Detailed view of one type                              |
| **Input**              | Dates only                                   | Dates + Room Type ID                                   |
| **Output**             | Array of room types                          | Single room type                                       |
| **Room List**          | Not included                                 | Optional (default: yes)                                |
| **Use Case**           | Initial search/browse                        | Detail page, confirmation                              |
| **Response Size**      | Large (multiple types)                       | Small (one type)                                       |
| **Speed**              | Slower (~200-400ms)                          | Faster (~50-150ms)                                     |
| **Error if not found** | Returns empty array                          | Returns 404                                            |

---

## Integration Examples

### Frontend Integration

```typescript
// React/Next.js example
const RoomTypeDetailPage = ({ roomTypeId, checkIn, checkOut }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const params = new URLSearchParams({
          checkInDate: checkIn.toISOString(),
          checkOutDate: checkOut.toISOString(),
          includeRoomList: 'true',
        });

        const response = await fetch(
          `${API_URL}/room-types/availability/${roomTypeId}?${params}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            // Room type not found
            navigate('/404');
            return;
          }
          throw new Error('Failed to fetch availability');
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [roomTypeId, checkIn, checkOut]);

  if (loading) return <Spinner />;
  if (!data) return <ErrorMessage />;

  return (
    <div>
      <h1>{data.roomType.name.en}</h1>
      <p>{data.roomType.description.en}</p>
      <div className="availability-badge">
        {data.availability.isAvailable ? (
          <span className="text-green-600">
            {data.availability.availableRooms} rooms available
          </span>
        ) : (
          <span className="text-red-600">Fully booked</span>
        )}
      </div>

      {data.availableRoomList && (
        <div className="room-list">
          <h3>Available Rooms:</h3>
          {data.availableRoomList.map(room => (
            <div key={room.roomId}>
              Room {room.roomNumber} - Floor {room.floor}
              {room.accessible && ' (Accessible)'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Backend-to-Backend Integration

```typescript
// Booking service calling availability check before creating booking
class BookingService {
  async createBooking(data: CreateBookingDto) {
    // Check availability before creating booking
    const availability = await this.http.get(
      `/room-types/availability/${data.roomTypeId}`,
      {
        params: {
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          includeRoomList: true,
        },
      },
    );

    if (!availability.availability.isAvailable) {
      throw new BadRequestException('No rooms available for selected dates');
    }

    // Get first available room
    const firstAvailableRoom = availability.availableRoomList[0];

    // Create booking with specific room
    return this.prisma.booking.create({
      data: {
        ...data,
        roomBookings: {
          create: {
            roomId: firstAvailableRoom.roomId,
            roomRate: availability.roomType.basePrice,
            // ...
          },
        },
      },
    });
  }
}
```

---

## Error Handling

### Error Scenarios

1. **Room Type Not Found (404)**

```json
{
  "statusCode": 404,
  "message": "Room type with ID 'cm4u1234abcd5678efgh9012' not found",
  "error": "Not Found"
}
```

2. **Invalid Room Type ID (400)**

```json
{
  "statusCode": 400,
  "message": "Validation failed (uuid is expected)",
  "error": "Bad Request"
}
```

3. **Invalid Date Range (400)**

```json
{
  "statusCode": 400,
  "message": "Check-out date must be after check-in date",
  "error": "Bad Request"
}
```

4. **Past Date (400)**

```json
{
  "statusCode": 400,
  "message": "Check-in date cannot be in the past",
  "error": "Bad Request"
}
```

5. **Invalid Date Format (400)**

```json
{
  "statusCode": 400,
  "message": "Invalid date format. Use ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ",
  "error": "Bad Request"
}
```

---

## Estimated Effort - Individual Endpoint

- **Type Definition:** 30 minutes
- **Service Implementation:** 2-3 hours
- **Controller Implementation:** 1-2 hours
- **Swagger Documentation:** 1 hour
- **Unit Tests:** 2 hours
- **E2E Tests:** 1 hour
- **Total:** ~8-10 hours

---

## Success Criteria - Individual Endpoint

1. ✅ Returns correct availability for valid room type ID
2. ✅ Returns 404 for non-existent room type
3. ✅ Correctly calculates availability with overlapping bookings
4. ✅ Optional room list feature works correctly
5. ✅ Response time < 150ms
6. ✅ Comprehensive Swagger documentation
7. ✅ Handles all error scenarios gracefully
8. ✅ Works seamlessly with bulk availability endpoint

---

## Contact & Support

- **Developer:** [Your Name]
- **Project:** RabbitMansion Hotel Management API
- **Repository:** [Repository URL]
- **Documentation:** http://localhost:3001/api

---

**Last Updated:** December 16, 2025  
**Status:** Planning Complete - Two Endpoints Planned  
**Endpoints:**

1. ✅ Bulk Availability: `GET /room-types/availability` (Implemented)
2. 📋 Individual Availability: `GET /room-types/availability/:roomTypeId` (Planned)

**Next Step:** Implement Individual Room Type Availability Endpoint
