import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RoomStatus, Prisma } from '../prisma/generated/prisma';

export interface CreateRoomDto {
  roomNumber: string;
  roomTypeId: string; // Now references RoomType table
  status?: RoomStatus;
  basePrice?: number;
  description?: string;
  amenities?: string[];
}

export interface UpdateRoomDto {
  roomTypeId?: string; // Now references RoomType table
  status?: RoomStatus;
  basePrice?: number;
  description?: string;
  amenities?: string[];
}

export interface RoomFilter {
  roomTypeId?: string; // Now references RoomType table
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
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

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
        roomNumber: data.roomNumber,
        roomType: data.roomType,
        floor,
        basePrice: data.price || 2500, // Use provided price or default
        name: {
          en: `${data.roomType} Room ${data.roomNumber}`,
          th: `ห้อง ${data.roomType} ${data.roomNumber}`,
        },
        description: {
          en:
            data.description ||
            `Comfortable ${data.roomType.toLowerCase()} room`,
          th:
            data.description ||
            `ห้อง ${data.roomType.toLowerCase()} ที่สะดวกสบาย`,
        },
        amenities: data.amenities || [],
        status: data.status || 'AVAILABLE',
      },
    });
  }

  async getAllRooms(filter?: RoomFilter) {
    const where: Prisma.RoomWhereInput = {};

    if (filter?.roomTypeId) {
      where.roomTypeId = filter.roomTypeId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.floor) {
      where.floor = filter.floor;
    }
    if (filter?.priceMin || filter?.priceMax) {
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
      include: {
        roomType: true,
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async getRoomByNumber(roomNumber: string) {
    const room = await this.prisma.room.findUnique({
      where: { roomNumber },
      include: {
        roomType: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Room ${roomNumber} not found`);
    }

    return room;
  }

  async updateRoom(id: string, data: UpdateRoomDto) {
    await this.getRoomById(id); // Check if room exists

    // Verify room type exists if provided
    if (data.roomTypeId) {
      const roomType = await this.prisma.roomType.findUnique({
        where: { id: data.roomTypeId },
      });

      if (!roomType) {
        throw new BadRequestException(
          `Room type with ID ${data.roomTypeId} not found`,
        );
      }
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        roomType: true,
      },
    });
  }

  async deleteRoom(id: string) {
    await this.getRoomById(id); // Check if room exists

    return this.prisma.room.delete({
      where: { id },
    });
  }

  async getRoomsByType(roomTypeId: string) {
    return this.prisma.room.findMany({
      where: { roomTypeId },
      include: {
        roomType: true,
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getAvailableRooms() {
    return this.prisma.room.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        roomType: true,
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoomsByFloor(floor: number) {
    return this.prisma.room.findMany({
      where: { floor },
      include: {
        roomType: true,
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async updateRoomStatus(id: string, status: RoomStatus) {
    return this.updateRoom(id, { status });
  }

  async initializeAllRooms() {
    const roomsToCreate: Array<{
      roomNumber: string;
      roomType: RoomType;
      floor: number;
      status: RoomStatus;
      basePrice: number;
      name: { en: string; th: string };
      description: { en: string; th: string };
      amenities: string[];
    }> = [];

    // Generate room numbers for floors 1, 2, 3 (1xx, 2xx, 3xx where xx = 01-12)
    for (let floor = 1; floor <= 3; floor++) {
      for (let roomNum = 1; roomNum <= 12; roomNum++) {
        const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;

        // Assign room types based on floor
        let roomType: RoomType;
        if (floor === 1) {
          roomType = 'STANDARD' as RoomType;
        } else if (floor === 2) {
          roomType = 'DELUXE' as RoomType;
        } else {
          roomType = 'SUITE' as RoomType;
        }

        roomsToCreate.push({
          roomNumber,
          roomType,
          floor,
          status: 'AVAILABLE' as RoomStatus,
          basePrice: this.getDefaultPrice(roomType),
          name: {
            en: `${roomType} Room ${roomNumber}`,
            th: `ห้อง ${roomType} ${roomNumber}`,
          },
          description: {
            en: `Comfortable ${roomType.toLowerCase()} room`,
            th: `ห้อง ${roomType.toLowerCase()} ที่สะดวกสบาย`,
          },
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
      case 'STANDARD':
        return 2500;
      case 'DELUXE':
        return 3500;
      case 'SUITE':
        return 5500;
      case 'PRESIDENTIAL':
        return 8500;
      case 'FAMILY':
        return 4500;
      case 'ACCESSIBLE':
        return 3000;
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
      case 'STANDARD':
        return [...baseAmenities];
      case 'DELUXE':
        return [...baseAmenities, 'Mini Fridge', 'Balcony'];
      case 'SUITE':
        return [
          ...baseAmenities,
          'King Size Bed',
          'Mini Fridge',
          'City View',
          'Room Service',
          'Safe Box',
          'Living Area',
        ];
      case 'PRESIDENTIAL':
        return [
          ...baseAmenities,
          'King Size Bed',
          'Mini Fridge',
          'Ocean View',
          'Room Service',
          'Safe Box',
          'Living Area',
          'Jacuzzi',
          'Butler Service',
        ];
      case 'FAMILY':
        return [
          ...baseAmenities,
          'Extra Beds',
          'Mini Fridge',
          'Family Entertainment',
        ];
      case 'ACCESSIBLE':
        return [
          ...baseAmenities,
          'Wheelchair Access',
          'Accessible Bathroom',
          'Emergency Call System',
        ];
      default:
        return baseAmenities;
    }
  }
}
