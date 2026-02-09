"use client";

import { useState, useEffect } from "react";
import { validateApiKey, setApiKey, hasServerApiKey } from "@/lib/api-key";

// ============================================================
// API Key Setup — prompt users to configure their Gemini API key
// ============================================================

interface ApiKeySetupProps {
  onComplete: () => void;
}

export default function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const [apiKey, setApiKeyInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [checkingServer, setCheckingServer] = useState(true);

  // Check if server has an API key configured
  useEffect(() => {
    async function checkServer() {
      const hasServer = await hasServerApiKey();
      if (hasServer) {
        // Server has key, no need to prompt user
        onComplete();
      } else {
        setCheckingServer(false);
      }
    }
    checkServer();
  }, [onComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsValidating(true);

    const result = await validateApiKey(apiKey.trim());

    if (result.valid) {
      setApiKey(apiKey.trim());
      onComplete();
    } else {
      setError(result.error || "Invalid API key");
      setIsValidating(false);
    }
  };

  // Show nothing while checking server
  if (checkingServer) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="w-full max-w-md border border-green-500/30 bg-black p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="mb-2 font-mono text-2xl font-bold text-green-500">
            GEMINI API KEY REQUIRED
          </h1>
          <p className="font-mono text-sm text-gray-400">
            This game requires a Google Gemini API key to function.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="apiKey"
              className="mb-2 block font-mono text-sm text-gray-300"
            >
              Enter your API key:
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyInput(e.target.value)}
              disabled={isValidating}
              placeholder="AIzaSy..."
              className="w-full border border-green-500/50 bg-black/80 px-4 py-3 font-mono text-sm text-green-400 placeholder-gray-600 outline-none transition-colors focus:border-green-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="border border-red-500/50 bg-red-500/10 px-4 py-2">
              <p className="font-mono text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full border border-green-500 bg-green-500/10 px-6 py-3 font-mono font-bold text-green-500 transition-all hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidating ? "VALIDATING..." : "VALIDATE & START"}
          </button>
        </form>

        <div className="mt-6 border-t border-green-500/20 pt-6">
          <p className="mb-2 font-mono text-xs text-gray-500">
            Don&apos;t have an API key?
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-sm text-green-500 underline hover:text-green-400"
          >
            Get one from Google AI Studio →
          </a>
          <p className="mt-4 font-mono text-xs text-gray-600">
            Your API key will be stored locally in your browser and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
