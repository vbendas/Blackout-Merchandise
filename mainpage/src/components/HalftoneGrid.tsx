'use client';

import { useCallback, useEffect, useRef } from 'react';

const DOT_RADIUS = 1.2;
const SPACING = 34;
const WAVE_RADIUS = 320;
const BASE_OPACITY = 0.18;
const CURSOR_BOOST = 0.35;
const HIGHLIGHT_SCALE = 2.2;
const WAVE_SPEED = 0.0018;
const LERP_SPEED = 0.04;
const FADE_IN_DURATION = 2500;

export function HalftoneGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, smoothX: 0.5, smoothY: 0.5 });
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = (e.clientX - rect.left) / rect.width;
    mouseRef.current.y = (e.clientY - rect.top) / rect.height;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.x = 0.5;
    mouseRef.current.y = 0.5;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const mouse = mouseRef.current;
      mouse.smoothX += (mouse.x - mouse.smoothX) * LERP_SPEED;
      mouse.smoothY += (mouse.y - mouse.smoothY) * LERP_SPEED;

      const mxPx = mouse.smoothX * w;
      const myPx = mouse.smoothY * h;

      const now = Date.now();
      const fadeIn = Math.min(1, (now - startTimeRef.current) / FADE_IN_DURATION);

      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;
      const offsetX = (w - (cols - 1) * SPACING) / 2;
      const offsetY = (h - (rows - 1) * SPACING) / 2;
      const centerCol = cols / 2;
      const centerRow = rows / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const px = offsetX + col * SPACING;
          const py = offsetY + row * SPACING;

          const dx = px - mxPx;
          const dy = py - myPx;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const distFromCenter = Math.sqrt(
            (col - centerCol) ** 2 + (row - centerRow) ** 2,
          );

          const wave = Math.sin(now * WAVE_SPEED + distFromCenter * 0.35) * 0.5 + 0.5;

          const proximity = Math.max(0, 1 - dist / WAVE_RADIUS);
          const cursorInfluence = proximity * proximity * CURSOR_BOOST;

          const opacity = (BASE_OPACITY * wave + cursorInfluence) * fadeIn;
          const radius = DOT_RADIUS * (1 + (proximity * proximity) * (HIGHLIGHT_SCALE - 1));

          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(192, 192, 210, ${opacity})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: 'auto' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
