// ai-orchestrator.service.ts

import { Injectable } from "@nestjs/common";

import { LLMInput } from "../interfaces";

import {
  LLMMessage,
  LLMResponse,
  ToolCall,
  STTResult,
  TTSResult,
} from "src/common/interfaces";

import { PrimaryLLMProvider } from "../providers/llm/primary-llm.provider";
import { SarvamSpeechProvider } from "../providers/sarvam/sarvam-speech.provider";

import { ProviderFallbackService } from "./provider-fallback.service";
import { GuardrailService } from "./guardrail.service";
import { PromptService } from "./prompt.service";

import { ToolRegistryService } from "src/tools/tool-registry.service";
import { KnowledgeService } from "src/knowledge/knowledge.service";
import { MetricsService } from "src/metrics/metrics.service";

import {
  SAFE_FALLBACK_RESPONSE,
  SAFE_OUT_OF_SCOPE_RESPONSE,
  SAFE_MISSING_ORDER_ID,
  SAFE_INVALID_ORDER,
  SAFE_UNKNOWN_RESPONSE,
} from "src/common/constants";
import { SUMMARY_PROMPT } from "../prompts/summary.prompt";
import { CustomerIntent, Language, ErrorCode } from "src/common/enums";

import { isHinglish, isValidOrderIdFormat } from "src/common/utils";

export interface CallSummaryResult {
  customer_intent:
    | "ORDER_TRACKING"
    | "ORDER_CANCELLATION"
    | "RETURN_REQUEST"
    | "POLICY_INQUIRY"
    | "PRODUCT_INQUIRY"
    | "GENERAL_INQUIRY"
    | "OUT_OF_SCOPE"
    | "UNKNOWN";

  order_id: string;

  resolution_status:
    "RESOLVED" | "UNRESOLVED" | "PARTIALLY_RESOLVED" | "ESCALATED";

  call_summary: string;
  actions_taken: string[];
  policies_referenced: string[];
  language: "en" | "hi" | "hinglish";
}

export interface OrchestratorResult {
  textResponse: string;
  toolCallsMade: string[];
  intent: CustomerIntent;
  orderId?: string;
  language: string;
  guardrailPassed: boolean;
}

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly primaryLLM: PrimaryLLMProvider,
    private readonly sarvamProvider: SarvamSpeechProvider,
    private readonly fallbackService: ProviderFallbackService,
    private readonly guardrail: GuardrailService,
    private readonly promptService: PromptService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly knowledgeService: KnowledgeService,
    private readonly metricsService: MetricsService,
  ) {}

  async transcribeAudio(audio: Buffer): Promise<STTResult> {
    this.metricsService.recordSttRequest();

    if (!audio || audio.length < 100) {
      this.metricsService.recordSttFailure();

      return {
        text: "",
        confidence: 0,
        language: Language.UNKNOWN,
      };
    }

    const providers: Array<{
      name: string;
      execute: () => Promise<STTResult>;
    }> = [];

    if (this.sarvamProvider.isConfigured()) {
      providers.push({
        name: "sarvam",
        execute: () => this.sarvamProvider.transcribe(audio),
      });
    }

    if (!providers.length) {
      this.metricsService.recordSttFailure();

      return {
        text: "",
        confidence: 0,
        language: Language.UNKNOWN,
      };
    }

    const fallbackResult =
      await this.fallbackService.executeWithFallback<STTResult>(
        providers,
        "STT",
        {
          text: "",
          confidence: 0,
          language: Language.UNKNOWN,
        },
      );

    if (!fallbackResult.result?.text?.trim()) {
      this.metricsService.recordSttFailure();
    }

    return fallbackResult.result;
  }

  async synthesizeSpeech(
    text: string,
    language?: string,
  ): Promise<TTSResult | null> {
    this.metricsService.recordTtsRequest();

    const normalizedText = this.cleanAiResponse(text);

    if (!normalizedText) {
      this.metricsService.recordTtsFailure();
      return null;
    }

    const providers: Array<{
      name: string;
      execute: () => Promise<TTSResult>;
    }> = [];

    if (this.sarvamProvider.isConfigured()) {
      providers.push({
        name: "sarvam",
        execute: () =>
          this.sarvamProvider.synthesize(normalizedText, {
            language,
          }),
      });
    }

    if (!providers.length) {
      this.metricsService.recordTtsFailure();
      return null;
    }

    const fallbackResult =
      await this.fallbackService.executeWithFallback<TTSResult>(
        providers,
        "TTS",
        null,
      );

    if (!fallbackResult.result) {
      this.metricsService.recordTtsFailure();
      return null;
    }

    return fallbackResult.result;
  }

  async processUserMessage(
    userText: string,
    conversationHistory: LLMMessage[],
  ): Promise<OrchestratorResult> {
    this.metricsService.recordLlmRequest();

    const normalizedUserText = userText?.trim() ?? "";

    if (!normalizedUserText) {
      return {
        textResponse: this.cleanAiResponse(SAFE_UNKNOWN_RESPONSE),
        toolCallsMade: [],
        intent: CustomerIntent.UNKNOWN,
        orderId: undefined,
        language: Language.ENGLISH,
        guardrailPassed: true,
      };
    }

    const language = this.detectLanguage(normalizedUserText);
    const intent = this.detectIntent(normalizedUserText);
    const orderId = this.extractOrderId(normalizedUserText);

    if (this.knowledgeService.isOutOfScope(normalizedUserText)) {
      return {
        textResponse: this.cleanAiResponse(SAFE_OUT_OF_SCOPE_RESPONSE),
        toolCallsMade: [],
        intent: CustomerIntent.OUT_OF_SCOPE,
        orderId,
        language,
        guardrailPassed: true,
      };
    }

    const systemPrompt = this.promptService.getSystemPrompt();

    const messages = this.buildInitialMessages(
      systemPrompt,
      conversationHistory,
      normalizedUserText,
    );

    const toolDefs = this.toolRegistry.getToolDefinitions();

    if (!this.primaryLLM.isConfigured()) {
      const deterministic = this.deterministicResponse(
        normalizedUserText,
        intent,
        orderId,
      );

      return {
        textResponse: this.cleanAiResponse(deterministic.content),
        toolCallsMade: [],
        intent,
        orderId,
        language,
        guardrailPassed: true,
      };
    }

    const firstInput: LLMInput = {
      messages,
      tools: toolDefs.length > 0 ? toolDefs : undefined,
      temperature: 0.2,
      maxTokens: 300,
    };

    let firstResponse: LLMResponse;

    try {
      firstResponse = await this.primaryLLM.generateResponse(firstInput);
    } catch {
      this.metricsService.recordLlmFailure();

      return {
        textResponse: this.cleanAiResponse(SAFE_FALLBACK_RESPONSE),
        toolCallsMade: [],
        intent,
        orderId,
        language,
        guardrailPassed: true,
      };
    }

    const hasToolCalls =
      Array.isArray(firstResponse?.toolCalls) &&
      firstResponse.toolCalls.length > 0;

    const hasContent =
      typeof firstResponse?.content === "string" &&
      firstResponse.content.trim().length > 0;

    if (!hasToolCalls) {
      if (!hasContent) {
        this.metricsService.recordLlmFailure();

        return {
          textResponse: this.cleanAiResponse(SAFE_FALLBACK_RESPONSE),
          toolCallsMade: [],
          intent,
          orderId,
          language,
          guardrailPassed: true,
        };
      }

      return this.createValidatedResponse(
        firstResponse.content,
        normalizedUserText,
        [],
        intent,
        orderId,
        language,
      );
    }

    const toolExecution = await this.executeToolCalls(firstResponse.toolCalls);

    const toolCallsMade = toolExecution.callsMade;

    const secondMessages = this.buildFinalMessages(
      systemPrompt,
      conversationHistory,
      normalizedUserText,
      toolExecution.results,
      language,
    );

    const secondInput: LLMInput = {
      messages: secondMessages,
      temperature: 0.2,
      maxTokens: 300,
    };

    let finalResponse: LLMResponse;

    try {
      finalResponse = await this.primaryLLM.generateResponse(secondInput);
    } catch {
      this.metricsService.recordLlmFailure();

      return {
        textResponse: this.cleanAiResponse(
          this.buildToolResultFallback(
            toolExecution.results,
            intent,
            orderId,
            language,
          ),
        ),
        toolCallsMade,
        intent,
        orderId,
        language,
        guardrailPassed: true,
      };
    }

    if (
      !finalResponse ||
      typeof finalResponse.content !== "string" ||
      !finalResponse.content.trim()
    ) {
      return {
        textResponse: this.cleanAiResponse(
          this.buildToolResultFallback(
            toolExecution.results,
            intent,
            orderId,
            language,
          ),
        ),
        toolCallsMade,
        intent,
        orderId,
        language,
        guardrailPassed: true,
      };
    }

    return this.createValidatedResponse(
      finalResponse.content,
      normalizedUserText,
      toolCallsMade,
      intent,
      orderId,
      language,
    );
  }

  private buildSummaryTranscript(conversationHistory: LLMMessage[]): string {
    if (!Array.isArray(conversationHistory)) {
      return "";
    }

    return conversationHistory
      .filter(
        (message) =>
          message && (message.role === "user" || message.role === "assistant"),
      )
      .map((message) => {
        const role = message.role === "user" ? "Customer" : "Aria";

        const content =
          typeof message.content === "string" ? message.content.trim() : "";

        return content ? `${role}: ${content}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  async generateSummary(
    conversationHistory: any[],
  ): Promise<CallSummaryResult> {
    const fallback: CallSummaryResult = {
      customer_intent: "UNKNOWN",
      order_id: "",
      resolution_status: "UNRESOLVED",
      call_summary: "The call could not be summarized.",
      actions_taken: [],
      policies_referenced: [],
      language: "en",
    };

    if (!this.primaryLLM.isConfigured()) {
      console.error("[CALL SUMMARY] Primary LLM is not configured");
      return fallback;
    }

    if (!Array.isArray(conversationHistory)) {
      console.error(
        "[CALL SUMMARY] conversationHistory is not an array:",
        conversationHistory,
      );
      return fallback;
    }

    const llmHistory: LLMMessage[] = conversationHistory
      .filter((message) => {
        return (
          message &&
          (message.role === "CUSTOMER" ||
            message.role === "AGENT" ||
            message.role === "user" ||
            message.role === "assistant")
        );
      })
      .map((message) => {
        let role: "user" | "assistant";

        if (message.role === "CUSTOMER" || message.role === "user") {
          role = "user";
        } else {
          role = "assistant";
        }

        return {
          role,
          content: String(message.text ?? message.content ?? "").trim(),
        };
      })
      .filter((message) => message.content.length > 0);

    if (!llmHistory.length) {
      console.error("[CALL SUMMARY] No usable transcript messages");
      return fallback;
    }

    const transcript = this.buildSummaryTranscript(llmHistory);

    if (!transcript.trim()) {
      console.error("[CALL SUMMARY] Transcript is empty");
      return fallback;
    }

    const prompt = `${SUMMARY_PROMPT}

Conversation transcript:
${transcript}`;

    try {
      const response = await this.primaryLLM.generateSummaryResponseV2({
        messages: [
          {
            role: "system",
            content:
              "You are a call summarization assistant. Follow the JSON schema exactly. Return ONLY valid JSON. Do not use Markdown, explanations, or code fences.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
        maxTokens: 1000,
      });

      const raw = response?.content?.trim();

      if (!raw) {
        console.error("[CALL SUMMARY] LLM returned empty content");
        return fallback;
      }

      const parsed = this.parseSummaryResponse(raw);

      const validated = this.validateSummary(parsed, fallback);

      return validated;
    } catch (error) {
      console.error("[CALL SUMMARY] Failed to generate summary:", error);

      if (error instanceof Error) {
        console.error("[CALL SUMMARY] Error message:", error.message);
        console.error("[CALL SUMMARY] Error stack:", error.stack);
      }

      return fallback;
    }
  }

  private parseSummaryResponse(raw: string): unknown {
    let cleaned = raw.trim();

    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Handle accidental text before/after JSON.
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleaned);
  }

  private validateSummary(
    value: unknown,
    fallback: CallSummaryResult,
  ): CallSummaryResult {
    if (!value || typeof value !== "object") {
      return fallback;
    }

    const parsed = value as Record<string, unknown>;

    const validIntents = new Set<CallSummaryResult["customer_intent"]>([
      "ORDER_TRACKING",
      "ORDER_CANCELLATION",
      "RETURN_REQUEST",
      "POLICY_INQUIRY",
      "PRODUCT_INQUIRY",
      "GENERAL_INQUIRY",
      "OUT_OF_SCOPE",
      "UNKNOWN",
    ]);

    const validStatuses = new Set<CallSummaryResult["resolution_status"]>([
      "RESOLVED",
      "UNRESOLVED",
      "PARTIALLY_RESOLVED",
      "ESCALATED",
    ]);

    const validLanguages = new Set<CallSummaryResult["language"]>([
      "en",
      "hi",
      "hinglish",
    ]);

    const customerIntent = validIntents.has(
      parsed.customer_intent as CallSummaryResult["customer_intent"],
    )
      ? (parsed.customer_intent as CallSummaryResult["customer_intent"])
      : "UNKNOWN";

    const resolutionStatus = validStatuses.has(
      parsed.resolution_status as CallSummaryResult["resolution_status"],
    )
      ? (parsed.resolution_status as CallSummaryResult["resolution_status"])
      : "UNRESOLVED";

    const language = validLanguages.has(
      parsed.language as CallSummaryResult["language"],
    )
      ? (parsed.language as CallSummaryResult["language"])
      : "en";

    return {
      customer_intent: customerIntent,

      order_id:
        typeof parsed.order_id === "string" ? parsed.order_id.trim() : "",

      resolution_status: resolutionStatus,

      call_summary:
        typeof parsed.call_summary === "string" && parsed.call_summary.trim()
          ? parsed.call_summary.trim()
          : fallback.call_summary,

      actions_taken: Array.isArray(parsed.actions_taken)
        ? parsed.actions_taken.filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0,
          )
        : [],

      policies_referenced: Array.isArray(parsed.policies_referenced)
        ? parsed.policies_referenced.filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0,
          )
        : [],

      language,
    };
  }

  private createValidatedResponse(
    content: string,
    userText: string,
    toolCallsMade: string[],
    intent: CustomerIntent,
    orderId: string | undefined,
    language: string,
  ): OrchestratorResult {
    const cleanedContent = this.cleanAiResponse(content);

    if (!cleanedContent) {
      return {
        textResponse: this.cleanAiResponse(SAFE_FALLBACK_RESPONSE),
        toolCallsMade,
        intent,
        orderId,
        language,
        guardrailPassed: true,
      };
    }

    const guardrailResult = this.guardrail.validate(cleanedContent, userText);

    const finalResponse = this.cleanAiResponse(
      guardrailResult.safeResponse || SAFE_FALLBACK_RESPONSE,
    );

    return {
      textResponse: finalResponse,
      toolCallsMade,
      intent,
      orderId,
      language,
      guardrailPassed: guardrailResult.valid,
    };
  }

  private cleanAiResponse(text: string): string {
    if (!text) {
      return "";
    }

    return text
      .replace(/\*\*(.*?)\*\*/gs, "$1")
      .replace(/__(.*?)__/gs, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private buildInitialMessages(
    systemPrompt: string,
    conversationHistory: LLMMessage[],
    userText: string,
  ): LLMMessage[] {
    const history = Array.isArray(conversationHistory)
      ? [...conversationHistory]
      : [];

    const cleanHistory = history
      .filter((message) => message.role !== "tool")
      .map((message) => ({
        role: message.role,
        content: message.content ?? "",
      }));

    const recentHistory = cleanHistory.slice(-10);

    const lastMessage = recentHistory[recentHistory.length - 1];

    const currentMessageAlreadyIncluded =
      lastMessage?.role === "user" &&
      lastMessage.content.trim() === userText.trim();

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...recentHistory,
    ];

    if (!currentMessageAlreadyIncluded) {
      messages.push({
        role: "user",
        content: userText,
      });
    }

    return messages;
  }

  private buildFinalMessages(
    systemPrompt: string,
    conversationHistory: LLMMessage[],
    userText: string,
    toolResults: Array<{
      toolCallId: string;
      result: unknown;
    }>,
    language: string,
  ): LLMMessage[] {
    const history = Array.isArray(conversationHistory)
      ? [...conversationHistory]
      : [];

    const cleanHistory = history
      .filter((message) => message.role !== "tool")
      .map((message) => ({
        role: message.role,
        content: message.content ?? "",
      }));

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...cleanHistory.slice(-8),
      {
        role: "user",
        content: userText,
      },
    ];

    const toolInformation = toolResults
      .map((item, index) => {
        let resultText = "";

        try {
          resultText = JSON.stringify(item.result);
        } catch {
          resultText = String(item.result);
        }

        return `Tool result ${index + 1}:\n${resultText}`;
      })
      .join("\n\n");

    messages.push({
      role: "user",
      content: [
        "The order system has returned the following information.",
        "Use this information to answer the customer's request.",
        "Do not invent information that is not present in the tool result.",
        "Do not mention tools or internal systems.",
        "Do not use Markdown.",
        `Respond only in ${this.getLanguageName(language)}.`,
        "",
        toolInformation,
      ].join("\n"),
    });

    return messages;
  }

  private getLanguageName(language: string): string {
    if (language === Language.HINDI) {
      return "Hindi";
    }

    if (language === Language.HINGLISH) {
      return "Hinglish";
    }

    return "English";
  }

  private async executeToolCalls(toolCalls: ToolCall[]): Promise<{
    callsMade: string[];
    results: Array<{
      toolCallId: string;
      result: unknown;
    }>;
  }> {
    const callsMade: string[] = [];

    const results: Array<{
      toolCallId: string;
      result: unknown;
    }> = [];

    for (const call of toolCalls) {
      const toolName = call.function?.name;
      const toolCallId = call.id;

      if (!toolName) {
        continue;
      }

      let args: unknown = {};

      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch {
        this.metricsService.recordToolFailure();

        results.push({
          toolCallId,
          result: {
            success: false,
            code: "INVALID_TOOL_ARGUMENTS",
            message: "Invalid tool arguments.",
          },
        });

        continue;
      }

      callsMade.push(toolName);
      this.metricsService.recordToolCall();

      try {
        const result = await this.toolRegistry.executeTool(toolName, args);

        results.push({
          toolCallId,
          result,
        });

        if (!result.success) {
          this.metricsService.recordToolFailure();

          if (result.code === ErrorCode.ORDER_NOT_FOUND) {
            this.metricsService.recordOrderNotFound();
          }
        }

        this.metricsService.recordOrderLookup();
      } catch {
        this.metricsService.recordToolFailure();

        results.push({
          toolCallId,
          result: {
            success: false,
            code: "TOOL_EXECUTION_ERROR",
            message: `Tool ${toolName} failed.`,
          },
        });
      }
    }

    return {
      callsMade,
      results,
    };
  }

  private detectIntent(text: string): CustomerIntent {
    const lower = text.toLowerCase();

    if (/cancel|cancellation|cancel kar/.test(lower)) {
      return CustomerIntent.ORDER_CANCELLATION;
    }

    if (/return|refund|replace|wapas/.test(lower)) {
      return CustomerIntent.RETURN_REQUEST;
    }

    if (
      /where.*order|track|tracking|delivery|deliver|status|kab.*aay|kaha.*hai|kahan.*hai|order.*kahan/.test(
        lower,
      )
    ) {
      return CustomerIntent.ORDER_TRACKING;
    }

    if (
      /shipping|delivery.*charge|free.*delivery|shipping.*charge/.test(lower)
    ) {
      return CustomerIntent.POLICY_INQUIRY;
    }

    if (/cod|cash.*on.*delivery|payment|pay.*option/.test(lower)) {
      return CustomerIntent.POLICY_INQUIRY;
    }

    if (
      /product|ingredient|organic|serum|sunscreen|cream|face.*wash|toner|vitamin.*c|green.*tea/.test(
        lower,
      )
    ) {
      return CustomerIntent.PRODUCT_INQUIRY;
    }

    if (this.knowledgeService.isOutOfScope(text)) {
      return CustomerIntent.OUT_OF_SCOPE;
    }

    return CustomerIntent.UNKNOWN;
  }

  private detectLanguage(text: string): string {
    if (isHinglish(text)) {
      return Language.HINGLISH;
    }

    const hindiRegex = /[\u0900-\u097F]/;

    if (hindiRegex.test(text)) {
      return Language.HINDI;
    }

    return Language.ENGLISH;
  }

  private extractOrderId(text: string): string | undefined {
    if (!text) {
      return undefined;
    }

    const normalMatch = text.match(/\bORD[\s-]*(\d{3,})\b/i);

    if (normalMatch) {
      return `ORD-${normalMatch[1]}`.toUpperCase();
    }

    const spacedMatch = text.match(/\bO[\s.-]*R[\s.-]*D[\s.-]*(\d{3,})\b/i);

    if (spacedMatch) {
      return `ORD-${spacedMatch[1]}`.toUpperCase();
    }

    const orderMatch = text.match(
      /\border(?:\s+no\.?|\s+number)?\s*[-:#]?\s*(\d{3,})\b/i,
    );

    if (orderMatch) {
      return `ORD-${orderMatch[1]}`.toUpperCase();
    }

    return undefined;
  }

  private deterministicResponse(
    _userText: string,
    intent: CustomerIntent,
    orderId?: string,
  ): LLMResponse {
    let content: string;

    if (intent === CustomerIntent.OUT_OF_SCOPE) {
      content = SAFE_OUT_OF_SCOPE_RESPONSE;
    } else if (intent === CustomerIntent.ORDER_TRACKING && !orderId) {
      content = SAFE_MISSING_ORDER_ID;
    } else if (orderId && !isValidOrderIdFormat(orderId)) {
      content = SAFE_INVALID_ORDER;
    } else if (intent === CustomerIntent.UNKNOWN) {
      content = SAFE_UNKNOWN_RESPONSE;
    } else {
      content = SAFE_FALLBACK_RESPONSE;
    }

    return {
      content,
      finishReason: "stop",
    };
  }

  private buildToolResultFallback(
    results: Array<{
      toolCallId: string;
      result: unknown;
    }>,
    intent: CustomerIntent,
    orderId?: string,
    language: string = Language.ENGLISH,
  ): string {
    if (!results.length) {
      return this.deterministicToolFallback(intent, orderId, language);
    }

    const firstResult = results[0]?.result as any;

    if (firstResult?.success && firstResult?.data) {
      const data = firstResult.data;

      const id = data.orderId ?? orderId ?? "your order";

      const product = data.product;
      const status = data.status;
      const notes = data.notes;

      if (language === Language.HINDI) {
        const parts: string[] = [];

        parts.push(
          `आपका ऑर्डर ${id} फिलहाल ${String(
            status ?? "प्रोसेस हो रहा है",
          ).toLowerCase()} है।`,
        );

        if (product) {
          parts.push(`प्रोडक्ट ${product} है।`);
        }

        if (notes) {
          parts.push(`${String(notes).replace(/[.!?]+$/, "")}।`);
        }

        return parts.join(" ");
      }

      if (language === Language.HINGLISH) {
        const parts: string[] = [];

        parts.push(
          `Aapka order ${id} filhaal ${String(
            status ?? "process ho raha hai",
          ).toLowerCase()} hai.`,
        );

        if (product) {
          parts.push(`Product ${product} hai.`);
        }

        if (notes) {
          parts.push(`${String(notes).replace(/[.!?]+$/, "")}.`);
        }

        return parts.join(" ");
      }

      const parts: string[] = [];

      parts.push(
        `Your order ${id} is currently ${String(
          status ?? "being processed",
        ).toLowerCase()}.`,
      );

      if (product) {
        parts.push(`The product is ${product}.`);
      }

      if (notes) {
        parts.push(`${String(notes).replace(/[.!?]+$/, "")}.`);
      }

      if (data.cancellationEligible === true) {
        parts.push("The order is currently eligible for cancellation.");
      }

      if (data.returnEligible === true) {
        parts.push("The order is eligible for return.");
      }

      return parts.join(" ");
    }

    if (firstResult?.success === false) {
      if (firstResult.code === ErrorCode.ORDER_NOT_FOUND) {
        if (language === Language.HINDI) {
          return "मुझे यह ऑर्डर नहीं मिला। कृपया ऑर्डर नंबर चेक करके दोबारा बताएं।";
        }

        if (language === Language.HINGLISH) {
          return "Mujhe ye order nahi mila. Please order number check karke dobara batayein.";
        }

        return "I couldn't find that order. Please verify the order number and try again.";
      }

      return (
        firstResult.message ??
        "I couldn't retrieve the requested information right now."
      );
    }

    return this.deterministicToolFallback(intent, orderId, language);
  }

  private deterministicToolFallback(
    intent: CustomerIntent,
    orderId?: string,
    language: string = Language.ENGLISH,
  ): string {
    if (language === Language.HINDI) {
      if (intent === CustomerIntent.ORDER_TRACKING && orderId) {
        return `मैं आपके ऑर्डर ${orderId} की जानकारी चेक करता हूँ।`;
      }

      if (intent === CustomerIntent.ORDER_CANCELLATION) {
        return "मैं कैंसलेशन में आपकी मदद कर सकता हूँ। पहले आपके ऑर्डर का स्टेटस चेक करता हूँ।";
      }

      if (intent === CustomerIntent.RETURN_REQUEST) {
        return "मैं रिटर्न में आपकी मदद कर सकता हूँ। पहले आपके ऑर्डर की जानकारी चेक करता हूँ।";
      }
    }

    if (language === Language.HINGLISH) {
      if (intent === CustomerIntent.ORDER_TRACKING && orderId) {
        return `Main aapke order ${orderId} ki details check karta hoon.`;
      }

      if (intent === CustomerIntent.ORDER_CANCELLATION) {
        return "Main cancellation mein aapki help kar sakta hoon. Pehle order status check karta hoon.";
      }

      if (intent === CustomerIntent.RETURN_REQUEST) {
        return "Main return mein aapki help kar sakta hoon. Pehle order details check karta hoon.";
      }
    }

    if (intent === CustomerIntent.ORDER_TRACKING && orderId) {
      return `Let me check your order ${orderId}.`;
    }

    if (intent === CustomerIntent.ORDER_CANCELLATION) {
      return "I can help you with cancellation. Let me check your order status.";
    }

    if (intent === CustomerIntent.RETURN_REQUEST) {
      return "I can help you with returns. Let me check your order details.";
    }

    return SAFE_FALLBACK_RESPONSE;
  }
}
