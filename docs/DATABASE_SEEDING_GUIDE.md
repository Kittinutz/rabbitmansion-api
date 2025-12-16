# Database Seeding Guide

## Overview

This guide provides comprehensive instructions for seeding the RabbitMansion Hotel Management API database with test data. The project includes multiple seed files for different scenarios and development needs.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Available Seed Files](#available-seed-files)
3. [Seed File Details](#seed-file-details)
4. [Seeding Strategies](#seeding-strategies)
5. [Dependencies & Requirements](#dependencies--requirements)
6. [Common Commands](#common-commands)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Setup (Recommended for First Time)

```bash
# Reset database and run default seeder
npx prisma migrate reset --force

# This will automatically run: ts-node prisma/seed-rooms.ts
```

### Alternative: Manual Seeding

```bash
# Run specific seed file
npx ts-node prisma/seed-rooms.ts

# Or use npm scripts
npm run db:seed              # Runs seed-simple.ts
npm run db:seed-scenario     # Runs seed-scenario.ts
npm run db:reset             # Resets DB + runs seed-simple.ts
```

---

## Available Seed Files

### Standalone Seeders (Can Run Independently)

| File                 | Purpose                               | Data Created                         | Best For                  |
| -------------------- | ------------------------------------- | ------------------------------------ | ------------------------- |
| **seed-rooms.ts** ⭐ | Default seeder with modern room types | 51 rooms, 9 room types               | **Production-like setup** |
| **seed-hotel.ts**    | Complete hotel system                 | 51 rooms, guests, bookings, services | **Full feature testing**  |
| **seed-simple.ts**   | Quick minimal setup                   | 36 rooms, 2 guests, services         | **Quick testing**         |
| **seed.ts**          | Legacy simple seeder                  | 36 rooms (old schema)                | **Legacy compatibility**  |

### Dependent Seeders (Require Existing Data)

| File                               | Purpose                          | Requires       | What It Does                                |
| ---------------------------------- | -------------------------------- | -------------- | ------------------------------------------- |
| **seed-scenario-clean.ts**         | Creates realistic room scenarios | Rooms          | Updates statuses, adds features             |
| **seed-scenario.ts**               | Alternative scenario setup       | Rooms          | Similar to clean version                    |
| **seed-comprehensive-bookings.ts** | Advanced booking scenarios       | Rooms + Guests | Creates 12 bookings with multi-room support |

---

## Seed File Details

### 1. seed-rooms.ts (⭐ DEFAULT)

**Configuration:** Set as default in `package.json`

```json
"prisma": {
  "seed": "ts-node prisma/seed-rooms.ts"
}
```

**What It Creates:**

#### Room Types (9 types)

- **DELUXE_DOUBLE_POOL_VIEW** - ฿3,500/night
  - 30m², Pool view, Double bed, Balcony
  - Amenities: WiFi, AC, Mini Bar, Safe, TV, Coffee Maker

- **DELUXE_DOUBLE_BALCONY** - ฿3,000/night
  - 28m², Garden view, Double bed, Balcony
- **DELUXE_TWIN_BALCONY** - ฿2,800/night
  - 28m², Two twin beds, Balcony

- **FAMILY_DOUBLE_BALCONY** - ฿3,800/night
  - 35m², Family-friendly, Sofa bed, Balcony
  - Additional amenities: Baby crib available

- **PREMIER_DOUBLE_BALCONY** - ฿4,200/night
  - 32m², Premium location, Enhanced amenities

- **SUPER_DELUXE_POOL_VIEW** - ฿5,000/night
  - 40m², Superior pool view, King bed
  - Premium amenities: Bathtub, Walk-in shower

- **SUPER_PREMIER_TERRACE** - ฿6,000/night
  - 45m², Luxury terrace, Premium finishes
  - Top-tier amenities

- **DELUXE_TWIN_BALCONY_NO_WINDOW** - ฿2,500/night
  - 26m², Budget-friendly, Interior view

- **DELUXE_DOUBLE_BALCONY_NO_WINDOW** - ฿2,700/night
  - 26m², Budget-friendly, Interior view

#### Rooms (51 rooms)

**Floor 1 (101-117):** Entry-level deluxe rooms

- Mix of DELUXE_DOUBLE_BALCONY, DELUXE_TWIN_BALCONY
- First 3 rooms marked as accessible

**Floor 2 (201-217):** Premium and family rooms

- PREMIER_DOUBLE_BALCONY, FAMILY_DOUBLE_BALCONY
- DELUXE_DOUBLE_POOL_VIEW rooms

**Floor 3 (301-317):** Luxury tier

- SUPER_DELUXE_POOL_VIEW, SUPER_PREMIER_TERRACE
- Highest-end accommodations

**Room Status Distribution:**

- 5 rooms OCCUPIED: 101, 203, 305, 208, 312
- 2 rooms MAINTENANCE: 102, 210
- 1 room OUT_OF_ORDER: 307
- Rest AVAILABLE

**Features:**

- Bilingual support (English/Thai)
- Seasonal pricing structure
- Bed type enum (DOUBLE, TWIN, KING)
- Comprehensive amenities (19+ options)
- Accessibility marking

**Run Command:**

```bash
npx ts-node prisma/seed-rooms.ts
```

---

### 2. seed-hotel.ts

**What It Creates:**

#### 1. Admins (2)

```typescript
Email: admin@rabbitmansion.com
Role: SUPER_ADMIN
Password: password123

Email: manager@rabbitmansion.com
Role: MANAGER
Password: password123
```

#### 2. Guests (3)

- **John Smith** - VIP Level 2, American, +1-555-0123
- **Jane Doe** - VIP Level 5, British, +44-20-7946-0958
- **Hiroshi Tanaka** - VIP Level 3, Japanese, +81-3-1234-5678

#### 3. Room Types (5)

- STANDARD_SINGLE - ฿1,200
- STANDARD_DOUBLE - ฿1,800
- DELUXE_DOUBLE - ฿2,500
- DELUXE_POOL_VIEW - ฿3,200
- FAMILY_SUITE - ฿4,500

#### 4. Rooms (51 rooms)

Same distribution as seed-rooms but with different types

#### 5. Services (4)

- **Room Service Breakfast** - ฿450
- **Traditional Thai Massage** - ฿1,200 (90 min)
- **Airport Transfer** - ฿800
- **Express Laundry Service** - ฿50/item

#### 6. Bookings & Payments

- Current bookings (CHECKED_IN status)
- Future bookings (CONFIRMED status)
- Payment records with tracking

#### 7. Daily Revenue Records (31 days)

- Room revenue tracking
- Service revenue
- Occupancy rate
- ADR (Average Daily Rate)
- RevPAR (Revenue Per Available Room)

#### 8. System Settings (7 settings)

- Hotel name: "Rabbit Mansion Hotel"
- Check-in time: 15:00
- Check-out time: 11:00
- Currency: THB
- Tax rate: 10%
- Service charge: 7%
- Cancellation policy: "Free cancellation up to 24 hours..."

**Run Command:**

```bash
npx ts-node prisma/seed-hotel.ts
```

---

### 3. seed-simple.ts

**What It Creates:**

#### Admins (2)

Same as seed-hotel

#### Guests (2)

- John Smith
- Jane Doe

#### Rooms (36 rooms)

**Floor 1 (101-112):** 12 STANDARD rooms @ ฿2,500
**Floor 2 (201-212):** 12 DELUXE rooms @ ฿3,500
**Floor 3 (301-312):** 12 SUITE rooms @ ฿5,500

#### Services (3)

- Room Service Breakfast - ฿450
- Traditional Thai Massage - ฿1,200
- Airport Transfer - ฿800

#### Daily Revenue (31 days)

#### Settings (4 basic settings)

**Use Case:** Quick testing without complex relationships

**Run Command:**

```bash
npm run db:seed
# or
npx ts-node prisma/seed-simple.ts
```

---

### 4. seed.ts (Legacy)

**What It Creates:**

36 rooms across 3 floors using old room type enum:

- Floor 1: STANDARD_OPPOSITE_POOL @ ฿2,500
- Floor 2: DOUBLE_BED @ ฿3,000
- Floor 3: SUPERIOR @ ฿4,000

**Use Case:** Legacy compatibility testing

**Run Command:**

```bash
npx ts-node prisma/seed.ts
```

---

### 5. seed-scenario-clean.ts

**⚠️ REQUIRES:** Rooms must exist first (run seed-rooms.ts or similar first)

**What It Does:**

Modifies existing rooms to create realistic scenarios:

#### Room Status Updates

- **5 rooms → OCCUPIED:** 101, 105, 201, 206, 301
- **2 rooms → MAINTENANCE:** 103, 210
- **1 room → OUT_OF_ORDER:** 112

#### Featured Rooms

**Room 108 - Romantic Suite:**

```typescript
Price: ฿3,200
Special Amenities: Hot Tub, Romantic Package
Description: Perfect for romantic getaways
Status: AVAILABLE
```

**Room 208 - Executive Business Room:**

```typescript
Price: ฿3,500
Special Amenities: Business Desk, Meeting Area
Description: Ideal for business travelers
Status: AVAILABLE
```

#### Premium Tier Adjustments

- Rooms 311, 310, 312 → ฿4,500 (premium pricing)

**Occupancy Calculation:**
Calculates and displays current occupancy rate based on 36 rooms

**Run Command:**

```bash
# First, ensure rooms exist
npx ts-node prisma/seed-rooms.ts

# Then run scenario
npx ts-node prisma/seed-scenario-clean.ts

# Or use npm script
npm run db:seed-scenario
```

---

### 6. seed-scenario.ts

**⚠️ REQUIRES:** Rooms must exist first

Similar to seed-scenario-clean.ts with slight differences:

- 2 rooms OUT_OF_ORDER (110, 211) instead of 1
- Different room numbers for some statuses
- Same featured rooms (108, 208)

**Run Command:**

```bash
npx ts-node prisma/seed-scenario.ts
```

---

### 7. seed-comprehensive-bookings.ts

**⚠️ REQUIRES:**

- Rooms must exist
- Guests must exist (at least 2-3 guests)

**What It Creates:**

#### Scenario 1: Single-Room Bookings (8 bookings)

Traditional one-room-per-booking model:

```typescript
// Example booking structure
{
  bookingNumber: "BK20251216XXXX",
  guestId: guest.id,
  roomIds: [room.id],
  checkInDate: ...,
  checkOutDate: ...,
  status: CONFIRMED / CHECKED_IN / CHECKED_OUT
}
```

**Bookings Created:**

- 3 current stays (CHECKED_IN)
- 3 future reservations (CONFIRMED)
- 2 past stays (CHECKED_OUT)

#### Scenario 2: Multi-Room Family Booking

```typescript
{
  bookingNumber: "BK20251216XXXX",
  roomIds: [room1, room2, room3],  // 3 rooms!
  numberOfGuests: 6,
  numberOfChildren: 3,
  duration: 7 nights,
  specialRequests: "Connecting rooms, baby cot",
  roomNotes: [
    "Parents room - needs baby cot",
    "Grandparents room",
    "Kids room - 3 children"
  ]
}
```

**Total:** 1 booking, 3 room assignments

#### Scenario 3: Corporate Group Booking

```typescript
{
  bookingNumber: "BK20251216XXXX",
  roomIds: [room1, room2, room3, room4, room5],  // 5 rooms!
  numberOfGuests: 5,
  duration: 3 nights,
  source: "Agent",
  notes: "TechCorp annual meeting",
  discount: 15% (corporate rate),
  roomRates: All rooms @ ฿2,125 (discounted from ฿2,500),
  roomNotes: [
    "CEO suite - top floor preferred",
    "CTO - needs high-speed internet",
    "Project Manager",
    "Senior Developer",
    "UI/UX Designer"
  ]
}
```

**Total:** 1 booking, 5 room assignments

#### Scenario 4: Past Booking (Checked Out)

Single-room booking with complete timeline:

- Includes actualCheckIn and actualCheckOut timestamps
- Status: CHECKED_OUT

#### Scenario 5: Cancelled Booking

```typescript
{
  status: CANCELLED,
  cancellationReason: "Guest cancelled due to flight delay",
  roomBookings: All marked as CANCELLED
}
```

#### Summary of Data Created

**Total Bookings:** 12

- 3 CHECKED_IN
- 4 CONFIRMED (future)
- 2 CHECKED_OUT (past)
- 1 CANCELLED
- 2 other statuses

**Total Room Assignments:** 18 (via RoomBooking junction table)

- 8 single-room bookings = 8 assignments
- 1 family booking = 3 assignments
- 1 corporate booking = 5 assignments
- 2 other = 2 assignments

**Room Status Updates:**
After seeding, rooms are automatically updated:

- Multiple rooms → OCCUPIED (based on current bookings)
- 2 rooms → MAINTENANCE
- 2 rooms → CLEANING

#### Key Features

**Pricing Calculation:**

```typescript
// For each booking
totalAmount = sum of all room rates
taxAmount = totalAmount * 0.10 (10%)
serviceCharges = totalAmount * 0.07 (7%)
finalAmount = totalAmount + taxAmount + serviceCharges

// With discounts
discountAmount = calculated based on VIP level or corporate rate
finalAmount = totalAmount - discountAmount + taxes + service charges
```

**Booking Number Generation:**

```typescript
Format: BK{YYYYMMDD}{SEQUENCE}
Example: BK20251216001, BK20251216002, etc.
```

**Run Command:**

```bash
# First, ensure rooms and guests exist
npx ts-node prisma/seed-simple.ts  # Creates guests + rooms

# Then create bookings
npx ts-node prisma/seed-comprehensive-bookings.ts
```

---

## Seeding Strategies

### Strategy 1: Clean Development Start

For starting fresh with modern schema:

```bash
# Step 1: Reset database completely
npx prisma migrate reset --force
# ✅ This runs seed-rooms.ts automatically

# Step 2 (Optional): Add realistic scenarios
npx ts-node prisma/seed-scenario-clean.ts
```

**Result:**

- 51 modern rooms with 9 types
- Realistic room statuses
- Featured special rooms
- Ready for booking system testing

---

### Strategy 2: Full Feature Testing

For testing all features including bookings:

```bash
# Step 1: Start with complete hotel system
npx ts-node prisma/seed-hotel.ts
# ✅ Creates admins, guests, rooms, services, bookings

# Step 2 (Optional): Add more booking scenarios
npx ts-node prisma/seed-comprehensive-bookings.ts
```

**Result:**

- Complete hotel management system
- Multiple guests with history
- Services and revenue tracking
- Mixed single and multi-room bookings

---

### Strategy 3: Quick Testing

For rapid testing cycles:

```bash
# Single command setup
npm run db:seed
```

**Result:**

- 36 rooms (simple structure)
- 2 guests
- 3 services
- No bookings (add manually via API)

---

### Strategy 4: Booking System Focus

For testing the new many-to-many booking system:

```bash
# Step 1: Setup base data
npx ts-node prisma/seed-rooms.ts    # Modern rooms
npx ts-node prisma/seed-simple.ts   # Adds guests + services

# Step 2: Create complex booking scenarios
npx ts-node prisma/seed-comprehensive-bookings.ts

# Step 3 (Optional): Add room scenarios
npx ts-node prisma/seed-scenario-clean.ts
```

**Result:**

- Focus on booking functionality
- Single, multi-room, and group bookings
- All booking statuses covered
- Room assignment tracking

---

## Dependencies & Requirements

### Dependency Graph

```
┌─────────────────────────────────────────────────┐
│          STANDALONE SEEDERS                      │
│  (Can run independently, clear existing data)   │
└─────────────────────────────────────────────────┘
         │
         ├──> seed-rooms.ts ⭐ (DEFAULT)
         │     └─> Creates: 51 rooms, 9 types
         │
         ├──> seed-hotel.ts
         │     └─> Creates: Everything (rooms, guests, bookings, etc.)
         │
         ├──> seed-simple.ts
         │     └─> Creates: 36 rooms, 2 guests, services
         │
         └──> seed.ts (legacy)
               └─> Creates: 36 rooms (old schema)

┌─────────────────────────────────────────────────┐
│       DEPENDENT SEEDERS                          │
│  (Require existing data, DO NOT clear)          │
└─────────────────────────────────────────────────┘
         │
         ├──> seed-scenario-clean.ts
         │     ├─ REQUIRES: Rooms (from any seeder)
         │     └─> Modifies: Room statuses & features
         │
         ├──> seed-scenario.ts
         │     ├─ REQUIRES: Rooms (from any seeder)
         │     └─> Modifies: Room statuses & features
         │
         └──> seed-comprehensive-bookings.ts
               ├─ REQUIRES: Rooms AND Guests
               └─> Creates: 12 bookings, 18 room assignments
```

### Pre-requisites Checklist

Before running any seeder:

✅ **Database Connection**

```bash
# Check .env file has correct DATABASE_URL
DATABASE_URL="postgresql://user:password@localhost:5432/rabbitmansion"
```

✅ **Migrations Applied**

```bash
# Ensure all migrations are applied
npx prisma migrate deploy
```

✅ **Dependencies Installed**

```bash
# Ensure all packages are installed
npm install
```

✅ **Prisma Client Generated**

```bash
# Generate Prisma client if needed
npx prisma generate
```

### Seeder-Specific Requirements

| Seeder                         | Requires Rooms | Requires Guests | Requires Services | Notes                |
| ------------------------------ | -------------- | --------------- | ----------------- | -------------------- |
| seed-rooms.ts                  | ❌ No          | ❌ No           | ❌ No             | Clears data first    |
| seed-hotel.ts                  | ❌ No          | ❌ No           | ❌ No             | Creates everything   |
| seed-simple.ts                 | ❌ No          | ❌ No           | ❌ No             | Creates everything   |
| seed.ts                        | ❌ No          | ❌ No           | ❌ No             | Legacy, clears first |
| seed-scenario-clean.ts         | ✅ **YES**     | ❌ No           | ❌ No             | Modifies rooms only  |
| seed-scenario.ts               | ✅ **YES**     | ❌ No           | ❌ No             | Modifies rooms only  |
| seed-comprehensive-bookings.ts | ✅ **YES**     | ✅ **YES**      | ❌ No             | Needs both!          |

---

## Common Commands

### Basic Seeding

```bash
# Run default seeder (seed-rooms.ts)
npx prisma migrate reset --force

# Run specific seeder
npx ts-node prisma/seed-rooms.ts
npx ts-node prisma/seed-hotel.ts
npx ts-node prisma/seed-simple.ts
npx ts-node prisma/seed-comprehensive-bookings.ts

# Using npm scripts
npm run db:seed              # Runs seed-simple.ts
npm run db:seed-scenario     # Runs seed-scenario.ts
npm run db:reset             # Reset + seed-simple.ts
```

### Database Management

```bash
# Reset database (DELETES ALL DATA)
npx prisma migrate reset --force

# Apply migrations without seeding
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Open Prisma Studio to view data
npx prisma studio
```

### Chaining Commands

```bash
# Full reset with custom seed
npx prisma migrate reset --force && npx ts-node prisma/seed-hotel.ts

# Setup for booking testing
npx ts-node prisma/seed-rooms.ts && \
npx ts-node prisma/seed-simple.ts && \
npx ts-node prisma/seed-comprehensive-bookings.ts

# Quick development setup
npx prisma migrate reset --force && \
npx ts-node prisma/seed-scenario-clean.ts
```

### Checking Results

```bash
# Open Prisma Studio
npx prisma studio
# Then navigate to http://localhost:5555

# Query via psql (if using PostgreSQL)
psql -d rabbitmansion -c "SELECT COUNT(*) FROM rooms;"
psql -d rabbitmansion -c "SELECT COUNT(*) FROM bookings;"

# Test via API
curl http://localhost:3001/rooms
curl http://localhost:3001/bookings
```

---

## Troubleshooting

### Issue: "Module not found" Error

**Error:**

```
Error: Cannot find module 'prisma/generated/prisma'
```

**Solution:**

```bash
# Regenerate Prisma client
npx prisma generate
```

---

### Issue: Seed File Fails with Unique Constraint

**Error:**

```
Unique constraint failed on the constraint: `rooms_roomNumber_key`
```

**Solution:**

```bash
# Clear database first
npx prisma migrate reset --force

# Or manually clear specific tables
npx prisma studio
# Then delete records via UI
```

---

### Issue: seed-comprehensive-bookings.ts Fails

**Error:**

```
Cannot find rooms or guests to create bookings
```

**Solution:**

```bash
# Ensure rooms and guests exist first
npx ts-node prisma/seed-simple.ts  # Creates both

# Then run booking seeder
npx ts-node prisma/seed-comprehensive-bookings.ts
```

---

### Issue: seed-scenario-clean.ts Doesn't Find Rooms

**Error:**

```
No rooms found to update
```

**Solution:**

```bash
# Run a room seeder first
npx ts-node prisma/seed-rooms.ts

# Then run scenario
npx ts-node prisma/seed-scenario-clean.ts
```

---

### Issue: TypeScript Compilation Errors

**Error:**

```
error TS2305: Module has no exported member
```

**Solution:**

```bash
# Regenerate Prisma client with correct output path
npx prisma generate

# Check Prisma imports use correct path
# Should be: from '../../prisma/generated/prisma'
# NOT: from '@prisma/client'
```

---

### Issue: Database Connection Refused

**Error:**

```
Can't reach database server
```

**Solution:**

```bash
# Check database is running
# For PostgreSQL:
brew services list
brew services start postgresql

# For Docker:
docker ps
docker-compose up -d

# Verify connection string in .env
DATABASE_URL="postgresql://user:password@localhost:5432/rabbitmansion"
```

---

### Issue: Permission Denied

**Error:**

```
EACCES: permission denied
```

**Solution:**

```bash
# Fix permissions
chmod +x prisma/seed-*.ts

# Or use npx explicitly
npx ts-node prisma/seed-rooms.ts
```

---

## Best Practices

### 1. Always Start Fresh for Major Changes

```bash
# Best practice: Reset before major seeding
npx prisma migrate reset --force
```

### 2. Use Prisma Studio to Verify

```bash
# Check data after seeding
npx prisma studio
```

### 3. Test Booking Scenarios Incrementally

```bash
# Don't run all at once - test each scenario
npx ts-node prisma/seed-rooms.ts
# Verify rooms in Prisma Studio

npx ts-node prisma/seed-simple.ts
# Verify guests created

npx ts-node prisma/seed-comprehensive-bookings.ts
# Verify bookings and room assignments
```

### 4. Keep Backup of Important Data

```bash
# Export before major changes
pg_dump rabbitmansion > backup.sql

# Restore if needed
psql rabbitmansion < backup.sql
```

### 5. Document Custom Seed Scenarios

When creating custom seed files, document:

- What data it creates
- What data it requires
- What it modifies vs creates
- Any special notes or edge cases

---

## Examples

### Example 1: Fresh Development Start

```bash
# Complete fresh start
npx prisma migrate reset --force

# Result: 51 rooms with modern types (via default seeder)

# Add realistic scenarios
npx ts-node prisma/seed-scenario-clean.ts

# Open Prisma Studio to verify
npx prisma studio
```

### Example 2: Testing Booking API

```bash
# Setup complete system
npx ts-node prisma/seed-hotel.ts

# Add complex booking scenarios
npx ts-node prisma/seed-comprehensive-bookings.ts

# Test via API
curl -X GET http://localhost:3001/bookings
curl -X GET http://localhost:3001/rooms/available
```

### Example 3: Quick API Testing

```bash
# Minimal setup
npm run db:seed

# Test specific endpoints
curl -X GET http://localhost:3001/rooms
curl -X GET http://localhost:3001/guests
```

---

## Summary

The RabbitMansion API provides flexible seeding options for different development needs:

- **🚀 Quick Start:** `npx prisma migrate reset --force` (uses seed-rooms.ts)
- **🏨 Full System:** `seed-hotel.ts` for complete hotel management
- **🔖 Booking Focus:** `seed-comprehensive-bookings.ts` for testing many-to-many bookings
- **⚙️ Scenarios:** `seed-scenario-clean.ts` for realistic test cases

Choose the appropriate seeder based on your testing needs, and always check dependencies before running dependent seeders.

For questions or issues, refer to the [Troubleshooting](#troubleshooting) section or check the source code in the `prisma/` directory.
