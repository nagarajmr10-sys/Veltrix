import React, { useState } from 'react';
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
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { HealthBiometricDay, WearableDeviceStatus } from '../../types';
import { INITIAL_WEARABLES, generateHealthBiometricsHistory } from '../../data/healthAndPerformanceData';

interface HealthStatsViewProps {
  onLogBiometrics?: (newEntry: HealthBiometricDay) => void;
  onNavigateToCalendar?: () => void;
}

export const HealthStatsView: React.FC<HealthStatsViewProps> = ({
  onLogBiometrics,
  onNavigateToCalendar,
}) => {
  const [history, setHistory] = useState<HealthBiometricDay[]>(() =>
    generateHealthBiometricsHistory()
  );
  const [wearables, setWearables] = useState<WearableDeviceStatus[]>(INITIAL_WEARABLES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Modal to log/edit today's biometrics
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const todayEntry = history[history.length - 1];

  // Log Form State
  const [formRhr, setFormRhr] = useState<number>(todayEntry?.restingHr || 42);
  const [formHrv, setFormHrv] = useState<number>(todayEntry?.hrvRmssd || 78);
  const [formSleepHours, setFormSleepHours] = useState<number>(todayEntry?.sleepHours || 8.0);
  const [formSleepScore, setFormSleepScore] = useState<number>(todayEntry?.sleepQualityScore || 90);
  const [formSoreness, setFormSoreness] = useState<number>(todayEntry?.subjectiveSoreness || 2);
  const [formHydration, setFormHydration] = useState<number>(todayEntry?.hydrationLitres || 3.2);
  const [formStress, setFormStress] = useState<'low' | 'moderate' | 'high'>(todayEntry?.subjectiveStress || 'low');

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
      setSyncToast('All 4 biometric sensors synchronized successfully (Garmin, Whoop, Oura, Wahoo).');
      setTimeout(() => setSyncToast(null), 4000);
    }, 1200);
  };

  // Submit manual biometric entry
  const handleSubmitBiometrics = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate recovery score based on physiological formula
    // Higher HRV and higher sleep score relative to resting HR elevate recovery
    const hrvFactor = Math.min(100, (formHrv / 75) * 50);
    const rhrFactor = Math.max(10, 50 - (formRhr - 40) * 3);
    const sleepFactor = formSleepScore * 0.3;
    const calculatedRecovery = Math.round(
      Math.min(99, Math.max(30, (hrvFactor + rhrFactor + sleepFactor) / 1.3 - (formSoreness - 1) * 4))
    );

    let rec = 'Autonomic nervous system is optimal. Fully primed for key VO2 Max intervals or long aerobic volume.';
    if (calculatedRecovery < 65) {
      rec = 'Elevated physiological strain. Recommend active recovery spin (Zone 1) or mobility session.';
    } else if (calculatedRecovery < 80) {
      rec = 'Moderate readiness. Maintain planned endurance workload; avoid maximal neuromuscular efforts.';
    }

    const updatedToday: HealthBiometricDay = {
      ...todayEntry,
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

    setHistory((prev) => [...prev.slice(0, -1), updatedToday]);
    if (onLogBiometrics) {
      onLogBiometrics(updatedToday);
    }
    setIsLogModalOpen(false);
    setSyncToast('Today’s physiological biometrics updated and recovery status recalculated.');
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Recovery status badge color & label
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
      label: 'STRAINED / RECOVERY NEEDED',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      barColor: '#ef4444',
    };
  };

  const currentBadge = getRecoveryBadge(todayEntry?.recoveryScore || 85);

  // Averages across 14-day history
  const avgHRV = Math.round(history.reduce((s, d) => s + d.hrvRmssd, 0) / history.length);
  const avgRHR = Math.round(history.reduce((s, d) => s + d.restingHr, 0) / history.length);
  const avgSleep = (history.reduce((s, d) => s + d.sleepHours, 0) / history.length).toFixed(1);
  const avgRecovery = Math.round(history.reduce((s, d) => s + d.recoveryScore, 0) / history.length);

  return (
    <div id="health-stats-view" className="space-y-6">
      {/* Toast Notification */}
      {syncToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button
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
            <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Heart className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                HEALTH & BIOMETRIC RECOVERY
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Autonomic nervous system readiness, nocturnal HRV, sleep architecture & physiological strain
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="log-biometrics-btn"
            onClick={() => setIsLogModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            <span>Log Biometrics</span>
          </button>

          <button
            id="sync-wearables-btn"
            onClick={handleSyncWearables}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              isSyncing
                ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-mono shadow-md shadow-orange-500/20 hover:opacity-90'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Sensors...' : 'Sync Wearables'}</span>
          </button>
        </div>
      </div>

      {/* DAILY READINESS HERO CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recovery Score & Breakdown */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                TODAY'S CARDIOVASCULAR READINESS
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${currentBadge.bg} ${currentBadge.color} ${currentBadge.border}`}
              >
                {currentBadge.label}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-6 pt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tighter">
                  {todayEntry?.recoveryScore || 88}
                </span>
                <span className="text-2xl font-mono text-neutral-500">/100</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-neutral-200 font-semibold">
                  <span>Autonomic Status:</span>
                  <span className={currentBadge.color}>
                    {todayEntry?.recoveryScore >= 75 ? 'Parasympathetic Dominant' : 'Sympathetic Activated'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
                  {todayEntry?.readinessRecommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-neutral-800/80 mt-6">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Resting HR</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {todayEntry?.restingHr} <span className="text-xs font-normal text-neutral-500">bpm</span>
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingDown className="w-3 h-3" />
                <span>-2 bpm vs avg</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">HRV (rMSSD)</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {todayEntry?.hrvRmssd} <span className="text-xs font-normal text-neutral-500">ms</span>
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>+6 ms vs baseline</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Sleep Quality</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {todayEntry?.sleepHours}h{' '}
                <span className="text-xs font-normal text-neutral-500">({todayEntry?.sleepQualityScore}%)</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                Deep: {todayEntry?.deepSleepPct}% · REM: {todayEntry?.remSleepPct}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">SpO2 / Respiration</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {todayEntry?.spo2Pct}%{' '}
                <span className="text-xs font-normal text-neutral-500">· {todayEntry?.respiratoryRate} brpm</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Normal SpO2</div>
            </div>
          </div>
        </div>

        {/* Right Col: Recovery Index Factors & Subjective Scale */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-orange-400" />
              PHYSIOLOGICAL DRIVERS
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Multi-sensor biometric weighting for cardiovascular strain
            </p>

            <div className="space-y-3.5 mt-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-neutral-300">HRV Autonomic Tone</span>
                  <span className="text-emerald-400 font-bold">94 / 100</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '94%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-neutral-300">Resting Cardiac Suppression</span>
                  <span className="text-emerald-400 font-bold">90 / 100</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-neutral-300">Sleep Architecture (Deep/REM)</span>
                  <span className="text-amber-400 font-bold">86 / 100</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '86%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-neutral-300">Subjective Muscle Freshness</span>
                  <span className="text-neutral-300 font-bold">Grade 2/5 (Fresh)</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action to Calendar */}
          {onNavigateToCalendar && (
            <button
              onClick={onNavigateToCalendar}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs font-mono font-bold text-neutral-200 border border-neutral-700 flex items-center justify-center gap-2 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <span>Apply to Today's Workout Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* 14-DAY RECOVERY & HRV CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: 14-Day Daily Recovery Score Trend */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                14-DAY RECOVERY SCORE PROFILE
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Green zone (&gt;75%) indicates ideal adaptation window
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400">14d Avg: {avgRecovery}%</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#404040"
                />
                <YAxis
                  domain={[30, 100]}
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#404040"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    borderColor: '#262626',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: number) => [`${val}%`, 'Recovery Score']}
                />
                <ReferenceLine y={75} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Optimal (75%)', fill: '#10b981', fontSize: 9 }} />
                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Moderate (60%)', fill: '#f59e0b', fontSize: 9 }} />
                <Bar dataKey="recoveryScore" radius={[4, 4, 0, 0]}>
                  {history.map((entry, index) => {
                    const color =
                      entry.recoveryScore >= 75 ? '#10b981' : entry.recoveryScore >= 60 ? '#f59e0b' : '#ef4444';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Nocturnal HRV (ms) vs Morning Resting HR (bpm) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                HRV (rMSSD) VS RESTING HEART RATE
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Elevated HRV combined with suppressed RHR confirms physiological recovery
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> HRV ({avgHRV}ms)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> RHR ({avgRHR}bpm)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#404040"
                />
                <YAxis
                  yAxisId="left"
                  domain={[50, 95]}
                  tick={{ fill: '#10b981', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#10b981"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[35, 55]}
                  tick={{ fill: '#fb7185', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#fb7185"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    borderColor: '#262626',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="hrvRmssd"
                  name="HRV rMSSD (ms)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="restingHr"
                  name="Resting HR (bpm)"
                  stroke="#fb7185"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#fb7185' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* WEARABLE SENSOR FLEET & HARDWARE STATUS */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Watch className="w-4 h-4 text-orange-400" />
              CONNECTED BIOMETRIC SENSORS
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live telemetry stream from active continuous heart-rate and sleep trackers
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All 4 Sensors Online
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {wearables.map((device) => (
            <div
              key={device.id}
              className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-white font-mono">{device.name}</div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
                    {device.brand.toUpperCase()} ECOSYSTEM
                  </div>
                </div>
                <span className="p-1.5 rounded-lg bg-neutral-900 text-neutral-300">
                  <Watch className="w-4 h-4" />
                </span>
              </div>

              <div className="text-[11px] text-neutral-300 leading-snug">
                {device.statusMessage}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-[10px] font-mono text-neutral-400">
                <span>Battery: {device.batteryPct}%</span>
                <span>Synced {device.lastSyncTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MANUAL BIOMETRICS MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-black text-white font-mono">
                  LOG TODAY'S BIOMETRICS
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBiometrics} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    Resting HR (bpm)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="100"
                    value={formRhr}
                    onChange={(e) => setFormRhr(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    HRV rMSSD (ms)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="200"
                    value={formHrv}
                    onChange={(e) => setFormHrv(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    Sleep Duration (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="2"
                    max="14"
                    value={formSleepHours}
                    onChange={(e) => setFormSleepHours(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    Sleep Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formSleepScore}
                    onChange={(e) => setFormSleepScore(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    Muscle Soreness (1 Fresh - 5 Sore)
                  </label>
                  <select
                    value={formSoreness}
                    onChange={(e) => setFormSoreness(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  >
                    <option value={1}>1 - Completely Fresh</option>
                    <option value={2}>2 - Mild Tightness</option>
                    <option value={3}>3 - Moderate Fatigue</option>
                    <option value={4}>4 - Heavy Soreness</option>
                    <option value={5}>5 - Severe Exhaustion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    Hydration Logged (Litres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="8"
                    value={formHydration}
                    onChange={(e) => setFormHydration(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-mono font-bold text-xs shadow-md shadow-orange-500/20"
                >
                  Save & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
