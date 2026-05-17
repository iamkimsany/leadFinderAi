"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { id: 0, label: "Running Google search (Apify)...", icon: "🔍", duration: 8000 },
  { id: 1, label: "Collecting live results...", icon: "🌐", duration: 3000 },
  { id: 2, label: "GPT-4o analyzing leads...", icon: "🤖", duration: 5000 },
  { id: 3, label: "Scoring & ranking results...", icon: "📊", duration: 3000 },
];

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dots, setDots] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Progress through steps
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;

    STEPS.forEach((step, idx) => {
      const startTimer = setTimeout(() => {
        setCurrentStep(idx);
      }, cumulative);

      cumulative += step.duration;

      const completeTimer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, idx]);
      }, cumulative);

      timers.push(startTimer, completeTimer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.min(
    (completedSteps.length / STEPS.length) * 100 + 5,
    99
  );

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-10">
      {/* Animated orb */}
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-600/40 animate-pulse-slow">
          <span className="text-5xl">{STEPS[currentStep]?.icon ?? "✦"}</span>
        </div>
        {/* Orbit rings */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary-500/20 animate-ping"
          style={{ animationDuration: "2s" }}
        />
        <div
          className="absolute -inset-4 rounded-full border border-primary-500/10 animate-ping"
          style={{ animationDuration: "3s" }}
        />
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          Finding your leads{dots}
        </h3>
        <p className="text-white/40 text-sm">
          Apify Google Search → GPT-4o analysis in real time
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs text-white/30 mb-2">
          <span>{Math.round(progressPercent)}% complete</span>
          <span>{elapsed}s elapsed</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full progress-bar rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="w-full max-w-md space-y-3">
        {STEPS.map((step, idx) => {
          const isDone = completedSteps.includes(idx);
          const isActive = currentStep === idx && !isDone;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                isDone
                  ? "bg-accent/10 border border-accent/20"
                  : isActive
                  ? "bg-primary-600/15 border border-primary-500/30"
                  : "bg-white/3 border border-white/5 opacity-40"
              }`}
            >
              {/* Status icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isDone
                    ? "bg-accent text-white"
                    : isActive
                    ? "bg-primary-600 text-white"
                    : "bg-white/10 text-white/30"
                }`}
              >
                {isDone ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isActive ? (
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                )}
              </div>

              {/* Label */}
              <span
                className={`font-medium text-sm flex-1 ${
                  isDone
                    ? "text-accent"
                    : isActive
                    ? "text-white"
                    : "text-white/30"
                }`}
              >
                {step.icon} {step.label}
              </span>

              {isDone && (
                <span className="text-accent text-xs font-semibold">Done</span>
              )}
              {isActive && (
                <span className="text-primary-400 text-xs font-semibold animate-pulse">
                  Running
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-white/25 text-xs text-center max-w-xs">
        This usually takes 15–40 seconds depending on how many leads you
        requested
      </p>
    </div>
  );
}
