# Stripe Implementation Guide

## Quick Start

This guide provides step-by-step instructions for implementing Stripe payment integration in the Rabbit Mansion API.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Module Structure](#module-structure)
4. [Configuration](#configuration)
5. [Implementation Steps](#implementation-steps)
6. [Testing](#testing)
7. [Deployment](#deployment)

## Prerequisites

### 1. Stripe Account Setup

**Create Stripe Account:**

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete account registration
3. Verify email address
4. Complete business profile

**Get API Keys:**

1. Navigate to Dashboard → Developers → API keys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Copy **Secret key** (starts with `sk_test_`)
4. Keep these secure!

**Enable Payment Methods:**

1. Go to Dashboard → Settings → Payment methods
2. Enable:
   - ✅ Cards
   - ✅ PromptPay
   - ✅ Alipay
   - ✅ WeChat Pay
   - ✅ GrabPay (if needed)

**Set Up Webhooks:**

1. Go to Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/payment/stripe/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `charge.dispute.created`
5. Copy webhook signing secret (starts with `whsec_`)

### 2. Development Environment

**Required:**

- Node.js 18+
- NestJS 10+
- TypeScript 5+
- Prisma 5+
- PostgreSQL 14+

## Installation

### Install Dependencies

```bash
npm install stripe @nestjs/config class-validator class-transformer
```

**Package Versions:**

- `stripe`: ^14.0.0
- `@nestjs/config`: ^3.0.0
- `class-validator`: ^0.14.0
- `class-transformer`: ^0.5.0

## Module Structure

Create the following directory structure:

```
src/payment/stripe/
├── config/
│   └── stripe.config.ts          # Configuration
├── dto/
│   ├── create-payment-intent.dto.ts
│   ├── create-qr-payment.dto.ts
│   ├── confirm-payment.dto.ts
│   ├── save-card.dto.ts
│   ├── stripe-webhook.dto.ts
│   └── index.ts
├── types/
│   ├── stripe-payment.types.ts
│   └── index.ts
├── stripe.service.ts             # Business logic
├── stripe.controller.ts          # API endpoints
└── stripe.module.ts              # Module definition
```

## Configuration

### 1. Environment Variables

Create `.env.stripe.example`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLIC_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe API Version (optional, uses latest if not set)
STRIPE_API_VERSION=2023-10-16

# Currency (default: thb)
STRIPE_DEFAULT_CURRENCY=thb

# Webhook tolerance (seconds, default: 300)
STRIPE_WEBHOOK_TOLERANCE=300

# Production settings (uncomment for production)
# STRIPE_SECRET_KEY=sk_live_your_live_secret_key
# STRIPE_PUBLIC_KEY=pk_live_your_live_publishable_key
# STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
```

Add to `.env`:

```env
# Copy from .env.stripe.example and fill in your values
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Stripe Config File

Create `src/payment/stripe/config/stripe.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publicKey: process.env.STRIPE_PUBLIC_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
  currency: process.env.STRIPE_DEFAULT_CURRENCY || 'thb',
  webhookTolerance: parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE || '300'),
}));
```

### 3. Database Schema

Update `prisma/schema/financial.prisma`:

```prisma
model Payment {
  id              String        @id @default(uuid())
  bookingId       String
  amount          Float
  currency        String        @default("THB")
  paymentMethod   PaymentMethod
  status          PaymentStatus @default(PENDING)

  // Stripe-specific fields
  stripePaymentIntentId  String?   @unique
  stripeCustomerId       String?
  stripePaymentMethodId  String?
  stripeChargeId         String?

  // Card details (if applicable)
  cardLast4       String?
  cardBrand       String?
  cardCountry     String?
  cardExpMonth    Int?
  cardExpYear     Int?

  // Payment details
  transactionId   String?
  paymentDetails  Json?         // Stores QR data, webhook payloads
  gatewayResponse Json?
  paidAt          DateTime?

  // 3D Secure
  requiresAction  Boolean       @default(false)
  clientSecret    String?

  description     String?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  booking         Booking       @relation(fields: [bookingId], references: [id])
  refunds         Refund[]

  @@index([bookingId])
  @@index([stripePaymentIntentId])
  @@index([stripeCustomerId])
  @@index([status])
  @@map("payments")
}

// New model for saved cards
model SavedCard {
  id                    String   @id @default(uuid())
  guestId               String
  stripeCustomerId      String
  stripePaymentMethodId String   @unique
  cardLast4             String
  cardBrand             String
  cardExpMonth          Int
  cardExpYear           Int
  cardCountry           String?
  isDefault             Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  guest                 Guest    @relation(fields: [guestId], references: [id], onDelete: Cascade)

  @@index([guestId])
  @@index([stripeCustomerId])
  @@map("saved_cards")
}

// Update Guest model to include saved cards relation
model Guest {
  // ... existing fields ...
  savedCards      SavedCard[]
}
```

**Run Migration:**

```bash
npx prisma migrate dev --name add_stripe_payment_fields
```

## Implementation Steps

### Step 1: Create DTOs

**src/payment/stripe/dto/create-payment-intent.dto.ts:**

```typescript
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Booking number',
    example: 'BK12345',
  })
  @IsString()
  bookingNumber: string;

  @ApiProperty({
    description: 'Payment amount in THB',
    example: 5000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    description: 'Payment method type',
    enum: ['card', 'promptpay', 'alipay', 'wechat_pay', 'grabpay'],
    example: 'card',
  })
  @IsEnum(['card', 'promptpay', 'alipay', 'wechat_pay', 'grabpay'])
  paymentMethodType: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'customer@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({
    description: 'Customer ID for saved cards',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'Saved payment method ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({
    description: 'Payment description',
    example: 'Hotel booking payment',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
```

**src/payment/stripe/dto/confirm-payment.dto.ts:**

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Payment Intent ID',
    example: 'pi_1234567890',
  })
  @IsString()
  paymentIntentId: string;
}
```

**src/payment/stripe/dto/save-card.dto.ts:**

```typescript
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveCardDto {
  @ApiProperty({
    description: 'Guest ID',
    example: 'guest_123',
  })
  @IsString()
  guestId: string;

  @ApiProperty({
    description: 'Payment method ID from Stripe',
    example: 'pm_1234567890',
  })
  @IsString()
  paymentMethodId: string;

  @ApiProperty({
    description: 'Set as default card',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
```

**src/payment/stripe/dto/stripe-webhook.dto.ts:**

```typescript
import { IsString, IsObject, IsOptional } from 'class-validator';

export class StripeWebhookDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsObject()
  data: {
    object: any;
  };

  @IsString()
  @IsOptional()
  livemode?: boolean;
}
```

**src/payment/stripe/dto/index.ts:**

```typescript
export * from './create-payment-intent.dto';
export * from './confirm-payment.dto';
export * from './save-card.dto';
export * from './stripe-webhook.dto';
```

### Step 2: Create Types

**src/payment/stripe/types/stripe-payment.types.ts:**

```typescript
import Stripe from 'stripe';

export interface StripePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  customerId?: string;
  qrCode?: string; // For QR-based payments
  requiresAction: boolean;
}

export interface StripeCustomerResult {
  customerId: string;
  email: string;
  metadata?: Record<string, string>;
}

export interface StripeSavedCard {
  id: string;
  cardLast4: string;
  cardBrand: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardCountry: string;
  isDefault: boolean;
}

export interface StripeRefundResult {
  refundId: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: Stripe.Event.Data;
  created: number;
}
```

### Step 3: Create Service

**src/payment/stripe/stripe.service.ts:**

```typescript
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prima/prisma.service';
import {
  CreatePaymentIntentDto,
  ConfirmPaymentDto,
  SaveCardDto,
  StripeWebhookDto,
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
    const apiVersion =
      this.configService.get<string>('stripe.apiVersion') || '2023-10-16';

    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as Stripe.LatestApiVersion,
      typescript: true,
    });

    this.webhookSecret =
      this.configService.get<string>('stripe.webhookSecret') || '';
    this.defaultCurrency =
      this.configService.get<string>('stripe.currency') || 'thb';

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
        payment_method_types: [
          dto.paymentMethodType as Stripe.PaymentIntentCreateParams.PaymentMethodType,
        ],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          guestId: booking.guestId,
        },
        description:
          dto.description || `Payment for booking ${booking.bookingNumber}`,
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
      const paymentIntent =
        await this.stripe.paymentIntents.create(paymentIntentParams);

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
      if (
        paymentIntent.next_action?.type === 'display_bank_transfer_instructions'
      ) {
        // @ts-ignore - Stripe types might not include all payment methods
        qrCode =
          paymentIntent.next_action?.display_bank_transfer_instructions
            ?.hosted_instructions_url;
      } else if (paymentIntent.next_action?.promptpay_display_qr_code) {
        // @ts-ignore
        qrCode = paymentIntent.next_action.promptpay_display_qr_code.data;
      }

      this.logger.log(
        `Payment intent created: ${paymentIntent.id} for booking ${booking.bookingNumber}`,
      );

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
      this.logger.error(
        `Failed to create payment intent: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create payment intent: ${error.message}`,
      );
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(
    dto: ConfirmPaymentDto,
  ): Promise<StripePaymentIntentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        dto.paymentIntentId,
      );

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
      this.logger.error(
        `Failed to confirm payment: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to confirm payment: ${error.message}`,
      );
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
      this.logger.error(
        `Failed to get/create customer: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get/create customer: ${error.message}`,
      );
    }
  }

  /**
   * Save a card for future use
   */
  async saveCard(dto: SaveCardDto): Promise<StripeSavedCard> {
    try {
      // Get payment method details from Stripe
      const paymentMethod = await this.stripe.paymentMethods.retrieve(
        dto.paymentMethodId,
      );

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

      this.logger.log(
        `Saved card ${paymentMethod.card.last4} for guest ${dto.guestId}`,
      );

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
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return savedCards.map((card) => ({
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
      this.logger.error(
        `Failed to delete saved card: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to delete saved card: ${error.message}`,
      );
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
      throw new BadRequestException(
        'Payment does not have a Stripe payment intent',
      );
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
        throw new BadRequestException(
          'Payment does not have a Stripe payment intent',
        );
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
      this.logger.error(
        `Failed to process refund: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to process refund: ${error.message}`,
      );
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
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
          await this.handlePaymentSuccess(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(
            event.data.object as Stripe.PaymentIntent,
          );
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

  private async handlePaymentSuccess(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
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

    this.logger.log(
      `Payment ${payment.id} completed for booking ${payment.booking.bookingNumber}`,
    );
  }

  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        gatewayResponse: paymentIntent as any,
      },
    });

    this.logger.warn(`Payment failed for intent ${paymentIntent.id}`);
  }

  private async handlePaymentCanceled(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
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
```

### Step 4: Create Controller

**src/payment/stripe/stripe.controller.ts:**

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto, SaveCardDto } from './dto';

@ApiTags('Stripe Payments')
@Controller('payment/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.stripeService.createPaymentIntent(dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm payment intent' })
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.stripeService.confirmPayment(dto);
  }

  @Get('status/:paymentId')
  @ApiOperation({ summary: 'Check payment status' })
  async checkPaymentStatus(@Param('paymentId') paymentId: string) {
    return this.stripeService.checkPaymentStatus(paymentId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for webhook verification');
    }
    await this.stripeService.handleWebhook(rawBody, signature);
    return { received: true };
  }

  @Post('refund/:paymentId')
  @ApiOperation({ summary: 'Process refund' })
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.stripeService.processRefund(
      paymentId,
      body.amount,
      body.reason,
    );
  }

  @Get('cards')
  @ApiOperation({ summary: 'Get saved cards' })
  async getSavedCards(@Query('guestId') guestId: string) {
    return this.stripeService.getSavedCards(guestId);
  }

  @Post('cards')
  @ApiOperation({ summary: 'Save a card' })
  async saveCard(@Body() dto: SaveCardDto) {
    return this.stripeService.saveCard(dto);
  }

  @Delete('cards/:cardId')
  @ApiOperation({ summary: 'Delete saved card' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedCard(
    @Param('cardId') cardId: string,
    @Query('guestId') guestId: string,
  ) {
    await this.stripeService.deleteSavedCard(cardId, guestId);
  }
}
```

### Step 5: Create Module

**src/payment/stripe/stripe.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import stripeConfig from './config/stripe.config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaService } from '../../prima/prisma.service';

@Module({
  imports: [ConfigModule.forFeature(stripeConfig)],
  controllers: [StripeController],
  providers: [StripeService, PrismaService],
  exports: [StripeService],
})
export class StripeModule {}
```

### Step 6: Register Module

**src/app.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// ... other imports
import { StripeModule } from './payment/stripe/stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ... other modules
    StripeModule,
  ],
  // ...
})
export class AppModule {}
```

## Testing

### Unit Tests

Create `src/payment/stripe/stripe.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { PrismaService } from '../../prima/prisma.service';

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'stripe.secretKey': 'sk_test_123',
                'stripe.publicKey': 'pk_test_123',
                'stripe.webhookSecret': 'whsec_123',
                'stripe.apiVersion': '2023-10-16',
                'stripe.currency': 'thb',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findUnique: jest.fn(),
            },
            payment: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests...
});
```

### Integration Testing with Stripe Test Mode

**Test Card Numbers:**

```typescript
// Success
const testCards = {
  visa: '4242424242424242',
  visaDebit: '4000056655665556',
  mastercard: '5555555555554444',
  amex: '378282246310005',

  // 3D Secure Required
  visa3DS: '4000002500003155',

  // Failures
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  expired: '4000000000000069',
  incorrectCVC: '4000000000000127',
};
```

**Testing QR Payments:**

Test PromptPay in sandbox mode:

- QR codes generated will be test QR codes
- Use Stripe dashboard to simulate payment completion
- Or use webhook testing tools

### Manual Testing Checklist

- [ ] Card payment with valid card
- [ ] Card payment with 3DS
- [ ] Card payment with declined card
- [ ] PromptPay QR generation
- [ ] Alipay payment
- [ ] WeChat Pay payment
- [ ] Save card functionality
- [ ] Use saved card
- [ ] Delete saved card
- [ ] Payment status check
- [ ] Webhook handling
- [ ] Refund processing
- [ ] Error handling

## Deployment

### Pre-Production Checklist

- [ ] Switch to production API keys
- [ ] Update webhook URL to production domain
- [ ] Test webhook endpoint with Stripe CLI
- [ ] Enable proper SSL/TLS
- [ ] Set up monitoring and alerts
- [ ] Configure error reporting
- [ ] Review security settings
- [ ] Test in staging environment
- [ ] Prepare rollback plan

### Environment Variables for Production

```env
# Production Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Keep API version pinned
STRIPE_API_VERSION=2023-10-16

# Production currency
STRIPE_DEFAULT_CURRENCY=thb
```

### Webhook Configuration

1. Log into Stripe Dashboard (Production)
2. Go to Developers → Webhooks
3. Add endpoint: `https://yourdomain.com/payment/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `charge.dispute.created`
5. Copy webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in production `.env`

### Testing Webhooks

Use Stripe CLI to test locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/payment/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

### Monitoring

Set up monitoring for:

- Payment success/failure rates
- Response times
- Webhook delivery status
- Error rates
- Refund requests

### Support

For issues:

- Check Stripe Dashboard logs
- Review application logs
- Check webhook delivery status
- Contact Stripe support if needed

## Next Steps

1. Complete frontend integration (React/Vue components)
2. Implement payment analytics dashboard
3. Set up automated reconciliation
4. Add payment method routing logic
5. Implement saved cards UI
6. Add Apple Pay/Google Pay buttons
7. Set up fraud monitoring

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Security Best Practices](https://stripe.com/docs/security/guide)
