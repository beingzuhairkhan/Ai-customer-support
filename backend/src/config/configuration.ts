export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV || "development",

  port: parseInt(process.env.PORT || "5000", 10),

  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/aura_voice_agent",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  sarvam: {
    apiKey: process.env.SARVAM_API_KEY || "",

    sttModel:
      process.env.SARVAM_STT_MODEL ||
      "saaras:v3",

    ttsModel:
      process.env.SARVAM_TTS_MODEL ||
      "bulbul:v3",

    baseUrl:
      process.env.SARVAM_BASE_URL ||
      "https://api.sarvam.ai",
  },

  llm: {
    provider:
      process.env.LLM_PROVIDER ||
      "openai",

    apiKey:
      process.env.LLM_API_KEY ||
      "",

    model:
      process.env.LLM_MODEL ||
      "gpt-4o-mini",

    baseUrl:
      process.env.LLM_BASE_URL ||
      "https://api.openai.com/v1",

    fallbackProvider:
      process.env.LLM_FALLBACK_PROVIDER ||
      "",

    fallbackApiKey:
      process.env.LLM_FALLBACK_API_KEY ||
      "",

    fallbackModel:
      process.env.LLM_FALLBACK_MODEL ||
      "",

    fallbackBaseUrl:
      process.env.LLM_FALLBACK_BASE_URL ||
      "",
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "change-me",
  },

  cors: {
    origin:
      process.env.CORS_ORIGIN ||
      "*",
  },

  log: {
    level:
      process.env.LOG_LEVEL ||
      "info",
  },

  ai: {
    timeoutMs: parseInt(
      process.env.AI_TIMEOUT_MS || "15000",
      10,
    ),

    maxRetries: parseInt(
      process.env.AI_MAX_RETRIES || "2",
      10,
    ),
  },

  rateLimit: {
    ttl: parseInt(
      process.env.RATE_LIMIT_TTL || "60",
      10,
    ),

    limit: parseInt(
      process.env.RATE_LIMIT_LIMIT || "60",
      10,
    ),
  },

  circuitBreaker: {
    threshold: parseInt(
      process.env.CIRCUIT_BREAKER_THRESHOLD || "5",
      10,
    ),

    cooldownMs: parseInt(
      process.env.CIRCUIT_BREAKER_COOLDOWN_MS || "30000",
      10,
    ),
  },

  jobs: {
    summaryConcurrency: parseInt(
      process.env.SUMMARY_QUEUE_CONCURRENCY || "2",
      10,
    ),

    cleanupConcurrency: parseInt(
      process.env.CLEANUP_QUEUE_CONCURRENCY || "1",
      10,
    ),
  },

  session: {
    ttlSeconds: parseInt(
      process.env.SESSION_TTL_SECONDS || "1800",
      10,
    ),
  },
});
