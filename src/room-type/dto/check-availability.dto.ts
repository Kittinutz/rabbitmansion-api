import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Check-in date (ISO 8601 format)',
    example: '2025-12-20T14:00:00Z',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({
    description: 'Check-out date (ISO 8601 format)',
    example: '2025-12-25T12:00:00Z',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;
}
