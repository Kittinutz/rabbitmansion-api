# Database Seeding Guide

## Overview

This document provides comprehensive guidance for seeding the RabbitMansion Hotel Management System database. The seeding system is designed to populate the database with realistic test data that mirrors a real hotel operation.

## Database Schema Architecture

### Core Modules

#### 1. **Room Management** (`rooms.prisma`)
- **RoomType**: Hotel room categories with pricing, amenities, and specifications
- **Room**: Individual physical rooms with operational status
- **RoomImage**: Media gallery for room types
- **MaintenanceLog**: Room maintenance tracking

#### 2. **Guest Management** (`users.prisma`, `customer.prisma`)
- **Guest**: Customer profiles with contact information and preferences
- **Admin**: Staff users with different access levels
- **LoyaltyProgram**: Guest loyalty points and tier management
- **Review**: Guest feedback and ratings

#### 3. **Booking System** (`bookings.prisma`)
- **Booking**: Reservation records with check-in/out dates
- **BookingService**: Additional services linked to bookings

#### 4. **Financial Management** (`financial.prisma`)
- **Payment**: Payment processing and transaction records
- **Refund**: Refund processing and tracking
- **DailyRevenue**: Daily financial analytics

#### 5. **Service Management** (`services.prisma`)
- **Service**: Hotel services (spa, dining, transportation)
- **BookingService**: Service assignments to bookings

#### 6. **System Management** (`system.prisma`)
- **AuditLog**: User action tracking
- **Settings**: System configuration

## Enumeration System

### Room Types
```typescript
enum BedTypeEnum {
  SINGLE, DOUBLE, QUEEN, KING, TWIN
}

enum AmenitiesEnum {
  WIFI, AIR_CONDITIONING, MINIBAR, SAFE, TV,
  BALCONY, BATHTUB, SHOWER, DESK, BED,
  LIVING_ROOM, KITCHEN, BATHROOM,
  KING_SIZE_BED, QUEEN_SIZE_BED, TWIN_BEDS,
  ROOM_SERVICE, CITY_VIEW, POOL_VIEW
}

enum RoomStatus {
  AVAILABLE, OCCUPIED, MAINTENANCE, 
  OUT_OF_ORDER, CLEANING
}
```

### Booking System
```typescript
enum BookingStatus {
  PENDING, CONFIRMED, CHECKED_IN, 
  CHECKED_OUT, CANCELLED, NO_SHOW
}

enum PaymentStatus {
  PENDING, PAID, PARTIALLY_PAID, 
  REFUNDED, FAILED
}

enum PaymentMethod {
  CREDIT_CARD, DEBIT_CARD, CASH, 
  BANK_TRANSFER, MOBILE_PAYMENT
}
```

## Seeding Scripts

### 1. `seed-rooms.ts` - Primary Room Data
**Purpose**: Creates complete hotel room inventory with 9 room types across 3 floors

**Room Types Generated**:
- `DELUXE_DOUBLE_POOL_VIEW` (฿3,500)
- `DELUXE_DOUBLE_BALCONY` (฿3,000)
- `DELUXE_TWIN_BALCONY` (฿2,800)
- `FAMILY_DOUBLE_BALCONY` (฿3,800)
- `PREMIER_DOUBLE_BALCONY` (฿4,200)
- `SUPER_DELUXE_POOL_VIEW` (฿5,000)
- `SUPER_PREMIER_TERRACE` (฿6,000)
- `DELUXE_TWIN_BALCONY_NO_WINDOW` (฿2,500)
- `DELUXE_DOUBLE_BALCONY_NO_WINDOW` (฿2,700)

**Room Distribution**:
- **Floor 1** (101-117): Entry-level deluxe rooms
- **Floor 2** (201-217): Premium and family rooms  
- **Floor 3** (301-317): Top-tier luxury rooms

**Key Features**:
- ✅ Uses `BedTypeEnum` for type safety
- ✅ Uses `AmenitiesEnum` for amenity consistency
- ✅ Multilingual support (English/Thai)
- ✅ Seasonal pricing configuration
- ✅ Realistic room status variety

### 2. `seed-hotel.ts` - Comprehensive Hotel Data
**Purpose**: Full hotel setup with guests, bookings, and services

### 3. `seed-simple.ts` - Minimal Test Data
**Purpose**: Quick setup for development testing

### 4. `seed-scenario.ts` - Business Scenario Data
**Purpose**: Real-world hotel operation scenarios

## Usage Instructions

### Running Seeds

```bash
# Primary room seeding (recommended for most use cases)
npm run seed:rooms

# Full hotel setup
npm run seed:hotel

# Development testing
npm run seed:simple

# Reset and clean seed
npm run seed:clean
```

### Environment Setup

1. **Database Connection**
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/rabbitmansion"
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Run Migrations**
   ```bash
   npx prisma migrate dev
   ```

### Data Validation

After seeding, verify data integrity:

```bash
# Check room types
npx prisma db seed -- --verify-room-types

# Check room distribution  
npx prisma db seed -- --verify-rooms

# Check data relationships
npx prisma db seed -- --verify-relations
```

## Seeding Best Practices

### 1. **Enum Usage**
Always use enums instead of strings for consistency:

```typescript
// ✅ Good
bedType: BedTypeEnum.DOUBLE,
amenities: [AmenitiesEnum.WIFI, AmenitiesEnum.AIR_CONDITIONING]

// ❌ Bad  
bedType: 'Double',
amenities: ['WiFi', 'Air Conditioning']
```

### 2. **Multilingual Data**
Structure multilingual content properly:

```typescript
name: {
  en: 'Deluxe Double Room',
  th: 'ห้องดีลักซ์ดับเบิล'
},
description: {
  en: 'Comfortable double room with modern amenities',
  th: 'ห้องดับเบิลสะดวกสบายพร้อมสิ่งอำนวยความสะดวกทันสมัย'
}
```

### 3. **Realistic Relationships**
Maintain proper foreign key relationships:

```typescript
// Room -> RoomType relationship
const roomData = {
  roomNumber: '101',
  roomTypeId: roomType.id,  // ✅ Proper FK reference
  status: RoomStatus.AVAILABLE,
  floor: 1
};
```

### 4. **Data Cleanup**
Always clear existing data before seeding:

```typescript
await prisma.room.deleteMany({});
await prisma.roomType.deleteMany({});
// Then create new data
```

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**
   - Ensure parent records exist before creating child records
   - Follow proper deletion order (children first, then parents)

2. **Enum Value Errors**
   - Use exact enum values from schema
   - Check for typos in enum references

3. **Unique Constraint Violations**
   - Clear existing data before re-seeding
   - Use unique identifiers consistently

### Debug Commands

```bash
# Check database state
npx prisma studio

# Reset database completely  
npx prisma migrate reset

# View generated types
npx prisma generate --help
```

## Customization Guide

### Adding New Room Types

1. **Update Seed Data**
   ```typescript
   {
     code: 'YOUR_ROOM_TYPE',
     name: { en: 'Your Room Name', th: 'ชื่อห้องของคุณ' },
     basePrice: 4500,
     capacity: 2,
     bedType: BedTypeEnum.KING,
     amenities: [AmenitiesEnum.WIFI, AmenitiesEnum.BALCONY]
   }
   ```

2. **Update Room Distribution**
   ```typescript
   const roomDistribution = [
     {
       floor: 1,
       pattern: ['YOUR_ROOM_TYPE', 'DELUXE_DOUBLE_BALCONY']
     }
   ];
   ```

### Adding New Amenities

1. **Update Enum** (`enums.prisma`)
   ```prisma
   enum AmenitiesEnum {
     // ... existing amenities
     NEW_AMENITY
   }
   ```

2. **Regenerate Client**
   ```bash
   npx prisma generate
   ```

3. **Use in Seeds**
   ```typescript
   amenities: [AmenitiesEnum.NEW_AMENITY]
   ```

## Performance Considerations

- **Batch Operations**: Use `createMany()` for large datasets
- **Transaction Safety**: Wrap related operations in transactions
- **Index Optimization**: Ensure proper indexes on frequently queried fields
- **Memory Management**: Process large datasets in chunks

## Security Notes

- **Production Safety**: Never run seeds on production databases
- **Environment Separation**: Use different seed data for different environments
- **Sensitive Data**: Avoid real customer data in seeds
- **Access Control**: Limit seeding permissions to authorized users

---

## Quick Start

```bash
# 1. Set up environment
cp .env.example .env
# Edit DATABASE_URL in .env

# 2. Set up database
npx prisma migrate dev

# 3. Generate client  
npx prisma generate

# 4. Run primary room seeding
npm run seed:rooms

# 5. Verify data
npx prisma studio
```

Your RabbitMansion hotel database is now ready with realistic test data! 🏨✨