import React, { useState } from 'react';
import {
  Heart,
  Activity,
  Moon,
  BatteryCharging,
  Zap,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Wind,
  Droplets,
  Calendar,
  Sparkles,
  Info,
  Clock,
  Watch,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Smile,
  Frown,
} from 'lucide-react';
import {
  AthleteProfile,
  HealthBiometricDay,
  WearableDeviceStatus,
} from '../../types';

interface HealthStatsViewProps {
  profile: AthleteProfile;
  biometricsHistory: HealthBiometricDay[];
  wearables: WearableDeviceStatus[];
  onLogBiometrics?: (entry: HealthBiometricDay) => void;
  onSyncWearables?: () => void;
}

export const HealthStatsView: React.FC<HealthStatsViewProps> = ({
  profile,
  biometricsHistory,
  wearables,
  onLogBiometrics,
  onSyncWearables,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 is today (latest)
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Today's entry (latest day in the array)
  const currentDay = biometricsHistory[selectedDayIndex] || biometricsHistory[0];

  // Log Form State
  const [logHrv, setLogHrv] = useState(currentDay?.hrvRmssd || 76);
  const [logRhr, setLogRhr] = useState(currentDay?.restingHr || 42);
  const [logSleep, setLogSleep] = useState(currentDay?.sleepHours || 7.8);
  const [logSoreness, setLogSoreness] = useState(currentDay?.subjectiveSoreness || 2);
  const [logStress, setLogStress] = useState<'low' | 'moderate' | 'high'>(currentDay?.subjectiveStress || 'low');
  const [logHydration, setLogHydration] = useState(currentDay?.hydrationLitres || 3.0);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (onSyncWearables) onSyncWearables();
    }, 1500);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    const recoveryScore = Math.min(
      99,
      Math.max(
        40,
        Math.round(
          (logHrv / 72) * 45 +
            (42 / Math.max(35, logRhr)) * 30 +
            (logSleep / 8) * 20 -
            (logSoreness - 1) * 5
        )
      )
    );

    let recommendation = 'High physiological readiness. Authorized for threshold or interval work.';
    if (recoveryScore < 65) {
      recommendation = 'Fatigue indicated. Prioritize sleep, nutrition, and Z1 recovery spin.';
    } else if (recoveryScore < 80) {
      recommendation = 'Moderate readiness. Stick to planned steady endurance volume.';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newEntry: HealthBiometricDay = {
      date: todayStr,
      recoveryScore,
      hrvRmssd: Number(logHrv),
      hrvBaseline: 72,
      restingHr: Number(logRhr),
      sleepHours: Number(logSleep),
      sleepQualityScore: Math.round(recoveryScore * 0.95),
      deepSleepPct: 22,
      remSleepPct: 24,
      spo2Pct: 98.6,
      respiratoryRate: 13.5,
      skinTempDeviationCelsius: -0.1,
      subjectiveSoreness: Number(logSoreness),
      subjectiveStress: logStress,
      hydrationLitres: Number(logHydration),
      weightKg: profile.weightKg,
      readinessRecommendation: recommendation,
      syncedWearable: 'Manual Log',
    };

    if (onLogBiometrics) {
      onLogBiometrics(newEntry);
    }
    setIsLogModalOpen(false);
  };

  // Readiness color styling
  const getReadinessBadge = (score: number) => {
    if (score >= 80) {
      return {
        label: 'Optimal Readiness',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        barColor: 'bg-emerald-500',
      };
    }
    if (score >= 65) {
      return {
        label: 'Adequate Recovery',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        barColor: 'bg-amber-500',
      };
    }
    return {
      label: 'Fatigue / Rest Advised',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      barColor: 'bg-rose-500',
    };
  };

  const badge = getReadinessBadge(currentDay.recoveryScore);

  return (
    <div id="health-stats-view" className="space-y-6">
      {/* Top Header & Readiness Hero */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20" />
                </div>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Health, Autonomic Balance & Recovery
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Overnight Heart Rate Variability (rMSSD), resting vitals, sleep architecture, and nervous system readiness.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Wearables...' : 'Sync Wearables'}</span>
            </button>

            <button
              onClick={() => setIsLogModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg shadow-rose-500/25"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log Biometrics</span>
            </button>
          </div>
        </div>

        {/* Hero Readiness Gauge & Key Vitals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Circular Readiness Dial & Recommendation (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center gap-5">
            {/* Dial Visual */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-neutral-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={currentDay.recoveryScore >= 80 ? 'text-emerald-400' : currentDay.recoveryScore >= 65 ? 'text-amber-400' : 'text-rose-400'}
                  strokeDasharray={`${currentDay.recoveryScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white font-mono">
                  {currentDay.recoveryScore}%
                </span>
                <span className="text-[9px] font-mono uppercase text-neutral-400">
                  Recovery
                </span>
              </div>
            </div>

            {/* Recommendation Summary */}
            <div className="space-y-1.5 text-center sm:text-left">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${badge.color}`}>
                {badge.label}
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                {currentDay.readinessRecommendation}
              </p>
              <div className="text-[10px] font-mono text-neutral-500 pt-1">
                Source: {currentDay.syncedWearable || 'Wearable Auto-Sync'}
              </div>
            </div>
          </div>

          {/* Key Vitals Grid (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* HRV */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>HRV (rMSSD)</span>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {currentDay.hrvRmssd} <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400">
                +4ms vs 7d Baseline ({currentDay.hrvBaseline}ms)
              </div>
            </div>

            {/* Resting Heart Rate */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>Resting HR</span>
                <Heart className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {currentDay.restingHr} <span className="text-xs font-normal text-neutral-400">bpm</span>
              </div>
              <div className="text-[10px] font-mono text-neutral-400">
                Athletic bradycardia
              </div>
            </div>

            {/* Sleep Duration */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>Total Sleep</span>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {currentDay.sleepHours} <span className="text-xs font-normal text-neutral-400">hrs</span>
              </div>
              <div className="text-[10px] font-mono text-indigo-300">
                Quality: {currentDay.sleepQualityScore}/100
              </div>
            </div>

            {/* SpO2 & Respiration */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>SpO2 / Resp</span>
                <Wind className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {currentDay.spo2Pct}%
              </div>
              <div className="text-[10px] font-mono text-neutral-400">
                {currentDay.respiratoryRate} br/min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 14-Day Physiological Trend & Daily Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold text-white">14-Day Autonomic Recovery Trendline</h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Click any bar to inspect historical telemetry
          </span>
        </div>

        {/* 14 Bars Visual */}
        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
          {biometricsHistory.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const barBadge = getReadinessBadge(day.recoveryScore);
            const dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' });
            const dayNumber = new Date(day.date).getDate();

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`p-2 rounded-2xl border flex flex-col items-center justify-between gap-2 transition text-center ${
                  isSelected
                    ? 'bg-neutral-800 border-orange-500 shadow-md shadow-orange-500/10'
                    : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="text-[10px] font-mono text-neutral-400">
                  <span>{dateLabel}</span>
                  <span className="block font-bold text-white">{dayNumber}</span>
                </div>

                {/* Vertical Pill Bar */}
                <div className="w-3.5 h-16 bg-neutral-900 rounded-full flex flex-col justify-end p-0.5 overflow-hidden">
                  <div
                    className={`w-full rounded-full transition-all ${barBadge.barColor}`}
                    style={{ height: `${day.recoveryScore}%` }}
                  />
                </div>

                <div className="font-mono text-[10px] font-bold text-neutral-200">
                  {day.recoveryScore}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sleep Stages & Subjective Well-being Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sleep Stages Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Sleep Architecture & Stages</h3>
            </div>
            <span className="text-xs font-mono text-indigo-400 font-bold">
              Score: {currentDay.sleepQualityScore}/100
            </span>
          </div>

          <div className="space-y-3">
            {/* Visual multi-segmented bar */}
            <div className="w-full h-4 bg-neutral-950 rounded-full flex overflow-hidden border border-neutral-800">
              <div
                className="bg-indigo-600 h-full"
                style={{ width: `${currentDay.deepSleepPct}%` }}
                title={`Deep Sleep: ${currentDay.deepSleepPct}%`}
              />
              <div
                className="bg-purple-500 h-full"
                style={{ width: `${currentDay.remSleepPct}%` }}
                title={`REM Sleep: ${currentDay.remSleepPct}%`}
              />
              <div
                className="bg-sky-500 h-full"
                style={{ width: `${100 - currentDay.deepSleepPct - currentDay.remSleepPct - 6}%` }}
                title="Light Sleep"
              />
              <div
                className="bg-rose-500 h-full"
                style={{ width: `6%` }}
                title="Awake time: 6%"
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span>Deep Sleep</span>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {currentDay.deepSleepPct}% <span className="text-[10px] text-neutral-400 font-normal">(1h 42m)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>REM Sleep</span>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {currentDay.remSleepPct}% <span className="text-[10px] text-neutral-400 font-normal">(1h 52m)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Light Sleep</span>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  48% <span className="text-[10px] text-neutral-400 font-normal">(3h 45m)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Awake</span>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  6% <span className="text-[10px] text-neutral-400 font-normal">(29m)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjective Fatigue & Biometric Signals (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Subjective & Peripheral Vitals</h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">Self-Reported</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <span className="text-neutral-400">Muscle Soreness (DOMS):</span>
              <span className={`font-bold ${currentDay.subjectiveSoreness > 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currentDay.subjectiveSoreness} / 5 ({currentDay.subjectiveSoreness <= 2 ? 'Fresh' : 'Tender'})
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <span className="text-neutral-400">Mental / Lifestyle Stress:</span>
              <span className="font-bold text-white uppercase">{currentDay.subjectiveStress}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <span className="text-neutral-400">Daily Hydration:</span>
              <span className="font-bold text-sky-400">{currentDay.hydrationLitres} Litres</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <span className="text-neutral-400">Skin Temp Deviation:</span>
              <span className="font-bold text-emerald-400">{currentDay.skinTempDeviationCelsius}°C (Normal)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Wearable Ecosystem Hub */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Watch className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold text-white">Connected Wearable Sensor Network</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>4 Devices Paired</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {wearables.map((device) => (
            <div
              key={device.id}
              className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
                    <Watch className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{device.name}</h4>
                    <span className="text-[10px] font-mono text-neutral-400 capitalize">{device.brand}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-300">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{device.batteryPct}%</span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 leading-snug">
                {device.statusMessage}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-500">
                <span>Synced: {device.lastSyncTime}</span>
                <span className="text-emerald-400 font-bold">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LOG BIOMETRICS MODAL */}
      {isLogModalOpen && (
        <div
          id="log-biometrics-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div
            id="log-biometrics-dialog"
            className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-white">Log Today's Morning Biometrics</h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Morning HRV (ms rMSSD)</label>
                  <input
                    type="number"
                    value={logHrv}
                    onChange={(e) => setLogHrv(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Resting HR (bpm)</label>
                  <input
                    type="number"
                    value={logRhr}
                    onChange={(e) => setLogRhr(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Sleep Duration (hrs)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logSleep}
                    onChange={(e) => setLogSleep(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Hydration (Litres)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={logHydration}
                    onChange={(e) => setLogHydration(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Muscle Soreness (1 to 5)</label>
                  <select
                    value={logSoreness}
                    onChange={(e) => setLogSoreness(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value={1}>1 - Completely Fresh</option>
                    <option value={2}>2 - Mild Tightness</option>
                    <option value={3}>3 - Moderate DOMS</option>
                    <option value={4}>4 - Heavy Soreness</option>
                    <option value={5}>5 - Severe Fatigue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Subjective Stress</label>
                  <select
                    value={logStress}
                    onChange={(e) => setLogStress(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="low">Low (Relaxed)</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High (Life / Travel)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20"
                >
                  Save & Update Readiness
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
