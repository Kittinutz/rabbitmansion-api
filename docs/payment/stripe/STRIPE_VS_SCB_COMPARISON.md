# Stripe vs SCB Payment Comparison

## Overview

This document compares Stripe and SCB payment gateway implementations for the Rabbit Mansion booking system, helping you understand when to use each gateway and how they complement each other.

## Quick Comparison

| Feature                    | Stripe            | SCB                 |
| -------------------------- | ----------------- | ------------------- |
| **Primary Market**         | International     | Thailand            |
| **Best For**               | Foreign tourists  | Domestic customers  |
| **Setup Complexity**       | Medium            | Medium              |
| **Documentation**          | Excellent         | Good (Thai/English) |
| **Integration Difficulty** | Easy              | Medium              |
| **PCI Compliance**         | Handled by Stripe | Self-managed        |
| **Test Environment**       | Excellent         | Good                |

## Payment Methods

### Stripe Supported Methods

✅ **Credit/Debit Cards:**

- Visa, Mastercard, Amex, JCB, UnionPay, Discover, Diners
- Global acceptance
- 3D Secure built-in
- Saved cards supported

✅ **QR Code Payments:**

- PromptPay (Thailand)
- Alipay (China)
- WeChat Pay (China)
- GrabPay (Southeast Asia)

✅ **Digital Wallets:**

- Apple Pay
- Google Pay
- Link by Stripe

### SCB Supported Methods

✅ **QR Code Payments:**

- PromptPay only
- Direct integration with SCB
- Thai banks optimized

✅ **Deep Links:**

- SCB Easy App
- Direct bank app integration

❌ **Not Supported:**

- Credit cards (use Stripe)
- International wallets
- Other Asian payment methods

## Transaction Fees

### Stripe Fees (Thailand)

| Payment Method      | Fee         | Example (฿5,000) |
| ------------------- | ----------- | ---------------- |
| Domestic Cards      | 3.65% + ฿11 | ฿193.50          |
| International Cards | 4.10% + ฿11 | ฿216.00          |
| PromptPay           | 2.00% + ฿11 | ฿111.00          |
| Alipay/WeChat       | 3.40% + ฿11 | ฿181.00          |

### SCB Fees (Estimated)

| Payment Method     | Fee      | Example (฿5,000) |
| ------------------ | -------- | ---------------- |
| PromptPay          | 0.5-1.5% | ฿25-75           |
| SCB Easy Deep Link | 0.5-1.5% | ฿25-75           |

**Note:** SCB fees vary by merchant agreement. Typically lower than Stripe for domestic Thai payments.

## Cost Analysis

### Scenario 1: Thai Customer - ฿5,000 Booking

**Option A: Stripe PromptPay**

- Fee: ฿111.00
- Net: ฿4,889.00

**Option B: SCB PromptPay**

- Fee: ฿50.00 (1%)
- Net: ฿4,950.00
- **Savings: ฿61.00** ✅

**Recommendation:** Use SCB for Thai customers

### Scenario 2: Chinese Tourist - ฿5,000 Booking

**Option A: Stripe Alipay**

- Fee: ฿181.00
- Net: ฿4,819.00

**Option B: SCB**

- Not available ❌

**Recommendation:** Use Stripe for Chinese tourists

### Scenario 3: International Tourist - ฿5,000 Booking

**Option A: Stripe International Card**

- Fee: ฿216.00
- Net: ฿4,784.00

**Option B: SCB**

- Not available ❌

**Recommendation:** Use Stripe for international cards

## Architecture Integration

### Dual Gateway Strategy

```
                    ┌─────────────────┐
                    │  Payment Router │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐         ┌──────────────────┐
    │  Stripe Gateway  │         │   SCB Gateway    │
    └──────────────────┘         └──────────────────┘
              │                             │
    ┌─────────┼─────────────┐              │
    │         │             │              │
    ▼         ▼             ▼              ▼
┌──────┐ ┌────────┐ ┌──────────┐    ┌──────────┐
│Cards │ │Alipay  │ │Apple Pay │    │PromptPay │
└──────┘ └────────┘ └──────────┘    │(Lower fee)│
         │WeChat  │                  └──────────┘
         └────────┘                  │SCB Easy  │
                                     └──────────┘
```

### Payment Method Routing Logic

```typescript
interface PaymentRoute {
  method: string;
  gateway: 'stripe' | 'scb';
  reason: string;
}

function routePayment(
  paymentMethod: string,
  customerCountry: string,
): PaymentRoute {
  // Thai customers - prefer SCB for lower fees
  if (customerCountry === 'TH' && paymentMethod === 'promptpay') {
    return {
      method: 'promptpay',
      gateway: 'scb',
      reason: 'Lower fees for Thai domestic',
    };
  }

  // International cards - only Stripe supports
  if (paymentMethod === 'card' && customerCountry !== 'TH') {
    return {
      method: 'card',
      gateway: 'stripe',
      reason: 'International card support',
    };
  }

  // Chinese tourists - only Stripe supports
  if (['alipay', 'wechat_pay'].includes(paymentMethod)) {
    return {
      method: paymentMethod,
      gateway: 'stripe',
      reason: 'Chinese payment methods',
    };
  }

  // Digital wallets - only Stripe
  if (['apple_pay', 'google_pay'].includes(paymentMethod)) {
    return {
      method: paymentMethod,
      gateway: 'stripe',
      reason: 'Digital wallet support',
    };
  }

  // Default to Stripe for cards
  if (paymentMethod === 'card') {
    return {
      method: 'card',
      gateway: 'stripe',
      reason: 'Full card network support',
    };
  }

  // Fallback to SCB
  return {
    method: paymentMethod,
    gateway: 'scb',
    reason: 'Default domestic gateway',
  };
}
```

## Feature Comparison

### Card Payments

| Feature           | Stripe  | SCB |
| ----------------- | ------- | --- |
| Visa/Mastercard   | ✅      | ❌  |
| Amex              | ✅      | ❌  |
| JCB/UnionPay      | ✅      | ❌  |
| 3D Secure         | ✅ Auto | ❌  |
| Saved Cards       | ✅      | ❌  |
| Pre-Authorization | ✅      | ❌  |
| Recurring Billing | ✅      | ❌  |

**Winner: Stripe** - Essential for card payments

### QR Code Payments (PromptPay)

| Feature                | Stripe     | SCB           |
| ---------------------- | ---------- | ------------- |
| PromptPay Support      | ✅         | ✅            |
| Transaction Fee        | 2.0% + ฿11 | 0.5-1.5%      |
| QR Generation          | Via API    | Via API       |
| Mobile App Integration | ❌         | ✅ (SCB Easy) |
| Bank Optimization      | Generic    | SCB optimized |

**Winner: SCB** - Lower fees, better SCB bank integration

### Developer Experience

| Aspect              | Stripe             | SCB                |
| ------------------- | ------------------ | ------------------ |
| Documentation       | ⭐⭐⭐⭐⭐         | ⭐⭐⭐⭐           |
| API Design          | RESTful, excellent | RESTful, good      |
| SDKs                | Many languages     | Node.js, PHP, etc. |
| Test Environment    | Excellent          | Good               |
| Webhook Reliability | Excellent          | Good               |
| Error Messages      | Very clear         | Clear              |
| Dashboard           | ⭐⭐⭐⭐⭐         | ⭐⭐⭐             |

**Winner: Stripe** - Better DX overall

### Security & Compliance

| Feature           | Stripe       | SCB          |
| ----------------- | ------------ | ------------ |
| PCI Compliance    | Handled      | Self-managed |
| 3D Secure         | Built-in     | N/A          |
| Fraud Detection   | Stripe Radar | Basic        |
| Data Encryption   | ✅           | ✅           |
| Webhook Signature | HMAC-SHA256  | HMAC-SHA256  |
| Two-Factor Auth   | ✅           | ✅           |

**Winner: Stripe** - Easier compliance

### Settlement & Reporting

| Feature         | Stripe        | SCB           |
| --------------- | ------------- | ------------- |
| Settlement Time | 2-3 days      | 1-2 days      |
| Dashboard       | Comprehensive | Good          |
| Export Reports  | ✅ CSV, Excel | ✅ CSV, Excel |
| API Access      | Full API      | Good API      |
| Reconciliation  | Automatic     | Manual/Auto   |
| Multi-Currency  | ✅            | Limited       |

**Winner: Stripe** - Better international support

## Use Case Recommendations

### Use Stripe When:

1. ✅ **Customer is international**
   - Foreign credit cards
   - Digital wallets (Apple Pay, Google Pay)
   - Multi-currency support needed

2. ✅ **Chinese tourists**
   - Alipay required
   - WeChat Pay required

3. ✅ **Need advanced features**
   - Saved cards
   - Recurring billing
   - Pre-authorization
   - Subscription payments

4. ✅ **PCI compliance concerns**
   - Don't want to manage compliance
   - Need Stripe's security layer

5. ✅ **Multi-channel booking**
   - Website
   - Mobile app
   - Third-party platforms

### Use SCB When:

1. ✅ **Thai domestic customers**
   - Lower transaction fees
   - Familiar to Thai users
   - Better local bank integration

2. ✅ **Cost optimization**
   - High volume of Thai bookings
   - Every % matters
   - Direct bank relationship

3. ✅ **SCB Easy app users**
   - Deep link integration
   - One-tap payment
   - SCB customer base

4. ✅ **Local support needed**
   - Thai language support
   - Local business hours
   - In-person account management

## Implementation Strategy

### Phase 1: Stripe Only (Weeks 1-6)

**Why start with Stripe:**

- Faster implementation
- Better documentation
- Covers more payment methods
- Good for MVP

**Coverage:**

- ✅ International cards
- ✅ Thai cards (higher fees)
- ✅ PromptPay (higher fees)
- ✅ Alipay/WeChat
- ✅ Digital wallets

### Phase 2: Add SCB (Weeks 7-9)

**Why add SCB:**

- Reduce costs on Thai payments
- Better local integration
- Competitive advantage

**Changes:**

- Add SCB module
- Implement routing logic
- Update payment UI
- Test dual gateway

### Phase 3: Optimization (Weeks 10-12)

**Optimize payment routing:**

- Analyze payment patterns
- Fine-tune routing rules
- A/B test payment methods
- Monitor cost savings

## Payment UI Design

### Recommended Layout

```
┌─────────────────────────────────────────────┐
│         Select Payment Method                │
├─────────────────────────────────────────────┤
│                                              │
│  For Thai Customers (ลูกค้าไทย):            │
│                                              │
│  [📱 PromptPay QR - SCB]                    │
│   💰 Lowest fees! | สแกนจ่ายด้วยแอปธนาคาร   │
│   ฿4,950 (fee: ฿50)                         │
│                                              │
│  [💳 Credit/Debit Card - Stripe]            │
│   All cards accepted | ฿4,789 (fee: ฿211)   │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  For International Guests:                   │
│                                              │
│  [💳 Credit/Debit Card - Stripe]            │
│   Visa, Mastercard, Amex, etc.              │
│                                              │
│  [🇨🇳 Alipay / WeChat Pay - Stripe]        │
│   For Chinese tourists                       │
│                                              │
│  [🍎 Apple Pay / 🟢 Google Pay - Stripe]   │
│   Fast checkout                              │
│                                              │
└─────────────────────────────────────────────┘
```

### Smart Payment Routing

```typescript
// Detect customer location
const customerCountry = detectCountry(req);

// Show relevant payment methods
if (customerCountry === 'TH') {
  // Prioritize SCB for Thai customers
  showPaymentMethods([
    { method: 'promptpay', gateway: 'scb', recommended: true },
    { method: 'card', gateway: 'stripe' },
  ]);
} else if (customerCountry === 'CN') {
  // Show Chinese payment methods
  showPaymentMethods([
    { method: 'alipay', gateway: 'stripe', recommended: true },
    { method: 'wechat_pay', gateway: 'stripe' },
    { method: 'card', gateway: 'stripe' },
  ]);
} else {
  // International customers
  showPaymentMethods([
    { method: 'card', gateway: 'stripe', recommended: true },
    { method: 'apple_pay', gateway: 'stripe' },
    { method: 'google_pay', gateway: 'stripe' },
  ]);
}
```

## Cost Savings Calculator

### Annual Booking Projections

| Customer Type       | Bookings/Year | Avg. Amount | Total Volume   |
| ------------------- | ------------- | ----------- | -------------- |
| Thai Domestic       | 1,200         | ฿4,000      | ฿4,800,000     |
| Chinese             | 300           | ฿6,000      | ฿1,800,000     |
| Other International | 500           | ฿5,000      | ฿2,500,000     |
| **Total**           | **2,000**     | -           | **฿9,100,000** |

### Fee Comparison

**Scenario A: Stripe Only**

- Thai (PromptPay): ฿4.8M × 2.0% = ฿96,000
- Chinese (Alipay): ฿1.8M × 3.4% = ฿61,200
- International (Cards): ฿2.5M × 4.1% = ฿102,500
- **Total Fees: ฿259,700**

**Scenario B: Stripe + SCB**

- Thai (SCB PromptPay): ฿4.8M × 1.0% = ฿48,000
- Chinese (Stripe Alipay): ฿1.8M × 3.4% = ฿61,200
- International (Stripe Cards): ฿2.5M × 4.1% = ฿102,500
- **Total Fees: ฿211,700**

**Annual Savings: ฿48,000** (18.5% reduction)

## Monitoring & Analytics

### Key Metrics to Track

**By Gateway:**

- Transaction volume
- Success rate
- Average transaction time
- Fee costs
- Refund rate

**By Payment Method:**

- Usage percentage
- Conversion rate
- Failure rate
- Customer preference

### Dashboard Example

```
┌─────────────────────────────────────────┐
│     Payment Gateway Performance          │
├─────────────────────────────────────────┤
│                                          │
│  Stripe:          60% volume  ฿159,700  │
│    Cards:         40%         ฿102,500  │
│    Alipay:        10%         ฿61,200   │
│    Other:         10%         ฿36,000   │
│                                          │
│  SCB:             40% volume  ฿48,000   │
│    PromptPay:     40%         ฿48,000   │
│                                          │
│  Total Fees:                  ฿211,700  │
│  vs Stripe Only:              ฿259,700  │
│  Savings:                     ฿48,000   │
│                                          │
└─────────────────────────────────────────┘
```

## Troubleshooting

### Common Issues

**Stripe Issues:**

- 3DS authentication failures → Check card issuer
- Webhook delivery delays → Check endpoint health
- Rate limiting → Implement request queuing

**SCB Issues:**

- QR generation timeouts → Use fallback to Stripe
- Deep link not opening → Check app installation
- Webhook signature mismatch → Verify secret key

### Fallback Strategy

```typescript
async function processPayment(booking, method) {
  const route = routePayment(method, booking.customer.country);

  try {
    if (route.gateway === 'scb') {
      return await scbService.createPayment(booking, method);
    } else {
      return await stripeService.createPayment(booking, method);
    }
  } catch (error) {
    // Fallback to alternate gateway
    if (route.gateway === 'scb' && method === 'promptpay') {
      logger.warn('SCB failed, falling back to Stripe');
      return await stripeService.createPayment(booking, 'promptpay');
    }
    throw error;
  }
}
```

## Conclusion

### Best Practice Summary

1. **Use both gateways** for optimal coverage and cost
2. **Route intelligently** based on customer location
3. **Prioritize SCB** for Thai domestic payments (lower fees)
4. **Use Stripe** for international payments (broader support)
5. **Monitor performance** and adjust routing rules
6. **Maintain fallbacks** for high availability

### Expected Results

- ✅ Lower transaction fees (18-20% savings)
- ✅ Better customer experience (local payment methods)
- ✅ Higher conversion rates (familiar options)
- ✅ Broader market coverage (domestic + international)
- ✅ Reduced payment failures (multiple options)

### Next Steps

1. Complete Stripe implementation (Week 1-6)
2. Test thoroughly with all payment methods
3. Integrate SCB module (Week 7-9)
4. Implement intelligent routing
5. Monitor and optimize
6. Train staff on dual-gateway system

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [SCB Developer Portal](https://developer.scb/)
- [Payment Gateway Comparison Guide](./PAYMENT_METHODS_GUIDE.md)
- [Integration Plan](./INTEGRATION_PLAN.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
