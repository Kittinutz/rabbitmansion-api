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
  AssignRoomsDto,
  CheckInDto,
  CheckOutDto,
  BookingListQuery,
  BookingListResponse,
  BookingDetailResponse,
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

    // Get roomTypeId from the first room
    const roomTypeId = roomRates[0]?.roomTypeId;
    if (!roomTypeId) {
      throw new BadRequestException(
        'Unable to determine room type for booking',
      );
    }

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
          roomTypeId,
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
          roomTypeId: true,
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
          roomTypeId: room.roomTypeId,
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
          roomTypeId: roomType.id,
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
        name:
          typeof roomType.name === 'string'
            ? roomType.name
            : (roomType.name as any)?.en ||
              (roomType.name as any)?.th ||
              'Unknown',
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

  // New Booking Management Methods

  async findAllBookings(query: BookingListQuery): Promise<BookingListResponse> {
    // Check if any query parameters are provided
    const hasQueryParams =
      query.page ||
      query.limit ||
      query.status ||
      query.guestEmail ||
      query.guestPhone ||
      query.bookingNumber ||
      query.checkInFrom ||
      query.checkInTo ||
      query.checkOutFrom ||
      query.checkOutTo ||
      query.sortBy ||
      query.sortOrder;

    // If no query params, return all bookings sorted by checkInDate desc
    if (!hasQueryParams) {
      const bookings = await this.prisma.booking.findMany({
        orderBy: { checkInDate: 'desc' },
        include: {
          guest: true,
          roomBookings: {
            include: {
              room: {
                include: { roomType: true },
              },
            },
          },
        },
      });

      const data = bookings.map((booking) => {
        const numberOfNights = dayjs(booking.checkOutDate).diff(
          dayjs(booking.checkInDate),
          'day',
        );

        // Get room type from first room booking if available
        const firstRoomBooking = booking.roomBookings[0];
        const roomType = firstRoomBooking?.room?.roomType;

        return {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          guest: {
            id: booking.guest.id,
            fullName: `${booking.guest.firstName} ${booking.guest.lastName}`,
            email: booking.guest.email,
            phone: booking.guest.phone || '',
          },
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          numberOfNights,
          numberOfGuests: booking.numberOfGuests,
          roomType: roomType
            ? {
                id: roomType.id,
                name:
                  typeof roomType.name === 'string'
                    ? roomType.name
                    : (roomType.name as any)?.en ||
                      (roomType.name as any)?.th ||
                      'Unknown',
              }
            : null,
          numberOfRooms: Math.ceil(
            booking.totalAmount / (roomType?.basePrice || 1) / numberOfNights ||
              1,
          ),
          assignedRooms: booking.roomBookings.length,
          totalAmount: booking.totalAmount,
          status: booking.status,
          createdAt: booking.createdAt,
        };
      });

      return {
        data,
        pagination: {
          page: 1,
          limit: data.length,
          totalItems: data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Otherwise, use pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.guestEmail) {
      where.guest = {
        ...where.guest,
        email: { contains: query.guestEmail, mode: 'insensitive' },
      };
    }

    if (query.guestPhone) {
      where.guest = {
        ...where.guest,
        phone: { contains: query.guestPhone },
      };
    }

    if (query.bookingNumber) {
      where.bookingNumber = {
        contains: query.bookingNumber,
        mode: 'insensitive',
      };
    }

    if (query.checkInFrom) {
      where.checkInDate = { gte: new Date(query.checkInFrom) };
    }

    if (query.checkInTo) {
      where.checkInDate = {
        ...where.checkInDate,
        lte: new Date(query.checkInTo),
      };
    }

    if (query.checkOutFrom) {
      where.checkOutDate = { gte: new Date(query.checkOutFrom) };
    }

    if (query.checkOutTo) {
      where.checkOutDate = {
        ...where.checkOutDate,
        lte: new Date(query.checkOutTo),
      };
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [bookings, totalItems] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          guest: true,
          roomBookings: {
            include: {
              room: {
                include: { roomType: true },
              },
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const data = bookings.map((booking) => {
      const numberOfNights = dayjs(booking.checkOutDate).diff(
        dayjs(booking.checkInDate),
        'day',
      );

      // Get room type from first room booking if available
      const firstRoomBooking = booking.roomBookings[0];
      const roomType = firstRoomBooking?.room?.roomType;

      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        guest: {
          id: booking.guest.id,
          fullName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          email: booking.guest.email,
          phone: booking.guest.phone || '',
        },
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfNights,
        numberOfGuests: booking.numberOfGuests,
        roomType: roomType
          ? {
              id: roomType.id,
              name:
                typeof roomType.name === 'string'
                  ? roomType.name
                  : (roomType.name as any)?.en ||
                    (roomType.name as any)?.th ||
                    'Unknown',
            }
          : null,
        numberOfRooms: Math.ceil(
          booking.totalAmount / (roomType?.basePrice || 1) / numberOfNights ||
            1,
        ),
        assignedRooms: booking.roomBookings.length,
        totalAmount: booking.totalAmount,
        status: booking.status,
        createdAt: booking.createdAt,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getBookingDetail(id: string): Promise<BookingDetailResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        roomBookings: {
          include: {
            room: {
              include: { roomType: true },
            },
          },
        },
        roomType: true,
        payments: true,
        createdBy: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    const numberOfNights = dayjs(booking.checkOutDate).diff(
      dayjs(booking.checkInDate),
      'day',
    );

    // Get room type from first room booking if available
    const roomType = booking?.roomType as RoomType;
    // Calculate number of rooms from total amount or count room bookings
    const numberOfRooms =
      booking.roomBookings.length > 0
        ? booking.roomBookings.length
        : Math.ceil(
            booking.totalAmount /
              (booking.roomType?.basePrice || 1) /
              numberOfNights || 1,
          );

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      guest: {
        id: booking.guest.id,
        fullName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        email: booking.guest.email,
        phone: booking.guest.phone || '',
        whatsapp: booking.guest.whatsapp
          ? String(booking.guest.whatsapp)
          : undefined,
        totalStays: booking.guest.totalStays,
        totalSpent: booking.guest.totalSpent,
      },
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfNights,
      actualCheckIn: booking.actualCheckIn || undefined,
      actualCheckOut: booking.actualCheckOut || undefined,
      roomType: roomType
        ? {
            id: roomType.id,
            name:
              typeof roomType.name === 'string'
                ? roomType.name
                : (roomType.name as any)?.en ||
                  (roomType.name as any)?.th ||
                  'Unknown',
            description:
              typeof roomType.description === 'string'
                ? roomType.description
                : (roomType.description as any)?.en ||
                  (roomType.description as any)?.th ||
                  '',
            basePrice: roomType.basePrice,
            capacity: roomType.capacity,
            bedType: roomType.bedType,
            amenities: roomType.amenities || [],
          }
        : null,
      numberOfRooms,
      assignedRooms: booking.roomBookings.map((rb) => ({
        id: rb.id,
        roomId: rb.roomId,
        roomNumber: rb.room.roomNumber,
        floor: rb.room.floor,
        roomRate: rb.roomRate,
        status: rb.status,
        assignedAt: rb.createdAt,
      })),
      numberOfGuests: booking.numberOfGuests,
      numberOfChildren: booking.numberOfChildren,
      priceBreakdown: {
        totalPrice: booking.totalAmount,
        cityTax: booking.taxAmount,
        vat: booking.serviceCharges,
        netAmount:
          booking.totalAmount - booking.taxAmount - booking.serviceCharges,
        discountAmount: booking.discountAmount,
      },
      payments: booking.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.paymentMethod,
        status: p.status,
        paidAt: p.paidAt || undefined,
      })),
      status: booking.status,
      specialRequests: booking.specialRequests || undefined,
      notes: booking.notes || undefined,
      source: booking.source || undefined,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      createdBy: booking.createdBy
        ? {
            id: booking.createdBy.id,
            name: `${booking.createdBy.firstName} ${booking.createdBy.lastName}` as string,
          }
        : undefined,
    };
  }

  async assignRooms(
    bookingId: string,
    dto: AssignRoomsDto,
  ): Promise<BookingDetailResponse> {
    // 1. Get booking and validate
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        roomBookings: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Can only assign rooms to PENDING bookings',
      );
    }

    // Calculate expected number of rooms from booking amount
    const numberOfNights = dayjs(booking.checkOutDate).diff(
      dayjs(booking.checkInDate),
      'day',
    );
    const expectedRooms = Math.ceil(
      booking.totalAmount / numberOfNights / 2000,
    ); // Assuming average price, will improve

    if (dto.roomIds.length !== expectedRooms) {
      throw new BadRequestException(
        `Number of rooms (${dto.roomIds.length}) does not match booking requirement (${expectedRooms})`,
      );
    }

    // 2. Validate all rooms
    const rooms = await this.prisma.room.findMany({
      where: { id: { in: dto.roomIds } },
      include: { roomType: true },
    });

    if (rooms.length !== dto.roomIds.length) {
      throw new BadRequestException('One or more rooms not found');
    }

    // Check all rooms are AVAILABLE
    const unavailableRooms = rooms.filter(
      (r) => r.status !== RoomStatus.AVAILABLE,
    );
    if (unavailableRooms.length > 0) {
      throw new BadRequestException(
        `Rooms ${unavailableRooms.map((r) => r.roomNumber).join(', ')} are not available`,
      );
    }

    // 3. Check for booking conflicts
    await this.validateRoomsAvailability(
      dto.roomIds,
      booking.checkInDate,
      booking.checkOutDate,
    );

    // 4. Create room assignments in transaction
    await this.prisma.$transaction(async (tx) => {
      // Create RoomBooking records
      const roomBookings = dto.roomIds.map((roomId) => {
        const room = rooms.find((r) => r.id === roomId)!;
        return {
          roomId,
          bookingId,
          roomRate: room.roomType.basePrice,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          status: RoomBookingStatus.ASSIGNED,
          notes: dto.notes,
        };
      });

      await tx.roomBooking.createMany({ data: roomBookings });

      // Update room status to OCCUPIED
      await tx.room.updateMany({
        where: { id: { in: dto.roomIds } },
        data: { status: RoomStatus.OCCUPIED },
      });

      // Update booking status to CONFIRMED
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });
    });

    return this.getBookingDetail(bookingId);
  }

  async checkIn(
    bookingId: string,
    dto: CheckInDto,
  ): Promise<BookingDetailResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        roomBookings: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking must be CONFIRMED to check in');
    }

    if (!booking.roomBookings || booking.roomBookings.length === 0) {
      throw new BadRequestException('No rooms assigned to this booking');
    }

    const checkInTime = dto.actualCheckInTime
      ? new Date(dto.actualCheckInTime)
      : new Date();

    await this.prisma.$transaction(async (tx) => {
      // Update booking
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CHECKED_IN,
          actualCheckIn: checkInTime,
          notes: dto.notes || booking.notes,
        },
      });

      // Update room bookings
      await tx.roomBooking.updateMany({
        where: { bookingId },
        data: { status: RoomBookingStatus.CHECKED_IN },
      });

      // Update room status to OCCUPIED
      const roomIds = booking.roomBookings.map((rb) => rb.roomId);
      await tx.room.updateMany({
        where: { id: { in: roomIds } },
        data: { status: RoomStatus.OCCUPIED },
      });
    });

    return this.getBookingDetail(bookingId);
  }

  async checkOut(
    bookingId: string,
    dto: CheckOutDto,
  ): Promise<BookingDetailResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        roomBookings: true,
        guest: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException('Booking must be CHECKED_IN to check out');
    }

    const checkOutTime = dto.actualCheckOutTime
      ? new Date(dto.actualCheckOutTime)
      : new Date();

    await this.prisma.$transaction(async (tx) => {
      // Update booking
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CHECKED_OUT,
          actualCheckOut: checkOutTime,
          notes: dto.notes || booking.notes,
        },
      });

      // Update room bookings
      await tx.roomBooking.updateMany({
        where: { bookingId },
        data: { status: RoomBookingStatus.CHECKED_OUT },
      });

      // Update room status to CLEANING
      const roomIds = booking.roomBookings.map((rb) => rb.roomId);
      await tx.room.updateMany({
        where: { id: { in: roomIds } },
        data: { status: RoomStatus.CLEANING },
      });

      // Update guest stats
      await tx.guest.update({
        where: { id: booking.guestId },
        data: {
          totalStays: { increment: 1 },
          totalSpent: { increment: booking.totalAmount },
        },
      });
    });

    return this.getBookingDetail(bookingId);
  }
}
