# SCB Payment Quick Reference

## Quick Start Commands

```bash
# Install dependencies
npm install axios @nestjs/axios

# Generate module structure
nest g module payment/scb
nest g service payment/scb
nest g controller payment/scb

# Run database migration (if Payment model changed)
npx prisma migrate dev --name add_payment_details
```

## Environment Setup

```env
SCB_API_KEY=your_api_key
SCB_API_SECRET=your_api_secret
SCB_BILLER_ID=your_biller_id
SCB_BASE_URL=https://api-sandbox.partners.scb/partners/sandbox
SCB_WEBHOOK_SECRET=your_webhook_secret
```

## API Endpoints Quick Reference

| Method | Endpoint                  | Description          | Auth Required           |
| ------ | ------------------------- | -------------------- | ----------------------- |
| POST   | `/payment/scb/qr`         | Create QR payment    | No                      |
| POST   | `/payment/scb/deeplink`   | Create deep link     | No                      |
| GET    | `/payment/scb/status/:id` | Check payment status | No                      |
| POST   | `/payment/scb/webhook`    | SCB webhook handler  | No (signature verified) |
| POST   | `/payment/scb/refund/:id` | Request refund       | Yes (Admin)             |

## Common Request Examples

### Create QR Payment

```bash
curl -X POST http://localhost:3000/payment/scb/qr \
  -H "Content-Type: application/json" \
  -d '{
    "bookingNumber": "BK20260103001",
    "amount": 5000,
    "description": "Room payment"
  }'
```

### Check Payment Status

```bash
curl http://localhost:3000/payment/scb/status/cm4abc123
```

### Test Webhook

```bash
curl -X POST http://localhost:3000/payment/scb/webhook \
  -H "Content-Type: application/json" \
  -H "x-scb-signature: your-hmac-signature" \
  -d '{
    "transactionId": "SCB2026010312345678",
    "billPaymentRef1": "BK20260103001",
    "amount": 5000.00,
    "status": "success",
    "paidAt": "2026-01-03T10:30:00Z"
  }'
```

## Payment Flow Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Customer │────▶│  System  │────▶│   SCB    │────▶│  Mobile  │
│          │     │          │     │   API    │     │   App    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                 │                 │
     │  1. Create     │                 │                 │
     │     Booking    │                 │                 │
     │───────────────▶│                 │                 │
     │                │  2. Generate    │                 │
     │                │     QR Code     │                 │
     │                │────────────────▶│                 │
     │                │                 │                 │
     │                │◀────────────────│                 │
     │  3. Display QR │                 │                 │
     │◀───────────────│                 │                 │
     │                │                 │  4. Scan & Pay  │
     │────────────────────────────────────────────────────▶│
     │                │                 │                 │
     │                │                 │  5. Confirm     │
     │                │◀────────────────────────────────────│
     │                │  6. Webhook     │                 │
     │                │     Notification│                 │
     │                │◀────────────────│                 │
     │  7. Payment    │                 │                 │
     │     Confirmed  │                 │                 │
     │◀───────────────│                 │                 │
```

## Error Codes Reference

| Code | Message           | Solution                   |
| ---- | ----------------- | -------------------------- |
| 401  | Unauthorized      | Check API credentials      |
| 400  | Bad Request       | Validate payload format    |
| 404  | Not Found         | Verify booking/payment ID  |
| 1001 | Invalid QR        | Check biller ID and amount |
| 1002 | Duplicate Request | Use unique request ID      |

## Payment Status Flow

```
PENDING ──────▶ PAID ──────▶ REFUNDED
   │              │
   │              │
   ▼              │
FAILED ◀──────────┘
```

## Testing Checklist

- [ ] QR code generation works
- [ ] QR code displays correctly
- [ ] Payment completes successfully
- [ ] Webhook received and processed
- [ ] Payment status updated
- [ ] Booking status changes to CONFIRMED
- [ ] Refund process works

## Troubleshooting

### QR Code Not Generating

1. Check API credentials in `.env`
2. Verify network connectivity to SCB API
3. Check logs: `tail -f logs/application.log`

### Webhook Not Received

1. Verify webhook URL is publicly accessible
2. Check webhook URL in SCB Portal
3. Test with ngrok: `ngrok http 3000`

### Payment Status Not Updating

1. Check webhook signature verification
2. Verify booking number matches
3. Review webhook payload in logs

## Production Deployment

### Pre-deployment Checklist

- [ ] Update to production API URL
- [ ] Configure production API keys
- [ ] Set up HTTPS/SSL
- [ ] Configure production webhook URL
- [ ] Test end-to-end flow
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation

### Environment Variables (Production)

```env
SCB_BASE_URL=https://api.partners.scb/partners/v1
SCB_API_KEY=prod_api_key
SCB_API_SECRET=prod_api_secret
SCB_BILLER_ID=prod_biller_id
SCB_WEBHOOK_SECRET=prod_webhook_secret
```

## Support Contacts

- **SCB Developer Portal**: https://developer.scb
- **API Support Email**: api-support@scb.co.th
- **Emergency Hotline**: 02-777-7777
- **Developer Docs**: https://developer.scb/docs

## Related Documentation

- [Full Integration Guide](./SCB_INTEGRATION_GUIDE.md)
- [Implementation Examples](./IMPLEMENTATION_EXAMPLES.md)
- [Booking API Guide](../../ROOM_BOOKING_API_GUIDE.md)
