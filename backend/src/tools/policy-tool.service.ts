import { Injectable } from '@nestjs/common';
import { AgentTool, ToolResult } from 'src/common/interfaces';
import { PolicyService } from 'src/knowledge/policy.service';
import { OrderStatus } from 'src/common/enums';

@Injectable()
export class PolicyToolService implements AgentTool {
  name = 'check_return_eligibility';
  description = 'Check whether an order is eligible for return based on Aura Skincare return policy.';
  parameters = {
    type: 'object',
    properties: {
      days_since_delivery: { type: 'number', description: 'Days since the order was delivered' },
      product_opened: { type: 'boolean', description: 'Whether the product has been opened' },
      product_used: { type: 'boolean', description: 'Whether the product has been used' },
      original_packaging: { type: 'boolean', description: 'Whether the product is in original packaging' },
    },
    required: ['days_since_delivery', 'product_opened', 'product_used', 'original_packaging'],
  };

  constructor(private policyService: PolicyService) {}

  async execute(args: unknown): Promise<ToolResult> {
    const params = args as {
      days_since_delivery: number;
      product_opened: boolean;
      product_used: boolean;
      original_packaging: boolean;
    };
    const decision = this.policyService.checkReturnEligibility({
      daysSinceDelivery: params.days_since_delivery,
      productOpened: params.product_opened,
      productUsed: params.product_used,
      originalPackaging: params.original_packaging,
    });
    return {
      success: decision.allowed,
      code: decision.allowed ? undefined : 'POLICY_DENIED',
      message: decision.reason,
      data: decision,
    };
  }
}

@Injectable()
export class CancellationToolService implements AgentTool {
  name = 'check_cancellation_eligibility';
  description = 'Check whether an order is eligible for cancellation based on its current status.';
  parameters = {
    type: 'object',
    properties: {
      order_status: {
        type: 'string',
        enum: Object.values(OrderStatus),
        description: 'The current status of the order',
      },
    },
    required: ['order_status'],
  };

  constructor(private policyService: PolicyService) {}

  async execute(args: unknown): Promise<ToolResult> {
    const { order_status } = args as { order_status: OrderStatus };
    const decision = this.policyService.checkCancellationEligibility(order_status);
    return {
      success: decision.allowed,
      code: decision.allowed ? undefined : 'POLICY_DENIED',
      message: decision.reason,
      data: decision,
    };
  }
}

@Injectable()
export class ShippingPolicyToolService implements AgentTool {
  name = 'get_shipping_policy';
  description = 'Get the Aura Skincare shipping policy.';
  parameters = { type: 'object', properties: {} };

  constructor(private policyService: PolicyService) {}

  async execute(): Promise<ToolResult> {
    return { success: true, data: { policy: this.policyService.getShippingPolicy() } };
  }
}

@Injectable()
export class ReturnPolicyToolService implements AgentTool {
  name = 'get_return_policy';
  description = 'Get the Aura Skincare return policy.';
  parameters = { type: 'object', properties: {} };

  constructor(private policyService: PolicyService) {}

  async execute(): Promise<ToolResult> {
    return { success: true, data: { policy: this.policyService.getReturnPolicy() } };
  }
}

@Injectable()
export class CodPolicyToolService implements AgentTool {
  name = 'get_cod_policy';
  description = 'Get the Aura Skincare Cash on Delivery (COD) policy.';
  parameters = { type: 'object', properties: {} };

  constructor(private policyService: PolicyService) {}

  async execute(): Promise<ToolResult> {
    return { success: true, data: { policy: this.policyService.getCodPolicy() } };
  }
}
