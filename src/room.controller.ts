import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RoomService } from './room.service';
import type { CreateRoomDto, UpdateRoomDto, RoomFilter } from './room.service';
import { RoomStatus } from '../prisma/generated/prisma';

@ApiTags('rooms')
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('types')
  @ApiOperation({
    summary: 'Get all available room types',
    description: 'Retrieves all available room types with their details',
  })
  @ApiResponse({
    status: 200,
    description: 'Room types retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'object', example: { en: 'Deluxe Double Room with Pool View', th: 'ห้องดีลักซ์ดับเบิลวิวสระ' } },
          description: { type: 'object' },
          basePrice: { type: 'number' },
          capacity: { type: 'number' },
          bedType: { type: 'string' },
          hasPoolView: { type: 'boolean' },
          amenities: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  })
  async getAllRoomTypes() {
    return this.roomService.getAllRoomTypes();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new room',
    description: 'Creates a new hotel room with the provided details',
  })
  @ApiBody({
    description: 'Room creation data',
    schema: {
      type: 'object',
      properties: {
        roomNumber: { type: 'string', example: '101' },
        roomTypeId: { 
          type: 'string', 
          example: 'rm_type_1', 
          description: 'Room Type ID from RoomType table (e.g., DELUXE_DOUBLE_POOL_VIEW)' 
        },
        status: {
          enum: [
            'AVAILABLE',
            'OCCUPIED',
            'MAINTENANCE',
            'OUT_OF_ORDER',
            'CLEANING',
          ],
          example: 'AVAILABLE',
        },
        basePrice: { type: 'number', example: 2500.0, description: 'Optional: Override room type default price' },
        amenities: { type: 'array', items: { type: 'string' }, example: ['wifi', 'air_conditioning'], description: 'Optional: Override room type default amenities' },
      },
      required: ['roomNumber', 'roomTypeId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        roomNumber: { type: 'string' },
        roomType: { type: 'string' },
        floor: { type: 'number' },
        basePrice: { type: 'number' },
        capacity: { type: 'number' },
        status: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.createRoom(createRoomDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all rooms with optional filters',
    description:
      'Retrieves all hotel rooms with optional filtering by room type, status, floor, and price range',
  })
  @ApiQuery({
    name: 'roomTypeId',
    required: false,
    type: 'string',
    description: 'Filter by room type ID (e.g., rm_type_1)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_ORDER', 'CLEANING'],
    description: 'Filter by room status',
  })
  @ApiQuery({
    name: 'floor',
    required: false,
    type: 'number',
    description: 'Filter by floor (1-3)',
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
    description: 'Rooms retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          roomNumber: { type: 'string' },
          roomType: { type: 'string' },
          floor: { type: 'number' },
          basePrice: { type: 'number' },
          capacity: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid filter parameters' })
  async getAllRooms(@Query() query: any) {
    const filter: RoomFilter = {};

    if (query.roomTypeId) {
      // Validate that room type exists
      filter.roomTypeId = query.roomTypeId;
    }

    if (query.status) {
      if (
        !Object.values([
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
          'CLEANING',
        ]).includes(query.status)
      ) {
        throw new BadRequestException('Invalid room status');
      }
      filter.status = query.status as RoomStatus;
    }
      filter.status = query.status as RoomStatus;
    }

    if (query.floor) {
      const floor = parseInt(query.floor);
      if (isNaN(floor) || floor < 1 || floor > 3) {
        throw new BadRequestException('Floor must be 1, 2, or 3');
      }
      filter.floor = floor;
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

    return this.roomService.getAllRooms(filter);
  }

  @Get('available')
  @ApiOperation({
    summary: 'Get all available rooms',
    description: 'Retrieves all rooms with AVAILABLE status',
  })
  @ApiResponse({
    status: 200,
    description: 'Available rooms retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          roomNumber: { type: 'string' },
          roomType: { type: 'string' },
          floor: { type: 'number' },
          basePrice: { type: 'number' },
          capacity: { type: 'number' },
          status: { type: 'string', example: 'AVAILABLE' },
        },
      },
    },
  })
  async getAvailableRooms() {
    return this.roomService.getAvailableRooms();
  }

  @Get('type/:roomTypeId')
  @ApiOperation({
    summary: 'Get rooms by type ID',
    description: 'Retrieves all rooms of a specific type using room type ID',
  })
  @ApiParam({
    name: 'roomTypeId',
    type: 'string',
    description: 'The ID of the room type to filter by (e.g., rm_type_1)',
    example: 'rm_type_1',
  })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          roomNumber: { type: 'string' },
          roomType: { type: 'object' },
          floor: { type: 'number' },
          basePrice: { type: 'number' },
          capacity: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid room type ID' })
  async getRoomsByType(@Param('roomTypeId') roomTypeId: string) {
    return this.roomService.getRoomsByType(roomTypeId);
  }

  @Get('floor/:floor')
  @ApiOperation({
    summary: 'Get rooms by floor',
    description: 'Retrieves all rooms on a specific floor',
  })
  @ApiParam({
    name: 'floor',
    type: 'number',
    description: 'Floor number (1-3)',
  })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          roomNumber: { type: 'string' },
          roomType: { type: 'string' },
          floor: { type: 'number' },
          basePrice: { type: 'number' },
          capacity: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid floor number (must be 1-3)' })
  async getRoomsByFloor(@Param('floor', ParseIntPipe) floor: number) {
    if (floor < 1 || floor > 3) {
      throw new BadRequestException('Floor must be 1, 2, or 3');
    }
    return this.roomService.getRoomsByFloor(floor);
  }

  @Get('number/:roomNumber')
  @ApiOperation({
    summary: 'Get room by room number',
    description: 'Retrieves a specific room by its room number',
  })
  @ApiParam({
    name: 'roomNumber',
    type: 'string',
    description: 'Room number (e.g., "101", "201")',
    example: '101',
  })
  @ApiResponse({
    status: 200,
    description: 'Room retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        roomNumber: { type: 'string' },
        roomType: { type: 'string' },
        floor: { type: 'number' },
        basePrice: { type: 'number' },
        capacity: { type: 'number' },
        status: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  async getRoomByNumber(@Param('roomNumber') roomNumber: string) {
    return this.roomService.getRoomByNumber(roomNumber);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room by ID',
    description: 'Retrieves a specific room by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique room identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'Room retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        roomNumber: { type: 'string' },
        roomType: { type: 'string' },
        floor: { type: 'number' },
        basePrice: { type: 'number' },
        capacity: { type: 'number' },
        status: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  async getRoomById(@Param('id') id: string) {
    return this.roomService.getRoomById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update room details',
    description: 'Updates an existing room with new details',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique room identifier',
  })
  @ApiBody({
    description: 'Room update data',
    schema: {
      type: 'object',
      properties: {
        roomNumber: { type: 'string', example: '101' },
        roomTypeId: { 
          type: 'string', 
          example: 'rm_type_1', 
          description: 'Room Type ID from RoomType table' 
        },
        basePrice: { type: 'number', example: 1500.0 },
        status: {
          enum: [
            'AVAILABLE',
            'OCCUPIED',
            'MAINTENANCE',
            'OUT_OF_ORDER',
            'CLEANING',
          ],
          example: 'AVAILABLE',
        },
        amenities: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        roomNumber: { type: 'string' },
        roomType: { type: 'string' },
        floor: { type: 'number' },
        basePrice: { type: 'number' },
        capacity: { type: 'number' },
        status: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Room not found' })
  async updateRoom(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    if (updateRoomDto.status) {
      if (
        !Object.values([
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
          'CLEANING',
        ]).includes(updateRoomDto.status)
      ) {
        throw new BadRequestException('Invalid room status');
      }
    }

    return this.roomService.updateRoom(id, updateRoomDto);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update room status',
    description: 'Updates only the status of a specific room',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique room identifier',
  })
  @ApiBody({
    description: 'Room status update',
    schema: {
      type: 'object',
      properties: {
        status: {
          enum: [
            'AVAILABLE',
            'OCCUPIED',
            'MAINTENANCE',
            'OUT_OF_ORDER',
            'CLEANING',
          ],
          example: 'MAINTENANCE',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Room status updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        roomNumber: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid room status' })
  @ApiNotFoundResponse({ description: 'Room not found' })
  async updateRoomStatus(
    @Param('id') id: string,
    @Body() body: { status: RoomStatus },
  ) {
    if (
      !Object.values([
        'AVAILABLE',
        'OCCUPIED',
        'MAINTENANCE',
        'OUT_OF_ORDER',
        'CLEANING',
      ]).includes(body.status)
    ) {
      throw new BadRequestException('Invalid room status');
    }
    return this.roomService.updateRoomStatus(id, body.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete room',
    description: 'Permanently deletes a room from the system',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique room identifier',
  })
  @ApiResponse({
    status: 204,
    description: 'Room deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  async deleteRoom(@Param('id') id: string) {
    await this.roomService.deleteRoom(id);
  }

  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initialize all hotel rooms',
    description:
      'Creates all 36 hotel rooms with predefined configuration (3 floors, 12 rooms each)',
  })
  @ApiResponse({
    status: 201,
    description: 'All rooms initialized successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'All 36 rooms have been initialized successfully',
        },
        rooms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              roomNumber: { type: 'string' },
              roomType: { type: 'string' },
              floor: { type: 'number' },
              basePrice: { type: 'number' },
              capacity: { type: 'number' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async initializeAllRooms() {
    return this.roomService.initializeAllRooms();
  }
}
