import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQrPaymentDto {
  @ApiProperty({
    example: 'BK20260103001',
    description: 'Booking number for payment reference',
  })
  @IsString()
  bookingNumber: string;

  @ApiProperty({
    example: 5000,
    description: 'Payment amount in THB',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'Payment for booking BK20260103001',
    description: 'Payment description (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
