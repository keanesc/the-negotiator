// ============================================================
// Biometrics — sliding window analysis of voice signals
// ============================================================

import type {
  BiometricSignals,
  CalibrationProfile,
  BiometricFrame,
} from "@/lib/types";

const WINDOW_SIZE_MS = 2000;
const HESITATION_THRESHOLD_MS = 3000;

export class BiometricAnalyzer {
  private frames: BiometricFrame[] = [];
  private calibration: CalibrationProfile;
  private lastSpeechTimestamp: number = 0;
  private silenceStartTimestamp: number = 0;
  private rmsHistory: number[] = [];

  constructor(calibration: CalibrationProfile) {
    this.calibration = calibration;
    this.lastSpeechTimestamp = Date.now();
    this.silenceStartTimestamp = 0;
  }

  /** Push a new analysis frame from the worklet */
  pushFrame(frame: BiometricFrame): void {
    this.frames.push(frame);

    // Trim frames outside the sliding window
    const cutoff = frame.timestamp - WINDOW_SIZE_MS;
    while (this.frames.length > 0 && this.frames[0].timestamp < cutoff) {
      this.frames.shift();
    }

    // Track RMS history for stammering detection
    const effectiveRMS = Math.max(0, frame.rms - this.calibration.noiseRMS);
    this.rmsHistory.push(effectiveRMS);
    if (this.rmsHistory.length > 100) {
      this.rmsHistory.shift();
    }

    // Track speech/silence for hesitation
    const isSpeech = effectiveRMS > this.calibration.noiseRMS * 1.5;
    if (isSpeech) {
      this.lastSpeechTimestamp = frame.timestamp;
      this.silenceStartTimestamp = 0;
    } else if (this.silenceStartTimestamp === 0) {
      this.silenceStartTimestamp = frame.timestamp;
    }
  }

  /** Compute current biometric signals as confidence values (0–1) */
  getSignals(): BiometricSignals {
    if (this.frames.length === 0) {
      return { yelling: 0, whispering: 0, stammering: 0, hesitating: 0 };
    }

    const cal = this.calibration;

    // Average effective RMS and ZCR over the window
    let avgRMS = 0;
    let avgZCR = 0;
    for (const frame of this.frames) {
      avgRMS += Math.max(0, frame.rms - cal.noiseRMS);
      avgZCR += frame.zcr;
    }
    avgRMS /= this.frames.length;
    avgZCR /= this.frames.length;

    // ---- YELLING ----
    // Effective RMS > Voice_RMS * 2.5
    // Dead zone: ignore anything below 1.5x voiceRMS (natural variation)
    const yellStart = cal.voiceRMS * 1.5;
    const yellFull = cal.voiceRMS * 2.5;
    const yelling =
      avgRMS > yellStart
        ? Math.min(1, (avgRMS - yellStart) / (yellFull - yellStart))
        : 0;

    // ---- WHISPERING ----
    // Effective RMS < Voice_RMS * 0.5 AND high ZCR (sibilance)
    const whisperThreshold = cal.voiceRMS * 0.4;
    const isQuiet = avgRMS > 0 && avgRMS < whisperThreshold;
    const hasSibilance = avgZCR > cal.sibilanceThreshold;
    const whispering =
      isQuiet && hasSibilance
        ? Math.min(
            1,
            (1 - avgRMS / whisperThreshold) * (avgZCR / cal.sibilanceThreshold),
          )
        : 0;

    // ---- STAMMERING ----
    // High-frequency fluctuations in RMS envelope
    const stammering = this.computeStammering();

    // ---- HESITATION ----
    // Silence duration > 3000ms
    const now = this.frames[this.frames.length - 1].timestamp;
    const silenceDuration =
      this.silenceStartTimestamp > 0 ? now - this.silenceStartTimestamp : 0;
    const hesitating =
      silenceDuration > HESITATION_THRESHOLD_MS
        ? Math.min(1, (silenceDuration - HESITATION_THRESHOLD_MS) / 5000)
        : 0;

    return {
      yelling: clamp(yelling),
      whispering: clamp(whispering),
      stammering: clamp(stammering),
      hesitating: clamp(hesitating),
    };
  }

  private computeStammering(): number {
    if (this.rmsHistory.length < 20) return 0;

    // Only use the most recent portion of history for stammering
    const recent = this.rmsHistory.slice(-50);

    // Compute deltas between consecutive RMS values
    const deltas: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      deltas.push(Math.abs(recent[i] - recent[i - 1]));
    }

    // Variance of deltas — high variance = rapid fluctuations = stammering
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance =
      deltas.reduce((a, d) => a + (d - mean) ** 2, 0) / deltas.length;

    // Normalize against voice RMS as reference
    const voiceRef = this.calibration.voiceRMS || 0.01;
    const normalizedVariance = variance / (voiceRef * voiceRef);

    // Higher threshold to avoid false positives from natural speech variation
    // Only rapid, repeated stop-start patterns should trigger this
    return Math.min(1, normalizedVariance / 4.0);
  }

  /** Reset state (e.g., between turns) */
  reset(): void {
    this.frames = [];
    this.rmsHistory = [];
    this.lastSpeechTimestamp = Date.now();
    this.silenceStartTimestamp = 0;
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}
