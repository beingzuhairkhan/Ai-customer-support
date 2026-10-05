export const BRAND_KNOWLEDGE = {
  name: 'Aura Skincare',
  description:
    'Premium organic Indian skincare brand offering simple and effective skincare products with thoughtfully selected ingredients.',
  tagline: 'Simple, effective, thoughtful skincare.',
};

export const SHIPPING_POLICY = {
  freeShippingThreshold: 499,
  freeShippingMessage: 'Orders above ₹499 get free delivery.',
  belowThresholdFee: 50,
  belowThresholdMessage: 'Orders below ₹499 have a ₹50 shipping fee.',
  standardDelivery: '3–5 business days.',
};

export const RETURN_POLICY = {
  windowDays: 7,
  conditions: ['unopened', 'unused', 'original packaging'],
  message:
    'Returns are accepted within 7 days of delivery. The product must be unopened, unused, and in its original packaging.',
};

export const DAMAGED_POLICY = {
  reportWindowHours: 48,
  requiresPhotos: true,
  eligibleFor: 'replacement',
  message:
    'Damaged or defective products must be reported within 48 hours of delivery with photos. Eligible for replacement.',
};

export const CANCELLATION_POLICY = {
  allowedWhen: ['PROCESSING'],
  notAllowedWhen: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  message:
    'Cancellation is allowed only when the order status is Processing. Once shipped, the order cannot be cancelled, but you may refuse delivery at the doorstep.',
  doorstepRefusalMessage:
    'Since the order has already shipped, you can refuse delivery at the doorstep.',
};

export const COD_POLICY = {
  maxAmount: 2500,
  paymentMethods: ['Cash', 'UPI'],
  message:
    'Cash on Delivery (COD) is available for orders up to ₹2,500. Payment can be made by Cash or UPI at the doorstep.',
};

export const POLICIES = {
  SHIPPING: SHIPPING_POLICY,
  RETURN: RETURN_POLICY,
  DAMAGED: DAMAGED_POLICY,
  CANCELLATION: CANCELLATION_POLICY,
  COD: COD_POLICY,
};
