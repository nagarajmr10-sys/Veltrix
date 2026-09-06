import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Zap,
  Flame,
  TrendingUp,
  Award,
  Trophy,
  Activity,
  Gauge,
  Clock,
  Calendar,
  Mountain,
  Heart,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { AthleteProfile, PerformanceStatsData } from '../../types';
import { INITIAL_PERFORMANCE_STATS } from '../../data/healthAndPerformanceData';

interface PerformanceStatsViewProps {
  profile: AthleteProfile;
  onOpenCurves?: () => void;
  onOpenZones?: () => void;
}

export const PerformanceStatsView: React.FC<PerformanceStatsViewProps> = ({
  profile,
  onOpenCurves,
  onOpenZones,
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'season' | 'all'>('30d');
  const [activeSportFilter, setActiveSportFilter] = useState<'all' | 'cycling' | 'running'>('all');
  const stats: PerformanceStatsData = INITIAL_PERFORMANCE_STATS;

  // Multiplier adjustments based on selected timeframe
  const timeframeMultiplier =
    timeframe === '7d' ? 0.25 : timeframe === '30d' ? 1.0 : timeframe === '90d' ? 2.9 : 7.2;

  const totalDist = Math.round(stats.last30Days.totalDistanceKm * timeframeMultiplier);
  const totalElev = Math.round(stats.last30Days.totalElevationMeters * timeframeMultiplier);
  const totalHours = (stats.last30Days.totalActiveHours * timeframeMultiplier).toFixed(1);
  const totalTSS = Math.round(stats.last30Days.totalTSS * timeframeMultiplier);
  const totalKj = Math.round(stats.last30Days.totalKilojoules * timeframeMultiplier);

  // Benchmarks comparisons
  const wKg = (profile.ftpWatts / profile.weightKg).toFixed(2);
  const vo2Category =
    stats.vo2MaxEstimate >= 60
      ? 'Superior (Elite Endurance Cat 1/Pro)'
      : stats.vo2MaxEstimate >= 52
      ? 'Excellent (Cat 2/3 Competitive)'
      : 'Good (Trained Age-Grouper)';

  // Power curve chart data
  const powerCurveChartData = stats.powerPRs.map((pr) => ({
    name: pr.durationLabel,
    watts: pr.watts,
    wattsPerKg: pr.wattsPerKg,
    activityTitle: pr.activityTitle,
  }));

  return (
    <div id="performance-stats-view" className="space-y-6">
      {/* Header & Timeframe Switcher */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                ATHLETE PERFORMANCE STATS
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Aerobic capacity, power-duration milestones, critical velocity & physiological decoupling
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe Pills */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 self-start md:self-auto">
          {(
            [
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'season', label: '2026 Season' },
              { id: 'all', label: 'All-Time' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeframe(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                timeframe === item.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* CORE ENGINE STATS (FTP, W/KG, VO2, CRITICAL POWER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FTP & W/kg */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              Threshold Power (FTP)
            </span>
            <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {profile.ftpWatts}
              </span>
              <span className="text-sm font-mono text-neutral-500">Watts</span>
            </div>
            <div className="text-xs font-mono text-orange-400 font-bold mt-1">
              {wKg} W/kg <span className="text-neutral-500 font-normal">(@ {profile.weightKg}kg)</span>
            </div>
          </div>
          <div className="text-[10px] text-neutral-400 pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span>Cat 1 Road Benchmark</span>
            <span className="text-emerald-400 font-bold">+15W vs Spring</span>
          </div>
        </div>

        {/* VO2 Max */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              Aerobic Capacity (VO2 Max)
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {stats.vo2MaxEstimate}
              </span>
              <span className="text-sm font-mono text-neutral-500">ml/kg/min</span>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold mt-1">
              {vo2Category}
            </div>
          </div>
          <div className="text-[10px] text-neutral-400 pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span>Top 2% Endurance Tier</span>
            <span className="text-emerald-400 font-bold">Lab Calibrated</span>
          </div>
        </div>

        {/* Critical Power & W' */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              Critical Power & W' Reserve
            </span>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Gauge className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {stats.criticalPowerWatts}
              </span>
              <span className="text-sm font-mono text-neutral-500">CP Watts</span>
            </div>
            <div className="text-xs font-mono text-sky-400 font-bold mt-1">
              {(stats.wPrimeJoules / 1000).toFixed(1)} kJ W' Anaerobic Work
            </div>
          </div>
          <div className="text-[10px] text-neutral-400 pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span>Hyperbolic 2-Parameter Model</span>
            <span className="text-sky-400 font-bold">R² = 0.992</span>
          </div>
        </div>

        {/* Aerobic Decoupling & Efficiency Factor */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              Aerobic Decoupling (Pw:HR)
            </span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Heart className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {stats.aerobicDecouplingPct}%
              </span>
              <span className="text-sm font-mono text-neutral-500">Cardiac Drift</span>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold mt-1">
              EF: {stats.efficiencyFactor} W/bpm <span className="text-neutral-500 font-normal">(&lt; 5% is gold)</span>
            </div>
          </div>
          <div className="text-[10px] text-neutral-400 pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span>Cardiovascular Endurance Base</span>
            <span className="text-emerald-400 font-bold">Elite Aerobic Base</span>
          </div>
        </div>
      </div>

      {/* TRAINING VOLUME & POLARIZED ZONE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aggregated Volume for timeframe */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Mountain className="w-4 h-4 text-orange-400" />
              VOLUME & WORKLOAD ({timeframe.toUpperCase()})
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Total Distance</div>
              <div className="text-xl font-black text-white font-mono mt-1">
                {totalDist} <span className="text-xs font-normal text-neutral-500">km</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Elevation Gain</div>
              <div className="text-xl font-black text-white font-mono mt-1">
                +{totalElev} <span className="text-xs font-normal text-neutral-500">m</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Time Moving</div>
              <div className="text-xl font-black text-white font-mono mt-1">
                {totalHours} <span className="text-xs font-normal text-neutral-500">hours</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Training Stress (TSS)</div>
              <div className="text-xl font-black text-orange-400 font-mono mt-1">
                {totalTSS} <span className="text-xs font-normal text-neutral-500">pts</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">Total Mechanical Energy:</span>
            <span className="text-amber-400 font-bold">{totalKj.toLocaleString()} kJ</span>
          </div>
        </div>

        {/* Polarized 80/20 Distribution Bar */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                POLARIZED INTENSITY DISTRIBUTION (80/20 PRINCIPLE)
              </h3>
              {onOpenZones && (
                <button
                  onClick={onOpenZones}
                  className="text-xs text-orange-400 hover:text-orange-300 font-mono flex items-center gap-1"
                >
                  <span>Edit Zones</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Pro endurance distribution: 75-80% low intensity (Z1-Z2), 5-10% tempo (Z3), 15-20% high intensity (Z4-Z6)
            </p>

            {/* Combined distribution bar */}
            <div className="h-4 w-full bg-neutral-950 rounded-full overflow-hidden flex mt-4">
              {stats.zoneDistribution.map((z, idx) => (
                <div
                  key={idx}
                  style={{ width: `${z.percentage}%`, backgroundColor: z.color }}
                  className="h-full transition-all duration-500 hover:opacity-80"
                  title={`${z.zone}: ${z.percentage}% (${z.hours}h)`}
                />
              ))}
            </div>

            {/* Legend Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {stats.zoneDistribution.map((z, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                    <span className="text-[11px] font-mono text-neutral-300 truncate">{z.zone}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1 text-xs font-mono">
                    <span className="text-neutral-500">{z.hours}h</span>
                    <span className="text-white font-bold">{z.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Polarization Index: <strong>1.84</strong> (Optimal aerobic stimulus without chronic autonomic fatigue)</span>
            </span>
          </div>
        </div>
      </div>

      {/* POWER DURATION BENCHMARKS MATRIX */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              CYCLING POWER DURATION PERSONAL RECORDS (PRs)
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Peak sustained wattage records across standard physiological test durations
            </p>
          </div>
          {onOpenCurves && (
            <button
              onClick={onOpenCurves}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-bold text-neutral-200 border border-neutral-700 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View Full MMP Curve</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
            </button>
          )}
        </div>

        {/* PR Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.powerPRs.map((pr, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 hover:border-neutral-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {pr.durationLabel}
                </span>
                {pr.isAllTimeBest && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                    PR
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {pr.watts} <span className="text-xs font-normal text-neutral-500">W</span>
              </div>
              <div className="text-xs font-mono text-orange-400 font-bold">
                {pr.wattsPerKg} W/kg
              </div>
              <div className="text-[10px] text-neutral-500 font-mono truncate" title={pr.activityTitle}>
                {pr.dateAchieved.slice(5)} · {pr.activityTitle}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Visual Bar of Watts by Duration */}
        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={powerCurveChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#404040"
              />
              <YAxis
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
                formatter={(val: number) => [`${val} Watts`, 'Mean Maximal Power']}
              />
              <Bar dataKey="watts" radius={[4, 4, 0, 0]}>
                {powerCurveChartData.map((_, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={index === 0 ? '#f97316' : index === 1 ? '#fb923c' : index === 2 ? '#fbbf24' : '#38bdf8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RUNNING DISTANCE & PACING PRs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              RUNNING SPEED & DISTANCE BENCHMARKS
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Verified GPS personal records across key track and road distances
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Threshold: {profile.thresholdPaceSecondsPerKm ? '3:48 /km' : '3:55 /km'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {stats.pacePRs.map((pr, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 hover:border-neutral-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 font-mono">
                  {pr.distanceLabel}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                  PR
                </span>
              </div>
              <div className="text-xl font-black text-white font-mono tracking-tight">
                {pr.totalTime}
              </div>
              <div className="text-xs font-mono text-emerald-400 font-bold">
                {pr.formattedPace}
              </div>
              <div className="text-[10px] text-neutral-500 font-mono truncate" title={pr.activityTitle}>
                {pr.dateAchieved} · {pr.activityTitle}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
