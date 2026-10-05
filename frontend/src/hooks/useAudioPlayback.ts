import { useCallback, useRef } from "react";

type PlaybackFormat = "wav" | "mp3" | "ogg" | "webm" | string;

type PlaybackFinishedCallback = () => void;

function log(...args: unknown[]): void {
  console.log("[useAudioPlayback]", ...args);
}

function warn(...args: unknown[]): void {
  console.warn("[useAudioPlayback]", ...args);
}

function getMimeType(format: PlaybackFormat): string {
  switch (format.toLowerCase()) {
    case "wav":
      return "audio/wav";

    case "mp3":
      return "audio/mpeg";

    case "ogg":
      return "audio/ogg";

    case "webm":
      return "audio/webm";

    default:
      return "audio/wav";
  }
}

function base64ToBlob(
  base64: string,
  format: PlaybackFormat,
): Blob {
  const binary = atob(base64);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], {
    type: getMimeType(format),
  });
}

export function useAudioPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanupCurrent = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;

      try {
        audio.pause();
      } catch {
        // ignore
      }

      audio.removeAttribute("src");

      try {
        audio.load();
      } catch {
        // ignore
      }
    }

    audioRef.current = null;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    log("Stopping audio");

    cleanupCurrent();
  }, [cleanupCurrent]);

  const play = useCallback(
    async (
      base64Audio: string,
      format: PlaybackFormat = "wav",
      onFinished?: PlaybackFinishedCallback,
    ) => {
      if (!base64Audio) {
        warn("play() received empty audio");

        onFinished?.();

        return;
      }

      /*
       * Stop anything currently playing.
       */
      cleanupCurrent();

      const audio = new Audio();

      const blob = base64ToBlob(
        base64Audio,
        format,
      );

      const objectUrl = URL.createObjectURL(blob);

      audioRef.current = audio;
      objectUrlRef.current = objectUrl;

      audio.preload = "auto";
      audio.src = objectUrl;

      let finished = false;

      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;

        log("Playback FINISHED");

        if (audioRef.current === audio) {
          audioRef.current = null;
        }

        if (objectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);

          objectUrlRef.current = null;
        }

        audio.onended = null;
        audio.onerror = null;

        onFinished?.();
      };

      /*
       * This is the important event.
       *
       * It fires only after the browser has actually
       * reached the end of the audio.
       */
      audio.onended = finish;

      /*
       * Do not leave the backend stuck if playback fails.
       */
      audio.onerror = (event) => {
        warn("Audio playback error:", event);

        finish();
      };

      try {
        await audio.play();

        log("Playback STARTED", {
          duration: audio.duration,
          format,
        });
      } catch (err) {
        warn("audio.play() failed:", err);

        finish();
      }
    },
    [cleanupCurrent],
  );

  return {
    play,
    stop,
  };
}
