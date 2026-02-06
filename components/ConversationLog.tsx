"use client";

import { useRef, useEffect } from "react";
import type { ConversationEntry } from "@/lib/types";

// ============================================================
// ConversationLog — radio transmission log panel
// ============================================================

interface ConversationLogProps {
  conversation: ConversationEntry[];
}

export function ConversationLog({ conversation }: ConversationLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.length]);

  return (
    <div
      className="w-80 h-[600px] flex flex-col"
      style={{
        background: "linear-gradient(180deg, #1a1a1a 0%, #111 100%)",
        border: "2px solid #2a2a2a",
        borderRadius: "4px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #2a2a2a" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span
            className="text-xs tracking-[0.2em] text-gray-400 font-mono"
          >
            RADIO LOG
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              transparent,
              transparent 27px,
              rgba(100, 100, 100, 0.05) 27px,
              rgba(100, 100, 100, 0.05) 28px
            )
          `,
        }}
      >
        {conversation.length === 0 && (
          <div className="text-xs text-gray-600 font-mono text-center mt-8">
            No transmissions yet.<br />
            Pick up the mic to begin.
          </div>
        )}

        {conversation.map((entry, i) => (
          <TransmissionEntry key={i} entry={entry} index={i} />
        ))}
      </div>
    </div>
  );
}

function TransmissionEntry({
  entry,
}: {
  entry: ConversationEntry;
  index: number;
}) {
  const isNegotiator = entry.role === "negotiator";
  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className="text-xs font-mono"
      style={{
        borderLeft: `2px solid ${isNegotiator ? "#3b82f6" : "#ef4444"}`,
        paddingLeft: "8px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="font-bold tracking-wider"
          style={{ color: isNegotiator ? "#60a5fa" : "#f87171" }}
        >
          {isNegotiator ? "NEGOTIATOR" : "SUSPECT"}
        </span>
        <span className="text-gray-600">{time}</span>
      </div>

      {/* Body */}
      <div className="text-gray-300 leading-relaxed">{entry.text}</div>

      {/* Biometric tags */}
      {entry.biometrics && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {entry.biometrics.yelling > 0.6 && (
            <BiometricTag label="RAISED VOICE" color="#f97316" />
          )}
          {entry.biometrics.whispering > 0.6 && (
            <BiometricTag label="WHISPER" color="#a855f7" />
          )}
          {entry.biometrics.stammering > 0.65 && (
            <BiometricTag label="UNSTEADY" color="#eab308" />
          )}
          {entry.biometrics.hesitating > 0.7 && (
            <BiometricTag label="HESITANT" color="#6b7280" />
          )}
        </div>
      )}
    </div>
  );
}

function BiometricTag({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      className="text-[8px] tracking-wider px-1 py-0.5 rounded-sm font-bold"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}
