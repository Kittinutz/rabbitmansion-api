// ================================================================
// ROOM MANAGEMENT DOMAIN - REFERENCE DOCUMENTATION
// ================================================================
// This file contains all models related to room inventory and maintenance
// Use this as reference when working on room-related features

// Models in this domain:
// - Room: Hotel room inventory with multi-language support
// - RoomImage: Media management for rooms
// - MaintenanceLog: Room maintenance and service tracking

// ================================
// ROOM MODEL DOCUMENTATION
// ================================

/*
Room Model Features:
- Multi-language content support (name, description)
- Seasonal pricing adjustments
- Comprehensive amenity tracking
- Accessibility compliance
- Media gallery management
- Maintenance tracking
*/

interface RoomModel {
  id: string;
  roomNumber: string; // "101", "A-205", etc.
  roomType: RoomType; // STANDARD, DELUXE, SUITE, etc.
  status: RoomStatus; // AVAILABLE, OCCUPIED, MAINTENANCE, etc.
  floor: number;
  maxOccupancy: number; // Maximum guests allowed
  bedCount: number; // Number of beds
  bedType?: string; // "King", "Queen", "Twin", "Sofa Bed"
  basePrice: number; // Base nightly rate
  seasonalPricing?: Json; // {"peak": 1.5, "low": 0.8} multipliers

  // Room Features
  size?: number; // Room size in square meters
  view?: string; // "Ocean", "City", "Garden", "Pool"
  smokingAllowed: boolean; // Smoking permission
  petFriendly: boolean; // Pet-friendly room
  accessible: boolean; // ADA compliance

  // Multi-language Content
  name: Json; // {"en": "Deluxe Room", "th": "ห้องดีลักซ์"}
  description: Json; // Multi-language descriptions
  amenities: string[]; // ["wifi", "minibar", "balcony", "jacuzzi"]

  // Media Content
  mainImage?: string; // Primary room photo URL
  galleryImages: string[]; // Additional room photos
  bannerImage?: string; // Featured banner image

  // Maintenance & Operations
  lastCleaned?: Date; // Last cleaning timestamp
  lastMaintenance?: Date; // Last maintenance timestamp
  notes?: string; // Staff notes about room conditions
  isActive: boolean; // Room availability for booking
  createdAt: Date;
  updatedAt: Date;

  // Relations
  bookings: Booking[];
  roomImages: RoomImage[];
  maintenanceLogs: MaintenanceLog[];
}

// ================================
// ROOM IMAGE DOCUMENTATION
// ================================

interface RoomImageModel {
  id: string;
  roomId: string;
  url: string; // Image URL or file path
  alt?: string; // Alt text for accessibility
  caption?: Json; // {"en": "Ocean view", "th": "วิวทะเล"}
  isPrimary: boolean; // Primary image flag
  sortOrder: number; // Display order
  createdAt: Date;

  room: Room;
}

// ================================
// MAINTENANCE LOG DOCUMENTATION
// ================================

interface MaintenanceLogModel {
  id: string;
  roomId: string;
  type: string; // "Cleaning", "Repair", "Inspection", "Renovation"
  description: string; // Detailed work description
  cost?: number; // Maintenance cost
  performedBy: string; // Staff member or contractor
  startTime: Date; // Maintenance start time
  endTime?: Date; // Maintenance completion time
  isCompleted: boolean; // Completion status
  notes?: string; // Additional notes
  createdAt: Date;

  room: Room;
}

// ================================
// ROOM MANAGEMENT ENUMS
// ================================

enum RoomType {
  STANDARD = 'STANDARD', // Standard rooms with basic amenities
  DELUXE = 'DELUXE', // Enhanced rooms with additional features
  SUITE = 'SUITE', // Multi-room suites with living areas
  PRESIDENTIAL = 'PRESIDENTIAL', // Luxury suites with premium amenities
  FAMILY = 'FAMILY', // Family-oriented rooms with extra space
  ACCESSIBLE = 'ACCESSIBLE', // ADA compliant rooms
}

enum RoomStatus {
  AVAILABLE = 'AVAILABLE', // Ready for booking
  OCCUPIED = 'OCCUPIED', // Currently has guests
  MAINTENANCE = 'MAINTENANCE', // Under scheduled maintenance
  OUT_OF_ORDER = 'OUT_OF_ORDER', // Temporarily unavailable
  CLEANING = 'CLEANING', // Being cleaned between guests
}

// ================================
// COMMON ROOM QUERIES
// ================================

/*
Availability Check:
{
  where: {
    status: "AVAILABLE",
    isActive: true,
    bookings: {
      none: {
        OR: [
          { checkInDate: { lte: checkOut }, checkOutDate: { gt: checkIn } }
        ]
      }
    }
  }
}

Rooms by Type:
{ where: { roomType: "DELUXE", isActive: true } }

Rooms by Floor:
{ where: { floor: 2 } }

Rooms Needing Maintenance:
{ where: { status: "MAINTENANCE" } }

VIP Accessible Rooms:
{ where: { accessible: true, roomType: { in: ["SUITE", "PRESIDENTIAL"] } } }
*/

export type { RoomModel, RoomImageModel, MaintenanceLogModel };
export { RoomType, RoomStatus };
