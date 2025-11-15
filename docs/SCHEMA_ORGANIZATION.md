# Hotel Management System - Schema Organization

## Overview

This document outlines the comprehensive hotel management database schema that has been organized into logical domains for better maintainability and understanding.

## Schema Architecture

The schema is organized into the following domains:

### 1. 🔐 User Management Domain

**Models:** `Admin`, `Guest`

- **Admin**: System administrators and staff with role-based access
- **Guest**: Customer profiles with VIP tiers and preferences
- **Features**: Authentication, audit trails, preference tracking

### 2. 🏨 Room Management Domain

**Models:** `Room`, `RoomImage`, `MaintenanceLog`

- **Room**: Multi-language room inventory with pricing and amenities
- **RoomImage**: Media gallery management for rooms
- **MaintenanceLog**: Service and repair tracking
- **Features**: Seasonal pricing, accessibility compliance, maintenance scheduling

### 3. 📋 Booking & Reservation Domain

**Models:** `Booking`

- **Booking**: Complete reservation lifecycle management
- **Features**: Guest preferences, timeline tracking, admin audit trail

### 4. 💰 Financial Management Domain

**Models:** `Payment`, `Refund`

- **Payment**: Multi-method payment processing with gateway integration
- **Refund**: Refund management with approval workflow
- **Features**: Historical pricing preservation, transaction auditing

### 5. 🛎️ Service Management Domain

**Models:** `Service`, `BookingService`

- **Service**: Hotel services catalog with multi-language support
- **BookingService**: Service bookings linked to guest stays
- **Features**: Category management, approval workflows, quantity limits

### 6. ⭐ Customer Experience Domain

**Models:** `Review`, `LoyaltyProgram`

- **Review**: Guest feedback and hotel responses
- **LoyaltyProgram**: Points and tier management
- **Features**: Verified reviews, tier benefits, engagement tracking

### 7. 🔧 Maintenance & Operations Domain

**Models:** `MaintenanceLog` (shared with Room domain)

- **Features**: Work order tracking, cost management, completion status

### 8. 🔒 Security & Audit Domain

**Models:** `AuditLog`

- **AuditLog**: Complete system change tracking for compliance
- **Features**: IP tracking, before/after values, action logging

### 9. 📊 Analytics & Reporting Domain

**Models:** `DailyRevenue`

- **DailyRevenue**: Key performance metrics and KPIs
- **Features**: Occupancy rates, ADR, RevPAR calculations

### 10. ⚙️ System Configuration Domain

**Models:** `Settings`

- **Settings**: Configurable application parameters
- **Features**: Categorized settings, JSON value storage

## Multi-Language Support

The schema includes comprehensive multi-language support using JSON fields:

```typescript
// Example multi-language content
{
  "en": "Deluxe Ocean View Room",
  "th": "ห้องดีลักซ์วิวทะเล"
}
```

**Supported Languages:** English (en), Thai (th)
**Extensible:** Easy to add more languages

## Key Features

### 🔍 Performance Optimization

- Strategic database indexes on frequently queried fields
- Efficient relationship mappings
- Query optimization considerations

### 🛡️ Security & Compliance

- Complete audit trail for all operations
- Admin action tracking
- Guest data protection considerations

### 💼 Business Intelligence

- Daily revenue tracking with key hotel metrics
- Occupancy rate calculations
- Average Daily Rate (ADR) and Revenue Per Available Room (RevPAR)

### 🎯 Operational Excellence

- Room maintenance scheduling and tracking
- Service request management
- Guest preference handling

## Schema Statistics

- **Total Models:** 15
- **Total Enums:** 8
- **Multi-language Models:** 3 (Room, Service, RoomImage)
- **Indexed Fields:** 25+
- **Audit Capable Models:** 12

## Database Indexes

Key indexes for performance:

```sql
-- Room availability queries
INDEX ON rooms (status, roomType, floor, isActive)

-- Booking date range queries
INDEX ON bookings (checkInDate, checkOutDate, status, guestId, roomId)

-- Payment tracking
INDEX ON payments (bookingId, status, paymentMethod)

-- Audit trail queries
INDEX ON audit_logs (adminId, entity, entityId, createdAt, action)
```

## Usage Guidelines

### For Development

1. **Reference Documentation**: Use the `/docs/schema-reference/` files for domain-specific documentation
2. **Type Safety**: Leverage the TypeScript interfaces for type checking
3. **Query Examples**: Refer to the common query patterns in each reference file

### For Database Administration

1. **Migration Strategy**: The schema supports incremental migrations
2. **Backup Considerations**: Focus on transactional data (bookings, payments) for critical backups
3. **Performance Monitoring**: Monitor the indexed queries for optimization opportunities

## File Organization

```
prisma/
├── schema.prisma              # Single comprehensive schema (Prisma requirement)
│
docs/schema-reference/         # Domain documentation
├── user-management.ts         # Admin & Guest models
├── room-management.ts         # Room, RoomImage, MaintenanceLog
├── booking-management.ts      # Booking & related models
└── ...                       # Other domain references
```

## Migration Notes

- **Current State**: All models are in a single `schema.prisma` file (Prisma requirement)
- **Organization**: Logical sections with clear documentation and comments
- **Maintainability**: Reference files help with modular development
- **Future-Proof**: Structure allows for easy additions and modifications

## Getting Started

1. **Database Setup**: Run `prisma migrate dev` to apply the schema
2. **Seed Data**: Use the provided seed script for initial data
3. **Development**: Reference the domain documentation files for feature development
4. **Testing**: The schema includes realistic sample data for testing

---

_This schema represents a production-ready hotel management system with enterprise-level features and considerations for scalability, security, and international operations._
