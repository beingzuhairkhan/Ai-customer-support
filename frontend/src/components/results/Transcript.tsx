import { User, Sparkles } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { formatTimestamp } from '@/utils/formatters';
import type { TranscriptMessage as TMessage } from '@/types/transcript';

export function FullTranscript({
  messages,
}: {
  messages: TMessage[];
}) {
  console.log(
    '[FullTranscript] messages:',
    messages,
  );

  if (!messages || messages.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-base font-semibold text-stone-800 mb-4">
          Full Transcript
        </h3>

        <p className="text-sm text-stone-400 text-center py-6">
          No transcript available for this call.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-stone-800 mb-4">
        Full Transcript
      </h3>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {messages.map((msg, index) => {
          const isAgent = msg.role === 'AGENT';
          const isCustomer = msg.role === 'CUSTOMER';

          console.log(
            `[FullTranscript] ${index}`,
            {
              role: msg.role,
              isAgent,
              isCustomer,
              text: msg.text,
            },
          );

          return (
            <div
              key={`${msg.timestamp}-${index}`}
              className="flex items-start gap-3"
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isAgent
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-600'
                    : 'bg-stone-200'
                }`}
              >
                {isAgent ? (
                  <Sparkles
                    className="text-white"
                    size={16}
                  />
                ) : (
                  <User
                    className="text-stone-600"
                    size={16}
                  />
                )}
              </div>

              {/* Message content */}
              <div className="flex flex-col gap-1 max-w-[85%]">
                {/* Name + timestamp */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-700">
                    {isAgent
                      ? 'Aria'
                      : isCustomer
                        ? 'Customer'
                        : msg.role}
                  </span>

                  {msg.timestamp && (
                    <span className="text-[10px] text-stone-400">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isAgent
                      ? 'bg-emerald-50 text-stone-800 rounded-tl-sm'
                      : 'bg-stone-100 text-stone-800 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
