"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import ApiKeySetup from "@/components/ApiKeySetup";
import { hasApiKey, hasServerApiKey } from "@/lib/api-key";

// ============================================================
// Landing Page — UNDER PRESSURE title screen
// ============================================================

export default function Home() {
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkApiKey() {
      // Check if client has key in localStorage
      if (hasApiKey()) {
        setIsChecking(false);
        return;
      }

      // Check if server has key
      const serverHasKey = await hasServerApiKey();
      setNeedsApiKey(!serverHasKey);
      setIsChecking(false);
    }

    checkApiKey();
  }, []);

  const handleApiKeyComplete = () => {
    setNeedsApiKey(false);
  };

  if (isChecking) {
    return null; // Or a loading screen
  }

  return (
    <>
      {needsApiKey && <ApiKeySetup onComplete={handleApiKeyComplete} />}
      <div
        className="relative w-screen h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at center, #0a0f0a 0%, #000 100%)",
        }}
      >
      {/* Animated noise background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Badge */}
        <div className="mb-6">
          <div
            className="w-20 h-20 rounded-full border-2 border-green-500/30 flex items-center justify-center"
            style={{
              background: "rgba(0, 255, 65, 0.03)",
              boxShadow: "0 0 30px rgba(0, 255, 65, 0.1), inset 0 0 20px rgba(0, 255, 65, 0.05)",
            }}
          >
            <svg
              className="w-10 h-10 text-green-500/60"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          </div>
        </div>

        {/* Classification */}
        <div
          className="text-[10px] tracking-[0.6em] text-green-500/40 font-mono mb-4"
        >
          CLASSIFIED · TRAINING SIMULATION
        </div>

        {/* Title */}
        <h1
          className="text-5xl md:text-7xl font-bold tracking-widest text-gray-100 mb-2"
          style={{
            fontFamily: "'Courier New', monospace",
            textShadow:
              "0 0 40px rgba(0, 255, 65, 0.15), 0 0 80px rgba(0, 255, 65, 0.05)",
          }}
        >
          UNDER
          <br />
          PRESSURE
        </h1>

        {/* Subtitle */}
        <p className="text-sm tracking-[0.2em] text-gray-500 font-mono mb-2">
          A HOSTAGE NEGOTIATION SIMULATION
        </p>

        <div className="text-xs text-gray-700 font-mono mb-12">
          BEHAVIORAL BIOMETRICS · VOICE ANALYSIS · AI SUSPECT
        </div>

        {/* Start button */}
        <Link
          href="/game"
          className="group relative px-10 py-4 font-mono text-sm tracking-[0.4em] text-green-400 border border-green-500/30 hover:border-green-400 hover:text-green-300 transition-all duration-300 rounded-sm"
          style={{
            background: "rgba(0, 255, 65, 0.03)",
          }}
        >
          <span className="relative z-10">BEGIN OPERATION</span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "rgba(0, 255, 65, 0.05)",
              boxShadow: "0 0 30px rgba(0, 255, 65, 0.15)",
            }}
          />
        </Link>

        {/* Requirements */}
        <div className="mt-12 space-y-1">
          <div className="text-[10px] text-gray-600 font-mono tracking-wider flex items-center gap-2">
            <span className="text-yellow-600">⚠</span>
            MICROPHONE ACCESS REQUIRED
          </div>
          <div className="text-[10px] text-gray-700 font-mono tracking-wider">
            USE HEADPHONES FOR BEST EXPERIENCE
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
