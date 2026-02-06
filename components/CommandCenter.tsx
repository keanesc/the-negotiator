"use client";

import type { ReactNode } from "react";

// ============================================================
// CommandCenter — the SWAT van interior layout
// Full-viewport container with ambient lighting tied to tension
// ============================================================

interface CommandCenterProps {
  tension: number;
  children: ReactNode;
}

export default function CommandCenter({
  tension,
  children,
}: CommandCenterProps) {
  // Ambient lighting shifts: cool blue → warm amber → pulsing red
  const ambientColor = getAmbientColor(tension);
  const ambientIntensity = 0.05 + (tension / 100) * 0.1;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{
        background: "#0a0a0a",
      }}
    >
      {/* Metal wall texture */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, #151515 0%, #0d0d0d 50%, #080808 100%)
          `,
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
            linear-gradient(180deg, #151515 0%, #0d0d0d 50%, #080808 100%)
          `,
        }}
      />

      {/* Ambient lighting overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${ambientColor}${Math.round(ambientIntensity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
        }}
      />

      {/* Rivets / panel details along edges */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #1a1a1a 0%, #222 50%, #1a1a1a 100%)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: "linear-gradient(90deg, #0f0f0f 0%, #161616 50%, #0f0f0f 100%)" }} />

      {/* Table surface at the bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "18%",
          background: "linear-gradient(180deg, #1a1814 0%, #141210 100%)",
          borderTop: "2px solid #2a2520",
          boxShadow: "inset 0 5px 15px rgba(0,0,0,0.5)",
        }}
      >
        {/* Table surface texture — brushed metal */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.02) 2px,
                rgba(255,255,255,0.02) 3px
              )
            `,
          }}
        />
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>

      {/* Red alert pulse at high tension */}
      {tension > 75 && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255, 0, 0, ${(tension - 75) * 0.003}) 0%, transparent 70%)`,
            animation: "alertPulse 2s ease-in-out infinite",
          }}
        />
      )}

      <style jsx>{`
        @keyframes alertPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function getAmbientColor(tension: number): string {
  if (tension <= 30) return "#4488cc"; // Cool blue
  if (tension <= 60) return "#cc8844"; // Warm amber
  if (tension <= 80) return "#cc5522"; // Orange
  return "#cc2222"; // Red
}
