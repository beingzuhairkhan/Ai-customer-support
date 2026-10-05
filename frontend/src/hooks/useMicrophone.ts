import { useCallback, useRef, useState } from "react";

export type MicPermission = "prompt" | "granted" | "denied" | "unsupported";


export function useMicrophone() {
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permission, setPermission] = useState<MicPermission>("prompt");
  const [error, setError] = useState<string | null>(null);

  const requestAccess = useCallback(async (): Promise<MediaStream | null> => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
      setError("This browser does not support microphone access.");
      return null;
    }

    // Reuse a live stream if we already have one.
    const existing = streamRef.current;
    if (existing && existing.getAudioTracks().some((t) => t.readyState === "live")) {
      return existing;
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = s;
      setStream(s);
      setPermission("granted");

      return s;
    } catch (err) {
      setPermission("denied");
      setError(
        err instanceof Error ? err.message : "Microphone permission denied.",
      );
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  return {
    stream,
    permission,
    error,
    requestAccess,
    stop,
  };
}