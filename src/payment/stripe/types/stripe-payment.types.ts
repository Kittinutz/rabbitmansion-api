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
