# Aura Skincare — AI Voice Customer Support Agent (Frontend)

A production-quality React frontend for the **DataStraw AI Voice Customer Support Agent** assessment, built for the fictional D2C skincare brand **Aura Skincare**. The frontend communicates only with the NestJS backend via REST APIs and WebSocket — it never calls Sarvam, Groq, or any LLM/STT/TTS provider directly.

## Project Overview

The application lets evaluators:

1. Open the app and immediately understand it's Aura Skincare's AI support agent.
2. See the three sample test orders (ORD-101, ORD-102, ORD-103) with full details.
3. Click **Start Call**, allow microphone access, and speak naturally with **Aria**.
4. See clear **Listening / Thinking / Speaking** states with a voice orb and animations.
5. Hear Aria's responses and see live transcript + tool activity.
6. Click **End Call** and view the complete transcript + structured JSON outcome.

## Technology Stack

- **React 18** + **TypeScript**
- **Vite** — build tooling
- **Tailwind CSS** — styling
- **React Router** — routing
- **Zustand** — lightweight state management
- **Axios** — REST API client
- **Native WebSocket** — realtime voice communication
- **Web Audio API** — microphone capture & audio playback
- **Lucide React** — icons

## Local Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/voice
```

- `VITE_API_BASE_URL` — Base URL of the NestJS backend REST API.
- `VITE_WS_URL` — WebSocket endpoint for voice streaming.

**Never** put API keys (Groq, Sarvam, LLM, STT, TTS, database credentials) in the frontend. The frontend only uses public URLs.

## Backend Connection Setup

The backend (NestJS) must expose:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/calls/start` | Start a new call session, returns `{ sessionId }` |
| POST | `/calls/:sessionId/end` | End a call, returns call summary |
| GET | `/calls/:sessionId` | Get call session info |
| GET | `/calls/:sessionId/transcript` | Get full transcript |
| GET | `/calls/:sessionId/summary` | Get call summary/outcome |

WebSocket events (sent/received):

- `session.start`, `session.end`
- `audio.input`, `audio.end`
- `transcript.partial`, `transcript.final`
- `agent.thinking`, `agent.speaking`, `agent.interrupted`, `agent.audio`
- `tool.started`, `tool.completed`
- `error`

## Architecture Overview

```
src/
├── app/           # App shell, routing
├── components/    # UI components (voice, orders, conversation, results, common, layout)
├── pages/         # HomePage, CallPage, CallResultPage
├── services/      # API + WebSocket clients
├── store/         # Zustand call store
├── hooks/         # useVoiceCall, useMicrophone, useAudioPlayback, useCallTimer
├── types/         # TypeScript type definitions
├── utils/         # Audio + formatting helpers
└── config/        # Environment config
```

**Key design decisions:**
- State is centralized in Zustand (`callStore`) — components subscribe to slices they need.
- All API calls go through the `services/` layer, never scattered in components.
- WebSocket is managed by the `VoiceSocket` class with reconnection logic.
- Microphone capture uses Web Audio API with `ScriptProcessorNode` for streaming.
- Audio playback uses `AudioContext.decodeAudioData` with a queue for sequential playback.
- Barge-in (interruption) stops audio playback and returns to LISTENING.

## Voice Browser Permission Requirements

- The browser must support `getUserMedia` (Chrome, Firefox, Safari, Edge).
- The user must grant microphone permission when prompted.
- The app must be served over HTTPS (or localhost) for microphone access.
- `AudioContext` requires a user gesture to start (the Start Call button satisfies this).

## How to Test

1. **Start the application** — `npm run dev` (runs automatically).
2. **Click "Start Call"** on the home page.
3. **Allow microphone** access when the browser prompts.
4. **Ask about ORD-101** — e.g., "Where is my order ORD-101?"
   - Watch: Listening → Thinking → Tool Activity → Speaking
5. **Ask a policy question** — e.g., "Can I cancel ORD-103?" or "What is your return policy?"
6. **Click "End Call"** when done.
7. **Review** the transcript and structured outcome JSON on the result page.
8. **Click "Start New Call"** to test again without refreshing.

### Test Orders

| Order ID | Customer | Product | Value | Status |
|----------|----------|---------|-------|--------|
| ORD-101 | Priya Sharma | Vitamin C Serum (30ml) | ₹699 | Out for Delivery |
| ORD-102 | Rahul Verma | Hydrating Sunscreen SPF 50 | ₹499 | Delivered |
| ORD-103 | Ananya Patel | Green Tea Face Wash + Toner | ₹850 | Processing |

### Demo Scenarios

1. **Order Tracking**: "Where is my order ORD-101?"
2. **Cancellation**: "Can I cancel ORD-103?"
3. **Ineligible Cancellation**: "Can I cancel ORD-101?"
4. **Invalid Order**: "Where is ORD-999?"
5. **Policy**: "What is your return policy?"
6. **Out of Scope**: "Can you book me a flight to Goa?"
7. **End Call**: Click End Call and verify transcript + JSON outcome.

## Deployment

```bash
npm run build
```

The `dist/` folder contains static assets that can be deployed to any static hosting service (Vercel, Netlify, Cloudflare Pages, etc.).

Set environment variables on the hosting platform:
- `VITE_API_BASE_URL` — production backend URL
- `VITE_WS_URL` — production WebSocket URL
