import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  CalendarX,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { StructuredWorkout } from '../../types';

interface MissedWorkoutAlertProps {
  workouts: StructuredWorkout[];
  onRescheduleWorkout: (workoutId: string, newDate: string) => void;
  onToggleWorkoutCompleted: (workoutId: string) => void;
  onConvertToRestDay?: (workoutId: string) => void;
  onRemoveWorkout?: (workoutId: string) => void;
  onSimulateMissedWorkout?: () => void;
  variant?: 'banner' | 'card' | 'drawer';
  onDismiss?: () => void;
}

export const MissedWorkoutAlert: React.FC<MissedWorkoutAlertProps> = ({
  workouts,
  onRescheduleWorkout,
  onToggleWorkoutCompleted,
  onConvertToRestDay,
  onRemoveWorkout,
  onSimulateMissedWorkout,
  variant = 'banner',
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customDateWorkoutId, setCustomDateWorkoutId] = useState<string | null>(null);
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>('');
  const [dismissedWorkoutIds, setDismissedWorkoutIds] = useState<string[]>([]);
  const [showCoachTip, setShowCoachTip] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400 * 1000).toISOString().split('T')[0];

  // Identify all workouts where date < today and not completed, excluding dismissed ones
  const missedWorkouts = workouts.filter((w) => {
    return !w.isCompleted && w.date < todayStr && !dismissedWorkoutIds.includes(w.id);
  });

  if (missedWorkouts.length === 0) {
    return null;
  }

  const totalMissedTSS = missedWorkouts.reduce((sum, w) => sum + (w.plannedTSS || 0), 0);
  const totalMissedMinutes = missedWorkouts.reduce((sum, w) => sum + (w.plannedDurationMinutes || 0), 0);

  const handleDismissWorkout = (workoutId: string) => {
    setDismissedWorkoutIds((prev) => [...prev, workoutId]);
  };

  const handleRescheduleToday = (workoutId: string) => {
    onRescheduleWorkout(workoutId, todayStr);
  };

  const handleRescheduleTomorrow = (workoutId: string) => {
    onRescheduleWorkout(workoutId, tomorrowStr);
  };

  const handleApplyCustomDate = (workoutId: string) => {
    if (!selectedCustomDate) return;
    onRescheduleWorkout(workoutId, selectedCustomDate);
    setCustomDateWorkoutId(null);
    setSelectedCustomDate('');
  };

  const formatWorkoutDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const yesterday = new Date(Date.now() - 86400 * 1000);
        if (d.toDateString() === yesterday.toDateString()) {
          return 'Yesterday';
        }
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      id="missed-workout-alert-container"
      className="w-full rounded-2xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-rose-950/30 border border-amber-500/40 shadow-xl overflow-hidden transition-all animate-fadeIn"
    >
      {/* Alert Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Missed Workout Alert
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {missedWorkouts.length} {missedWorkouts.length === 1 ? 'session' : 'sessions'} uncompleted
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                -{totalMissedTSS} TSS Deficit
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-white mt-1 flex items-center gap-2">
              <span>Attention Required: Past Scheduled Training Unlogged</span>
            </h3>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onSimulateMissedWorkout && (
            <button
              onClick={onSimulateMissedWorkout}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition flex items-center gap-1.5"
              title="Add a sample missed workout to test resolution flows"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Simulate Missed Session</span>
            </button>
          )}

          <button
            onClick={() => setShowCoachTip((prev) => !prev)}
            className="p-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
            title="Sports Science Coaching Advice"
          >
            <Info className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
            title={isExpanded ? 'Collapse Alert' : 'Expand Alert'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              title="Dismiss Alert for Session"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sports Science Coaching Tip Drawer */}
      {showCoachTip && (
        <div className="p-4 bg-neutral-950/80 border-b border-amber-500/20 text-xs text-neutral-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Info className="w-4 h-4" />
            <span>Coach's Recommendation for Missed Workouts:</span>
          </div>
          <p className="leading-relaxed text-neutral-300">
            <strong>Do not double up workouts:</strong> Trying to make up lost volume in a single day often leads to excessive fatigue (ATL spike) and elevates injury risk.
            If this was a <em>Key Quality Workout</em> (Threshold, VO2 Max, or Sweet Spot), reschedule it to today or tomorrow while moving an easy recovery ride. If it was a generic endurance or recovery spin, convert it to a scheduled rest day without guilt.
          </p>
        </div>
      )}

      {/* Expanded Workout List */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-3.5 bg-neutral-950/40">
          {missedWorkouts.map((wk) => (
            <div
              key={wk.id}
              className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <CalendarX className="w-3 h-3" />
                    <span>Scheduled for: {formatWorkoutDate(wk.date)}</span>
                  </span>

                  <span className="px-2 py-0.5 rounded text-[11px] font-mono capitalize bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {wk.sport}
                  </span>

                  <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    {wk.plannedDurationMinutes} mins
                  </span>

                  <span className="text-xs font-mono font-bold text-orange-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    {wk.plannedTSS} TSS
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {wk.title}
                </h4>

                <p className="text-xs text-neutral-400 line-clamp-2">
                  {wk.description}
                </p>

                {/* Micro Interval Structure Indicator */}
                {wk.structure && wk.structure.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-[10px] text-neutral-400">
                    <span className="text-neutral-500">Planned Zones:</span>
                    {wk.structure.slice(0, 3).map((st, sIdx) => (
                      <span key={sIdx} className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                        {st.targetZone}
                      </span>
                    ))}
                    {wk.structure.length > 3 && (
                      <span className="text-neutral-500">+{wk.structure.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Column */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                {/* 1. Reschedule to Today */}
                <button
                  id={`reschedule-today-${wk.id}`}
                  onClick={() => handleRescheduleToday(wk.id)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition active:scale-95"
                  title="Move this workout to today's schedule"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reschedule Today</span>
                </button>

                {/* 2. Reschedule to Tomorrow */}
                <button
                  id={`reschedule-tomorrow-${wk.id}`}
                  onClick={() => handleRescheduleTomorrow(wk.id)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-neutral-700/60"
                  title="Move this workout to tomorrow"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Tomorrow</span>
                </button>

                {/* 3. Mark Done (if already completed offline) */}
                <button
                  id={`mark-done-${wk.id}`}
                  onClick={() => onToggleWorkoutCompleted(wk.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  title="Mark as completed if you performed this workout offline"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Done</span>
                </button>

                {/* 4. Convert to Rest Day */}
                {onConvertToRestDay && (
                  <button
                    id={`convert-rest-${wk.id}`}
                    onClick={() => onConvertToRestDay(wk.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1 transition"
                    title="Acknowledge as an intentional recovery rest day"
                  >
                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Rest Day</span>
                  </button>
                )}

                {/* 5. Custom Date Toggle */}
                {customDateWorkoutId === wk.id ? (
                  <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-700">
                    <input
                      type="date"
                      value={selectedCustomDate}
                      onChange={(e) => setSelectedCustomDate(e.target.value)}
                      className="bg-neutral-900 text-white text-xs px-2 py-1 rounded border border-neutral-700 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={() => handleApplyCustomDate(wk.id)}
                      disabled={!selectedCustomDate}
                      className="px-2 py-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-bold text-xs rounded"
                    >
                      Move
                    </button>
                    <button
                      onClick={() => setCustomDateWorkoutId(null)}
                      className="p-1 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCustomDateWorkoutId(wk.id);
                      setSelectedCustomDate(todayStr);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white font-medium text-xs flex items-center justify-center gap-1 transition"
                    title="Select a custom calendar date"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 6. Dismiss / Ignore Single Alert */}
                <button
                  onClick={() => handleDismissWorkout(wk.id)}
                  className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-300 transition"
                  title="Dismiss this alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
