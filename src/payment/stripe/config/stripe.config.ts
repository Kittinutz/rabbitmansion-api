import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publicKey: process.env.STRIPE_PUBLIC_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
  currency: process.env.STRIPE_DEFAULT_CURRENCY || 'thb',
  webhookTolerance: parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE || '300'),
}));
