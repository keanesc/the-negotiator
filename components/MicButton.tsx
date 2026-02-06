"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// MicButton — desk microphone, push-to-talk, sits on van table
// ============================================================

interface MicButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
  isDisabled: boolean;
}

export default function MicButton({
  onStartRecording,
  onStopRecording,
  isRecording,
  isDisabled,
}: MicButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const holdingRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    if (isDisabled) return;
    holdingRef.current = true;
    onStartRecording();
  }, [isDisabled, onStartRecording]);

  const handlePointerUp = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    onStopRecording();
  }, [onStopRecording]);

  // Spacebar shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isDisabled) {
        e.preventDefault();
        holdingRef.current = true;
        onStartRecording();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && holdingRef.current) {
        e.preventDefault();
        holdingRef.current = false;
        onStopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDisabled, onStartRecording, onStopRecording]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Transmitting indicator */}
      <div
        className="text-[10px] tracking-[0.3em] font-mono transition-opacity duration-200"
        style={{
          color: "#ff3333",
          opacity: isRecording ? 1 : 0,
          textShadow: "0 0 8px rgba(255, 51, 51, 0.6)",
        }}
      >
        ● TRANSMITTING
      </div>

      {/* Mic body */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setIsHovered(false);
          if (holdingRef.current) {
            holdingRef.current = false;
            onStopRecording();
          }
        }}
        onPointerEnter={() => setIsHovered(true)}
        disabled={isDisabled}
        className="relative flex flex-col items-center select-none outline-none"
        style={{
          cursor: isDisabled ? "not-allowed" : "pointer",
          filter: isDisabled ? "grayscale(0.6) brightness(0.6)" : "none",
        }}
      >
        {/* Mic head (mesh grille) */}
        <div
          className="relative w-16 h-20 rounded-t-full flex items-center justify-center transition-all duration-150"
          style={{
            background: isRecording
              ? "linear-gradient(180deg, #4a4a4a 0%, #333 100%)"
              : "linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%)",
            boxShadow: isRecording
              ? "0 0 20px rgba(255, 51, 51, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
              : isHovered
                ? "0 0 10px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)"
                : "inset 0 1px 0 rgba(255,255,255,0.05)",
            border: "2px solid #555",
            transform: isRecording ? "scale(1.03)" : "scale(1)",
          }}
        >
          {/* Mesh pattern */}
          <div
            className="w-10 h-14 rounded-t-full opacity-30"
            style={{
              backgroundImage: `
                radial-gradient(circle, #888 1px, transparent 1px)
              `,
              backgroundSize: "4px 4px",
            }}
          />

          {/* LED indicator */}
          <div
            className="absolute bottom-2 w-2 h-2 rounded-full transition-all duration-200"
            style={{
              background: isRecording ? "#ff3333" : isHovered ? "#553333" : "#331111",
              boxShadow: isRecording ? "0 0 8px #ff3333, 0 0 16px rgba(255,51,51,0.4)" : "none",
              animation: isRecording ? "pulse 1s ease-in-out infinite" : "none",
            }}
          />
        </div>

        {/* Mic neck */}
        <div
          className="w-3 h-6"
          style={{
            background: "linear-gradient(90deg, #444 0%, #666 50%, #444 100%)",
          }}
        />

        {/* Mic base */}
        <div
          className="w-20 h-4 rounded-b-sm"
          style={{
            background: "linear-gradient(180deg, #555 0%, #333 100%)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
          }}
        />
      </button>

      {/* Hint */}
      <div className="text-[9px] text-gray-500 font-mono tracking-wider">
        HOLD TO TALK · SPACE
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
