'use client';

import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  isPlaying?: boolean;
}

export function AudioWaveform({ isRecording, isPlaying = false }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 20;
    const barWidth = canvas.width / (bars * 2);
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isRecording && !isPlaying) {
        ctx.fillStyle = '#52525b';
        for (let i = 0; i < bars; i++) {
          const x = i * barWidth * 2 + barWidth / 2;
          const height = 4;
          const y = (canvas.height - height) / 2;
          ctx.fillRect(x, y, barWidth, height);
        }
        return;
      }

      ctx.fillStyle = isRecording ? '#e11d48' : '#22c55e';
      
      for (let i = 0; i < bars; i++) {
        const x = i * barWidth * 2 + barWidth / 2;
        
        const amplitude = isRecording ? 0.8 : 0.5;
        const frequency = 0.1;
        const height = Math.sin(phase + i * frequency) * canvas.height * amplitude + canvas.height * 0.3;
        
        const y = (canvas.height - height) / 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 4);
        ctx.fill();
      }

      phase += 0.1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className="w-full h-16"
    />
  );
}
