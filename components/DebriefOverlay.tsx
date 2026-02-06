"use client";

import { useState, useRef, useEffect } from "react";

// ============================================================
// Debrief Overlay — post-game performance review
// ============================================================

interface DebriefOverlayProps {
  isOpen: boolean;
  outcome: "won" | "lost";
  onRestart: () => void;
}

export default function DebriefOverlay({
  isOpen,
  outcome,
  onRestart,
}: DebriefOverlayProps) {
  const [debriefText, setDebriefText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch debrief from API
  useEffect(() => {
    if (!isOpen || hasLoaded) return;

    async function fetchDebrief() {
      setIsLoading(true);
      try {
        // Get game state from the store (imported dynamically to avoid SSR issues)
        const { useGameStore } = await import("@/lib/game/state");
        const state = useGameStore.getState();

        const response = await fetch("/api/debrief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation: state.conversation,
            biometricLog: state.biometricLog,
            finalState: {
              tension: state.suspectState.tension,
              paranoia: state.suspectState.paranoia,
              respect: state.suspectState.respect,
              hostages: state.hostagesRemaining,
            },
          }),
        });

        if (!response.ok) throw new Error("Debrief failed");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Parse SSE data stream
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("0:")) {
                try {
                  const text = JSON.parse(line.slice(2));
                  accumulated += text;
                  setDebriefText(accumulated);
                } catch {
                  // skip non-JSON lines
                }
              }
            }
          }
        }

        setHasLoaded(true);
      } catch (error) {
        console.error("[Debrief Error]", error);
        setDebriefText(
          outcome === "won"
            ? "# Mission Complete\n\nSuspect surrendered. All hostages safe. Well done, negotiator."
            : "# Mission Failed\n\nHostage lost. Review your approach and try again."
        );
        setHasLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDebrief();
  }, [isOpen, hasLoaded, outcome]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [debriefText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-sm overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #1a1a1a 0%, #111 100%)",
          border: "2px solid #2a2a2a",
          boxShadow: "0 0 40px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{
            borderBottom: "1px solid #2a2a2a",
            background: outcome === "won"
              ? "linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%)"
              : "linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%)",
          }}
        >
          <div className="text-2xl">{outcome === "won" ? "🎖" : "⚠"}</div>
          <div>
            <div
              className="text-xs tracking-[0.3em] font-mono"
              style={{ color: outcome === "won" ? "#22c55e" : "#ef4444" }}
            >
              {outcome === "won" ? "MISSION COMPLETE" : "MISSION FAILED"}
            </div>
            <div className="text-sm text-gray-400 font-mono">
              PERFORMANCE DEBRIEF
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="p-6 overflow-y-auto prose prose-invert prose-sm max-w-none"
          style={{
            maxHeight: "calc(80vh - 120px)",
            fontFamily: "'Courier New', monospace",
            fontSize: "13px",
            lineHeight: "1.7",
            color: "#ccc",
          }}
        >
          {isLoading && !debriefText && (
            <div className="flex items-center gap-2 text-gray-500 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Processing debrief...
            </div>
          )}
          <div
            dangerouslySetInnerHTML={{
              __html: simpleMarkdown(debriefText),
            }}
          />
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 px-6 py-3"
          style={{ borderTop: "1px solid #2a2a2a" }}
        >
          <button
            onClick={onRestart}
            className="px-4 py-2 text-xs font-mono tracking-wider text-gray-300 border border-gray-600 hover:border-gray-400 hover:text-white transition-colors rounded-sm"
          >
            NEW OPERATION
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple markdown → HTML converter (no dependencies)
function simpleMarkdown(md: string): string {
  return md
    .replace(/### (.+)/g, '<h3 class="text-green-400 text-base font-bold mt-4 mb-2">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="text-green-400 text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/# (.+)/g, '<h1 class="text-green-300 text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li class="ml-4">• $1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
