import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prima/prisma.service';
import type {
  Booking,
  RoomBooking,
  Guest,
  RoomType,
} from '../../prisma/generated/prisma';
import {
  RoomStatus,
  BookingStatus,
  RoomBookingStatus,
  GuestStatus,
} from '../../prisma/generated/prisma';
import dayjs from 'dayjs';
import {
  CreateBookingRequestDto,
  BookingResponseDto,
  PriceBreakdown,
} from './dto';

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

  // New methods for booking request flow
  async findOrCreateGuest(data: {
    fullName: string;
    email: string;
    phone: string;
    whatsapp?: string;
  }): Promise<Guest> {
    // 1. Check if guest exists by email
    let guest = await this.prisma.guest.findUnique({
      where: { email: data.email },
    });

    // 2. If not exists, create new guest
    if (!guest) {
      const [firstName, ...lastNameParts] = data.fullName.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      guest = await this.prisma.guest.create({
        data: {
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          firstName,
          lastName,
          status: GuestStatus.ACTIVE,
        },
      });
    } else {
      // 3. Update guest info if exists (phone/whatsapp may have changed)
      guest = await this.prisma.guest.update({
        where: { id: guest.id },
        data: {
          phone: data.phone,
          whatsapp: data.whatsapp || (guest.whatsapp as string | null),
        },
      });
    }

    return guest;
  }

  async getRoomTypeById(roomTypeId: string): Promise<RoomType> {
    // 1. Find room type by ID
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    // 2. Validate room type exists
    if (!roomType) {
      throw new NotFoundException(`Room type with ID ${roomTypeId} not found`);
    }

    return roomType;
  }

  calculatePriceBreakdown(
    basePrice: number,
    numberOfNights: number,
    numberOfRooms: number,
  ): PriceBreakdown {
    // 1. Calculate total price (room rate * nights * number of rooms)
    // This is the final amount customer pays
    const totalPrice = basePrice * numberOfNights * numberOfRooms;

    // 2. Calculate city tax (1% of total) - for admin breakdown
    const cityTax = totalPrice * 0.01;

    // 3. Calculate VAT (7% of total) - for admin breakdown
    const vat = totalPrice * 0.07;

    // 4. Calculate net amount (what hotel receives after taxes)
    const netAmount = totalPrice - cityTax - vat;

    return {
      totalPrice,
      numberOfNights,
      numberOfRooms,
      cityTax,
      vat,
      netAmount,
      discountAmount: 0,
    };
  }

  async createBookingFromRequest(
    dto: CreateBookingRequestDto,
  ): Promise<BookingResponseDto> {
    // 1. Find or create guest
    const guest = await this.findOrCreateGuest({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
    });

    // 2. Get room type and validate it exists
    const roomType = await this.getRoomTypeById(dto.roomType);

    // 3. Calculate number of nights using dayjs
    const numberOfNights = dayjs(dto.checkOut).diff(dayjs(dto.checkIn), 'day');

    // 4. Validate number of nights
    if (numberOfNights <= 0) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    // 5. Calculate price breakdown
    const priceBreakdown = this.calculatePriceBreakdown(
      roomType.basePrice,
      numberOfNights,
      dto.numberOfRooms,
    );

    // 6. Generate booking number
    const bookingNumber = await this.generateBookingNumber();

    // 7. Create booking in transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          bookingNumber,
          guestId: guest.id,
          checkInDate: new Date(dto.checkIn),
          checkOutDate: new Date(dto.checkOut),
          numberOfGuests: dto.guests,
          numberOfChildren: 0,
          specialRequests: dto.note,
          totalAmount: priceBreakdown.totalPrice,
          taxAmount: priceBreakdown.cityTax,
          serviceCharges: priceBreakdown.vat,
          discountAmount: 0,
          finalAmount: priceBreakdown.totalPrice,
          status: BookingStatus.PENDING,
          notes: dto.note,
        },
      });

      // Note: Room assignment will be handled by admin later
      // No RoomBooking records created at this stage

      // Note: Payment record creation will be handled separately
      // For now, we just create the booking request

      return newBooking;
    });

    // 8. Return formatted response
    return this.formatBookingResponse(
      booking,
      roomType,
      priceBreakdown,
      guest,
      dto.numberOfRooms,
      numberOfNights,
    );
  }

  private formatBookingResponse(
    booking: Booking,
    roomType: RoomType,
    priceBreakdown: PriceBreakdown,
    guest: Guest,
    numberOfRooms: number,
    numberOfNights: number,
  ): BookingResponseDto {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      guest: {
        id: guest.id,
        fullName: `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        phone: guest.phone || '',
        whatsapp: guest.whatsapp ? String(guest.whatsapp) : undefined,
      },
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfNights,
      roomType: {
        id: roomType.id,
        name: (roomType.name as string) || 'Unknown',
        ratePerNight: roomType.basePrice,
      },
      numberOfRooms,
      numberOfGuests: booking.numberOfGuests,
      priceBreakdown: {
        totalPrice: priceBreakdown.totalPrice,
        cityTax: priceBreakdown.cityTax,
        vat: priceBreakdown.vat,
        netAmount: priceBreakdown.netAmount,
        discountAmount: priceBreakdown.discountAmount,
      },
      paymentMethod:
        booking.status === BookingStatus.PENDING ? 'PENDING' : 'MOBILE_PAYMENT',
      paymentStatus: 'PENDING',
      status: booking.status,
      note: booking.notes || undefined,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
