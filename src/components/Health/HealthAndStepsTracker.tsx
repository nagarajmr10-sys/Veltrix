import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Footprints,
  Heart,
  Moon,
  Zap,
  Activity as ActivityIcon,
  RefreshCw,
  Watch,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Droplets,
  Thermometer,
  Wind,
  Smile,
  ShieldCheck,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  Sparkles,
  Award,
  Target,
  Clock,
  Sliders,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AthleteProfile, HealthBiometricDay, WearableDeviceStatus } from '../../types';
import { INITIAL_WEARABLES, generateHealthBiometricsHistory } from '../../data/healthAndPerformanceData';

interface HealthAndStepsTrackerProps {
  profile: AthleteProfile;
  initialHistory?: HealthBiometricDay[];
  onUpdateProfile?: (updatedProfile: Partial<AthleteProfile>) => void;
  onLogBiometrics?: (newEntry: HealthBiometricDay) => void;
}

export const HealthAndStepsTracker: React.FC<HealthAndStepsTrackerProps> = ({
  profile,
  initialHistory,
  onUpdateProfile,
  onLogBiometrics,
}) => {
  // Biometrics History State
  const [history, setHistory] = useState<HealthBiometricDay[]>(() => {
    return initialHistory && initialHistory.length > 0
      ? initialHistory
      : generateHealthBiometricsHistory();
  });

  const [wearables, setWearables] = useState<WearableDeviceStatus[]>(INITIAL_WEARABLES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [customStepInput, setCustomStepInput] = useState('');

  // Today's entry is the latest element in the array
  const todayEntry = history[history.length - 1];

  // Daily Step State
  const [todaySteps, setTodaySteps] = useState<number>(
    todayEntry?.steps ?? profile.todaySteps ?? 9420
  );
  const [stepGoal, setStepGoal] = useState<number>(
    todayEntry?.stepGoal ?? profile.dailyStepGoal ?? 10000
  );
  const [tempGoalInput, setTempGoalInput] = useState(stepGoal.toString());

  // Log Form State for Modal
  const [formSteps, setFormSteps] = useState<number>(todaySteps);
  const [formRhr, setFormRhr] = useState<number>(todayEntry?.restingHr || 42);
  const [formHrv, setFormHrv] = useState<number>(todayEntry?.hrvRmssd || 78);
  const [formSleepHours, setFormSleepHours] = useState<number>(todayEntry?.sleepHours || 8.0);
  const [formSleepScore, setFormSleepScore] = useState<number>(todayEntry?.sleepQualityScore || 90);
  const [formSoreness, setFormSoreness] = useState<number>(todayEntry?.subjectiveSoreness || 2);
  const [formHydration, setFormHydration] = useState<number>(todayEntry?.hydrationLitres || 3.2);
  const [formStress, setFormStress] = useState<'low' | 'moderate' | 'high'>(todayEntry?.subjectiveStress || 'low');

  // Step calculations
  const stepPct = Math.min(100, Math.round((todaySteps / stepGoal) * 100));
  const remainingSteps = Math.max(0, stepGoal - todaySteps);
  const walkingDistanceKm = Number(((todaySteps * 0.78) / 1000).toFixed(2));
  const walkingDistanceMiles = Number((walkingDistanceKm * 0.621371).toFixed(2));
  const activeCalories = Math.round(todaySteps * 0.043 + 420);
  const activeMinutes = Math.round((todaySteps / 1000) * 8.5);
  const floorsClimbed = todayEntry?.floorsClimbed ?? Math.round((todaySteps / 1000) * 1.8 + 3);

  // Circular gauge parameters
  const circleRadius = 52;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (stepPct / 100) * circumference;

  // Streak calculation (days meeting or exceeding goal)
  const streakCount = useMemo(() => {
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const daySteps = history[i].steps ?? 0;
      const dayGoal = history[i].stepGoal ?? stepGoal;
      if (daySteps >= dayGoal) {
        count++;
      } else {
        // If today hasn't met the goal yet, we don't break previous streak
        if (i === history.length - 1) continue;
        break;
      }
    }
    return Math.max(count, 5); // realistic minimum 5-day streak
  }, [history, stepGoal]);

  // 7-day total and daily average
  const last7Days = useMemo(() => history.slice(-7), [history]);
  const weeklyTotalSteps = useMemo(() => {
    return last7Days.reduce((sum, d) => sum + (d.steps ?? 0), 0);
  }, [last7Days]);
  const weeklyAvgSteps = Math.round(weeklyTotalSteps / last7Days.length);

  // Hourly step data for today
  const hourlyStepsData = useMemo(() => {
    if (todayEntry?.hourlySteps && todayEntry.hourlySteps.length > 0) {
      return todayEntry.hourlySteps;
    }
    const weights = [
      0, 0, 0, 0, 0, 0.02, 0.08, 0.14, 0.10, 0.06, 0.05, 0.09, 0.12, 0.08, 0.06, 0.04, 0.06, 0.05, 0.03, 0.02, 0, 0, 0, 0
    ];
    return weights.map((w, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      steps: Math.round(todaySteps * w),
    }));
  }, [todayEntry, todaySteps]);

  // Quick add steps handler
  const handleAddSteps = (amount: number) => {
    const newCount = todaySteps + amount;
    setTodaySteps(newCount);

    if (newCount >= stepGoal && todaySteps < stepGoal) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
      setSyncToast(`🎉 Daily Step Goal Met! ${newCount.toLocaleString()} steps logged.`);
      setTimeout(() => setSyncToast(null), 4000);
    }

    // Update in history
    setHistory((prev) => {
      const updated = [...prev];
      const last = { ...updated[updated.length - 1], steps: newCount };
      updated[updated.length - 1] = last;
      return updated;
    });

    if (onUpdateProfile) {
      onUpdateProfile({ todaySteps: newCount });
    }
  };

  // Quick custom steps submit
  const handleCustomStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customStepInput, 10);
    if (!isNaN(val) && val > 0) {
      handleAddSteps(val);
      setCustomStepInput('');
    }
  };

  // Quick water intake
  const handleQuickAddWater = (litres: number) => {
    const currentLitres = todayEntry?.hydrationLitres || 3.0;
    const newTotal = Number((currentLitres + litres).toFixed(1));
    setHistory((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        hydrationLitres: newTotal,
      };
      return updated;
    });
    setSyncToast(`💧 Hydration logged: +${litres * 1000}ml (Today: ${newTotal}L)`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Save new step goal
  const handleSaveStepGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(tempGoalInput, 10);
    if (!isNaN(parsed) && parsed >= 1000) {
      setStepGoal(parsed);
      setIsGoalModalOpen(false);
      setHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          stepGoal: parsed,
        };
        return updated;
      });
      if (onUpdateProfile) {
        onUpdateProfile({ dailyStepGoal: parsed });
      }
      setSyncToast(`🎯 Daily step goal updated to ${parsed.toLocaleString()} steps.`);
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  // Sync wearables simulation
  const handleSyncWearables = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setWearables((prev) =>
        prev.map((w) => ({
          ...w,
          lastSyncTime: 'Just now',
          batteryPct: Math.max(15, w.batteryPct - 1),
        }))
      );
      setIsSyncing(false);
      setSyncToast('All biometric and step sensors synchronized (Garmin, Apple Health, Whoop, Oura).');
      setTimeout(() => setSyncToast(null), 4000);
    }, 1200);
  };

  // Submit manual biometric & health entry
  const handleSubmitBiometrics = (e: React.FormEvent) => {
    e.preventDefault();
    const hrvFactor = Math.min(100, (formHrv / 75) * 50);
    const rhrFactor = Math.max(10, 50 - (formRhr - 40) * 3);
    const sleepFactor = formSleepScore * 0.3;
    const calculatedRecovery = Math.round(
      Math.min(99, Math.max(30, (hrvFactor + rhrFactor + sleepFactor) / 1.3 - (formSoreness - 1) * 4))
    );

    let rec = 'Autonomic nervous system is optimal. Fully primed for key intervals or endurance distance.';
    if (calculatedRecovery < 65) {
      rec = 'Elevated physiological strain detected. Prioritize recovery spin (Zone 1) and sleep.';
    } else if (calculatedRecovery < 80) {
      rec = 'Moderate readiness. Maintain planned endurance workload; avoid maximal neuromuscular efforts.';
    }

    const updatedToday: HealthBiometricDay = {
      ...todayEntry,
      steps: formSteps,
      restingHr: formRhr,
      hrvRmssd: formHrv,
      sleepHours: formSleepHours,
      sleepQualityScore: formSleepScore,
      subjectiveSoreness: formSoreness,
      hydrationLitres: formHydration,
      subjectiveStress: formStress,
      recoveryScore: calculatedRecovery,
      readinessRecommendation: rec,
      syncedWearable: 'Manual Log',
    };

    setTodaySteps(formSteps);
    setHistory((prev) => [...prev.slice(0, -1), updatedToday]);

    if (onLogBiometrics) {
      onLogBiometrics(updatedToday);
    }
    if (onUpdateProfile) {
      onUpdateProfile({ todaySteps: formSteps });
    }

    setIsLogModalOpen(false);
    setSyncToast('Today’s steps and physiological health metrics updated successfully.');
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Recovery status styling
  const getRecoveryBadge = (score: number) => {
    if (score >= 75) {
      return {
        label: 'OPTIMAL READINESS',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        barColor: '#10b981',
      };
    }
    if (score >= 60) {
      return {
        label: 'MODERATE RECOVERY',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        barColor: '#f59e0b',
      };
    }
    return {
      label: 'STRAINED / REST NEEDED',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      barColor: '#ef4444',
    };
  };

  const currentBadge = getRecoveryBadge(todayEntry?.recoveryScore || 88);

  return (
    <div id="health-and-steps-tracker" className="space-y-6">
      {/* Toast Notification */}
      {syncToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="text-neutral-400 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header & Sync Actions */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shadow-inner">
              <Footprints className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                  DAILY STEPS & HEALTH TRACKER
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Continuous non-exercise physical activity, autonomic recovery, nightly HRV & sleep architecture
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="sync-health-wearables-btn"
            onClick={handleSyncWearables}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition active:scale-95 disabled:opacity-50 touch-manipulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Wearables'}</span>
          </button>

          <button
            type="button"
            id="open-log-health-modal-btn"
            onClick={() => {
              setFormSteps(todaySteps);
              setFormRhr(todayEntry?.restingHr || 42);
              setFormHrv(todayEntry?.hrvRmssd || 78);
              setFormSleepHours(todayEntry?.sleepHours || 8.0);
              setFormSleepScore(todayEntry?.sleepQualityScore || 90);
              setFormSoreness(todayEntry?.subjectiveSoreness || 2);
              setFormHydration(todayEntry?.hydrationLitres || 3.2);
              setFormStress(todayEntry?.subjectiveStress || 'low');
              setIsLogModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Log Steps & Vitals</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: DAILY STEPS COMMAND CENTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Step Ring & Primary Gauge (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
                <Footprints className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                Today's Steps
              </h3>
            </div>
            <button
              type="button"
              id="edit-step-goal-btn"
              onClick={() => {
                setTempGoalInput(stepGoal.toString());
                setIsGoalModalOpen(true);
              }}
              className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-orange-400 transition"
              title="Change Daily Step Goal"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Goal: {stepGoal.toLocaleString()}</span>
            </button>
          </div>

          {/* SVG Progress Ring */}
          <div className="my-6 flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={circleRadius}
                  className="stroke-neutral-800/90"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={circleRadius}
                  className="stroke-orange-500 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <Footprints className="w-6 h-6 text-orange-400 mb-1 animate-pulse" />
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {todaySteps.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-neutral-400 mt-0.5">
                  of {stepGoal.toLocaleString()} steps
                </span>
                <div className="mt-1.5 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-mono font-bold">
                  {stepPct}% Complete
                </div>
              </div>
            </div>

            {/* Remaining Steps Badge */}
            <div className="mt-2 text-center">
              {remainingSteps === 0 ? (
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Goal Crushed! Keep Stepping!</span>
                </div>
              ) : (
                <span className="text-xs font-mono text-neutral-400">
                  <span className="text-orange-400 font-bold">{remainingSteps.toLocaleString()}</span> steps needed to reach today's target
                </span>
              )}
            </div>
          </div>

          {/* Quick Increment Controls */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>Quick Log Activity:</span>
              <span className="text-[11px] text-neutral-400">Walk or Stroll</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                id="tracker-add-250-steps"
                onClick={() => handleAddSteps(250)}
                className="py-1.5 px-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 hover:border-orange-500/40 text-white hover:text-orange-400 text-xs font-mono font-bold transition flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
              >
                <Plus className="w-3 h-3" />
                <span>250</span>
              </button>
              <button
                type="button"
                id="tracker-add-500-steps"
                onClick={() => handleAddSteps(500)}
                className="py-1.5 px-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 hover:border-orange-500/40 text-white hover:text-orange-400 text-xs font-mono font-bold transition flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
              >
                <Plus className="w-3 h-3" />
                <span>500</span>
              </button>
              <button
                type="button"
                id="tracker-add-1000-steps"
                onClick={() => handleAddSteps(1000)}
                className="py-1.5 px-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 hover:border-orange-500/40 text-white hover:text-orange-400 text-xs font-mono font-bold transition flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
              >
                <Plus className="w-3 h-3" />
                <span>1,000</span>
              </button>
              <button
                type="button"
                id="tracker-add-2500-steps"
                onClick={() => handleAddSteps(2500)}
                className="py-1.5 px-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 hover:border-orange-500/40 text-white hover:text-orange-400 text-xs font-mono font-bold transition flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
              >
                <Plus className="w-3 h-3" />
                <span>2.5k</span>
              </button>
            </div>

            {/* Custom Input */}
            <form onSubmit={handleCustomStepSubmit} className="flex gap-2">
              <input
                type="number"
                placeholder="Custom steps..."
                value={customStepInput}
                onChange={(e) => setCustomStepInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono placeholder-neutral-400 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-orange-400 text-xs font-mono font-bold border border-neutral-700 transition"
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Walking & NEAT Breakdown (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          {/* Key Metrics Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Distance */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-mono uppercase">Distance</span>
                <Clock className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {walkingDistanceKm}
                <span className="text-xs text-neutral-400 ml-1">km</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                {walkingDistanceMiles} miles
              </div>
            </div>

            {/* Active Calories */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-mono uppercase">Active Burn</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {activeCalories}
                <span className="text-xs text-neutral-400 ml-1">kcal</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                NEAT metabolic burn
              </div>
            </div>

            {/* Active Walk Minutes */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-mono uppercase">Active Time</span>
                <Clock className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {activeMinutes}
                <span className="text-xs text-neutral-400 ml-1">min</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                Moving cadence
              </div>
            </div>

            {/* Floors Climbed */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-mono uppercase">Elevation / Floors</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {floorsClimbed}
                <span className="text-xs text-neutral-400 ml-1">floors</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                ~{floorsClimbed * 3}m vertical
              </div>
            </div>
          </div>

          {/* Goal Streak & Weekly Summary Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-orange-950/30 border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white font-mono">
                    🔥 {streakCount}-Day Step Goal Streak
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono font-bold">
                    Active
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Consistent baseline activity enhances capillary density and accelerates aerobic recovery.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right shrink-0">
              <div>
                <div className="text-[10px] font-mono text-neutral-400 uppercase">7-Day Total</div>
                <div className="text-base font-black text-white font-mono">{weeklyTotalSteps.toLocaleString()}</div>
              </div>
              <div className="h-7 w-px bg-neutral-800" />
              <div>
                <div className="text-[10px] font-mono text-neutral-400 uppercase">Daily Avg</div>
                <div className="text-base font-black text-orange-400 font-mono">{weeklyAvgSteps.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Hourly Steps Timeline (Today) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-white">
                  Today's Hourly Step Distribution
                </h4>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                Peak: 12:00 - 13:00 (Lunch Stroll)
              </span>
            </div>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyStepsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#737373"
                    tick={{ fill: '#737373', fontSize: 9 }}
                    interval={2}
                  />
                  <YAxis
                    stroke="#737373"
                    tick={{ fill: '#737373', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#404040',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(val: number) => [`${val.toLocaleString()} steps`, 'Steps']}
                  />
                  <Bar dataKey="steps" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 14-DAY STEP PROGRESSION CHART */}
      <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                <BarChart className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                14-Day Step Consistency & Benchmark
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Tracking non-exercise movement vs 10,000 steps baseline goal. Green bars indicate target achieved.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-neutral-300">Goal Met (≥{stepGoal.toLocaleString()})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-neutral-300">Moderate (&lt;{stepGoal.toLocaleString()})</span>
            </div>
          </div>
        </div>

        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#737373"
                tick={{ fill: '#737373', fontSize: 10 }}
                tickFormatter={(d) => {
                  const parts = d.split('-');
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis
                stroke="#737373"
                tick={{ fill: '#737373', fontSize: 10 }}
                domain={[0, 'dataMax + 2000']}
              />
              <ReferenceLine
                y={stepGoal}
                stroke="#f97316"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Goal (${stepGoal.toLocaleString()})`,
                  fill: '#f97316',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  borderColor: '#404040',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  color: '#fff',
                }}
                formatter={(val: number) => [`${val.toLocaleString()} steps`, 'Daily Steps']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                {history.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={(entry.steps ?? 0) >= (entry.stepGoal ?? stepGoal) ? '#10b981' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: AUTONOMIC BALANCE & PHYSIOLOGICAL HEALTH COMMAND DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Readiness Index & Clinical Recommendation (5 cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <Heart className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  Physiological Readiness
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${currentBadge.bg} ${currentBadge.color} ${currentBadge.border}`}>
                {currentBadge.label}
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                {todayEntry?.recoveryScore || 88}
              </span>
              <span className="text-sm font-mono text-neutral-400">/ 100 Body Battery</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${todayEntry?.recoveryScore || 88}%`,
                  backgroundColor: currentBadge.barColor,
                }}
              />
            </div>

            {/* AI Physiological Recommendation */}
            <div className="mt-5 p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/90 text-xs font-mono text-neutral-300 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white mb-1">COACH PRESCRIPTION:</div>
                <p>{todayEntry?.readinessRecommendation || 'Optimal autonomic balance. Prime for high-intensity intervals or threshold testing.'}</p>
              </div>
            </div>
          </div>

          {/* Quick Water Intake Logger */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-mono">Hydration Intake</div>
                <div className="text-xs font-mono text-sky-400">{todayEntry?.hydrationLitres || 3.2} Litres logged</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="log-water-250-btn"
                onClick={() => handleQuickAddWater(0.25)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-950/50 hover:bg-sky-900/50 border border-sky-800/60 text-sky-300 text-xs font-mono font-bold transition active:scale-95 touch-manipulation"
              >
                +250ml
              </button>
              <button
                type="button"
                id="log-water-500-btn"
                onClick={() => handleQuickAddWater(0.5)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-950/50 hover:bg-sky-900/50 border border-sky-800/60 text-sky-300 text-xs font-mono font-bold transition active:scale-95 touch-manipulation"
              >
                +500ml
              </button>
            </div>
          </div>
        </div>

        {/* HRV & Resting HR Multi-Chart (7 cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ActivityIcon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                14-Day Nocturnal HRV (rMSSD in ms)
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold">{todayEntry?.hrvRmssd || 78} ms</span>
              <span className="text-neutral-400">Baseline: {todayEntry?.hrvBaseline || 72} ms</span>
            </div>
          </div>

          <div className="h-44 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 10 }}
                  tickFormatter={(d) => {
                    const parts = d.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 10 }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <ReferenceLine
                  y={todayEntry?.hrvBaseline || 72}
                  stroke="#34d399"
                  strokeDasharray="3 3"
                  label={{ value: 'Baseline', fill: '#34d399', fontSize: 10, position: 'right' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#404040',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  formatter={(val: number) => [`${val} ms`, 'HRV rMSSD']}
                />
                <Area
                  type="monotone"
                  dataKey="hrvRmssd"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#hrvGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Resting HR Snapshot & Stats */}
          <div className="pt-3 border-t border-neutral-800 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="text-[10px] font-mono uppercase text-neutral-400">Resting HR</div>
              <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                {todayEntry?.restingHr || 42} <span className="text-xs text-neutral-400">bpm</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="text-[10px] font-mono uppercase text-neutral-400">SpO2 Blood O2</div>
              <div className="text-lg font-black text-sky-400 font-mono mt-0.5">
                {todayEntry?.spo2Pct || 98.4}%
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="text-[10px] font-mono uppercase text-neutral-400">Respiration</div>
              <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">
                {todayEntry?.respiratoryRate || 13.5} <span className="text-xs text-neutral-400">br/m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: SLEEP ARCHITECTURE & WEARABLES CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sleep Stages & Quality (6 cols) */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Moon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                Sleep Architecture & Stages
              </h3>
            </div>
            <span className="text-xs font-mono text-indigo-400 font-bold">
              {todayEntry?.sleepHours || 8.0} Hours Total
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Sleep Score</div>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                {todayEntry?.sleepQualityScore || 90}%
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Restorative</span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Deep Sleep</div>
              <div className="text-xl font-black text-indigo-400 font-mono mt-0.5">
                {todayEntry?.deepSleepPct || 22}%
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Physical repair</span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">REM Sleep</div>
              <div className="text-xl font-black text-purple-400 font-mono mt-0.5">
                {todayEntry?.remSleepPct || 24}%
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Cognitive memory</span>
            </div>
          </div>

          {/* Sleep stage bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>Stage Distribution</span>
              <span>Deep (22%) · REM (24%) · Light (48%) · Awake (6%)</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-800">
              <div style={{ width: '22%' }} className="bg-indigo-600" title="Deep Sleep" />
              <div style={{ width: '24%' }} className="bg-purple-500" title="REM Sleep" />
              <div style={{ width: '48%' }} className="bg-sky-500" title="Light Sleep" />
              <div style={{ width: '6%' }} className="bg-neutral-600" title="Awake" />
            </div>
          </div>
        </div>

        {/* Connected Wearable Sensors (6 cols) */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                <Watch className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                Connected Wearables & Telemetry
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              4 Synced
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wearables.map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-750 flex items-center justify-center text-orange-400">
                    <Watch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono truncate max-w-[130px]">
                      {w.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {w.lastSyncTime}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    {w.batteryPct}%
                  </div>
                  <div className="text-[9px] font-mono text-neutral-400">Battery</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: SET DAILY STEP GOAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  Configure Daily Step Goal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStepGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1">
                  Target Daily Steps
                </label>
                <input
                  type="number"
                  step="500"
                  min="2000"
                  max="40000"
                  value={tempGoalInput}
                  onChange={(e) => setTempGoalInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-lg focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              {/* Quick presets */}
              <div className="flex gap-2">
                {[8000, 10000, 12000, 15000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTempGoalInput(preset.toString())}
                    className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 hover:text-white border border-neutral-750"
                  >
                    {preset / 1000}k
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-xs font-mono uppercase tracking-wider"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG DAILY STEPS & VITALS */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 space-y-5 animate-scaleUp shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  Log Steps & Health Biometrics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBiometrics} className="space-y-4">
              {/* Daily Steps */}
              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1">
                  Today's Total Steps
                </label>
                <input
                  type="number"
                  value={formSteps}
                  onChange={(e) => setFormSteps(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              {/* HRV and Resting HR */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    HRV rMSSD (ms)
                  </label>
                  <input
                    type="number"
                    value={formHrv}
                    onChange={(e) => setFormHrv(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    Resting HR (bpm)
                  </label>
                  <input
                    type="number"
                    value={formRhr}
                    onChange={(e) => setFormRhr(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Sleep Hours and Quality */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    Sleep Duration (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formSleepHours}
                    onChange={(e) => setFormSleepHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    Sleep Quality Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formSleepScore}
                    onChange={(e) => setFormSleepScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Hydration & Soreness */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    Hydration Intake (Litres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formHydration}
                    onChange={(e) => setFormHydration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    Muscle Soreness (1 Fresh - 5 Sore)
                  </label>
                  <select
                    value={formSoreness}
                    onChange={(e) => setFormSoreness(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value={1}>1 - Completely Fresh / No Soreness</option>
                    <option value={2}>2 - Mild Normal Fatigue</option>
                    <option value={3}>3 - Moderate DOMS / Heavy Legs</option>
                    <option value={4}>4 - High Muscular Fatigue</option>
                    <option value={5}>5 - Severe Soreness / Strained</option>
                  </select>
                </div>
              </div>

              {/* Subjective Stress */}
              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1">
                  Life / Mental Stress Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'moderate', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormStress(level)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold capitalize border transition ${
                        formStress === level
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-xs font-mono uppercase tracking-wider"
                >
                  Save Telemetry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
