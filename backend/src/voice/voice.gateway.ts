import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

import { VoiceService } from "./voice.service";
import { AudioService } from "./audio.service";

interface AudioInputPayload {
  audio: string;
  sessionId?: string;
}

interface SessionPayload {
  sessionId?: string;
}

@WebSocketGateway({
  namespace: "/ws/voice",
  cors: {
    origin: "*",
    credentials: false,
  },
  transports: ["websocket", "polling"],
})
export class VoiceGateway {
  private readonly logger = new Logger(VoiceGateway.name);

  @WebSocketServer()
  server!: Server;

  
  private readonly audioBuffers = new Map<string, Buffer>();
  private readonly processingSockets = new Set<string>();
  private readonly maxDurationTriggered = new Set<string>();
  private readonly SAMPLE_RATE = 16000;
  private readonly CHANNELS = 1;
  private readonly BYTES_PER_SAMPLE = 2;
  private readonly MIN_STT_BYTES = this.SAMPLE_RATE * this.BYTES_PER_SAMPLE * 1;
  private readonly MAX_STT_BYTES = this.SAMPLE_RATE * this.BYTES_PER_SAMPLE * 4;

  constructor(
    private readonly voiceService: VoiceService,
    private readonly audioService: AudioService,
  ) {}

  handleConnection(socket: Socket): void {
    const sessionId =
      typeof socket.handshake.query.sessionId === "string"
        ? socket.handshake.query.sessionId
        : undefined;

    this.logger.log(
      `[CONNECT] socket=${socket.id} session=${sessionId ?? "none"}`,
    );

    this.audioBuffers.set(socket.id, Buffer.alloc(0));

    socket.emit("connection.ready", {
      socketId: socket.id,
      sessionId,
      status: "connected",
    });
  }

  handleDisconnect(socket: Socket): void {
    const buffer = this.audioBuffers.get(socket.id);

    this.logger.log(
      `[DISCONNECT] socket=${socket.id} ` +
        `bufferedBytes=${buffer?.length ?? 0}`,
    );

    this.audioBuffers.delete(socket.id);
    this.processingSockets.delete(socket.id);
    this.maxDurationTriggered.delete(socket.id);
  }


  @SubscribeMessage("greeting.start")
  async handleGreetingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SessionPayload,
  ): Promise<void> {
    const sessionId =
      payload?.sessionId ??
      (typeof socket.handshake.query.sessionId === "string"
        ? socket.handshake.query.sessionId
        : undefined);

    if (!sessionId) {
      socket.emit("error", {
        message: "Missing sessionId",
      });

      return;
    }

    await this.sendInitialGreeting(socket, sessionId);
  }

  private async sendInitialGreeting(
    socket: Socket,
    sessionId: string,
  ): Promise<void> {
    try {
      this.logger.log(`[GREETING] socket=${socket.id} session=${sessionId}`);

      socket.emit("agent.thinking", {
        sessionId,
      });

      const result = await this.voiceService.getGreeting(sessionId);

      socket.emit("transcript.final", {
        sessionId,
        speaker: "agent",
        text: result.textResponse,
        timestamp: new Date().toISOString(),
      });

      if (!result.audio?.length) {
        this.logger.warn(`[GREETING] no audio socket=${socket.id}`);

        this.voiceService.markListening(sessionId);

        socket.emit("agent.listening", {
          sessionId,
        });

        return;
      }

      socket.emit("agent.audio", {
        sessionId,
        audio: this.audioService.encodeToBase64(result.audio),
        format: "wav",
      });

      socket.emit("agent.speaking", {
        sessionId,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error(`[GREETING] failed: ${err.message}`, err.stack);

      socket.emit("error", {
        sessionId,
        message: "Unable to generate greeting.",
      });
    }
  }


  @SubscribeMessage("agent.audio.finished")
  handleAgentAudioFinished(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SessionPayload,
  ): void {
    const sessionId =
      payload?.sessionId ??
      (typeof socket.handshake.query.sessionId === "string"
        ? socket.handshake.query.sessionId
        : undefined);

    if (!sessionId) {
      this.logger.warn(
        `[AUDIO.FINISHED] missing sessionId ` + `socket=${socket.id}`,
      );

      return;
    }

    this.logger.log(
      `[AUDIO.FINISHED] socket=${socket.id} ` + `session=${sessionId}`,
    );

    this.voiceService.markListening(sessionId);

    socket.emit("agent.listening", {
      sessionId,
    });
  }

  @SubscribeMessage("audio.input")
  async handleAudioInput(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: AudioInputPayload,
  ): Promise<void> {
    try {
      if (!payload?.sessionId) {
        this.logger.warn(
          `[AUDIO.INPUT] missing sessionId ` + `socket=${socket.id}`,
        );

        socket.emit("error", {
          message: "Missing sessionId",
        });

        return;
      }

      if (!payload.audio) {
        return;
      }

      if (this.processingSockets.has(socket.id)) {
        return;
      }

      const pcm16 = this.audioService.decodeFromBase64(payload.audio);

      if (!pcm16.length) {
        return;
      }

      const fixedPcm16 =
        pcm16.length % this.BYTES_PER_SAMPLE === 0
          ? pcm16
          : pcm16.subarray(
              0,
              pcm16.length - (pcm16.length % this.BYTES_PER_SAMPLE),
            );

      if (!fixedPcm16.length) {
        return;
      }

      await this.appendAudio(socket, payload.sessionId, fixedPcm16);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `[AUDIO.INPUT] failed ` + `socket=${socket.id}: ${err.message}`,
        err.stack,
      );

      socket.emit("error", {
        message: "Failed to process audio input",
      });
    }
  }


  private async appendAudio(
    socket: Socket,
    sessionId: string,
    pcm16: Buffer,
  ): Promise<void> {
    const socketId = socket.id;

    if (this.processingSockets.has(socketId)) {
      return;
    }

    if (this.maxDurationTriggered.has(socketId)) {
      return;
    }

    const previous = this.audioBuffers.get(socketId) ?? Buffer.alloc(0);

    const remaining = this.MAX_STT_BYTES - previous.length;

    if (remaining <= 0) {
      await this.handleMaximumDuration(socket, sessionId);

      return;
    }

    const audioToAppend =
      pcm16.length <= remaining ? pcm16 : pcm16.subarray(0, remaining);

    const combined = Buffer.concat([previous, audioToAppend]);

    this.audioBuffers.set(socketId, combined);

    const durationMs = Math.round(
      (combined.length / (this.SAMPLE_RATE * this.BYTES_PER_SAMPLE)) * 1000,
    );

    this.logger.debug(
      `[AUDIO.BUFFER] socket=${socketId} ` +
        `chunk=${audioToAppend.length} ` +
        `total=${combined.length} ` +
        `durationMs=${durationMs}`,
    );

    if (combined.length >= this.MAX_STT_BYTES) {
      await this.handleMaximumDuration(socket, sessionId);
    }
  }


  private async handleMaximumDuration(
    socket: Socket,
    sessionId: string,
  ): Promise<void> {
    const socketId = socket.id;


    if (
      this.maxDurationTriggered.has(socketId) ||
      this.processingSockets.has(socketId)
    ) {
      return;
    }

    this.maxDurationTriggered.add(socketId);

    this.logger.warn(
      `[AUDIO.BUFFER] maximum utterance reached ` +
        `socket=${socketId} ` +
        `session=${sessionId} ` +
        `bytes=${this.audioBuffers.get(socketId)?.length ?? 0} ` +
        `durationMs=4000`,
    );

 
    socket.emit("audio.max_duration", {
      sessionId,
      durationMs: 4000,
    });

    await this.processBufferedAudio(socket, sessionId);
  }


  private async processBufferedAudio(
    socket: Socket,
    sessionId: string,
  ): Promise<void> {
    const socketId = socket.id;


    if (this.processingSockets.has(socketId)) {
      return;
    }

    this.processingSockets.add(socketId);

    const buffer = this.audioBuffers.get(socketId) ?? Buffer.alloc(0);

    this.audioBuffers.set(socketId, Buffer.alloc(0));

    try {
      if (!buffer.length) {
        this.logger.debug(
          `[AUDIO.PROCESS] empty buffer ` + `socket=${socketId}`,
        );

        return;
      }

      if (buffer.length < this.MIN_STT_BYTES) {
        this.logger.debug(
          `[AUDIO.PROCESS] audio too short ` +
            `socket=${socketId} ` +
            `bytes=${buffer.length} ` +
            `minimum=${this.MIN_STT_BYTES}`,
        );

        return;
      }

      const processBytes = Math.min(buffer.length, this.MAX_STT_BYTES);

      const audioToProcess = buffer.subarray(0, processBytes);

      const fixedAudio =
        audioToProcess.length % this.BYTES_PER_SAMPLE === 0
          ? audioToProcess
          : audioToProcess.subarray(
              0,
              audioToProcess.length -
                (audioToProcess.length % this.BYTES_PER_SAMPLE),
            );

      if (!fixedAudio.length) {
        return;
      }

      const wav = this.audioService.pcm16ToWav(
        fixedAudio,
        this.SAMPLE_RATE,
        this.CHANNELS,
      );

      const durationMs = Math.round(
        (fixedAudio.length / (this.SAMPLE_RATE * this.BYTES_PER_SAMPLE)) * 1000,
      );

      this.logger.log(
        `[AUDIO.STT] socket=${socketId} ` +
          `session=${sessionId} ` +
          `pcmBytes=${fixedAudio.length} ` +
          `wavBytes=${wav.length} ` +
          `durationMs=${durationMs}`,
      );

      socket.emit("agent.thinking", {
        sessionId,
      });

      const result = await this.voiceService.processAudio(sessionId, wav);

      this.logger.log(
        `[AUDIO.PROCESS] socket=${socketId} ` +
          `session=${sessionId} ` +
          `response="${result.textResponse}" ` +
          `audioBytes=${result.audio?.length ?? 0}`,
      );

      socket.emit("transcript.final", {
        sessionId,
        speaker: "agent",
        text: result.textResponse,
        timestamp: new Date().toISOString(),
      });

      if (result.audio?.length) {
        socket.emit("agent.audio", {
          sessionId,
          audio: this.audioService.encodeToBase64(result.audio),
          format: "wav",
        });

        socket.emit("agent.speaking", {
          sessionId,
        });

      } else {
        this.voiceService.markListening(sessionId);

        socket.emit("agent.listening", {
          sessionId,
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `[AUDIO.PROCESS] failed ` +
          `socket=${socketId} ` +
          `session=${sessionId}: ${err.message}`,
        err.stack,
      );

      socket.emit("error", {
        sessionId,
        message: "Unable to process the audio.",
      });

      this.voiceService.markListening(sessionId);

      socket.emit("agent.listening", {
        sessionId,
      });
    } finally {
    
      this.processingSockets.delete(socketId);

  
      this.maxDurationTriggered.delete(socketId);

      this.logger.debug(
        `[AUDIO.PROCESS] pipeline finished ` + `socket=${socketId}`,
      );
    }
  }


  @SubscribeMessage("audio.end")
  async handleAudioEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SessionPayload,
  ): Promise<void> {
    const sessionId = payload?.sessionId;

    if (!sessionId) {
      return;
    }


    if (this.processingSockets.has(socket.id)) {
      return;
    }

    this.logger.log(
      `[AUDIO.END] socket=${socket.id} ` + `session=${sessionId}`,
    );


    await this.processBufferedAudio(socket, sessionId);
  }


  @SubscribeMessage("session.end")
  async handleSessionEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SessionPayload,
  ): Promise<void> {
    const sessionId = payload?.sessionId;

    if (!sessionId) {
      return;
    }

    try {
   
      this.processingSockets.add(socket.id);

      this.audioBuffers.set(socket.id, Buffer.alloc(0));

      const summary = await this.voiceService.endSession(sessionId);

      this.audioBuffers.delete(socket.id);

      this.processingSockets.delete(socket.id);

      this.maxDurationTriggered.delete(socket.id);

      socket.emit("session.end", {
        sessionId,
        summary,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.processingSockets.delete(socket.id);

      this.logger.error(`[SESSION.END] failed: ${err.message}`, err.stack);

      socket.emit("error", {
        sessionId,
        message: "Unable to end the session.",
      });
    }
  }
}
