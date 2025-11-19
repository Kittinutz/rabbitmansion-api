import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoomStatus } from '../../prisma/generated/prisma';
import { PrismaService } from 'src/prima/prisma.service';

export interface CreateRoomDto {
  roomNumber: string;
  roomTypeId: string;
  floor: number;
  basePrice?: number;
  maxOccupancy?: number;
  amenities?: string[];
  bedType?: string;
  view?: string;
  size?: number;
}

export interface UpdateRoomDto {
  roomNumber?: string;
  roomTypeId?: string;
  floor?: number;
  basePrice?: number;
  maxOccupancy?: number;
  status?: RoomStatus;
  amenities?: string[];
  bedType?: string;
  view?: string;
  size?: number;
}

export interface RoomFilter {
  status?: RoomStatus;
  floor?: number;
  priceMin?: number;
  priceMax?: number;
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
        basePrice: data.basePrice || roomType.basePrice,
        maxOccupancy: data.maxOccupancy || roomType.capacity,
        amenities: data.amenities || roomType.amenities,
        bedType: data.bedType || roomType.bedType,
        view: data.view,
        size: data.size,
        name: {
          en: `${roomTypeName.en} ${data.roomNumber}`,
          th: `${roomTypeName.th} ${data.roomNumber}`,
        },
        description: {
          en: roomTypeDescription?.en || `Comfortable room ${data.roomNumber}`,
          th: roomTypeDescription?.th || `ห้องพัก ${data.roomNumber}`,
        },
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
      where.basePrice = {};
      if (filter.priceMin) {
        where.basePrice.gte = filter.priceMin;
      }
      if (filter.priceMax) {
        where.basePrice.lte = filter.priceMax;
      }
    }

    return this.prisma.room.findMany({
      where,
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async getAvailableRooms() {
    return this.prisma.room.findMany({
      where: { status: 'AVAILABLE' },
      include: { roomType: true },
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
      include: { roomType: true },
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
          basePrice: roomType.basePrice,
          maxOccupancy: roomType.capacity,
          amenities: roomType.amenities || [],
          status: 'AVAILABLE' as RoomStatus,
          name: {
            en: roomTypeName?.en
              ? `${roomTypeName.en} ${roomNumber}`
              : `Room ${roomNumber}`,
            th: roomTypeName?.th
              ? `${roomTypeName.th} ${roomNumber}`
              : `ห้องพัก ${roomNumber}`,
          },
          description: {
            en: roomTypeDescription?.en || `Comfortable room ${roomNumber}`,
            th: roomTypeDescription?.th || `ห้องพัก ${roomNumber}`,
          },
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
}
