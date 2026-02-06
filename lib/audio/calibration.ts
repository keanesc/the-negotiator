// ============================================================
// Calibration — 2-step ambient noise + voice baseline capture
// ============================================================

import type { CalibrationProfile, BiometricFrame } from "@/lib/types";

const SILENCE_DURATION_MS = 2000;
const VOICE_DURATION_MS = 3000;

export type CalibrationStep = "idle" | "silence" | "voice" | "done";

export interface CalibrationState {
  step: CalibrationStep;
  progress: number; // 0–1
  message: string;
}

export class Calibrator {
  private silenceFrames: BiometricFrame[] = [];
  private voiceFrames: BiometricFrame[] = [];
  private startTimestamp: number = 0;
  private currentStep: CalibrationStep = "idle";
  private onStateChange: ((state: CalibrationState) => void) | null = null;
  private profile: CalibrationProfile | null = null;

  setStateCallback(cb: (state: CalibrationState) => void): void {
    this.onStateChange = cb;
  }

  /** Start the silence capture phase */
  startSilencePhase(): void {
    this.currentStep = "silence";
    this.silenceFrames = [];
    this.startTimestamp = Date.now();
    this.emitState();
  }

  /** Start the voice capture phase */
  startVoicePhase(): void {
    this.currentStep = "voice";
    this.voiceFrames = [];
    this.startTimestamp = Date.now();
    this.emitState();
  }

  /** Push a frame during calibration */
  pushFrame(frame: BiometricFrame): boolean {
    const elapsed = Date.now() - this.startTimestamp;

    if (this.currentStep === "silence") {
      this.silenceFrames.push(frame);
      const progress = Math.min(1, elapsed / SILENCE_DURATION_MS);
      this.emitState(progress);
      return elapsed >= SILENCE_DURATION_MS;
    }

    if (this.currentStep === "voice") {
      this.voiceFrames.push(frame);
      const progress = Math.min(1, elapsed / VOICE_DURATION_MS);
      this.emitState(progress);
      return elapsed >= VOICE_DURATION_MS;
    }

    return false;
  }

  /** Compute the calibration profile from collected data */
  computeProfile(): CalibrationProfile {
    const noiseRMS = average(this.silenceFrames.map((f) => f.rms));
    const noiseZCR = average(this.silenceFrames.map((f) => f.zcr));
    const voiceRMS = average(this.voiceFrames.map((f) => f.rms));
    const voiceZCR = average(this.voiceFrames.map((f) => f.zcr));

    // Sibilance threshold: voice ZCR * 1.5 (sibilant sounds like "s", "sh" have high ZCR)
    const sibilanceThreshold = voiceZCR * 1.5;

    this.profile = {
      noiseRMS,
      noiseZCR,
      voiceRMS: Math.max(voiceRMS - noiseRMS, 0.001), // Effective voice RMS
      voiceZCR,
      sibilanceThreshold,
    };

    this.currentStep = "done";
    this.emitState(1);

    console.log("[Calibration] Profile:", this.profile);
    return this.profile;
  }

  getProfile(): CalibrationProfile | null {
    return this.profile;
  }

  /** Reset calibration state for retry */
  reset(): void {
    this.silenceFrames = [];
    this.voiceFrames = [];
    this.startTimestamp = 0;
    this.currentStep = "idle";
    this.profile = null;
    this.emitState();
  }

  private emitState(progress = 0): void {
    const messages: Record<CalibrationStep, string> = {
      idle: "STANDBY...",
      silence: "ESTABLISHING SECURE LINE... Please remain SILENT",
      voice: "VOICE PRINT REQUIRED... Please SPEAK now — say anything",
      done: "CALIBRATION COMPLETE",
    };

    this.onStateChange?.({
      step: this.currentStep,
      progress,
      message: messages[this.currentStep],
    });
  }
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
