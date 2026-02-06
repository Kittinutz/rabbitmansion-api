import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveCardDto {
  @ApiProperty({ 
    description: 'Guest ID',
    example: 'guest_123'
  })
  @IsString()
  guestId: string;

  @ApiProperty({ 
    description: 'Payment method ID from Stripe',
    example: 'pm_1234567890'
  })
  @IsString()
  paymentMethodId: string;

  @ApiProperty({ 
    description: 'Set as default card',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
