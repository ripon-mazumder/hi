import { useState, useEffect, useCallback, useRef } from "react";

const VIOLATIONS_KEY = "hindu_exam_violations";
const MAX_VIOLATIONS = 5;

export interface Violation {
  type: string;
  message: string;
  timestamp: number;
}

export function useAntiCheat(examStarted: boolean, submitted: boolean) {
  const [violations, setViolations] = useState<Violation[]>(() => {
    try {
      const raw = localStorage.getItem(VIOLATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const warningTimeoutRef = useRef<number | null>(null);

  const addViolation = useCallback(
    (type: string, message: string) => {
      if (submitted) return;
      const newViolation: Violation = { type, message, timestamp: Date.now() };
      setViolations((prev) => {
        const updated = [...prev, newViolation];
        localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(updated));
        if (updated.length >= MAX_VIOLATIONS) {
          setShouldAutoSubmit(true);
        }
        return updated;
      });
      setWarningMessage(message);
      setShowWarning(true);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = window.setTimeout(() => {
        setShowWarning(false);
      }, 4000);
    },
    [submitted]
  );

  // 1. Tab/Window visibility change detection
  useEffect(() => {
    if (!examStarted || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        addViolation(
          "tab_switch",
          "⚠️ আপনি অন্য ট্যাবে গেছেন! এটি নিষিদ্ধ। সতর্কতা রেকর্ড করা হয়েছে।"
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [examStarted, submitted, addViolation]);

  // 2. Window blur (switching to another app)
  useEffect(() => {
    if (!examStarted || submitted) return;
    const handleBlur = () => {
      addViolation(
        "window_blur",
        "⚠️ আপনি এই উইন্ডো থেকে বের হয়েছেন! সতর্কতা রেকর্ড করা হয়েছে।"
      );
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [examStarted, submitted, addViolation]);

  // 3. Disable right-click context menu
  useEffect(() => {
    if (!examStarted) return;
    const handleContext = (e: MouseEvent) => {
      e.preventDefault();
      if (!submitted) {
        addViolation("right_click", "⚠️ রাইট ক্লিক নিষিদ্ধ!");
      }
      return false;
    };
    document.addEventListener("contextmenu", handleContext);
    return () => document.removeEventListener("contextmenu", handleContext);
  }, [examStarted, submitted, addViolation]);

  // 4. Disable keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+C, Ctrl+A, Ctrl+P)
  useEffect(() => {
    if (!examStarted) return;
    const handleKeydown = (e: KeyboardEvent) => {
      // F12 - DevTools
      if (e.key === "F12") {
        e.preventDefault();
        if (!submitted) addViolation("devtools_f12", "⚠️ DevTools খোলার চেষ্টা! এটি নিষিদ্ধ।");
        return false;
      }
      // Ctrl+Shift+I - DevTools
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        if (!submitted) addViolation("devtools_shortcut", "⚠️ DevTools খোলার চেষ্টা! এটি নিষিদ্ধ।");
        return false;
      }
      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault();
        if (!submitted) addViolation("console_shortcut", "⚠️ Console খোলার চেষ্টা! এটি নিষিদ্ধ।");
        return false;
      }
      // Ctrl+Shift+C - Element picker
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        if (!submitted) addViolation("element_picker", "⚠️ Element Inspector নিষিদ্ধ!");
        return false;
      }
      // Ctrl+U - View source
      if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        if (!submitted) addViolation("view_source", "⚠️ সোর্স কোড দেখা নিষিদ্ধ!");
        return false;
      }
      // Ctrl+S - Save
      if (e.ctrlKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        return false;
      }
      // Ctrl+C - Copy
      if (e.ctrlKey && (e.key === "C" || e.key === "c") && !e.shiftKey) {
        e.preventDefault();
        if (!submitted) addViolation("copy", "⚠️ কপি করা নিষিদ্ধ!");
        return false;
      }
      // Ctrl+A - Select all
      if (e.ctrlKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        return false;
      }
      // Ctrl+P - Print
      if (e.ctrlKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        if (!submitted) addViolation("print", "⚠️ প্রিন্ট করা নিষিদ্ধ!");
        return false;
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [examStarted, submitted, addViolation]);

  // 5. Detect DevTools by window size (outer vs inner)
  useEffect(() => {
    if (!examStarted || submitted) return;
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        addViolation(
          "devtools_resize",
          "⚠️ DevTools খোলা আছে! অনুগ্রহ করে বন্ধ করুন। সতর্কতা রেকর্ড করা হয়েছে।"
        );
      }
    };
    const interval = window.setInterval(checkDevTools, 3000);
    return () => clearInterval(interval);
  }, [examStarted, submitted, addViolation]);

  // 6. Disable text selection via CSS
  useEffect(() => {
    if (!examStarted) return;
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    (document.body.style as any).msUserSelect = "none";
    (document.body.style as any).MozUserSelect = "none";
    return () => {
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [examStarted]);

  // 7. Disable drag
  useEffect(() => {
    if (!examStarted) return;
    const handleDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("dragstart", handleDrag);
    document.addEventListener("drop", handleDrag);
    return () => {
      document.removeEventListener("dragstart", handleDrag);
      document.removeEventListener("drop", handleDrag);
    };
  }, [examStarted]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  const resetViolations = useCallback(() => {
    setViolations([]);
    localStorage.removeItem(VIOLATIONS_KEY);
    setShouldAutoSubmit(false);
  }, []);

  return {
    violations,
    violationCount: violations.length,
    showWarning,
    warningMessage,
    shouldAutoSubmit,
    maxViolations: MAX_VIOLATIONS,
    dismissWarning,
    resetViolations,
  };
}
