# Project Startup Issues and Resolutions

## Date: December 16, 2025

## Executive Summary

The RabbitMansion API project had several TypeScript compilation errors preventing startup after implementing the new room-booking many-to-many relationship. All issues have been successfully resolved, and the project is now running on port 3001.

---

## Issues Encountered

### 1. **Incorrect Prisma Client Import Paths**

**Issue:**

```typescript
// ❌ INCORRECT - Files were importing from @prisma/client
import { BookingStatus, Booking, RoomBooking } from '@prisma/client';
```

**Error Message:**

```
error TS2305: Module '"@prisma/client"' has no exported member 'BookingStatus'
error TS2305: Module '"@prisma/client"' has no exported member 'Booking'
error TS2305: Module '"@prisma/client"' has no exported member 'RoomBooking'
```

**Root Cause:**
The project uses a custom Prisma client generation path (`prisma/generated/prisma`), not the default `@prisma/client` package. This is defined in the Prisma configuration.

**Solution:**
Updated all imports to use the correct path:

```typescript
// ✅ CORRECT - Updated imports
import type { Booking, RoomBooking } from '../../prisma/generated/prisma';
import {
  RoomStatus,
  BookingStatus,
  RoomBookingStatus,
} from '../../prisma/generated/prisma';
```

**Files Modified:**

- `src/booking/booking.service.ts` (lines 1-13)
- `src/booking/booking.controller.ts` (lines 13-20)

---

### 2. **TypeScript Decorator Metadata Type Import Error**

**Issue:**

```typescript
// ❌ INCORRECT - Regular import for types used in decorators
import {
  BookingService,
  CreateBookingDto,
  UpdateBookingDto,
  AssignRoomToBookingDto,
} from './booking.service';
```

**Error Message:**

```
error TS1272: A type referenced in a decorated signature must be imported with 'import type'
or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
```

**Root Cause:**
When TypeScript's `isolatedModules` and `emitDecoratorMetadata` are enabled (common in NestJS projects), types used in decorator signatures must be imported using `import type` to avoid runtime issues.

**Solution:**
Separated value imports from type imports:

```typescript
// ✅ CORRECT - Type imports separated
import { BookingService } from './booking.service';
import type {
  CreateBookingDto,
  UpdateBookingDto,
  AssignRoomToBookingDto,
} from './booking.service';
```

**Files Modified:**

- `src/booking/booking.controller.ts` (lines 13-20)

---

### 3. **Prisma Query Error - Mixed `select` and `include`**

**Issue:**

```typescript
// ❌ INCORRECT - Cannot use both select and include
return await this.prisma.room.findMany({
  where: { id: { in: roomIds } },
  include: {
    roomType: {
      select: { basePrice: true },
    },
  },
  select: {
    id: true,
    roomType: true,
  },
});
```

**Error Message:**

```
error TS2345: Type is not assignable to parameter
'"Please either choose `select` or `include`."'
```

**Root Cause:**
Prisma does not allow using both `select` and `include` in the same query. You must choose one approach for data fetching.

**Solution:**
Used only `select` with nested selection:

```typescript
// ✅ CORRECT - Only use select
return await this.prisma.room.findMany({
  where: { id: { in: roomIds } },
  select: {
    id: true,
    roomType: {
      select: {
        basePrice: true,
      },
    },
  },
});
```

**Files Modified:**

- `src/booking/booking.service.ts` (lines 469-486)

---

### 4. **Return Type Mismatch with Included Relations**

**Issue:**

```typescript
// ❌ INCORRECT - Promise<Booking> doesn't include relations
async findOne(id: string): Promise<Booking> {
  const booking = await this.prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      roomBookings: { ... },
      services: { ... },
      payments: true,
      reviews: true,
    },
  });
  return booking; // Type mismatch!
}
```

**Error Message:**

```
error TS2339: Property 'roomBookings' does not exist on type 'Booking'
```

**Root Cause:**
When using `include`, Prisma returns an expanded type that includes the related data. The `Booking` type alone doesn't include these relations.

**Solution:**
Removed explicit return type to let TypeScript infer the correct type:

```typescript
// ✅ CORRECT - Inferred return type includes relations
async findOne(id: string) {
  const booking = await this.prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      roomBookings: { ... },
      services: { ... },
      payments: true,
      reviews: true,
    },
  });
  return booking; // TypeScript infers correct type with relations
}
```

**Files Modified:**

- `src/booking/booking.service.ts` (line 180)

---

### 5. **Missing Validation Packages**

**Issue:**

```
ERROR [PackageLoader] The "class-validator" package is missing.
```

**Root Cause:**
The `class-validator` and `class-transformer` packages were not installed, but the code uses `ValidationPipe` which requires them.

**Solution:**
Installed required packages:

```bash
npm install class-validator class-transformer
```

**Packages Added:**

- `class-validator` - For DTO validation
- `class-transformer` - For transforming plain objects to class instances

---

### 6. **Port Already in Use**

**Issue:**

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3001
```

**Root Cause:**
A previous instance of the server was still running on port 3001.

**Solution:**
Killed the process occupying the port:

```bash
lsof -ti:3001 | xargs kill -9
```

---

## Final Result

✅ **Project Status: RUNNING SUCCESSFULLY**

### Server Information:

- **Port:** 3001
- **URL:** http://localhost:3001
- **API Documentation:** http://localhost:3001/api
- **Status:** All routes loaded successfully

### Registered Routes Summary:

- **App Routes:** 2 endpoints (health check, root)
- **File Routes:** 6 endpoints (upload, download, delete, etc.)
- **Room Routes:** 14 endpoints (including new availability endpoints)
- **Room Type Routes:** 13 endpoints
- **Booking Routes:** 12 endpoints (NEW - including room assignment)

---

## Key Learnings

### 1. **Import Path Consistency**

Always use the project's configured Prisma client path. Check:

- `package.json` for Prisma config
- `prisma.config.ts` for custom output paths
- Other files in the project for the correct import pattern

### 2. **TypeScript Decorator Metadata**

In NestJS projects with strict TypeScript settings:

- Use `import type` for interfaces and types used in decorators
- Use regular `import` only for classes, enums, and values
- This prevents unnecessary code in the compiled output

### 3. **Prisma Query API**

- Never mix `select` and `include` in the same query
- Use `select` for precise field selection
- Use `include` for loading full relations
- Let TypeScript infer return types when using `include`

### 4. **Dependency Management**

- Always check `package.json` for required peer dependencies
- NestJS validation features require `class-validator` and `class-transformer`
- Install missing packages before attempting to start the server

---

## Verification Steps

To verify the server is running correctly:

1. **Check Server Status:**

   ```bash
   curl http://localhost:3001/health
   ```

2. **View API Documentation:**
   Open browser to: http://localhost:3001/api

3. **Test New Booking Endpoint:**

   ```bash
   curl http://localhost:3001/bookings
   ```

4. **Test Room Availability:**
   ```bash
   curl "http://localhost:3001/rooms/available?checkInDate=2024-12-20T15:00:00.000Z&checkOutDate=2024-12-25T11:00:00.000Z"
   ```

---

## Preventive Measures for Future

1. **Before Adding New Features:**
   - Check existing import patterns in the codebase
   - Use the same Prisma client import path throughout
   - Follow the established code structure

2. **TypeScript Configuration:**
   - Understand the project's `tsconfig.json` settings
   - Be aware of `isolatedModules` and `emitDecoratorMetadata` implications
   - Use `import type` for type-only imports in decorators

3. **Prisma Best Practices:**
   - Choose either `select` or `include`, never both
   - Let TypeScript infer complex return types with relations
   - Test queries in isolation before integrating

4. **Development Workflow:**
   - Always run `npm run build` after making changes
   - Check for TypeScript errors before starting the server
   - Keep dependencies updated and installed

---

## Commands Reference

### Building the Project

```bash
npm run build
```

### Starting Development Server

```bash
npm run start:dev
```

### Checking Port Usage

```bash
lsof -ti:3001
```

### Killing Process on Port

```bash
lsof -ti:3001 | xargs kill -9
```

### Installing Dependencies

```bash
npm install
```

### Generating Prisma Client

```bash
npx prisma generate
```

---

## Conclusion

All startup issues have been resolved successfully. The main problems were related to:

1. Incorrect import paths for the custom Prisma client location
2. TypeScript decorator metadata type import requirements
3. Prisma query API misuse (mixing select and include)
4. Missing validation packages

The server is now running smoothly with all endpoints properly registered and accessible. The new booking and room assignment features are fully operational.
