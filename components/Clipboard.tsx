"use client";

// ============================================================
// Clipboard — diegetic suspect intel on a physical clipboard
// Left panel, angled slightly for perspective
// ============================================================

interface ClipboardProps {
  tension: number;
  paranoia: number;
  respect: number;
  hostages: number;
}

export default function Clipboard({
  tension,
  paranoia,
  respect,
  hostages,
}: ClipboardProps) {
  return (
    <div
      className="relative select-none"
      style={{
        transform: "perspective(800px) rotateY(5deg)",
        transformOrigin: "left center",
      }}
    >
      {/* Clipboard body */}
      <div
        className="relative w-56 rounded-sm overflow-hidden"
        style={{
          background: "#8B7355",
          boxShadow: "4px 4px 15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          padding: "4px",
        }}
      >
        {/* Metal clip at top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-sm z-10"
          style={{
            background: "linear-gradient(180deg, #888 0%, #666 100%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        />

        {/* Paper */}
        <div
          className="relative mt-2 p-4"
          style={{
            background:
              "linear-gradient(180deg, #f5f0e0 0%, #ede7d4 100%)",
            backgroundImage: `
              repeating-linear-gradient(
                transparent,
                transparent 23px,
                rgba(100, 100, 200, 0.15) 23px,
                rgba(100, 100, 200, 0.15) 24px
              )
            `,
            minHeight: "320px",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {/* Classification stamp */}
          <div
            className="absolute top-2 right-2 text-xs font-bold px-1 border border-red-600 text-red-600"
            style={{ transform: "rotate(-5deg)", opacity: 0.7 }}
          >
            CLASSIFIED
          </div>

          {/* Header */}
          <div className="text-xs text-gray-700 mb-3 tracking-widest">
            SUSPECT PROFILE
          </div>

          {/* Photo placeholder */}
          <div
            className="w-16 h-20 mb-3 flex items-center justify-center text-xs text-gray-600"
            style={{
              background: "#ddd",
              border: "1px solid #bbb",
            }}
          >
            <svg
              className="w-8 h-8 text-gray-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* Info */}
          <div className="space-y-1.5 text-xs text-gray-800 leading-snug">
            <InfoRow label="NAME" value="JAX (alias)" />
            <InfoRow label="AGE" value="32" />
            <InfoRow label="WEAPON" value="9mm handgun (6 rds)" />

            <div className="border-t border-gray-300 my-2" />

            <div className="text-xs text-gray-700 tracking-widest mb-1">
              DEMANDS
            </div>
            <div className="text-xs text-gray-800 pl-1">
              ◆ Helicopter<br />
              ◆ $5,000,000 cash
            </div>

            <div className="border-t border-gray-300 my-2" />

            <div className="text-xs text-gray-700 tracking-widest mb-1">
              HOSTAGES
            </div>
            <div className="flex gap-1.5 pl-1">
              {[
                { label: "Manager", icon: "M" },
                { label: "Teller", icon: "T" },
                { label: "Customer", icon: "C" },
              ].map((h, i) => (
                <div
                  key={h.label}
                  className="flex flex-col items-center"
                  style={{ opacity: i < hostages ? 1 : 0.3 }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: i < hostages ? "#333" : "#ccc",
                      color: i < hostages ? "#fff" : "#999",
                    }}
                  >
                    {h.icon}
                  </div>
                  <span className="text-[8px] text-gray-700 mt-0.5">
                    {h.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-300 my-2" />

            {/* SIGINT readings — diegetic version of state bars */}
            <div className="text-xs text-gray-700 tracking-widest mb-1">
              SIGINT ANALYSIS
            </div>
            <StateBar label="AGITATION" value={tension} color={getTensionColor(tension)} />
            <StateBar label="PARANOIA" value={paranoia} color="#f59e0b" />
            <StateBar label="COOPERATN" value={respect} color="#22c55e" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-gray-700 w-16 shrink-0">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function StateBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-gray-700 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: color,
          }}
        />
      </div>
      <span className="text-[9px] text-gray-700 w-5 text-right">{value}</span>
    </div>
  );
}

function getTensionColor(tension: number): string {
  if (tension <= 30) return "#22c55e";
  if (tension <= 60) return "#eab308";
  if (tension <= 80) return "#f97316";
  return "#ef4444";
}
