import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class CheckOutDto {
  @ApiProperty({
    description: 'Actual check-out time (defaults to current time if not provided)',
    example: '2025-01-18T11:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  actualCheckOutTime?: string;

  @ApiProperty({
    description: 'Optional notes about the check-out',
    example: 'Guest checked out on time, no issues',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
