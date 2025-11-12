import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RoomType, RoomStatus, Prisma } from '../generated/prisma';

export interface CreateRoomDto {
  roomNumber: string;
  roomType: RoomType;
  status?: RoomStatus;
  price?: number;
  description?: string;
  amenities?: string[];
}

export interface UpdateRoomDto {
  roomType?: RoomType;
  status?: RoomStatus;
  price?: number;
  description?: string;
  amenities?: string[];
}

export interface RoomFilter {
  roomType?: RoomType;
  status?: RoomStatus;
  floor?: number;
  priceMin?: number;
  priceMax?: number;
}

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async createRoom(data: CreateRoomDto) {
    // Validate room number format
    if (!this.isValidRoomNumber(data.roomNumber)) {
      throw new BadRequestException(
        'Invalid room number format. Must be in format 1xx, 2xx, or 3xx where xx is 01-12',
      );
    }

    // Check if room already exists
    const existingRoom = await this.prisma.room.findUnique({
      where: { roomNumber: data.roomNumber },
    });

    if (existingRoom) {
      throw new BadRequestException(`Room ${data.roomNumber} already exists`);
    }

    const floor = this.getFloorFromRoomNumber(data.roomNumber);

    return this.prisma.room.create({
      data: {
        ...data,
        floor,
        amenities: data.amenities || [],
      },
    });
  }

  async getAllRooms(filter?: RoomFilter) {
    const where: Prisma.RoomWhereInput = {};

    if (filter?.roomType) {
      where.roomType = filter.roomType;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.floor) {
      where.floor = filter.floor;
    }
    if (filter?.priceMin || filter?.priceMax) {
      where.price = {};
      if (filter.priceMin) {
        where.price.gte = filter.priceMin;
      }
      if (filter.priceMax) {
        where.price.lte = filter.priceMax;
      }
    }

    return this.prisma.room.findMany({
      where,
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoomById(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async getRoomByNumber(roomNumber: string) {
    const room = await this.prisma.room.findUnique({
      where: { roomNumber },
    });

    if (!room) {
      throw new NotFoundException(`Room ${roomNumber} not found`);
    }

    return room;
  }

  async updateRoom(id: number, data: UpdateRoomDto) {
    await this.getRoomById(id); // Check if room exists

    return this.prisma.room.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async deleteRoom(id: number) {
    await this.getRoomById(id); // Check if room exists

    return this.prisma.room.delete({
      where: { id },
    });
  }

  async getRoomsByType(roomType: RoomType) {
    return this.prisma.room.findMany({
      where: { roomType },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getAvailableRooms() {
    return this.prisma.room.findMany({
      where: { status: RoomStatus.AVAILABLE },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoomsByFloor(floor: number) {
    return this.prisma.room.findMany({
      where: { floor },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async updateRoomStatus(id: number, status: RoomStatus) {
    return this.updateRoom(id, { status });
  }

  async initializeAllRooms() {
    const roomsToCreate: Array<{
      roomNumber: string;
      roomType: RoomType;
      floor: number;
      status: RoomStatus;
      price: number;
      amenities: string[];
    }> = [];

    // Generate room numbers for floors 1, 2, 3 (1xx, 2xx, 3xx where xx = 01-12)
    for (let floor = 1; floor <= 3; floor++) {
      for (let roomNum = 1; roomNum <= 12; roomNum++) {
        const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;

        // Assign room types based on floor
        let roomType: RoomType;
        if (floor === 1) {
          roomType = 'STANDARD_OPPOSITE_POOL' as RoomType;
        } else if (floor === 2) {
          roomType = 'DOUBLE_BED' as RoomType;
        } else {
          roomType = 'SUPERIOR' as RoomType;
        }

        roomsToCreate.push({
          roomNumber,
          roomType,
          floor,
          status: 'AVAILABLE' as RoomStatus,
          price: this.getDefaultPrice(roomType),
          amenities: this.getDefaultAmenities(roomType),
        });
      }
    }

    // Create rooms in batch
    const createdRooms: any[] = [];
    for (const roomData of roomsToCreate) {
      try {
        const room = await this.prisma.room.create({ data: roomData });
        createdRooms.push(room);
      } catch (error: any) {
        // Skip if room already exists
        if (error.code === 'P2002') {
          console.log(
            `Room ${roomData.roomNumber} already exists, skipping...`,
          );
        } else {
          throw error;
        }
      }
    }

    return createdRooms;
  }

  private isValidRoomNumber(roomNumber: string): boolean {
    // Valid format: 1xx, 2xx, 3xx where xx is 01-12
    const regex = /^[1-3](0[1-9]|1[0-2])$/;
    return regex.test(roomNumber);
  }

  private getFloorFromRoomNumber(roomNumber: string): number {
    return parseInt(roomNumber.charAt(0));
  }

  private getDefaultPrice(roomType: RoomType): number {
    switch (roomType) {
      case 'STANDARD_OPPOSITE_POOL':
        return 2500;
      case 'DOUBLE_BED':
        return 3000;
      case 'SUPERIOR':
        return 4000;
      default:
        return 2500;
    }
  }

  private getDefaultAmenities(roomType: RoomType): string[] {
    const baseAmenities = [
      'WiFi',
      'Air Conditioning',
      'Television',
      'Private Bathroom',
    ];

    switch (roomType) {
      case 'STANDARD_OPPOSITE_POOL':
        return [...baseAmenities, 'Pool View', 'Balcony'];
      case 'DOUBLE_BED':
        return [...baseAmenities, 'King Size Bed', 'Mini Fridge'];
      case 'SUPERIOR':
        return [
          ...baseAmenities,
          'King Size Bed',
          'Mini Fridge',
          'City View',
          'Room Service',
          'Safe Box',
        ];
      default:
        return baseAmenities;
    }
  }
}
