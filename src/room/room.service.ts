import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RoomStatus,
  RoomBookingStatus,
} from '../../prisma/generated/prisma';
import { PrismaService } from 'src/prima/prisma.service';

export interface CreateRoomDto {
  roomNumber: string;
  roomTypeId: string;
  floor: number;
  size?: number;
  accessible?: boolean;
}

export interface UpdateRoomDto {
  roomNumber?: string;
  roomTypeId?: string;
  floor?: number;
  status?: RoomStatus;
  size?: number;
  accessible?: boolean;
  notes?: string;
}

export interface RoomFilter {
  status?: RoomStatus;
  floor?: number;
  priceMin?: number;
  priceMax?: number;
}

export interface RoomAvailabilityFilter {
  checkInDate: Date;
  checkOutDate: Date;
  roomTypeId?: string;
  floor?: number;
  capacity?: number;
}

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async getAllRoomTypes() {
    return this.prisma.roomType.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createRoom(data: CreateRoomDto) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: data.roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    // Type-safe access to JSON fields
    const roomTypeName = roomType.name as { en: string; th: string };
    const roomTypeDescription = roomType.description as {
      en?: string;
      th?: string;
    } | null;

    return this.prisma.room.create({
      data: {
        roomNumber: data.roomNumber,
        roomTypeId: data.roomTypeId,
        floor: data.floor,
        size: data.size,
        accessible: data.accessible || false,
        isActive: true,
        status: 'AVAILABLE',
      },
      include: { roomType: true },
    });
  }

  async getAllRooms(filter: RoomFilter = {}) {
    const where: Prisma.RoomWhereInput = {};

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.floor) {
      where.floor = filter.floor;
    }
    if (filter.priceMin || filter.priceMax) {
      const priceFilter: any = {};
      if (filter.priceMin) {
        priceFilter.gte = filter.priceMin;
      }
      if (filter.priceMax) {
        priceFilter.lte = filter.priceMax;
      }
      where.roomType = {
        basePrice: priceFilter,
      };
    }

    return this.prisma.room.findMany({
      where,
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async getAvailableRooms(availabilityFilter?: RoomAvailabilityFilter) {
    if (availabilityFilter) {
      return this.getAvailableRoomsByDate(availabilityFilter);
    }

    return this.prisma.room.findMany({
      where: {
        status: 'AVAILABLE',
        isActive: true,
      },
      include: {
        roomType: true,
        roomBookings: {
          where: {
            status: { in: ['ASSIGNED', 'CHECKED_IN'] },
          },
          include: {
            booking: true,
          },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async getRoomsByType(roomTypeId: string) {
    return this.prisma.room.findMany({
      where: { roomTypeId },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async getRoomsByFloor(floor: number) {
    return this.prisma.room.findMany({
      where: { floor },
      include: { roomType: true },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoomByNumber(roomNumber: string) {
    const room = await this.prisma.room.findFirst({
      where: { roomNumber },
      include: { roomType: true },
    });

    if (!room) {
      throw new NotFoundException(`Room ${roomNumber} not found`);
    }

    return room;
  }

  async getRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
        roomBookings: {
          include: {
            booking: {
              include: {
                guest: true,
              },
            },
          },
          orderBy: { checkInDate: 'asc' },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async updateRoom(id: string, data: UpdateRoomDto) {
    const room = await this.prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    const updateData: Prisma.RoomUpdateInput = {
      ...data,
      updatedAt: new Date(),
    };

    return this.prisma.room.update({
      where: { id },
      data: updateData,
      include: { roomType: true },
    });
  }

  async updateRoomStatus(id: string, status: RoomStatus) {
    const room = await this.prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return this.prisma.room.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: { roomType: true },
    });
  }

  async deleteRoom(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return this.prisma.room.delete({ where: { id } });
  }

  async initializeAllRooms() {
    const roomTypes = await this.prisma.roomType.findMany();

    if (roomTypes.length === 0) {
      throw new Error('No room types found. Please seed room types first.');
    }

    const roomsToCreate: Prisma.RoomCreateManyInput[] = [];

    for (let floor = 1; floor <= 3; floor++) {
      for (let room = 1; room <= 10; room++) {
        const roomNumber = `${floor}${room.toString().padStart(2, '0')}`;

        let roomTypeIndex: number;
        if (room <= 3) roomTypeIndex = 0;
        else if (room <= 6) roomTypeIndex = Math.min(1, roomTypes.length - 1);
        else roomTypeIndex = Math.min(2, roomTypes.length - 1);

        const roomType = roomTypes[roomTypeIndex];

        if (!roomType) {
          throw new Error(`Room type not found at index ${roomTypeIndex}`);
        }

        const roomTypeName = roomType.name as { en: string; th: string } | null;
        const roomTypeDescription = roomType.description as {
          en?: string;
          th?: string;
        } | null;

        roomsToCreate.push({
          roomNumber,
          roomTypeId: roomType.id,
          floor,
          status: 'AVAILABLE' as RoomStatus,
          size: 35, // Default size
          accessible: false,
          isActive: true,
        });
      }
    }

    await this.prisma.room.deleteMany();
    await this.prisma.room.createMany({ data: roomsToCreate });

    const createdRooms = await this.prisma.room.findMany({
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    return {
      message: `Successfully initialized ${createdRooms.length} rooms`,
      totalRooms: createdRooms.length,
      floors: {
        1: createdRooms.filter((r) => r.floor === 1).map((r) => r.roomNumber),
        2: createdRooms.filter((r) => r.floor === 2).map((r) => r.roomNumber),
        3: createdRooms.filter((r) => r.floor === 3).map((r) => r.roomNumber),
      },
      roomTypes: roomTypes.map((rt) => ({
        id: rt.id,
        code: rt.code,
        name: rt.name,
        count: createdRooms.filter((r) => r.roomTypeId === rt.id).length,
      })),
    };
  }

  async getAvailableRoomsByDate(filter: RoomAvailabilityFilter) {
    const where: Prisma.RoomWhereInput = {
      isActive: true,
      ...(filter.roomTypeId && { roomTypeId: filter.roomTypeId }),
      ...(filter.floor && { floor: filter.floor }),
      ...(filter.capacity && {
        roomType: {
          capacity: { gte: filter.capacity },
        },
      }),
    };

    const rooms = await this.prisma.room.findMany({
      where,
      include: {
        roomType: true,
        roomBookings: {
          where: {
            status: { in: ['ASSIGNED', 'CHECKED_IN'] },
            OR: [
              {
                AND: [
                  { checkInDate: { lte: filter.checkInDate } },
                  { checkOutDate: { gt: filter.checkInDate } },
                ],
              },
              {
                AND: [
                  { checkInDate: { lt: filter.checkOutDate } },
                  { checkOutDate: { gte: filter.checkOutDate } },
                ],
              },
              {
                AND: [
                  { checkInDate: { gte: filter.checkInDate } },
                  { checkOutDate: { lte: filter.checkOutDate } },
                ],
              },
            ],
          },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Filter out rooms that have conflicting bookings
    return rooms.filter((room) => room.roomBookings.length === 0);
  }

  async getRoomAvailability(roomId: string, startDate: Date, endDate: Date) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        roomType: true,
        roomBookings: {
          where: {
            status: { in: ['ASSIGNED', 'CHECKED_IN'] },
            AND: [
              { checkOutDate: { gt: startDate } },
              { checkInDate: { lt: endDate } },
            ],
          },
          include: {
            booking: {
              include: {
                guest: true,
              },
            },
          },
          orderBy: { checkInDate: 'asc' },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return {
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        status: room.status,
        roomType: room.roomType,
      },
      isAvailable: room.roomBookings.length === 0,
      conflictingBookings: room.roomBookings.map((rb) => ({
        id: rb.booking.id,
        bookingNumber: rb.booking.bookingNumber,
        guestName: rb.booking.guest.firstName + ' ' + rb.booking.guest.lastName,
        checkInDate: rb.checkInDate,
        checkOutDate: rb.checkOutDate,
        status: rb.status,
      })),
    };
  }

  async getRoomOccupancyReport(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date();
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const totalRooms = await this.prisma.room.count({
      where: { isActive: true },
    });

    const occupiedRooms = await this.prisma.roomBooking.findMany({
      where: {
        status: { in: ['ASSIGNED', 'CHECKED_IN'] },
        AND: [{ checkOutDate: { gt: start } }, { checkInDate: { lt: end } }],
      },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
        booking: {
          include: {
            guest: true,
          },
        },
      },
    });

    const occupancyRate =
      totalRooms > 0 ? (occupiedRooms.length / totalRooms) * 100 : 0;
    const totalRevenue = occupiedRooms.reduce(
      (sum, rb) => sum + rb.roomRate,
      0,
    );
    const averageDailyRate =
      occupiedRooms.length > 0 ? totalRevenue / occupiedRooms.length : 0;

    return {
      totalRooms,
      occupiedRooms: occupiedRooms.length,
      availableRooms: totalRooms - occupiedRooms.length,
      occupancyRate: parseFloat(occupancyRate.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageDailyRate: parseFloat(averageDailyRate.toFixed(2)),
      period: {
        startDate: start,
        endDate: end,
      },
      roomDetails: occupiedRooms.map((rb) => ({
        roomNumber: rb.room.roomNumber,
        roomType: rb.room.roomType.code,
        guestName: rb.booking.guest.firstName + ' ' + rb.booking.guest.lastName,
        checkInDate: rb.checkInDate,
        checkOutDate: rb.checkOutDate,
        rate: rb.roomRate,
        status: rb.status,
      })),
    };
  }
}
