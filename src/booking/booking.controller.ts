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
} from '@nestjs/common';
import { BookingService } from './booking.service';
import type {
  CreateBookingDto,
  UpdateBookingDto,
  AssignRoomToBookingDto,
} from './booking.service';
import { BookingStatus } from '../../prisma/generated/prisma';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
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

  @Get()
  async findAll(
    @Query('status') status?: BookingStatus,
    @Query('guestId') guestId?: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      ...(status && { status }),
      ...(guestId && { guestId }),
      ...(checkInDate && { checkInDate: new Date(checkInDate) }),
      ...(checkOutDate && { checkOutDate: new Date(checkOutDate) }),
      ...(page && { page: parseInt(page, 10) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };

    const result = await this.bookingService.findAll(filters);

    return {
      success: true,
      data: result.bookings,
      pagination: result.pagination,
      message: 'Bookings retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingService.findOne(id);
    return {
      success: true,
      data: booking,
      message: 'Booking retrieved successfully',
    };
  }

  @Put(':id')
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

  @Post(':id/check-in')
  async checkIn(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingService.checkIn(id);
    return {
      success: true,
      data: booking,
      message: 'Check-in completed successfully',
    };
  }

  @Post(':id/check-out')
  async checkOut(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingService.checkOut(id);
    return {
      success: true,
      data: booking,
      message: 'Check-out completed successfully',
    };
  }

  @Put(':id/cancel')
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
