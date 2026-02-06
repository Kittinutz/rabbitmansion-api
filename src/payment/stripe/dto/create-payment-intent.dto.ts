import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ 
    description: 'Booking number',
    example: 'BK12345'
  })
  @IsString()
  bookingNumber: string;

  @ApiProperty({ 
    description: 'Payment amount in THB',
    example: 5000,
    minimum: 100
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ 
    description: 'Payment method type',
    enum: ['card', 'promptpay', 'alipay', 'wechat_pay', 'grabpay'],
    example: 'card'
  })
  @IsEnum(['card', 'promptpay', 'alipay', 'wechat_pay', 'grabpay'])
  paymentMethodType: string;

  @ApiProperty({ 
    description: 'Customer email',
    example: 'customer@example.com',
    required: false
  })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ 
    description: 'Customer ID for saved cards',
    required: false
  })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ 
    description: 'Saved payment method ID',
    required: false
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({ 
    description: 'Payment description',
    example: 'Hotel booking payment',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;
}
