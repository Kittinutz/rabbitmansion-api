import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
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
