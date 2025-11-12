# Database Seeding Guide

## Overview

This project includes comprehensive database seeding scripts to populate your hotel room management system with realistic data.

## Available Seed Scripts

### 1. Main Seed Script (`prisma/seed.ts`)

**Purpose**: Creates the complete base dataset
**Command**: `npm run db:seed`

**What it creates**:

- 36 hotel rooms (101-112, 201-212, 301-312)
- 4 sample users (admin, manager, guests)
- Proper room type distribution by floor
- Default pricing and amenities

**Room Distribution**:

- **Floor 1**: Rooms 101-112 - Standard Opposite Pool (฿2,500/night)
- **Floor 2**: Rooms 201-212 - Double Bed (฿3,000/night)
- **Floor 3**: Rooms 301-312 - Superior (฿4,000/night)### 2. Scenario Seed Script (`prisma/seed-scenario-clean.ts`)

**Purpose**: Creates a realistic hotel scenario with various room statuses
**Command**: `npx ts-node prisma/seed-scenario-clean.ts`

**What it creates**:

- Sets some rooms as OCCUPIED (realistic check-in scenario)
- Puts rooms under MAINTENANCE (system upgrades)
- Marks problematic rooms as OUT_OF_ORDER
- Creates premium rooms with special pricing
- Adds special amenity packages to featured rooms

**Current Scenario Results**:

- ✅ Available: 28 rooms
- 🏠 Occupied: 5 rooms (101, 105, 201, 206, 301)
- 🔧 Maintenance: 2 rooms (103, 210)
- ⚠️ Out of Order: 1 room (112)
- 📈 Occupancy Rate: 14%## Usage Instructions

### Fresh Database Setup

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Run migrations
npx prisma migrate dev

# 3. Seed base data
npm run db:seed

# 4. Apply realistic scenario (optional)
npx ts-node prisma/seed-scenario-clean.ts
```

### Reset and Reseed Database

```bash
# Complete reset with base data
npm run db:reset

# Then optionally add scenario
npx ts-node prisma/seed-scenario-clean.ts
```

### Quick Commands

```bash
# Just seed rooms without reset
npm run db:seed

# Create realistic hotel scenario
npx ts-node prisma/seed-scenario-clean.ts

# Reset everything and start fresh
npm run db:reset
```

## Package.json Scripts

The following scripts are available in `package.json`:

```json
{
  "scripts": {
    "db:seed": "ts-node prisma/seed.ts",
    "db:seed-scenario": "ts-node prisma/seed-scenario.ts", // Deprecated, use clean version
    "db:reset": "prisma migrate reset --force && npm run db:seed"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

## Room Data Structure

### Default Room Types & Amenities

**Standard Opposite Pool (Floor 1)**:

- Base amenities: WiFi, A/C, TV, Private Bathroom
- Special: Pool View, Balcony
- Price: ฿2,500/night

**Double Bed (Floor 2)**:

- Base amenities: WiFi, A/C, TV, Private Bathroom
- Special: King Size Bed, Mini Fridge
- Price: ฿3,000/night

**Superior (Floor 3)**:

- Base amenities: WiFi, A/C, TV, Private Bathroom
- Special: King Bed, Mini Fridge, City View, Room Service, Safe Box
- Price: ฿4,000/night

### Featured Rooms (After Scenario)

**Room 108 - Romantic Suite**:

- All standard amenities + Hot Tub, Romantic Package
- Price: ฿3,200/night
- Perfect for honeymoons and anniversaries

**Room 208 - Executive Business Room**:

- All double bed amenities + Business Desk, Meeting Space, Express Check-in
- Price: ฿3,500/night
- Ideal for business travelers

**Premium Superior Rooms (309, 310, 311)**:

- Enhanced superior amenities with panoramic city view
- Price: ฿4,500/night
- VIP service included

## Testing the Seeded Data

After seeding, test your API with these endpoints:

```bash
# View all rooms
curl http://localhost:3000/rooms

# Check available rooms
curl http://localhost:3000/rooms?status=AVAILABLE

# See occupied rooms
curl http://localhost:3000/rooms?status=OCCUPIED

# View maintenance rooms
curl http://localhost:3000/rooms?status=MAINTENANCE

# Get premium rooms
curl "http://localhost:3000/rooms?priceMin=4000"

# View by floor
curl http://localhost:3000/rooms/floor/1

# Get specific room
curl http://localhost:3000/rooms/number/108
```

## Database Management

### View Data

```bash
# Open Prisma Studio
npx prisma studio

# Direct database query
echo 'SELECT "roomNumber", "roomType", status, price FROM rooms ORDER BY "roomNumber";' | docker exec -i postgres-db psql -U postgres -d rabbitmansion
```

### Room Status Management

```bash
# Change room status via API
curl -X PUT http://localhost:3000/rooms/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "AVAILABLE"}'

# Batch status updates can be done through the seed scripts
```

## Customizing Seeds

### Adding New Room Types

1. Update the `RoomType` enum in `prisma/schema.prisma`
2. Run `npx prisma migrate dev` to update database
3. Modify seed scripts to include new types

### Custom Scenarios

Create new scenario files like `seed-scenario-clean.ts`:

- Copy the existing structure
- Modify room assignments
- Add custom amenities or pricing
- Run with `npx ts-node prisma/your-scenario.ts`

### Seasonal Pricing

Add seasonal pricing scenarios:

```typescript
// Example: Holiday pricing
const holidayRooms = ['301', '302', '303'];
for (const roomNumber of holidayRooms) {
  await prisma.room.update({
    where: { roomNumber },
    data: {
      price: 5500,
      description: `Holiday special pricing for room ${roomNumber}`,
    },
  });
}
```

This seeding system provides a complete foundation for testing and demonstrating your hotel room management API with realistic, varied data scenarios.
