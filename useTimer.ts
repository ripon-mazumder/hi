import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "hindu_exam_timer";
const HASH_KEY = "hindu_exam_timer_h";
const TOTAL_SECONDS = 1 * 60 * 60 + 50 * 60; // 1 hour 50 minutes

interface TimerState {
  startedAt: number;
  finished: boolean;
}

// Simple hash to detect localStorage tampering
function computeHash(state: TimerState): string {
  const str = `${state.startedAt}_${state.finished}_dharma_raksha`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function saveState(state: TimerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(HASH_KEY, computeHash(state));
}

function loadState(): TimerState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  const hash = localStorage.getItem(HASH_KEY);
  if (!raw) return null;
  try {
    const state: TimerState = JSON.parse(raw);
    // Verify hash - if tampered, treat as finished (penalty)
    if (hash !== computeHash(state)) {
      return { startedAt: state.startedAt, finished: true };
    }
    return state;
  } catch {
    return null;
  }
}

export function useTimer(examStarted: boolean) {
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [isFinished, setIsFinished] = useState(false);
  const [tampered, setTampered] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    if (!examStarted) return;

    const state = loadState();
    if (state) {
      if (state.finished) {
        setIsFinished(true);
        setRemaining(0);
        // Check if this was due to tampering
        const raw = localStorage.getItem(STORAGE_KEY);
        const hash = localStorage.getItem(HASH_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (!parsed.finished && hash !== computeHash(parsed)) {
              setTampered(true);
            }
          } catch {}
        }
        return;
      }
      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      const left = Math.max(0, TOTAL_SECONDS - elapsed);
      setRemaining(left);
      if (left === 0) {
        setIsFinished(true);
        saveState({ ...state, finished: true });
      }
    } else {
      const newState: TimerState = { startedAt: Date.now(), finished: false };
      saveState(newState);
      setRemaining(TOTAL_SECONDS);
    }
  }, [examStarted]);

  // Tick every second
  useEffect(() => {
    if (!examStarted || isFinished) return;

    intervalRef.current = window.setInterval(() => {
      const state = loadState();
      if (!state) return;

      // If hash was tampered
      if (state.finished && !isFinished) {
        setIsFinished(true);
        setRemaining(0);
        setTampered(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      const left = Math.max(0, TOTAL_SECONDS - elapsed);
      setRemaining(left);
      if (left === 0) {
        setIsFinished(true);
        saveState({ ...state, finished: true });
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [examStarted, isFinished]);

  const finishExam = useCallback(() => {
    setIsFinished(true);
    setRemaining(0);
    const state = loadState();
    if (state) {
      saveState({ ...state, finished: true });
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HASH_KEY);
    setIsFinished(false);
    setTampered(false);
    setRemaining(TOTAL_SECONDS);
  }, []);

  const formatTime = useCallback((secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    remaining,
    isFinished,
    tampered,
    formatted: formatTime(remaining),
    finishExam,
    resetTimer,
    totalSeconds: TOTAL_SECONDS,
  };
}
