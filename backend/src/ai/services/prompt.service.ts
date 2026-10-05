import { Injectable } from '@nestjs/common';
import { SYSTEM_PROMPT } from '../prompts/system.prompt';
import { TOOL_PROMPT } from '../prompts/tool.prompt';
import { SUMMARY_PROMPT } from '../prompts/summary.prompt';
import { GUARDRAIL_PROMPT } from '../prompts/guardrail.prompt';
import { AGENT_PERSONA } from 'src/common/constants';

@Injectable()
export class PromptService {
  getSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  getToolPrompt(): string {
    return TOOL_PROMPT;
  }

  getSummaryPrompt(): string {
    return SUMMARY_PROMPT;
  }

  getGuardrailPrompt(): string {
    return GUARDRAIL_PROMPT;
  }

  getGreetingPrompt(): string {
    return `Hello! I'm ${AGENT_PERSONA.name} from ${AGENT_PERSONA.brand}. How can I help you today?`;
  }

  buildConversationContext(
    systemPrompt: string,
    history: Array<{ role: string; content: string }>,
    currentUserMessage: string,
  ): Array<{ role: string; content: string }> {
    return [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: currentUserMessage },
    ];
  }
}
