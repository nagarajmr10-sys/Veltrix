import React, { useState } from 'react';
import { DailyTrainingMetric } from '../../types';
import { TrendingUp, ShieldAlert, Sparkles, Activity, Info } from 'lucide-react';

interface PMCProps {
  metrics: DailyTrainingMetric[];
}

export const PerformanceManagementChart: React.FC<PMCProps> = ({ metrics }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'30' | '45' | 'all'>('45');

  // Filter metrics based on range
  const filteredMetrics = React.useMemo(() => {
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

  // Chart dimensions & scaling
  const chartWidth = 900;
  const chartHeight = 320;
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };

  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  // Min / Max calculations
  const allTss = filteredMetrics.map((m) => m.tss);
  const allCtl = filteredMetrics.map((m) => m.ctl);
  const allAtl = filteredMetrics.map((m) => m.atl);
  const allTsb = filteredMetrics.map((m) => m.tsb);

  const maxTss = Math.max(250, ...allTss);
  const maxLoad = Math.max(120, ...allCtl, ...allAtl);
  const minTsb = Math.min(-45, ...allTsb);
  const maxTsb = Math.max(35, ...allTsb);

  // Scales
  const getX = (idx: number) => padding.left + (idx / (filteredMetrics.length - 1)) * usableWidth;
  const getYLoad = (val: number) => padding.top + usableHeight - (val / maxLoad) * usableHeight;
  const getYTsb = (val: number) => {
    const range = maxTsb - minTsb;
    return padding.top + usableHeight - ((val - minTsb) / range) * usableHeight;
  };
  const getYTssBarHeight = (tss: number) => (tss / maxTss) * (usableHeight * 0.7);

  // SVG Paths
  const ctlPoints = filteredMetrics.map((m, i) => `${getX(i)},${getYLoad(m.ctl)}`).join(' ');
  const atlPoints = filteredMetrics.map((m, i) => `${getX(i)},${getYLoad(m.atl)}`).join(' ');
  const tsbPoints = filteredMetrics.map((m, i) => `${getX(i)},${getYTsb(m.tsb)}`).join(' ');

  const activeMetric = hoverIndex !== null && filteredMetrics[hoverIndex] ? filteredMetrics[hoverIndex] : latest;

  return (
    <div id="pmc-container" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header & Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-tight">Performance Management Chart (PMC)</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
              TrainingPeaks Model
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            42-day Chronic Training Load (Fitness), 7-day Acute Load (Fatigue), and Training Stress Balance (Form)
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start md:self-auto">
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

        {/* Ramp Rate */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider flex items-center justify-between">
            <span>7-Day Ramp Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white mt-1.5">
            {rampRate >= 0 ? `+${rampRate}` : rampRate}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Optimal: +3 to +8 /wk</div>
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

      {/* Interactive Chart Container */}
      <div className="relative bg-neutral-950 rounded-xl p-3 border border-neutral-800 overflow-x-auto">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono mb-2 px-2 text-neutral-400">
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

          {/* Active Scrubber readout */}
          {hoverIndex !== null && (
            <div className="ml-auto text-xs bg-neutral-900 px-3 py-1 rounded border border-neutral-700 text-white font-mono flex items-center gap-3">
              <span className="text-neutral-400">{activeMetric.date}</span>
              <span>TSS: <strong className="text-purple-400">{activeMetric.tss}</strong></span>
              <span>CTL: <strong className="text-sky-400">{activeMetric.ctl}</strong></span>
              <span>ATL: <strong className="text-rose-400">{activeMetric.atl}</strong></span>
              <span>TSB: <strong className="text-amber-400">{activeMetric.tsb}</strong></span>
              {activeMetric.workoutTitle && (
                <span className="text-neutral-300 max-w-[160px] truncate">({activeMetric.workoutTitle})</span>
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

          {/* TSS Bars */}
          {filteredMetrics.map((m, i) => {
            const barHeight = getYTssBarHeight(m.tss);
            const x = getX(i) - 4;
            const y = padding.top + usableHeight - barHeight;
            return (
              <rect
                key={m.date}
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

          {/* Curves */}
          <polyline
            points={ctlPoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={atlPoints}
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={tsbPoints}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Date labels on X axis */}
          {filteredMetrics.map((m, i) => {
            if (i % Math.ceil(filteredMetrics.length / 6) === 0 || i === filteredMetrics.length - 1) {
              const label = m.date.slice(5); // MM-DD
              return (
                <text
                  key={m.date}
                  x={getX(i)}
                  y={chartHeight - 12}
                  fill="#737373"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {label}
                </text>
              );
            }
            return null;
          })}

          {/* Interactive Scrub Hover Columns */}
          {filteredMetrics.map((m, i) => {
            const x = getX(i);
            return (
              <rect
                key={`hitbox-${m.date}`}
                x={x - usableWidth / (filteredMetrics.length * 2)}
                y={padding.top}
                width={usableWidth / filteredMetrics.length}
                height={usableHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                className="cursor-crosshair"
              />
            );
          })}

          {/* Hover Crosshair line */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + usableHeight}
                stroke="#f97316"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYLoad(filteredMetrics[hoverIndex].ctl)}
                r="4"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYLoad(filteredMetrics[hoverIndex].atl)}
                r="4"
                fill="#fb7185"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYTsb(filteredMetrics[hoverIndex].tsb)}
                r="4"
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
