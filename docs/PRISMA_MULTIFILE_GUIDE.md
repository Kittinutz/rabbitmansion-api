# Prisma Multi-File Schema Organization

This project now uses Prisma's multi-file schema support for better organization and maintainability.

## 📁 Schema Structure

```
prisma/
├── schema/                          # Multi-file schema directory
│   ├── base.prisma                  # Generator and datasource config
│   ├── enums.prisma                 # All enum definitions
│   ├── users.prisma                 # Admin and Guest user models
│   ├── rooms.prisma                 # Room management models
│   ├── bookings.prisma              # Booking and reservation models
│   ├── financial.prisma             # Payment, refund, and revenue models
│   ├── services.prisma              # Service management models
│   ├── customer.prisma              # Review and loyalty models
│   └── system.prisma                # Audit and settings models
│
├── generated/                       # Generated Prisma client
└── migrations/                      # Database migrations
```

## 🎯 Benefits of Multi-File Organization

### ✅ **Improved Organization**

- **Domain Separation**: Models grouped by business domain
- **Focused Development**: Work on specific areas without cognitive overload
- **Clear Dependencies**: Easy to understand model relationships

### ✅ **Better Maintainability**

- **Smaller Files**: Each file contains related models only
- **Team Collaboration**: Multiple developers can work on different domains
- **Reduced Conflicts**: Git merge conflicts minimized

### ✅ **Enhanced Developer Experience**

- **Faster Navigation**: Find specific models quickly
- **Logical Structure**: Intuitive file organization
- **Documentation**: Each file is self-documenting

## 📋 Schema Files Overview

### `base.prisma` - Configuration

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### `enums.prisma` - Business Logic Constants

- `RoomType`, `RoomStatus`
- `BookingStatus`, `PaymentStatus`, `PaymentMethod`
- `ServiceCategory`, `ServiceStatus`
- `GuestStatus`, `RefundStatus`, `AuditAction`

### `users.prisma` - User Management

- **Admin**: System administrators and staff
- **Guest**: Hotel customers with profiles and preferences

### `rooms.prisma` - Room Management

- **Room**: Hotel inventory with multi-language support
- **RoomImage**: Media management for rooms
- **MaintenanceLog**: Service and repair tracking

### `bookings.prisma` - Reservations

- **Booking**: Complete booking lifecycle management

### `financial.prisma` - Financial Management

- **Payment**: Transaction processing
- **Refund**: Payment reversals
- **DailyRevenue**: Analytics and reporting

### `services.prisma` - Service Management

- **Service**: Hotel services catalog
- **BookingService**: Services linked to bookings

### `customer.prisma` - Customer Experience

- **Review**: Guest feedback and ratings
- **LoyaltyProgram**: Points and tier management

### `system.prisma` - System Management

- **AuditLog**: System change tracking
- **Settings**: Configuration management

## 🔧 Development Workflow

### **Schema Validation**

```bash
npx prisma validate
```

### **Generate Client**

```bash
npx prisma generate
```

### **Database Operations**

```bash
# Push schema changes
npx prisma db push

# Run migrations
npx prisma migrate dev --name description

# Seed database
npx ts-node prisma/seed-simple.ts
```

### **Database Inspection**

```bash
npx prisma studio
```

## 🎨 Best Practices

### **File Naming Convention**

- Use descriptive domain names (not numbered prefixes)
- Examples: `users.prisma`, `financial.prisma`, `customer.prisma`

### **Model Organization**

- Group related models in the same file
- Keep enum definitions in `enums.prisma`
- Put configuration in `base.prisma`

### **Development Tips**

1. **Work by Domain**: Focus on one business domain at a time
2. **Validate Often**: Run `prisma validate` after changes
3. **Regenerate Client**: Run `prisma generate` after schema updates
4. **Test Relationships**: Ensure cross-file relationships work correctly

### **File Relationships**

```
base.prisma (config)
    ↓
enums.prisma (shared enums)
    ↓
users.prisma → bookings.prisma → financial.prisma
    ↓              ↓                ↓
rooms.prisma → services.prisma → customer.prisma
    ↓
system.prisma (audit & settings)
```

## 🚀 Migration from Single File

### **What Changed**

- ✅ Single `schema.prisma` → Multiple domain files
- ✅ Better organization and structure
- ✅ Improved developer experience
- ✅ Same functionality and features

### **Configuration Updates**

- Updated `prisma.config.ts` to point to `schema` directory
- Client generation path remains the same
- All existing migrations work unchanged

### **Import Path Updates**

- Seed scripts updated to use correct client path
- Generated client location: `./generated/prisma`

## 📊 Schema Statistics

- **Total Files**: 9 schema files
- **Total Models**: 15 models
- **Total Enums**: 8 enums
- **Multi-language Models**: 3 models
- **Indexed Fields**: 25+ strategic indexes

## 🔗 References

- [Prisma Multi-File Schema Guide](https://www.prisma.io/blog/organize-your-prisma-schema-with-multi-file-support)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Hotel Management Schema Documentation](../docs/SCHEMA_ORGANIZATION.md)

---

_This multi-file organization maintains all the functionality of the original schema while providing better structure and developer experience for the hotel management system._
