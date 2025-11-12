# Room Management API Documentation

## Overview

This API provides comprehensive room management functionality for a hotel/mansion with three room types and a structured room numbering system.

## Database Design

### Room Model Schema

```prisma
enum RoomType {
  DOUBLE_BED
  SUPERIOR
  STANDARD_OPPOSITE_POOL
}

enum RoomStatus {
  AVAILABLE
  OCCUPIED
  MAINTENANCE
  OUT_OF_ORDER
}

model Room {
  id          Int        @id @default(autoincrement())
  roomNumber  String     @unique
  roomType    RoomType
  status      RoomStatus @default(AVAILABLE)
  floor       Int
  price       Float?
  description String?
  amenities   String[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@map("rooms")
}
```

## Room Configuration

### Room Types

- **DOUBLE_BED**: Premium rooms with king-size beds (Floor 2)
- **SUPERIOR**: Luxury rooms with premium amenities (Floor 3)
- **STANDARD_OPPOSITE_POOL**: Standard rooms with pool view (Floor 1)

### Room Numbering System

- **Floor 1**: Rooms 101-112 (Standard Opposite Pool)
- **Floor 2**: Rooms 201-212 (Double Bed)
- **Floor 3**: Rooms 301-312 (Superior)

### Default Pricing

- Standard Opposite Pool: ฿2,500/night
- Double Bed: ฿3,000/night
- Superior: ฿4,000/night

### Default Amenities

**Base amenities (all rooms):**

- WiFi
- Air Conditioning
- Television
- Private Bathroom

**Standard Opposite Pool (additional):**

- Pool View
- Balcony

**Double Bed (additional):**

- King Size Bed
- Mini Fridge

**Superior (additional):**

- King Size Bed
- Mini Fridge
- City View
- Room Service
- Safe Box

## API Endpoints

### Base URL: `http://localhost:3000`

### 1. Initialize All Rooms

**POST** `/rooms/initialize`

Creates all 36 rooms (101-112, 201-212, 301-312) with default configurations.

```bash
curl -X POST http://localhost:3000/rooms/initialize
```

### 2. Get All Rooms

**GET** `/rooms`

Retrieve all rooms with optional filtering.

**Query Parameters:**

- `roomType`: Filter by room type (DOUBLE_BED, SUPERIOR, STANDARD_OPPOSITE_POOL)
- `status`: Filter by status (AVAILABLE, OCCUPIED, MAINTENANCE, OUT_OF_ORDER)
- `floor`: Filter by floor (1, 2, 3)
- `priceMin`: Minimum price filter
- `priceMax`: Maximum price filter

```bash
# Get all rooms
curl http://localhost:3000/rooms

# Get available rooms only
curl "http://localhost:3000/rooms?status=AVAILABLE"

# Get Superior rooms
curl "http://localhost:3000/rooms?roomType=SUPERIOR"

# Get rooms on floor 2
curl "http://localhost:3000/rooms?floor=2"

# Get rooms in price range
curl "http://localhost:3000/rooms?priceMin=2000&priceMax=3500"
```

### 3. Get Available Rooms

**GET** `/rooms/available`

```bash
curl http://localhost:3000/rooms/available
```

### 4. Get Rooms by Type

**GET** `/rooms/type/:roomType`

```bash
curl http://localhost:3000/rooms/type/SUPERIOR
curl http://localhost:3000/rooms/type/DOUBLE_BED
curl http://localhost:3000/rooms/type/STANDARD_OPPOSITE_POOL
```

### 5. Get Rooms by Floor

**GET** `/rooms/floor/:floor`

```bash
curl http://localhost:3000/rooms/floor/1
curl http://localhost:3000/rooms/floor/2
curl http://localhost:3000/rooms/floor/3
```

### 6. Get Room by Number

**GET** `/rooms/number/:roomNumber`

```bash
curl http://localhost:3000/rooms/number/101
curl http://localhost:3000/rooms/number/205
curl http://localhost:3000/rooms/number/311
```

### 7. Get Room by ID

**GET** `/rooms/:id`

```bash
curl http://localhost:3000/rooms/1
```

### 8. Create New Room

**POST** `/rooms`

```bash
curl -X POST http://localhost:3000/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "roomNumber": "401",
    "roomType": "SUPERIOR",
    "price": 5000,
    "description": "Penthouse suite",
    "amenities": ["WiFi", "Air Conditioning", "Television", "Private Bathroom", "Jacuzzi"]
  }'
```

### 9. Update Room

**PUT** `/rooms/:id`

```bash
curl -X PUT http://localhost:3000/rooms/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 3500,
    "description": "Updated room with renovations"
  }'
```

### 10. Update Room Status

**PUT** `/rooms/:id/status`

```bash
# Mark room as occupied
curl -X PUT http://localhost:3000/rooms/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "OCCUPIED"}'

# Mark room as available
curl -X PUT http://localhost:3000/rooms/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "AVAILABLE"}'

# Mark room for maintenance
curl -X PUT http://localhost:3000/rooms/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "MAINTENANCE"}'
```

### 11. Delete Room

**DELETE** `/rooms/:id`

```bash
curl -X DELETE http://localhost:3000/rooms/1
```

## Data Types

### CreateRoomDto

```typescript
{
  roomNumber: string;
  roomType: 'DOUBLE_BED' | 'SUPERIOR' | 'STANDARD_OPPOSITE_POOL';
  status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  price?: number;
  description?: string;
  amenities?: string[];
}
```

### UpdateRoomDto

```typescript
{
  roomType?: 'DOUBLE_BED' | 'SUPERIOR' | 'STANDARD_OPPOSITE_POOL';
  status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  price?: number;
  description?: string;
  amenities?: string[];
}
```

### Room Response

```typescript
{
  id: number;
  roomNumber: string;
  roomType: 'DOUBLE_BED' | 'SUPERIOR' | 'STANDARD_OPPOSITE_POOL';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  floor: number;
  price: number | null;
  description: string | null;
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Error Responses

### 400 Bad Request

- Invalid room number format
- Invalid room type
- Invalid status
- Invalid floor number
- Room already exists

### 404 Not Found

- Room not found

### Example Error Response

```json
{
  "statusCode": 400,
  "message": "Invalid room number format. Must be in format 1xx, 2xx, or 3xx where xx is 01-12",
  "error": "Bad Request"
}
```

## Setup Instructions

1. **Start the database:**

   ```bash
   docker-compose up -d postgres
   ```

2. **Run database migrations:**

   ```bash
   npx prisma migrate dev
   ```

3. **Start the application:**

   ```bash
   npm run start:dev
   ```

4. **Initialize all rooms:**

   ```bash
   curl -X POST http://localhost:3000/rooms/initialize
   ```

5. **Test the API:**
   ```bash
   curl http://localhost:3000/rooms
   ```

## Example Usage Scenarios

### Hotel Check-in Process

1. Check available rooms: `GET /rooms/available`
2. Update room status to occupied: `PUT /rooms/{id}/status` with `{"status": "OCCUPIED"}`

### Hotel Management

1. Get all Superior rooms: `GET /rooms/type/SUPERIOR`
2. Get all rooms on floor 2: `GET /rooms/floor/2`
3. Update room price: `PUT /rooms/{id}` with `{"price": 4500}`

### Maintenance Management

1. Mark room for maintenance: `PUT /rooms/{id}/status` with `{"status": "MAINTENANCE"}`
2. Get all rooms under maintenance: `GET /rooms?status=MAINTENANCE`
3. Mark room as available after maintenance: `PUT /rooms/{id}/status` with `{"status": "AVAILABLE"}`

This API provides a complete solution for managing hotel rooms with proper validation, error handling, and comprehensive CRUD operations.
