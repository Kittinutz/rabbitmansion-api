import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RoomTypeService } from './room-type.service';
import { MinioService } from '../minio/minio.service';
import { $Enums } from '../../prisma/generated/prisma';
import type {
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  RoomTypeFilter,
} from './room-type.service';
import type { CheckAvailabilityDto } from './dto/check-availability.dto';
import type { AvailabilityResponse } from './types/availability-response.type';
import type { IndividualRoomTypeAvailability } from './types/individual-availability-response.type';

@ApiTags('room-types')
@Controller('room-types')
export class RoomTypeController {
  constructor(
    private readonly roomTypeService: RoomTypeService,
    private readonly minioService: MinioService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new room type',
    description: 'Creates a new room type with multilingual support',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'name', 'basePrice', 'capacity', 'bedType'],
      properties: {
        code: { type: 'string', example: 'DELUXE_DOUBLE' },
        name: {
          type: 'object',
          properties: {
            en: { type: 'string', example: 'Deluxe Double Room' },
            th: { type: 'string', example: 'ห้องดีลักซ์ดับเบิล' },
          },
        },
        description: {
          type: 'object',
          properties: {
            en: {
              type: 'string',
              example: 'Comfortable double room with modern amenities',
            },
            th: {
              type: 'string',
              example: 'ห้องดับเบิลสะดวกสบายพร้อมสิ่งอำนวยความสะดวกทันสมัย',
            },
          },
        },
        basePrice: { type: 'number', example: 2500 },
        capacity: { type: 'number', example: 2 },
        bedType: {
          type: 'string',
          enum: [
            $Enums.BedTypeEnum.SINGLE,
            $Enums.BedTypeEnum.DOUBLE,
            $Enums.BedTypeEnum.QUEEN,
            $Enums.BedTypeEnum.KING,
            $Enums.BedTypeEnum.TWIN,
          ],
          example: 'DOUBLE',
        },
        hasPoolView: { type: 'boolean', example: false },
        amenities: {
          type: 'array',
          items: { type: 'string' },
          example: ['WiFi', 'Air Conditioning', 'TV', 'Minibar'],
        },
        thumbnailUrl: {
          type: 'string',
          example:
            'http://localhost:9000/hotel-assets/room-types/deluxe-double.jpg',
          description: 'URL of the room type thumbnail image in MinIO storage',
        },
        roomImages: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'http://localhost:9000/hotel-assets/room-images/deluxe-double-1.jpg',
            'http://localhost:9000/hotel-assets/room-images/deluxe-double-2.jpg',
          ],
          description: 'Array of room image URLs for gallery',
        },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Room type created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async createRoomType(@Body() createRoomTypeDto: CreateRoomTypeDto) {
    return this.roomTypeService.createRoomType(createRoomTypeDto);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Check room type availability',
    description:
      'Returns available room types with slot counts for specified check-in and check-out dates',
  })
  @ApiQuery({
    name: 'checkInDate',
    type: String,
    required: true,
    description:
      'Check-in date in ISO 8601 format (e.g., 2025-12-20T14:00:00Z or 2025-12-20)',
    example: '2025-12-20T14:00:00Z',
  })
  @ApiQuery({
    name: 'checkOutDate',
    type: String,
    required: true,
    description:
      'Check-out date in ISO 8601 format (e.g., 2025-12-25T12:00:00Z or 2025-12-25)',
    example: '2025-12-25T12:00:00Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Room type availability retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        checkInDate: {
          type: 'string',
          example: '2025-12-20T14:00:00.000Z',
        },
        checkOutDate: {
          type: 'string',
          example: '2025-12-25T12:00:00.000Z',
        },
        totalAvailableRooms: {
          type: 'number',
          example: 35,
        },
        availableRoomTypes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              roomType: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  basePrice: { type: 'number' },
                  maxOccupancy: { type: 'number' },
                  bedType: { type: 'string' },
                  roomSize: { type: 'number' },
                  amenities: { type: 'array', items: { type: 'string' } },
                  thumbnailUrl: { type: 'string', nullable: true },
                },
              },
              totalRooms: { type: 'number', example: 10 },
              availableRooms: { type: 'number', example: 7 },
              occupiedRooms: { type: 'number', example: 3 },
              availabilityPercentage: { type: 'number', example: 70 },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid date range or dates in the past',
  })
  async checkAvailability(
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ): Promise<AvailabilityResponse> {
    // Parse dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Validate dates
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use ISO 8601 format.',
      );
    }

    const result = await this.roomTypeService.getAvailableRoomTypes(
      checkIn,
      checkOut,
    );
    return result;
  }

  @Get('availability/:roomTypeId')
  @ApiOperation({
    summary: 'Check individual room type availability',
    description:
      'Returns detailed availability information for a specific room type during the specified dates',
  })
  @ApiParam({
    name: 'roomTypeId',
    type: String,
    required: true,
    description: 'UUID of the room type',
    example: 'cm4u1234abcd5678efgh9012',
  })
  @ApiQuery({
    name: 'checkInDate',
    type: String,
    required: true,
    description:
      'Check-in date in ISO 8601 format (e.g., 2025-12-20T14:00:00Z or 2025-12-20)',
    example: '2025-12-20T14:00:00Z',
  })
  @ApiQuery({
    name: 'checkOutDate',
    type: String,
    required: true,
    description:
      'Check-out date in ISO 8601 format (e.g., 2025-12-25T12:00:00Z or 2025-12-25)',
    example: '2025-12-25T12:00:00Z',
  })
  @ApiQuery({
    name: 'includeRoomList',
    type: Boolean,
    required: false,
    description: 'Include list of specific available rooms (default: true)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Room type availability retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        roomTypeId: { type: 'string' },
        checkInDate: { type: 'string', example: '2025-12-20T14:00:00.000Z' },
        checkOutDate: { type: 'string', example: '2025-12-25T12:00:00.000Z' },
        roomType: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            name: { type: 'object' },
            description: { type: 'object' },
            basePrice: { type: 'number' },
            capacity: { type: 'number' },
            bedType: { type: 'string' },
            amenities: { type: 'array', items: { type: 'string' } },
            hasPoolView: { type: 'boolean' },
            thumbnailUrl: { type: 'string', nullable: true },
            roomImages: { type: 'array' },
          },
        },
        availability: {
          type: 'object',
          properties: {
            totalRooms: { type: 'number', example: 10 },
            availableRooms: { type: 'number', example: 7 },
            occupiedRooms: { type: 'number', example: 3 },
            availabilityPercentage: { type: 'number', example: 70 },
            isAvailable: { type: 'boolean', example: true },
          },
        },
        availableRoomList: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              roomId: { type: 'string' },
              roomNumber: { type: 'string' },
              floor: { type: 'number' },
              size: { type: 'number', nullable: true },
              accessible: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Room type not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid date range or dates in the past',
  })
  async checkIndividualRoomTypeAvailability(
    @Param('roomTypeId') roomTypeId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
    @Query('includeRoomList') includeRoomList?: string,
  ): Promise<IndividualRoomTypeAvailability> {
    // Parse dates with UTC handling
    let checkIn: Date;
    let checkOut: Date;

    try {
      const checkInStr = checkInDate.includes('T')
        ? checkInDate
        : `${checkInDate}T00:00:00Z`;
      const checkOutStr = checkOutDate.includes('T')
        ? checkOutDate
        : `${checkOutDate}T00:00:00Z`;

      checkIn = new Date(checkInStr);
      checkOut = new Date(checkOutStr);

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
    } catch (error) {
      console.error('Date parsing error:', error);
      throw new BadRequestException(
        'Invalid date format. Use ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ',
      );
    }

    // Parse includeRoomList (default to true)
    const shouldIncludeRoomList = includeRoomList === 'false' ? false : true;

    return this.roomTypeService.getIndividualRoomTypeAvailability(
      roomTypeId,
      checkIn,
      checkOut,
      shouldIncludeRoomList,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all room types with optional filtering',
    description: 'Retrieves all room types with optional filters',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'bedType',
    required: false,
    enum: $Enums.BedTypeEnum,
    description: 'Filter by bed type (SINGLE, DOUBLE, QUEEN, KING, TWIN)',
  })
  @ApiQuery({
    name: 'hasPoolView',
    required: false,
    type: 'boolean',
    description: 'Filter by pool view availability',
  })
  @ApiQuery({
    name: 'capacityMin',
    required: false,
    type: 'number',
    description: 'Minimum capacity filter',
  })
  @ApiQuery({
    name: 'capacityMax',
    required: false,
    type: 'number',
    description: 'Maximum capacity filter',
  })
  @ApiQuery({
    name: 'priceMin',
    required: false,
    type: 'number',
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'priceMax',
    required: false,
    type: 'number',
    description: 'Maximum price filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Room types retrieved successfully',
  })
  async getAllRoomTypes(
    @Query()
    query: {
      isActive?: string;
      bedType?: string;
      hasPoolView?: string;
      capacityMin?: string;
      capacityMax?: string;
      priceMin?: string;
      priceMax?: string;
    },
  ) {
    const filter: RoomTypeFilter = {};

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    if (query.bedType) {
      // Convert string to enum
      if (
        Object.values($Enums.BedTypeEnum).includes(
          query.bedType as $Enums.BedTypeEnum,
        )
      ) {
        filter.bedType = query.bedType as $Enums.BedTypeEnum;
      } else {
        throw new BadRequestException(`Invalid bedType: ${query.bedType}`);
      }
    }

    if (query.hasPoolView !== undefined) {
      filter.hasPoolView = query.hasPoolView === 'true';
    }

    if (query.capacityMin) {
      const capacityMin = parseInt(query.capacityMin);
      if (isNaN(capacityMin) || capacityMin < 1) {
        throw new BadRequestException(
          'Minimum capacity must be a positive number',
        );
      }
      filter.capacityMin = capacityMin;
    }

    if (query.capacityMax) {
      const capacityMax = parseInt(query.capacityMax);
      if (isNaN(capacityMax) || capacityMax < 1) {
        throw new BadRequestException(
          'Maximum capacity must be a positive number',
        );
      }
      filter.capacityMax = capacityMax;
    }

    if (query.priceMin) {
      const priceMin = parseFloat(query.priceMin);
      if (isNaN(priceMin) || priceMin < 0) {
        throw new BadRequestException(
          'Minimum price must be a positive number',
        );
      }
      filter.priceMin = priceMin;
    }

    if (query.priceMax) {
      const priceMax = parseFloat(query.priceMax);
      if (isNaN(priceMax) || priceMax < 0) {
        throw new BadRequestException(
          'Maximum price must be a positive number',
        );
      }
      filter.priceMax = priceMax;
    }

    return this.roomTypeService.getAllRoomTypes(filter);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get all active room types',
    description: 'Retrieves all room types that are currently active',
  })
  @ApiResponse({
    status: 200,
    description: 'Active room types retrieved successfully',
  })
  async getActiveRoomTypes() {
    return this.roomTypeService.getActiveRoomTypes();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get room type statistics',
    description: 'Retrieves statistics about room types',
  })
  @ApiResponse({
    status: 200,
    description: 'Room type statistics retrieved successfully',
  })
  async getRoomTypeStats() {
    return this.roomTypeService.getRoomTypeStats();
  }

  @Get('code/:code')
  @ApiOperation({
    summary: 'Get room type by code',
    description: 'Retrieves a specific room type by its code',
  })
  @ApiParam({
    name: 'code',
    type: 'string',
    description: 'Room type code (e.g., "DELUXE_DOUBLE")',
  })
  @ApiResponse({
    status: 200,
    description: 'Room type retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room type not found',
  })
  async getRoomTypeByCode(@Param('code') code: string) {
    return this.roomTypeService.getRoomTypeByCode(code);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room type by ID',
    description: 'Retrieves a specific room type by its ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Room type retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room type not found',
  })
  async getRoomTypeById(@Param('id') id: string) {
    return this.roomTypeService.getRoomTypeById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a room type',
    description: 'Updates room type details by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: {
          type: 'object',
          properties: {
            en: { type: 'string' },
            th: { type: 'string' },
          },
        },
        description: {
          type: 'object',
          properties: {
            en: { type: 'string' },
            th: { type: 'string' },
          },
        },
        basePrice: { type: 'number' },
        capacity: { type: 'number' },
        bedType: {
          type: 'string',
          enum: [
            $Enums.BedTypeEnum.SINGLE,
            $Enums.BedTypeEnum.DOUBLE,
            $Enums.BedTypeEnum.QUEEN,
            $Enums.BedTypeEnum.KING,
            $Enums.BedTypeEnum.TWIN,
          ],
          example: 'DOUBLE',
        },
        hasPoolView: { type: 'boolean' },
        amenities: {
          type: 'array',
          items: { type: 'string' },
        },
        thumbnailUrl: {
          type: 'string',
          description: 'URL of the room type thumbnail image',
        },
        roomImages: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of room image URLs for gallery. Will replace existing images.',
        },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Room type updated successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room type not found',
  })
  async updateRoomType(
    @Param('id') id: string,
    @Body() updateRoomTypeDto: UpdateRoomTypeDto,
  ) {
    return this.roomTypeService.updateRoomType(id, updateRoomTypeDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a room type',
    description: 'Deletes a room type by ID (only if no rooms are associated)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Room type deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room type not found',
  })
  @ApiBadRequestResponse({
    description: 'Cannot delete room type with associated rooms',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoomType(@Param('id') id: string) {
    await this.roomTypeService.deleteRoomType(id);
  }

  @Delete(':roomTypeId/images/:imageId')
  @ApiOperation({
    summary: 'Delete a specific room image',
    description: 'Deletes a single room image by its ID',
  })
  @ApiParam({
    name: 'roomTypeId',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiParam({
    name: 'imageId',
    type: 'string',
    description: 'Room image ID to delete',
  })
  @ApiResponse({
    status: 204,
    description: 'Room image deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room image not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoomImage(
    @Param('roomTypeId') roomTypeId: string,
    @Param('imageId') imageId: string,
  ) {
    // Verify the image belongs to the specified room type
    const image = await this.roomTypeService.getRoomImage(imageId);
    if (image.roomTypeId !== roomTypeId) {
      throw new BadRequestException(
        'Image does not belong to the specified room type',
      );
    }
    await this.roomTypeService.deleteRoomImage(imageId);
  }

  @Delete(':roomTypeId/images')
  @ApiOperation({
    summary: 'Delete multiple room images',
    description:
      'Deletes multiple room images by their IDs or all images for a room type',
  })
  @ApiParam({
    name: 'roomTypeId',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of image IDs to delete. If not provided, all images for the room type will be deleted.',
          example: ['uuid-1', 'uuid-2'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Images deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', example: 3 },
        message: { type: 'string', example: 'Successfully deleted 3 images' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Room type not found',
  })
  async deleteRoomImages(
    @Param('roomTypeId') roomTypeId: string,
    @Body() body?: { imageIds?: string[] },
  ) {
    let result: { deletedCount: number };

    if (body?.imageIds && body.imageIds.length > 0) {
      // Delete specific images
      result = await this.roomTypeService.deleteRoomImages(body.imageIds);
    } else {
      // Delete all images for the room type
      result = await this.roomTypeService.deleteAllRoomTypeImages(roomTypeId);
    }

    return {
      ...result,
      message: `Successfully deleted ${result.deletedCount} images`,
    };
  }

  @Get(':roomTypeId/images/:imageId')
  @ApiOperation({
    summary: 'Get room image details',
    description: 'Retrieves details of a specific room image',
  })
  @ApiParam({
    name: 'roomTypeId',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiParam({
    name: 'imageId',
    type: 'string',
    description: 'Room image ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Room image details retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room image not found',
  })
  async getRoomImage(
    @Param('roomTypeId') roomTypeId: string,
    @Param('imageId') imageId: string,
  ) {
    const image = await this.roomTypeService.getRoomImage(imageId);

    if (image.roomTypeId !== roomTypeId) {
      throw new BadRequestException(
        'Image does not belong to the specified room type',
      );
    }

    return image;
  }

  @Post(':id/thumbnail')
  @ApiOperation({
    summary: 'Upload room type thumbnail',
    description: 'Uploads a thumbnail image for a room type',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            thumbnailUrl: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad request - invalid file or missing file',
  })
  @ApiNotFoundResponse({
    description: 'Room type not found',
  })
  async uploadThumbnail(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      // Check if room type exists
      await this.roomTypeService.getRoomTypeById(id);

      // Check if the request is multipart
      if (!request.isMultipart?.()) {
        throw new BadRequestException('Request must be multipart/form-data');
      }

      const data = await request.file?.();

      if (!data) {
        throw new BadRequestException('No file provided');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of data.file) {
        const buffer = chunk as Buffer;
        chunks.push(buffer);
        totalSize += buffer.length;
        if (totalSize > maxSize) {
          throw new BadRequestException('File size exceeds 10MB limit');
        }
      }

      const buffer = Buffer.concat(chunks);

      // Validate file type (images only)
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedMimes.includes(data.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed',
        );
      }

      // Create a file object compatible with Express.Multer.File
      const file = {
        fieldname: 'file',
        originalname: data.filename || 'room-type-thumbnail',
        encoding: data.encoding || '7bit',
        mimetype: data.mimetype,
        size: buffer.length,
        buffer: buffer,
        destination: '',
        filename: '',
        path: '',
        stream: undefined as any,
      } as Express.Multer.File;

      // Upload to MinIO
      const uploadResult = await this.minioService.uploadFile(
        file,
        'room-type-thumbnails',
      );

      console.log('Upload result:', uploadResult);

      // Update room type with thumbnail URL
      const updateResult = await this.roomTypeService.updateRoomType(id, {
        thumbnailUrl: uploadResult.url,
      });

      console.log('Update result:', updateResult);

      return {
        success: true,
        message: 'Thumbnail uploaded successfully',
        data: {
          thumbnailUrl: uploadResult.url,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload thumbnail');
    }
  }

  @Delete(':id/thumbnail')
  @ApiOperation({
    summary: 'Delete room type thumbnail',
    description: 'Removes the thumbnail image from a room type',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room type ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  async deleteThumbnail(@Param('id') id: string) {
    try {
      const roomType = await this.roomTypeService.getRoomTypeById(id);

      if (roomType.thumbnailUrl) {
        // Extract filename from URL
        const url = new URL(roomType.thumbnailUrl);
        const filename = url.pathname.substring(url.pathname.indexOf('/') + 1);

        // Delete from MinIO
        await this.minioService.deleteFile(filename);
      }

      // Update room type to remove thumbnail URL
      await this.roomTypeService.updateRoomType(id, {
        thumbnailUrl: null,
      });

      return {
        success: true,
        message: 'Thumbnail deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to delete thumbnail');
    }
  }
}
