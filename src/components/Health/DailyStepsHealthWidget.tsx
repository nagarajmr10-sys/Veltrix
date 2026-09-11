import React, { useState } from 'react';
import {
  Footprints,
  Heart,
  Moon,
  Flame,
  Droplets,
  ChevronRight,
  Plus,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Watch,
  Activity as ActivityIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AthleteProfile, HealthBiometricDay } from '../../types';

interface DailyStepsHealthWidgetProps {
  profile: AthleteProfile;
  todayHealth: HealthBiometricDay;
  onOpenFullTracker: () => void;
  onQuickAddSteps?: (stepsToAdd: number) => void;
  onQuickAddWater?: (mlToAdd: number) => void;
}

export const DailyStepsHealthWidget: React.FC<DailyStepsHealthWidgetProps> = ({
  profile,
  todayHealth,
  onOpenFullTracker,
  onQuickAddSteps,
  onQuickAddWater,
}) => {
  const [justCelebrated, setJustCelebrated] = useState(false);

  const steps = todayHealth.steps ?? profile.todaySteps ?? 9420;
  const stepGoal = todayHealth.stepGoal ?? profile.dailyStepGoal ?? 10000;
  const stepPct = Math.min(100, Math.round((steps / stepGoal) * 100));
  const remainingSteps = Math.max(0, stepGoal - steps);
  const distanceKm = todayHealth.walkingDistanceKm ?? Number(((steps * 0.78) / 1000).toFixed(1));
  const activeCalories = todayHealth.caloriesBurned ?? Math.round(steps * 0.043 + 420);
  const recoveryScore = todayHealth.recoveryScore ?? 88;

  // Circular ring calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stepPct / 100) * circumference;

  const handleQuickAdd = (amount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickAddSteps) {
      onQuickAddSteps(amount);
    }
    if (steps + amount >= stepGoal && !justCelebrated) {
      setJustCelebrated(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      setTimeout(() => setJustCelebrated(false), 5000);
    }
  };

  const handleWaterAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickAddWater) {
      onQuickAddWater(250);
    }
  };

  return (
    <div
      id="daily-steps-health-quick-widget"
      onClick={onOpenFullTracker}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 hover:border-orange-500/50 p-4 sm:p-5 transition shadow-lg hover:shadow-orange-500/10"
      role="button"
      tabIndex={0}
      aria-label="Open Daily Steps and Health Tracker"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenFullTracker();
        }
      }}
    >
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/15 transition" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Steps Progress Ring & Key Walk Stats */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Circular SVG Ring */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-neutral-800"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-orange-500 transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Footprints className="w-4 h-4 text-orange-400 mb-0.5" />
              <span className="text-xs font-mono font-bold text-white leading-none">
                {stepPct}%
              </span>
            </div>
          </div>

          {/* Steps Numbers & Title */}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                Daily Steps
              </span>
              {remainingSteps === 0 ? (
                <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Goal Hit!
                </span>
              ) : (
                <span className="text-[11px] font-mono text-neutral-400">
                  {remainingSteps.toLocaleString()} to goal
                </span>
              )}
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {steps.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                / {stepGoal.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400 font-mono">
              <span>{distanceKm} km walked</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="w-3 h-3" />
                {activeCalories} kcal
              </span>
            </div>
          </div>
        </div>

        {/* Center: Health & Recovery Snapshot */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 py-2 sm:py-0 border-y sm:border-y-0 lg:border-x border-neutral-800 lg:px-6">
          {/* Recovery Score */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase text-neutral-400">
              <Heart className="w-3 h-3 text-rose-400" />
              <span>Readiness</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
              {recoveryScore}
              <span className="text-[10px] text-neutral-400">/100</span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold uppercase ${
                recoveryScore >= 75
                  ? 'text-emerald-400'
                  : recoveryScore >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {recoveryScore >= 75 ? 'Prime' : recoveryScore >= 60 ? 'Moderate' : 'Fatigued'}
            </span>
          </div>

          {/* HRV Status */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase text-neutral-400">
              <ActivityIcon className="w-3 h-3 text-emerald-400" />
              <span>HRV</span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
              {todayHealth.hrvRmssd}
              <span className="text-[10px] text-neutral-400"> ms</span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400">
              Base {todayHealth.hrvBaseline}ms
            </span>
          </div>

          {/* Sleep & Hydration */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase text-neutral-400">
              <Moon className="w-3 h-3 text-indigo-400" />
              <span>Sleep</span>
            </div>
            <div className="text-base sm:text-lg font-black text-indigo-300 font-mono mt-0.5">
              {todayHealth.sleepHours}
              <span className="text-[10px] text-neutral-400"> hrs</span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400">
              {todayHealth.sleepQualityScore}% score
            </span>
          </div>
        </div>

        {/* Right Side: Quick Step Actions & Deep Link */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5">
          {/* Quick Increment Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="quick-add-500-steps"
              onClick={(e) => handleQuickAdd(500, e)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 hover:border-orange-500/50 text-white hover:text-orange-400 text-xs font-mono font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation"
              title="Quickly add 500 steps from recent walk"
            >
              <Plus className="w-3 h-3" />
              <span>500</span>
            </button>
            <button
              type="button"
              id="quick-add-1000-steps"
              onClick={(e) => handleQuickAdd(1000, e)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 hover:border-orange-500/50 text-white hover:text-orange-400 text-xs font-mono font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation"
              title="Quickly add 1,000 steps from recent walk"
            >
              <Plus className="w-3 h-3" />
              <span>1k</span>
            </button>
            <button
              type="button"
              id="quick-add-water-250"
              onClick={handleWaterAdd}
              className="px-2.5 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/50 hover:border-sky-500 text-sky-300 text-xs font-mono font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation"
              title="Quickly log +250ml water intake"
            >
              <Droplets className="w-3 h-3 text-sky-400" />
              <span>+250ml</span>
            </button>
          </div>

          {/* Navigate to Full Tracker Button */}
          <button
            type="button"
            id="view-full-health-tracker-btn"
            onClick={onOpenFullTracker}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider transition shadow-md shadow-orange-500/20 active:scale-95 shrink-0 touch-manipulation"
          >
            <span>Full Tracker</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
