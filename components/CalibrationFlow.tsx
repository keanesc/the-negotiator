"use client";

import { useEffect, useState } from "react";
import type { CalibrationState } from "@/lib/audio/calibration";

// ============================================================
// CalibrationFlow — full-screen overlay for the 2-step calibration
// ============================================================

interface CalibrationFlowProps {
  calibrationState: CalibrationState;
  onComplete: () => void;
  onRetry?: () => void;
}

export default function CalibrationFlow({
  calibrationState,
  onComplete,
  onRetry,
}: CalibrationFlowProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (calibrationState.step === "done") {
      // Brief pause then fade out
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, 800);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [calibrationState.step, onComplete]);

  const { step, progress, message } = calibrationState;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-700"
      style={{
        background: "radial-gradient(ellipse at center, #0a0f0a 0%, #000 100%)",
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {/* Static interference background */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          animation: "drift 0.5s steps(4) infinite",
        }}
      />

      {/* Logo / Title */}
      <div className="mb-12 text-center">
        <div
          className="text-xs tracking-[0.5em] text-green-500/60 font-mono mb-2"
        >
          TACTICAL NEGOTIATION SYSTEM
        </div>
        <h1
          className="text-3xl font-bold tracking-[0.15em] text-gray-200"
          style={{
            fontFamily: "'Courier New', monospace",
            textShadow: "0 0 20px rgba(0, 255, 65, 0.3)",
          }}
        >
          UNDER PRESSURE
        </h1>
      </div>

      {/* Status message */}
      <div
        className="text-sm font-mono tracking-[0.2em] text-green-400/80 mb-6 text-center"
        style={{ textShadow: "0 0 10px rgba(0, 255, 65, 0.3)" }}
      >
        {message}
      </div>

      {/* Signal strength meter */}
      <div className="w-64 mb-4">
        <div className="flex gap-1 h-8">
          {Array.from({ length: 20 }).map((_, i) => {
            const filled = i / 20 < progress;
            const hue = (i / 20) * 120; // Red → Yellow → Green
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all duration-100"
                style={{
                  background: filled
                    ? `hsl(${hue}, 100%, 45%)`
                    : "rgba(255, 255, 255, 0.03)",
                  boxShadow: filled
                    ? `0 0 6px hsl(${hue}, 100%, 45%, 0.4)`
                    : "none",
                  transform: filled ? "scaleY(1)" : "scaleY(0.5)",
                  transformOrigin: "bottom",
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-gray-600 font-mono">0%</span>
          <span className="text-[8px] text-gray-600 font-mono">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex gap-8 mt-6">
        <PhaseStep
          number={1}
          label="NOISE FLOOR"
          active={step === "silence"}
          complete={step === "voice" || step === "done"}
        />
        <PhaseStep
          number={2}
          label="VOICE PRINT"
          active={step === "voice"}
          complete={step === "done"}
        />
      </div>

      {/* Completion message */}
      {step === "done" && (
        <div
          className="mt-8 text-xs font-mono tracking-[0.3em] text-green-400 animate-pulse"
          style={{ textShadow: "0 0 10px rgba(0, 255, 65, 0.5)" }}
        >
          ✓ SECURE LINE ESTABLISHED
        </div>
      )}
{/* Retry button */}
      {onRetry && step !== "idle" && step !== "done" && (
        <button
          onClick={onRetry}
          className="mt-8 px-4 py-2 text-xs font-mono tracking-[0.2em] text-orange-400 border border-orange-500/30 hover:border-orange-400 hover:text-orange-300 transition-all rounded-sm"
          style={{
            background: "rgba(255, 165, 0, 0.05)",
            boxShadow: "0 0 10px rgba(255, 165, 0, 0.1)",
          }}
        >
          RETRY CALIBRATION
        </button>
      )}

      
      <style jsx>{`
        @keyframes drift {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 1px); }
          50% { transform: translate(1px, -1px); }
          75% { transform: translate(-1px, -2px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
}

function PhaseStep({
  number,
  label,
  active,
  complete,
}: {
  number: number;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono border transition-all"
        style={{
          borderColor: complete
            ? "#22c55e"
            : active
              ? "#00ff41"
              : "#333",
          color: complete ? "#22c55e" : active ? "#00ff41" : "#555",
          background: complete
            ? "rgba(34, 197, 94, 0.1)"
            : active
              ? "rgba(0, 255, 65, 0.05)"
              : "transparent",
          boxShadow: active ? "0 0 12px rgba(0, 255, 65, 0.2)" : "none",
        }}
      >
        {complete ? "✓" : number}
      </div>
      <span
        className="text-[9px] font-mono tracking-wider"
        style={{
          color: complete ? "#22c55e" : active ? "#00ff41" : "#555",
        }}
      >
        {label}
      </span>
    </div>
  );
}
