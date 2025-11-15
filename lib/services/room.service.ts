// Room Service - Comprehensive hotel room management
// Handles CRUD operations, availability checking, pricing, and room status management

import { PrismaClient } from '../../generated/prisma';
import type {
  RoomCreateInput,
  RoomUpdateInput,
  RoomWithDetails,
  RoomFilters,
  RoomAvailabilityQuery,
  RoomAvailabilityResult,
  PaginationParams,
  ApiResponse,
  DateRange,
} from '../types';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  HotelManagementError,
} from '../types';

export class RoomService {
  constructor(private prisma: PrismaClient) {}

  // ================================
  // CRUD OPERATIONS
  // ================================

  /**
   * Create a new room
   */
  async create(data: RoomCreateInput): Promise<RoomWithDetails> {
    try {
      // Check if room number already exists
      const existingRoom = await this.prisma.room.findUnique({
        where: { roomNumber: data.roomNumber },
      });

      if (existingRoom) {
        throw new ConflictError(
          `Room number ${data.roomNumber} already exists`,
        );
      }

      // Validate floor and room number consistency
      const expectedFloor = parseInt(data.roomNumber.charAt(0));
      if (data.floor !== expectedFloor) {
        throw new ValidationError(
          `Room number ${data.roomNumber} should be on floor ${expectedFloor}, not floor ${data.floor}`,
          'floor',
        );
      }

      const room = await this.prisma.room.create({
        data: {
          ...data,
          seasonalPricing: data.seasonalPricing || {},
        },
        include: {
          roomImages: true,
          maintenanceLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      });

      return this.enrichRoomData(room);
    } catch (error) {
      if (error instanceof HotelManagementError) {
        throw error;
      }
      throw new HotelManagementError(
        `Failed to create room: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATION_FAILED',
        500,
      );
    }
  }

  /**
   * Get room by ID with full details
   */
  async findById(id: string): Promise<RoomWithDetails> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomImages: true,
        maintenanceLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        bookings: {
          where: {
            OR: [{ status: 'CONFIRMED' }, { status: 'CHECKED_IN' }],
          },
          orderBy: { checkInDate: 'desc' },
          take: 5,
          include: {
            guest: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room', id);
    }

    return this.enrichRoomData(room);
  }

  /**
   * Get room by room number
   */
  async findByRoomNumber(roomNumber: string): Promise<RoomWithDetails> {
    const room = await this.prisma.room.findUnique({
      where: { roomNumber },
      include: {
        roomImages: true,
        maintenanceLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        bookings: {
          where: {
            checkOutDate: { gte: new Date() },
          },
          orderBy: { checkInDate: 'asc' },
          take: 3,
          include: {
            guest: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room', `room number ${roomNumber}`);
    }

    return this.enrichRoomData(room);
  }

  /**
   * Update room information
   */
  async update(data: RoomUpdateInput): Promise<RoomWithDetails> {
    const { id, ...updateData } = data;

    // Verify room exists
    await this.findById(id);

    // If updating room number, check for conflicts
    if (updateData.roomNumber) {
      const existingRoom = await this.prisma.room.findFirst({
        where: {
          roomNumber: updateData.roomNumber,
          NOT: { id },
        },
      });

      if (existingRoom) {
        throw new ConflictError(
          `Room number ${updateData.roomNumber} already exists`,
        );
      }
    }

    const room = await this.prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        roomImages: true,
        maintenanceLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    return this.enrichRoomData(room);
  }

  /**
   * Delete a room (soft delete by setting isActive to false)
   */
  async delete(id: string): Promise<void> {
    // Verify room exists
    await this.findById(id);

    // Check for active bookings
    const activeBookings = await this.prisma.booking.count({
      where: {
        roomId: id,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
    });

    if (activeBookings > 0) {
      throw new ConflictError(
        `Cannot delete room with ${activeBookings} active booking(s). Cancel bookings first.`,
      );
    }

    await this.prisma.room.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Permanently delete a room
   */
  async permanentDelete(id: string): Promise<void> {
    // Verify room exists
    await this.findById(id);

    // Check for any bookings
    const bookingCount = await this.prisma.booking.count({
      where: { roomId: id },
    });

    if (bookingCount > 0) {
      throw new ConflictError(
        `Cannot permanently delete room with ${bookingCount} booking(s) in history.`,
      );
    }

    await this.prisma.room.delete({
      where: { id },
    });
  }

  // ================================
  // LISTING & FILTERING
  // ================================

  /**
   * Get all rooms with filtering, sorting, and pagination
   */
  async findMany(
    filters: RoomFilters = {},
    pagination: PaginationParams = {},
  ): Promise<ApiResponse<RoomWithDetails[]>> {
    const { roomType, status, floor, priceRange, amenities, search } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'roomNumber',
      sortOrder = 'asc',
    } = pagination;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (roomType?.length) {
      where.roomType = { in: roomType };
    }

    if (status?.length) {
      where.status = { in: status };
    }

    if (floor?.length) {
      where.floor = { in: floor };
    }

    if (priceRange) {
      where.basePrice = {
        gte: priceRange.min,
        lte: priceRange.max,
      };
    }

    if (amenities?.length) {
      where.amenities = {
        hasEvery: amenities,
      };
    }

    if (search) {
      where.OR = [
        { roomNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          roomImages: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    const enrichedRooms = await Promise.all(
      rooms.map((room) => this.enrichRoomData(room)),
    );

    return {
      success: true,
      data: enrichedRooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available rooms for specific dates
   */
  async findAvailable(
    query: RoomAvailabilityQuery,
    pagination: PaginationParams = {},
  ): Promise<ApiResponse<RoomAvailabilityResult[]>> {
    const { checkInDate, checkOutDate, roomType, maxOccupancy, amenities } =
      query;

    const {
      page = 1,
      limit = 20,
      sortBy = 'basePrice',
      sortOrder = 'asc',
    } = pagination;

    const skip = (page - 1) * limit;

    // Build base filters
    const where: any = {
      isActive: true,
      status: { in: ['AVAILABLE', 'CLEANING'] },
    };

    if (roomType) {
      where.roomType = roomType;
    }

    if (maxOccupancy) {
      where.maxOccupancy = { gte: maxOccupancy };
    }

    if (amenities?.length) {
      where.amenities = { hasEvery: amenities };
    }

    // Get potentially available rooms
    const potentialRooms = await this.prisma.room.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        roomImages: true,
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            OR: [
              {
                checkInDate: { lt: checkOutDate },
                checkOutDate: { gt: checkInDate },
              },
            ],
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    // Filter out rooms with conflicting bookings and calculate pricing
    const availableRooms: RoomAvailabilityResult[] = [];

    for (const room of potentialRooms) {
      const conflictingBookings = room.bookings;
      const isAvailable = conflictingBookings.length === 0;

      if (isAvailable) {
        const enrichedRoom = await this.enrichRoomData(room);
        const price = await this.calculatePrice(
          room.id,
          checkInDate,
          checkOutDate,
        );

        availableRooms.push({
          room: enrichedRoom,
          isAvailable: true,
          price,
        });
      }
    }

    const total = await this.prisma.room.count({ where });

    return {
      success: true,
      data: availableRooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================================
  // AVAILABILITY & PRICING
  // ================================

  /**
   * Check if a specific room is available for given dates
   */
  async checkAvailability(
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<boolean> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true, isActive: true },
    });

    if (!room || !room.isActive || room.status === 'OUT_OF_ORDER') {
      return false;
    }

    const conflictingBookings = await this.prisma.booking.count({
      where: {
        roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            checkInDate: { lt: checkOutDate },
            checkOutDate: { gt: checkInDate },
          },
        ],
      },
    });

    return conflictingBookings === 0;
  }

  /**
   * Calculate price for a room stay including seasonal adjustments
   */
  async calculatePrice(
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<number> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { basePrice: true, seasonalPricing: true },
    });

    if (!room) {
      throw new NotFoundError('Room', roomId);
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights <= 0) {
      throw new ValidationError('Check-out date must be after check-in date');
    }

    // Simple seasonal pricing logic (can be enhanced)
    const month = checkInDate.getMonth();
    let priceMultiplier = 1;

    // Peak season (Dec-Feb, Jul-Aug)
    if ([11, 0, 1, 6, 7].includes(month)) {
      priceMultiplier = 1.5;
    }
    // High season (Mar-May, Sep-Nov)
    else if ([2, 3, 4, 8, 9, 10].includes(month)) {
      priceMultiplier = 1.2;
    }

    const adjustedPrice = room.basePrice * priceMultiplier;
    return adjustedPrice * nights;
  }

  // ================================
  // ROOM STATUS MANAGEMENT
  // ================================

  /**
   * Update room status
   */
  async updateStatus(
    roomId: string,
    status:
      | 'AVAILABLE'
      | 'OCCUPIED'
      | 'MAINTENANCE'
      | 'OUT_OF_ORDER'
      | 'CLEANING',
    notes?: string,
  ): Promise<RoomWithDetails> {
    await this.findById(roomId); // Verify room exists

    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        status,
        notes,
        ...(status === 'CLEANING' && { lastCleaned: new Date() }),
        ...(status === 'MAINTENANCE' && { lastMaintenance: new Date() }),
      },
      include: {
        roomImages: true,
        maintenanceLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    return this.enrichRoomData(room);
  }

  /**
   * Bulk update room status
   */
  async bulkUpdateStatus(
    roomIds: string[],
    status:
      | 'AVAILABLE'
      | 'OCCUPIED'
      | 'MAINTENANCE'
      | 'OUT_OF_ORDER'
      | 'CLEANING',
    notes?: string,
  ): Promise<number> {
    const updateData: any = { status };

    if (notes) updateData.notes = notes;
    if (status === 'CLEANING') updateData.lastCleaned = new Date();
    if (status === 'MAINTENANCE') updateData.lastMaintenance = new Date();

    const result = await this.prisma.room.updateMany({
      where: { id: { in: roomIds }, isActive: true },
      data: updateData,
    });

    return result.count;
  }

  // ================================
  // ANALYTICS & REPORTING
  // ================================

  /**
   * Get room occupancy statistics
   */
  async getOccupancyStats(dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    const [totalRooms, occupiedRooms, bookingStats] = await Promise.all([
      this.prisma.room.count({ where: { isActive: true } }),
      this.prisma.room.count({
        where: {
          isActive: true,
          status: 'OCCUPIED',
        },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: {
          checkInDate: { gte: startDate },
          checkOutDate: { lte: endDate },
        },
        _count: true,
      }),
    ]);

    const occupancyRate =
      totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    return {
      totalRooms,
      occupiedRooms,
      availableRooms: totalRooms - occupiedRooms,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      bookingStats,
    };
  }

  /**
   * Get revenue by room type
   */
  async getRevenueByRoomType(dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    return this.prisma.booking.groupBy({
      by: ['room'],
      where: {
        checkInDate: { gte: startDate },
        checkOutDate: { lte: endDate },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
      },
      _sum: {
        finalAmount: true,
      },
      _count: true,
    });
  }

  // ================================
  // HELPER METHODS
  // ================================

  /**
   * Enrich room data with computed fields
   */
  private async enrichRoomData(room: any): Promise<RoomWithDetails> {
    const now = new Date();

    // Find current booking
    const currentBooking = await this.prisma.booking.findFirst({
      where: {
        roomId: room.id,
        checkInDate: { lte: now },
        checkOutDate: { gte: now },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      include: { guest: true },
    });

    // Find next booking
    const nextBooking = await this.prisma.booking.findFirst({
      where: {
        roomId: room.id,
        checkInDate: { gt: now },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      orderBy: { checkInDate: 'asc' },
    });

    // Calculate current occupancy
    const currentOccupancy = currentBooking?.numberOfGuests || 0;

    return {
      ...room,
      isAvailable: room.status === 'AVAILABLE' && !currentBooking,
      nextBooking,
      currentOccupancy,
    };
  }

  /**
   * Initialize all rooms (bulk creation for setup)
   */
  async initializeRooms(): Promise<{ created: number; skipped: number }> {
    const existingCount = await this.prisma.room.count();

    if (existingCount > 0) {
      return { created: 0, skipped: existingCount };
    }

    // This would typically be called from a setup script
    // For now, return stats that no rooms were created
    return { created: 0, skipped: 0 };
  }
}
