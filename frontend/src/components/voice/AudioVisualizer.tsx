import { useEffect, useRef } from 'react';
import type { VoiceState } from '@/types/call';

export function AudioVisualizer({
  state,
  stream,
}: {
  state: VoiceState;
  stream: MediaStream | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      if (!analyser || state !== 'LISTENING') {
        // Draw idle bars
        const barCount = 32;
        const barWidth = width / barCount - 2;
        for (let i = 0; i < barCount; i++) {
          const barHeight = 4;
          const x = i * (barWidth + 2);
          ctx.fillStyle = '#d6d3d1';
          ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
        }
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barCount = 32;
      const barWidth = width / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * 2] || 0;
        const barHeight = (value / 255) * height * 0.8 + 2;
        const x = i * (barWidth + 2);
        const y = height / 2 - barHeight / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#14b8a6');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    if (stream && state === 'LISTENING' && !ctxRef.current) {
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        ctxRef.current = audioCtx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      } catch {
        // ignore
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [state, stream]);

  useEffect(() => {
    return () => {
      if (sourceRef.current) sourceRef.current.disconnect();
      if (ctxRef.current) ctxRef.current.close();
      ctxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={48}
      className="w-full h-12 rounded-lg bg-stone-50"
    />
  );
}
