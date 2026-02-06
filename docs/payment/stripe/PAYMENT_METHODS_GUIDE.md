# Stripe Payment Methods Guide

## Overview

This guide provides detailed information about each payment method supported through Stripe for the Rabbit Mansion booking system.

## Table of Contents

1. [Credit & Debit Cards](#credit--debit-cards)
2. [QR Code Payments](#qr-code-payments)
3. [Digital Wallets](#digital-wallets)
4. [Payment Method Comparison](#payment-method-comparison)
5. [Customer Experience](#customer-experience)

## Credit & Debit Cards

### Supported Networks

#### Global Networks

- **Visa**: Most widely accepted, excellent for international guests
- **Mastercard**: Second most common, strong global presence
- **American Express**: Premium card, higher fees but affluent customers
- **Discover**: Primarily US market
- **Diners Club**: Business travelers and premium segment
- **JCB**: Popular with Japanese tourists
- **UnionPay**: Essential for Chinese tourists

#### Regional Considerations

- **Thailand**: Visa and Mastercard dominate (~80% market share)
- **Chinese tourists**: UnionPay essential
- **Japanese tourists**: JCB important
- **European tourists**: Visa/Mastercard standard

### Card Payment Features

#### 1. One-Time Payments

**How it works:**

```
1. Customer enters card details
2. Stripe securely processes payment
3. Funds transferred to merchant account
4. Booking confirmed immediately
```

**Best for:**

- Single bookings
- New customers
- Quick checkout

**Implementation:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000 * 100, // ฿5,000 in cents
  currency: 'thb',
  payment_method_types: ['card'],
  metadata: {
    bookingId: 'BK12345',
  },
});
```

#### 2. Saved Cards (Card on File)

**How it works:**

```
1. Customer saves card during first booking
2. Card details stored securely by Stripe
3. Future bookings: One-click payment
4. Customer can manage saved cards
```

**Benefits:**

- Faster checkout for returning guests
- Better conversion rates
- Enables recurring payments
- Reduces cart abandonment

**Implementation:**

```typescript
// Save card
const setupIntent = await stripe.setupIntents.create({
  customer: customerId,
  payment_method_types: ['card'],
});

// Use saved card
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000 * 100,
  currency: 'thb',
  customer: customerId,
  payment_method: savedCardId,
});
```

#### 3. 3D Secure Authentication (SCA)

**What is 3D Secure?**

- Extra security layer for online card payments
- Required by European regulations (PSD2)
- Customer verifies identity with bank
- Reduces fraud and chargebacks

**Stripe's Implementation:**

- Automatic detection of SCA requirement
- Seamless authentication flow
- Falls back to frictionless flow when possible
- Mobile-optimized challenge screens

**Customer Experience:**

```
Standard flow:
Card details → 3DS challenge → Bank authentication → Payment complete

Frictionless flow:
Card details → Risk assessment → Payment complete (no challenge)
```

**Implementation:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000 * 100,
  currency: 'thb',
  payment_method_types: ['card'],
  // SCA automatically handled
});

// Frontend handles authentication
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
  },
});
```

#### 4. Pre-Authorization (Card Holds)

**Use Cases:**

- Hold deposit amount at booking
- Capture full amount at check-in
- Handle incidentals during stay
- Partial captures for early checkout

**How it works:**

```
1. Create payment intent with capture_method: manual
2. Card holder sees pending charge
3. Capture when ready (within 7 days)
4. Release unused authorization
```

**Example:**

```typescript
// Hold ฿2,000 deposit
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000 * 100,
  currency: 'thb',
  payment_method_types: ['card'],
  capture_method: 'manual',
});

// Later: Capture full amount or partial
await stripe.paymentIntents.capture(paymentIntent.id, {
  amount_to_capture: 1500 * 100, // Capture ฿1,500
});
```

### Card Payment Flow

```
┌─────────────────────────────────────────────────────────┐
│              CARD PAYMENT PROCESS                        │
└─────────────────────────────────────────────────────────┘

Step 1: Initialize
┌──────────┐
│ Customer │ Click "Pay with Card"
└────┬─────┘
     │
     ▼
┌──────────────┐
│   Frontend   │ Request payment intent
└────┬─────────┘
     │
     ▼
┌──────────────┐
│   Backend    │ Create payment intent via Stripe API
└────┬─────────┘
     │
     ▼
┌──────────────┐
│    Stripe    │ Return client secret
└────┬─────────┘

Step 2: Collect Payment
     │
     ▼
┌──────────────┐
│ Stripe       │ Customer enters card details
│ Elements     │ (PCI-compliant form)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ Stripe.js    │ Tokenize card data
└────┬─────────┘
     │
     ▼
┌──────────────┐
│    Stripe    │ Validate card, check for fraud
└────┬─────────┘

Step 3: Authentication (if required)
     │
     ├─── High Risk ───►┌────────────┐
     │                  │ 3D Secure  │
     │                  │ Challenge  │
     │                  └─────┬──────┘
     │                        │
     │                        ▼
     │                  ┌────────────┐
     │                  │   Bank     │
     │                  │   Auth     │
     │                  └─────┬──────┘
     │                        │
     └─── Low Risk ──────────┴────►

Step 4: Process Payment
                              │
                              ▼
                        ┌────────────┐
                        │  Process   │
                        │  Payment   │
                        └─────┬──────┘
                              │
                              ▼
                        ┌────────────┐
                        │  Webhook   │
                        │  to Backend│
                        └─────┬──────┘
                              │
                              ▼
                        ┌────────────┐
                        │  Update    │
                        │  Booking   │
                        └────────────┘
```

### Card Error Handling

**Common Errors:**

| Error Code           | Meaning           | Customer Message                                        | Action                                 |
| -------------------- | ----------------- | ------------------------------------------------------- | -------------------------------------- |
| `card_declined`      | Bank declined     | "Your card was declined. Please try another card."      | Offer alternative payment              |
| `insufficient_funds` | Not enough money  | "Insufficient funds. Please use another card."          | Suggest lower amount or different card |
| `expired_card`       | Card expired      | "Your card has expired. Please check the expiry date."  | Request updated card                   |
| `incorrect_cvc`      | Wrong CVV         | "The security code is incorrect."                       | Allow retry                            |
| `processing_error`   | Temporary issue   | "A temporary error occurred. Please try again."         | Automatic retry                        |
| `rate_limit`         | Too many attempts | "Too many attempts. Please try again in a few minutes." | Implement cooldown                     |

## QR Code Payments

### PromptPay (Thailand) 🇹🇭

**What is PromptPay?**

- Thailand's national instant payment system
- QR code-based payments
- Linked to phone number or ID card
- Supported by all major Thai banks
- Free for person-to-person transfers
- Instant settlement

**Benefits:**

- ✅ Lower fees (2.0% vs 3.65% for cards)
- ✅ Instant confirmation
- ✅ No card required
- ✅ Familiar to Thai customers
- ✅ Reduced fraud risk
- ✅ No chargebacks

**Customer Experience:**

```
1. Select "Pay with PromptPay"
2. QR code displayed on screen
3. Open mobile banking app
4. Scan QR code
5. Confirm payment amount
6. Enter PIN/biometric
7. Payment complete ✓
```

**Implementation:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000 * 100,
  currency: 'thb',
  payment_method_types: ['promptpay'],
  metadata: {
    bookingId: 'BK12345',
  },
});

// QR code data available at:
// paymentIntent.next_action.promptpay_display_qr_code
```

**QR Code Details:**

- Format: PNG image or raw QR data
- Size: Recommended 300x300px for display
- Expiry: Default 15 minutes
- Real-time status updates via webhook

**Best Practices:**

- Show clear countdown timer
- Display payment amount prominently
- Provide manual payment confirmation option
- Show instructions in Thai language
- Support both mobile and desktop displays

### Alipay (China) 🇨🇳

**What is Alipay?**

- China's largest mobile payment platform
- 1 billion+ users worldwide
- Essential for Chinese tourists
- QR code or app redirect payment

**Benefits:**

- Access to Chinese tourist market
- Instant CNY to THB conversion
- No credit card needed
- High trust in Chinese market

**Customer Experience:**

```
1. Select "Pay with Alipay"
2. Scan QR code with Alipay app
3. Confirm payment in CNY
4. Complete with face recognition
5. Instant confirmation
```

**Fees:**

- 3.4% + ฿11 per transaction
- Currency conversion: 1% markup
- No setup fees

**Implementation:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000 * 100,
  currency: 'thb',
  payment_method_types: ['alipay'],
  metadata: {
    bookingId: 'BK12345',
  },
});
```

### WeChat Pay (China) 🇨🇳

**What is WeChat Pay?**

- Integrated into WeChat super-app
- 900 million+ monthly users
- Popular with younger Chinese tourists
- Similar to Alipay but within WeChat ecosystem

**Benefits:**

- Tap into Chinese millennial market
- No need to leave WeChat app
- Social features (split bills, red envelopes)
- High engagement platform

**Customer Experience:**

```
1. Select "Pay with WeChat Pay"
2. Scan QR code with WeChat
3. Confirm payment
4. Face/fingerprint verification
5. Payment complete
```

**Implementation:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000 * 100,
  currency: 'thb',
  payment_method_types: ['wechat_pay'],
  metadata: {
    bookingId: 'BK12345',
  },
});
```

### GrabPay (Southeast Asia)

**What is GrabPay?**

- Digital wallet from Grab (ride-hailing)
- Popular in Singapore, Malaysia, Thailand
- Integrated loyalty rewards
- Good for regional travelers

**Coverage:**

- 🇸🇬 Singapore
- 🇲🇾 Malaysia
- 🇹🇭 Thailand
- 🇵🇭 Philippines
- 🇻🇳 Vietnam
- 🇮🇩 Indonesia

### PayNow (Singapore) 🇸🇬

**What is PayNow?**

- Singapore's instant payment system
- Similar to PromptPay
- Essential for Singaporean tourists
- Free transfers between banks

## Digital Wallets

### Apple Pay 🍎

**Benefits:**

- One-touch payment
- Extremely fast checkout
- High conversion rate (90%+)
- Biometric security (Face ID/Touch ID)
- No card details visible to merchant

**Customer Experience:**

```
1. Click "Apple Pay" button
2. Face ID/Touch ID authentication
3. Payment complete in 2 seconds
```

**Technical Requirements:**

- HTTPS required
- Domain verification
- Apple Developer account
- Stripe's Apple Pay integration

**Implementation:**

```typescript
// Frontend: Stripe Elements
const paymentRequest = stripe.paymentRequest({
  country: 'TH',
  currency: 'thb',
  total: {
    label: 'Hotel Booking',
    amount: 5000 * 100,
  },
  requestPayerName: true,
  requestPayerEmail: true,
});

// Backend
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000 * 100,
  currency: 'thb',
  payment_method_types: ['card'],
  // Apple Pay uses 'card' type
});
```

### Google Pay 🟢

**Benefits:**

- Android dominance in Asia
- Saved cards from Google account
- Fast checkout
- Good conversion rates

**Customer Experience:**

```
1. Click "Google Pay" button
2. Select payment method
3. Authenticate with fingerprint/PIN
4. Payment complete
```

**Market Share:**

- Global: 35% mobile payments
- Asia Pacific: 40%+ market share
- Thailand: Growing adoption

### Link by Stripe 🔗

**What is Link?**

- Stripe's own one-click checkout
- Save payment info across all Stripe merchants
- Email-based identification
- SMS verification

**Benefits:**

- No app download required
- Works across all devices
- Increasing merchant network
- Stripe handles fraud detection

**Customer Experience:**

```
1. Enter email address
2. SMS verification code
3. Select saved payment method
4. Payment complete
```

## Payment Method Comparison

### Transaction Fees

| Payment Method          | Fee Structure | Example (฿5,000) | Best For                        |
| ----------------------- | ------------- | ---------------- | ------------------------------- |
| **Domestic Cards**      | 3.65% + ฿11   | ฿193.50          | International guests without QR |
| **International Cards** | 4.10% + ฿11   | ฿216.00          | Foreign tourists                |
| **PromptPay**           | 2.00% + ฿11   | ฿111.00          | Thai customers (lowest cost) ✅ |
| **Alipay**              | 3.40% + ฿11   | ฿181.00          | Chinese tourists                |
| **WeChat Pay**          | 3.40% + ฿11   | ฿181.00          | Chinese tourists                |
| **GrabPay**             | 3.00% + ฿11   | ฿161.00          | Southeast Asian travelers       |
| **Apple Pay**           | 3.65% + ฿11   | ฿193.50          | Premium customers               |
| **Google Pay**          | 3.65% + ฿11   | ฿193.50          | Android users                   |

### Processing Time

| Payment Method   | Authorization | Settlement | Refund Time |
| ---------------- | ------------- | ---------- | ----------- |
| Cards            | Instant       | 2-3 days   | 5-10 days   |
| PromptPay        | Instant       | Instant    | 5-7 days    |
| Alipay           | Instant       | 1 day      | 3-10 days   |
| WeChat Pay       | Instant       | 1 day      | 3-10 days   |
| Apple/Google Pay | Instant       | 2-3 days   | 5-10 days   |

### Customer Preference by Market

**Thai Customers (Domestic):**

1. 🥇 PromptPay (45%)
2. 🥈 Credit/Debit Cards (40%)
3. 🥉 Bank Transfer (10%)
4. Other (5%)

**Chinese Tourists:**

1. 🥇 Alipay (50%)
2. 🥈 WeChat Pay (35%)
3. 🥉 UnionPay Cards (15%)

**Western Tourists:**

1. 🥇 Credit Cards (70%)
2. 🥈 Apple/Google Pay (20%)
3. 🥉 Debit Cards (10%)

**Asian Regional:**

1. 🥇 Credit Cards (45%)
2. 🥈 Regional wallets (35%)
3. 🥉 PromptPay/local QR (20%)

### Feature Comparison

| Feature              | Cards  | PromptPay | Alipay | WeChat | Wallets |
| -------------------- | ------ | --------- | ------ | ------ | ------- |
| **Saved Payment**    | ✅     | ❌        | ✅     | ✅     | ✅      |
| **Pre-Auth**         | ✅     | ❌        | ❌     | ❌     | ✅      |
| **Recurring**        | ✅     | ❌        | ✅     | ✅     | ✅      |
| **Partial Refunds**  | ✅     | ✅        | ✅     | ✅     | ✅      |
| **Chargeback Risk**  | Medium | None      | Low    | Low    | Medium  |
| **Setup Complexity** | Medium | Low       | Medium | Medium | High    |

## Customer Experience

### Payment Selection UI

**Recommended Layout:**

```
┌─────────────────────────────────────┐
│     Select Payment Method            │
├─────────────────────────────────────┤
│                                      │
│  💳 Credit or Debit Card             │
│     Visa, Mastercard, Amex          │
│     [Recommended for international]  │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  📱 PromptPay QR Code               │
│     Scan with mobile banking app     │
│     💰 Lowest fees! (2%)            │
│     [Recommended for Thai guests]    │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  🇨🇳 Alipay / WeChat Pay            │
│     For Chinese tourists             │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  🍎 Apple Pay / 🟢 Google Pay      │
│     One-touch payment               │
│                                      │
└─────────────────────────────────────┘
```

### Mobile Optimization

**Design Principles:**

- Large, touch-friendly buttons
- Clear payment amount display
- QR codes sized appropriately
- Easy access to payment instructions
- Support screen rotation
- Minimal scrolling required

### Accessibility

- Screen reader support
- High contrast mode
- Keyboard navigation
- Large text options
- Multiple language support

### Error Messages

**Clear and Helpful:**

```
❌ Bad: "Payment failed. Error code: 402"

✅ Good: "Your card was declined. Please try:
         • Check your card details
         • Use a different card
         • Contact your bank
         • Try PromptPay instead"
```

## Localization

### Language Support

**Minimum Required:**

- 🇬🇧 English (default)
- 🇹🇭 Thai (essential for domestic)
- 🇨🇳 Chinese Simplified (tourist market)

**Additional:**

- 🇯🇵 Japanese
- 🇰🇷 Korean
- 🇷🇺 Russian
- 🇫🇷 French
- 🇩🇪 German

### Currency Display

**Format Examples:**

```
Thai:     ฿5,000.00
Chinese:  ¥5,000.00
US:       $150.00
Euro:     €130.00
```

**Best Practices:**

- Show price in customer's currency
- Display exchange rate
- Show any conversion fees
- Final amount in THB

## Recommendations

### For Domestic Thai Customers

1. **Default to PromptPay** - Lowest fees, instant, familiar
2. **Offer cards as backup** - Not all customers use mobile banking
3. **Show Thai language UI** - Increase comfort and trust

### For Chinese Tourists

1. **Prioritize Alipay & WeChat** - Essential payment methods
2. **Show prices in CNY** - Reduce confusion
3. **Provide Chinese instructions** - Improve success rate
4. **Accept UnionPay cards** - Backup payment option

### For Western Tourists

1. **Lead with card payments** - Most familiar method
2. **Offer Apple/Google Pay** - Fast checkout, high conversion
3. **Enable 3D Secure** - Required for European cards
4. **Show clear pricing** - No hidden fees

### For Regional Asian Travelers

1. **Support regional wallets** - GrabPay, PayNow
2. **Offer multiple options** - Different preferences by country
3. **Provide English UI** - Common language

## Next Steps

1. Review payment method priorities based on customer demographics
2. Design payment selection interface
3. Plan QR code display implementation
4. Prepare multi-language content
5. Set up payment method routing logic

## Additional Resources

- [Stripe Payment Methods](https://stripe.com/docs/payments/payment-methods/overview)
- [PromptPay Documentation](https://stripe.com/docs/payments/promptpay)
- [Alipay Integration Guide](https://stripe.com/docs/payments/alipay)
- [Digital Wallets Guide](https://stripe.com/docs/payments/wallets)
