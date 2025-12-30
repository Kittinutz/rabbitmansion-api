import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, IsOptional } from 'class-validator';

export class AssignRoomsDto {
  @ApiProperty({
    description: 'Array of room IDs to assign to the booking',
    example: ['cm4u1234abcd5678efgh9012', 'cm4u5678abcd9012efgh3456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one room must be assigned' })
  roomIds: string[];

  @ApiProperty({
    description: 'Optional notes about the room assignment',
    example: 'Assigned as per guest preference for connecting rooms',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
