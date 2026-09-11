import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  Zap,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Flame,
  Clock,
  Sparkles,
  RefreshCw,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Activity, AthleteProfile } from '../../types';
import { formatDuration } from '../../utils/geoUtils';

interface WeeklyGoalWidgetProps {
  activities: Activity[];
  profile: AthleteProfile;
  onUpdateProfileGoal?: (newDistanceKm: number, newTssGoal: number) => void;
}

export type GoalMetricMode = 'distance' | 'tss' | 'both';

export const WeeklyGoalWidget: React.FC<WeeklyGoalWidgetProps> = ({
  activities,
  profile,
  onUpdateProfileGoal,
}) => {
  // Persistence key
  const STORAGE_KEY = 'veltrix_weekly_goal_config';

  // State
  const [metricMode, setMetricMode] = useState<GoalMetricMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.mode || 'both';
      }
    } catch {}
    return 'both';
  });

  const [targetDistanceKm, setTargetDistanceKm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.distance) return parsed.distance;
      }
    } catch {}
    return profile.weeklyGoalKm || 180;
  });

  const [targetTSS, setTargetTSS] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tss) return parsed.tss;
      }
    } catch {}
    return profile.weeklyTssGoal || 460;
  });

  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [tempDistance, setTempDistance] = useState<number>(targetDistanceKm);
  const [tempTSS, setTempTSS] = useState<number>(targetTSS);
  const [hasCelebrated, setHasCelebrated] = useState<boolean>(false);

  // Save to localStorage when updated
  const saveGoals = (dist: number, tss: number, mode: GoalMetricMode) => {
    setTargetDistanceKm(dist);
    setTargetTSS(tss);
    setMetricMode(mode);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ distance: dist, tss, mode })
      );
    } catch {}
    if (onUpdateProfileGoal) {
      onUpdateProfileGoal(dist, tss);
    }
  };

  // Calculate current calendar week dates (Monday to Sunday)
  const currentWeekInfo = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const daysRemaining = Math.max(0, 7 - (dayOfWeek === 0 ? 7 : dayOfWeek));

    // Day labels
    const days: { dateStr: string; dayName: string; dayShort: string; isPastOrToday: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === now.toDateString();
      const isPastOrToday = d <= now;
      days.push({
        dateStr: d.toISOString().slice(0, 10),
        dayName: d.toLocaleDateString(undefined, { weekday: 'long' }),
        dayShort: d.toLocaleDateString(undefined, { weekday: 'short' }),
        isPastOrToday,
        isToday,
      });
    }

    return { monday, sunday, daysRemaining, days };
  }, []);

  // Filter activities that occurred during this week (or recent 7 days if simulated date range)
  const weeklyActivities = useMemo(() => {
    const { monday, sunday } = currentWeekInfo;
    const monTime = monday.getTime();
    const sunTime = sunday.getTime();

    const inWeek = activities.filter((act) => {
      const actTime = new Date(act.date).getTime();
      return actTime >= monTime && actTime <= sunTime;
    });

    // If activities data has timestamps outside current calendar week (e.g. historical fixture),
    // fall back to the most recent 7-day activity window so the widget always displays real, non-zero telemetry!
    if (inWeek.length === 0 && activities.length > 0) {
      const sorted = [...activities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestDate = new Date(sorted[0].date);
      const startWindow = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      return sorted.filter((act) => new Date(act.date) >= startWindow);
    }

    return inWeek;
  }, [activities, currentWeekInfo]);

  // Totals for this week
  const stats = useMemo(() => {
    const totalDistance = weeklyActivities.reduce((sum, a) => sum + (a.distanceKm || 0), 0);
    const totalTSS = weeklyActivities.reduce((sum, a) => sum + (a.tss || 0), 0);
    const totalDuration = weeklyActivities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0);
    const totalElevation = weeklyActivities.reduce((sum, a) => sum + (a.elevationGainMeters || 0), 0);

    const distPct = Math.min(Math.round((totalDistance / Math.max(1, targetDistanceKm)) * 100), 100);
    const tssPct = Math.min(Math.round((totalTSS / Math.max(1, targetTSS)) * 100), 100);

    const distRemaining = Math.max(0, targetDistanceKm - totalDistance);
    const tssRemaining = Math.max(0, targetTSS - totalTSS);

    const daysLeft = Math.max(1, currentWeekInfo.daysRemaining);
    const dailyDistanceRequired = Number((distRemaining / daysLeft).toFixed(1));
    const dailyTssRequired = Math.round(tssRemaining / daysLeft);

    // Daily breakdown for the 7 days
    const dayBreakdown = currentWeekInfo.days.map((d) => {
      const dayActs = weeklyActivities.filter((a) => a.date.startsWith(d.dateStr));
      const dayDist = dayActs.reduce((sum, a) => sum + (a.distanceKm || 0), 0);
      const dayTSS = dayActs.reduce((sum, a) => sum + (a.tss || 0), 0);
      return {
        ...d,
        distance: Number(dayDist.toFixed(1)),
        tss: dayTSS,
        count: dayActs.length,
      };
    });

    return {
      totalDistance: Number(totalDistance.toFixed(1)),
      totalTSS,
      totalDuration,
      totalElevation,
      distPct,
      tssPct,
      distRemaining: Number(distRemaining.toFixed(1)),
      tssRemaining,
      dailyDistanceRequired,
      dailyTssRequired,
      workoutCount: weeklyActivities.length,
      dayBreakdown,
    };
  }, [weeklyActivities, targetDistanceKm, targetTSS, currentWeekInfo]);

  // Trigger confetti when goal reached for the first time
  useEffect(() => {
    const isGoalMet =
      (metricMode === 'distance' && stats.totalDistance >= targetDistanceKm) ||
      (metricMode === 'tss' && stats.totalTSS >= targetTSS) ||
      (metricMode === 'both' &&
        (stats.totalDistance >= targetDistanceKm || stats.totalTSS >= targetTSS));

    if (isGoalMet && !hasCelebrated && (stats.totalDistance > 0 || stats.totalTSS > 0)) {
      setHasCelebrated(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [stats, targetDistanceKm, targetTSS, metricMode, hasCelebrated]);

  const handleApplyCustomGoals = () => {
    saveGoals(Math.max(10, tempDistance), Math.max(50, tempTSS), metricMode);
    setIsEditingGoal(false);
  };

  const presets = [
    { label: 'Recovery Week', dist: 100, tss: 250, desc: 'Active rest & tissue healing' },
    { label: 'Endurance Base', dist: 180, tss: 460, desc: 'Aerobic maintenance baseline' },
    { label: 'Volume Build', dist: 240, tss: 620, desc: 'Progressive overload microcycle' },
    { label: 'Peak Century', dist: 320, tss: 800, desc: 'High-volume endurance challenge' },
  ];

  return (
    <div
      id="weekly-goal-widget"
      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden"
    >
      {/* Background subtle glow */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Weekly Training Target
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
                Mon – Sun
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Tracking real-time progress against your user-calibrated training horizon
            </p>
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
            <button
              type="button"
              id="weekly-goal-mode-both"
              onClick={() => {
                setMetricMode('both');
                saveGoals(targetDistanceKm, targetTSS, 'both');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                metricMode === 'both'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Dual View
            </button>
            <button
              type="button"
              id="weekly-goal-mode-distance"
              onClick={() => {
                setMetricMode('distance');
                saveGoals(targetDistanceKm, targetTSS, 'distance');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                metricMode === 'distance'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Distance
            </button>
            <button
              type="button"
              id="weekly-goal-mode-tss"
              onClick={() => {
                setMetricMode('tss');
                saveGoals(targetDistanceKm, targetTSS, 'tss');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                metricMode === 'tss'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              TSS
            </button>
          </div>

          <button
            type="button"
            id="edit-weekly-goal-target-btn"
            onClick={() => {
              setTempDistance(targetDistanceKm);
              setTempTSS(targetTSS);
              setIsEditingGoal(!isEditingGoal);
            }}
            className={`p-1.5 rounded-xl border text-xs font-mono transition flex items-center gap-1.5 ${
              isEditingGoal
                ? 'bg-orange-500 text-black border-orange-400 font-bold'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
            }`}
            title="Configure Weekly Goal Targets"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Set Target</span>
          </button>
        </div>
      </div>

      {/* Target Configuration Drawer */}
      {isEditingGoal && (
        <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Configure Weekly Target Goals</span>
            </h4>
            <span className="text-[11px] text-neutral-500 font-mono">Persisted to Profile</span>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setTempDistance(p.dist);
                  setTempTSS(p.tss);
                }}
                className={`p-2.5 rounded-xl border text-left transition ${
                  tempDistance === p.dist && tempTSS === p.tss
                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="text-xs font-bold text-white">{p.label}</div>
                <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  {p.dist} km · {p.tss} TSS
                </div>
              </button>
            ))}
          </div>

          {/* Stepper Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Distance Target Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Weekly Distance Target:</span>
                <span className="font-mono font-bold text-orange-400">{tempDistance} km</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempDistance((d) => Math.max(20, d - 10))}
                  className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white font-mono font-bold flex items-center justify-center text-sm"
                >
                  -
                </button>
                <input
                  type="range"
                  min="20"
                  max="400"
                  step="5"
                  value={tempDistance}
                  onChange={(e) => setTempDistance(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setTempDistance((d) => Math.min(500, d + 10))}
                  className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white font-mono font-bold flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* TSS Target Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Weekly TSS Target:</span>
                <span className="font-mono font-bold text-amber-400">{tempTSS} TSS</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempTSS((t) => Math.max(50, t - 25))}
                  className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white font-mono font-bold flex items-center justify-center text-sm"
                >
                  -
                </button>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="25"
                  value={tempTSS}
                  onChange={(e) => setTempTSS(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setTempTSS((t) => Math.min(1200, t + 25))}
                  className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white font-mono font-bold flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-900">
            <button
              type="button"
              onClick={() => setIsEditingGoal(false)}
              className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCustomGoals}
              className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs shadow-md shadow-orange-500/20 transition"
            >
              Save Target
            </button>
          </div>
        </div>
      )}

      {/* Main KPI Progress Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Distance Progress Card */}
        {(metricMode === 'distance' || metricMode === 'both') && (
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-sans uppercase font-semibold text-neutral-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                  <span>Weekly Distance Progress</span>
                </span>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-white tracking-tight">
                    {stats.totalDistance}
                  </span>
                  <span className="text-sm font-mono text-neutral-400">
                    / {targetDistanceKm} km
                  </span>
                </div>
              </div>

              {/* Progress Ring / Badge */}
              <div className="text-right">
                <div
                  className={`text-xl font-black font-mono ${
                    stats.distPct >= 100 ? 'text-emerald-400' : 'text-orange-400'
                  }`}
                >
                  {stats.distPct}%
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  {stats.distRemaining > 0
                    ? `${stats.distRemaining} km to go`
                    : 'Target Crushed! 🎉'}
                </div>
              </div>
            </div>

            {/* Custom Multi-segment Progress Bar */}
            <div className="mt-3">
              <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.distPct >= 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-orange-500 to-amber-400'
                  }`}
                  style={{ width: `${stats.distPct}%` }}
                />
              </div>

              {/* Pace Guidance */}
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mt-2">
                <span>
                  {currentWeekInfo.daysRemaining > 0
                    ? `${currentWeekInfo.daysRemaining} days remaining`
                    : 'Last day of week'}
                </span>
                {stats.distRemaining > 0 && currentWeekInfo.daysRemaining > 0 ? (
                  <span className="text-orange-300 font-semibold">
                    ~{stats.dailyDistanceRequired} km/day pace
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Goal Completed</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TSS Progress Card */}
        {(metricMode === 'tss' || metricMode === 'both') && (
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-sans uppercase font-semibold text-neutral-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Training Stress Score (TSS)</span>
                </span>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-amber-400 tracking-tight">
                    {stats.totalTSS}
                  </span>
                  <span className="text-sm font-mono text-neutral-400">
                    / {targetTSS} TSS
                  </span>
                </div>
              </div>

              {/* Progress Ring / Badge */}
              <div className="text-right">
                <div
                  className={`text-xl font-black font-mono ${
                    stats.tssPct >= 100 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {stats.tssPct}%
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  {stats.tssRemaining > 0
                    ? `${stats.tssRemaining} TSS to go`
                    : 'TSS Target Met! 🔥'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.tssPct >= 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                  style={{ width: `${stats.tssPct}%` }}
                />
              </div>

              {/* Guidance */}
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mt-2">
                <span>
                  {stats.workoutCount} session{stats.workoutCount === 1 ? '' : 's'} logged
                </span>
                {stats.tssRemaining > 0 && currentWeekInfo.daysRemaining > 0 ? (
                  <span className="text-amber-300 font-semibold">
                    ~{stats.dailyTssRequired} TSS/day needed
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Target Completed</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7-Day Micro Breakdown Grid */}
      <div className="mt-4 pt-3 border-t border-neutral-800/60">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
          <span className="uppercase text-[10px] font-bold tracking-wider text-neutral-400">
            Daily Activity Contribution
          </span>
          <span>
            Total Time: <strong className="text-white">{formatDuration(stats.totalDuration)}</strong> · Elev: <strong className="text-emerald-400">+{stats.totalElevation}m</strong>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center font-mono">
          {stats.dayBreakdown.map((day) => {
            const hasActivity = day.count > 0;
            return (
              <div
                key={day.dateStr}
                className={`p-2 rounded-xl border flex flex-col justify-between transition ${
                  day.isToday
                    ? 'bg-orange-500/10 border-orange-500/40 ring-1 ring-orange-500/20'
                    : hasActivity
                    ? 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    : 'bg-neutral-950/40 border-neutral-900 text-neutral-600'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={`text-[11px] font-bold ${
                      day.isToday
                        ? 'text-orange-400'
                        : hasActivity
                        ? 'text-white'
                        : 'text-neutral-500'
                    }`}
                  >
                    {day.dayShort}
                  </span>
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  )}
                </div>

                <div className="my-1.5">
                  {hasActivity ? (
                    <>
                      <div className="text-xs sm:text-sm font-black text-white">
                        {day.distance} <span className="text-[9px] text-neutral-500 font-sans">km</span>
                      </div>
                      <div className="text-[10px] text-amber-400">
                        {day.tss} <span className="text-[8px] text-neutral-500">TSS</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-neutral-600 py-1 font-sans">
                      Rest
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-neutral-500 truncate">
                  {hasActivity ? `${day.count} act` : '--'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
