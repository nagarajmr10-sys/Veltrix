import React, { useState } from 'react';
import {
  Calendar as CalIcon,
  CheckCircle2,
  Clock,
  Plus,
  Zap,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Flame,
  Dumbbell,
  Target,
  X,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { SportType, StructuredWorkout } from '../../types';

interface TrainingCalendarProps {
  workouts: StructuredWorkout[];
  onAddWorkout: (workout: StructuredWorkout) => void;
  onToggleWorkoutCompleted: (workoutId: string) => void;
  onOpenAIBasePlanModal?: () => void;
  onBrowsePlans?: () => void;
  activePlanName?: string;
}

export const TrainingCalendarView: React.FC<TrainingCalendarProps> = ({
  workouts,
  onAddWorkout,
  onToggleWorkoutCompleted,
  onOpenAIBasePlanModal,
  onBrowsePlans,
  activePlanName,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSport, setNewSport] = useState<SportType>('cycling');
  const [newDuration, setNewDuration] = useState(60);
  const [newTSS, setNewTSS] = useState(70);
  const [newDesc, setNewDesc] = useState('');

  // Weekly days
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7; // 0 for Mon, 6 for Sun

  // Calculate planned vs completed TSS
  const totalPlannedTSS = workouts.reduce((sum, w) => sum + w.plannedTSS, 0);
  const completedTSS = workouts
    .filter((w) => w.isCompleted)
    .reduce((sum, w) => sum + w.plannedTSS, 0);

  const handleCreateWorkout = () => {
    if (!newTitle.trim()) return;
    const created: StructuredWorkout = {
      id: `wk-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      title: newTitle.trim(),
      sport: newSport,
      plannedDurationMinutes: newDuration,
      plannedTSS: newTSS,
      description: newDesc.trim() || 'Structured workout session',
      structure: [
        { phase: 'Warmup', durationMinutes: 15, targetZone: 'Z2 Aerobic', targetDescription: 'Progressive build' },
        { phase: 'Main Work', durationMinutes: newDuration - 25, targetZone: 'Z4 Sweet Spot', targetDescription: 'Steady threshold work' },
        { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1 Flush', targetDescription: 'Easy spin' },
      ],
      isCompleted: false,
    };
    onAddWorkout(created);
    setNewTitle('');
    setNewDesc('');
    setIsAddModalOpen(false);
  };

  return (
    <div id="training-calendar-view" className="space-y-6">
      {/* Top Banner & Weekly Load Summary */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Structured Training Calendar</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                Final Surge & TrainingPeaks Sync
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Micro-cycle periodization, interval targets, and daily Training Stress Scores
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onBrowsePlans && (
              <button
                id="open-browse-plans-btn"
                onClick={onBrowsePlans}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition border border-neutral-700/60 shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 text-orange-400" />
                <span>Plan Store</span>
              </button>
            )}

            {onOpenAIBasePlanModal && (
              <button
                id="open-ai-base-plan-modal-btn"
                onClick={onOpenAIBasePlanModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg shadow-orange-500/25"
              >
                <Sparkles className="w-4 h-4 fill-black stroke-[2]" />
                <span>AI Base Plan</span>
              </button>
            )}

            <button
              id="open-add-workout-modal-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Schedule Workout</span>
            </button>
          </div>
        </div>

        {/* Weekly Load Progress Bar */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-2">
          <div className="flex items-baseline justify-between font-mono text-xs">
            <span className="text-neutral-400">Weekly Target TSS:</span>
            <span className="text-white">
              <strong className="text-orange-400">{completedTSS}</strong> / {totalPlannedTSS} TSS ({Math.round((completedTSS / Math.max(1, totalPlannedTSS)) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (completedTSS / Math.max(1, totalPlannedTSS)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Days of Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {daysOfWeek.map((day, idx) => {
          const isToday = idx === currentDayIndex;
          const dayWorkouts = workouts.filter((_, wIdx) => wIdx % 7 === idx);

          return (
            <div
              key={day}
              className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[180px] transition ${
                isToday
                  ? 'bg-neutral-900 border-orange-500/50 shadow-md shadow-orange-500/10'
                  : 'bg-neutral-900/50 border-neutral-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className={`text-xs font-bold ${isToday ? 'text-orange-400' : 'text-neutral-300'}`}>
                    {day.slice(0, 3)}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold uppercase">
                      Today
                    </span>
                  )}
                </div>

                <div className="mt-2.5 space-y-2">
                  {dayWorkouts.length === 0 ? (
                    <div className="text-[11px] text-neutral-600 italic py-4 text-center">
                      Rest & Adapt
                    </div>
                  ) : (
                    dayWorkouts.map((wk) => (
                      <div
                        key={wk.id}
                        className={`p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                          wk.isCompleted
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-neutral-950 border-neutral-700/60 hover:border-neutral-600 text-neutral-200'
                        }`}
                        onClick={() => onToggleWorkoutCompleted(wk.id)}
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400 mb-1">
                          <span className="capitalize">{wk.sport}</span>
                          <span className="text-orange-400 font-bold">{wk.plannedTSS} TSS</span>
                        </div>
                        <div className="font-semibold text-xs leading-snug line-clamp-2">
                          {wk.title}
                        </div>
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-neutral-800/60 text-[10px] text-neutral-500">
                          <span>{wk.plannedDurationMinutes} mins</span>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${wk.isCompleted ? 'text-emerald-400 fill-emerald-500/20' : 'text-neutral-600'}`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 text-[10px] font-mono text-neutral-500 text-center">
                Day {idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workout Structure Breakdown list */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-orange-400" />
          <span>Interval Architecture & Targets</span>
        </h3>

        <div className="space-y-3">
          {workouts.map((wk) => (
            <div key={wk.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 capitalize">
                      {wk.sport}
                    </span>
                    <h4 className="text-sm font-bold text-white">{wk.title}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{wk.description}</p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs self-start sm:self-auto">
                  <span className="text-neutral-400">{wk.plannedDurationMinutes}m</span>
                  <span className="text-orange-400 font-bold">{wk.plannedTSS} TSS</span>
                  <button
                    onClick={() => onToggleWorkoutCompleted(wk.id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold font-sans transition ${
                      wk.isCompleted
                        ? 'bg-emerald-500 text-black'
                        : 'bg-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {wk.isCompleted ? 'Completed' : 'Mark Done'}
                  </button>
                </div>
              </div>

              {/* Intervals Visual Strip */}
              {wk.structure && (
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-2 border-t border-neutral-800/60 font-mono text-xs">
                  {wk.structure.map((ph, idx) => (
                    <div key={idx} className="bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                      <div className="text-[10px] text-neutral-500 uppercase">{ph.phase} ({ph.durationMinutes}m)</div>
                      <div className="text-orange-400 font-bold mt-0.5">{ph.targetZone}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{ph.targetDescription}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Workout Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Schedule Custom Workout</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">Workout Title</label>
                <input
                  type="text"
                  placeholder="e.g. 5x5min VO2 Max Repeats"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">Sport</label>
                  <select
                    value={newSport}
                    onChange={(e) => setNewSport(e.target.value as SportType)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="cycling">Cycling</option>
                    <option value="running">Running</option>
                    <option value="gravel">Gravel</option>
                    <option value="trail_running">Trail Run</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">Target TSS ({newTSS})</label>
                <input
                  type="range"
                  min="20"
                  max="250"
                  value={newTSS}
                  onChange={(e) => setNewTSS(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase mb-1">Workout Notes & Targets</label>
                <textarea
                  rows={2}
                  placeholder="Interval instructions, power targets, cadence notes..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkout}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs"
              >
                Add to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
