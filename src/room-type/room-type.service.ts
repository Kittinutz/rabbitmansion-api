import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prima/prisma.service';
import { Prisma, RoomType } from '../../prisma/generated/prisma';

export interface CreateRoomTypeDto {
  code: string;
  name: {
    en: string;
    th: string;
  };
  description?: {
    en?: string;
    th?: string;
  };
  basePrice: number;
  capacity: number;
  bedType: string;
  hasPoolView?: boolean;
  amenities?: string[];
  thumbnailUrl?: string;
  isActive?: boolean;
}

export interface UpdateRoomTypeDto {
  code?: string;
  name?: {
    en?: string;
    th?: string;
  };
  description?: {
    en?: string;
    th?: string;
  };
  basePrice?: number;
  capacity?: number;
  bedType?: string;
  hasPoolView?: boolean;
  amenities?: string[];
  thumbnailUrl?: string | null;
  isActive?: boolean;
}

export interface RoomTypeFilter {
  isActive?: boolean;
  bedType?: string;
  hasPoolView?: boolean;
  capacityMin?: number;
  capacityMax?: number;
  priceMin?: number;
  priceMax?: number;
}

@Injectable()
export class RoomTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoomType(
    createRoomTypeDto: CreateRoomTypeDto,
  ): Promise<RoomType> {
    return this.prisma.roomType.create({
      data: {
        code: createRoomTypeDto.code,
        name: createRoomTypeDto.name as Prisma.JsonObject,
        description:
          (createRoomTypeDto.description as Prisma.JsonObject) || null,
        basePrice: createRoomTypeDto.basePrice,
        capacity: createRoomTypeDto.capacity,
        bedType: createRoomTypeDto.bedType,
        hasPoolView: createRoomTypeDto.hasPoolView || false,
        amenities: createRoomTypeDto.amenities || [],
        isActive: createRoomTypeDto.isActive ?? true,
      },
    });
  }

  async getAllRoomTypes(filter?: RoomTypeFilter): Promise<RoomType[]> {
    const where: Prisma.RoomTypeWhereInput = {};

    if (filter) {
      if (filter.isActive !== undefined) {
        where.isActive = filter.isActive;
      }

      if (filter.bedType) {
        where.bedType = filter.bedType;
      }

      if (filter.hasPoolView !== undefined) {
        where.hasPoolView = filter.hasPoolView;
      }

      if (filter.capacityMin || filter.capacityMax) {
        where.capacity = {};
        if (filter.capacityMin) where.capacity.gte = filter.capacityMin;
        if (filter.capacityMax) where.capacity.lte = filter.capacityMax;
      }

      if (filter.priceMin || filter.priceMax) {
        where.basePrice = {};
        if (filter.priceMin) where.basePrice.gte = filter.priceMin;
        if (filter.priceMax) where.basePrice.lte = filter.priceMax;
      }
    }

    return this.prisma.roomType.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            status: true,
          },
        },
      },
    });
  }

  async getActiveRoomTypes(): Promise<RoomType[]> {
    return this.prisma.roomType.findMany({
      where: { isActive: true },
      orderBy: { basePrice: 'asc' },
    });
  }

  async getRoomTypeById(id: string): Promise<RoomType> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            status: true,
            floor: true,
          },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID ${id} not found`);
    }

    return roomType;
  }

  async getRoomTypeByCode(code: string): Promise<RoomType> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { code },
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            status: true,
          },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with code ${code} not found`);
    }

    return roomType;
  }

  async updateRoomType(
    id: string,
    updateRoomTypeDto: UpdateRoomTypeDto,
  ): Promise<RoomType> {
    const existingRoomType = await this.prisma.roomType.findUnique({
      where: { id },
    });

    if (!existingRoomType) {
      throw new NotFoundException(`Room type with ID ${id} not found`);
    }

    const updateData: Prisma.RoomTypeUpdateInput = {};

    if (updateRoomTypeDto.code) updateData.code = updateRoomTypeDto.code;
    if (updateRoomTypeDto.name)
      updateData.name = updateRoomTypeDto.name as Prisma.JsonObject;
    if (updateRoomTypeDto.description !== undefined) {
      updateData.description =
        (updateRoomTypeDto.description as Prisma.JsonObject) || null;
    }
    if (updateRoomTypeDto.basePrice)
      updateData.basePrice = updateRoomTypeDto.basePrice;
    if (updateRoomTypeDto.capacity)
      updateData.capacity = updateRoomTypeDto.capacity;
    if (updateRoomTypeDto.bedType)
      updateData.bedType = updateRoomTypeDto.bedType;
    if (updateRoomTypeDto.hasPoolView !== undefined)
      updateData.hasPoolView = updateRoomTypeDto.hasPoolView;
    if (updateRoomTypeDto.amenities)
      updateData.amenities = updateRoomTypeDto.amenities;
    if (updateRoomTypeDto.isActive !== undefined)
      updateData.isActive = updateRoomTypeDto.isActive;

    return this.prisma.roomType.update({
      where: { id },
      data: updateData,
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            status: true,
          },
        },
      },
    });
  }

  async deleteRoomType(id: string): Promise<void> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        rooms: true,
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID ${id} not found`);
    }

    if (roomType.rooms.length > 0) {
      throw new NotFoundException(
        `Cannot delete room type ${roomType.code} as it has ${roomType.rooms.length} associated rooms`,
      );
    }

    await this.prisma.roomType.delete({
      where: { id },
    });
  }

  async getRoomTypeStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withRooms: number;
  }> {
    const [total, active, withRooms] = await Promise.all([
      this.prisma.roomType.count(),
      this.prisma.roomType.count({ where: { isActive: true } }),
      this.prisma.roomType.count({
        where: {
          rooms: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      withRooms,
    };
  }
}
