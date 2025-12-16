import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prima/prisma.service';
import type { Booking, RoomBooking } from '../../prisma/generated/prisma';
import {
  RoomStatus,
  BookingStatus,
  RoomBookingStatus,
} from '../../prisma/generated/prisma';

export interface CreateBookingDto {
  guestId: string;
  roomIds: string[];
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  numberOfChildren?: number;
  specialRequests?: string;
  source?: string;
  notes?: string;
}

export interface UpdateBookingDto {
  checkInDate?: Date;
  checkOutDate?: Date;
  numberOfGuests?: number;
  numberOfChildren?: number;
  specialRequests?: string;
  status?: BookingStatus;
  notes?: string;
}

export interface AssignRoomToBookingDto {
  roomId: string;
  bookingId: string;
  roomRate: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  notes?: string;
}

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async createBooking(data: CreateBookingDto): Promise<Booking> {
    const { roomIds, ...bookingData } = data;

    // Validate rooms availability
    await this.validateRoomsAvailability(
      roomIds,
      data.checkInDate,
      data.checkOutDate,
    );

    // Get room rates to calculate total
    const roomRates = await this.getRoomRates(roomIds);
    const totalRoomAmount = roomRates.reduce(
      (sum, rate) => sum + rate.basePrice,
      0,
    );

    // Calculate taxes and service charges (10% tax, 7% service)
    const taxAmount = totalRoomAmount * 0.1;
    const serviceCharges = totalRoomAmount * 0.07;
    const finalAmount = totalRoomAmount + taxAmount + serviceCharges;

    // Generate booking number
    const bookingNumber = await this.generateBookingNumber();

    // Create booking with room assignments in a transaction
    return await this.prisma.$transaction(async (tx) => {
      // Create the booking
      const booking = await tx.booking.create({
        data: {
          ...bookingData,
          bookingNumber,
          totalAmount: totalRoomAmount,
          taxAmount,
          serviceCharges,
          finalAmount,
          status: BookingStatus.PENDING,
        },
      });

      // Create room assignments
      const roomAssignments = roomIds.map((roomId, index) => ({
        roomId,
        bookingId: booking.id,
        roomRate: roomRates[index].basePrice,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        status: RoomBookingStatus.ASSIGNED,
      }));

      await tx.roomBooking.createMany({
        data: roomAssignments,
      });

      // Update room status to occupied if booking is confirmed
      if (data.checkInDate <= new Date()) {
        await tx.room.updateMany({
          where: { id: { in: roomIds } },
          data: { status: RoomStatus.OCCUPIED },
        });
      }

      return booking;
    });
  }

  async findAll(filters?: {
    status?: BookingStatus;
    guestId?: string;
    checkInDate?: Date;
    checkOutDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.guestId && { guestId: filters.guestId }),
      ...(filters?.checkInDate && {
        checkInDate: { gte: filters.checkInDate },
      }),
      ...(filters?.checkOutDate && {
        checkOutDate: { lte: filters.checkOutDate },
      }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          guest: true,
          roomBookings: {
            include: {
              room: {
                include: {
                  roomType: true,
                },
              },
            },
          },
          services: {
            include: {
              service: true,
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        roomBookings: {
          include: {
            room: {
              include: {
                roomType: true,
              },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
        payments: true,
        reviews: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async updateBooking(id: string, data: UpdateBookingDto): Promise<Booking> {
    const existingBooking = await this.findOne(id);

    // If dates are changing, validate room availability
    if (data.checkInDate || data.checkOutDate) {
      const roomIds = existingBooking.roomBookings.map((rb) => rb.roomId);
      await this.validateRoomsAvailability(
        roomIds,
        data.checkInDate || existingBooking.roomBookings[0].checkInDate,
        data.checkOutDate || existingBooking.roomBookings[0].checkOutDate,
        id, // Exclude current booking from availability check
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update booking
      const updatedBooking = await tx.booking.update({
        where: { id },
        data,
        include: {
          roomBookings: true,
        },
      });

      // Update room bookings if dates changed
      if (data.checkInDate || data.checkOutDate) {
        await tx.roomBooking.updateMany({
          where: { bookingId: id },
          data: {
            ...(data.checkInDate && { checkInDate: data.checkInDate }),
            ...(data.checkOutDate && { checkOutDate: data.checkOutDate }),
          },
        });
      }

      return updatedBooking;
    });
  }

  async assignRoomToBooking(
    data: AssignRoomToBookingDto,
  ): Promise<RoomBooking> {
    // Validate booking exists
    const booking = await this.findOne(data.bookingId);

    // Validate room exists and is available
    await this.validateRoomsAvailability(
      [data.roomId],
      data.checkInDate || booking.checkInDate,
      data.checkOutDate || booking.checkOutDate,
      data.bookingId,
    );

    // Check if room is already assigned to this booking
    const existingAssignment = await this.prisma.roomBooking.findFirst({
      where: {
        roomId: data.roomId,
        bookingId: data.bookingId,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('Room is already assigned to this booking');
    }

    return await this.prisma.roomBooking.create({
      data: {
        roomId: data.roomId,
        bookingId: data.bookingId,
        roomRate: data.roomRate,
        checkInDate: data.checkInDate || booking.checkInDate,
        checkOutDate: data.checkOutDate || booking.checkOutDate,
        notes: data.notes,
        status: RoomBookingStatus.ASSIGNED,
      },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
        booking: true,
      },
    });
  }

  async removeRoomFromBooking(
    roomId: string,
    bookingId: string,
  ): Promise<void> {
    const roomBooking = await this.prisma.roomBooking.findFirst({
      where: { roomId, bookingId },
    });

    if (!roomBooking) {
      throw new NotFoundException('Room assignment not found');
    }

    await this.prisma.roomBooking.delete({
      where: { id: roomBooking.id },
    });

    // Update room status back to available if no other bookings
    const otherBookings = await this.prisma.roomBooking.count({
      where: {
        roomId,
        checkInDate: { lte: new Date() },
        checkOutDate: { gte: new Date() },
        status: {
          in: [RoomBookingStatus.ASSIGNED, RoomBookingStatus.CHECKED_IN],
        },
      },
    });

    if (otherBookings === 0) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.AVAILABLE },
      });
    }
  }

  async checkIn(bookingId: string): Promise<Booking> {
    return await this.prisma.$transaction(async (tx) => {
      // Update booking status
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CHECKED_IN,
          actualCheckIn: new Date(),
        },
        include: { roomBookings: true },
      });

      // Update room booking status
      await tx.roomBooking.updateMany({
        where: { bookingId },
        data: { status: RoomBookingStatus.CHECKED_IN },
      });

      // Update room status to occupied
      const roomIds = booking.roomBookings.map((rb) => rb.roomId);
      await tx.room.updateMany({
        where: { id: { in: roomIds } },
        data: { status: RoomStatus.OCCUPIED },
      });

      return booking;
    });
  }

  async checkOut(bookingId: string): Promise<Booking> {
    return await this.prisma.$transaction(async (tx) => {
      // Update booking status
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CHECKED_OUT,
          actualCheckOut: new Date(),
        },
        include: { roomBookings: true },
      });

      // Update room booking status
      await tx.roomBooking.updateMany({
        where: { bookingId },
        data: { status: RoomBookingStatus.CHECKED_OUT },
      });

      // Update room status to cleaning
      const roomIds = booking.roomBookings.map((rb) => rb.roomId);
      await tx.room.updateMany({
        where: { id: { in: roomIds } },
        data: { status: RoomStatus.CLEANING },
      });

      return booking;
    });
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    return await this.prisma.$transaction(async (tx) => {
      // Update booking status
      const booking = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
        },
        include: { roomBookings: true },
      });

      // Update room booking status
      await tx.roomBooking.updateMany({
        where: { bookingId: id },
        data: { status: RoomBookingStatus.CANCELLED },
      });

      // Update room status back to available
      const roomIds = booking.roomBookings.map((rb) => rb.roomId);
      await tx.room.updateMany({
        where: { id: { in: roomIds } },
        data: { status: RoomStatus.AVAILABLE },
      });

      return booking;
    });
  }

  private async validateRoomsAvailability(
    roomIds: string[],
    checkInDate: Date,
    checkOutDate: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    for (const roomId of roomIds) {
      const conflictingBookings = await this.prisma.roomBooking.count({
        where: {
          roomId,
          ...(excludeBookingId && {
            booking: { id: { not: excludeBookingId } },
          }),
          status: {
            in: [RoomBookingStatus.ASSIGNED, RoomBookingStatus.CHECKED_IN],
          },
          OR: [
            {
              AND: [
                { checkInDate: { lte: checkInDate } },
                { checkOutDate: { gt: checkInDate } },
              ],
            },
            {
              AND: [
                { checkInDate: { lt: checkOutDate } },
                { checkOutDate: { gte: checkOutDate } },
              ],
            },
            {
              AND: [
                { checkInDate: { gte: checkInDate } },
                { checkOutDate: { lte: checkOutDate } },
              ],
            },
          ],
        },
      });

      if (conflictingBookings > 0) {
        const room = await this.prisma.room.findUnique({
          where: { id: roomId },
          select: { roomNumber: true },
        });
        throw new BadRequestException(
          `Room ${room?.roomNumber} is not available for the selected dates`,
        );
      }
    }
  }

  private async getRoomRates(roomIds: string[]) {
    return await this.prisma.room
      .findMany({
        where: { id: { in: roomIds } },
        select: {
          id: true,
          roomType: {
            select: {
              basePrice: true,
            },
          },
        },
      })
      .then((rooms) =>
        rooms.map((room) => ({
          roomId: room.id,
          basePrice: room.roomType.basePrice,
        })),
      );
  }

  private async generateBookingNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `BK${year}${month}${day}`;

    const latestBooking = await this.prisma.booking.findFirst({
      where: {
        bookingNumber: { startsWith: prefix },
      },
      orderBy: { bookingNumber: 'desc' },
    });

    let sequence = 1;
    if (latestBooking) {
      const lastSequence = parseInt(latestBooking.bookingNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }
}
