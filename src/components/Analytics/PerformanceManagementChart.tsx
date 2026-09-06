import React, { useState, useMemo } from 'react';
import { DailyTrainingMetric } from '../../types';
import {
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Activity,
  Info,
  Calendar,
  ArrowRight,
  Zap,
  Check,
  TrendingDown,
} from 'lucide-react';

interface PMCProps {
  metrics: DailyTrainingMetric[];
}

export type ForecastScenario = 'linear' | 'average' | 'taper' | 'overload';

export interface ProjectedDailyMetric {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  dayOffset: number; // 1 to 7
  isProjected: true;
}

export const PerformanceManagementChart: React.FC<PMCProps> = ({ metrics }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'30' | '45' | 'all'>('45');
  const [showProjection, setShowProjection] = useState<boolean>(true);
  const [forecastScenario, setForecastScenario] = useState<ForecastScenario>('linear');

  // Filter historical metrics based on range
  const filteredMetrics = useMemo(() => {
    if (timeRange === '30') return metrics.slice(-30);
    if (timeRange === '45') return metrics.slice(-45);
    return metrics;
  }, [metrics, timeRange]);

  const latest = metrics[metrics.length - 1] || { ctl: 72, atl: 78, tsb: -6, tss: 0, date: '' };

  // Calculate 7-day ramp rate (CTL change over last 7 days)
  const ctl7DaysAgo = metrics.length >= 8 ? metrics[metrics.length - 8].ctl : latest.ctl;
  const rampRate = Number((latest.ctl - ctl7DaysAgo).toFixed(1));

  // Determine Form State
  const getFormState = (tsb: number) => {
    if (tsb > 25) return { label: 'Transition / Detraining', color: 'text-neutral-400', bg: 'bg-neutral-800/80', desc: 'Resting too long, aerobic fitness decaying' };
    if (tsb >= 5) return { label: 'Race Ready / Peak Freshness', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30', desc: 'Optimal freshness and neuromuscular snap for race day' };
    if (tsb >= -10) return { label: 'Neutral / Maintenance', color: 'text-sky-400', bg: 'bg-sky-500/10 border border-sky-500/30', desc: 'Good balance between aerobic stimulus and freshness' };
    if (tsb >= -30) return { label: 'Productive Training', color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/30', desc: 'Optimal progressive overload building long-term fitness' };
    return { label: 'High Fatigue / Overreaching Risk', color: 'text-rose-400', bg: 'bg-rose-500/10 border border-rose-500/30', desc: 'High risk of autonomic burnout, illness, or injury' };
  };

  const formState = getFormState(latest.tsb);

  // -------------------------------------------------------------
  // 4-WEEK BASELINE & 7-DAY LINEAR LOAD FORECAST COMPUTATION
  // -------------------------------------------------------------
  // Extract last 4 weeks of training history (28 days)
  const fourWeeksMetrics = useMemo(() => {
    return metrics.slice(-28);
  }, [metrics]);

  // Compute 4-week linear regression on daily TSS (slope & intercept)
  const forecastStats = useMemo(() => {
    const n = fourWeeksMetrics.length;
    if (n === 0) return { slope: 0, intercept: 70, avgTss: 70, weeklyTss: 490 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = fourWeeksMetrics[i].tss;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const avgTss = Math.round(sumY / n);
    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope: Number(slope.toFixed(2)),
      intercept: Number(intercept.toFixed(1)),
      avgTss,
      weeklyTss: Math.round(avgTss * 7),
    };
  }, [fourWeeksMetrics]);

  // Compute the 7-day future projected daily metrics (CTL, ATL, TSB)
  const projectedMetrics = useMemo<ProjectedDailyMetric[]>(() => {
    if (metrics.length === 0) return [];
    const latestMetric = metrics[metrics.length - 1];
    const lastDate = new Date(latestMetric.date || new Date().toISOString().split('T')[0]);

    let currentCtl = latestMetric.ctl;
    let currentAtl = latestMetric.atl;
    const n = fourWeeksMetrics.length;
    const points: ProjectedDailyMetric[] = [];

    for (let d = 1; d <= 7; d++) {
      const futureDate = new Date(lastDate.getTime() + d * 86400 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Daily projected TSS based on scenario
      let projectedTss: number;
      if (forecastScenario === 'linear') {
        // Simple linear forecast extending regression from the 4-week training baseline
        const rawTss = forecastStats.intercept + forecastStats.slope * (n - 1 + d);
        projectedTss = Math.max(15, Math.min(230, Math.round(rawTss)));
      } else if (forecastScenario === 'average') {
        projectedTss = Math.max(15, forecastStats.avgTss);
      } else if (forecastScenario === 'taper') {
        // Linear step-down taper: 60% -> 15% daily load for peaking
        const factor = Math.max(0.12, 0.65 - (d - 1) * 0.08);
        projectedTss = Math.round(forecastStats.avgTss * factor);
      } else {
        // Overload camp: +25% above 4-week baseline
        projectedTss = Math.round(forecastStats.avgTss * 1.25);
      }

      // Standard TrainingPeaks impulse-response decay
      currentCtl = currentCtl + (projectedTss - currentCtl) / 42;
      currentAtl = currentAtl + (projectedTss - currentAtl) / 7;
      const currentTsb = Math.round(currentCtl - currentAtl);

      points.push({
        date: dateStr,
        tss: projectedTss,
        ctl: Math.round(currentCtl * 10) / 10,
        atl: Math.round(currentAtl * 10) / 10,
        tsb: currentTsb,
        dayOffset: d,
        isProjected: true,
      });
    }

    return points;
  }, [metrics, fourWeeksMetrics, forecastStats, forecastScenario]);

  // Final 7-day projected outcome
  const finalProjected = projectedMetrics[projectedMetrics.length - 1] || {
    ctl: latest.ctl,
    atl: latest.atl,
    tsb: latest.tsb,
    tss: 0,
    date: '',
    dayOffset: 7,
    isProjected: true as const,
  };
  const projectedTsbDelta = finalProjected.tsb - latest.tsb;
  const projectedFormState = getFormState(finalProjected.tsb);

  // Combined metrics list for plotting
  const combinedMetrics = useMemo(() => {
    if (!showProjection) return filteredMetrics;
    return [...filteredMetrics, ...projectedMetrics];
  }, [filteredMetrics, projectedMetrics, showProjection]);

  // Chart dimensions & scaling
  const chartWidth = 900;
  const chartHeight = 330;
  const padding = { top: 22, right: 42, bottom: 42, left: 50 };

  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  // Min / Max calculations
  const allTss = combinedMetrics.map((m) => m.tss);
  const allCtl = combinedMetrics.map((m) => m.ctl);
  const allAtl = combinedMetrics.map((m) => m.atl);
  const allTsb = combinedMetrics.map((m) => m.tsb);

  const maxTss = Math.max(250, ...allTss);
  const maxLoad = Math.max(120, ...allCtl, ...allAtl);
  const minTsb = Math.min(-45, ...allTsb);
  const maxTsb = Math.max(35, ...allTsb);

  // Scales
  const getX = (idx: number) => padding.left + (idx / Math.max(1, combinedMetrics.length - 1)) * usableWidth;
  const getYLoad = (val: number) => padding.top + usableHeight - (val / maxLoad) * usableHeight;
  const getYTsb = (val: number) => {
    const range = maxTsb - minTsb;
    return padding.top + usableHeight - ((val - minTsb) / range) * usableHeight;
  };
  const getYTssBarHeight = (tss: number) => (tss / maxTss) * (usableHeight * 0.7);

  // SVG Paths - Historical
  const historicalCtlPoints = filteredMetrics.map((m, i) => `${getX(i)},${getYLoad(m.ctl)}`).join(' ');
  const historicalAtlPoints = filteredMetrics.map((m, i) => `${getX(i)},${getYLoad(m.atl)}`).join(' ');
  const historicalTsbPoints = filteredMetrics.map((m, i) => `${getX(i)},${getYTsb(m.tsb)}`).join(' ');

  // SVG Paths - Projected (starting smoothly from the last historical point)
  const lastHistIndex = filteredMetrics.length - 1;
  const projectedCtlPoints = [
    `${getX(lastHistIndex)},${getYLoad(latest.ctl)}`,
    ...projectedMetrics.map((m, i) => `${getX(filteredMetrics.length + i)},${getYLoad(m.ctl)}`),
  ].join(' ');

  const projectedAtlPoints = [
    `${getX(lastHistIndex)},${getYLoad(latest.atl)}`,
    ...projectedMetrics.map((m, i) => `${getX(filteredMetrics.length + i)},${getYLoad(m.atl)}`),
  ].join(' ');

  const projectedTsbPoints = [
    `${getX(lastHistIndex)},${getYTsb(latest.tsb)}`,
    ...projectedMetrics.map((m, i) => `${getX(filteredMetrics.length + i)},${getYTsb(m.tsb)}`),
  ].join(' ');

  // Active Scrubber Selection
  const activeMetric = hoverIndex !== null && combinedMetrics[hoverIndex] ? combinedMetrics[hoverIndex] : latest;
  const isActiveProjected = hoverIndex !== null && hoverIndex >= filteredMetrics.length;

  const todayX = getX(lastHistIndex);

  return (
    <div id="pmc-container" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header & Meta */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-tight">Performance Management Chart (PMC)</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
              TrainingPeaks Model
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>7-Day Load Forecast Active</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            42-day Chronic Load (Fitness), 7-day Acute Load (Fatigue), and forward-projected Form (TSB) trajectory
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* 7-Day Forecast Toggle */}
          <button
            onClick={() => setShowProjection(!showProjection)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              showProjection
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
            title="Toggle 7-Day Projected Load & TSB line"
          >
            <span className={`w-2 h-2 rounded-full ${showProjection ? 'bg-amber-400 animate-pulse' : 'bg-neutral-600'}`} />
            <span>Projected Load Line</span>
          </button>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            {(['30', '45', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  timeRange === range
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {range === 'all' ? 'All (90d)' : `${range} Days`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Fitness (CTL) */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] uppercase font-semibold text-sky-400 tracking-wider flex items-center justify-between">
            <span>Fitness (CTL)</span>
            <span className="w-2 h-2 rounded-full bg-sky-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white mt-1.5">{latest.ctl}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">42-day rolling load</div>
        </div>

        {/* Fatigue (ATL) */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] uppercase font-semibold text-rose-400 tracking-wider flex items-center justify-between">
            <span>Fatigue (ATL)</span>
            <span className="w-2 h-2 rounded-full bg-rose-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white mt-1.5">{latest.atl}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">7-day acute stress</div>
        </div>

        {/* Form (TSB) */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] uppercase font-semibold text-amber-400 tracking-wider flex items-center justify-between">
            <span>Form (TSB)</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className={`text-3xl font-black font-mono mt-1.5 ${latest.tsb >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {latest.tsb > 0 ? `+${latest.tsb}` : latest.tsb}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">CTL − ATL balance</div>
        </div>

        {/* 7-Day Projected TSB Trend Card */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-amber-500/30 relative overflow-hidden">
          <div className="text-[11px] uppercase font-semibold text-amber-400 tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Projected TSB (+7d)</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              {projectedTsbDelta >= 0 ? `+${projectedTsbDelta}` : projectedTsbDelta} pts
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <div className={`text-3xl font-black font-mono ${finalProjected.tsb >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {finalProjected.tsb > 0 ? `+${finalProjected.tsb}` : finalProjected.tsb}
            </div>
            <div className="text-xs font-mono text-neutral-400">
              from {latest.tsb > 0 ? `+${latest.tsb}` : latest.tsb}
            </div>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            {projectedFormState.label}
          </div>
        </div>

        {/* Current State Indicator */}
        <div className={`col-span-2 lg:col-span-1 p-3.5 rounded-xl ${formState.bg} flex flex-col justify-between`}>
          <div className="text-[11px] uppercase font-bold tracking-wider text-neutral-300">Form Diagnosis</div>
          <div className={`text-base font-bold leading-snug mt-1 ${formState.color}`}>
            {formState.label}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1 leading-tight">{formState.desc}</div>
        </div>
      </div>

      {/* 7-Day Forecast Configuration & Baseline Insight Strip */}
      {showProjection && (
        <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Forecast Scenario:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
              {(
                [
                  { id: 'linear', label: 'Linear 4-Wk Trend' },
                  { id: 'average', label: 'Maintain 4-Wk Avg' },
                  { id: 'taper', label: 'Race Taper' },
                  { id: 'overload', label: 'Overload (+25%)' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setForecastScenario(s.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                    forecastScenario === s.id
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-neutral-400 font-mono text-[11px]">
            <div>
              4-Wk Avg: <strong className="text-neutral-200">{forecastStats.avgTss} TSS/day</strong>
            </div>
            <div className="hidden sm:block text-neutral-600">·</div>
            <div>
              4-Wk Slope:{' '}
              <strong className={forecastStats.slope >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {forecastStats.slope >= 0 ? `+${forecastStats.slope}` : forecastStats.slope} TSS/day
              </strong>
            </div>
            <div className="hidden sm:block text-neutral-600">·</div>
            <div>
              Proj 7d Load:{' '}
              <strong className="text-purple-400">
                {projectedMetrics.reduce((acc, p) => acc + p.tss, 0)} TSS
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Chart Container */}
      <div className="relative bg-neutral-950 rounded-xl p-3 border border-neutral-800 overflow-x-auto">
        {/* Legend & Active Scrubber */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono mb-2 px-2 text-neutral-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" />
              <span>Fitness (CTL)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-400 inline-block" />
              <span>Fatigue (ATL)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" />
              <span>Form (TSB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-purple-500/60 rounded-xs inline-block" />
              <span>Daily TSS</span>
            </div>

            {showProjection && (
              <>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-4 h-0 border-t-2 border-dashed border-amber-400 inline-block" />
                  <span>Projected TSB (7d)</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <span className="w-4 h-0 border-t-2 border-dashed border-sky-400/80 inline-block" />
                  <span>Projected Load</span>
                </div>
              </>
            )}
          </div>

          {/* Active Scrubber readout */}
          {hoverIndex !== null && (
            <div className="text-xs bg-neutral-900 px-3 py-1 rounded border border-neutral-700 text-white font-mono flex flex-wrap items-center gap-2 sm:gap-3">
              {isActiveProjected ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  FORECAST +{(activeMetric as ProjectedDailyMetric).dayOffset}D
                </span>
              ) : null}
              <span className="text-neutral-400">{activeMetric.date}</span>
              <span>
                {isActiveProjected ? 'Proj TSS:' : 'TSS:'}{' '}
                <strong className="text-purple-400">{activeMetric.tss}</strong>
              </span>
              <span>
                {isActiveProjected ? 'Proj CTL:' : 'CTL:'}{' '}
                <strong className="text-sky-400">{activeMetric.ctl}</strong>
              </span>
              <span>
                {isActiveProjected ? 'Proj ATL:' : 'ATL:'}{' '}
                <strong className="text-rose-400">{activeMetric.atl}</strong>
              </span>
              <span>
                {isActiveProjected ? 'Proj TSB:' : 'TSB:'}{' '}
                <strong className="text-amber-400">
                  {activeMetric.tsb > 0 ? `+${activeMetric.tsb}` : activeMetric.tsb}
                </strong>
              </span>
              {!isActiveProjected && (activeMetric as DailyTrainingMetric).workoutTitle && (
                <span className="text-neutral-300 max-w-[140px] truncate">
                  ({(activeMetric as DailyTrainingMetric).workoutTitle})
                </span>
              )}
            </div>
          )}
        </div>

        {/* SVG Visualization */}
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="tssBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
            </linearGradient>

            <linearGradient id="forecastZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Zero TSB reference line */}
          <line
            x1={padding.left}
            y1={getYTsb(0)}
            x2={chartWidth - padding.right}
            y2={getYTsb(0)}
            stroke="#525252"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={chartWidth - padding.right + 6}
            y={getYTsb(0) + 4}
            fill="#737373"
            fontSize="10"
            fontFamily="monospace"
          >
            TSB 0
          </text>

          {/* Forecasted Region Background Highlight */}
          {showProjection && (
            <g>
              <rect
                x={todayX}
                y={padding.top}
                width={chartWidth - padding.right - todayX}
                height={usableHeight}
                fill="url(#forecastZoneGrad)"
              />
              <line
                x1={todayX}
                y1={padding.top}
                x2={todayX}
                y2={padding.top + usableHeight}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {/* Forecast Header Label inside chart */}
              <text
                x={todayX + 6}
                y={padding.top + 13}
                fill="#f59e0b"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                TODAY
              </text>
              <text
                x={todayX + 44}
                y={padding.top + 13}
                fill="#a855f7"
                fontSize="9"
                fontFamily="monospace"
              >
                7-DAY FORECAST →
              </text>
            </g>
          )}

          {/* Grid lines */}
          {[20, 60, 100].map((val) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getYLoad(val)}
                x2={chartWidth - padding.right}
                y2={getYLoad(val)}
                stroke="#262626"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={getYLoad(val) + 3}
                fill="#525252"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Historical TSS Bars */}
          {filteredMetrics.map((m, i) => {
            const barHeight = getYTssBarHeight(m.tss);
            const x = getX(i) - 4;
            const y = padding.top + usableHeight - barHeight;
            return (
              <rect
                key={`hist-tss-${m.date}`}
                x={x}
                y={y}
                width={8}
                height={barHeight}
                fill="url(#tssBarGrad)"
                rx={1.5}
                className="opacity-75 hover:opacity-100 transition"
              />
            );
          })}

          {/* Projected Future TSS Bars */}
          {showProjection &&
            projectedMetrics.map((m, i) => {
              const barHeight = getYTssBarHeight(m.tss);
              const x = getX(filteredMetrics.length + i) - 4;
              const y = padding.top + usableHeight - barHeight;
              return (
                <rect
                  key={`proj-tss-${m.date}`}
                  x={x}
                  y={y}
                  width={8}
                  height={barHeight}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  rx={1.5}
                  className="opacity-70 hover:opacity-100 transition"
                />
              );
            })}

          {/* Historical Curves */}
          <polyline
            points={historicalCtlPoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={historicalAtlPoints}
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={historicalTsbPoints}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Projected Curves (connecting smoothly from today) */}
          {showProjection && (
            <g>
              {/* Projected CTL */}
              <polyline
                points={projectedCtlPoints}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
              {/* Projected ATL */}
              <polyline
                points={projectedAtlPoints}
                fill="none"
                stroke="#fb7185"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
              {/* Projected TSB Line - Enhanced */}
              <polyline
                points={projectedTsbPoints}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.6"
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Projected TSB Day Nodes */}
              {projectedMetrics.map((m, i) => {
                const cx = getX(filteredMetrics.length + i);
                const cy = getYTsb(m.tsb);
                return (
                  <g key={`proj-node-${m.date}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3.5"
                      fill="#f59e0b"
                      stroke="#0a0a0a"
                      strokeWidth="1.5"
                    />
                    {i === projectedMetrics.length - 1 && (
                      <text
                        x={cx}
                        y={cy - 8}
                        fill="#f59e0b"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {m.tsb > 0 ? `+${m.tsb}` : m.tsb}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Date labels on X axis */}
          {combinedMetrics.map((m, i) => {
            const step = Math.ceil(combinedMetrics.length / 8);
            const isLast = i === combinedMetrics.length - 1;
            const isToday = i === lastHistIndex;
            if (i % step === 0 || isLast || isToday) {
              const label = m.date.slice(5); // MM-DD
              return (
                <text
                  key={`label-${m.date}`}
                  x={getX(i)}
                  y={chartHeight - 12}
                  fill={isToday ? '#f59e0b' : i >= filteredMetrics.length ? '#a855f7' : '#737373'}
                  fontSize={isToday ? '10' : '9'}
                  fontWeight={isToday ? 'bold' : 'normal'}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {isToday ? 'TODAY' : label}
                </text>
              );
            }
            return null;
          })}

          {/* Interactive Scrub Hover Columns across all combined metrics */}
          {combinedMetrics.map((m, i) => {
            const x = getX(i);
            const colWidth = usableWidth / Math.max(1, combinedMetrics.length);
            return (
              <rect
                key={`hitbox-${m.date}`}
                x={x - colWidth / 2}
                y={padding.top}
                width={colWidth}
                height={usableHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                className="cursor-crosshair"
              />
            );
          })}

          {/* Hover Crosshair line */}
          {hoverIndex !== null && combinedMetrics[hoverIndex] && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + usableHeight}
                stroke={isActiveProjected ? '#f59e0b' : '#38bdf8'}
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYLoad(combinedMetrics[hoverIndex].ctl)}
                r="4"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYLoad(combinedMetrics[hoverIndex].atl)}
                r="4"
                fill="#fb7185"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYTsb(combinedMetrics[hoverIndex].tsb)}
                r="4.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

