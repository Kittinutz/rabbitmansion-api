import { registerAs } from '@nestjs/config';

export default registerAs('scb', () => ({
  apiKey: process.env.SCB_API_KEY,
  apiSecret: process.env.SCB_API_SECRET,
  billerId: process.env.SCB_BILLER_ID,
  baseUrl:
    process.env.SCB_BASE_URL ||
    'https://api-sandbox.partners.scb/partners/sandbox',
  webhookSecret: process.env.SCB_WEBHOOK_SECRET,
}));
