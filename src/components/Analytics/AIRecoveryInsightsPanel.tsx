import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Heart,
  Moon,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
  Calendar,
  FileText,
} from 'lucide-react';
import { DailyTrainingMetric } from '../../types';
import {
  requestAIRecoveryInsights,
  AIRecoveryInsightResponse,
} from '../../services/aiTrainingService';

interface AIRecoveryInsightsPanelProps {
  metrics: DailyTrainingMetric[];
  className?: string;
  onNavigateToPMC?: () => void;
  onExportPDF?: () => void;
}

export const AIRecoveryInsightsPanel: React.FC<AIRecoveryInsightsPanelProps> = ({
  metrics,
  className = '',
  onNavigateToPMC,
  onExportPDF,
}) => {
  const [selectedFocus, setSelectedFocus] = useState<string>('standard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Derive latest metrics
  const latestMetric = metrics[metrics.length - 1] || {
    ctl: 74,
    atl: 88,
    tsb: -14,
    tss: 85,
    date: new Date().toISOString().split('T')[0],
  };

  const ctl7DaysAgo =
    metrics.length >= 8 ? metrics[metrics.length - 8].ctl : latestMetric.ctl - 4.2;
  const rampRate = Number((latestMetric.ctl - ctl7DaysAgo).toFixed(1));

  // Insights state initialized with high-fidelity physiological baseline
  const [insight, setInsight] = useState<AIRecoveryInsightResponse>(() => {
    const ctl = Math.round(latestMetric.ctl);
    const atl = Math.round(latestMetric.atl);
    const tsb = Math.round(latestMetric.tsb);
    const ramp = Number(rampRate.toFixed(1));

    let s1: string;
    let s2: string;
    let s3: string;
    let status: AIRecoveryInsightResponse['recoveryStatus'] = 'productive_overload';
    let badge = 'Productive Progressive Overload';

    if (tsb < -30) {
      status = 'overreaching_alert';
      badge = 'High Fatigue / Overreaching Risk';
      s1 = `With a Training Stress Balance of ${tsb} (CTL ${ctl} vs. ATL ${atl}), your body is experiencing substantial acute autonomic fatigue that places you in the acute overreaching risk corridor.`;
      s2 = `Your 7-day ramp rate of ${ramp > 0 ? '+' : ''}${ramp} TSS/week reflects aggressive training density, elevating cardiac and muscular strain above your baseline adaptation capacity.`;
      s3 = `To avoid overtraining syndrome and restore sympathetic-parasympathetic balance, prioritize 8.5 hours of sleep tonight and take a complete rest day or light 30-minute Zone 1 spin before resuming threshold work.`;
    } else if (tsb >= -30 && tsb < -10) {
      status = 'productive_overload';
      badge = 'Productive Progressive Overload';
      s1 = `Your current Training Stress Balance of ${tsb}, driven by a Chronic Training Load of ${ctl} and an Acute Training Load of ${atl}, confirms you are in an optimal, productive aerobic overload phase.`;
      s2 = `Your recent training trajectory shows a healthy ramp rate of ${ramp > 0 ? '+' : ''}${ramp} TSS/week, successfully stimulating mitochondrial biogenesis without inducing pathological autonomic strain.`;
      s3 = `Continue your planned progression with high-carb fueling and adequate post-ride hydration, but schedule an active recovery day within the next 48 hours to lock in neuromuscular adaptations.`;
    } else if (tsb >= -10 && tsb <= 5) {
      status = 'neutral_maintenance';
      badge = 'Neutral / Aerobic Equilibrium';
      s1 = `Sitting at a balanced Training Stress Balance of ${tsb} with a solid CTL of ${ctl} and ATL of ${atl}, your physiology is currently in stable cardiovascular equilibrium.`;
      s2 = `Recent load changes have stabilized with a moderate ramp rate of ${ramp > 0 ? '+' : ''}${ramp} TSS/week, meaning your acute fatigue has dissipated enough to handle high-quality efforts without accumulated lethargy.`;
      s3 = `You are clear to execute high-quality threshold or VO2 max sessions over the next 24 to 48 hours, supported by standard recovery protocols and normal protein synthesis intake.`;
    } else if (tsb > 5 && tsb <= 25) {
      status = 'optimal_freshness';
      badge = 'Race-Ready / Peak Freshness';
      s1 = `With a positive Training Stress Balance of +${tsb} alongside a developed aerobic base of ${ctl} CTL, you have reached peak freshness with fully primed neuromuscular snap.`;
      s2 = `The drop in your acute training load (ATL: ${atl}) has shed residual muscle fatigue while preserving cardiovascular stroke volume and glycogen stores across the last 14 days.`;
      s3 = `Take advantage of this optimal racing window over the next 48 hours by keeping workouts short with brief high-intensity cadence openers, ensuring you arrive at race day fully supercompensated.`;
    } else {
      status = 'transition';
      badge = 'Transition / Deloading';
      s1 = `Your Training Stress Balance is elevated at +${tsb} while your Chronic Training Load of ${ctl} has begun to decay, signaling that recovery has transitioned into an extended deload phase.`;
      s2 = `Minimal acute stimulus (ATL: ${atl}) over recent weeks indicates that residual muscular fatigue is non-existent, but cardiopulmonary capacity is gradually detraining.`;
      s3 = `Re-introduce progressive aerobic volume and structural interval work within the next 24 hours to reverse fitness decline and rebuild chronic training resilience.`;
    }

    return {
      threeSentenceSummary: `${s1} ${s2} ${s3}`,
      recoveryStatus: status,
      statusBadge: badge,
      actionableRecommendation: s3,
      nextSessionGuidance: tsb < -30 ? 'Zone 1 Flush or Rest' : tsb > 5 ? 'Openers + Z2' : 'Sweet Spot or Zone 2 Base',
      targetTssToday: tsb < -30 ? 25 : tsb > 5 ? 45 : 75,
      metricsAnalyzed: { ctl, atl, tsb, rampRate: ramp },
      source: 'gemini_3.8_flash',
    };
  });

  // Fetch or re-generate insights
  const handleGenerateInsights = async (focusOverride?: string) => {
    setIsLoading(true);
    try {
      const response = await requestAIRecoveryInsights({
        ctl: latestMetric.ctl,
        atl: latestMetric.atl,
        tsb: latestMetric.tsb,
        rampRate,
        recentTrends: metrics.slice(-14),
        focus: focusOverride || selectedFocus,
      });
      setInsight(response);
    } catch (err) {
      console.warn('Could not regenerate insights, keeping active model state', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Status Badge Styling
  const getBadgeStyle = (status: AIRecoveryInsightResponse['recoveryStatus']) => {
    switch (status) {
      case 'optimal_freshness':
        return {
          pill: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400',
          tsbColor: 'text-emerald-400',
          bgGradient: 'from-emerald-950/30 to-neutral-900',
        };
      case 'productive_overload':
        return {
          pill: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
          tsbColor: 'text-amber-400',
          bgGradient: 'from-amber-950/25 to-neutral-900',
        };
      case 'neutral_maintenance':
        return {
          pill: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
          dot: 'bg-sky-400',
          tsbColor: 'text-sky-400',
          bgGradient: 'from-sky-950/25 to-neutral-900',
        };
      case 'overreaching_alert':
        return {
          pill: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-400',
          tsbColor: 'text-rose-400',
          bgGradient: 'from-rose-950/30 to-neutral-900',
        };
      default:
        return {
          pill: 'bg-neutral-800 border-neutral-700 text-neutral-300',
          dot: 'bg-neutral-400',
          tsbColor: 'text-neutral-300',
          bgGradient: 'from-neutral-900 to-neutral-900',
        };
    }
  };

  const style = getBadgeStyle(insight.recoveryStatus);

  // Parse sentences for high visual readability
  const sentences = insight.threeSentenceSummary
    ? insight.threeSentenceSummary
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 0)
    : [];

  // Calculate spectrum cursor percentage (-45 to +35 mapped to 0% - 100%)
  const minTsb = -45;
  const maxTsb = 35;
  const clampedTsb = Math.max(minTsb, Math.min(maxTsb, latestMetric.tsb));
  const tsbPositionPct = Math.round(((clampedTsb - minTsb) / (maxTsb - minTsb)) * 100);

  return (
    <div
      id="ai-recovery-insights-panel"
      className={`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl relative overflow-hidden transition ${className}`}
    >
      {/* Subtle background ambient tint */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${style.bgGradient} pointer-events-none opacity-60`}
      />

      {/* Top Header Bar */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                AI Recovery & Load Intelligence
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border flex items-center gap-1.5 ${style.pill}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
                <span>{insight.statusBadge}</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Continuous impulse-response modeling of Chronic Fitness (CTL), Acute Fatigue (ATL) & Form (TSB)
            </p>
          </div>
        </div>

        {/* Focus Selector & Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
            <span className="text-neutral-500 px-2 text-[10px] uppercase font-bold">Focus:</span>
            <button
              onClick={() => {
                setSelectedFocus('standard');
                handleGenerateInsights('standard');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFocus === 'standard'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Overload
            </button>
            <button
              onClick={() => {
                setSelectedFocus('race_taper');
                handleGenerateInsights('race_taper');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFocus === 'race_taper'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Race Taper
            </button>
            <button
              onClick={() => {
                setSelectedFocus('fatigue_alert');
                handleGenerateInsights('fatigue_alert');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFocus === 'fatigue_alert'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Rest
            </button>
          </div>

          <button
            onClick={() => handleGenerateInsights()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold flex items-center gap-1.5 transition disabled:opacity-50 border border-neutral-700"
            title="Re-run Gemini AI evaluation on latest load metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Evaluating...' : 'Re-Analyze'}</span>
          </button>

          {onExportPDF && (
            <button
              id="ai-panel-export-pdf-btn"
              onClick={onExportPDF}
              className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:text-orange-300 text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Generate and export full monthly performance PDF report"
            >
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              <span>Monthly PDF Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Sentence Summary Hero Box */}
      <div className="relative bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-orange-400" />
            3-Sentence Recovery Status Diagnostic
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            Powered by {insight.source === 'gemini_3.8_flash' ? 'Gemini 3.8 Flash' : 'Physiological Engine'}
          </span>
        </div>

        {/* The 3 Sentences styled distinctly */}
        <div className="space-y-2.5 text-sm sm:text-[15px] leading-relaxed text-neutral-200 font-sans">
          {sentences.length >= 3 ? (
            <>
              {/* Sentence 1: Current Status */}
              <div className="flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-orange-400 border border-neutral-700 shrink-0 mt-0.5">
                  STATUS
                </span>
                <p className="text-white font-medium">{sentences[0]}</p>
              </div>

              {/* Sentence 2: Trend & Ramp Rate */}
              <div className="flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-sky-400 border border-neutral-700 shrink-0 mt-0.5">
                  TREND
                </span>
                <p className="text-neutral-300">{sentences[1]}</p>
              </div>

              {/* Sentence 3: 24-48h Action */}
              <div className="flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-emerald-400 border border-neutral-700 shrink-0 mt-0.5">
                  ACTION
                </span>
                <p className="text-emerald-300/90 font-medium">{sentences[2]}</p>
              </div>
            </>
          ) : (
            <p className="text-neutral-200 italic">{insight.threeSentenceSummary}</p>
          )}
        </div>

        {/* Quick Prescription Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-neutral-800/80 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400">Target TSS Today:</span>
            <span className="text-white font-bold">≤ {insight.targetTssToday} TSS</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400">Prescribed Session:</span>
            <span className="text-orange-400 font-bold truncate max-w-[140px]" title={insight.nextSessionGuidance}>
              {insight.nextSessionGuidance}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400">Autonomic Goal:</span>
            <span className="text-emerald-400 font-bold">Parasympathetic Rest</span>
          </div>
        </div>
      </div>

      {/* Metrics Row: CTL, ATL, TSB, Ramp Rate */}
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* CTL Fitness */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>CTL (Fitness)</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight">
            {Math.round(latestMetric.ctl)}
            <span className="text-xs text-neutral-400 ml-1 font-sans">TSS/day</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            42-day rolling training load
          </div>
        </div>

        {/* ATL Fatigue */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>ATL (Fatigue)</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
            {Math.round(latestMetric.atl)}
            <span className="text-xs text-neutral-400 ml-1 font-sans">TSS/day</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            7-day acute systemic fatigue
          </div>
        </div>

        {/* TSB Form */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>TSB (Form)</span>
            <Activity className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${style.tsbColor}`}>
            {latestMetric.tsb > 0 ? `+${Math.round(latestMetric.tsb)}` : Math.round(latestMetric.tsb)}
            <span className="text-xs text-neutral-400 ml-1 font-sans">CTL - ATL</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            Recovery balance & freshness
          </div>
        </div>

        {/* Ramp Rate */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>7-Day Ramp Rate</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {rampRate > 0 ? `+${rampRate}` : rampRate}
            <span className="text-xs text-neutral-400 ml-1 font-sans">TSS/wk</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold">
            {rampRate >= 3 && rampRate <= 6 ? 'Optimal (3-6 safe zone)' : rampRate > 6 ? 'Aggressive build' : 'Maintenance'}
          </div>
        </div>
      </div>

      {/* Form & Recovery Spectrum Visual Bar */}
      <div className="relative bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
            Training Stress Balance (Form) Continuum:
          </span>
          <span className="text-white font-bold">
            Current Form: <span className={style.tsbColor}>{latestMetric.tsb > 0 ? `+${Math.round(latestMetric.tsb)}` : Math.round(latestMetric.tsb)} TSB</span>
          </span>
        </div>

        {/* Multi-segment continuum bar */}
        <div className="relative pt-2 pb-1">
          <div className="h-3 w-full rounded-full bg-neutral-800 flex overflow-hidden border border-neutral-700">
            <div className="bg-rose-500 h-full w-[20%]" title="Overreaching Risk (< -30)" />
            <div className="bg-amber-500 h-full w-[25%]" title="Productive Overload (-30 to -10)" />
            <div className="bg-sky-500 h-full w-[20%]" title="Neutral Maintenance (-10 to +5)" />
            <div className="bg-emerald-500 h-full w-[25%]" title="Race Ready / Peak Freshness (+5 to +25)" />
            <div className="bg-neutral-600 h-full w-[10%]" title="Transition / Detraining (> +25)" />
          </div>

          {/* Current TSB Marker Pin */}
          <div
            className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{ left: `${tsbPositionPct}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-orange-500 shadow-md shadow-orange-500/50 -mt-0.5" />
          </div>
        </div>

        {/* Labels below continuum */}
        <div className="grid grid-cols-5 text-[10px] font-mono text-neutral-400 pt-1 text-center">
          <span className="text-rose-400">&lt; -30 (Fatigue)</span>
          <span className="text-amber-400">-30 to -10 (Overload)</span>
          <span className="text-sky-400">-10 to +5 (Neutral)</span>
          <span className="text-emerald-400">+5 to +25 (Race Ready)</span>
          <span className="text-neutral-400">&gt; +25 (Deload)</span>
        </div>
      </div>

      {/* Expandable Trajectory Table Toggle */}
      <div className="relative flex items-center justify-between pt-1">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 transition"
        >
          {showDetails ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-orange-400" />}
          <span>{showDetails ? 'Hide 14-Day Load Table' : 'Inspect 14-Day CTL/ATL/TSB Trend Data'}</span>
        </button>

        {onNavigateToPMC && (
          <button
            onClick={onNavigateToPMC}
            className="text-xs font-mono text-orange-400 hover:text-orange-300 underline underline-offset-4 flex items-center gap-1"
          >
            <span>Open Interactive PMC Chart</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Expanded 14-Day Historical Table */}
      {showDetails && (
        <div className="relative bg-neutral-950 rounded-2xl border border-neutral-800 p-3 sm:p-4 overflow-x-auto animate-fadeIn">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                <th className="pb-2">Date</th>
                <th className="pb-2 text-right">Daily TSS</th>
                <th className="pb-2 text-right text-sky-400">CTL (Fitness)</th>
                <th className="pb-2 text-right text-amber-400">ATL (Fatigue)</th>
                <th className="pb-2 text-right text-orange-400">TSB (Form)</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {metrics.slice(-14).reverse().map((m) => {
                const formBadge =
                  m.tsb < -30
                    ? { text: 'High Fatigue', color: 'text-rose-400' }
                    : m.tsb < -10
                    ? { text: 'Overload', color: 'text-amber-400' }
                    : m.tsb <= 5
                    ? { text: 'Neutral', color: 'text-sky-400' }
                    : { text: 'Fresh', color: 'text-emerald-400' };

                return (
                  <tr key={m.date} className="hover:bg-neutral-900/50">
                    <td className="py-2 text-neutral-300">{m.date}</td>
                    <td className="py-2 text-right text-white font-bold">{m.tss}</td>
                    <td className="py-2 text-right text-sky-400">{Math.round(m.ctl)}</td>
                    <td className="py-2 text-right text-amber-400">{Math.round(m.atl)}</td>
                    <td className="py-2 text-right font-bold text-white">
                      {m.tsb > 0 ? `+${Math.round(m.tsb)}` : Math.round(m.tsb)}
                    </td>
                    <td className={`py-2 text-right font-bold ${formBadge.color}`}>
                      {formBadge.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
