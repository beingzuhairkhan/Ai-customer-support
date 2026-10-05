const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000/voice',
} as const;

export default env;
