// ============================================================
// Game State — Zustand store for the entire game
// ============================================================

import { create } from "zustand";
import type {
  GameState,
  GameActions,
  GameStatus,
  SuspectState,
  ConversationEntry,
  CalibrationProfile,
  BiometricSignals,
} from "@/lib/types";

const INITIAL_SUSPECT_STATE: SuspectState = {
  tension: 50,
  paranoia: 30,
  respect: 50,
};

const INITIAL_STATE: GameState = {
  status: "idle",
  suspectState: INITIAL_SUSPECT_STATE,
  conversation: [],
  hostagesRemaining: 3,
  biometricLog: [],
  calibration: null,
  isRecording: false,
  isProcessing: false,
  unreadMessages: 0,
};

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...INITIAL_STATE,

  setStatus: (status: GameStatus) => set({ status }),

  setSuspectState: (suspectState: SuspectState) => set({ suspectState }),

  addConversationEntry: (entry: ConversationEntry) =>
    set((state) => ({
      conversation: [...state.conversation, entry],
      unreadMessages: state.unreadMessages + (entry.role === "suspect" ? 1 : 0),
    })),

  updateLastSuspectEntry: (text: string) =>
    set((state) => {
      const conversation = [...state.conversation];
      for (let i = conversation.length - 1; i >= 0; i--) {
        if (conversation[i].role === "suspect") {
          conversation[i] = { ...conversation[i], text };
          break;
        }
      }
      return { conversation };
    }),

  updateLastNegotiatorEntry: (text: string) =>
    set((state) => {
      const conversation = [...state.conversation];
      for (let i = conversation.length - 1; i >= 0; i--) {
        if (conversation[i].role === "negotiator") {
          conversation[i] = { ...conversation[i], text };
          break;
        }
      }
      return { conversation };
    }),

  setHostagesRemaining: (count: number) => set({ hostagesRemaining: count }),

  addBiometricReading: (reading: BiometricSignals) =>
    set((state) => ({
      biometricLog: [...state.biometricLog, reading],
    })),

  setCalibration: (calibration: CalibrationProfile) => set({ calibration }),

  setIsRecording: (isRecording: boolean) => set({ isRecording }),

  setIsProcessing: (isProcessing: boolean) => set({ isProcessing }),

  clearUnreadMessages: () => set({ unreadMessages: 0 }),

  reset: () => set(INITIAL_STATE),
}));
