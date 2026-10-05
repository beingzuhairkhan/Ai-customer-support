import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CallsController } from 'src/calls/calls.controller';
import { CallsService } from 'src/calls/calls.service';
import { TranscriptService } from 'src/calls/transcript.service';
import { VoiceService } from 'src/voice/voice.service';

describe('CallsController (integration)', () => {
  let app: INestApplication;
  let voiceService: Partial<VoiceService>;
  let callsService: Partial<CallsService>;
  let transcriptService: Partial<TranscriptService>;

  beforeAll(async () => {
    voiceService = {
      startSession: jest.fn().mockResolvedValue({ sessionId: 'sess_test_001', status: 'ACTIVE' }),
      endSession: jest.fn(),
    };
    callsService = {
      getSummary: jest.fn(),
      getCall: jest.fn(),
    };
    transcriptService = {
      getTranscript: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CallsController],
      providers: [
        { provide: VoiceService, useValue: voiceService },
        { provide: CallsService, useValue: callsService },
        { provide: TranscriptService, useValue: transcriptService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/calls/start', () => {
    it('should create a session and return ACTIVE', async () => {
      const res = await request(app.getHttpServer()).post('/api/calls/start');
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });

  describe('POST /api/calls/:sessionId/end', () => {
    it('should end call and return summary', async () => {
      (voiceService.endSession as jest.Mock).mockResolvedValue({
        sessionId: 'sess_test_001',
        status: 'COMPLETED',
        summary: {
          customer_intent: 'ORDER_TRACKING',
          order_id: 'ORD-101',
          resolution_status: 'RESOLVED',
          call_summary: 'Customer asked about ORD-101 delivery.',
          actions_taken: [],
          policies_referenced: [],
          language: 'en',
          duration_seconds: 120,
        },
      });

      const res = await request(app.getHttpServer()).post('/api/calls/sess_test_001/end');
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.customer_intent).toBe('ORDER_TRACKING');
    });
  });

  describe('GET /api/calls/:sessionId/transcript', () => {
    it('should return transcript', async () => {
      (transcriptService.getTranscript as jest.Mock).mockResolvedValue({
        sessionId: 'sess_test_001',
        messages: [
          { role: 'CUSTOMER', text: 'Where is my order?', timestamp: new Date().toISOString() },
          { role: 'AGENT', text: 'Could you provide your order ID?', timestamp: new Date().toISOString() },
        ],
      });

      const res = await request(app.getHttpServer()).get('/api/calls/sess_test_001/transcript');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toHaveLength(2);
    });
  });

  describe('GET /api/calls/:sessionId/summary', () => {
    it('should return summary', async () => {
      (callsService.getSummary as jest.Mock).mockResolvedValue({
        customer_intent: 'ORDER_TRACKING',
        order_id: 'ORD-101',
        resolution_status: 'RESOLVED',
        call_summary: 'Customer asked about ORD-101.',
        actions_taken: [],
        policies_referenced: [],
        language: 'en',
        duration_seconds: 60,
      });

      const res = await request(app.getHttpServer()).get('/api/calls/sess_test_001/summary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer_intent).toBe('ORDER_TRACKING');
    });
  });
});
