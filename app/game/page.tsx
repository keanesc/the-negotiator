"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/game/state";
import { parseSuspectState, parseTranscription, parseReaction } from "@/lib/game/prompts";
import { AudioEngine } from "@/lib/audio/audio-engine";
import { BiometricAnalyzer } from "@/lib/audio/biometrics";
import { Calibrator } from "@/lib/audio/calibration";
import type { CalibrationState } from "@/lib/audio/calibration";
import { encodeWAV } from "@/lib/audio/wav-encoder";
import type { BiometricSignals } from "@/lib/types";

import CommandCenter from "@/components/CommandCenter";
import CCTVMonitor from "@/components/CCTVMonitor";
import WaveformOverlay from "@/components/WaveformOverlay";
import Clipboard from "@/components/Clipboard";
import MicButton from "@/components/MicButton";
import { ConversationLog } from "@/components/ConversationLog";
import CalibrationFlow from "@/components/CalibrationFlow";
import DebriefOverlay from "@/components/DebriefOverlay";

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

  // ---- Local state ----
  const [calibrationState, setCalibrationState] = useState<CalibrationState>({
    step: "idle",
    progress: 0,
    message: "STANDBY...",
  });
  const [isSuspectSpeaking, setIsSuspectSpeaking] = useState(false);
  const [suspectStreamText, setSuspectStreamText] = useState("");

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
        conversation.map((e) => ({ role: e.role, text: e.text }))
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

      const response = await fetch("/api/negotiate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Negotiate API failed");

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
          // Patterns handle both <!-- ... --> comment-wrapped and bare variants
          const strippedText = fullResponse
            .replace(/(?:<!-+\s*)?TRANSCRIPTION:\s*"[^"]*"(?:\s*-+>)?/g, "")
            .replace(/(?:<!-+\s*)?R:\w+(?:\s*-+>)?/g, "")
            .replace(/(?:<!-+\s*|\u2190\u2014\s*)?STATE:\s*\{[^}]+\}(?:\s*-+>)?/g, "")
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

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
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
          <div className="w-full max-w-[640px]">
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
              BEGIN OPERATION
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
