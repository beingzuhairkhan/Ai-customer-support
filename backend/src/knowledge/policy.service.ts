import { Injectable, Logger } from '@nestjs/common';
import { PolicyDecision } from 'src/common/interfaces';
import { CustomerIntent, OrderStatus } from 'src/common/enums';
import {
  SHIPPING_POLICY,
  RETURN_POLICY,
  DAMAGED_POLICY,
  CANCELLATION_POLICY,
  COD_POLICY,
  BRAND_KNOWLEDGE,
} from './knowledge.constants';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  getShippingPolicy(): string {
    return `${SHIPPING_POLICY.freeShippingMessage} ${SHIPPING_POLICY.belowThresholdMessage} Standard delivery: ${SHIPPING_POLICY.standardDelivery}`;
  }

  getReturnPolicy(): string {
    return RETURN_POLICY.message;
  }

  getCodPolicy(): string {
    return COD_POLICY.message;
  }

  getCancellationPolicy(): string {
    return CANCELLATION_POLICY.message;
  }

  getDamagedPolicy(): string {
    return DAMAGED_POLICY.message;
  }

  getBrandInfo(): string {
    return `${BRAND_KNOWLEDGE.name} is a ${BRAND_KNOWLEDGE.description}`;
  }

  checkReturnEligibility(params: {
    orderStatus?: OrderStatus;
    deliveredAt?: string;
    productOpened?: boolean;
    productUsed?: boolean;
    originalPackaging?: boolean;
    daysSinceDelivery?: number;
  }): PolicyDecision {
    const {
      daysSinceDelivery,
      productOpened,
      productUsed,
      originalPackaging,
    } = params;

    if (daysSinceDelivery !== undefined && daysSinceDelivery > RETURN_POLICY.windowDays) {
      return {
        allowed: false,
        policy: 'RETURN',
        reason: `Return window is ${RETURN_POLICY.windowDays} days. This order was delivered ${daysSinceDelivery} days ago, which exceeds the return window.`,
        suggestedResponse: `The return policy applies only within ${RETURN_POLICY.windowDays} days of delivery and for unopened, unused products in original packaging. Since this request falls outside those conditions, I can't confirm a return or refund.`,
      };
    }

    if (productOpened || productUsed || !originalPackaging) {
      const failed: string[] = [];
      if (productOpened) failed.push('opened');
      if (productUsed) failed.push('used');
      if (!originalPackaging) failed.push('not in original packaging');
      return {
        allowed: false,
        policy: 'RETURN',
        reason: `Product conditions not met: ${failed.join(', ')}.`,
        suggestedResponse: `The return policy requires the product to be unopened, unused, and in original packaging. Since the product was ${failed.join(', ')}, I can't confirm a return.`,
      };
    }

    return {
      allowed: true,
      policy: 'RETURN',
      reason: 'All return conditions met.',
    };
  }

  checkCancellationEligibility(orderStatus: OrderStatus): PolicyDecision {
    if (CANCELLATION_POLICY.allowedWhen.includes(orderStatus)) {
      return {
        allowed: true,
        policy: 'CANCELLATION',
        reason: `Order status is ${orderStatus}, which is eligible for cancellation.`,
      };
    }

    if (orderStatus === OrderStatus.SHIPPED || orderStatus === OrderStatus.OUT_FOR_DELIVERY) {
      return {
        allowed: false,
        policy: 'CANCELLATION',
        reason: `Order status is ${orderStatus}. Cancellation is not allowed once shipped.`,
        suggestedResponse: `Your order has already been shipped, so it can't be cancelled. However, you can refuse the delivery at the doorstep.`,
      };
    }

    if (orderStatus === OrderStatus.DELIVERED) {
      return {
        allowed: false,
        policy: 'CANCELLATION',
        reason: 'Order has already been delivered. Cancellation is not applicable.',
        suggestedResponse: 'This order has already been delivered, so cancellation is no longer possible. If you have concerns about the product, I can help you with a return request.',
      };
    }

    return {
      allowed: false,
      policy: 'CANCELLATION',
      reason: `Order status ${orderStatus} is not eligible for cancellation.`,
      suggestedResponse: CANCELLATION_POLICY.message,
    };
  }

  checkCodEligibility(orderValue: number): PolicyDecision {
    if (orderValue <= COD_POLICY.maxAmount) {
      return {
        allowed: true,
        policy: 'COD',
        reason: `Order value ₹${orderValue} is within COD limit of ₹${COD_POLICY.maxAmount}.`,
      };
    }
    return {
      allowed: false,
      policy: 'COD',
      reason: `Order value ₹${orderValue} exceeds COD limit of ₹${COD_POLICY.maxAmount}.`,
      suggestedResponse: `COD is available only for orders up to ₹${COD_POLICY.maxAmount}. Since your order value exceeds this, COD is not available.`,
    };
  }

  checkDamagedReport(params: {
    hoursSinceDelivery?: number;
    hasPhotos?: boolean;
  }): PolicyDecision {
    const { hoursSinceDelivery, hasPhotos } = params;

    if (hoursSinceDelivery !== undefined && hoursSinceDelivery > DAMAGED_POLICY.reportWindowHours) {
      return {
        allowed: false,
        policy: 'DAMAGED',
        reason: `Damage must be reported within ${DAMAGED_POLICY.reportWindowHours} hours. It has been ${hoursSinceDelivery} hours.`,
        suggestedResponse: `Damage or defects must be reported within ${DAMAGED_POLICY.reportWindowHours} hours of delivery. Since it has been longer, I can't process a replacement claim.`,
      };
    }

    if (hasPhotos === false) {
      return {
        allowed: false,
        policy: 'DAMAGED',
        reason: 'Photos are required for damaged/defective claims.',
        suggestedResponse: 'To process a damaged or defective claim, please share photos of the product. You can email them to our support team.',
      };
    }

    return {
      allowed: true,
      policy: 'DAMAGED',
      reason: 'Damage report conditions met. Eligible for replacement.',
      suggestedResponse: 'Your damaged product report is eligible for a replacement. I will initiate the replacement process for you.',
    };
  }
}
