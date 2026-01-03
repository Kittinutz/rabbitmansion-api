# SCB Payment Implementation Examples

## Complete Implementation Code Examples

### 1. DTOs (Data Transfer Objects)

#### `src/payment/scb/dto/create-qr-payment.dto.ts`

```typescript
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
```

#### `src/payment/scb/dto/scb-webhook.dto.ts`

```typescript
import { IsString, IsNumber, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ScbWebhookDto {
  @IsString()
  transactionId: string;

  @IsString()
  billPaymentRef1: string;

  @IsString()
  @IsOptional()
  billPaymentRef2?: string;

  @IsString()
  @IsOptional()
  billPaymentRef3?: string;

  @IsNumber()
  amount: number;

  @IsString()
  status: string;

  @Type(() => Date)
  @IsDate()
  paidAt: Date;

  @IsString()
  @IsOptional()
  sendingBank?: string;

  @IsString()
  @IsOptional()
  payerAccount?: string;
}
```

#### `src/payment/scb/dto/index.ts`

```typescript
export * from './create-qr-payment.dto';
export * from './scb-webhook.dto';
```

### 2. SCB Service (Complete)

#### `src/payment/scb/scb.service.ts`

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prima/prisma.service';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { PaymentStatus, BookingStatus } from '../../../prisma/generated/prisma';

@Injectable()
export class ScbService {
  private readonly logger = new Logger(ScbService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly billerId: string;
  private readonly baseUrl: string;
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('scb.apiKey');
    this.apiSecret = this.configService.get<string>('scb.apiSecret');
    this.billerId = this.configService.get<string>('scb.billerId');
    this.baseUrl = this.configService.get<string>('scb.baseUrl');
    this.webhookSecret = this.configService.get<string>('scb.webhookSecret');
  }

  /**
   * Generate OAuth token for SCB API
   */
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString(
        'base64',
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/oauth/token`,
          {
            grant_type: 'client_credentials',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${auth}`,
              'accept-language': 'EN',
            },
          },
        ),
      );

      return response.data.data.accessToken;
    } catch (error) {
      this.logger.error(
        'Failed to get SCB access token',
        error.response?.data || error,
      );
      throw new BadRequestException('Failed to authenticate with SCB');
    }
  }

  /**
   * Generate unique request ID for SCB API
   */
  private generateRequestId(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create QR Code for payment (PromptPay)
   */
  async createQrPayment(
    bookingNumber: string,
    amount: number,
    description?: string,
  ) {
    try {
      // 1. Validate booking exists
      const booking = await this.prisma.booking.findUnique({
        where: { bookingNumber },
        include: { guest: true },
      });

      if (!booking) {
        throw new BadRequestException(`Booking ${bookingNumber} not found`);
      }

      // 2. Get access token
      const accessToken = await this.getAccessToken();
      const requestId = this.generateRequestId();

      // 3. Prepare QR payload
      const payload = {
        qrType: 'PP', // PromptPay
        ppType: 'BILLERID',
        ppId: this.billerId,
        amount: amount.toFixed(2),
        ref1: bookingNumber,
        ref2: booking.guest.phone?.substring(0, 20) || '',
        ref3: 'RMH', // Rabbit Mansion Hotel
      };

      this.logger.log(
        `Creating QR payment for booking ${bookingNumber}, amount: ${amount}`,
      );

      // 4. Call SCB API
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/payment/qrcode/create`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              requestUId: requestId,
              resourceOwnerId: this.apiKey,
              'accept-language': 'EN',
            },
          },
        ),
      );

      // 5. Store payment record
      const payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount,
          paymentMethod: 'QR_CODE',
          status: PaymentStatus.PENDING,
          transactionId: requestId,
          paymentDetails: {
            requestId,
            qrImage: response.data.data.qrImage,
            qrRawData: response.data.data.qrRawData,
            description: description || `Payment for booking ${bookingNumber}`,
            ref1: bookingNumber,
            ref2: payload.ref2,
            ref3: payload.ref3,
            createdAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`QR payment created successfully: ${payment.id}`);

      return {
        paymentId: payment.id,
        qrImage: response.data.data.qrImage,
        qrRawData: response.data.data.qrRawData,
        amount,
        bookingNumber,
        expiresIn: 300, // 5 minutes standard QR expiration
      };
    } catch (error) {
      this.logger.error(
        `Failed to create QR payment: ${error.message}`,
        error.response?.data || error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error.response?.data?.status?.description ||
          'Failed to create payment QR code',
      );
    }
  }

  /**
   * Create deep link for SCB Easy App payment
   */
  async createDeepLinkPayment(bookingNumber: string, amount: number) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { bookingNumber },
      });

      if (!booking) {
        throw new BadRequestException(`Booking ${bookingNumber} not found`);
      }

      const accessToken = await this.getAccessToken();
      const requestId = this.generateRequestId();

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v3/deeplink/transactions`,
          {
            transactionType: 'PAYMENT',
            billerId: this.billerId,
            reference1: bookingNumber,
            amount: amount.toFixed(2),
            currency: 'THB',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              requestUId: requestId,
              resourceOwnerId: this.apiKey,
            },
          },
        ),
      );

      return {
        deepLink: response.data.data.deeplinkUrl,
        transactionId: response.data.data.transactionId,
      };
    } catch (error) {
      this.logger.error('Failed to create deep link', error);
      throw new BadRequestException('Failed to create payment deep link');
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      // Return stored payment status
      return {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
        bookingNumber: payment.booking.bookingNumber,
      };
    } catch (error) {
      this.logger.error('Failed to check payment status', error);
      throw new BadRequestException('Failed to check payment status');
    }
  }

  /**
   * Handle webhook from SCB
   */
  async handleWebhook(payload: any, signature: string) {
    try {
      this.logger.log('Received SCB webhook', payload);

      // 1. Verify webhook signature
      if (
        this.webhookSecret &&
        !this.verifyWebhookSignature(payload, signature)
      ) {
        this.logger.error('Invalid webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }

      const { transactionId, billPaymentRef1, amount, status, paidAt } =
        payload;

      // 2. Find booking by reference
      const booking = await this.prisma.booking.findUnique({
        where: { bookingNumber: billPaymentRef1 },
        include: { payments: true },
      });

      if (!booking) {
        this.logger.warn(`Booking not found for ref1: ${billPaymentRef1}`);
        return { success: false, message: 'Booking not found' };
      }

      // 3. Find pending payment
      const payment = booking.payments.find(
        (p) => p.status === PaymentStatus.PENDING,
      );

      if (!payment) {
        this.logger.warn(
          `No pending payment found for booking: ${billPaymentRef1}`,
        );
        return { success: false, message: 'No pending payment' };
      }

      // 4. Update payment status
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:
            status === 'success' ? PaymentStatus.PAID : PaymentStatus.FAILED,
          transactionId,
          paidAt: status === 'success' ? new Date(paidAt) : null,
          paymentDetails: {
            ...(payment.paymentDetails as object),
            webhookData: payload,
            processedAt: new Date().toISOString(),
          },
        },
      });

      // 5. Update booking status if fully paid
      if (status === 'success') {
        const totalPaid =
          booking.payments
            .filter((p) => p.status === PaymentStatus.PAID)
            .reduce((sum, p) => sum + p.amount, 0) + amount;

        if (totalPaid >= booking.finalAmount) {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CONFIRMED },
          });

          this.logger.log(
            `Booking ${billPaymentRef1} confirmed after full payment`,
          );
        }
      }

      this.logger.log(
        `Payment webhook processed successfully for booking: ${billPaymentRef1}`,
      );

      return {
        success: true,
        paymentId: updatedPayment.id,
        bookingNumber: billPaymentRef1,
      };
    } catch (error) {
      this.logger.error('Failed to process webhook', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping verification');
      return true;
    }

    try {
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const calculatedSignature = hmac.update(payloadString).digest('hex');

      return calculatedSignature === signature;
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
      return false;
    }
  }

  /**
   * Request refund for a payment
   */
  async requestRefund(paymentId: string, refundAmount?: number) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new BadRequestException('Can only refund paid payments');
      }

      const amountToRefund = refundAmount || payment.amount;

      if (amountToRefund > payment.amount) {
        throw new BadRequestException('Refund amount exceeds payment amount');
      }

      const accessToken = await this.getAccessToken();
      const requestId = this.generateRequestId();

      // Note: SCB refund API endpoint - check actual API documentation
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/payment/refund`,
          {
            transactionId: payment.transactionId,
            refundAmount: amountToRefund.toFixed(2),
            reason: 'Customer requested refund',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              requestUId: requestId,
              resourceOwnerId: this.apiKey,
            },
          },
        ),
      );

      // Update payment status
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          paymentDetails: {
            ...(payment.paymentDetails as object),
            refund: {
              amount: amountToRefund,
              requestId,
              refundedAt: new Date().toISOString(),
              scbResponse: response.data,
            },
          },
        },
      });

      this.logger.log(
        `Refund processed for payment ${paymentId}: ${amountToRefund} THB`,
      );

      return {
        success: true,
        refundAmount: amountToRefund,
        refundId: response.data.data.refundId,
      };
    } catch (error) {
      this.logger.error('Failed to process refund', error);
      throw new BadRequestException('Failed to process refund');
    }
  }
}
```

### 3. SCB Controller (Complete)

#### `src/payment/scb/scb.controller.ts`

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { ScbService } from './scb.service';
import { CreateQrPaymentDto } from './dto';

@ApiTags('SCB Payment')
@Controller('payment/scb')
export class ScbController {
  constructor(private readonly scbService: ScbService) {}

  @Post('qr')
  @ApiOperation({
    summary: 'Create QR code for payment',
    description: 'Generates a PromptPay QR code for booking payment',
  })
  @ApiResponse({
    status: 201,
    description: 'QR code created successfully',
    schema: {
      example: {
        paymentId: 'cm4abc123',
        qrImage: 'data:image/png;base64,iVBORw0KG...',
        qrRawData: '00020101021129370016...',
        amount: 5000,
        bookingNumber: 'BK20260103001',
        expiresIn: 300,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or booking not found',
  })
  async createQrPayment(@Body() dto: CreateQrPaymentDto) {
    return this.scbService.createQrPayment(
      dto.bookingNumber,
      dto.amount,
      dto.description,
    );
  }

  @Post('deeplink')
  @ApiOperation({
    summary: 'Create deep link for SCB Easy App payment',
    description: 'Generates a deep link that opens SCB Easy App for payment',
  })
  @ApiResponse({
    status: 201,
    description: 'Deep link created successfully',
    schema: {
      example: {
        deepLink: 'scbeasy://payment?transactionId=xxx',
        transactionId: 'xxx',
      },
    },
  })
  async createDeepLink(@Body() dto: CreateQrPaymentDto) {
    return this.scbService.createDeepLinkPayment(dto.bookingNumber, dto.amount);
  }

  @Get('status/:paymentId')
  @ApiOperation({
    summary: 'Check payment status',
    description: 'Retrieves the current status of a payment',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved',
    schema: {
      example: {
        paymentId: 'cm4abc123',
        status: 'PAID',
        amount: 5000,
        transactionId: 'SCB2026010312345678',
        paidAt: '2026-01-03T10:30:00Z',
        bookingNumber: 'BK20260103001',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async checkStatus(@Param('paymentId') paymentId: string) {
    return this.scbService.checkPaymentStatus(paymentId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SCB payment webhook',
    description: 'Receives payment status updates from SCB (for SCB use only)',
  })
  @ApiHeader({
    name: 'x-scb-signature',
    description: 'HMAC signature for webhook verification',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or payload' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-scb-signature') signature: string,
  ) {
    return this.scbService.handleWebhook(payload, signature);
  }

  @Post('refund/:paymentId')
  @ApiOperation({
    summary: 'Request payment refund',
    description: 'Initiates a refund for a paid payment',
  })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment or refund not allowed',
  })
  async requestRefund(
    @Param('paymentId') paymentId: string,
    @Body('amount') amount?: number,
  ) {
    return this.scbService.requestRefund(paymentId, amount);
  }
}
```

### 4. SCB Module (Complete)

#### `src/payment/scb/scb.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScbController } from './scb.controller';
import { ScbService } from './scb.service';
import { PrismaModule } from '../../prima/prisma.module';
import scbConfig from './config/scb.config';

@Module({
  imports: [
    ConfigModule.forFeature(scbConfig),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    PrismaModule,
  ],
  controllers: [ScbController],
  providers: [ScbService],
  exports: [ScbService],
})
export class ScbModule {}
```

### 5. Integration with Booking Module

#### Update `src/booking/booking.controller.ts`

```typescript
import { ScbService } from '../payment/scb/scb.service';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly scbService: ScbService,
  ) {}

  @Post()
  async createBooking(@Body() dto: CreateBookingRequestDto) {
    // Create booking
    const booking = await this.bookingService.createBookingFromRequest(dto);

    // Generate payment QR
    const payment = await this.scbService.createQrPayment(
      booking.bookingNumber,
      booking.priceBreakdown.totalPrice,
      `Payment for booking ${booking.bookingNumber}`,
    );

    return {
      ...booking,
      payment,
    };
  }
}
```

## Frontend Integration Examples

### React/Next.js Component

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function PaymentQRCode({ bookingNumber, amount }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/scb/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingNumber, amount }),
      });

      const data = await response.json();
      setQrCode(data);
    } catch (error) {
      console.error('Failed to generate QR:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h2>Payment for {bookingNumber}</h2>
      <p>Amount: {amount} THB</p>

      {!qrCode && (
        <button onClick={generateQR} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Payment QR'}
        </button>
      )}

      {qrCode && (
        <div className="qr-display">
          <Image
            src={qrCode.qrImage}
            alt="Payment QR Code"
            width={300}
            height={300}
          />
          <p>Scan with any PromptPay app</p>
          <p>Expires in: {qrCode.expiresIn} seconds</p>
        </div>
      )}
    </div>
  );
}
```

## Testing Script

```bash
#!/bin/bash

# Test QR Generation
echo "Testing QR code generation..."
curl -X POST http://localhost:3000/payment/scb/qr \
  -H "Content-Type: application/json" \
  -d '{
    "bookingNumber": "BK20260103001",
    "amount": 100,
    "description": "Test payment"
  }' | jq .

# Test Payment Status
echo "Testing payment status check..."
PAYMENT_ID="your-payment-id"
curl http://localhost:3000/payment/scb/status/$PAYMENT_ID | jq .
```

Save as `test-scb-payment.sh` and run:

```bash
chmod +x test-scb-payment.sh
./test-scb-payment.sh
```
