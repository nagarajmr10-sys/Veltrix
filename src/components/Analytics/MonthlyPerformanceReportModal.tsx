import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Sparkles,
  Award,
  TrendingUp,
  Zap,
  Activity as ActivityIcon,
  Calendar,
  CheckCircle2,
  Share2,
  Clock,
  Compass,
  ArrowUpRight,
} from 'lucide-react';
import { AthleteProfile, Activity, DailyTrainingMetric } from '../../types';
import { INITIAL_PERFORMANCE_STATS } from '../../data/healthAndPerformanceData';
import { generatePerformancePDF, MonthlyReportData } from '../../utils/exportPerformancePDF';

interface MonthlyPerformanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: AthleteProfile;
  activities: Activity[];
  pmcMetrics?: DailyTrainingMetric[];
}

export const MonthlyPerformanceReportModal: React.FC<MonthlyPerformanceReportModalProps> = ({
  isOpen,
  onClose,
  athlete,
  activities,
  pmcMetrics = [],
}) => {
  const [selectedMonth, setSelectedMonth] = useState<'september_2026' | 'august_2026' | 'last_30_days'>('september_2026');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Derive latest PMC values
  const latestPMC = useMemo(() => {
    if (pmcMetrics.length > 0) {
      const last = pmcMetrics[pmcMetrics.length - 1];
      const prevWeek = pmcMetrics.length >= 8 ? pmcMetrics[pmcMetrics.length - 8] : null;
      const ramp = prevWeek ? Number((last.ctl - prevWeek.ctl).toFixed(1)) : 4.2;
      return {
        ctl: last.ctl,
        atl: last.atl,
        tsb: last.tsb,
        rampRate: ramp,
      };
    }
    return {
      ctl: 74,
      atl: 88,
      tsb: -14,
      rampRate: 4.2,
    };
  }, [pmcMetrics]);

  // Derive recovery status string
  const recoveryStatusString = useMemo(() => {
    if (latestPMC.tsb < -30) return 'High Fatigue / Overreaching Alert';
    if (latestPMC.tsb < -10) return 'Productive Progressive Overload';
    if (latestPMC.tsb <= 5) return 'Neutral Aerobic Maintenance';
    if (latestPMC.tsb <= 25) return 'Race-Ready Peak Freshness';
    return 'Deload / Transition';
  }, [latestPMC.tsb]);

  // Compute monthly totals based on selected range
  const monthlyStats = useMemo(() => {
    const base = INITIAL_PERFORMANCE_STATS.last30Days;
    if (selectedMonth === 'august_2026') {
      return {
        totalDistanceKm: 1390,
        totalElevationMeters: 16400,
        totalActiveHours: 52.4,
        totalTSS: 2680,
        totalKilojoules: 38100,
        activitiesCount: 26,
        cyclingKm: 1120,
        runningKm: 210,
        gravelKm: 60,
      };
    } else if (selectedMonth === 'september_2026') {
      return {
        totalDistanceKm: 1240,
        totalElevationMeters: 14850,
        totalActiveHours: 48.5,
        totalTSS: 2450,
        totalKilojoules: 34200,
        activitiesCount: 23,
        cyclingKm: 980,
        runningKm: 195,
        gravelKm: 65,
      };
    }
    return {
      totalDistanceKm: base.totalDistanceKm,
      totalElevationMeters: base.totalElevationMeters,
      totalActiveHours: base.totalActiveHours,
      totalTSS: base.totalTSS,
      totalKilojoules: base.totalKilojoules,
      activitiesCount: 22,
      cyclingKm: base.cyclingKm,
      runningKm: base.runningKm,
      gravelKm: base.gravelKm,
    };
  }, [selectedMonth]);

  const monthLabel = useMemo(() => {
    if (selectedMonth === 'september_2026') return 'September 2026';
    if (selectedMonth === 'august_2026') return 'August 2026';
    return 'Trailing 30-Day Cycle';
  }, [selectedMonth]);

  // Prepare top breakthrough activities
  const topActivities = useMemo(() => {
    const sorted = [...activities].sort((a, b) => (b.tss || 0) - (a.tss || 0));
    return sorted.slice(0, 4);
  }, [activities]);

  // Power & Pace PR achievements
  const powerPRs = INITIAL_PERFORMANCE_STATS.powerPRs;
  const pacePRs = INITIAL_PERFORMANCE_STATS.pacePRs;

  const reportData: MonthlyReportData = useMemo(() => ({
    monthLabel,
    athlete,
    metrics: {
      ctl: latestPMC.ctl,
      atl: latestPMC.atl,
      tsb: latestPMC.tsb,
      rampRate: latestPMC.rampRate,
      recoveryStatus: recoveryStatusString,
    },
    monthlyStats,
    achievements: {
      powerPRs,
      pacePRs,
    },
    topActivities,
    coachNotes: `Athletic adaptation across ${monthLabel} was exemplary with ${monthlyStats.totalTSS} total TSS and steady aerobic base consolidation. Chronic Training Load sits at ${Math.round(latestPMC.ctl)} with a sustainable ramp rate of ${latestPMC.rampRate > 0 ? '+' : ''}${latestPMC.rampRate} TSS/wk. For the upcoming cycle, emphasize lactate threshold repeatability and targeted Sweet Spot work, scheduling an active recovery micro-cycle whenever TSB dips below -25 to sustain supercompensation.`,
  }), [monthLabel, athlete, latestPMC, recoveryStatusString, monthlyStats, powerPRs, pacePRs, topActivities]);

  // Handle PDF Download
  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      const doc = generatePerformancePDF(reportData);
      const safeMonth = monthLabel.replace(/\s+/g, '_');
      const safeAthlete = athlete.name.replace(/\s+/g, '_');
      doc.save(`Veltrix_Performance_Report_${safeAthlete}_${safeMonth}.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Print
  const handlePrint = () => {
    try {
      const doc = generatePerformancePDF(reportData);
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      console.error('Failed to trigger print:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="monthly-performance-report-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/10">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Monthly Performance & Physiological Dossier
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  PDF EXPORT
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Executive summary of training load (CTL/ATL/TSB), monthly mileage, and career achievements
              </p>
            </div>
          </div>

          <button
            id="close-performance-report-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="px-6 py-3.5 bg-neutral-900/90 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400 font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              Report Period:
            </span>
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
              <button
                onClick={() => setSelectedMonth('september_2026')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedMonth === 'september_2026'
                    ? 'bg-neutral-800 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                September 2026 (Current)
              </button>
              <button
                onClick={() => setSelectedMonth('august_2026')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedMonth === 'august_2026'
                    ? 'bg-neutral-800 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                August 2026
              </button>
              <button
                onClick={() => setSelectedMonth('last_30_days')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedMonth === 'last_30_days'
                    ? 'bg-neutral-800 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition border border-neutral-700"
              title="Print directly or save via browser PDF driver"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-400" />
              <span>Print</span>
            </button>

            <button
              id="download-performance-pdf-btn"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>PDF Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                  <span>{isExporting ? 'Generating PDF...' : 'Download PDF Report'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Document Preview Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-950">
          {/* Document Sheet Simulation */}
          <div className="bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* PDF Document Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <div className="h-1 bg-orange-500 absolute top-0 left-0 right-0" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono tracking-widest text-orange-400 uppercase font-bold">
                    Veltrix Endurance Analytics
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
                    Monthly Physiological & Performance Dossier
                  </h1>
                  <p className="text-xs text-slate-300 mt-1">
                    Certified athletic telemetry, impulse-response training load, and personal best records
                  </p>
                </div>

                <div className="sm:text-right font-mono text-xs">
                  <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg inline-block font-bold mb-1.5">
                    {monthLabel.toUpperCase()}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Athlete ID: <span className="text-white font-bold">VLTX-{athlete.handle.toUpperCase()}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Issued: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Athlete Bio & Benchmarks Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-900 text-sm">{athlete.name}</span>
                <span className="text-slate-500 ml-2 font-mono">
                  {athlete.location || 'Boulder, CO'} · {athlete.weightKg} kg · {athlete.heightCm} cm
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono text-slate-700">
                <div>
                  FTP: <span className="font-bold text-slate-900">{athlete.ftpWatts}W</span> (
                  {(athlete.ftpWatts / athlete.weightKg).toFixed(2)} W/kg)
                </div>
                <div>
                  VO2 Max: <span className="font-bold text-slate-900">{athlete.vo2Max}</span> ml/kg/min
                </div>
                <div>
                  LTHR: <span className="font-bold text-slate-900">{athlete.lthr}</span> bpm
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              {/* SECTION 1: Current Training Load & Autonomic Recovery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-orange-500" />
                    1. Physiological Training Load & Form Status (PMC Metrics)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">Impulse-Response Model</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                  {/* CTL */}
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-sky-800">CTL (Fitness)</span>
                    <div className="text-2xl font-black text-sky-950 mt-1">
                      {Math.round(latestPMC.ctl)}
                      <span className="text-xs text-sky-700 font-normal ml-1">TSS/d</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">42-day rolling fitness</span>
                  </div>

                  {/* ATL */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-amber-800">ATL (Fatigue)</span>
                    <div className="text-2xl font-black text-amber-950 mt-1">
                      {Math.round(latestPMC.atl)}
                      <span className="text-xs text-amber-700 font-normal ml-1">TSS/d</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">7-day acute systemic load</span>
                  </div>

                  {/* TSB */}
                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    latestPMC.tsb >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'
                  }`}>
                    <span className={`text-[11px] font-bold ${latestPMC.tsb >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}>
                      TSB (Form / Freshness)
                    </span>
                    <div className={`text-2xl font-black mt-1 ${latestPMC.tsb >= 0 ? 'text-emerald-950' : 'text-orange-950'}`}>
                      {latestPMC.tsb > 0 ? `+${Math.round(latestPMC.tsb)}` : Math.round(latestPMC.tsb)}
                      <span className="text-xs font-normal ml-1 text-slate-600">CTL - ATL</span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium mt-1 truncate">
                      {recoveryStatusString}
                    </span>
                  </div>

                  {/* Ramp Rate */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-800">7-Day Ramp Rate</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {latestPMC.rampRate > 0 ? `+${latestPMC.rampRate}` : latestPMC.rampRate}
                      <span className="text-xs text-slate-500 font-normal ml-1">TSS/wk</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium mt-1">
                      Sustainable Adaptation
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Monthly Training Volume & Cumulative Work */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    2. Monthly Training Volume & Energy Output
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">{monthlyStats.activitiesCount} Recorded Workouts</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Distance</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{monthlyStats.totalDistanceKm.toLocaleString()} km</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{monthlyStats.cyclingKm}k bike / {monthlyStats.runningKm}k run</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Elevation Gain</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">+{monthlyStats.totalElevationMeters.toLocaleString()} m</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Total Climbing</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Time in Motion</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{monthlyStats.totalActiveHours} hrs</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Aerobic Duration</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Training Stress</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{monthlyStats.totalTSS.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Total TSS</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Mechanical Work</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{monthlyStats.totalKilojoules.toLocaleString()} kJ</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Metabolic Exp.</div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Top Achievements & Personal Records */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase flex items-center gap-2">
                    <Award className="w-4 h-4 text-orange-500" />
                    3. Athlete Top Achievements & Personal Records (PRs)
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold">Verified Benchmark Bests</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Power PRs */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                    <div className="bg-slate-100 px-3 py-2 font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-orange-600">
                        <Zap className="w-3.5 h-3.5" />
                        Cycling Power Duration Curve Bests
                      </span>
                      <span className="text-[10px] text-slate-500">Mean Max Power</span>
                    </div>
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-3">Duration</th>
                          <th className="py-1.5 px-2 text-right">Watts</th>
                          <th className="py-1.5 px-2 text-right">W/Kg</th>
                          <th className="py-1.5 px-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {powerPRs.slice(0, 5).map((pr) => (
                          <tr key={pr.durationLabel} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-3 font-semibold text-slate-800">{pr.durationLabel}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-orange-600">{pr.watts}W</td>
                            <td className="py-1.5 px-2 text-right text-slate-600">{pr.wattsPerKg.toFixed(2)}</td>
                            <td className="py-1.5 px-3 text-right text-slate-400 text-[10px]">{pr.dateAchieved}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pace PRs */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                    <div className="bg-slate-100 px-3 py-2 font-mono font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sky-600">
                        <Compass className="w-3.5 h-3.5" />
                        Running Pace & Distance Bests
                      </span>
                      <span className="text-[10px] text-slate-500">Split Paces</span>
                    </div>
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-3">Distance</th>
                          <th className="py-1.5 px-2 text-right">Pace</th>
                          <th className="py-1.5 px-2 text-right">Time</th>
                          <th className="py-1.5 px-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pacePRs.slice(0, 5).map((pr) => (
                          <tr key={pr.distanceLabel} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-3 font-semibold text-slate-800">
                              {pr.distanceLabel.split('(')[0].trim()}
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-sky-600">{pr.formattedPace}</td>
                            <td className="py-1.5 px-2 text-right text-slate-600">{pr.totalTime}</td>
                            <td className="py-1.5 px-3 text-right text-slate-400 text-[10px]">{pr.dateAchieved}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Top Breakthrough Workouts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    4. Notable Monthly Breakthrough Sessions
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">High-Impact Workouts</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Activity</th>
                        <th className="py-2 px-2">Sport</th>
                        <th className="py-2 px-2 text-right">Distance</th>
                        <th className="py-2 px-2 text-right">Climb</th>
                        <th className="py-2 px-2 text-right">NP</th>
                        <th className="py-2 px-3 text-right">TSS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topActivities.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-bold text-slate-900 max-w-[240px] truncate">{act.title}</td>
                          <td className="py-2 px-2 uppercase text-slate-600 text-[10px]">{act.sport}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900">{act.distanceKm.toFixed(1)} km</td>
                          <td className="py-2 px-2 text-right text-slate-600">+{Math.round(act.elevationGainMeters)}m</td>
                          <td className="py-2 px-2 text-right text-slate-700">{act.normalizedPower || 310}W</td>
                          <td className="py-2 px-3 text-right font-bold text-orange-600">{act.tss} TSS</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 5: AI Coach Directive */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-mono text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>AI HEAD COACH DIRECTIVE & MESOCYCLE PROGNOSIS</span>
                </div>
                <p className="text-xs text-amber-950 font-sans leading-relaxed">
                  {reportData.coachNotes}
                </p>
              </div>
            </div>

            {/* Document Footer */}
            <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Certified by Veltrix High-Performance Sports Science Lab</span>
              <span>Confidential Performance Record · Generated with Veltrix Analytics</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
          <div className="text-neutral-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Includes CTL/ATL/TSB, Power Curve & Pace PRs, and monthly totals</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition border border-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export & Save PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
