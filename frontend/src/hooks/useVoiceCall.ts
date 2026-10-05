import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { VoiceSocket } from "@/services/voiceSocket";

import {
  startCall,
  endCall,
  getCallSummary,
  getCallTranscript,
} from "@/services/callApi";

import { useCallStore } from "@/store/callStore";

import { useMicrophone } from "./useMicrophone";
import { useAudioPlayback } from "./useAudioPlayback";

import type { WsMessage } from "@/types/websocket";
import type { TranscriptMessage, ToolActivity } from "@/types/transcript";

/* ================================================================
 * CONFIG
 * ================================================================ */

const DEBUG = true;

const SEND_PCM16 = true;

const TARGET_SAMPLE_RATE = 16000;

function log(...args: unknown[]) {
  if (DEBUG) {
    console.log("[useVoiceCall]", ...args);
  }
}

function warn(...args: unknown[]) {
  if (DEBUG) {
    console.warn("[useVoiceCall]", ...args);
  }
}

function error(...args: unknown[]) {
  console.error("[useVoiceCall]", ...args);
}

/* ================================================================
 * IDS
 * ================================================================ */

let messageCounter = 0;

const nextId = () => `msg-${++messageCounter}`;

/* ================================================================
 * MODULE RESOURCES
 * ================================================================ */

const resources: {
  socket: VoiceSocket | null;

  processor: ScriptProcessorNode | null;

  source: MediaStreamAudioSourceNode | null;

  audioCtx: AudioContext | null;

  stream: MediaStream | null;

  generation: number;

  /**
   * Backend has explicitly allowed
   * microphone audio to be sent.
   */
  micListening: boolean;

  /**
   * Prevent duplicate audio.finished
   * notifications for the same agent turn.
   *
   * IMPORTANT:
   * This is also reset by VoiceSocket when
   * a new agent.speaking event starts.
   */
  audioEnded: boolean;

  /**
   * Browser is currently playing agent audio.
   */
  audioPlaying: boolean;

  /**
   * Generation of currently playing audio.
   */
  audioGeneration: number;
} = {
  socket: null,

  processor: null,

  source: null,

  audioCtx: null,

  stream: null,

  generation: 0,

  micListening: false,

  audioEnded: true,

  audioPlaying: false,

  audioGeneration: 0,
};

/**
 * Latest audio playback instance.
 */
let audioHandle: ReturnType<typeof useAudioPlayback> | null = null;

/* ================================================================
 * AUDIO HELPERS
 * ================================================================ */

function downsample(
  input: Float32Array,
  inRate: number,
  outRate: number,
): Float32Array {
  if (outRate >= inRate) {
    return input;
  }

  const ratio = inRate / outRate;

  const outLength = Math.floor(input.length / ratio);

  const output = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);

    const end = Math.min(Math.floor((i + 1) * ratio), input.length);

    let sum = 0;

    for (let j = start; j < end; j++) {
      sum += input[j];
    }

    output[i] = end > start ? sum / (end - start) : 0;
  }

  return output;
}

function floatTo16BitPcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);

  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));

    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function encodeChunk(channelData: Float32Array, inputRate: number): string {
  if (SEND_PCM16) {
    const resampled = downsample(channelData, inputRate, TARGET_SAMPLE_RATE);

    const pcm16 = floatTo16BitPcm(resampled);

    return bytesToBase64(new Uint8Array(pcm16.buffer));
  }

  const copy = new Float32Array(channelData);

  return bytesToBase64(new Uint8Array(copy.buffer));
}

/* ================================================================
 * MICROPHONE CONTROL
 * ================================================================ */

function stopSendingMicrophone(): void {
  if (resources.micListening) {
    log("Microphone sending DISABLED");
  }

  resources.micListening = false;
}

function startSendingMicrophone(): void {
  /**
   * Never enable microphone while
   * agent audio is playing.
   */
  if (resources.audioPlaying) {
    warn("Attempted to enable microphone while audio is playing");

    return;
  }

  if (!resources.socket?.isConnected) {
    warn("Attempted to enable microphone without socket");

    return;
  }

  resources.micListening = true;

  resources.audioEnded = false;

  log("Microphone sending ENABLED");
}

/* ================================================================
 * AUDIO FINISHED
 * ================================================================ */

function notifyAudioFinished(generation: number): void {
  /**
   * Ignore callbacks from an old call/audio.
   */
  if (generation !== resources.generation) {
    log("Ignoring stale audio completion", {
      generation,
      currentGeneration: resources.generation,
    });

    return;
  }

  /**
   * Ignore duplicate browser playback
   * callbacks.
   */
  if (resources.audioEnded) {
    log("Ignoring duplicate audio completion");

    return;
  }

  resources.audioEnded = true;

  resources.audioPlaying = false;

  log("Agent audio playback FINISHED");

  const socket = resources.socket;

  if (!socket?.isConnected) {
    warn("Cannot notify audio finished: socket disconnected");

    return;
  }

  /**
   * IMPORTANT:
   *
   * VoiceSocket internally prevents duplicate
   * agent.audio.finished events for the
   * current agent turn.
   *
   * It resets that flag automatically when
   * the next agent.speaking event arrives.
   */
  socket.notifyAudioFinished();

  /**
   * Do NOT enable microphone here.
   *
   * Backend must first send:
   *
   * agent.listening
   *
   * which then enables microphone.
   */
}

/* ================================================================
 * TEARDOWN CAPTURE
 * ================================================================ */

async function teardownCapture() {
  resources.micListening = false;

  if (resources.processor) {
    resources.processor.onaudioprocess = null;

    try {
      resources.processor.disconnect();
    } catch (err) {
      warn("Processor disconnect failed:", err);
    }

    resources.processor = null;
  }

  if (resources.source) {
    try {
      resources.source.disconnect();
    } catch (err) {
      warn("Source disconnect failed:", err);
    }

    resources.source = null;
  }

  if (resources.audioCtx) {
    try {
      await resources.audioCtx.close();
    } catch (err) {
      warn("AudioContext close failed:", err);
    }

    resources.audioCtx = null;
  }

  if (resources.stream) {
    resources.stream.getTracks().forEach((track) => {
      track.stop();
    });

    resources.stream = null;
  }
}

/* ================================================================
 * SOCKET TEARDOWN
 * ================================================================ */

function teardownSocket() {
  if (resources.socket) {
    try {
      resources.socket.disconnect();
    } catch (err) {
      warn("Socket disconnect failed:", err);
    }

    resources.socket = null;
  }
}

/* ================================================================
 * ALL RESOURCES
 * ================================================================ */

async function teardownAll() {
  /**
   * Invalidate pending playback callbacks.
   */
  ++resources.generation;

  resources.audioPlaying = false;

  resources.audioEnded = true;

  stopSendingMicrophone();

  try {
    audioHandle?.stop();
  } catch (err) {
    warn("Audio stop failed:", err);
  }

  await teardownCapture();

  teardownSocket();
}

/* ================================================================
 * WEBSOCKET HANDLER
 * ================================================================ */

function handleWsMessage(msg: WsMessage) {
  log("WebSocket message:", msg);

  const store = useCallStore.getState();

  switch (msg.type) {
    /* ------------------------------------------------------------
     * AGENT THINKING
     * ------------------------------------------------------------ */

    case "agent.thinking": {
      /**
       * Backend is processing user speech.
       *
       * Microphone must remain disabled.
       */
      stopSendingMicrophone();

      store.setVoiceState("THINKING");

      break;
    }

    /* ------------------------------------------------------------
     * AGENT SPEAKING
     * ------------------------------------------------------------ */

    case "agent.speaking": {
      /**
       * IMPORTANT:
       *
       * Every agent.speaking event represents
       * a NEW agent response/turn.
       *
       * VoiceSocket resets its
       * agent.audio.finished guard here.
       */
      resources.socket?.resetAudioFinished();

      /**
       * Immediately stop microphone.
       */
      stopSendingMicrophone();

      resources.audioPlaying = true;

      resources.audioEnded = false;

      resources.audioGeneration = resources.generation;

      store.setVoiceState("SPEAKING");

      log("New agent speaking turn started");

      break;
    }

    /* ------------------------------------------------------------
     * AGENT AUDIO
     * ------------------------------------------------------------ */

    case "agent.audio": {
      log("Agent audio received:", {
        sessionId: msg.sessionId,
        audioLength: msg.audio?.length,
        format: msg.format,
      });

      if (!msg.audio) {
        warn("agent.audio received without audio");

        return;
      }

      /**
       * NEVER allow microphone input while
       * agent audio is being played.
       */
      stopSendingMicrophone();

      resources.audioPlaying = true;

      resources.audioEnded = false;

      const playbackGeneration = resources.generation;

      resources.audioGeneration = playbackGeneration;

      /**
       * Play audio.
       */
      void audioHandle?.play(msg.audio, msg.format, () => {
        notifyAudioFinished(playbackGeneration);
      });

      break;
    }

    /* ------------------------------------------------------------
     * AGENT LISTENING
     * ------------------------------------------------------------ */

    case "agent.listening": {
      log("Backend says LISTENING");

      /**
       * Safety check.
       *
       * Backend should normally send this only
       * after agent.audio.finished.
       */
      if (resources.audioPlaying) {
        warn(
          "Backend says LISTENING while audio is still playing; microphone remains disabled",
        );

        store.setVoiceState("SPEAKING");

        return;
      }

      startSendingMicrophone();

      store.setVoiceState("LISTENING");

      break;
    }

    /* ------------------------------------------------------------
     * TRANSCRIPT PARTIAL
     * ------------------------------------------------------------ */

    case "transcript.partial": {
      const partial: TranscriptMessage = {
        id: nextId(),

        speaker: msg.speaker,

        text: msg.text,

        timestamp: new Date().toISOString(),

        isFinal: false,
      };

      store.setPartialTranscript(partial);

      break;
    }

    /* ------------------------------------------------------------
     * TRANSCRIPT FINAL
     * ------------------------------------------------------------ */

    case "transcript.final": {
      const finalMessage: TranscriptMessage = {
        id: nextId(),

        speaker: msg.speaker,

        text: msg.text,

        timestamp: msg.timestamp || new Date().toISOString(),

        isFinal: true,
      };

      store.setPartialTranscript(null);

      store.addTranscriptMessage(finalMessage);

      break;
    }

    /* ------------------------------------------------------------
     * INTERRUPTED
     * ------------------------------------------------------------ */

    case "agent.interrupted": {
      log("Agent interrupted");

      stopSendingMicrophone();

      resources.audioPlaying = false;

      resources.audioEnded = true;

      try {
        audioHandle?.stop();
      } catch (err) {
        warn("Audio interruption stop failed:", err);
      }

      store.setVoiceState("INTERRUPTED");

      /**
       * Give browser a moment to stop audio.
       */
      setTimeout(() => {
        if (useCallStore.getState().voiceState !== "INTERRUPTED") {
          return;
        }

        if (!resources.socket?.isConnected) {
          return;
        }

        if (resources.audioPlaying) {
          return;
        }

        startSendingMicrophone();

        useCallStore.getState().setVoiceState("LISTENING");
      }, 300);

      break;
    }

    /* ------------------------------------------------------------
     * TOOL START
     * ------------------------------------------------------------ */

    case "tool.started": {
      const activity: ToolActivity = {
        id: nextId(),

        toolName: msg.tool,

        label: msg.label,

        target: msg.target,

        status: "started",

        timestamp: new Date().toISOString(),
      };

      store.addToolActivity(activity);

      break;
    }

    /* ------------------------------------------------------------
     * TOOL COMPLETED
     * ------------------------------------------------------------ */

    case "tool.completed": {
      const activities = useCallStore.getState().toolActivities;

      const last = [...activities]
        .reverse()
        .find(
          (activity) =>
            activity.toolName === msg.tool && activity.status === "started",
        );

      if (last) {
        store.updateToolActivity(last.id, {
          status: "completed",

          target: msg.target,
        });
      }

      break;
    }

    /* ------------------------------------------------------------
     * SESSION END
     * ------------------------------------------------------------ */

    case "session.end": {
      stopSendingMicrophone();

      resources.audioPlaying = false;

      resources.audioEnded = true;

      if (msg.summary) {
        store.setSummary(msg.summary as never);
      }

      break;
    }

    /* ------------------------------------------------------------
     * ERROR
     * ------------------------------------------------------------ */

    case "error": {
      error("Backend WebSocket error:", msg);

      stopSendingMicrophone();

      resources.audioPlaying = false;

      resources.audioEnded = true;

      store.setError(msg.message || "An error occurred during the call.");

      store.setVoiceState("ERROR");

      break;
    }

    /* ------------------------------------------------------------
     * UNKNOWN
     * ------------------------------------------------------------ */

    default: {
      log("Unhandled WebSocket event:", msg);
    }
  }
}

/* ================================================================
 * HOOK
 * ================================================================ */

export function useVoiceCall() {
  const navigate = useNavigate();

  const mic = useMicrophone();

  const audio = useAudioPlayback();

  /**
   * Keep latest playback controller available
   * to websocket handler.
   */
  audioHandle = audio;

  const micRef = useRef(mic);

  micRef.current = mic;

  const navigateRef = useRef(navigate);

  navigateRef.current = navigate;

  /* ==============================================================
   * START CALL
   * ============================================================== */

  const startVoiceCall = useCallback(async () => {
    log("START VOICE CALL");

    const store = useCallStore.getState();

    if (store.isStarting || store.isCallActive) {
      warn("Call already starting/active");

      return;
    }

    const generation = ++resources.generation;

    const isStale = () => generation !== resources.generation;

    /**
     * Reset audio state.
     */
    resources.audioPlaying = false;

    resources.audioEnded = true;

    resources.audioGeneration = generation;

    stopSendingMicrophone();

    store.setStarting(true);

    store.setError(null);

    /* ======================================================
     * 1. MICROPHONE PERMISSION
     * ====================================================== */

    log("Requesting microphone permission...");

    let micStream: MediaStream | null = null;

    try {
      micStream = await micRef.current.requestAccess();
    } catch (err) {
      error("Microphone permission failed:", err);

      store.setError("Could not access the microphone.");

      store.setVoiceState("ERROR");

      store.setStarting(false);

      return;
    }

    if (!micStream) {
      warn("Microphone permission denied");

      store.setStarting(false);

      return;
    }

    resources.stream = micStream;

    if (isStale()) {
      await teardownCapture();

      store.setStarting(false);

      return;
    }

    /* ======================================================
     * 2. CREATE BACKEND SESSION
     * ====================================================== */

    let session;

    try {
      log("Creating backend call...");

      session = await startCall();

      log("Backend call created:", session);
    } catch (err) {
      error("startCall failed:", err);

      store.setError("Something went wrong while starting the call.");

      store.setVoiceState("ERROR");

      store.setStarting(false);

      await teardownAll();

      return;
    }

    const sessionId: string | undefined =
      session?.data?.sessionId ?? session?.sessionId;

    if (!sessionId) {
      error("No sessionId returned:", session);

      store.setError("The server did not return a valid call session.");

      store.setVoiceState("ERROR");

      store.setStarting(false);

      await teardownAll();

      return;
    }

    if (isStale()) {
      await teardownAll();

      store.setStarting(false);

      return;
    }

    log("Session ID:", sessionId);

    store.setSessionId(sessionId);

    store.setCallActive(true);

    /* ======================================================
     * 3. SOCKET
     * ====================================================== */

    const socket = new VoiceSocket();

    resources.socket = socket;

    socket.onStateChange((state) => {
      log("Socket state:", state);

      useCallStore.getState().setConnectionState(state);
    });

    socket.onMessage(handleWsMessage);

    /* ======================================================
     * 4. CONNECT
     * ====================================================== */

    try {
      await socket.connect(sessionId);

      log("Socket connected", {
        socketId: socket.currentSocketId,

        sessionId: socket.currentSessionId,
      });
    } catch (err) {
      error("Socket connection failed:", err);

      store.setError("Could not connect to the voice service.");

      store.setVoiceState("ERROR");

      store.setStarting(false);

      store.setCallActive(false);

      await teardownAll();

      return;
    }

    if (isStale()) {
      await teardownAll();

      return;
    }

    /* ======================================================
     * 5. AUDIO CAPTURE
     * ====================================================== */

    try {
      log("Initializing audio input...");

      const audioCtx = new AudioContext();

      resources.audioCtx = audioCtx;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(micStream);

      resources.source = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      resources.processor = processor;

      const inputRate = audioCtx.sampleRate;

      processor.onaudioprocess = (event) => {
        /**
         * Final microphone gate.
         */
        if (!resources.micListening) {
          return;
        }

        /**
         * Never send microphone
         * while agent audio plays.
         */
        if (resources.audioPlaying) {
          return;
        }

        if (!socket.isConnected) {
          return;
        }

        if (useCallStore.getState().isMuted) {
          return;
        }

        const channelData = event.inputBuffer.getChannelData(0);

        const encoded = encodeChunk(channelData, inputRate);

        socket.sendAudio(encoded);
      };

      source.connect(processor);

      /**
       * ScriptProcessorNode needs to be
       * connected to keep processing.
       */
      processor.connect(audioCtx.destination);

      /**
       * Start microphone OFF.
       *
       * Backend greeting comes first.
       */
      stopSendingMicrophone();

      log("Audio input initialized", {
        inputRate,

        sendRate: TARGET_SAMPLE_RATE,

        format: "pcm16",
      });
    } catch (err) {
      error("Audio initialization failed:", err);

      store.setError("Could not start microphone capture.");

      store.setVoiceState("ERROR");

      store.setStarting(false);

      store.setCallActive(false);

      await teardownAll();

      return;
    }

    /* ======================================================
     * 6. REQUEST GREETING
     * ====================================================== */

    log("Requesting initial greeting...");

    store.setVoiceState("THINKING");

    socket.startGreeting();

    /* ======================================================
     * 7. NAVIGATE
     * ====================================================== */

    store.setStarting(false);

    navigateRef.current(`/call/${sessionId}`);

    log("VOICE CALL READY");
  }, []);

  /* ==============================================================
   * END CALL
   * ============================================================== */

  const endVoiceCall = useCallback(async () => {
    const store = useCallStore.getState();

    const sessionId = store.sessionId;

    if (!sessionId) {
      warn("Cannot end call: no session ID");

      return;
    }

    log("END VOICE CALL", sessionId);

    store.setEnding(true);

    store.setVoiceState("ENDING");

    /**
     * Invalidate pending playback callbacks.
     */
    ++resources.generation;

    resources.audioPlaying = false;

    resources.audioEnded = true;

    stopSendingMicrophone();

    try {
      audioHandle?.stop();
    } catch (err) {
      warn("Audio stop failed:", err);
    }

    await teardownCapture();

    micRef.current.stop();

    /* ------------------------------------------------------
     * Backend end call
     * ------------------------------------------------------ */

    try {
      const summary = await endCall(sessionId);

      useCallStore.getState().setSummary(summary);
    } catch (err) {
      warn("endCall failed:", err);

      try {
        const summary = await getCallSummary(sessionId);

        useCallStore.getState().setSummary(summary);
      } catch (summaryError) {
        warn("getCallSummary failed:", summaryError);
      }
    }

    /* ------------------------------------------------------
     * Transcript
     * ------------------------------------------------------ */

    try {
      const transcript = await getCallTranscript(sessionId);

      transcript.forEach((message) => {
        useCallStore.getState().addTranscriptMessage(message);
      });
    } catch (err) {
      warn("Transcript fetch failed:", err);
    }

    teardownSocket();

    const finalStore = useCallStore.getState();

    finalStore.setCallActive(false);

    finalStore.setEnding(false);

    finalStore.setVoiceState("COMPLETED");

    navigateRef.current(`/call/${sessionId}/result`);

    log("VOICE CALL ENDED");
  }, []);

  /* ==============================================================
   * MUTE
   * ============================================================== */

  const toggleMute = useCallback(() => {
    const store = useCallStore.getState();

    const next = !store.isMuted;

    log("Mute:", next);

    store.setMuted(next);
  }, []);

  /* ==============================================================
   * NEW CALL
   * ============================================================== */

  const newCall = useCallback(() => {
    log("Starting new call");

    ++resources.generation;

    resources.audioPlaying = false;

    resources.audioEnded = true;

    stopSendingMicrophone();

    void teardownAll();

    micRef.current.stop();

    useCallStore.getState().reset();

    navigateRef.current("/");
  }, []);

  /* ==============================================================
   * MOUNT
   * ============================================================== */

  useEffect(() => {
    log("useVoiceCall MOUNT");

    return () => {
      /**
       * Intentionally not tearing down here because
       * the call may survive route changes.
       */
      log("useVoiceCall UNMOUNT");
    };
  }, []);

  return {
    startVoiceCall,

    endVoiceCall,

    toggleMute,

    newCall,

    micPermission: mic.permission,

    micError: mic.error,

    retryMic: mic.requestAccess,
  };
}
