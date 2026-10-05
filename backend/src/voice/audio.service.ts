import { Injectable, Logger } from "@nestjs/common";

export interface AudioInspection {
  bytes: number;
  headerHex: string;
  headerAscii: string;
  format: "wav" | "webm" | "ogg" | "mp3" | "raw-or-unknown";

  estimatedPcm16DurationMs: number;
}

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  private readonly MIN_AUDIO_LENGTH = 100;

  inspect(audio: Buffer): AudioInspection {
    const head = audio.subarray(0, 12);

    const headerHex = head.toString("hex");

    const headerAscii = head.toString("ascii").replace(/[^\x20-\x7e]/g, ".");

    let format: AudioInspection["format"] = "raw-or-unknown";

    if (head.subarray(0, 4).toString("ascii") === "RIFF") {
      format = "wav";
    } else if (headerHex.startsWith("1a45dfa3")) {
      format = "webm";
    } else if (head.subarray(0, 4).toString("ascii") === "OggS") {
      format = "ogg";
    } else if (
      head.subarray(0, 3).toString("ascii") === "ID3" ||
      (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)
    ) {
      format = "mp3";
    }

    const estimatedPcm16DurationMs = Math.round((audio.length / 32000) * 1000);

    return {
      bytes: audio.length,
      headerHex,
      headerAscii,
      format,
      estimatedPcm16DurationMs,
    };
  }

  validateAudio(audio: Buffer): {
    valid: boolean;
    reason?: string;
  } {
    if (!audio || audio.length === 0) {
      this.logger.warn("Audio is empty");

      return {
        valid: false,
        reason: "Audio is empty",
      };
    }

    if (audio.length < this.MIN_AUDIO_LENGTH) {
      this.logger.warn(`Audio too short: ${audio.length}`);

      return {
        valid: false,
        reason: "Audio is too short",
      };
    }

    return {
      valid: true,
    };
  }

  pcm16ToWav(pcm: Buffer, sampleRate = 16000, channels = 1): Buffer {
    const bitsPerSample = 16;

    const byteRate = (sampleRate * channels * bitsPerSample) / 8;

    const blockAlign = (channels * bitsPerSample) / 8;

    const header = Buffer.alloc(44);

    header.write("RIFF", 0, "ascii");

    header.writeUInt32LE(36 + pcm.length, 4);

    header.write("WAVE", 8, "ascii");

    header.write("fmt ", 12, "ascii");

    header.writeUInt32LE(16, 16);

    header.writeUInt16LE(1, 20);

    header.writeUInt16LE(channels, 22);

    header.writeUInt32LE(sampleRate, 24);

    header.writeUInt32LE(byteRate, 28);

    header.writeUInt16LE(blockAlign, 32);

    header.writeUInt16LE(bitsPerSample, 34);

    header.write("data", 36, "ascii");

    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
  }

  encodeToBase64(audio: Buffer): string {
    return audio.toString("base64");
  }

  decodeFromBase64(b64: string): Buffer {
    return Buffer.from(b64, "base64");
  }
}
