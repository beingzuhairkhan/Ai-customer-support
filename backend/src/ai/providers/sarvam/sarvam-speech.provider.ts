import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  STTProvider,
  TTSProvider,
  STTOptions,
  TTSOptions,
} from "../../interfaces";

import { STTResult, TTSResult } from "src/common/interfaces";
import { Language } from "src/common/enums";
import { isHinglish } from "src/common/utils";

@Injectable()
export class SarvamSpeechProvider implements STTProvider, TTSProvider {
  private readonly logger = new Logger(SarvamSpeechProvider.name);

  readonly name = "sarvam";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sttModel: string;

  private readonly ttsModel = "bulbul:v3";
  private readonly ttsLanguage = "en-IN";
  private readonly ttsSpeaker = "ritu";
  private readonly ttsPace = 1;
  private readonly ttsSampleRate = 22050;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>("sarvam.apiKey")?.trim() || "";

    this.baseUrl =
      this.configService.get<string>("sarvam.baseUrl")?.replace(/\/+$/, "") ||
      "https://api.sarvam.ai";

    this.sttModel =
      this.configService.get<string>("sarvam.sttModel") || "saaras:v3";

    this.logger.log(
      `[INIT] STT model=${this.sttModel} | ` +
        `TTS model=${this.ttsModel} | ` +
        `language=${this.ttsLanguage} | ` +
        `speaker=${this.ttsSpeaker} | ` +
        `pace=${this.ttsPace} | ` +
        `sampleRate=${this.ttsSampleRate}`,
    );
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }


  async transcribe(
    audio: Buffer,
    options?: STTOptions,
  ): Promise<STTResult> {
    if (!this.isConfigured()) {
      throw new Error("Sarvam API key not configured");
    }

    if (!audio?.length) {
      throw new Error("Cannot transcribe empty audio");
    }

    const formData = new FormData();
    const audioArrayBuffer = new ArrayBuffer(audio.byteLength);

    new Uint8Array(audioArrayBuffer).set(
      new Uint8Array(
        audio.buffer,
        audio.byteOffset,
        audio.byteLength,
      ),
    );

    formData.append(
      "file",
      new Blob([audioArrayBuffer], {
        type: "audio/wav",
      }),
      "audio.wav",
    );

    const model = options?.model || this.sttModel;

    formData.append("model", model);

    const languageCode = this.toSarvamLanguage(options?.language);

    if (languageCode) {
      formData.append("language_code", languageCode);
    }

    const response = await fetch(
      `${this.baseUrl}/speech-to-text`,
      {
        method: "POST",
        headers: {
          "api-subscription-key": this.apiKey,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errText = await response.text();

      this.logger.error(
        `[STT] Sarvam failed ` +
          `status=${response.status} ` +
          `body=${errText}`,
      );

      throw new Error(
        `Sarvam STT failed: ${response.status} ${errText}`,
      );
    }

    const data = (await response.json()) as {
      transcript?: string;
      confidence_score?: number;
      language_code?: string;
    };

    const text = data.transcript?.trim() || "";

    const detectedLanguage = this.detectLanguage(text);

    return {
      text,
      confidence: data.confidence_score ?? 0.9,
      language: detectedLanguage,
    };
  }


  async synthesize(
    text: string,
    _options?: TTSOptions,
  ): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new Error("Sarvam API key not configured");
    }

    const cleanText = text?.trim();

    if (!cleanText) {
      throw new Error("Cannot synthesize empty text");
    }


    const body = {
      inputs: [cleanText],

      target_language_code: this.ttsLanguage,

      speaker: this.ttsSpeaker,

      model: this.ttsModel,

      pace: this.ttsPace,

      speech_sample_rate: this.ttsSampleRate,
    };

    const response = await fetch(
      `${this.baseUrl}/text-to-speech`,
      {
        method: "POST",
        headers: {
          "api-subscription-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      this.logger.error(
        `[TTS] Sarvam failed ` +
          `status=${response.status} ` +
          `model=${this.ttsModel} ` +
          `language=${this.ttsLanguage} ` +
          `speaker=${this.ttsSpeaker} ` +
          `body=${responseText}`,
      );

      throw new Error(
        `Sarvam TTS failed: ${response.status} ${responseText}`,
      );
    }

    let data: {
      audios?: string[];
    };

    try {
      data = JSON.parse(responseText) as {
        audios?: string[];
      };
    } catch {
      throw new Error("Sarvam TTS returned invalid JSON");
    }

    const audioBase64 = data.audios?.[0]?.trim() || "";

    if (!audioBase64) {
      this.logger.error(
        `[TTS] Sarvam returned no audio`,
      );

      throw new Error("Sarvam TTS returned no audio");
    }

    let audioBuffer: Buffer;

    try {
      audioBuffer = Buffer.from(audioBase64, "base64");
    } catch (err) {
      throw new Error(
        "Sarvam TTS returned invalid audio data",
      );
    }

    if (!audioBuffer.length) {
      throw new Error(
        "Sarvam TTS returned empty audio buffer",
      );
    }
    return {
      audio: audioBuffer,
      format: "wav",
    };
  }


  detectLanguage(text: string): string {
    const cleanText = text?.trim() || "";

    if (!cleanText) {
      return Language.ENGLISH;
    }

    if (isHinglish(cleanText)) {
      return Language.HINGLISH;
    }


    if (/[\u0900-\u097F]/.test(cleanText)) {
      return Language.HINDI;
    }

    return Language.ENGLISH;
  }


  private toSarvamLanguage(
    language?: string | null,
  ): string | undefined {
    if (!language) {
      return undefined;
    }

    const value = String(language)
      .trim()
      .toLowerCase();

    if (!value) {
      return undefined;
    }

    switch (value) {
      case "en":
      case "eng":
      case "english":
      case "en-us":
      case "en-gb":
      case "en-in":
        return "en-IN";

      case "hi":
      case "hin":
      case "hindi":
      case "hi-in":
      case "hinglish":
      case "hinglish-in":
        return "hi-IN";

      case "bn":
      case "bengali":
      case "bangla":
      case "bn-in":
        return "bn-IN";

      case "gu":
      case "gujarati":
      case "gu-in":
        return "gu-IN";

      case "kn":
      case "kannada":
      case "kn-in":
        return "kn-IN";

      case "mr":
      case "marathi":
      case "mr-in":
        return "mr-IN";

      case "ml":
      case "malayalam":
      case "ml-in":
        return "ml-IN";

      case "ta":
      case "tamil":
      case "ta-in":
        return "ta-IN";

      case "te":
      case "telugu":
      case "te-in":
        return "te-IN";

      case "pa":
      case "punjabi":
      case "pa-in":
        return "pa-IN";

      case "od":
      case "odia":
      case "oriya":
      case "od-in":
        return "od-IN";

      case "as":
      case "assamese":
      case "as-in":
        return "as-IN";

      case "ne":
      case "nepali":
      case "ne-in":
        return "ne-IN";

      case "ur":
      case "urdu":
      case "ur-in":
        return "ur-IN";

      case "unknown":
      case "auto":
      case "automatic":
      case "null":
      case "undefined":
        return undefined;

      default:
        this.logger.warn(
          `[STT] Unsupported language "${language}". Using auto detection.`,
        );

        return undefined;
    }
  }
}
