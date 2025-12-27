import { ApiProperty } from '@nestjs/swagger';

export class BookingResponseDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'cm987654321',
  })
  id: string;

  @ApiProperty({
    description: 'Unique booking number',
    example: 'BK20250115001',
  })
  bookingNumber: string;

  @ApiProperty({
    description: 'Guest information',
  })
  guest: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    whatsapp?: string;
  };

  @ApiProperty({
    description: 'Check-in date',
    example: '2025-01-15T14:00:00.000Z',
  })
  checkInDate: Date;

  @ApiProperty({
    description: 'Check-out date',
    example: '2025-01-18T12:00:00.000Z',
  })
  checkOutDate: Date;

  @ApiProperty({
    description: 'Number of nights (calculated)',
    example: 3,
  })
  numberOfNights: number;

  @ApiProperty({
    description: 'Room type information (not assigned yet)',
  })
  roomType: {
    id: string;
    name: string;
    ratePerNight: number;
  };

  @ApiProperty({
    description: 'Requested number of rooms',
    example: 2,
  })
  numberOfRooms: number;

  @ApiProperty({
    description: 'Total number of guests',
    example: 4,
  })
  numberOfGuests: number;

  @ApiProperty({
    description: 'Price breakdown',
  })
  priceBreakdown: {
    totalPrice: number;
    cityTax: number;
    vat: number;
    netAmount: number;
    discountAmount: number;
  };

  @ApiProperty({
    description: 'Payment method',
    example: 'MOBILE_PAYMENT',
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'PENDING',
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Booking status',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'Special requests or notes',
    example: 'Late check-in expected',
    required: false,
  })
  note?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-12-28T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-12-28T10:00:00.000Z',
  })
  updatedAt: Date;
}
