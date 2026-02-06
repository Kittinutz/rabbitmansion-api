import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prima/prisma.service';
import {
  CreatePaymentIntentDto,
  ConfirmPaymentDto,
  SaveCardDto,
} from './dto';
import {
  StripePaymentIntentResult,
  StripeCustomerResult,
  StripeSavedCard,
  StripeRefundResult,
} from './types';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly defaultCurrency: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey') || '';
    const apiVersion = this.configService.get<string>('stripe.apiVersion') || '2023-10-16';
    
    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as Stripe.LatestApiVersion,
      typescript: true,
    });

    this.webhookSecret = this.configService.get<string>('stripe.webhookSecret') || '';
    this.defaultCurrency = this.configService.get<string>('stripe.currency') || 'thb';
    
    this.logger.log('Stripe service initialized');
  }

  /**
   * Create a payment intent for various payment methods
   */
  async createPaymentIntent(
    dto: CreatePaymentIntentDto,
  ): Promise<StripePaymentIntentResult> {
    try {
      // Find booking
      const booking = await this.prisma.booking.findUnique({
        where: { bookingNumber: dto.bookingNumber },
        include: { guest: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking ${dto.bookingNumber} not found`);
      }

      // Get or create Stripe customer
      let customerId = dto.customerId;
      if (!customerId && dto.customerEmail) {
        const customer = await this.getOrCreateCustomer(
          dto.customerEmail,
          booking.guest.firstName,
          booking.guest.lastName,
        );
        customerId = customer.customerId;
      }

      // Prepare payment intent params
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(dto.amount * 100), // Convert to cents
        currency: this.defaultCurrency,
        payment_method_types: [dto.paymentMethodType as Stripe.PaymentIntentCreateParams.PaymentMethodType],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          guestId: booking.guestId,
        },
        description: dto.description || `Payment for booking ${booking.bookingNumber}`,
      };

      // Add customer if available
      if (customerId) {
        paymentIntentParams.customer = customerId;
      }

      // Add payment method if provided (for saved cards)
      if (dto.paymentMethodId) {
        paymentIntentParams.payment_method = dto.paymentMethodId;
        paymentIntentParams.confirm = false; // Will confirm separately
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      // Save to database
      await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: dto.amount,
          currency: this.defaultCurrency.toUpperCase(),
          paymentMethod: this.mapPaymentMethodToEnum(dto.paymentMethodType),
          status: 'PENDING',
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customerId,
          stripePaymentMethodId: dto.paymentMethodId,
          clientSecret: paymentIntent.client_secret,
          requiresAction: paymentIntent.status === 'requires_action',
          description: dto.description,
          paymentDetails: {
            paymentMethodType: dto.paymentMethodType,
            created: paymentIntent.created,
          },
        },
      });

      // Extract QR code if applicable (for PromptPay, Alipay, WeChat)
      let qrCode: string | undefined;
      if (paymentIntent.next_action?.type === 'display_bank_transfer_instructions') {
        // @ts-ignore - Stripe types might not include all payment methods
        qrCode = paymentIntent.next_action?.display_bank_transfer_instructions?.hosted_instructions_url;
      } else if (paymentIntent.next_action?.promptpay_display_qr_code) {
        // @ts-ignore
        qrCode = paymentIntent.next_action.promptpay_display_qr_code.data;
      }

      this.logger.log(`Payment intent created: ${paymentIntent.id} for booking ${booking.bookingNumber}`);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: dto.amount,
        currency: this.defaultCurrency,
        status: paymentIntent.status,
        paymentMethod: dto.paymentMethodType,
        customerId,
        qrCode,
        requiresAction: paymentIntent.status === 'requires_action',
      };
    } catch (error) {
      this.logger.error(`Failed to create payment intent: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(dto: ConfirmPaymentDto): Promise<StripePaymentIntentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(dto.paymentIntentId);

      // Update database
      await this.prisma.payment.update({
        where: { stripePaymentIntentId: dto.paymentIntentId },
        data: {
          status: this.mapStripeStatusToEnum(paymentIntent.status),
          requiresAction: paymentIntent.status === 'requires_action',
        },
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
      };
    } catch (error) {
      this.logger.error(`Failed to confirm payment: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to confirm payment: ${error.message}`);
    }
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateCustomer(
    email: string,
    firstName?: string,
    lastName?: string,
  ): Promise<StripeCustomerResult> {
    try {
      // Search for existing customer
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        return {
          customerId: customer.id,
          email: customer.email!,
          metadata: customer.metadata,
        };
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
        metadata: {
          source: 'rabbitmansion-api',
        },
      });

      this.logger.log(`Created Stripe customer: ${customer.id} for ${email}`);

      return {
        customerId: customer.id,
        email: customer.email!,
        metadata: customer.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get/create customer: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get/create customer: ${error.message}`);
    }
  }

  /**
   * Save a card for future use
   */
  async saveCard(dto: SaveCardDto): Promise<StripeSavedCard> {
    try {
      // Get payment method details from Stripe
      const paymentMethod = await this.stripe.paymentMethods.retrieve(dto.paymentMethodId);

      if (paymentMethod.type !== 'card' || !paymentMethod.card) {
        throw new BadRequestException('Payment method must be a card');
      }

      // Get guest to find/create Stripe customer
      const guest = await this.prisma.guest.findUnique({
        where: { id: dto.guestId },
      });

      if (!guest) {
        throw new NotFoundException(`Guest ${dto.guestId} not found`);
      }

      // Get or create customer
      const customer = await this.getOrCreateCustomer(
        guest.email,
        guest.firstName,
        guest.lastName,
      );

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(dto.paymentMethodId, {
        customer: customer.customerId,
      });

      // If setting as default, update other cards
      if (dto.isDefault) {
        await this.prisma.savedCard.updateMany({
          where: {
            guestId: dto.guestId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });

        // Set as default in Stripe
        await this.stripe.customers.update(customer.customerId, {
          invoice_settings: {
            default_payment_method: dto.paymentMethodId,
          },
        });
      }

      // Save to database
      const savedCard = await this.prisma.savedCard.create({
        data: {
          guestId: dto.guestId,
          stripeCustomerId: customer.customerId,
          stripePaymentMethodId: dto.paymentMethodId,
          cardLast4: paymentMethod.card.last4,
          cardBrand: paymentMethod.card.brand,
          cardExpMonth: paymentMethod.card.exp_month,
          cardExpYear: paymentMethod.card.exp_year,
          cardCountry: paymentMethod.card.country || '',
          isDefault: dto.isDefault || false,
        },
      });

      this.logger.log(`Saved card ${paymentMethod.card.last4} for guest ${dto.guestId}`);

      return {
        id: savedCard.id,
        cardLast4: savedCard.cardLast4,
        cardBrand: savedCard.cardBrand,
        cardExpMonth: savedCard.cardExpMonth,
        cardExpYear: savedCard.cardExpYear,
        cardCountry: savedCard.cardCountry || '',
        isDefault: savedCard.isDefault,
      };
    } catch (error) {
      this.logger.error(`Failed to save card: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to save card: ${error.message}`);
    }
  }

  /**
   * Get saved cards for a guest
   */
  async getSavedCards(guestId: string): Promise<StripeSavedCard[]> {
    const savedCards = await this.prisma.savedCard.findMany({
      where: { guestId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return savedCards.map(card => ({
      id: card.id,
      cardLast4: card.cardLast4,
      cardBrand: card.cardBrand,
      cardExpMonth: card.cardExpMonth,
      cardExpYear: card.cardExpYear,
      cardCountry: card.cardCountry || '',
      isDefault: card.isDefault,
    }));
  }

  /**
   * Delete a saved card
   */
  async deleteSavedCard(cardId: string, guestId: string): Promise<void> {
    try {
      const savedCard = await this.prisma.savedCard.findFirst({
        where: {
          id: cardId,
          guestId,
        },
      });

      if (!savedCard) {
        throw new NotFoundException('Saved card not found');
      }

      // Detach from Stripe
      await this.stripe.paymentMethods.detach(savedCard.stripePaymentMethodId);

      // Delete from database
      await this.prisma.savedCard.delete({
        where: { id: cardId },
      });

      this.logger.log(`Deleted saved card ${cardId} for guest ${guestId}`);
    } catch (error) {
      this.logger.error(`Failed to delete saved card: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete saved card: ${error.message}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Payment does not have a Stripe payment intent');
    }

    // Get latest status from Stripe
    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      payment.stripePaymentIntentId,
    );

    // Update database if status changed
    const newStatus = this.mapStripeStatusToEnum(paymentIntent.status);
    if (newStatus !== payment.status) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          paidAt: paymentIntent.status === 'succeeded' ? new Date() : undefined,
        },
      });
    }

    return {
      paymentId: payment.id,
      bookingNumber: payment.booking.bookingNumber,
      amount: payment.amount,
      currency: payment.currency,
      status: newStatus,
      paymentMethod: payment.paymentMethod,
      stripeStatus: paymentIntent.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  /**
   * Process refund
   */
  async processRefund(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<StripeRefundResult> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException(`Payment ${paymentId} not found`);
      }

      if (!payment.stripePaymentIntentId) {
        throw new BadRequestException('Payment does not have a Stripe payment intent');
      }

      if (payment.status !== 'COMPLETED') {
        throw new BadRequestException('Can only refund completed payments');
      }

      // Create refund in Stripe
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: payment.stripePaymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Partial refund
      }

      const refund = await this.stripe.refunds.create(refundParams);

      // Save refund to database
      await this.prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: refund.amount / 100,
          reason: reason || 'Refund requested',
          status: this.mapRefundStatus(refund.status),
          stripeRefundId: refund.id,
        },
      });

      // Update payment status if full refund
      if (!amount || amount >= payment.amount) {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'REFUNDED' },
        });
      }

      this.logger.log(`Processed refund ${refund.id} for payment ${paymentId}`);

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status!,
        reason: refund.reason,
      };
    } catch (error) {
      this.logger.error(`Failed to process refund: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<void> {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );

      this.logger.log(`Received webhook: ${event.type} (${event.id})`);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  // Private helper methods

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { booking: true },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for intent ${paymentIntent.id}`);
      return;
    }

    // Update payment
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        stripeChargeId: paymentIntent.latest_charge as string,
        gatewayResponse: paymentIntent as any,
      },
    });

    // Update booking status
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CONFIRMED' },
    });

    this.logger.log(`Payment ${payment.id} completed for booking ${payment.booking.bookingNumber}`);
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        gatewayResponse: paymentIntent as any,
      },
    });

    this.logger.warn(`Payment failed for intent ${paymentIntent.id}`);
  }

  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'CANCELLED',
        gatewayResponse: paymentIntent as any,
      },
    });

    this.logger.log(`Payment canceled for intent ${paymentIntent.id}`);
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { stripeChargeId: charge.id },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });
    }

    this.logger.log(`Charge ${charge.id} refunded`);
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    this.logger.warn(`Dispute created for charge ${dispute.charge}`);
    // TODO: Implement dispute handling (notifications, admin alerts)
  }

  private mapPaymentMethodToEnum(method: string): string {
    const mapping: Record<string, string> = {
      card: 'CREDIT_CARD',
      promptpay: 'PROMPTPAY',
      alipay: 'ALIPAY',
      wechat_pay: 'WECHAT_PAY',
      grabpay: 'GRABPAY',
    };
    return mapping[method] || 'OTHER';
  }

  private mapStripeStatusToEnum(status: string): string {
    const mapping: Record<string, string> = {
      succeeded: 'COMPLETED',
      processing: 'PROCESSING',
      requires_payment_method: 'PENDING',
      requires_confirmation: 'PENDING',
      requires_action: 'PENDING',
      canceled: 'CANCELLED',
      failed: 'FAILED',
    };
    return mapping[status] || 'PENDING';
  }

  private mapRefundStatus(status: string): string {
    return status === 'succeeded' ? 'COMPLETED' : 'PENDING';
  }
}
