import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateBookingRequestDto {
  @ApiProperty({
    description: 'Full name of the guest',
    example: 'John Smith',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Zก-๙\s]+$/, {
    message: 'Full name must contain only letters and spaces',
  })
  fullName: string;

  @ApiProperty({
    description: 'Email address of the guest',
    example: 'john.smith@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Phone number of the guest',
    example: '+66812345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9\s\-()]+$/, { message: 'Invalid phone number' })
  phone: string;

  @ApiProperty({
    description: 'WhatsApp number of the guest',
    example: '+66812345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]+$/, { message: 'Invalid WhatsApp number' })
  whatsapp?: string;

  @ApiProperty({
    description: 'Check-in date (ISO 8601 format)',
    example: '2025-01-15T14:00:00.000Z',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    description: 'Check-out date (ISO 8601 format)',
    example: '2025-01-18T12:00:00.000Z',
  })
  @IsDateString()
  checkOut: string;

  @ApiProperty({
    description: 'Room type ID (UUID)',
    example: 'cm123456789',
  })
  @IsString()
  @IsNotEmpty()
  roomType: string;

  @ApiProperty({
    description: 'Number of rooms to book',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Must book at least 1 room' })
  numberOfRooms: number;

  @ApiProperty({
    description: 'Total number of guests',
    example: 4,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Must have at least 1 guest' })
  guests: number;

  @ApiProperty({
    description: 'Special requests or notes',
    example: 'Late check-in expected',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['QR_CODE', 'VISA'],
    example: 'QR_CODE',
  })
  @IsEnum(['QR_CODE', 'VISA'])
  @IsNotEmpty()
  paymentMethod: 'QR_CODE' | 'VISA';
}
