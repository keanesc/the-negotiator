"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/game/state";
import { parseSuspectState, parseTranscription, parseReaction, stripMetadata } from "@/lib/game/prompts";
import { AudioEngine } from "@/lib/audio/audio-engine";
import { BiometricAnalyzer } from "@/lib/audio/biometrics";
import { Calibrator } from "@/lib/audio/calibration";
import type { CalibrationState } from "@/lib/audio/calibration";
import { encodeWAV } from "@/lib/audio/wav-encoder";
import type { BiometricSignals } from "@/lib/types";
import { getApiKey } from "@/lib/api-key";

import dynamic from "next/dynamic";
import CommandCenter from "@/components/CommandCenter";
const CCTVMonitor = dynamic(() => import("@/components/CCTVMonitor"), {
  ssr: false,
});
import WaveformOverlay from "@/components/WaveformOverlay";
import Clipboard from "@/components/Clipboard";
import MicButton from "@/components/MicButton";
import { ConversationLog } from "@/components/ConversationLog";
import CalibrationFlow from "@/components/CalibrationFlow";
import DebriefOverlay from "@/components/DebriefOverlay";
import ApiKeySetup from "@/components/ApiKeySetup";

export default function GamePage() {
  // ---- Refs ----
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const biometricsRef = useRef<BiometricAnalyzer | null>(null);
  const calibratorRef = useRef<Calibrator>(new Calibrator());
  const currentSignalsRef = useRef<BiometricSignals>({
    yelling: 0,
    whispering: 0,
    stammering: 0,
    hesitating: 0,
  });
  const backgroundMusicRef = useRef<HTMLAudioElement>(null);

  // ---- Local state ----
  const [calibrationState, setCalibrationState] = useState<CalibrationState>({
    step: "idle",
    progress: 0,
    message: "STANDBY...",
  });
  const [isSuspectSpeaking, setIsSuspectSpeaking] = useState(false);
  const [suspectStreamText, setSuspectStreamText] = useState("");
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  // ---- Game store ----
  const status = useGameStore((s) => s.status);
  const suspectState = useGameStore((s) => s.suspectState);
  const conversation = useGameStore((s) => s.conversation);
  const hostages = useGameStore((s) => s.hostagesRemaining);
  const isRecording = useGameStore((s) => s.isRecording);
  const isProcessing = useGameStore((s) => s.isProcessing);

  const {
    setStatus,
    setSuspectState,
    addConversationEntry,
    updateLastSuspectEntry,
    updateLastNegotiatorEntry,
    setHostagesRemaining,
    addBiometricReading,
    setCalibration,
    setIsRecording,
    setIsProcessing,
    reset,
  } = useGameStore();

  // ---- Initialize audio engine ----
  const initAudio = useCallback(async () => {
    const engine = new AudioEngine();
    await engine.init();
    audioEngineRef.current = engine;

    return engine;
  }, []);

  // ---- Start game (calibration flow) ----
  const startGame = useCallback(async () => {
    setStatus("calibrating");

    const engine = await initAudio();
    await engine.resume();
    engine.startCapture();

    const calibrator = calibratorRef.current;
    calibrator.setStateCallback(setCalibrationState);

    // Phase 1: Silence — wait for 2s of ambient noise measurement
    calibrator.startSilencePhase();

    await new Promise<void>((resolve) => {
      engine.setAnalysisCallback((data) => {
        const done = calibrator.pushFrame({
          rms: data.rms,
          zcr: data.zcr,
          timestamp: data.timestamp,
        });
        if (done) resolve();
      });
    });

    // Phase 2: Voice — wait for 3s of voice measurement
    calibrator.startVoicePhase();

    await new Promise<void>((resolve) => {
      engine.setAnalysisCallback((data) => {
        const done = calibrator.pushFrame({
          rms: data.rms,
          zcr: data.zcr,
          timestamp: data.timestamp,
        });
        if (done) resolve();
      });
    });

    // Compute profile
    const profile = calibrator.computeProfile();
    setCalibration(profile);

    // Initialize biometric analyzer with calibration
    biometricsRef.current = new BiometricAnalyzer(profile);

    // Set up analysis callback for gameplay
    engine.setAnalysisCallback((data) => {
      if (biometricsRef.current) {
        biometricsRef.current.pushFrame({
          rms: data.rms,
          zcr: data.zcr,
          timestamp: data.timestamp,
        });
        currentSignalsRef.current = biometricsRef.current.getSignals();
      }
    });

    // Stop the calibration capture
    engine.stopCapture();
  }, [initAudio, setCalibration, setStatus]);

  // ---- Calibration complete → game starts ----
  const onCalibrationComplete = useCallback(() => {
    setStatus("active");

    // Opening message from Jax
    addConversationEntry({
      role: "suspect",
      text: "Yeah?! Who is this?! You got exactly ONE minute to tell me what I want to hear, or things get real ugly in here!",
      timestamp: Date.now(),
    });
  }, [setStatus, addConversationEntry]);

  // ---- Start recording ----
  const handleStartRecording = useCallback(async () => {
    if (!audioEngineRef.current || isProcessing) return;

    await audioEngineRef.current.resume();
    audioEngineRef.current.startCapture();
    biometricsRef.current?.reset();
    setIsRecording(true);
  }, [isProcessing, setIsRecording]);

  // ---- Stop recording & send to API ----
  const handleStopRecording = useCallback(async () => {
    if (!audioEngineRef.current || !isRecording) return;

    setIsRecording(false);
    setIsProcessing(true);

    // Get PCM data and biometric signals
    const pcmBuffers = audioEngineRef.current.stopCapture();
    const signals = currentSignalsRef.current;

    // Skip if no audio captured
    if (pcmBuffers.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Encode to WAV
    const wavData = encodeWAV(pcmBuffers, audioEngineRef.current.getSampleRate());
    const wavBlob = new Blob([wavData.buffer as ArrayBuffer], { type: "audio/wav" });

    // Add biometric reading
    addBiometricReading(signals);

    // Build form data
    const formData = new FormData();
    formData.append("audio", wavBlob, "recording.wav");
    formData.append("biometrics", JSON.stringify(signals));
    formData.append(
      "history",
      JSON.stringify(
        conversation.map((e) => ({
          role: e.role,
          text: e.role === "suspect" ? stripMetadata(e.text) : e.text,
        }))
      )
    );

    // Add negotiator entry (placeholder until we get transcription back)
    addConversationEntry({
      role: "negotiator",
      text: "[Transmitting...]",
      biometrics: signals,
      timestamp: Date.now(),
    });

    try {
      setIsSuspectSpeaking(true);
      setSuspectStreamText("");

      const apiKey = getApiKey();
      const headers: HeadersInit = {};
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const response = await fetch("/api/negotiate", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to process negotiation" }));
        throw new Error(errorData.error || "Negotiate API failed");
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      // Add suspect placeholder
      addConversationEntry({
        role: "suspect",
        text: "",
        timestamp: Date.now(),
      });

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          setSuspectStreamText(fullResponse);

          // Extract transcription as soon as it appears and update negotiator entry
          const transcription = parseTranscription(fullResponse);
          if (transcription) {
            updateLastNegotiatorEntry(transcription);
          }

          // Update the last suspect entry with streamed text (strip all metadata)
          // Strip completed metadata blocks (supports [[]], <!-- -->, ←—, or bare keywords)
          const strippedText = fullResponse
            .replace(/(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?TRANSCRIPTION:\s*"[^"]*"(?:\s*\]{2}|\s*-+>)?/g, "")
            .replace(/(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?R:\w+(?:\s*\]{2}|\s*-+>)?/g, "")
            .replace(/(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?STATE:\s*\{[^}]+\}(?:\s*\]{2}|\s*-+>)?/g, "")
            // Strip incomplete metadata still being streamed
            .replace(/(?:\[{2}|<!-+|\u2190\u2014)(?:(?!\]{2}|-->)[\s\S])*$/g, "")
            .trim();
          const reactionLine = parseReaction(fullResponse);
          const displayText = reactionLine ? `${reactionLine} ${strippedText}` : strippedText;
          updateLastSuspectEntry(displayText);
        }
      }

      // Parse state from completed response
      const parsed = parseSuspectState(fullResponse);
      console.log("[Game] Suspect state:", parsed ? { tension: parsed.tension, paranoia: parsed.paranoia, respect: parsed.respect, hostages: parsed.hostages } : "No state parsed");
      if (parsed) {
        updateLastSuspectEntry(parsed.text);
        setSuspectState({
          tension: parsed.tension,
          paranoia: parsed.paranoia,
          respect: parsed.respect,
        });

        if (parsed.hostages !== hostages) {
          setHostagesRemaining(parsed.hostages);
        }

        // Check win/lose
        if (parsed.tension <= 15) {
          setStatus("won");
        } else if (parsed.tension >= 100 || parsed.hostages <= 0) {
          setStatus("lost");
        }
      }
    } catch (error) {
      console.error("[Game] Negotiate error:", error);
      updateLastSuspectEntry(
        "...*static*... Connection interrupted. Try again."
      );
    } finally {
      setIsSuspectSpeaking(false);
      setSuspectStreamText("");
      setIsProcessing(false);
    }
  }, [
    isRecording,
    conversation,
    hostages,
    addBiometricReading,
    addConversationEntry,
    updateLastSuspectEntry,
    updateLastNegotiatorEntry,
    setSuspectState,
    setHostagesRemaining,
    setStatus,
    setIsRecording,
    setIsProcessing,
  ]);

  // ---- Background music control ----
  useEffect(() => {
    const music = backgroundMusicRef.current;
    if (!music) return;

    music.volume = 0.2; // keep volume low for calibration
    
    // Only play during active gameplay
    if (status === "active") {
      music.play().catch((e) => console.warn("Failed to play background music:", e));
    } else {
      music.pause();
      music.currentTime = 0; // Reset to beginning
    }
  }, [status]);

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      backgroundMusicRef.current?.pause();
      audioEngineRef.current?.destroy();
    };
  }, []);

  // ---- Handle restart ----
  const handleRestart = useCallback(() => {
    audioEngineRef.current?.destroy();
    audioEngineRef.current = null;
    biometricsRef.current = null;
    calibratorRef.current = new Calibrator();
    reset();
    setCalibrationState({ step: "idle", progress: 0, message: "STANDBY..." });
  }, [reset]);

  // ---- Handle calibration retry ----
  const handleCalibrationRetry = useCallback(async () => {
    // Stop current capture
    audioEngineRef.current?.stopCapture();
    
    // Reset calibrator
    calibratorRef.current.reset();
    setCalibrationState({ step: "idle", progress: 0, message: "STANDBY..." });
    
    // Restart calibration
    setTimeout(() => {
      startGame();
    }, 100);
  }, [startGame]);

  // ---- Auto-start calibration when status changes to calibrating ----
  // (triggered from landing page)

  return (
    <CommandCenter tension={suspectState.tension}>
      {/* API Key Setup Modal */}
      {showApiKeySetup && (
        <ApiKeySetup onComplete={() => setShowApiKeySetup(false)} />
      )}

      {/* Settings button (top-right) */}
      <button
        onClick={() => setShowApiKeySetup(true)}
        className="absolute top-4 right-4 z-30 p-2 text-green-500/60 hover:text-green-400 transition-colors"
        title="Configure API Key"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Background music — plays only during active gameplay */}
      <audio
        ref={backgroundMusicRef}
        src="/audio/main_bg.mp3"
        loop
        preload="auto"
      />

      {/* Calibration overlay */}
      {status === "calibrating" && (
        <CalibrationFlow
          calibrationState={calibrationState}
          onComplete={onCalibrationComplete}
          onRetry={handleCalibrationRetry}
        />
      )}

      {/* Main game layout */}
      <div className="relative w-full h-full flex flex-col">
        {/* Middle area — clipboard + monitor + radio log */}
        <div className="flex-1 flex items-center justify-center gap-6 px-6 pb-24">
          {/* Left: Clipboard */}
          <div className="hidden md:block">
            <Clipboard
              tension={suspectState.tension}
              paranoia={suspectState.paranoia}
              respect={suspectState.respect}
              hostages={hostages}
            />
          </div>

          {/* Center: CCTV Monitor */}
          <div className="w-full max-w-160">
            <CCTVMonitor
              tension={suspectState.tension}
              paranoia={suspectState.paranoia}
              hostages={hostages}
              gameStatus={status}
            >
              <WaveformOverlay
                analyser={audioEngineRef.current?.getAnalyser() ?? null}
                isActive={isRecording}
                isSuspectSpeaking={isSuspectSpeaking}
                suspectText={suspectStreamText}
              />
            </CCTVMonitor>
          </div>

          {/* Right: Radio Log */}
          <div className="hidden lg:block">
            <ConversationLog conversation={conversation} />
          </div>
        </div>

        {/* Bottom: Mic on the table */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          {status === "idle" ? (
            <button
              onClick={startGame}
              className="px-8 py-3 text-sm font-mono tracking-[0.3em] text-green-400 border border-green-500/30 hover:border-green-400 hover:text-green-300 transition-all rounded-sm"
              style={{
                background: "rgba(0, 255, 65, 0.05)",
                boxShadow: "0 0 20px rgba(0, 255, 65, 0.1)",
              }}
            >
              START CALIBRATION
            </button>
          ) : status === "active" ? (
            <MicButton
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              isRecording={isRecording}
              isDisabled={isProcessing}
            />
          ) : null}
        </div>
      </div>

      {/* Debrief overlay */}
      <DebriefOverlay
        isOpen={status === "won" || status === "lost"}
        outcome={status === "won" ? "won" : "lost"}
        onRestart={handleRestart}
      />
    </CommandCenter>
  );
}
