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
import { RoomType, RoomStatus } from '../prisma/generated/prisma';

@ApiTags('rooms')
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

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
        roomType: {
          enum: ['DOUBLE_BED', 'SUPERIOR', 'STANDARD_OPPOSITE_POOL'],
          example: 'DOUBLE_BED',
        },
        floor: { type: 'number', example: 1 },
        basePrice: { type: 'number', example: 1500.0 },
        capacity: { type: 'number', example: 2 },
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
        amenityIds: { type: 'array', items: { type: 'string' }, example: [] },
      },
      required: ['roomNumber', 'roomType', 'floor', 'basePrice', 'capacity'],
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
    name: 'roomType',
    required: false,
    enum: ['DOUBLE_BED', 'SUPERIOR', 'STANDARD_OPPOSITE_POOL'],
    description: 'Filter by room type',
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

    if (query.roomType) {
      if (
        !Object.values([
          'DOUBLE_BED',
          'SUPERIOR',
          'STANDARD_OPPOSITE_POOL',
        ]).includes(query.roomType)
      ) {
        throw new BadRequestException('Invalid room type');
      }
      filter.roomType = query.roomType as RoomType;
    }

    if (query.status) {
      if (
        !Object.values([
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
        ]).includes(query.status)
      ) {
        throw new BadRequestException('Invalid room status');
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

  @Get('type/:roomType')
  @ApiOperation({
    summary: 'Get rooms by type',
    description: 'Retrieves all rooms of a specific type',
  })
  @ApiParam({
    name: 'roomType',
    enum: ['DOUBLE_BED', 'SUPERIOR', 'STANDARD_OPPOSITE_POOL'],
    description: 'The type of room to filter by',
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
  @ApiBadRequestResponse({ description: 'Invalid room type' })
  async getRoomsByType(@Param('roomType') roomType: string) {
    if (
      !Object.values([
        'DOUBLE_BED',
        'SUPERIOR',
        'STANDARD_OPPOSITE_POOL',
      ]).includes(roomType)
    ) {
      throw new BadRequestException('Invalid room type');
    }
    return this.roomService.getRoomsByType(roomType as RoomType);
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
        roomType: {
          enum: ['DOUBLE_BED', 'SUPERIOR', 'STANDARD_OPPOSITE_POOL'],
          example: 'DOUBLE_BED',
        },
        floor: { type: 'number', example: 1 },
        basePrice: { type: 'number', example: 1500.0 },
        capacity: { type: 'number', example: 2 },
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
    if (updateRoomDto.roomType) {
      if (
        !Object.values([
          'STANDARD',
          'DELUXE',
          'SUITE',
          'PRESIDENTIAL',
          'FAMILY',
          'ACCESSIBLE',
        ]).includes(updateRoomDto.roomType)
      ) {
        throw new BadRequestException('Invalid room type');
      }
    }

    if (updateRoomDto.status) {
      if (
        !Object.values([
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
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
