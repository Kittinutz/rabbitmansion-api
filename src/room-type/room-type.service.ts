import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prima/prisma.service';
import { $Enums, Prisma, RoomType } from '../../prisma/generated/prisma';
import { MinioService } from 'src/minio/minio.service';

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
  bedType: $Enums.BedTypeEnum;
  hasPoolView?: boolean;
  amenities?: $Enums.AmenitiesEnum[];
  thumbnailUrl?: string;
  roomImages?: string[]; // Array of image URLs
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
  bedType?: $Enums.BedTypeEnum;
  hasPoolView?: boolean;
  amenities?: $Enums.AmenitiesEnum[];
  thumbnailUrl?: string | null;
  roomImages?: string[]; // Array of image URLs
  isActive?: boolean;
}

export interface RoomTypeFilter {
  isActive?: boolean;
  bedType?: $Enums.BedTypeEnum;
  hasPoolView?: boolean;
  capacityMin?: number;
  capacityMax?: number;
  priceMin?: number;
  priceMax?: number;
}

@Injectable()
export class RoomTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async createRoomType(
    createRoomTypeDto: CreateRoomTypeDto,
  ): Promise<RoomType> {
    const { roomImages, ...roomTypeData } = createRoomTypeDto;
    const newThumbnailUrl = roomTypeData.thumbnailUrl
      ? await this.minio.moveFile(roomTypeData.thumbnailUrl, 'thumbnails')
      : null;

    const roomType = await this.prisma.roomType.create({
      data: {
        code: roomTypeData.code,
        name: roomTypeData.name as Prisma.JsonObject,
        description: (roomTypeData.description as Prisma.JsonObject) || null,
        basePrice: roomTypeData.basePrice,
        capacity: roomTypeData.capacity,
        bedType: roomTypeData.bedType,
        hasPoolView: roomTypeData.hasPoolView || false,
        amenities: roomTypeData.amenities || [],
        thumbnailUrl: newThumbnailUrl || null,
        isActive: roomTypeData.isActive ?? true,
      },
    });

    // Create room images if provided
    if (roomImages && roomImages.length > 0) {
      await this.createRoomImages(roomType.id, roomType.code, roomImages);
    }

    // Return the room type with images included
    const result = await this.prisma.roomType.findUnique({
      where: { id: roomType.id },
      include: {
        roomImages: true,
      },
    });

    if (!result) {
      throw new Error('Failed to create room type');
    }

    return result;
  }

  // Helper method to create room images with auto-generated alt text
  private async createRoomImages(
    roomTypeId: string,
    roomCode: string,
    imageUrls: string[],
  ): Promise<void> {
    // Move files from temp to room code directory and get new URLs
    // Only move if the file is not already in the correct location
    const movedImageUrls = await Promise.all(
      imageUrls.map(async (url) => {
        try {
          return await this.minio.moveFile(url, `room-types/${roomCode}`);
        } catch (error) {
          // If move fails (e.g., file already in location), return original URL
          console.warn(`Failed to move image ${url}:`, error.message);
          return url;
        }
      }),
    );

    const roomImages = movedImageUrls.map((url, index) => ({
      roomTypeId,
      url,
      alt: `${roomCode}_${index + 1}`,
      isPrimary: index === 0,
      sortOrder: index,
    }));

    await this.prisma.roomImage.createMany({
      data: roomImages,
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
        roomImages: true,
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
    const newThumbnailUrl = updateRoomTypeDto.thumbnailUrl
      ? await this.minio.moveFile(updateRoomTypeDto.thumbnailUrl, 'thumbnails')
      : null;

    console.log({
      newThumbnailUrl,
      updateRoomTypeDtoTBM: updateRoomTypeDto.thumbnailUrl,
    });
    if (!existingRoomType) {
      throw new NotFoundException(`Room type with ID ${id} not found`);
    }

    const { roomImages, ...updateData } = updateRoomTypeDto;

    // Prepare update data
    const prismaUpdateData: Prisma.RoomTypeUpdateInput = {};

    if (updateData.code) prismaUpdateData.code = updateData.code;
    if (updateData.name)
      prismaUpdateData.name = updateData.name as Prisma.JsonObject;
    if (updateData.description !== undefined) {
      prismaUpdateData.description =
        (updateData.description as Prisma.JsonObject) || null;
    }
    if (updateData.basePrice) prismaUpdateData.basePrice = updateData.basePrice;
    if (updateData.capacity) prismaUpdateData.capacity = updateData.capacity;
    if (updateData.bedType) prismaUpdateData.bedType = updateData.bedType;
    if (updateData.hasPoolView !== undefined)
      prismaUpdateData.hasPoolView = updateData.hasPoolView;
    if (updateData.amenities) prismaUpdateData.amenities = updateData.amenities;
    if (updateData.thumbnailUrl !== undefined)
      prismaUpdateData.thumbnailUrl = newThumbnailUrl;
    if (updateData.isActive !== undefined)
      prismaUpdateData.isActive = updateData.isActive;

    // Update room type
    const updatedRoomType = await this.prisma.roomType.update({
      where: { id },
      data: prismaUpdateData,
    });

    // Handle room images update if provided
    if (roomImages !== undefined) {
      // Delete existing room images
      await this.prisma.roomImage.deleteMany({
        where: { roomTypeId: id },
      });

      // Create new room images if any provided
      if (roomImages.length > 0) {
        await this.createRoomImages(id, updatedRoomType.code, roomImages);
      }
    }

    // Return updated room type with images
    const result = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        roomImages: true,
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            status: true,
          },
        },
      },
    });

    if (!result) {
      throw new Error('Failed to update room type');
    }

    return result;
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

  // Delete a single room image by its ID
  async deleteRoomImage(imageId: string): Promise<void> {
    const image = await this.prisma.roomImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Room image with ID ${imageId} not found`);
    }

    await this.prisma.roomImage.delete({
      where: { id: imageId },
    });
  }

  // Delete multiple room images by their IDs
  async deleteRoomImages(
    imageIds: string[],
  ): Promise<{ deletedCount: number }> {
    const result = await this.prisma.roomImage.deleteMany({
      where: {
        id: {
          in: imageIds,
        },
      },
    });

    return { deletedCount: result.count };
  }

  // Delete all images for a specific room type
  async deleteAllRoomTypeImages(
    roomTypeId: string,
  ): Promise<{ deletedCount: number }> {
    // Verify room type exists
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID ${roomTypeId} not found`);
    }

    const result = await this.prisma.roomImage.deleteMany({
      where: { roomTypeId },
    });

    return { deletedCount: result.count };
  }

  // Get a specific room image by ID
  async getRoomImage(imageId: string): Promise<{
    id: string;
    roomTypeId: string;
    url: string;
    alt: string | null;
    caption: any;
    isPrimary: boolean;
    sortOrder: number;
    createdAt: Date;
    roomType: {
      id: string;
      code: string;
      name: any;
    };
  }> {
    const image = await this.prisma.roomImage.findUnique({
      where: { id: imageId },
      include: {
        roomType: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException(`Room image with ID ${imageId} not found`);
    }

    return image;
  }
}
