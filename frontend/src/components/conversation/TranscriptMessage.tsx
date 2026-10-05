import { User, Sparkles } from 'lucide-react';
import type { TranscriptMessage as TMessage } from '@/types/transcript';
import { formatTimestamp } from '@/utils/formatters';

export function TranscriptMessageItem({ message }: { message: TMessage }) {
  const isAgent = message.speaker === 'agent';

  return (
    <div
      className={`flex gap-2.5 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}
    >
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isAgent
            ? 'bg-gradient-to-br from-emerald-400 to-teal-600'
            : 'bg-stone-200'
        }`}
      >
        {isAgent ? (
          <Sparkles className="text-white" size={14} />
        ) : (
          <User className="text-stone-600" size={14} />
        )}
      </div>

      <div className={`flex flex-col gap-0.5 max-w-[80%] ${isAgent ? 'items-start' : 'items-end'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-600">
            {isAgent ? 'Aria' : 'Customer'}
          </span>
          {message.timestamp && (
            <span className="text-[10px] text-stone-400">
              {formatTimestamp(message.timestamp)}
            </span>
          )}
          {!message.isFinal && (
            <span className="text-[10px] text-stone-400 italic">typing...</span>
          )}
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm ${
            isAgent
              ? 'bg-emerald-50 text-stone-800 rounded-tl-sm'
              : 'bg-stone-100 text-stone-800 rounded-tr-sm'
          } ${!message.isFinal ? 'opacity-70' : ''}`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}
