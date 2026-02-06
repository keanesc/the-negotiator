// ============================================================
// Core Types for Under Pressure
// ============================================================

/** Raw biometric readings from the audio worklet */
export interface BiometricFrame {
  rms: number;
  zcr: number;
  timestamp: number;
}

/** Calibration profile from the 2-step calibration */
export interface CalibrationProfile {
  noiseRMS: number;
  noiseZCR: number;
  voiceRMS: number;
  voiceZCR: number;
  sibilanceThreshold: number;
}

/** Confidence values (0.0–1.0) for each behavioral signal */
export interface BiometricSignals {
  yelling: number;
  whispering: number;
  stammering: number;
  hesitating: number;
}

/** A single turn in the conversation */
export interface ConversationEntry {
  role: "negotiator" | "suspect";
  text: string;
  biometrics?: BiometricSignals;
  timestamp: number;
}

/** Jax's internal state, parsed from response metadata */
export interface SuspectState {
  tension: number;
  paranoia: number;
  respect: number;
}

/** Overall game status */
export type GameStatus = "idle" | "calibrating" | "active" | "won" | "lost";

/** Full game state */
export interface GameState {
  status: GameStatus;
  suspectState: SuspectState;
  conversation: ConversationEntry[];
  hostagesRemaining: number;
  biometricLog: BiometricSignals[];
  calibration: CalibrationProfile | null;
  isRecording: boolean;
  isProcessing: boolean;
  unreadMessages: number;
}

/** Actions for game state mutations */
export interface GameActions {
  setStatus: (status: GameStatus) => void;
  setSuspectState: (state: SuspectState) => void;
  addConversationEntry: (entry: ConversationEntry) => void;
  updateLastSuspectEntry: (text: string) => void;
  updateLastNegotiatorEntry: (text: string) => void;
  setHostagesRemaining: (count: number) => void;
  addBiometricReading: (reading: BiometricSignals) => void;
  setCalibration: (profile: CalibrationProfile) => void;
  setIsRecording: (recording: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  clearUnreadMessages: () => void;
  reset: () => void;
}
