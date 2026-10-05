import { Module } from '@nestjs/common';
import { OrdersModule } from 'src/orders/orders.module';
import { KnowledgeModule } from 'src/knowledge/knowledge.module';
import { ToolRegistryService } from './tool-registry.service';
import { OrderToolService } from './order-tool.service';
import {
  PolicyToolService,
  CancellationToolService,
  ShippingPolicyToolService,
  ReturnPolicyToolService,
  CodPolicyToolService,
} from './policy-tool.service';

@Module({
  imports: [OrdersModule, KnowledgeModule],
  providers: [
    ToolRegistryService,
    OrderToolService,
    PolicyToolService,
    CancellationToolService,
    ShippingPolicyToolService,
    ReturnPolicyToolService,
    CodPolicyToolService,
  ],
  exports: [ToolRegistryService, OrderToolService],
})
export class ToolsModule {}
