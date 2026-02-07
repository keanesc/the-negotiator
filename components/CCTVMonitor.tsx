"use client";

import { useRef, useEffect, useLayoutEffect } from "react";
import type Phaser from "phaser";
import { EventBus } from "@/lib/phaser/EventBus";

// ============================================================
// CCTV Monitor — Phaser-based bank interior with CRT effects
// Bridge component: React ↔ Phaser via EventBus
// ============================================================

interface CCTVMonitorProps {
  tension: number;
  paranoia: number;
  hostages: number;
  gameStatus: "idle" | "calibrating" | "active" | "won" | "lost";
  children?: React.ReactNode; // Waveform overlay goes here
}

export default function CCTVMonitor({
  tension,
  paranoia,
  hostages,
  gameStatus,
  children,
}: CCTVMonitorProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create Phaser game on mount, destroy on unmount
  useLayoutEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    // Dynamic import — Phaser requires window/document
    import("@/lib/phaser/config").then(({ StartGame }) => {
      if (!containerRef.current || gameRef.current) return;
      gameRef.current = StartGame("cctv-phaser-container");
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Push state updates to Phaser scene via EventBus
  useEffect(() => {
    EventBus.emit("state-update", {
      tension,
      paranoia,
      hostages,
      gameStatus,
    });
  }, [tension, paranoia, hostages, gameStatus]);

  // Paranoia glow on outer container
  const paranoiaGlow =
    paranoia > 50
      ? `0 0 ${paranoia / 3}px rgba(255, 165, 0, ${paranoia / 200})`
      : "none";

  return (
    <div className="relative" style={{ boxShadow: paranoiaGlow }}>
      {/* Monitor bezel */}
      <div
        className="relative rounded-sm overflow-hidden"
        style={{
          border: "8px solid #1a1a1a",
          borderTop: "12px solid #222",
          borderBottom: "12px solid #181818",
          boxShadow:
            "inset 0 0 30px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.8)",
          background: "#111",
        }}
      >
        {/* Power LED */}
        <div
          className="absolute top-2 right-4 w-2 h-2 rounded-full z-10"
          style={{
            background:
              gameStatus === "active"
                ? "#00ff41"
                : gameStatus === "calibrating"
                  ? "#ffaa00"
                  : "#333",
            boxShadow:
              gameStatus === "active" ? "0 0 6px #00ff41" : "none",
          }}
        />

        {/* Phaser container */}
        <div
          id="cctv-phaser-container"
          ref={containerRef}
          className="block w-full"
          style={{
            imageRendering: "pixelated",
            filter: `brightness(${1 - tension * 0.002}) contrast(${1 + tension * 0.003})`,
            aspectRatio: "640 / 480",
          }}
        />

        {/* Waveform overlay (children) */}
        {children && (
          <div className="absolute inset-0 pointer-events-none">
            {children}
          </div>
        )}

        {/* CRT curvature overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)",
          }}
        />

        {/* CSS scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px)",
            backgroundSize: "100% 3px",
          }}
        />
      </div>
    </div>
  );
}
