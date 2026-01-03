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
    this.apiKey = this.configService.get<string>('scb.apiKey') || '';
    this.apiSecret = this.configService.get<string>('scb.apiSecret') || '';
    this.billerId = this.configService.get<string>('scb.billerId') || '';
    this.baseUrl =
      this.configService.get<string>('scb.baseUrl') ||
      'https://api-sandbox.partners.scb/partners/sandbox';
    this.webhookSecret =
      this.configService.get<string>('scb.webhookSecret') || '';
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
