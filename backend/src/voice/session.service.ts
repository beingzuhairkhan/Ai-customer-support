import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import { ConversationState, Language } from 'src/common/enums';
import { generateSessionId } from 'src/common/utils';

export interface SessionData {
  sessionId: string;
  state: ConversationState;
  language: string;
  startedAt: number;
  currentOrderId?: string;
  intent?: string;
  audioBuffer: Buffer[];
  isSpeaking: boolean;
  abortController?: AbortController;
}

// Valid state transitions
const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  [ConversationState.IDLE]: [ConversationState.LISTENING, ConversationState.ENDING, ConversationState.ERROR],
  [ConversationState.LISTENING]: [ConversationState.TRANSCRIBING, ConversationState.INTERRUPTED, ConversationState.ENDING, ConversationState.ERROR],
  [ConversationState.TRANSCRIBING]: [ConversationState.THINKING, ConversationState.ERROR, ConversationState.LISTENING],
  [ConversationState.THINKING]: [ConversationState.TOOL_EXECUTION, ConversationState.SPEAKING, ConversationState.LISTENING, ConversationState.ERROR],
  [ConversationState.TOOL_EXECUTION]: [ConversationState.THINKING, ConversationState.SPEAKING, ConversationState.ERROR],
  [ConversationState.SPEAKING]: [ConversationState.LISTENING, ConversationState.INTERRUPTED, ConversationState.ENDING, ConversationState.ERROR],
  [ConversationState.INTERRUPTED]: [ConversationState.LISTENING, ConversationState.ERROR],
  [ConversationState.ENDING]: [ConversationState.COMPLETED, ConversationState.ERROR],
  [ConversationState.COMPLETED]: [],
  [ConversationState.ERROR]: [ConversationState.IDLE, ConversationState.ENDING],
};

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly ttlSeconds: number;
  private sessions: Map<string, SessionData> = new Map();

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.get<number>('session.ttlSeconds') || 1800;
  }

  createSession(): SessionData {
    const sessionId = generateSessionId();
    const session: SessionData = {
      sessionId,
      state: ConversationState.IDLE,
      language: Language.UNKNOWN,
      startedAt: Date.now(),
      audioBuffer: [],
      isSpeaking: false,
    };
    this.sessions.set(sessionId, session);
    this.redisService.setObject(`session:${sessionId}`, { state: session.state, startedAt: session.startedAt }, this.ttlSeconds);
    this.logger.log(`Session created: ${sessionId}`);
    return session;
  }

  getSession(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) || null;
  }

  updateState(sessionId: string, newState: ConversationState): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const allowed = VALID_TRANSITIONS[session.state];
    if (!allowed || !allowed.includes(newState)) {
      this.logger.warn(`Invalid state transition: ${session.state} → ${newState} for session ${sessionId}`);
      return false;
    }

    session.state = newState;
    this.redisService.setObject(`session:${sessionId}:state`, { state: newState }, this.ttlSeconds);
    return true;
  }

  forceState(sessionId: string, newState: ConversationState): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.state = newState;
  }

  addAudioChunk(sessionId: string, chunk: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.audioBuffer.push(chunk);
  }

  getAudioBuffer(sessionId: string): Buffer {
    const session = this.sessions.get(sessionId);
    if (!session || !session.audioBuffer.length) return Buffer.alloc(0);
    return Buffer.concat(session.audioBuffer);
  }

  clearAudioBuffer(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.audioBuffer = [];
  }

  setSpeaking(sessionId: string, speaking: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.isSpeaking = speaking;
  }

  setAbortController(sessionId: string, controller: AbortController): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.abortController = controller;
  }

  interrupt(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.isSpeaking && session.abortController) {
      session.abortController.abort();
    }
    session.isSpeaking = false;
    this.clearAudioBuffer(sessionId);
    return this.updateState(sessionId, ConversationState.INTERRUPTED);
  }

  setLanguage(sessionId: string, language: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.language = language;
  }

  setOrderId(sessionId: string, orderId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.currentOrderId = orderId;
  }

  setIntent(sessionId: string, intent: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.intent = intent;
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.redisService.del(`session:${sessionId}`);
    this.redisService.del(`session:${sessionId}:state`);
  }

  getDurationSeconds(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    return Math.floor((Date.now() - session.startedAt) / 1000);
  }
}
