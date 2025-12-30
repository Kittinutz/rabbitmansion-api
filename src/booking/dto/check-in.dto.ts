import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class CheckInDto {
  @ApiProperty({
    description: 'Actual check-in time (defaults to current time if not provided)',
    example: '2025-01-15T15:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  actualCheckInTime?: string;

  @ApiProperty({
    description: 'Optional notes about the check-in',
    example: 'Guest arrived early, room was ready',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
