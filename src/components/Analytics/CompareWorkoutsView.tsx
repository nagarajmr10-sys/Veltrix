import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Mountain,
  Heart,
  Zap,
  Gauge,
  Clock,
  Flame,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Activity as ActivityIcon,
  RotateCcw,
  Sliders,
  Award,
  Wind,
  Droplets,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Activity, AthleteProfile, SportType } from '../../types';
import { formatDuration, formatSpeed, formatPace } from '../../utils/geoUtils';

interface CompareWorkoutsViewProps {
  activities: Activity[];
  profile: AthleteProfile;
  initialWorkoutAId?: string;
  initialWorkoutBId?: string;
  onSelectActivity?: (activity: Activity) => void;
  onBackToDashboard?: () => void;
}

export const CompareWorkoutsView: React.FC<CompareWorkoutsViewProps> = ({
  activities,
  profile,
  initialWorkoutAId,
  initialWorkoutBId,
  onSelectActivity,
  onBackToDashboard,
}) => {
  // Safe defaults for workouts A and B
  const [workoutAId, setWorkoutAId] = useState<string>(
    initialWorkoutAId && activities.some((a) => a.id === initialWorkoutAId)
      ? initialWorkoutAId
      : activities[0]?.id || ''
  );

  const [workoutBId, setWorkoutBId] = useState<string>(
    initialWorkoutBId && activities.some((a) => a.id === initialWorkoutBId)
      ? initialWorkoutBId
      : activities[1]?.id || activities[0]?.id || ''
  );

  const [sportFilter, setSportFilter] = useState<string>('all');
  const [streamMetric, setStreamMetric] = useState<'elevation' | 'heartRate' | 'powerSpeed'>('elevation');
  const [streamAxis, setStreamAxis] = useState<'percent' | 'distance'>('percent');

  // Filter selectable activities by sport if desired
  const filteredActivities = useMemo(() => {
    if (sportFilter === 'all') return activities;
    return activities.filter((a) => a.sport === sportFilter);
  }, [activities, sportFilter]);

  // Selected Activity objects
  const workoutA = useMemo(() => {
    return activities.find((a) => a.id === workoutAId) || activities[0] || null;
  }, [activities, workoutAId]);

  const workoutB = useMemo(() => {
    return activities.find((a) => a.id === workoutBId) || activities[1] || activities[0] || null;
  }, [activities, workoutBId]);

  // Quick swap A <-> B
  const handleSwapWorkouts = () => {
    setWorkoutAId(workoutBId);
    setWorkoutBId(workoutAId);
  };

  // Quick Preset Matches
  const presetMatchups = useMemo(() => {
    const list: { title: string; subtitle: string; aId: string; bId: string }[] = [];
    const cycling = activities.filter((a) => a.sport === 'cycling');
    const running = activities.filter((a) => a.sport === 'running');
    const gravel = activities.filter((a) => a.sport === 'gravel');

    if (cycling.length >= 2) {
      list.push({
        title: 'Road Endurance Head-to-Head',
        subtitle: `${cycling[0].title.slice(0, 24)}... vs ${cycling[1].title.slice(0, 24)}...`,
        aId: cycling[0].id,
        bId: cycling[1].id,
      });
    }
    if (running.length >= 2) {
      list.push({
        title: 'Running Benchmark Comparison',
        subtitle: `${running[0].title.slice(0, 24)}... vs ${running[1].title.slice(0, 24)}...`,
        aId: running[0].id,
        bId: running[1].id,
      });
    }
    if (gravel.length >= 2) {
      list.push({
        title: 'Gravel Grinder Challenge',
        subtitle: `${gravel[0].title.slice(0, 24)}... vs ${gravel[1].title.slice(0, 24)}...`,
        aId: gravel[0].id,
        bId: gravel[1].id,
      });
    }
    return list;
  }, [activities]);

  // VAM (Vertical Ascent Meters/Hour) calculations
  const vamA = useMemo(() => {
    if (!workoutA || !workoutA.durationSeconds) return 0;
    return Math.round((workoutA.elevationGainMeters / (workoutA.durationSeconds / 3600)));
  }, [workoutA]);

  const vamB = useMemo(() => {
    if (!workoutB || !workoutB.durationSeconds) return 0;
    return Math.round((workoutB.elevationGainMeters / (workoutB.durationSeconds / 3600)));
  }, [workoutB]);

  // Cardiac Efficiency Ratio (Output / HR)
  // For cycling: Watts / BPM. For running: (m/min) / BPM
  const efficiencyA = useMemo(() => {
    if (!workoutA || !workoutA.avgHeartRate) return null;
    if (workoutA.avgPower) {
      return (workoutA.avgPower / workoutA.avgHeartRate).toFixed(2);
    }
    const metersPerMin = (workoutA.avgSpeedKmh * 1000) / 60;
    return (metersPerMin / workoutA.avgHeartRate).toFixed(2);
  }, [workoutA]);

  const efficiencyB = useMemo(() => {
    if (!workoutB || !workoutB.avgHeartRate) return null;
    if (workoutB.avgPower) {
      return (workoutB.avgPower / workoutB.avgHeartRate).toFixed(2);
    }
    const metersPerMin = (workoutB.avgSpeedKmh * 1000) / 60;
    return (metersPerMin / workoutB.avgHeartRate).toFixed(2);
  }, [workoutB]);

  // HR Zones Calculation for both activities
  const lthr = profile.lthr || 172;
  const hrZonesData = useMemo(() => {
    if (!workoutA || !workoutB) return [];

    const zones = [
      { name: 'Z1 Recovery', key: 'Z1', minPct: 0, maxPct: 0.68 },
      { name: 'Z2 Aerobic', key: 'Z2', minPct: 0.68, maxPct: 0.83 },
      { name: 'Z3 Tempo', key: 'Z3', minPct: 0.83, maxPct: 0.94 },
      { name: 'Z4 Threshold', key: 'Z4', minPct: 0.94, maxPct: 1.05 },
      { name: 'Z5 Anaerobic', key: 'Z5', minPct: 1.05, maxPct: 1.50 },
    ];

    const getZoneDistribution = (act: Activity) => {
      const counts = [0, 0, 0, 0, 0];
      const pts = act.gpsTrack || [];
      if (pts.length > 0) {
        pts.forEach((p) => {
          const hr = p.heartRate || act.avgHeartRate || 140;
          const ratio = hr / lthr;
          if (ratio < 0.68) counts[0]++;
          else if (ratio < 0.83) counts[1]++;
          else if (ratio < 0.94) counts[2]++;
          else if (ratio < 1.05) counts[3]++;
          else counts[4]++;
        });
        const total = pts.length;
        return counts.map((c) => Math.round((c / total) * 100));
      } else {
        // Approximate from avg HR
        const ratio = (act.avgHeartRate || 140) / lthr;
        if (ratio < 0.80) return [20, 55, 18, 5, 2];
        if (ratio < 0.92) return [10, 35, 35, 15, 5];
        return [5, 20, 30, 35, 10];
      }
    };

    const distA = getZoneDistribution(workoutA);
    const distB = getZoneDistribution(workoutB);

    return zones.map((z, idx) => ({
      zone: z.key,
      name: z.name,
      workoutAPct: distA[idx],
      workoutBPct: distB[idx],
    }));
  }, [workoutA, workoutB, lthr]);

  // Synchronized Stream Interpolation (0% to 100% or by KM)
  const streamOverlayData = useMemo(() => {
    if (!workoutA || !workoutB) return [];

    const trackA = workoutA.gpsTrack || [];
    const trackB = workoutB.gpsTrack || [];

    const steps = 60;
    const result = [];

    const maxDist = Math.max(workoutA.distanceKm, workoutB.distanceKm);

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const pct = Math.round(fraction * 100);
      const km = Number((fraction * maxDist).toFixed(1));

      // Workout A sample
      const idxA = Math.min(Math.floor(fraction * trackA.length), trackA.length - 1);
      const ptA = trackA[idxA];
      const distA_km = Number((fraction * workoutA.distanceKm).toFixed(1));

      // Workout B sample
      const idxB = Math.min(Math.floor(fraction * trackB.length), trackB.length - 1);
      const ptB = trackB[idxB];
      const distB_km = Number((fraction * workoutB.distanceKm).toFixed(1));

      // Elevation
      const eleA = ptA?.altitude ?? Math.round(workoutA.elevationGainMeters * Math.sin(fraction * Math.PI) + 1500);
      const eleB = ptB?.altitude ?? Math.round(workoutB.elevationGainMeters * Math.sin(fraction * Math.PI) + 1500);

      // Heart rate
      const hrA = ptA?.heartRate ?? workoutA.avgHeartRate ?? 145;
      const hrB = ptB?.heartRate ?? workoutB.avgHeartRate ?? 145;

      // Power / Speed
      const pwrA = ptA?.power ?? workoutA.avgPower ?? (workoutA.sport === 'cycling' ? 240 : 330);
      const pwrB = ptB?.power ?? workoutB.avgPower ?? (workoutB.sport === 'cycling' ? 240 : 330);

      const spdA = ptA?.speed ? ptA.speed * 3.6 : workoutA.avgSpeedKmh;
      const spdB = ptB?.speed ? ptB.speed * 3.6 : workoutB.avgSpeedKmh;

      result.push({
        step: i,
        progress: `${pct}%`,
        pct,
        distA_km,
        distB_km,
        km,
        eleA: Math.round(eleA),
        eleB: Math.round(eleB),
        hrA: Math.round(hrA),
        hrB: Math.round(hrB),
        pwrA: Math.round(pwrA),
        pwrB: Math.round(pwrB),
        spdA: Number(spdA.toFixed(1)),
        spdB: Number(spdB.toFixed(1)),
      });
    }

    return result;
  }, [workoutA, workoutB]);

  // Delta Helper
  const renderDelta = (
    valA: number,
    valB: number,
    unit = '',
    options: { invertColors?: boolean; decimals?: number; asPercent?: boolean } = {}
  ) => {
    const { invertColors = false, decimals = 1, asPercent = true } = options;
    const diff = valB - valA;
    if (diff === 0) {
      return <span className="text-neutral-500 font-mono text-[11px]">Equal</span>;
    }

    const pctDiff = valA !== 0 ? ((diff / valA) * 100).toFixed(decimals) : '0';
    const isPositive = diff > 0;

    // By default, higher is green/positive unless inverted (e.g. for time/pace where lower is better)
    const isAdvantage = invertColors ? !isPositive : isPositive;

    const colorClass = isAdvantage ? 'text-emerald-400' : 'text-rose-400';
    const sign = isPositive ? '+' : '';

    return (
      <span className={`font-mono text-[11px] font-semibold ${colorClass}`}>
        {sign}
        {diff.toFixed(decimals)}
        {unit} {asPercent && `(${sign}${pctDiff}%)`}
      </span>
    );
  };

  if (!workoutA || !workoutB) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 font-mono">
        <p>At least two workouts are required to run comparative analysis.</p>
      </div>
    );
  }

  return (
    <div id="compare-workouts-view" className="space-y-6">
      {/* Top Banner & Workout Selectors */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Head-to-Head Comparison
              </span>
              <span className="text-xs text-neutral-400 font-mono">Workout Telemetry Dual Overlay</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Compare Individual Workouts</span>
              <ArrowLeftRight className="w-5 h-5 text-orange-400" />
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Overlay elevation profiles, physiological heart rate loads, power output, and split paces between two individual training sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            {onBackToDashboard && (
              <button
                id="back-to-single-dashboard-btn"
                onClick={onBackToDashboard}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
              >
                Back to Single Dashboard
              </button>
            )}

            {/* Sport Filter */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
              {(['all', 'cycling', 'running', 'gravel'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSportFilter(s)}
                  className={`px-2.5 py-1 rounded-lg capitalize text-[11px] transition ${
                    sportFilter === s ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workout A vs Workout B Selection Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-3 border-t border-neutral-800/80">
          {/* Workout A Selector */}
          <div className="md:col-span-5 bg-neutral-950 border border-sky-500/40 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-sky-300">
                  Workout A (Baseline)
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {new Date(workoutA.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <select
              id="compare-select-workout-a"
              value={workoutAId}
              onChange={(e) => setWorkoutAId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 text-white text-xs font-mono rounded-lg p-2 focus:outline-none focus:border-sky-500"
            >
              {filteredActivities.map((act) => (
                <option key={`a-${act.id}`} value={act.id}>
                  {act.title} · {act.distanceKm.toFixed(1)}km · +{act.elevationGainMeters}m ({act.sport})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1">
              <span>{workoutA.distanceKm.toFixed(1)} km</span>
              <span>+{workoutA.elevationGainMeters}m</span>
              <span>{formatDuration(workoutA.movingTimeSeconds || workoutA.durationSeconds)}</span>
              <span className="text-sky-400">{workoutA.avgSpeedKmh.toFixed(1)} km/h</span>
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-2 flex justify-center">
            <button
              id="swap-compare-workouts-btn"
              onClick={handleSwapWorkouts}
              className="p-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white transition flex flex-col items-center gap-1 group shadow-lg"
              title="Swap Workout A and Workout B"
            >
              <ArrowLeftRight className="w-4 h-4 text-orange-400 group-hover:rotate-180 transition-transform duration-300" />
              <span className="text-[9px] font-mono uppercase font-bold tracking-wider text-neutral-400 group-hover:text-neutral-200">
                Swap A ⇄ B
              </span>
            </button>
          </div>

          {/* Workout B Selector */}
          <div className="md:col-span-5 bg-neutral-950 border border-orange-500/40 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-400" />
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-orange-300">
                  Workout B (Comparison)
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {new Date(workoutB.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <select
              id="compare-select-workout-b"
              value={workoutBId}
              onChange={(e) => setWorkoutBId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 text-white text-xs font-mono rounded-lg p-2 focus:outline-none focus:border-orange-500"
            >
              {filteredActivities.map((act) => (
                <option key={`b-${act.id}`} value={act.id}>
                  {act.title} · {act.distanceKm.toFixed(1)}km · +{act.elevationGainMeters}m ({act.sport})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1">
              <span>{workoutB.distanceKm.toFixed(1)} km</span>
              <span>+{workoutB.elevationGainMeters}m</span>
              <span>{formatDuration(workoutB.movingTimeSeconds || workoutB.durationSeconds)}</span>
              <span className="text-orange-400">{workoutB.avgSpeedKmh.toFixed(1)} km/h</span>
            </div>
          </div>
        </div>

        {/* Quick Presets Pills */}
        {presetMatchups.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono">
            <span className="text-neutral-500 text-[11px] uppercase tracking-wider">Quick Matchups:</span>
            {presetMatchups.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setWorkoutAId(preset.aId);
                  setWorkoutBId(preset.bId);
                }}
                className={`px-3 py-1 rounded-lg border text-[11px] transition ${
                  workoutAId === preset.aId && workoutBId === preset.bId
                    ? 'bg-neutral-800 text-orange-400 border-orange-500/50'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                }`}
              >
                {preset.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HEAD-TO-HEAD KPI COMPARISON GRID                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        {/* Distance Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Total Distance</span>
            <span className="text-neutral-500">km</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">{workoutA.distanceKm.toFixed(1)} km</span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">{workoutB.distanceKm.toFixed(1)} km</span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Delta:</span>
              {renderDelta(workoutA.distanceKm, workoutB.distanceKm, 'km')}
            </div>
          </div>
        </div>

        {/* Elevation Gain Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Elevation Gain</span>
            <Mountain className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">+{workoutA.elevationGainMeters}m</span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">+{workoutB.elevationGainMeters}m</span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Delta:</span>
              {renderDelta(workoutA.elevationGainMeters, workoutB.elevationGainMeters, 'm')}
            </div>
          </div>
        </div>

        {/* Speed / Pace Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">
              {workoutA.sport === 'running' || workoutA.sport === 'trail_running' ? 'Avg Pace' : 'Avg Speed'}
            </span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">{workoutA.avgSpeedKmh.toFixed(1)} km/h</span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">{workoutB.avgSpeedKmh.toFixed(1)} km/h</span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Delta:</span>
              {renderDelta(workoutA.avgSpeedKmh, workoutB.avgSpeedKmh, 'km/h')}
            </div>
          </div>
        </div>

        {/* Heart Rate & Load Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Avg Heart Rate</span>
            <Heart className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">
                {workoutA.avgHeartRate || '--'} <span className="text-[10px] text-neutral-400">bpm</span>
              </span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">
                {workoutB.avgHeartRate || '--'} <span className="text-[10px] text-neutral-400">bpm</span>
              </span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Delta:</span>
              {workoutA.avgHeartRate && workoutB.avgHeartRate ? (
                renderDelta(workoutA.avgHeartRate, workoutB.avgHeartRate, 'bpm', { invertColors: true })
              ) : (
                <span className="text-neutral-500 text-[10px]">N/A</span>
              )}
            </div>
          </div>
        </div>

        {/* Normalized Power / TSS Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Training Stress (TSS)</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">{workoutA.tss} TSS</span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">{workoutB.tss} TSS</span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Delta:</span>
              {renderDelta(workoutA.tss, workoutB.tss, ' TSS')}
            </div>
          </div>
        </div>

        {/* Normalized Power (NP) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Normalized Power (NP)</span>
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">{workoutA.normalizedPower || workoutA.avgPower || '--'}W</span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">{workoutB.normalizedPower || workoutB.avgPower || '--'}W</span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Delta:</span>
              {workoutA.normalizedPower && workoutB.normalizedPower ? (
                renderDelta(workoutA.normalizedPower, workoutB.normalizedPower, 'W')
              ) : (
                <span className="text-neutral-500 text-[10px]">N/A</span>
              )}
            </div>
          </div>
        </div>

        {/* VAM Climbing Speed */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Climbing VAM</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">{vamA} m/hr</span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">{vamB} m/hr</span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Delta:</span>
              {renderDelta(vamA, vamB, ' m/hr')}
            </div>
          </div>
        </div>

        {/* Cardiac Efficiency Ratio */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Cardiac Efficiency</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-400 font-bold">{efficiencyA || '--'}</span>
              <span className="text-neutral-500 text-xs">vs</span>
              <span className="text-orange-400 font-bold">{efficiencyB || '--'}</span>
            </div>
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-500 text-[10px]">Output/BPM:</span>
              <span className="text-neutral-400 text-[10px] font-mono">
                {efficiencyA && efficiencyB
                  ? Number(efficiencyB) >= Number(efficiencyA)
                    ? 'Workout B More Economical'
                    : 'Workout A More Economical'
                  : 'Relative Strain'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: SYNCHRONIZED TELEMETRY STREAM OVERLAYS (RECHARTS)              */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Synchronized Telemetry Stream Overlay</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                {streamOverlayData.length} sampled trajectory points
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Compare spatial and physiological curves side-by-side along the normalized route progression.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Toggle */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
              <button
                id="stream-metric-ele-btn"
                onClick={() => setStreamMetric('elevation')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  streamMetric === 'elevation'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                <span>Elevation Profile</span>
              </button>

              <button
                id="stream-metric-hr-btn"
                onClick={() => setStreamMetric('heartRate')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  streamMetric === 'heartRate'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Heart Rate Stream</span>
              </button>

              <button
                id="stream-metric-power-btn"
                onClick={() => setStreamMetric('powerSpeed')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  streamMetric === 'powerSpeed'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Power & Speed</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend Banner */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono bg-neutral-950 px-4 py-2.5 rounded-xl border border-neutral-800/80">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400" />
              <span className="text-sky-300 font-bold">Workout A: {workoutA.title}</span>
              <span className="text-neutral-500">({workoutA.distanceKm.toFixed(1)}km)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400" />
              <span className="text-orange-300 font-bold">Workout B: {workoutB.title}</span>
              <span className="text-neutral-500">({workoutB.distanceKm.toFixed(1)}km)</span>
            </div>
          </div>

          {streamMetric === 'heartRate' && (
            <div className="flex items-center gap-2 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-500" />
              <span>LTHR Threshold: {lthr} bpm</span>
            </div>
          )}
        </div>

        {/* Recharts Stream Graph */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {streamMetric === 'elevation' ? (
              <AreaChart data={streamOverlayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEleA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorEleB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="progress" stroke="#737373" fontSize={11} fontStyle="mono" />
                <YAxis stroke="#737373" fontSize={11} fontStyle="mono" unit="m" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5">
                          <div className="font-bold text-white border-b border-neutral-800 pb-1">
                            Progress: {data.progress}
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sky-400">
                            <span>Workout A Altitude:</span>
                            <span className="font-bold">{data.eleA}m ({data.distA_km}km)</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-orange-400">
                            <span>Workout B Altitude:</span>
                            <span className="font-bold">{data.eleB}m ({data.distB_km}km)</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800 flex justify-between">
                            <span>Elevation Delta:</span>
                            <span className="font-bold text-white">
                              {data.eleB - data.eleA > 0 ? `+${data.eleB - data.eleA}m` : `${data.eleB - data.eleA}m`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="eleA"
                  name={`A: ${workoutA.title}`}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorEleA)"
                />
                <Area
                  type="monotone"
                  dataKey="eleB"
                  name={`B: ${workoutB.title}`}
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorEleB)"
                />
              </AreaChart>
            ) : streamMetric === 'heartRate' ? (
              <LineChart data={streamOverlayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="progress" stroke="#737373" fontSize={11} fontStyle="mono" />
                <YAxis stroke="#737373" fontSize={11} fontStyle="mono" unit="bpm" domain={['dataMin - 10', 'dataMax + 10']} />
                <ReferenceLine y={lthr} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `LTHR (${lthr})`, fill: '#f43f5e', fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5">
                          <div className="font-bold text-white border-b border-neutral-800 pb-1">
                            Progress: {data.progress}
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sky-400">
                            <span>Workout A Heart Rate:</span>
                            <span className="font-bold">{data.hrA} bpm</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-orange-400">
                            <span>Workout B Heart Rate:</span>
                            <span className="font-bold">{data.hrB} bpm</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800 flex justify-between">
                            <span>HR Variance:</span>
                            <span className="font-bold text-white">
                              {data.hrB - data.hrA > 0 ? `+${data.hrB - data.hrA} bpm` : `${data.hrB - data.hrA} bpm`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hrA"
                  name={`A: ${workoutA.title}`}
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="hrB"
                  name={`B: ${workoutB.title}`}
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            ) : (
              <LineChart data={streamOverlayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="progress" stroke="#737373" fontSize={11} fontStyle="mono" />
                <YAxis stroke="#737373" fontSize={11} fontStyle="mono" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5">
                          <div className="font-bold text-white border-b border-neutral-800 pb-1">
                            Progress: {data.progress}
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sky-400">
                            <span>Workout A Output:</span>
                            <span className="font-bold">{data.pwrA}W ({data.spdA} km/h)</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-orange-400">
                            <span>Workout B Output:</span>
                            <span className="font-bold">{data.pwrB}W ({data.spdB} km/h)</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800 flex justify-between">
                            <span>Power Delta:</span>
                            <span className="font-bold text-white">
                              {data.pwrB - data.pwrA > 0 ? `+${data.pwrB - data.pwrA}W` : `${data.pwrB - data.pwrA}W`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pwrA"
                  name="Workout A Power (W)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pwrB"
                  name="Workout B Power (W)"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: PHYSIOLOGICAL HR ZONE DISTRIBUTION COMPARISON                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Heart Rate Zone Distribution</span>
                <Heart className="w-4 h-4 text-rose-400" />
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Side-by-side comparison of aerobic vs anaerobic intensity distribution (% of workout duration).
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400">LTHR: {lthr} bpm</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hrZonesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="name" stroke="#737373" fontSize={11} fontStyle="mono" />
                <YAxis stroke="#737373" fontSize={11} fontStyle="mono" unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1">
                          <div className="font-bold text-white border-b border-neutral-800 pb-1">{data.name}</div>
                          <div className="flex justify-between gap-4 text-sky-400">
                            <span>Workout A:</span>
                            <span className="font-bold">{data.workoutAPct}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-orange-400">
                            <span>Workout B:</span>
                            <span className="font-bold">{data.workoutBPct}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="workoutAPct" name={`A: ${workoutA.title}`} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="workoutBPct" name={`B: ${workoutB.title}`} fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Environmental & Context Comparison */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Context & Equipment</span>
              <Sliders className="w-4 h-4 text-orange-400" />
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Subjective exertion, gear setup, and environmental variables.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Gear Used */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
              <div className="text-neutral-400 text-[11px] uppercase tracking-wider font-sans font-semibold">
                Equipment / Gear Logged
              </div>
              <div className="flex justify-between items-center text-sky-400">
                <span>Workout A:</span>
                <span className="font-bold text-white">{workoutA.gearName || 'Standard Fleet'}</span>
              </div>
              <div className="flex justify-between items-center text-orange-400">
                <span>Workout B:</span>
                <span className="font-bold text-white">{workoutB.gearName || 'Standard Fleet'}</span>
              </div>
            </div>

            {/* Perceived Exertion */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
              <div className="text-neutral-400 text-[11px] uppercase tracking-wider font-sans font-semibold">
                Perceived Exertion (RPE 1-10)
              </div>
              <div className="flex justify-between items-center text-sky-400">
                <span>Workout A:</span>
                <span className="font-bold text-white">{workoutA.perceivedExertion}/10</span>
              </div>
              <div className="flex justify-between items-center text-orange-400">
                <span>Workout B:</span>
                <span className="font-bold text-white">{workoutB.perceivedExertion}/10</span>
              </div>
            </div>

            {/* Weather & Temperature */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
              <div className="text-neutral-400 text-[11px] uppercase tracking-wider font-sans font-semibold flex items-center gap-1.5">
                <Wind className="w-3 h-3 text-neutral-400" />
                <span>Weather Conditions</span>
              </div>
              <div className="flex justify-between items-center text-sky-400">
                <span>Workout A:</span>
                <span className="text-white">
                  {workoutA.weather ? `${workoutA.weather.tempC}°C · ${workoutA.weather.condition}` : '20°C Clear'}
                </span>
              </div>
              <div className="flex justify-between items-center text-orange-400">
                <span>Workout B:</span>
                <span className="text-white">
                  {workoutB.weather ? `${workoutB.weather.tempC}°C · ${workoutB.weather.condition}` : '18°C Sunny'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Deep Dive Links */}
          <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
            <button
              onClick={() => onSelectActivity && onSelectActivity(workoutA)}
              className="flex-1 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-xs flex items-center justify-center gap-1 transition"
            >
              <span>Map Workout A</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectActivity && onSelectActivity(workoutB)}
              className="flex-1 py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 font-mono text-xs flex items-center justify-center gap-1 transition"
            >
              <span>Map Workout B</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: SPLIT-BY-SPLIT / LAP COMPARATIVE TABLE                        */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Split-by-Split Lap Comparison</span>
              <Layers className="w-4 h-4 text-orange-400" />
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Direct split pacing, interval duration, climbing gain, and physiological demand per segment.
            </p>
          </div>

          <div className="text-xs font-mono text-neutral-400 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>A: {workoutA.laps?.length || 0} Laps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span>B: {workoutB.laps?.length || 0} Laps</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 font-sans text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Split / Interval</th>
                <th className="py-2.5 px-3 text-sky-400">Workout A Distance & Time</th>
                <th className="py-2.5 px-3 text-sky-400">Workout A Pace / Power</th>
                <th className="py-2.5 px-3 text-orange-400">Workout B Distance & Time</th>
                <th className="py-2.5 px-3 text-orange-400">Workout B Pace / Power</th>
                <th className="py-2.5 px-3 text-right">Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {Array.from({
                length: Math.max(workoutA.laps?.length || 0, workoutB.laps?.length || 0, 1),
              }).map((_, idx) => {
                const lapA = workoutA.laps?.[idx];
                const lapB = workoutB.laps?.[idx];

                // Speed comparison
                const spdA = lapA ? lapA.avgSpeedKmh : null;
                const spdB = lapB ? lapB.avgSpeedKmh : null;
                const hasBoth = spdA !== null && spdB !== null;

                const bIsFaster = hasBoth ? spdB > spdA : false;
                const diffSpeed = hasBoth ? Math.abs(spdB - spdA).toFixed(1) : null;

                return (
                  <tr key={idx} className="hover:bg-neutral-800/40 transition">
                    <td className="py-3 px-3 font-bold text-white">
                      Split #{idx + 1}
                    </td>

                    {/* Workout A details */}
                    <td className="py-3 px-3">
                      {lapA ? (
                        <div>
                          <div className="text-white font-bold">{lapA.distanceKm.toFixed(1)} km</div>
                          <div className="text-neutral-400 text-[11px]">{formatDuration(lapA.durationSeconds)} · +{lapA.elevationGainMeters}m</div>
                        </div>
                      ) : (
                        <span className="text-neutral-600">--</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {lapA ? (
                        <div>
                          <div className="text-sky-300 font-bold">{lapA.avgSpeedKmh.toFixed(1)} km/h</div>
                          <div className="text-neutral-400 text-[11px]">
                            {lapA.avgPower ? `${lapA.avgPower}W · ` : ''}
                            {lapA.avgHeartRate ? `${lapA.avgHeartRate} bpm` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-600">--</span>
                      )}
                    </td>

                    {/* Workout B details */}
                    <td className="py-3 px-3">
                      {lapB ? (
                        <div>
                          <div className="text-white font-bold">{lapB.distanceKm.toFixed(1)} km</div>
                          <div className="text-neutral-400 text-[11px]">{formatDuration(lapB.durationSeconds)} · +{lapB.elevationGainMeters}m</div>
                        </div>
                      ) : (
                        <span className="text-neutral-600">--</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {lapB ? (
                        <div>
                          <div className="text-orange-300 font-bold">{lapB.avgSpeedKmh.toFixed(1)} km/h</div>
                          <div className="text-neutral-400 text-[11px]">
                            {lapB.avgPower ? `${lapB.avgPower}W · ` : ''}
                            {lapB.avgHeartRate ? `${lapB.avgHeartRate} bpm` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-600">--</span>
                      )}
                    </td>

                    {/* Advantage */}
                    <td className="py-3 px-3 text-right">
                      {hasBoth ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            bIsFaster
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {bIsFaster ? `Workout B +${diffSpeed} km/h` : `Workout A +${diffSpeed} km/h`}
                        </span>
                      ) : (
                        <span className="text-neutral-600 text-[10px]">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
