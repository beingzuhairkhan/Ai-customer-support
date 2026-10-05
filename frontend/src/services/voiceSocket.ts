import { io, Socket } from "socket.io-client";

import env from "@/config/env";

import type { WsMessage, WsMessageHandler } from "@/types/websocket";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

const DEBUG = true;

const AUDIO_LOG_EVERY = 60;

const WARN_THROTTLE_MS = 3000;

function log(...args: unknown[]): void {
  if (DEBUG) {
    console.log("[VoiceSocket]", ...args);
  }
}

function warn(...args: unknown[]): void {
  if (DEBUG) {
    console.warn("[VoiceSocket]", ...args);
  }
}

function error(...args: unknown[]): void {
  console.error("[VoiceSocket]", ...args);
}

function summarize(input: unknown): unknown {
  if (typeof input === "string") {
    return input.length > 200 ? `<string ${input.length} chars>` : input;
  }

  if (
    input === null ||
    typeof input === "number" ||
    typeof input === "boolean" ||
    typeof input === "bigint" ||
    typeof input === "undefined"
  ) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => summarize(item));
  }

  if (typeof input === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, entryValue] of Object.entries(
      input as Record<string, unknown>,
    )) {
      output[key] = summarize(entryValue);
    }

    return output;
  }

  return String(input);
}

const NOISY_EVENTS = new Set<string>(["agent.audio", "transcript.partial"]);

export class VoiceSocket {
  private socket: Socket | null = null;

  private handlers = new Set<WsMessageHandler>();

  private stateHandlers = new Set<(state: ConnectionState) => void>();

  private sessionId: string | null = null;

  private readonly maxReconnects = 3;

  private audioChunksSent = 0;

  private lastWarnAt = 0;

  private audioFinishedSent = false;

  connect(sessionId: string): Promise<void> {
    if (!sessionId) {
      return Promise.reject(new Error("Session ID is required"));
    }

    if (this.socket?.connected && this.sessionId === sessionId) {
      log("Already connected", {
        socketId: this.socket.id,

        sessionId: this.sessionId,
      });

      return Promise.resolve();
    }

    this.destroySocket();

    this.sessionId = sessionId;

    this.audioChunksSent = 0;

    this.audioFinishedSent = false;

    const baseUrl = env.wsUrl?.replace(/\/+$/, "") || "http://localhost:5000";

    const namespaceUrl = `${baseUrl}/ws/voice`;

    log("CONNECT", {
      namespaceUrl,
      sessionId,
    });

    this.notifyState("connecting");

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const socket = io(namespaceUrl, {
        transports: ["websocket", "polling"],

        query: {
          sessionId,
        },

        reconnection: true,

        reconnectionAttempts: this.maxReconnects,

        reconnectionDelay: 1000,

        reconnectionDelayMax: 5000,

        withCredentials: false,

        autoConnect: true,
      });

      this.socket = socket;

  

      socket.on("connect", () => {
        if (this.socket !== socket) {
          return;
        }

        log("CONNECTED", {
          socketId: socket.id,

          sessionId: this.sessionId,
        });

        this.notifyState("connected");

        if (!settled) {
          settled = true;

          resolve();
        }
      });



      socket.on("connect_error", (err) => {
        if (this.socket !== socket) {
          return;
        }

        error("CONNECT ERROR", err.message);

        this.notifyState("error");

        if (!settled) {
          settled = true;

          this.destroySocket(socket);

          reject(err);
        }
      });



      socket.io.on("open", () => {
        if (this.socket !== socket) {
          return;
        }

        const engine = socket.io.engine;

        log("Engine.IO OPEN", engine.transport.name);

        engine.once("upgrade", (transport: { name: string }) => {
          if (this.socket !== socket) {
            return;
          }

          log("Transport upgraded:", transport.name);
        });

        engine.once("close", (reason: string) => {
          if (this.socket !== socket) {
            return;
          }

          warn("Engine closed:", reason);
        });

        engine.once("error", (engineError: unknown) => {
          if (this.socket !== socket) {
            return;
          }

          error("Engine error:", engineError);
        });
      });


      socket.io.on("reconnect_attempt", (attempt: number) => {
        if (this.socket !== socket) {
          return;
        }

        log(`Reconnect attempt ${attempt}/${this.maxReconnects}`);

        this.notifyState("reconnecting");
      });

      socket.io.on("reconnect_error", (reconnectError: unknown) => {
        if (this.socket !== socket) {
          return;
        }

        error("Reconnect error:", reconnectError);

        this.notifyState("error");
      });

      socket.io.on("reconnect_failed", () => {
        if (this.socket !== socket) {
          return;
        }

        error("Reconnect failed");

        this.notifyState("error");
      });



      socket.on("disconnect", (reason) => {
        if (this.socket !== socket) {
          return;
        }

        warn("DISCONNECTED", {
          reason,

          active: socket.active,
        });

        this.notifyState("disconnected");
      });

   

      socket.onAny((event: string, data: unknown) => {
        if (this.socket !== socket) {
          return;
        }

        if (!NOISY_EVENTS.has(event)) {
          log(`EVENT: ${event}`, summarize(data));
        }

        const payload =
          data !== null && typeof data === "object" && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : undefined;

        const receivedSessionId = payload?.sessionId;

        if (
          typeof receivedSessionId === "string" &&
          receivedSessionId.length > 0
        ) {
          this.sessionId = receivedSessionId;
        }

        const message = {
          ...(payload ?? {}),
          type: event,
        } as unknown as WsMessage;

        const handlers = Array.from(this.handlers);

        for (const handler of handlers) {
          try {
            handler(message);
          } catch (handlerError) {
            error("Message handler error:", handlerError);
          }
        }
      });
    });
  }



  startGreeting(): void {
    const socket = this.socket;

    if (!socket?.connected) {
      this.throttledWarn("Cannot start greeting - socket disconnected");

      return;
    }

    if (!this.sessionId) {
      warn("Cannot start greeting - no session ID");

      return;
    }

    log("→ greeting.start", this.sessionId);

    socket.emit("greeting.start", {
      sessionId: this.sessionId,
    });
  }

  resetAudioFinished(): void {
    this.audioFinishedSent = false;

    log("Audio finished state RESET", {
      sessionId: this.sessionId,
    });
  }



  notifyAudioFinished(): void {
    const socket = this.socket;

    if (!socket?.connected) {
      warn("Cannot notify audio finished - socket disconnected");

      return;
    }

    if (!this.sessionId) {
      warn("Cannot notify audio finished - no session ID");

      return;
    }

  
    if (this.audioFinishedSent) {
      log("agent.audio.finished already sent for current turn");

      return;
    }

    this.audioFinishedSent = true;

    log("→ agent.audio.finished", {
      socketId: socket.id,

      sessionId: this.sessionId,
    });

    socket.emit("agent.audio.finished", {
      sessionId: this.sessionId,
    });
  }



  sendAudio(audioBase64: string): void {
    const socket = this.socket;

    if (!socket?.connected) {
      this.throttledWarn("Cannot send audio - socket disconnected");

      return;
    }

    if (!audioBase64) {
      return;
    }

    if (!this.sessionId) {
      return;
    }

    this.audioChunksSent += 1;

    if (
      this.audioChunksSent === 1 ||
      this.audioChunksSent % AUDIO_LOG_EVERY === 0
    ) {
      log("→ audio.input", {
        sessionId: this.sessionId,

        chunksSent: this.audioChunksSent,

        base64Length: audioBase64.length,
      });
    }


    socket.volatile.emit("audio.input", {
      sessionId: this.sessionId,

      audio: audioBase64,
    });
  }


  endAudio(): void {
    const socket = this.socket;

    if (!socket?.connected) {
      warn("Cannot end audio - socket disconnected");

      return;
    }

    if (!this.sessionId) {
      return;
    }

    log("→ audio.end", this.sessionId);

    socket.emit("audio.end", {
      sessionId: this.sessionId,
    });
  }

 

  endSession(): void {
    const socket = this.socket;

    if (!socket?.connected) {
      return;
    }

    if (!this.sessionId) {
      return;
    }

    log("→ session.end", this.sessionId);

    socket.emit("session.end", {
      sessionId: this.sessionId,
    });
  }


  onMessage(handler: WsMessageHandler): () => void {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }


  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateHandlers.add(handler);

    return () => {
      this.stateHandlers.delete(handler);
    };
  }


  disconnect(): void {
    log("MANUAL DISCONNECT", {
      socketId: this.socket?.id,

      sessionId: this.sessionId,
    });

    this.destroySocket();

    this.sessionId = null;

    this.audioChunksSent = 0;

    this.audioFinishedSent = false;

    this.notifyState("disconnected");
  }


  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }

  get currentSocketId(): string | null {
    return this.socket?.id ?? null;
  }


  private destroySocket(expectedSocket?: Socket): void {
    const socket = expectedSocket ?? this.socket;

    if (!socket) {
      return;
    }

    if (expectedSocket && this.socket !== expectedSocket) {
      return;
    }

    try {
      socket.removeAllListeners();

      socket.io.removeAllListeners();

      socket.disconnect();
    } catch (destroyError) {
      error("Failed to destroy socket:", destroyError);
    }

    if (this.socket === socket) {
      this.socket = null;
    }
  }


  private throttledWarn(message: string): void {
    const now = Date.now();

    if (now - this.lastWarnAt >= WARN_THROTTLE_MS) {
      this.lastWarnAt = now;

      warn(message);
    }
  }


  private notifyState(state: ConnectionState): void {
    log(`STATE → ${state}`);

    const handlers = Array.from(this.stateHandlers);

    for (const handler of handlers) {
      try {
        handler(state);
      } catch (handlerError) {
        error("State handler error:", handlerError);
      }
    }
  }
}
