import { useState, useEffect, useCallback } from "react";
import { mcqQuestions, creativeQuestions, getAllCorrectAnswers } from "./data/questions";
import { useTimer } from "./hooks/useTimer";
import { useAntiCheat } from "./hooks/useAntiCheat";

const ANSWERS_KEY = "hindu_exam_answers";
const SUBMITTED_KEY = "hindu_exam_submitted";
const TAB_KEY = "hindu_exam_tab";
const STARTED_KEY = "hindu_exam_started";

const optionLabels = ["ক", "খ", "গ", "ঘ"];

type Tab = "mcq" | "creative" | "result";

export default function App() {
  const [examStarted, setExamStarted] = useState(() => {
    return localStorage.getItem(STARTED_KEY) === "true";
  });
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    try {
      const raw = localStorage.getItem(ANSWERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [submitted, setSubmitted] = useState(() => {
    return localStorage.getItem(SUBMITTED_KEY) === "true";
  });
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_KEY) as Tab | null;
    return saved || "mcq";
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentCQ, setCurrentCQ] = useState(0);

  const { remaining, isFinished, tampered, formatted, finishExam, resetTimer, totalSeconds } =
    useTimer(examStarted);

  const {
    violations,
    violationCount,
    showWarning,
    warningMessage,
    shouldAutoSubmit,
    maxViolations,
    dismissWarning,
    resetViolations,
  } = useAntiCheat(examStarted, submitted);

  // Auto-submit when time runs out
  useEffect(() => {
    if (isFinished && examStarted && !submitted) {
      setSubmitted(true);
      localStorage.setItem(SUBMITTED_KEY, "true");
      setActiveTab("result");
      localStorage.setItem(TAB_KEY, "result");
    }
  }, [isFinished, examStarted, submitted]);

  // Auto-submit on too many violations
  useEffect(() => {
    if (shouldAutoSubmit && examStarted && !submitted) {
      setSubmitted(true);
      localStorage.setItem(SUBMITTED_KEY, "true");
      finishExam();
      setActiveTab("result");
      localStorage.setItem(TAB_KEY, "result");
    }
  }, [shouldAutoSubmit, examStarted, submitted, finishExam]);

  // Persist answers
  useEffect(() => {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
  }, [answers]);

  // Persist tab
  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  const handleSelectAnswer = useCallback(
    (qId: number, optIndex: number) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [qId]: optIndex }));
    },
    [submitted]
  );

  const handleSubmit = () => {
    setSubmitted(true);
    localStorage.setItem(SUBMITTED_KEY, "true");
    finishExam();
    setActiveTab("result");
    localStorage.setItem(TAB_KEY, "result");
    setShowConfirm(false);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setExamStarted(false);
    setActiveTab("mcq");
    localStorage.removeItem(ANSWERS_KEY);
    localStorage.removeItem(SUBMITTED_KEY);
    localStorage.removeItem(TAB_KEY);
    localStorage.removeItem(STARTED_KEY);
    resetTimer();
    resetViolations();
  };

  const startExam = () => {
    setExamStarted(true);
    localStorage.setItem(STARTED_KEY, "true");
  };

  // Calculate score (only after submission)
  const correctAnswers = submitted ? getAllCorrectAnswers() : {};
  const score = submitted
    ? mcqQuestions.reduce((acc, q) => {
        return acc + (answers[q.id] === correctAnswers[q.id] ? 1 : 0);
      }, 0)
    : 0;
  const totalAnswered = Object.keys(answers).length;

  const timerPercent = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
  const isLow = remaining < 300;
  const isCritical = remaining < 60;

  // Welcome screen
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-orange-100">
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 h-2" />
            <div className="p-8 md:p-12 text-center">
              <div className="text-7xl mb-4 animate-pulse">🕉️</div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 leading-relaxed">
                হিন্দু ধর্ম ও নৈতিক শিক্ষা
              </h1>
              <p className="text-lg text-orange-600 font-semibold mb-6">
                উপাসনা • ঈশ্বর • ভগবান • অবতার • দেব-দেবী
              </p>

              <div className="bg-orange-50 rounded-2xl p-6 mb-6 text-left space-y-3 border border-orange-100">
                <h3 className="font-bold text-gray-700 text-center text-lg mb-4">
                  📋 পরীক্ষার নিয়মাবলী
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">✦</span>
                    <span>বহুনির্বাচনি প্রশ্ন: <strong>৩০টি</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">✦</span>
                    <span>প্রতিটি MCQ: <strong>১ নম্বর</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">✦</span>
                    <span>সৃজনশীল প্রশ্ন: <strong>৫টি</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">✦</span>
                    <span>সময়: <strong>১ ঘণ্টা ৫০ মিনিট</strong></span>
                  </div>
                </div>
              </div>

              {/* Anti-cheat warning box */}
              <div className="bg-red-50 rounded-2xl p-5 mb-8 text-left border border-red-200">
                <h3 className="font-bold text-red-700 text-center text-base mb-3">
                  🛡️ অ্যান্টি-চিটিং সিস্টেম সক্রিয়
                </h3>
                <div className="text-sm text-red-600 space-y-2">
                  <p>🚫 ব্রাউজার রিফ্রেশ করলে সময় পুনরায় শুরু হবে না</p>
                  <p>🚫 অন্য ট্যাবে গেলে বা উইন্ডো পরিবর্তন করলে সতর্কতা রেকর্ড হবে</p>
                  <p>🚫 রাইট ক্লিক, কপি-পেস্ট, DevTools সম্পূর্ণ নিষিদ্ধ</p>
                  <p>🚫 সোর্স কোড / Inspect Element দেখা যাবে না</p>
                  <p>🚫 Timer পরিবর্তনের চেষ্টা করলে পরীক্ষা বাতিল হবে</p>
                  <p className="font-bold text-red-800 pt-1">
                    ⚡ {maxViolations} বার নিয়ম ভঙ্গ করলে পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে!
                  </p>
                </div>
              </div>

              <button
                onClick={startExam}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-4 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
              >
                🙏 পরীক্ষা শুরু করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 select-none">
      {/* Anti-cheat warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-red-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={dismissWarning}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-bounce-once border-4 border-red-500" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-6xl mb-3">🚨</div>
              <h3 className="text-xl font-bold text-red-700 mb-3">
                সতর্কতা!
              </h3>
              <p className="text-red-600 mb-4 text-sm leading-relaxed">{warningMessage}</p>
              <div className="bg-red-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-800">
                  সতর্কতা: <span className="font-bold text-2xl">{violationCount}</span> / {maxViolations}
                </p>
                <div className="mt-2 h-3 bg-red-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${(violationCount / maxViolations) * 100}%` }}
                  />
                </div>
                {violationCount >= maxViolations - 1 && (
                  <p className="text-xs text-red-700 font-bold mt-2 animate-pulse">
                    ⚠️ আরও ১ বার নিয়ম ভঙ্গ করলে পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে!
                  </p>
                )}
              </div>
              <button
                onClick={dismissWarning}
                className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 transition"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer tampered overlay */}
      {tampered && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-4 border-red-600">
            <div className="text-center">
              <div className="text-7xl mb-4">⛔</div>
              <h3 className="text-2xl font-bold text-red-700 mb-3">
                টাইমার পরিবর্তন শনাক্ত!
              </h3>
              <p className="text-red-600 mb-6">
                আপনি localStorage-এর মাধ্যমে টাইমার পরিবর্তনের চেষ্টা করেছেন।
                এটি গুরুতর নিয়ম ভঙ্গ। পরীক্ষা বাতিল করা হয়েছে।
              </p>
              <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700">
                <p>🔒 সকল উত্তর জমা হয়ে গেছে</p>
                <p>🔒 সময় ০:০০:০০</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-md border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl flex-shrink-0">🕉️</span>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-gray-800 truncate">
                  হিন্দু ধর্ম ও নৈতিক শিক্ষা
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 hidden md:block">
                    উপাসনা • ঈশ্বর • ভগবান • অবতার
                  </p>
                  {/* Violation indicator */}
                  {!submitted && violationCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      ⚠️ {violationCount}/{maxViolations}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Timer + Shield */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Anti-cheat shield */}
              {!submitted && (
                <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-green-100 rounded-lg">
                  <span className="text-sm">🛡️</span>
                  <span className="text-xs text-green-700 font-bold">সুরক্ষিত</span>
                </div>
              )}
              <div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold ${
                    isCritical
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : isLow
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  <span className="text-base">⏱️</span>
                  <span>{formatted}</span>
                </div>
                <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isCritical
                        ? "bg-red-500"
                        : isLow
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setActiveTab("mcq")}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "mcq"
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-orange-100"
              }`}
            >
              📝 বহুনির্বাচনি ({totalAnswered}/৩০)
            </button>
            <button
              onClick={() => setActiveTab("creative")}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "creative"
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-orange-100"
              }`}
            >
              📖 সৃজনশীল (৫টি)
            </button>
            {submitted && (
              <button
                onClick={() => setActiveTab("result")}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "result"
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-orange-100"
                }`}
              >
                📊 ফলাফল
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-32">
        {activeTab === "mcq" && (
          <MCQSection
            answers={answers}
            onSelect={handleSelectAnswer}
            submitted={submitted}
          />
        )}
        {activeTab === "creative" && (
          <CreativeSection
            currentCQ={currentCQ}
            setCurrentCQ={setCurrentCQ}
          />
        )}
        {activeTab === "result" && submitted && (
          <ResultSection
            answers={answers}
            score={score}
            violationCount={violationCount}
            violations={violations}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Bottom bar - submit button */}
      {!submitted && activeTab === "mcq" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.1)] border-t border-orange-100 p-4 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-orange-600">{totalAnswered}</span>/৩০
              টি উত্তর দেওয়া হয়েছে
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all active:scale-95"
            >
              ✅ জমা দিন
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                পরীক্ষা জমা দিতে চান?
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                আপনি <strong className="text-orange-600">{totalAnswered}</strong>/৩০ টি
                প্রশ্নের উত্তর দিয়েছেন।
              </p>
              {totalAnswered < 30 && (
                <p className="text-sm text-red-500 mb-4">
                  ⚠️ {30 - totalAnswered} টি প্রশ্নের উত্তর দেওয়া হয়নি!
                </p>
              )}
              {violationCount > 0 && (
                <p className="text-sm text-red-500 mb-2">
                  🚨 সতর্কতা: {violationCount} বার নিয়ম ভঙ্গ রেকর্ড আছে
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition"
                >
                  জমা দিন ✅
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MCQ Section ─── */
function MCQSection({
  answers,
  onSelect,
  submitted,
}: {
  answers: Record<number, number>;
  onSelect: (qId: number, optIndex: number) => void;
  submitted: boolean;
}) {
  // Only get correct answers after submission
  const correctAnswers = submitted ? getAllCorrectAnswers() : {};

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 mb-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📝 বহুনির্বাচনি প্রশ্ন
          <span className="text-sm font-normal text-gray-500">
            [৩০ × ১ = ৩০]
          </span>
        </h2>
        {submitted && (
          <p className="text-sm text-green-600 mt-1 font-medium">
            ✅ সবুজ রঙে সঠিক উত্তর চিহ্নিত করা হয়েছে
          </p>
        )}
      </div>

      {/* Question navigator */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
        <p className="text-xs text-gray-500 mb-2 font-medium">দ্রুত নেভিগেশন:</p>
        <div className="flex flex-wrap gap-2">
          {mcqQuestions.map((q) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCorrect = submitted && answers[q.id] === correctAnswers[q.id];
            const isWrong =
              submitted &&
              answers[q.id] !== undefined &&
              answers[q.id] !== correctAnswers[q.id];
            return (
              <a
                key={q.id}
                href={`#q${q.id}`}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                  isCorrect
                    ? "bg-green-500 text-white"
                    : isWrong
                      ? "bg-red-500 text-white"
                      : isAnswered
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-orange-100"
                }`}
              >
                {q.id}
              </a>
            );
          })}
        </div>
      </div>

      {mcqQuestions.map((q) => (
        <QuestionCard
          key={q.id}
          q={q}
          selectedIndex={answers[q.id]}
          onSelect={onSelect}
          submitted={submitted}
          correctIndex={submitted ? correctAnswers[q.id] : undefined}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  q,
  selectedIndex,
  onSelect,
  submitted,
  correctIndex,
}: {
  q: (typeof mcqQuestions)[0];
  selectedIndex: number | undefined;
  onSelect: (qId: number, optIndex: number) => void;
  submitted: boolean;
  correctIndex: number | undefined;
}) {
  const isCorrectAnswer = submitted && selectedIndex === correctIndex;
  const isWrongAnswer =
    submitted && selectedIndex !== undefined && selectedIndex !== correctIndex;

  return (
    <div
      id={`q${q.id}`}
      className={`bg-white rounded-2xl shadow-sm border-2 transition-all overflow-hidden ${
        submitted
          ? isCorrectAnswer
            ? "border-green-300"
            : isWrongAnswer
              ? "border-red-300"
              : "border-orange-200"
          : selectedIndex !== undefined
            ? "border-orange-300"
            : "border-gray-100"
      }`}
    >
      {/* Question header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
            submitted
              ? isCorrectAnswer
                ? "bg-green-100 text-green-700"
                : isWrongAnswer
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {q.id}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 font-medium leading-relaxed">{q.question}</p>
          <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            {q.board}
          </span>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 pb-4">
        {q.options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = submitted && correctIndex === i;

          let classes =
            "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all text-left ";

          if (submitted) {
            if (isCorrect) {
              classes +=
                "border-green-400 bg-green-50 text-green-800 font-semibold";
            } else if (isSelected && !isCorrect) {
              classes += "border-red-400 bg-red-50 text-red-700 line-through";
            } else {
              classes += "border-gray-100 bg-gray-50 text-gray-500";
            }
          } else {
            if (isSelected) {
              classes +=
                "border-orange-400 bg-orange-50 text-orange-800 shadow-sm";
            } else {
              classes +=
                "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50";
            }
          }

          return (
            <button
              key={i}
              onClick={() => !submitted && onSelect(q.id, i)}
              disabled={submitted}
              className={classes}
            >
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  submitted
                    ? isCorrect
                      ? "border-green-500 bg-green-500 text-white"
                      : isSelected
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-gray-300 text-gray-400"
                    : isSelected
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-gray-300 text-gray-500"
                }`}
              >
                {submitted && isCorrect ? "✓" : optionLabels[i]}
              </span>
              <span className="text-sm">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Result indicator */}
      {submitted && correctIndex !== undefined && (
        <div
          className={`px-4 py-2 text-xs font-medium ${
            isCorrectAnswer
              ? "bg-green-50 text-green-700"
              : isWrongAnswer
                ? "bg-red-50 text-red-700"
                : "bg-orange-50 text-orange-600"
          }`}
        >
          {isCorrectAnswer
            ? "✅ সঠিক উত্তর!"
            : isWrongAnswer
              ? `❌ ভুল — সঠিক উত্তর: ${optionLabels[correctIndex]}) ${q.options[correctIndex]}`
              : `⚠️ উত্তর দেওয়া হয়নি — সঠিক উত্তর: ${optionLabels[correctIndex]}) ${q.options[correctIndex]}`}
        </div>
      )}
    </div>
  );
}

/* ─── Creative Section ─── */
function CreativeSection({
  currentCQ,
  setCurrentCQ,
}: {
  currentCQ: number;
  setCurrentCQ: (n: number) => void;
}) {
  const q = creativeQuestions[currentCQ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📖 সৃজনশীল প্রশ্ন
          <span className="text-sm font-normal text-gray-500">
            (বিভিন্ন বোর্ড ২০২৪)
          </span>
        </h2>
      </div>

      {/* CQ Navigator */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {creativeQuestions.map((cq, i) => (
          <button
            key={cq.id}
            onClick={() => setCurrentCQ(i)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              currentCQ === i
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
            }`}
          >
            প্রশ্ন {cq.id}
          </button>
        ))}
      </div>

      {/* Current CQ */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
          <div className="flex items-center justify-between text-white">
            <h3 className="font-bold">প্রশ্ন {q.id}</h3>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">
              {q.board}
            </span>
          </div>
        </div>

        {/* Stimulus */}
        <div className="p-4 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-600 font-semibold mb-2">📜 উদ্দীপক:</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {q.stimulus}
          </p>
        </div>

        {/* Parts */}
        <div className="divide-y divide-gray-100">
          {q.parts.map((part) => (
            <div key={part.label} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center text-sm font-bold">
                  {part.label}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        part.label === "ক"
                          ? "bg-blue-100 text-blue-700"
                          : part.label === "খ"
                            ? "bg-purple-100 text-purple-700"
                            : part.label === "গ"
                              ? "bg-teal-100 text-teal-700"
                              : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {part.type}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {part.marks} নম্বর
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {part.question}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentCQ(Math.max(0, currentCQ - 1))}
          disabled={currentCQ === 0}
          className={`px-5 py-2 rounded-xl font-semibold text-sm transition ${
            currentCQ === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50"
          }`}
        >
          ← পূর্ববর্তী
        </button>
        <button
          onClick={() =>
            setCurrentCQ(Math.min(creativeQuestions.length - 1, currentCQ + 1))
          }
          disabled={currentCQ === creativeQuestions.length - 1}
          className={`px-5 py-2 rounded-xl font-semibold text-sm transition ${
            currentCQ === creativeQuestions.length - 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50"
          }`}
        >
          পরবর্তী →
        </button>
      </div>
    </div>
  );
}

/* ─── Result Section ─── */
function ResultSection({
  answers,
  score,
  violationCount,
  violations,
  onReset,
}: {
  answers: Record<number, number>;
  score: number;
  violationCount: number;
  violations: { type: string; message: string; timestamp: number }[];
  onReset: () => void;
}) {
  const correctAnswers = getAllCorrectAnswers();
  const total = mcqQuestions.length;
  const answered = Object.keys(answers).length;
  const wrong = answered - score;
  const unanswered = total - answered;
  const percentage = Math.round((score / total) * 100);

  const getGrade = () => {
    if (percentage >= 80) return { label: "A+ (অসাধারণ!)", color: "text-green-600", emoji: "🏆" };
    if (percentage >= 70) return { label: "A (চমৎকার!)", color: "text-green-500", emoji: "🌟" };
    if (percentage >= 60) return { label: "A- (খুব ভালো!)", color: "text-blue-600", emoji: "👏" };
    if (percentage >= 50) return { label: "B (ভালো)", color: "text-blue-500", emoji: "👍" };
    if (percentage >= 40) return { label: "C (মোটামুটি)", color: "text-amber-600", emoji: "📚" };
    if (percentage >= 33) return { label: "D (পাস)", color: "text-orange-600", emoji: "✏️" };
    return { label: "F (আরও চেষ্টা করো)", color: "text-red-600", emoji: "💪" };
  };

  const grade = getGrade();

  const violationTypeLabels: Record<string, string> = {
    tab_switch: "ট্যাব পরিবর্তন",
    window_blur: "উইন্ডো পরিবর্তন",
    right_click: "রাইট ক্লিক",
    devtools_f12: "DevTools (F12)",
    devtools_shortcut: "DevTools শর্টকাট",
    console_shortcut: "Console শর্টকাট",
    element_picker: "Element Inspector",
    view_source: "সোর্স কোড দেখা",
    copy: "কপি করা",
    print: "প্রিন্ট করা",
    devtools_resize: "DevTools শনাক্ত",
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className="bg-white rounded-3xl shadow-lg border border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 h-2" />
        <div className="p-6 md:p-8 text-center">
          <div className="text-6xl mb-4">{grade.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">পরীক্ষার ফলাফল</h2>
          <p className={`text-lg font-bold ${grade.color}`}>{grade.label}</p>

          {/* Score circle */}
          <div className="relative w-40 h-40 mx-auto my-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#f3f4f6"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={percentage >= 50 ? "#22c55e" : percentage >= 33 ? "#f59e0b" : "#ef4444"}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(percentage / 100) * 264} 264`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-800">{score}</span>
              <span className="text-sm text-gray-500">/ {total}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-600">{score}</div>
              <div className="text-xs text-green-600">সঠিক ✅</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{wrong}</div>
              <div className="text-xs text-red-600">ভুল ❌</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-500">{unanswered}</div>
              <div className="text-xs text-gray-500">এড়িয়ে গেছ ⚠️</div>
            </div>
          </div>
        </div>
      </div>

      {/* Violation Report */}
      {violationCount > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-500 px-4 py-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              🚨 নিয়ম ভঙ্গের রিপোর্ট
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                {violationCount} বার
              </span>
            </h3>
          </div>
          <div className="divide-y divide-red-50">
            {violations.map((v, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-700 font-medium">
                    {violationTypeLabels[v.type] || v.type}
                  </p>
                  <p className="text-xs text-red-400">
                    {new Date(v.timestamp).toLocaleTimeString("bn-BD")}
                  </p>
                </div>
                <span className="text-red-400 text-lg">⚠️</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer Review */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          📋 উত্তরপত্র পর্যালোচনা
        </h3>
        <div className="space-y-2">
          {mcqQuestions.map((q) => {
            const userAns = answers[q.id];
            const correctIdx = correctAnswers[q.id];
            const isCorrect = userAns === correctIdx;
            const isAnswered = userAns !== undefined;

            return (
              <div
                key={q.id}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                  isCorrect
                    ? "bg-green-50 border border-green-200"
                    : isAnswered
                      ? "bg-red-50 border border-red-200"
                      : "bg-gray-50 border border-gray-200"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCorrect
                      ? "bg-green-500 text-white"
                      : isAnswered
                        ? "bg-red-500 text-white"
                        : "bg-gray-300 text-white"
                  }`}
                >
                  {q.id}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 truncate block">
                    {q.question.length > 50 ? q.question.slice(0, 50) + "..." : q.question}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAnswered && (
                    <span
                      className={`text-xs px-2 py-1 rounded-md ${
                        isCorrect
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800 line-through"
                      }`}
                    >
                      {optionLabels[userAns]}
                    </span>
                  )}
                  {!isCorrect && correctIdx !== undefined && (
                    <span className="text-xs px-2 py-1 rounded-md bg-green-200 text-green-800 font-bold">
                      {optionLabels[correctIdx]}
                    </span>
                  )}
                  <span>{isCorrect ? "✅" : isAnswered ? "❌" : "⚠️"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset button */}
      <div className="text-center pb-8">
        <button
          onClick={onReset}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
        >
          🔄 আবার পরীক্ষা দিন
        </button>
        <p className="text-xs text-gray-500 mt-2">
          এটি সময়, উত্তর ও সকল সতর্কতা রিসেট করবে
        </p>
      </div>
    </div>
  );
}
