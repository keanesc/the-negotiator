"use client";

import { useRef, useEffect } from "react";

// ============================================================
// Waveform Overlay — real-time frequency bars on the CCTV monitor
// Green phosphor aesthetic, shows both negotiator and suspect activity
// ============================================================

interface WaveformOverlayProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSuspectSpeaking: boolean;
  suspectText?: string;
}

export default function WaveformOverlay({
  analyser,
  isActive,
  isSuspectSpeaking,
  suspectText,
}: WaveformOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const suspectPhaseRef = useRef(0);
  const animFrameRef = useRef<number>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (isActive && analyser) {
        // Real mic input waveform
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        drawBars(ctx, dataArray, w, h, "rgba(0, 255, 65, 0.6)", "rgba(0, 255, 65, 0.15)");
      } else if (isSuspectSpeaking) {
        // Simulated waveform for suspect's voice
        const fakeData = generateSuspectWaveform(suspectPhaseRef.current, suspectText);
        suspectPhaseRef.current += 0.15;

        drawBars(ctx, fakeData, w, h, "rgba(255, 60, 60, 0.5)", "rgba(255, 60, 60, 0.1)");
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };
    // Match parent dimensions
    const resizeObserver = new ResizeObserver(([entry]) => {
      canvas.width = entry.contentRect.width;
      canvas.height = entry.contentRect.height;
    });
    resizeObserver.observe(canvas.parentElement!);

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [analyser, isActive, isSuspectSpeaking, suspectText]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  w: number,
  h: number,
  barColor: string,
  glowColor: string
) {
  const barCount = Math.min(data.length, 48);
  const barWidth = w / barCount;
  const centerY = h * 0.85; // Bottom area of the monitor

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;

  for (let i = 0; i < barCount; i++) {
    const value = data[i] / 255;
    const barHeight = value * h * 0.25;

    ctx.fillStyle = barColor;
    ctx.fillRect(
      i * barWidth + 1,
      centerY - barHeight,
      barWidth - 2,
      barHeight
    );
  }

  ctx.shadowBlur = 0;
}

function generateSuspectWaveform(phase: number, text?: string): Uint8Array {
  const len = 48;
  const data = new Uint8Array(len);
  const intensity = text ? Math.min(1, text.length / 50) : 0.5;

  for (let i = 0; i < len; i++) {
    const base =
      Math.sin(phase + i * 0.3) * 0.3 +
      Math.sin(phase * 1.7 + i * 0.5) * 0.2 +
      Math.sin(phase * 0.5 + i * 0.8) * 0.15;
    const noise = (Math.random() - 0.5) * 0.3;
    data[i] = Math.max(0, Math.min(255, (base + noise + 0.5) * intensity * 200));
  }

  return data;
}
