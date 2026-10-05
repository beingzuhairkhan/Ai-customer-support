import { Injectable, Logger } from "@nestjs/common";

import { AiOrchestratorService } from "src/ai/services/ai-orchestrator.service";
import { ConversationsService } from "src/conversations/conversations.service";
import { CallsService } from "src/calls/calls.service";
import { MetricsService } from "src/metrics/metrics.service";

import { SessionService } from "./session.service";
import { AudioService } from "./audio.service";

import { ConversationState, MessageRole, CallStatus } from "src/common/enums";

export interface VoiceProcessingResult {
  textResponse: string;
  toolCallsMade: string[];
  intent: string;
  orderId?: string;
  language: string;
  audio?: Buffer | null;
  guardrailPassed: boolean;
}

export interface StartSessionResult {
  sessionId: string;
  status: string;
  greeting: string;
  audio?: Buffer | null;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  private readonly DEFAULT_LANGUAGE = "en";

  private readonly GREETING =
    "Hello! I'm Aria from Aura Skincare. How can I help you today?";

  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly conversationsService: ConversationsService,
    private readonly sessionService: SessionService,
    private readonly audioService: AudioService,
    private readonly callsService: CallsService,
    private readonly metricsService: MetricsService,
  ) {}


  async startSession(): Promise<StartSessionResult> {
    const session = this.sessionService.createSession();

    const sessionId = session.sessionId;
    const language = session.language || this.DEFAULT_LANGUAGE;

    await this.conversationsService.createSession(sessionId);

    await this.callsService.createCallRecord(sessionId);

    this.metricsService.recordCallStarted();

    await this.conversationsService.addMessage(
      sessionId,
      MessageRole.AGENT,
      this.GREETING,
      {
        language,
      },
    );

    this.logger.log(`[${sessionId}] Session started with greeting`);

    this.sessionService.updateState(sessionId, ConversationState.LISTENING);

    return {
      sessionId,
      status: CallStatus.ACTIVE,
      greeting: this.GREETING,
      audio: null,
    };
  }

  private resolveLanguage(language?: string): string {
    if (!language || language === this.DEFAULT_LANGUAGE) {
      return this.DEFAULT_LANGUAGE;
    }

    return language;
  }

  async getGreeting(sessionId: string): Promise<VoiceProcessingResult> {
    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    const language = this.resolveLanguage(session.language);

    if (session.state === ConversationState.LISTENING) {
      this.sessionService.updateState(sessionId, ConversationState.SPEAKING);
    }

    this.logger.log(
      `[${sessionId}] Generating greeting TTS: ` +
        `"${this.GREETING}" language=${language}`,
    );

    const ttsResult = await this.timed(sessionId, "TTS greeting", () =>
      this.orchestrator.synthesizeSpeech(this.GREETING, language),
    );

    const audio = ttsResult?.audio ?? null;

    this.logger.log(
      `[${sessionId}] Greeting TTS audio=${
        audio ? `${audio.length} bytes` : "NO AUDIO"
      }`,
    );

    return {
      textResponse: this.GREETING,
      toolCallsMade: [],
      intent: "UNKNOWN",
      language,
      audio,
      guardrailPassed: true,
    };
  }


  async processAudio(
    sessionId: string,
    audioBuffer: Buffer,
  ): Promise<VoiceProcessingResult> {
    this.logger.log(
      `[${sessionId}] Processing audio length=${audioBuffer.length}`,
    );

    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

   
    const audioValidation = this.audioService.validateAudio(audioBuffer);

    if (!audioValidation.valid) {
      this.logger.warn(
        `[${sessionId}] Audio validation failed: ` +
          `${audioValidation.reason}`,
      );

      return this.createFallbackResponse(
        sessionId,
        session.language || this.DEFAULT_LANGUAGE,
      );
    }

   
    this.sessionService.updateState(sessionId, ConversationState.TRANSCRIBING);

    const sttResult = await this.timed(sessionId, "STT", () =>
      this.orchestrator.transcribeAudio(audioBuffer),
    );

    const detectedLanguage =
      sttResult.language || session.language || this.DEFAULT_LANGUAGE;

    this.logger.log(
      `[${sessionId}] STT text="${sttResult.text}" ` +
        `confidence=${sttResult.confidence} ` +
        `language=${detectedLanguage}`,
    );

  
    if (!sttResult.text?.trim()) {
      return this.createFallbackResponse(sessionId, detectedLanguage);
    }

    await this.conversationsService.addMessage(
      sessionId,
      MessageRole.CUSTOMER,
      sttResult.text,
      {
        confidence: sttResult.confidence,
        language: detectedLanguage,
      },
    );

    this.sessionService.setLanguage(sessionId, detectedLanguage);


    return this.processText(sessionId, sttResult.text);
  }

  async processText(
    sessionId: string,
    userText: string,
  ): Promise<VoiceProcessingResult> {
    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

 
    const history = await this.conversationsService.getHistory(sessionId);

    this.sessionService.updateState(sessionId, ConversationState.THINKING);

    const result = await this.timed(sessionId, "LLM processing", () =>
      this.orchestrator.processUserMessage(userText, history),
    );


    if (result.orderId) {
      this.sessionService.setOrderId(sessionId, result.orderId);

      await this.conversationsService.updateOrderId(sessionId, result.orderId);
    }


    if (result.intent) {
      this.sessionService.setIntent(sessionId, result.intent);

      await this.conversationsService.updateIntent(
        sessionId,
        result.intent as any,
      );
    }

 
    const language =
      result.language || session.language || this.DEFAULT_LANGUAGE;

    await this.conversationsService.updateLanguage(sessionId, language);

    this.sessionService.setLanguage(sessionId, language);

  
    await this.conversationsService.addMessage(
      sessionId,
      MessageRole.AGENT,
      result.textResponse,
      {
        language,
        toolCalls: result.toolCallsMade,
      },
    );

   
    this.sessionService.updateState(sessionId, ConversationState.SPEAKING);

    const ttsResult = await this.timed(sessionId, "TTS response", () =>
      this.orchestrator.synthesizeSpeech(result.textResponse, language),
    );

    const audio = ttsResult?.audio ?? null;

    this.logger.log(
      `[${sessionId}] Response TTS audio=${
        audio ? `${audio.length} bytes` : "NO AUDIO"
      }`,
    );

   
    return {
      textResponse: result.textResponse,
      toolCallsMade: result.toolCallsMade ?? [],
      intent: result.intent || "UNKNOWN",
      orderId: result.orderId,
      language,
      audio,
      guardrailPassed: result.guardrailPassed ?? true,
    };
  }

  private async createFallbackResponse(
    sessionId: string,
    language: string,
  ): Promise<VoiceProcessingResult> {
    const response = "I couldn't hear that clearly. Could you please repeat?";

    this.logger.warn(`[${sessionId}] Using fallback response`);

    await this.conversationsService.addMessage(
      sessionId,
      MessageRole.AGENT,
      response,
      {
        language,
      },
    );

    this.sessionService.updateState(sessionId, ConversationState.SPEAKING);

    const ttsResult = await this.timed(sessionId, "TTS response", () =>
      this.orchestrator.synthesizeSpeech(response, language),
    );

    const audio = ttsResult?.audio ?? null;

    this.logger.log(
      `[${sessionId}] Response TTS audio=${
        audio ? `${audio.length} bytes` : "NO AUDIO"
      }`,
    );


    return {
      textResponse: response,
      toolCallsMade: [],
      intent: "UNKNOWN",
      language,
      audio: ttsResult?.audio ?? null,
      guardrailPassed: true,
    };
  }


  async endSession(sessionId: string): Promise<any> {
    const session = this.sessionService.getSession(sessionId);


    if (!session) {
      console.error("[END SESSION] Session not found:", sessionId);
      throw new Error("Session not found");
    }

    this.sessionService.updateState(sessionId, ConversationState.ENDING);

    const duration = this.sessionService.getDurationSeconds(sessionId);

    const transcript = await this.conversationsService.getTranscript(sessionId);

    const summaryInput = transcript.map((message) => ({
      role: message.role,
      text: message.text,
    }));


    const aiSummary = await this.orchestrator.generateSummary(summaryInput);


    const summary = await this.callsService.endCall(
      sessionId,
      duration,
      session.intent,
      session.currentOrderId,
      session.language,
      aiSummary,
    );

    this.sessionService.updateState(sessionId, ConversationState.COMPLETED);


    this.sessionService.removeSession(sessionId);

    this.metricsService.recordCallCompleted();
    this.metricsService.observeCallDuration(duration);

    this.logger.log(`[${sessionId}] Session ended duration=${duration}s`);

    return summary;
  }

  markListening(sessionId: string): void {
    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      this.logger.warn(
        `[${sessionId}] Cannot mark listening: session not found`,
      );

      return;
    }

    /**
     * LISTENING is already the desired state.
     * Do not attempt LISTENING -> LISTENING.
     */
    if (session.state === ConversationState.LISTENING) {
      this.logger.debug(`[${sessionId}] Already LISTENING`);

      return;
    }

    const updated = this.sessionService.updateState(
      sessionId,
      ConversationState.LISTENING,
    );

    if (!updated) {
      this.logger.warn(
        `[${sessionId}] Unable to transition ` +
          `${session.state} -> LISTENING`,
      );

      return;
    }

    this.logger.log(`[${sessionId}] Agent audio finished -> LISTENING`);
  }

  private async timed<T>(
    sessionId: string,
    label: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();

    try {
      return await operation();
    } finally {
      this.logger.log(
        `[${sessionId}] ${label} completed in ` + `${Date.now() - startedAt}ms`,
      );
    }
  }
}
