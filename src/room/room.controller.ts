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
import type {
  CreateRoomDto,
  UpdateRoomDto,
  RoomFilter,
  RoomAvailabilityFilter,
} from './room.service';
import { RoomStatus } from '../../prisma/generated/prisma/';

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
  })
  async getRoomTypes() {
    return this.roomService.getAllRoomTypes();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new room',
    description: 'Creates a new room with the specified details',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['roomNumber', 'roomTypeId', 'floor'],
      properties: {
        roomNumber: { type: 'string', example: '101' },
        roomTypeId: { type: 'string', example: 'rm_type_1' },
        floor: { type: 'number', example: 1 },
        size: { type: 'number', example: 35 },
        accessible: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.createRoom(createRoomDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all rooms with optional filtering',
    description:
      'Retrieves all rooms with optional filters for status, floor, and price range',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_ORDER'],
    description: 'Filter by room status',
  })
  @ApiQuery({
    name: 'floor',
    required: false,
    type: 'string',
    description: 'Filter by floor number (1-3)',
  })
  @ApiQuery({
    name: 'priceMin',
    required: false,
    type: 'string',
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'priceMax',
    required: false,
    type: 'string',
    description: 'Maximum price filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
  })
  async getAllRooms(
    @Query()
    query: {
      status?: RoomStatus;
      floor?: string;
      priceMin?: string;
      priceMax?: string;
    },
  ) {
    const filter: RoomFilter = {};

    if (query.status) {
      if (
        ![
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
          'CLEANING',
        ].includes(query.status)
      ) {
        throw new BadRequestException('Invalid room status');
      }
      filter.status = query.status;
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
    description:
      'Retrieves all rooms with AVAILABLE status, optionally filtered by date range',
  })
  @ApiQuery({
    name: 'checkInDate',
    required: false,
    type: 'string',
    description: 'Check-in date (ISO string)',
  })
  @ApiQuery({
    name: 'checkOutDate',
    required: false,
    type: 'string',
    description: 'Check-out date (ISO string)',
  })
  @ApiQuery({
    name: 'roomTypeId',
    required: false,
    type: 'string',
    description: 'Filter by room type ID',
  })
  @ApiQuery({
    name: 'floor',
    required: false,
    type: 'number',
    description: 'Filter by floor',
  })
  @ApiQuery({
    name: 'capacity',
    required: false,
    type: 'number',
    description: 'Minimum capacity required',
  })
  @ApiResponse({
    status: 200,
    description: 'Available rooms retrieved successfully',
  })
  async getAvailableRooms(
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
    @Query('roomTypeId') roomTypeId?: string,
    @Query('floor') floor?: number,
    @Query('capacity') capacity?: number,
  ) {
    let availabilityFilter: RoomAvailabilityFilter | undefined;

    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (checkIn >= checkOut) {
        throw new BadRequestException(
          'Check-in date must be before check-out date',
        );
      }

      availabilityFilter = {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        ...(roomTypeId && { roomTypeId }),
        ...(floor && { floor }),
        ...(capacity && { capacity }),
      };
    }

    return this.roomService.getAvailableRooms(availabilityFilter);
  }

  @Get('type/:roomTypeId')
  @ApiOperation({
    summary: 'Get rooms by type ID',
    description: 'Retrieves all rooms of a specific type using room type ID',
  })
  @ApiParam({
    name: 'roomTypeId',
    type: 'string',
    description: 'The ID of the room type to filter by',
  })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
  })
  async getRoomsByType(@Param('roomTypeId') roomTypeId: string) {
    return this.roomService.getRoomsByType(roomTypeId);
  }

  @Get('floor/:floor')
  @ApiOperation({
    summary: 'Get rooms by floor',
    description: 'Retrieves all rooms on a specific floor (1-3)',
  })
  @ApiParam({
    name: 'floor',
    type: 'number',
    description: 'Floor number (1, 2, or 3)',
  })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid floor number',
  })
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
    description: 'Room number (e.g., "101", "205")',
  })
  @ApiResponse({
    status: 200,
    description: 'Room retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  async getRoomByNumber(@Param('roomNumber') roomNumber: string) {
    return this.roomService.getRoomByNumber(roomNumber);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room by ID',
    description: 'Retrieves a specific room by its ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Room retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  async getRoomById(@Param('id') id: string) {
    return this.roomService.getRoomById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a room',
    description: 'Updates room details by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roomNumber: { type: 'string' },
        roomTypeId: { type: 'string' },
        floor: { type: 'number' },
        size: { type: 'number' },
        accessible: { type: 'boolean' },
        status: {
          type: 'string',
          enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_ORDER'],
        },
        notes: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  async updateRoom(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    if (updateRoomDto.status) {
      if (
        ![
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
          'CLEANING',
        ].includes(updateRoomDto.status)
      ) {
        throw new BadRequestException('Invalid room status');
      }
    }
    return this.roomService.updateRoom(id, updateRoomDto);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update room status',
    description: 'Updates only the status of a room',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_ORDER'],
          example: 'MAINTENANCE',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Room status updated successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid status value',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  async updateRoomStatus(
    @Param('id') id: string,
    @Body() body: { status: RoomStatus },
  ) {
    if (
      ![
        'AVAILABLE',
        'OCCUPIED',
        'MAINTENANCE',
        'OUT_OF_ORDER',
        'CLEANING',
      ].includes(body.status)
    ) {
      throw new BadRequestException('Invalid room status');
    }
    return this.roomService.updateRoomStatus(id, body.status);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a room',
    description: 'Deletes a room by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Room ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Room deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoom(@Param('id') id: string) {
    await this.roomService.deleteRoom(id);
  }

  @Post('initialize')
  @ApiOperation({
    summary: 'Initialize all rooms',
    description:
      'Creates all 30 rooms (101-310) with proper room types and pricing',
  })
  @ApiResponse({
    status: 201,
    description: 'All rooms initialized successfully',
  })
  async initializeAllRooms() {
    return this.roomService.initializeAllRooms();
  }

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Check room availability',
    description: 'Check if a specific room is available for a given date range',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Room ID' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: 'string',
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: 'string',
    description: 'End date (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Room availability information retrieved successfully',
  })
  async getRoomAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.roomService.getRoomAvailability(id, start, end);
  }

  @Get('reports/occupancy')
  @ApiOperation({
    summary: 'Get occupancy report',
    description: 'Get detailed occupancy statistics and revenue data',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for report (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for report (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Occupancy report generated successfully',
  })
  async getRoomOccupancyReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw new BadRequestException('Invalid start date format');
      }
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new BadRequestException('Invalid end date format');
      }
    }

    if (start && end && start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.roomService.getRoomOccupancyReport(start, end);
  }
}
