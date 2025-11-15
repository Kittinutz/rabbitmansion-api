// ================================================================
// USER MANAGEMENT DOMAIN - REFERENCE DOCUMENTATION
// ================================================================
// This file contains all models related to user management and authentication
// Use this as reference when working on user-related features

// Models in this domain:
// - Admin: System administrators and staff
// - Guest: Hotel customers and their profiles

// ================================
// ADMIN MODEL DOCUMENTATION
// ================================

/*
Admin Model Features:
- Unique email and username constraints
- Encrypted password storage
- Role-based access control
- Activity tracking via audit logs
- Booking creation/modification tracking
*/

interface AdminModel {
  id: string; // Unique identifier (cuid)
  email: string; // Unique email address
  username: string; // Unique username for login
  password: string; // Hashed password (bcrypt recommended)
  firstName: string; // First name
  lastName: string; // Last name
  role: string; // Role: "ADMIN", "MANAGER", "RECEPTIONIST"
  isActive: boolean; // Account status
  lastLogin?: Date; // Last login timestamp
  createdAt: Date; // Account creation date
  updatedAt: Date; // Last update timestamp

  // Relations
  auditLogs: AuditLog[]; // All actions performed
  createdBookings: Booking[]; // Bookings created by this admin
  updatedBookings: Booking[]; // Bookings modified by this admin
}

// ================================
// GUEST MODEL DOCUMENTATION
// ================================

/*
Guest Model Features:
- Comprehensive guest profile management
- Multi-language preferences support
- VIP tier system (0=Regular, 1=Silver, 2=Gold, 3=Platinum)
- Automatic stay and spending tracking
- International guest support with passport info
*/

interface GuestModel {
  id: string; // Unique identifier (cuid)
  email: string; // Unique email address
  phone?: string; // Phone number
  firstName: string; // First name
  lastName: string; // Last name
  dateOfBirth?: Date; // Date of birth
  nationality?: string; // Country of nationality
  passport?: string; // Passport number for international guests

  // Address Information
  address?: string; // Street address
  city?: string; // City
  country?: string; // Country
  postalCode?: string; // Postal/ZIP code

  // Guest Profile & Preferences
  preferences: string[]; // ["late_checkout", "room_service", "spa"]
  status: GuestStatus; // ACTIVE, BLOCKED, VIP
  vipLevel: number; // 0=Regular, 1=Silver, 2=Gold, 3=Platinum
  totalStays: number; // Total number of completed stays
  totalSpent: number; // Total amount spent (lifetime value)
  notes?: string; // Staff notes about guest preferences

  createdAt: Date; // Guest registration date
  updatedAt: Date; // Last profile update

  // Relations
  bookings: Booking[]; // All guest bookings
  reviews: Review[]; // Reviews written by guest
  loyaltyProgram?: LoyaltyProgram; // Loyalty program membership
}

// ================================
// ENUMS USED IN USER MANAGEMENT
// ================================

enum GuestStatus {
  ACTIVE = 'ACTIVE', // Regular active guest
  BLOCKED = 'BLOCKED', // Blocked from making bookings
  VIP = 'VIP', // VIP status with special privileges
}

enum AuditAction {
  CREATE = 'CREATE', // Record creation
  UPDATE = 'UPDATE', // Record modification
  DELETE = 'DELETE', // Record deletion
  LOGIN = 'LOGIN', // User login
  LOGOUT = 'LOGOUT', // User logout
}

// ================================
// COMMON QUERIES FOR USER MANAGEMENT
// ================================

/*
Common Admin Queries:
- Find active admins: { where: { isActive: true } }
- Find by role: { where: { role: "MANAGER" } }
- Recent logins: { where: { lastLogin: { gte: recentDate } } }

Common Guest Queries:
- VIP guests: { where: { status: "VIP" } }
- High-value guests: { where: { totalSpent: { gte: 50000 } } }
- Frequent guests: { where: { totalStays: { gte: 10 } } }
- International guests: { where: { passport: { not: null } } }
*/

export type { AdminModel, GuestModel };
export { GuestStatus, AuditAction };
