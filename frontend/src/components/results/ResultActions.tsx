import { Copy, Check, Phone, Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/common/Button';
import type { TranscriptMessage } from '@/types/transcript';

export function ResultActions({
  transcript,
  onNewCall,
}: {
  transcript: TranscriptMessage[];
  onNewCall: () => void;
}) {
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const copyTranscript = () => {
    const text = transcript
      .map(
        (m) =>
          `${m.speaker === 'agent' ? 'Aria' : 'Customer'}: ${m.text}`
      )
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    });
  };

  const downloadTranscript = () => {
    const text = transcript
      .map(
        (m) =>
          `[${m.timestamp}] ${m.speaker === 'agent' ? 'Aria' : 'Customer'}: ${m.text}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" onClick={copyTranscript}>
        {copiedTranscript ? <Check size={16} /> : <Copy size={16} />}
        {copiedTranscript ? 'Copied!' : 'Copy Transcript'}
      </Button>

      <Button variant="outline" size="sm" onClick={downloadTranscript}>
        <Download size={16} />
        Download Transcript
      </Button>

      <Button variant="primary" size="sm" onClick={onNewCall}>
        <Phone size={16} />
        Start New Call
      </Button>
    </div>
  );
}
