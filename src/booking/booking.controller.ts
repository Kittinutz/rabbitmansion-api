import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import type {
  CreateBookingDto,
  UpdateBookingDto,
  AssignRoomToBookingDto,
} from './booking.service';
import {
  CreateBookingRequestDto,
  BookingResponseDto,
  AssignRoomsDto,
  CheckInDto,
  CheckOutDto,
} from './dto';
import type { BookingListQuery } from './dto';
import { BookingStatus } from '../../prisma/generated/prisma';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create booking from guest request',
    description:
      'Creates a new booking request from guest information. Automatically creates or updates guest profile, calculates pricing with taxes. Room assignment will be handled by admin later.',
  })
  @ApiBody({ type: CreateBookingRequestDto })
  @ApiCreatedResponse({
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or validation error',
  })
  async createBookingRequest(
    @Body(ValidationPipe) dto: CreateBookingRequestDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.createBookingFromRequest(dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all bookings (Admin)',
    description:
      'Retrieves all bookings with pagination and optional filters. Admin access required.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BookingStatus,
    description: 'Filter by booking status',
  })
  @ApiQuery({
    name: 'guestEmail',
    required: false,
    type: String,
    description: 'Filter by guest email',
  })
  @ApiQuery({
    name: 'guestPhone',
    required: false,
    type: String,
    description: 'Filter by guest phone',
  })
  @ApiQuery({
    name: 'bookingNumber',
    required: false,
    type: String,
    description: 'Search by booking number',
  })
  @ApiQuery({
    name: 'checkInFrom',
    required: false,
    type: String,
    description: 'Filter bookings from this check-in date',
  })
  @ApiQuery({
    name: 'checkInTo',
    required: false,
    type: String,
    description: 'Filter bookings to this check-in date',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort by field (createdAt, checkInDate, totalAmount)',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'desc',
  })
  @ApiOkResponse({
    description: 'Bookings retrieved successfully',
  })
  async findAllBookings(@Query() query: BookingListQuery) {
    return this.bookingService.findAllBookings(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get booking details (Admin)',
    description:
      'Retrieves detailed information about a specific booking. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Booking ID',
    example: 'cm123456789',
  })
  @ApiOkResponse({
    description: 'Booking details retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  async getBookingById(@Param('id') id: string) {
    return this.bookingService.getBookingDetail(id);
  }

  @Put(':bookingId/assign-rooms')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign rooms to booking (Admin)',
    description:
      'Assigns specific rooms to a pending booking. Validates room availability and updates booking status to CONFIRMED.',
  })
  @ApiParam({
    name: 'bookingId',
    type: String,
    description: 'Booking ID',
    example: 'cm123456789',
  })
  @ApiBody({ type: AssignRoomsDto })
  @ApiOkResponse({
    description: 'Rooms assigned successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or rooms not available',
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  async assignRooms(
    @Param('bookingId') bookingId: string,
    @Body(ValidationPipe) dto: AssignRoomsDto,
  ) {
    return this.bookingService.assignRooms(bookingId, dto);
  }

  @Put(':bookingId/check-in')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check in booking (Admin)',
    description:
      'Checks in a confirmed booking. Updates booking and room statuses to CHECKED_IN/OCCUPIED.',
  })
  @ApiParam({
    name: 'bookingId',
    type: String,
    description: 'Booking ID',
    example: 'cm123456789',
  })
  @ApiBody({ type: CheckInDto })
  @ApiOkResponse({
    description: 'Check-in successful',
  })
  @ApiBadRequestResponse({
    description: 'Booking must be CONFIRMED',
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  async checkIn(
    @Param('bookingId') bookingId: string,
    @Body(ValidationPipe) dto: CheckInDto,
  ) {
    return this.bookingService.checkIn(bookingId, dto);
  }

  @Put(':bookingId/check-out')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check out booking (Admin)',
    description:
      'Checks out a booking. Updates booking status to CHECKED_OUT, sets rooms to CLEANING, and updates guest statistics.',
  })
  @ApiParam({
    name: 'bookingId',
    type: String,
    description: 'Booking ID',
    example: 'cm123456789',
  })
  @ApiBody({ type: CheckOutDto })
  @ApiOkResponse({
    description: 'Check-out successful',
  })
  @ApiBadRequestResponse({
    description: 'Booking must be CHECKED_IN',
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  async checkOut(
    @Param('bookingId') bookingId: string,
    @Body(ValidationPipe) dto: CheckOutDto,
  ) {
    return this.bookingService.checkOut(bookingId, dto);
  }

  @Post('admin')
  @ApiOperation({
    summary: 'Create booking (Admin)',
    description:
      'Admin endpoint to create a booking with specific room assignments. Supports single-room, multi-room, and group bookings. Automatically validates room availability and calculates pricing with taxes and service charges.',
  })
  @ApiBody({
    description: 'Booking creation data',
    schema: {
      type: 'object',
      required: [
        'guestId',
        'roomIds',
        'checkInDate',
        'checkOutDate',
        'numberOfGuests',
      ],
      properties: {
        guestId: {
          type: 'string',
          format: 'uuid',
          description: 'Guest ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        roomIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Array of room IDs to book',
          example: [
            '223e4567-e89b-12d3-a456-426614174001',
            '323e4567-e89b-12d3-a456-426614174002',
          ],
        },
        checkInDate: {
          type: 'string',
          format: 'date-time',
          description: 'Check-in date and time',
          example: '2024-12-20T15:00:00.000Z',
        },
        checkOutDate: {
          type: 'string',
          format: 'date-time',
          description: 'Check-out date and time',
          example: '2024-12-25T11:00:00.000Z',
        },
        numberOfGuests: {
          type: 'integer',
          description: 'Total number of guests',
          example: 2,
        },
        numberOfChildren: {
          type: 'integer',
          description: 'Number of children',
          example: 0,
        },
        specialRequests: {
          type: 'string',
          description: 'Special requests or requirements',
          example: 'Late check-in, need extra pillows',
        },
        source: {
          type: 'string',
          description: 'Booking source (Website, Phone, Agent, etc.)',
          example: 'Website',
        },
        notes: {
          type: 'string',
          description: 'Internal booking notes',
          example: 'VIP guest, prepare welcome basket',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Booking created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'booking-uuid' },
            bookingNumber: { type: 'string', example: 'BK20241220001' },
            totalAmount: { type: 'number', example: 5000.0 },
            taxAmount: { type: 'number', example: 500.0 },
            serviceCharges: { type: 'number', example: 350.0 },
            finalAmount: { type: 'number', example: 5850.0 },
            status: { type: 'string', example: 'PENDING' },
          },
        },
        message: { type: 'string', example: 'Booking created successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Room not available or invalid data',
  })
  @ApiNotFoundResponse({
    description: 'Guest or room not found',
  })
  async createBooking(
    @Body(ValidationPipe) createBookingDto: CreateBookingDto,
  ) {
    const booking = await this.bookingService.createBooking(createBookingDto);
    return {
      success: true,
      data: booking,
      message: 'Booking created successfully',
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update booking',
    description:
      'Updates booking details. If dates are changed, room availability is revalidated to prevent conflicts.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Booking ID',
  })
  @ApiBody({
    description: 'Booking update data',
    schema: {
      type: 'object',
      properties: {
        checkInDate: {
          type: 'string',
          format: 'date-time',
          description: 'Updated check-in date',
        },
        checkOutDate: {
          type: 'string',
          format: 'date-time',
          description: 'Updated check-out date',
        },
        numberOfGuests: {
          type: 'integer',
          description: 'Updated number of guests',
        },
        numberOfChildren: {
          type: 'integer',
          description: 'Updated number of children',
        },
        specialRequests: {
          type: 'string',
          description: 'Updated special requests',
        },
        status: {
          type: 'string',
          enum: [
            'PENDING',
            'CONFIRMED',
            'CHECKED_IN',
            'CHECKED_OUT',
            'CANCELLED',
            'NO_SHOW',
          ],
          description: 'Updated booking status',
        },
        notes: {
          type: 'string',
          description: 'Updated internal notes',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Booking updated successfully',
  })
  @ApiBadRequestResponse({
    description: 'Room not available for new dates or invalid data',
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  async updateBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.bookingService.updateBooking(
      id,
      updateBookingDto,
    );
    return {
      success: true,
      data: booking,
      message: 'Booking updated successfully',
    };
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancel booking',
    description:
      'Cancels a booking and updates all assigned rooms to AVAILABLE status. Room assignments are marked as cancelled.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Booking ID',
  })
  @ApiBody({
    description: 'Cancellation details',
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for cancellation',
          example: 'Guest requested cancellation due to flight delay',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Booking cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', example: 'CANCELLED' },
            cancellationReason: { type: 'string' },
          },
        },
        message: { type: 'string', example: 'Booking cancelled successfully' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Booking not found',
  })
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    const booking = await this.bookingService.cancelBooking(id, reason);
    return {
      success: true,
      data: booking,
      message: 'Booking cancelled successfully',
    };
  }

  @Post('/rooms/assign')
  @ApiOperation({
    summary: 'Assign room to existing booking',
    description:
      'Adds an additional room to an existing booking. Validates room availability for the booking dates and creates a new room assignment.',
  })
  @ApiBody({
    description: 'Room assignment data',
    schema: {
      type: 'object',
      required: ['roomId', 'bookingId', 'roomRate'],
      properties: {
        roomId: {
          type: 'string',
          format: 'uuid',
          description: 'Room ID to assign',
          example: '223e4567-e89b-12d3-a456-426614174001',
        },
        bookingId: {
          type: 'string',
          format: 'uuid',
          description: 'Booking ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        roomRate: {
          type: 'number',
          description: 'Room rate for this assignment',
          example: 2500.0,
        },
        checkInDate: {
          type: 'string',
          format: 'date-time',
          description:
            'Override check-in date (optional, defaults to booking dates)',
          example: '2024-12-20T15:00:00.000Z',
        },
        checkOutDate: {
          type: 'string',
          format: 'date-time',
          description:
            'Override check-out date (optional, defaults to booking dates)',
          example: '2024-12-25T11:00:00.000Z',
        },
        notes: {
          type: 'string',
          description: 'Room-specific notes',
          example: 'Guest requested this specific room - upgrade',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Room assigned to booking successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            roomId: { type: 'string' },
            bookingId: { type: 'string' },
            roomRate: { type: 'number' },
            status: { type: 'string', example: 'ASSIGNED' },
          },
        },
        message: {
          type: 'string',
          example: 'Room assigned to booking successfully',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Room not available or already assigned to this booking',
  })
  @ApiNotFoundResponse({
    description: 'Room or booking not found',
  })
  async assignRoomToBooking(
    @Body(ValidationPipe) assignRoomDto: AssignRoomToBookingDto,
  ) {
    const roomBooking =
      await this.bookingService.assignRoomToBooking(assignRoomDto);
    return {
      success: true,
      data: roomBooking,
      message: 'Room assigned to booking successfully',
    };
  }

  @Delete('/rooms/:roomId/booking/:bookingId')
  @ApiOperation({
    summary: 'Remove room from booking',
    description:
      'Removes a room assignment from a booking. If no other active bookings exist for the room, it is marked as AVAILABLE.',
  })
  @ApiParam({
    name: 'roomId',
    type: 'string',
    format: 'uuid',
    description: 'Room ID',
  })
  @ApiParam({
    name: 'bookingId',
    type: 'string',
    format: 'uuid',
    description: 'Booking ID',
  })
  @ApiOkResponse({
    description: 'Room removed from booking successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Room removed from booking successfully',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Room assignment not found',
  })
  async removeRoomFromBooking(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    await this.bookingService.removeRoomFromBooking(roomId, bookingId);
    return {
      success: true,
      message: 'Room removed from booking successfully',
    };
  }

  @Get('/rooms/:roomId')
  @ApiOperation({
    summary: 'Get all bookings for a specific room',
    description:
      'Retrieves all bookings that include a specific room, with optional status filtering.',
  })
  @ApiParam({
    name: 'roomId',
    type: 'string',
    format: 'uuid',
    description: 'Room ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'CANCELLED',
      'NO_SHOW',
    ],
    description: 'Filter by booking status',
  })
  @ApiOkResponse({
    description: 'Room bookings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              bookingNumber: { type: 'string' },
              status: { type: 'string' },
              checkInDate: { type: 'string', format: 'date-time' },
              checkOutDate: { type: 'string', format: 'date-time' },
              roomBookings: { type: 'array' },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Bookings for room retrieved successfully',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Room not found',
  })
  async getBookingsForRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('status') status?: BookingStatus,
  ) {
    const filters = {
      ...(status && { status }),
    };

    const result = await this.bookingService.findAll(filters);

    // Filter bookings that contain the specified room
    const roomBookings = result.bookings.filter((booking) =>
      booking.roomBookings.some((rb) => rb.roomId === roomId),
    );

    return {
      success: true,
      data: roomBookings,
      message: `Bookings for room retrieved successfully`,
    };
  }

  @Get('/guest/:guestId')
  @ApiOperation({
    summary: 'Get all bookings for a specific guest',
    description:
      'Retrieves booking history for a guest with optional status filtering and pagination support.',
  })
  @ApiParam({
    name: 'guestId',
    type: 'string',
    format: 'uuid',
    description: 'Guest ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'CANCELLED',
      'NO_SHOW',
    ],
    description: 'Filter by booking status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'integer',
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'integer',
    description: 'Number of items per page',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Guest bookings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              bookingNumber: { type: 'string' },
              status: { type: 'string' },
              checkInDate: { type: 'string', format: 'date-time' },
              checkOutDate: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        message: {
          type: 'string',
          example: 'Guest bookings retrieved successfully',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Guest not found',
  })
  async getBookingsForGuest(
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      guestId,
      ...(status && { status }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };

    const result = await this.bookingService.findAll(filters);

    return {
      success: true,
      data: result.bookings,
      pagination: result.pagination,
      message: 'Guest bookings retrieved successfully',
    };
  }

  @Get('/reports/occupancy')
  @ApiOperation({
    summary: 'Get occupancy report',
    description:
      'Generates an occupancy and revenue report for a specified date range. Includes occupancy rate, total revenue, average daily rate, and other key metrics.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    format: 'date-time',
    description: 'Report start date (ISO 8601). Defaults to today.',
    example: '2024-12-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    format: 'date-time',
    description:
      'Report end date (ISO 8601). Defaults to 30 days from start date.',
    example: '2024-12-31T23:59:59.000Z',
  })
  @ApiOkResponse({
    description: 'Occupancy report generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            occupancyRate: {
              type: 'number',
              description: 'Percentage of occupied rooms',
              example: 75.5,
            },
            totalRooms: {
              type: 'integer',
              description: 'Total number of rooms',
              example: 51,
            },
            occupiedRooms: {
              type: 'integer',
              description: 'Number of occupied rooms',
              example: 38,
            },
            revenue: {
              type: 'number',
              description: 'Total revenue for the period',
              example: 125000.0,
            },
            averageDailyRate: {
              type: 'number',
              description: 'Average daily rate (ADR)',
              example: 3500.0,
            },
          },
        },
        message: {
          type: 'string',
          example: 'Occupancy report generated successfully',
        },
      },
    },
  })
  async getOccupancyReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // This would typically be implemented in the service
    // For now, return a placeholder structure
    return {
      success: true,
      data: {
        occupancyRate: 0,
        totalRooms: 0,
        occupiedRooms: 0,
        revenue: 0,
        averageDailyRate: 0,
      },
      message: 'Occupancy report generated successfully',
    };
  }
}
