import { useEffect, useRef } from 'react';
import { MessageSquare, Wrench } from 'lucide-react';
import { TranscriptMessageItem } from './TranscriptMessage';
import { ToolActivityItem } from './ToolActivity';
import { useCallStore } from '@/store/callStore';

export function LiveTranscript() {
  const transcript = useCallStore((s) => s.transcript);
  const partial = useCallStore((s) => s.partialTranscript);
  const toolActivities = useCallStore((s) => s.toolActivities);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      isAutoScrollRef.current = atBottom;
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isAutoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript, partial, toolActivities]);

  const isEmpty = transcript.length === 0 && !partial && toolActivities.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200">
        <MessageSquare size={16} className="text-stone-600" />
        <h3 className="text-sm font-semibold text-stone-800">Live Conversation</h3>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ minHeight: '200px' }}
      >
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare size={24} className="text-stone-300 mb-2" />
            <p className="text-sm text-stone-400">Your conversation will appear here.</p>
          </div>
        )}

        {toolActivities.map((activity) => (
          <ToolActivityItem key={activity.id} activity={activity} />
        ))}

        {transcript.map((msg) => (
          <TranscriptMessageItem key={msg.id} message={msg} />
        ))}

        {partial && <TranscriptMessageItem message={partial} />}
      </div>
    </div>
  );
}
