# SCB Payment Integration Guide

## Overview

This guide covers the integration of SCB (Siam Commercial Bank) Developer API with the Rabbit Mansion Hotel booking system using NestJS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Module Structure](#module-structure)
5. [API Endpoints](#api-endpoints)
6. [Payment Flow](#payment-flow)
7. [Webhook Setup](#webhook-setup)
8. [Testing](#testing)
9. [Error Handling](#error-handling)

## Prerequisites

- SCB Developer Portal account
- API Key and Secret from SCB
- Biller ID for PromptPay
- Node.js 18+ and NestJS 10+

## Installation

### 1. Install Required Dependencies

```bash
npm install axios @nestjs/axios
npm install --save-dev @types/node
```

### 2. Generate NestJS Module

```bash
nest g module payment/scb
nest g service payment/scb
nest g controller payment/scb
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# SCB API Configuration
SCB_API_KEY=your_api_key_here
SCB_API_SECRET=your_api_secret_here
SCB_BILLER_ID=your_biller_id
SCB_BASE_URL=https://api-sandbox.partners.scb/partners/sandbox
SCB_WEBHOOK_SECRET=your_webhook_secret

# Production URL (when ready)
# SCB_BASE_URL=https://api.partners.scb/partners/v1
```

### SCB Configuration File

Create `src/payment/scb/config/scb.config.ts`:

```typescript
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
```

## Module Structure

```
src/payment/scb/
├── config/
│   └── scb.config.ts
├── dto/
│   ├── create-qr-payment.dto.ts
│   ├── scb-webhook.dto.ts
│   └── index.ts
├── scb.controller.ts
├── scb.service.ts
└── scb.module.ts
```

## API Endpoints

### 1. Create QR Code Payment

**POST** `/payment/scb/qr`

Creates a PromptPay QR code for payment.

**Request:**

```json
{
  "bookingNumber": "BK20260103001",
  "amount": 5000,
  "description": "Payment for room booking"
}
```

**Response:**

```json
{
  "paymentId": "uuid",
  "qrImage": "base64_encoded_qr_image",
  "qrRawData": "raw_qr_data_string",
  "amount": 5000,
  "bookingNumber": "BK20260103001",
  "expiresIn": 300
}
```

### 2. Create Deep Link Payment

**POST** `/payment/scb/deeplink`

Creates a deep link for payment via SCB Easy App.

**Request:**

```json
{
  "bookingNumber": "BK20260103001",
  "amount": 5000,
  "description": "Payment for room booking"
}
```

**Response:**

```json
{
  "deepLink": "scbeasy://payment?transactionId=xxx",
  "transactionId": "xxx"
}
```

### 3. Check Payment Status

**GET** `/payment/scb/status/:paymentId`

Checks the current status of a payment.

**Response:**

```json
{
  "status": "PAID",
  "transactionId": "xxx",
  "amount": 5000,
  "paidAt": "2026-01-03T10:30:00Z"
}
```

### 4. Webhook Endpoint

**POST** `/payment/scb/webhook`

Receives payment status updates from SCB.

**Headers:**

- `x-scb-signature`: HMAC signature for verification

## Payment Flow

### Customer Payment Flow

```
1. Customer creates booking
   ↓
2. System generates QR code or deep link
   ↓
3. Customer scans QR or clicks deep link
   ↓
4. Customer completes payment in banking app
   ↓
5. SCB sends webhook notification
   ↓
6. System updates payment status
   ↓
7. Booking status changes to CONFIRMED
```

### Integration with Booking System

```typescript
// In your booking service or controller
import { ScbService } from '../payment/scb/scb.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private scbService: ScbService,
  ) {}

  async createBookingWithPayment(dto: CreateBookingDto) {
    // 1. Create booking
    const booking = await this.createBooking(dto);

    // 2. Generate payment QR
    const payment = await this.scbService.createQrPayment(
      booking.bookingNumber,
      booking.finalAmount,
      `Payment for booking ${booking.bookingNumber}`,
    );

    return {
      booking,
      payment,
    };
  }
}
```

## Webhook Setup

### 1. Configure Webhook URL in SCB Portal

Set your webhook URL in SCB Developer Portal:

```
https://yourdomain.com/payment/scb/webhook
```

### 2. Webhook Signature Verification

The system automatically verifies webhook signatures using HMAC-SHA256:

```typescript
private verifyWebhookSignature(payload: any, signature: string): boolean {
  const webhookSecret = this.configService.get<string>('scb.webhookSecret');
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const calculatedSignature = hmac.update(payloadString).digest('hex');

  return calculatedSignature === signature;
}
```

### 3. Webhook Payload Example

```json
{
  "transactionId": "SCB2026010312345678",
  "billPaymentRef1": "BK20260103001",
  "billPaymentRef2": "+66812345678",
  "billPaymentRef3": "RMH",
  "amount": 5000.0,
  "status": "success",
  "paidAt": "2026-01-03T10:30:00Z",
  "sendingBank": "014",
  "payerAccount": "xxx-x-xxxxx-x"
}
```

## Testing

### Using SCB Sandbox

1. **Generate Test QR Code:**

```bash
curl -X POST http://localhost:3000/payment/scb/qr \
  -H "Content-Type: application/json" \
  -d '{
    "bookingNumber": "BK20260103001",
    "amount": 100,
    "description": "Test payment"
  }'
```

2. **Simulate Payment:**
   Use SCB's test tools in the Developer Portal to simulate payment completion.

3. **Check Payment Status:**

```bash
curl http://localhost:3000/payment/scb/status/{paymentId}
```

### Test Webhook Locally

Use ngrok to expose your local server:

```bash
ngrok http 3000
```

Update webhook URL in SCB Portal to your ngrok URL:

```
https://your-ngrok-url.ngrok.io/payment/scb/webhook
```

### Test Data

SCB Sandbox test accounts:

- Account Number: `xxx-x-xxxxx-x` (provided by SCB)
- Test amounts:
  - 1.00 THB - Success
  - 2.00 THB - Failed
  - 3.00 THB - Timeout

## Error Handling

### Common Errors

| Error Code | Description           | Solution                      |
| ---------- | --------------------- | ----------------------------- |
| 401        | Unauthorized          | Check API key and secret      |
| 400        | Invalid request       | Verify request payload format |
| 404        | Resource not found    | Check biller ID and reference |
| 500        | Server error          | Contact SCB support           |
| 1001       | Invalid QR format     | Check QR parameters           |
| 1002       | Duplicate transaction | Use unique request IDs        |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Failed to create payment QR code",
  "error": "Bad Request",
  "details": {
    "scbError": "Invalid amount format"
  }
}
```

### Retry Logic

For failed payment creation, implement exponential backoff:

```typescript
async createQrPaymentWithRetry(bookingNumber: string, amount: number, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.createQrPayment(bookingNumber, amount);
    } catch (error) {
      lastError = error;
      await this.delay(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }

  throw lastError;
}
```

## Security Best Practices

1. **Store credentials securely** - Use environment variables, never commit to git
2. **Verify webhook signatures** - Always validate incoming webhooks
3. **Use HTTPS** - Never send API credentials over HTTP
4. **Implement rate limiting** - Protect webhook endpoint from abuse
5. **Log all transactions** - Keep audit trail for debugging
6. **Validate amounts** - Check payment amounts match booking amounts

## Production Checklist

- [ ] Update `SCB_BASE_URL` to production endpoint
- [ ] Configure production API keys
- [ ] Set up webhook URL with SSL certificate
- [ ] Test payment flow end-to-end
- [ ] Set up monitoring and alerts
- [ ] Document incident response procedures
- [ ] Configure automatic payment reconciliation
- [ ] Set up backup webhook endpoint

## Support

- SCB Developer Portal: https://developer.scb
- API Documentation: https://developer.scb/docs
- Support Email: api-support@scb.co.th
- Emergency Hotline: 02-777-7777

## Additional Resources

- [SCB API Reference](https://developer.scb/reference)
- [PromptPay Specification](https://www.bot.or.th/Thai/PaymentSystems/StandardPS/Documents/PromptPay.pdf)
- [QR Code Standards](https://www.emvco.com/emv-technologies/qrcodes/)
