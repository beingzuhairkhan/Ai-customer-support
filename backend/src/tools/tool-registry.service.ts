import { Injectable, Logger } from '@nestjs/common';
import { AgentTool, ToolResult } from 'src/common/interfaces';
import { OrderToolService } from './order-tool.service';
import {
  PolicyToolService,
  CancellationToolService,
  ShippingPolicyToolService,
  ReturnPolicyToolService,
  CodPolicyToolService,
} from './policy-tool.service';

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private tools: Map<string, AgentTool> = new Map();

  constructor(
    private orderTool: OrderToolService,
    private policyTool: PolicyToolService,
    private cancellationTool: CancellationToolService,
    private shippingPolicyTool: ShippingPolicyToolService,
    private returnPolicyTool: ReturnPolicyToolService,
    private codPolicyTool: CodPolicyToolService,
  ) {
    this.register(orderTool);
    this.register(policyTool);
    this.register(cancellationTool);
    this.register(shippingPolicyTool);
    this.register(returnPolicyTool);
    this.register(codPolicyTool);
  }

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getAllToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        success: false,
        code: 'TOOL_NOT_FOUND',
        message: `Tool "${name}" is not registered.`,
      };
    }
    try {
      this.logger.log(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);
      const result = await tool.execute(args);
      this.logger.log(`Tool ${name} result: success=${result.success}`);
      return result;
    } catch (err) {
      this.logger.error(`Tool ${name} execution failed: ${err.message}`);
      return {
        success: false,
        code: 'TOOL_EXECUTION_ERROR',
        message: `Tool execution failed: ${err.message}`,
      };
    }
  }

  getToolDefinitions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}
