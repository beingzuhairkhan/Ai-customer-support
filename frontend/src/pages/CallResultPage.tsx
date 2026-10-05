import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCallStore } from '@/store/callStore';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import {
  getCallSummary,
  getCallTranscript,
} from '@/services/callApi';

import { Card } from '@/components/common/Card';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';

import { CallSummaryCard } from '@/components/results/CallSummary';
import { FullTranscript } from '@/components/results/Transcript';
import { StructuredOutcome } from '@/components/results/StructuredOutcome';
import { ResultActions } from '@/components/results/ResultActions';

import type { CallSummary } from '@/types/call';
import type { TranscriptMessage } from '@/types/transcript';

type StructuredOutcomeData = {
  customer_intent: string;
  order_id?: string;
  resolution_status: string;
  call_summary: string;
  actions_taken?: string[];
  policies_referenced?: string[];
  language?: string;
  duration_seconds?: number;
};

type SummaryApiResponse = {
  success: boolean;
  data: StructuredOutcomeData;
};

function normalizeSummary(
  response: SummaryApiResponse,
): CallSummary {
  const data = response.data;

  return {
    customerIntent: data.customer_intent,
    orderId: data.order_id,
    resolutionStatus: data.resolution_status,
    summary: data.call_summary,
    duration: data.duration_seconds,

    outcome: {
      customer_intent: data.customer_intent,
      order_id: data.order_id,
      resolution_status: data.resolution_status,
      call_summary: data.call_summary,
      actions_taken: data.actions_taken ?? [],
      policies_referenced:
        data.policies_referenced ?? [],
      language: data.language,
      duration_seconds: data.duration_seconds,
    },
  };
}

export function CallResultPage() {
  const { sessionId } = useParams<{
    sessionId: string;
  }>();

  const store = useCallStore();
  const { newCall } = useVoiceCall();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] =
    useState<CallSummary | null>(null);

  const [transcript, setTranscript] =
    useState<TranscriptMessage[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, transcriptResponse] =
          await Promise.all([
            getCallSummary(sessionId),
            getCallTranscript(sessionId),
          ]);

        if (summaryResponse?.success && summaryResponse.data) {
          const normalizedSummary =
            normalizeSummary(summaryResponse);

          setSummary(normalizedSummary);
        } else {
          setError(
            'Call summary is being prepared...',
          );
        }
        
       const transcriptMessages =
  transcriptResponse?.data?.messages ?? [];

console.log(
  '[CallResultPage] transcriptMessages:',
  transcriptMessages,
);

setTranscript(transcriptMessages);
      } catch {
        if (store.summary) {
          setSummary(store.summary);
          setTranscript(store.transcript ?? []);
        } else {
          setError(
            'Could not load call results. Please try again.',
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Card className="p-8">
          <LoadingState message="Loading call results..." />
        </Card>
      </div>
    );
  }

  const displaySummary =
    summary || store.summary;

  const displayTranscript =
    transcript.length > 0
      ? transcript
      : store.transcript ?? [];

  if (error && !displaySummary) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Card>
          <ErrorState
            message={error}
            onRetry={() =>
              window.location.reload()
            }
            retryLabel="Reload"
          />
        </Card>
      </div>
    );
  }

  const outcome = displaySummary?.outcome
    ? {
        customer_intent:
          displaySummary.outcome.customer_intent,

        order_id:
          displaySummary.outcome.order_id,

        resolution_status:
          displaySummary.outcome.resolution_status,

        call_summary:
          displaySummary.outcome.call_summary,
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-800 mb-1">
          Call Results
        </h2>

        <p className="text-sm text-stone-500">
          Session {sessionId?.slice(0, 12)}
        </p>
      </div>

      {displaySummary && (
        <div className="space-y-6">
          <CallSummaryCard
            summary={displaySummary}
          />

          {outcome && (
            <StructuredOutcome
              outcome={outcome}
            />
          )}

          <FullTranscript
            messages={displayTranscript}
          />

          <div className="pt-2">
            <ResultActions
              transcript={displayTranscript}
              onNewCall={newCall}
            />
          </div>
        </div>
      )}

      {!displaySummary && !error && (
        <Card className="p-8">
          <LoadingState
            message="Call summary is being prepared..."
          />
        </Card>
      )}
    </div>
  );
}
