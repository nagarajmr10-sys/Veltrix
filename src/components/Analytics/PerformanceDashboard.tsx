import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
} from 'recharts';
import {
  Heart,
  Mountain,
  Zap,
  TrendingUp,
  Activity as ActivityIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Gauge,
  Sparkles,
  Sliders,
  ChevronRight,
  Info,
  ArrowLeftRight,
  FileText,
} from 'lucide-react';
import { Activity, AthleteProfile, SportType, DailyTrainingMetric } from '../../types';
import { formatDuration, formatSpeed, formatPace } from '../../utils/geoUtils';
import { ComparePerformanceView } from './ComparePerformanceView';
import { CompareWorkoutsView } from './CompareWorkoutsView';
import { AIRecoveryInsightsPanel } from './AIRecoveryInsightsPanel';
import { MonthlyPerformanceReportModal } from './MonthlyPerformanceReportModal';
import { generateHistoricalPMC } from '../../data/initialData';

interface PerformanceDashboardProps {
  activities: Activity[];
  profile: AthleteProfile;
  selectedActivityId?: string | null;
  onSelectActivity?: (activity: Activity) => void;
  initialViewMode?: 'all' | 'hr' | 'elevation' | 'compare' | 'compare_workouts' | 'compare_periods';
  pmcMetrics?: DailyTrainingMetric[];
  onNavigateToPMC?: () => void;
}

// Physiological HR Zone definitions based on athlete's LTHR
interface HRZoneSummary {
  zone: string;
  name: string;
  minBpm: number;
  maxBpm: number;
  seconds: number;
  minutes: number;
  percentage: number;
  color: string;
  fillColor: string;
  description: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  activities,
  profile,
  selectedActivityId = null,
  onSelectActivity,
  initialViewMode = 'all',
  pmcMetrics,
  onNavigateToPMC,
}) => {
  // PMC metrics data with fallback
  const resolvedPmcMetrics = useMemo(() => {
    return pmcMetrics && pmcMetrics.length > 0 ? pmcMetrics : generateHistoricalPMC();
  }, [pmcMetrics]);
  // Filters & Controls
  const [activeWorkoutId, setActiveWorkoutId] = useState<string>(
    selectedActivityId || (activities[0]?.id ?? 'all')
  );
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [activeViewMode, setActiveViewMode] = useState<
    'all' | 'hr' | 'elevation' | 'compare_workouts' | 'compare_periods'
  >(() => {
    if (initialViewMode === 'compare' || initialViewMode === 'compare_periods') {
      return 'compare_periods';
    }
    if (initialViewMode === 'compare_workouts') {
      return 'compare_workouts';
    }
    return (initialViewMode as any) || 'all';
  });

  const [compareWorkoutAId, setCompareWorkoutAId] = useState<string>(
    selectedActivityId || activities[0]?.id || ''
  );
  const [compareWorkoutBId, setCompareWorkoutBId] = useState<string>(
    activities[1]?.id || activities[0]?.id || ''
  );
  const [customLthr, setCustomLthr] = useState<number>(profile.lthr || 172);
  const [showZoneSettings, setShowZoneSettings] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Filter activities by sport
  const completedWorkouts = useMemo(() => {
    return activities.filter((act) => {
      if (selectedSport === 'all') return true;
      return act.sport === selectedSport;
    });
  }, [activities, selectedSport]);

  // Active workout object (or null if "all" is chosen)
  const currentWorkout = useMemo(() => {
    if (activeWorkoutId === 'all') return null;
    return activities.find((a) => a.id === activeWorkoutId) || activities[0] || null;
  }, [activities, activeWorkoutId]);

  // Dynamic HR Zone Boundaries calculated from LTHR
  const zoneThresholds = useMemo(() => {
    const lthr = customLthr;
    return [
      {
        zone: 'Z1',
        name: 'Active Recovery',
        minBpm: 0,
        maxBpm: Math.round(lthr * 0.68),
        color: '#94a3b8', // slate-400
        fillColor: '#64748b',
        description: 'Easy spin / flush, lipid oxidation, metabolic recovery',
      },
      {
        zone: 'Z2',
        name: 'Aerobic Base',
        minBpm: Math.round(lthr * 0.68),
        maxBpm: Math.round(lthr * 0.83),
        color: '#38bdf8', // sky-400
        fillColor: '#0284c7',
        description: 'Mitochondrial biogenesis, endurance foundation, fat adaptation',
      },
      {
        zone: 'Z3',
        name: 'Aerobic Tempo',
        minBpm: Math.round(lthr * 0.84),
        maxBpm: Math.round(lthr * 0.94),
        color: '#34d399', // emerald-400
        fillColor: '#059669',
        description: 'Muscular endurance, marathon rhythm, glycogen conservation',
      },
      {
        zone: 'Z4',
        name: 'Lactate Threshold',
        minBpm: Math.round(lthr * 0.95),
        maxBpm: Math.round(lthr * 1.05),
        color: '#fbbf24', // amber-400
        fillColor: '#d97706',
        description: 'Lactate shuttle buffering, race pace power, sustained 40-60min ceiling',
      },
      {
        zone: 'Z5',
        name: 'VO2 Max / Anaerobic',
        minBpm: Math.round(lthr * 1.06),
        maxBpm: profile.maxHeartRate || 205,
        color: '#fb7185', // rose-400
        fillColor: '#e11d48',
        description: 'Maximal oxygen uptake, cardiac stroke volume, neuromuscular power',
      },
    ];
  }, [customLthr, profile.maxHeartRate]);

  // Compute HR Zone Distribution for a given activity
  const computeActivityZones = (act: Activity): HRZoneSummary[] => {
    const track = act.gpsTrack || [];
    const validHrPoints = track.filter((p) => p.heartRate && p.heartRate > 40);

    const secondsInZone: { [z: string]: number } = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    const stepDuration = 15; // each recorded GPS point is approx 15s

    if (validHrPoints.length > 0) {
      validHrPoints.forEach((p) => {
        const hr = p.heartRate!;
        if (hr < zoneThresholds[0].maxBpm) {
          secondsInZone['Z1'] += stepDuration;
        } else if (hr <= zoneThresholds[1].maxBpm) {
          secondsInZone['Z2'] += stepDuration;
        } else if (hr <= zoneThresholds[2].maxBpm) {
          secondsInZone['Z3'] += stepDuration;
        } else if (hr <= zoneThresholds[3].maxBpm) {
          secondsInZone['Z4'] += stepDuration;
        } else {
          secondsInZone['Z5'] += stepDuration;
        }
      });
    } else {
      // Fallback estimate based on avgHeartRate and duration
      const avg = act.avgHeartRate || customLthr * 0.8;
      const totalSec = act.movingTimeSeconds || act.durationSeconds || 3600;
      if (avg < customLthr * 0.75) {
        secondsInZone['Z1'] = totalSec * 0.35;
        secondsInZone['Z2'] = totalSec * 0.55;
        secondsInZone['Z3'] = totalSec * 0.08;
        secondsInZone['Z4'] = totalSec * 0.02;
      } else if (avg < customLthr * 0.9) {
        secondsInZone['Z1'] = totalSec * 0.15;
        secondsInZone['Z2'] = totalSec * 0.45;
        secondsInZone['Z3'] = totalSec * 0.25;
        secondsInZone['Z4'] = totalSec * 0.12;
        secondsInZone['Z5'] = totalSec * 0.03;
      } else {
        secondsInZone['Z1'] = totalSec * 0.1;
        secondsInZone['Z2'] = totalSec * 0.25;
        secondsInZone['Z3'] = totalSec * 0.25;
        secondsInZone['Z4'] = totalSec * 0.3;
        secondsInZone['Z5'] = totalSec * 0.1;
      }
    }

    const totalSeconds = Object.values(secondsInZone).reduce((a, b) => a + b, 0) || 1;

    return zoneThresholds.map((zt) => {
      const sec = secondsInZone[zt.zone] || 0;
      const pct = Math.round((sec / totalSeconds) * 100);
      return {
        zone: zt.zone,
        name: zt.name,
        minBpm: zt.minBpm,
        maxBpm: zt.maxBpm,
        seconds: sec,
        minutes: Math.round(sec / 60),
        percentage: pct,
        color: zt.color,
        fillColor: zt.fillColor,
        description: zt.description,
      };
    });
  };

  // Active workout HR zones
  const activeWorkoutZones = useMemo(() => {
    if (currentWorkout) {
      return computeActivityZones(currentWorkout);
    }
    // Aggregate all completed workouts
    const aggSeconds: { [z: string]: number } = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    completedWorkouts.forEach((act) => {
      const zones = computeActivityZones(act);
      zones.forEach((z) => {
        aggSeconds[z.zone] += z.seconds;
      });
    });
    const totalSec = Object.values(aggSeconds).reduce((a, b) => a + b, 0) || 1;
    return zoneThresholds.map((zt) => {
      const sec = aggSeconds[zt.zone] || 0;
      return {
        zone: zt.zone,
        name: zt.name,
        minBpm: zt.minBpm,
        maxBpm: zt.maxBpm,
        seconds: sec,
        minutes: Math.round(sec / 60),
        percentage: Math.round((sec / totalSec) * 100),
        color: zt.color,
        fillColor: zt.fillColor,
        description: zt.description,
      };
    });
  }, [currentWorkout, completedWorkouts, zoneThresholds]);

  // Aggregate polarization stats (Seiler 80/20 Rule)
  const polarizationStats = useMemo(() => {
    const lowIntensity = (activeWorkoutZones[0]?.percentage || 0) + (activeWorkoutZones[1]?.percentage || 0); // Z1 + Z2
    const moderateIntensity = activeWorkoutZones[2]?.percentage || 0; // Z3
    const highIntensity = (activeWorkoutZones[3]?.percentage || 0) + (activeWorkoutZones[4]?.percentage || 0); // Z4 + Z5

    const isWellPolarized = lowIntensity >= 70 && highIntensity >= 10;

    return {
      lowIntensity,
      moderateIntensity,
      highIntensity,
      isWellPolarized,
      pieData: [
        { name: 'Low (Z1-Z2 Aerobic)', value: lowIntensity, color: '#0ea5e9' },
        { name: 'Tempo (Z3 Glycogen)', value: moderateIntensity, color: '#10b981' },
        { name: 'High (Z4-Z5 Threshold/VO2)', value: highIntensity, color: '#f43f5e' },
      ],
    };
  }, [activeWorkoutZones]);

  // Track stream data for the active workout (Elevation vs HR correlation & Elevation Profile)
  const trackStreamData = useMemo(() => {
    const workout = currentWorkout || completedWorkouts[0];
    if (!workout || !workout.gpsTrack || workout.gpsTrack.length === 0) return [];

    const totalTrack = workout.gpsTrack;
    const distanceStep = workout.distanceKm / Math.max(1, totalTrack.length - 1);

    return totalTrack.map((p, idx) => {
      const dist = Number((idx * distanceStep).toFixed(2));
      const alt = p.altitude !== undefined ? Math.round(p.altitude) : 100;
      const hr = p.heartRate || 140;
      const power = p.power || null;
      const speed = p.speed ? Number((p.speed * 3.6).toFixed(1)) : null;

      // Determine HR Zone at this second
      let currentZone = 'Z1';
      if (hr > zoneThresholds[3].maxBpm) currentZone = 'Z5';
      else if (hr >= zoneThresholds[3].minBpm) currentZone = 'Z4';
      else if (hr >= zoneThresholds[2].minBpm) currentZone = 'Z3';
      else if (hr >= zoneThresholds[1].minBpm) currentZone = 'Z2';

      return {
        index: idx,
        distanceKm: dist,
        altitudeMeters: alt,
        heartRateBpm: hr,
        powerWatts: power,
        speedKmh: speed,
        zone: currentZone,
      };
    });
  }, [currentWorkout, completedWorkouts, zoneThresholds]);

  // Elevation gain data across ALL completed workouts (for multi-workout bar & cumulative curve)
  const workoutElevationHistoryData = useMemo(() => {
    let cumulative = 0;
    // Sort oldest to newest for chronological climbing progression
    const sorted = [...completedWorkouts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sorted.map((act) => {
      cumulative += act.elevationGainMeters;
      const dateObj = new Date(act.date);
      const shortDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      return {
        id: act.id,
        title: act.title,
        shortTitle: act.title.length > 18 ? act.title.slice(0, 16) + '…' : act.title,
        sport: act.sport,
        date: shortDate,
        elevationGain: act.elevationGainMeters,
        cumulativeElevation: cumulative,
        distanceKm: Number(act.distanceKm.toFixed(1)),
        avgHeartRate: act.avgHeartRate || 0,
        maxHeartRate: act.maxHeartRate || 0,
        tss: act.tss,
      };
    });
  }, [completedWorkouts]);

  // Multi-workout Stacked HR Zones Distribution Data
  const multiWorkoutHRData = useMemo(() => {
    return completedWorkouts.map((act) => {
      const zones = computeActivityZones(act);
      const zMap: { [key: string]: number } = {};
      zones.forEach((z) => {
        zMap[z.zone] = z.minutes;
      });
      const dateObj = new Date(act.date);
      return {
        id: act.id,
        name: act.title.length > 15 ? act.title.slice(0, 13) + '…' : act.title,
        sport: act.sport,
        date: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
        Z1: zMap['Z1'] || 0,
        Z2: zMap['Z2'] || 0,
        Z3: zMap['Z3'] || 0,
        Z4: zMap['Z4'] || 0,
        Z5: zMap['Z5'] || 0,
        totalMinutes: Math.round((act.movingTimeSeconds || act.durationSeconds) / 60),
        avgHR: act.avgHeartRate || 0,
      };
    });
  }, [completedWorkouts]);

  // Aggregate Key Metrics
  const totalElevationClimbed = completedWorkouts.reduce((s, a) => s + a.elevationGainMeters, 0);
  const totalDistanceCovered = completedWorkouts.reduce((s, a) => s + a.distanceKm, 0);
  const averageHeartRate = completedWorkouts.length
    ? Math.round(
        completedWorkouts.reduce((s, a) => s + (a.avgHeartRate || 0), 0) / completedWorkouts.length
      )
    : 0;
  const maxRecordedHR = Math.max(...completedWorkouts.map((a) => a.maxHeartRate || 0), 0);

  // VAM (Vertical Ascent Meters / Hour) calculation for active workout
  const currentVAM = useMemo(() => {
    if (!currentWorkout) {
      const totalSec = completedWorkouts.reduce((s, a) => s + a.movingTimeSeconds, 0);
      const hrs = totalSec / 3600;
      return hrs > 0 ? Math.round(totalElevationClimbed / hrs) : 0;
    }
    const hrs = (currentWorkout.movingTimeSeconds || currentWorkout.durationSeconds) / 3600;
    return hrs > 0 ? Math.round(currentWorkout.elevationGainMeters / hrs) : 0;
  }, [currentWorkout, completedWorkouts, totalElevationClimbed]);

  return (
    <div id="performance-dashboard" className="space-y-6">
      {/* Header Banner & Workout Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <ActivityIcon className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                WORKOUT PERFORMANCE DASHBOARD
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Physiological Heart Rate Zone distributions, elevation climbing curves, and cardiac load metrics
            </p>
          </div>

          {/* View Mode Tabs + Export Action */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                id="view-all-mode"
                onClick={() => setActiveViewMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeViewMode === 'all'
                    ? 'bg-neutral-800 text-orange-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Unified Dashboard
              </button>

              <button
                id="view-compare-workouts-mode"
                onClick={() => setActiveViewMode('compare_workouts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeViewMode === 'compare_workouts'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-orange-400" />
                <span>Compare Workouts</span>
              </button>

              <button
                id="view-compare-periods-mode"
                onClick={() => setActiveViewMode('compare_periods')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeViewMode === 'compare_periods' || activeViewMode === 'compare'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Compare Periods</span>
              </button>

              <button
                id="view-hr-mode"
                onClick={() => setActiveViewMode('hr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeViewMode === 'hr'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Heart Rate Zones</span>
              </button>

              <button
                id="view-elevation-mode"
                onClick={() => setActiveViewMode('elevation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeViewMode === 'elevation'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                <span>Elevation & Ascent</span>
              </button>
            </div>

            <button
              id="top-export-pdf-report-btn"
              onClick={() => setShowReportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition shrink-0"
              title="Generate and export monthly performance PDF report with CTL/ATL/TSB and PR achievements"
            >
              <FileText className="w-4 h-4" />
              <span>Export Monthly PDF</span>
            </button>
          </div>
        </div>

        {/* Filter & Workout Selection Bar */}
        {activeViewMode !== 'compare_workouts' && activeViewMode !== 'compare_periods' && activeViewMode !== 'compare' ? (
          <div className="pt-4 border-t border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mr-1">
                <Filter className="w-3.5 h-3.5 text-orange-400" />
                <span>Focus Workout:</span>
              </div>

              {/* Main Workout Picker Dropdown */}
              <select
                id="dashboard-workout-select"
                value={activeWorkoutId}
                onChange={(e) => setActiveWorkoutId(e.target.value)}
                className="bg-neutral-950 border border-neutral-700 text-white text-xs font-mono rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500"
              >
                <option value="all">📊 All Completed Workouts ({completedWorkouts.length} aggregate)</option>
                {completedWorkouts.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.title} · {act.distanceKm.toFixed(1)}km · +{act.elevationGainMeters}m
                  </option>
                ))}
              </select>

              {/* Compare Focus Workout directly */}
              {currentWorkout && (
                <button
                  id="compare-current-workout-btn"
                  onClick={() => {
                    setCompareWorkoutAId(currentWorkout.id);
                    const other = activities.find((a) => a.id !== currentWorkout.id);
                    if (other) setCompareWorkoutBId(other.id);
                    setActiveViewMode('compare_workouts');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition"
                  title="Compare this workout head-to-head with another session"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Compare This Workout</span>
                </button>
              )}

              {/* Sport Filter Pills */}
              <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs">
                {(['all', 'cycling', 'running', 'gravel', 'trail_running'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSport(s)}
                    className={`px-2.5 py-1 rounded-md capitalize text-[11px] transition ${
                      selectedSport === s
                        ? 'bg-neutral-800 text-white font-bold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* LTHR Configuration Toggle & Report Action */}
            <div className="flex items-center gap-2">
              <button
                id="toggle-lthr-settings-btn"
                onClick={() => setShowZoneSettings(!showZoneSettings)}
                className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 transition"
              >
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                <span>LTHR: {customLthr} bpm</span>
              </button>

              <button
                id="filter-bar-export-pdf-btn"
                onClick={() => setShowReportModal(true)}
                className="text-xs font-mono text-orange-400 hover:text-orange-300 flex items-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-xl border border-orange-500/30 transition font-bold"
                title="Open Monthly Performance Report Generator & PDF Export"
              >
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                <span>Monthly Report</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-white font-semibold">
                {activeViewMode === 'compare_workouts' ? 'Workout Comparison Active' : 'Period Comparison Active'}
              </span>
              <span>
                {activeViewMode === 'compare_workouts'
                  ? '— Overlaying two individual workouts telemetry & splits'
                  : '— Overlaying two custom or preset training horizons'}
              </span>
            </div>
            <button
              onClick={() => setActiveViewMode('all')}
              className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-4 self-start sm:self-auto"
            >
              Switch to Single Dashboard
            </button>
          </div>
        )}

        {/* Expandable LTHR Threshold Slider */}
        {showZoneSettings && (
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white">Lactate Threshold Heart Rate (LTHR) Calibration</div>
              <span className="text-xs font-mono text-orange-400 font-bold">{customLthr} BPM</span>
            </div>
            <input
              type="range"
              min="140"
              max="195"
              value={customLthr}
              onChange={(e) => setCustomLthr(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>140 bpm (Endurance baseline)</span>
              <span>172 bpm (Athlete current)</span>
              <span>195 bpm (Elite ceiling)</span>
            </div>
          </div>
        )}
      </div>

      {/* Render Workout Compare, Period Compare, or Single Dashboard Views */}
      {activeViewMode === 'compare_workouts' ? (
        <CompareWorkoutsView
          activities={activities}
          profile={profile}
          initialWorkoutAId={compareWorkoutAId}
          initialWorkoutBId={compareWorkoutBId}
          onSelectActivity={onSelectActivity}
          onBackToDashboard={() => setActiveViewMode('all')}
        />
      ) : activeViewMode === 'compare_periods' || activeViewMode === 'compare' ? (
        <ComparePerformanceView
          activities={activities}
          profile={profile}
          onSelectActivity={onSelectActivity}
        />
      ) : (
        <>
          {/* AI-Powered Recovery & Training Load Insights Panel */}
          <AIRecoveryInsightsPanel
            metrics={resolvedPmcMetrics}
            onNavigateToPMC={onNavigateToPMC}
            onExportPDF={() => setShowReportModal(true)}
          />

          {/* Top Telemetry KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
            {/* Total Elevation */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">
                  {currentWorkout ? 'Workout Elevation' : 'Total Elevation Gain'}
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Mountain className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  +{currentWorkout ? currentWorkout.elevationGainMeters : totalElevationClimbed}
                  <span className="text-xs text-neutral-400 font-sans ml-1">m</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-sans">
                  VAM Climbing Speed: <strong className="text-white font-mono">{currentVAM} m/hr</strong>
                </div>
              </div>
            </div>

            {/* Avg & Max Heart Rate */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">
                  {currentWorkout ? 'Heart Rate Peak / Avg' : 'Average HR Load'}
                </span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <Heart className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
                  {currentWorkout ? currentWorkout.avgHeartRate : averageHeartRate}
                  <span className="text-xs text-neutral-400 font-sans ml-1">
                    bpm {currentWorkout ? `(max ${currentWorkout.maxHeartRate})` : `(peak ${maxRecordedHR})`}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-sans">
                  Threshold Ratio: <strong className="text-white font-mono">
                    {Math.round(((currentWorkout ? currentWorkout.avgHeartRate || 150 : averageHeartRate) / customLthr) * 100)}% LTHR
                  </strong>
                </div>
              </div>
            </div>

            {/* Polarized Score (80/20 Distribution) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">Polarization Model</span>
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight">
                  {polarizationStats.lowIntensity}% <span className="text-xs text-neutral-400 font-sans">Base</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-sans">
                  High Intensity Z4/5: <strong className="text-rose-400 font-mono">{polarizationStats.highIntensity}%</strong>
                </div>
              </div>
            </div>

            {/* Distance & Moving Time */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">
                  {currentWorkout ? 'Distance & Duration' : 'Total Workouts'}
                </span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {currentWorkout
                    ? `${currentWorkout.distanceKm.toFixed(1)} km`
                    : `${completedWorkouts.length} Sessions`}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-sans">
                  {currentWorkout
                    ? formatDuration(currentWorkout.movingTimeSeconds || currentWorkout.durationSeconds)
                    : `${totalDistanceCovered.toFixed(1)} km total volume`}
                </div>
              </div>
            </div>
          </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HEART RATE ZONES GRAPHS (RECHARTS)                             */}
      {/* ========================================================================= */}
      {(activeViewMode === 'all' || activeViewMode === 'hr') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Heart Rate Zones & Physiological Stress
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              LTHR Baseline: {customLthr} bpm
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 1A: Time In Zone Distribution Bar Chart (Recharts) */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {currentWorkout ? `Time in Zones: ${currentWorkout.title}` : 'Aggregate Time in HR Zones'}
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Minutes spent in each metabolic energy system
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-mono text-[11px] font-bold">
                  {activeWorkoutZones.reduce((s, z) => s + z.minutes, 0)} Total Mins
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeWorkoutZones}
                    margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="zone"
                      stroke="#737373"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#737373"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      unit="m"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as HRZoneSummary;
                          return (
                            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl shadow-xl font-mono text-xs space-y-1">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                <span>
                                  {data.zone}: {data.name}
                                </span>
                              </div>
                              <div className="text-neutral-400">
                                Range: {data.minBpm} - {data.maxBpm} BPM
                              </div>
                              <div className="text-orange-400 font-bold">
                                {data.minutes} mins ({data.percentage}% of workout)
                              </div>
                              <p className="text-[10px] text-neutral-500 font-sans max-w-[200px] pt-1 border-t border-neutral-800">
                                {data.description}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                      {activeWorkoutZones.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Zone Breakdown Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-neutral-800/80">
                {activeWorkoutZones.map((z) => (
                  <div
                    key={z.zone}
                    className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold" style={{ color: z.color }}>
                        {z.zone}
                      </span>
                      <span className="text-neutral-500">{z.percentage}%</span>
                    </div>
                    <div className="text-xs font-bold text-white font-mono">{z.minutes}m</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {z.minBpm}-{z.maxBpm} bpm
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 1B: Polarization Distribution Donut (Recharts PieChart) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">80/20 Polarized Ratio</h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      polarizationStats.isWellPolarized
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {polarizationStats.isWellPolarized ? 'Optimal' : 'High Intensity'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Aerobic foundation (Z1+Z2) vs Threshold & Anaerobic strain (Z4+Z5)
                </p>
              </div>

              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={polarizationStats.pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={4}
                    >
                      {polarizationStats.pieData.map((entry, index) => (
                        <Cell key={`slice-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          return (
                            <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-xs font-mono">
                              <span className="text-white font-bold">{item.name}</span>
                              <div className="text-orange-400">{item.value}% of time</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-white font-mono">
                    {polarizationStats.lowIntensity}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-sans">
                    Aerobic Base
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-800/80 text-xs font-mono">
                {polarizationStats.pieData.map((slice) => (
                  <div key={slice.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="text-neutral-300 text-[11px] font-sans">{slice.name}</span>
                    </div>
                    <span className="font-bold text-white">{slice.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 1C: Multi-Workout HR Zone Comparison (Stacked BarChart) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Zone Breakdown Across Completed Workouts (Stacked Timeline)
                </h4>
                <p className="text-xs text-neutral-400">
                  Compare physiological intensity distribution across all finished sessions
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" /> Z2 Base
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Z3 Tempo
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Z4 Thresh
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> Z5 VO2
                </span>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={multiWorkoutHRData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#737373"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#737373"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    unit="m"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl font-mono text-xs space-y-1 shadow-2xl">
                            <div className="font-bold text-white">{d.name}</div>
                            <div className="text-[10px] text-neutral-400">
                              {d.date} · {d.totalMinutes} mins total · Avg HR: {d.avgHR} bpm
                            </div>
                            <div className="pt-1.5 space-y-0.5 border-t border-neutral-800 text-[11px]">
                              <div className="text-slate-400">Z1 Recovery: {d.Z1}m</div>
                              <div className="text-sky-400">Z2 Base: {d.Z2}m</div>
                              <div className="text-emerald-400">Z3 Tempo: {d.Z3}m</div>
                              <div className="text-amber-400">Z4 Threshold: {d.Z4}m</div>
                              <div className="text-rose-400 font-bold">Z5 VO2 Max: {d.Z5}m</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Z1" stackId="a" fill="#64748b" name="Z1 Recovery" />
                  <Bar dataKey="Z2" stackId="a" fill="#0284c7" name="Z2 Aerobic Base" />
                  <Bar dataKey="Z3" stackId="a" fill="#059669" name="Z3 Tempo" />
                  <Bar dataKey="Z4" stackId="a" fill="#d97706" name="Z4 Threshold" />
                  <Bar dataKey="Z5" stackId="a" fill="#e11d48" name="Z5 VO2 Max" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ELEVATION GAIN & CLIMBING GRAPHS (RECHARTS)                    */}
      {/* ========================================================================= */}
      {(activeViewMode === 'all' || activeViewMode === 'elevation') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mountain className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Elevation Gain & Ascent Analytics
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              +{totalElevationClimbed}m Total Vertical Gained
            </span>
          </div>

          {/* Chart 2A: Workout-by-Workout Elevation Gain & Cumulative Ascent Progression */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Elevation Gain Per Workout & Cumulative Ascent Progression
                </h4>
                <p className="text-xs text-neutral-400">
                  Green bars show vertical gain (m) per session; Gold line tracks cumulative climbing trajectory
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-neutral-300">Workout Ascent (m)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-amber-400" />
                  <span className="text-amber-400">Cumulative Ascent (m)</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={workoutElevationHistoryData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="shortTitle"
                    stroke="#737373"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  {/* Left Y Axis: Single Workout Elevation */}
                  <YAxis
                    yAxisId="left"
                    stroke="#10b981"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    unit="m"
                  />
                  {/* Right Y Axis: Cumulative Elevation */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#fbbf24"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    unit="m"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl font-mono text-xs space-y-1.5 shadow-2xl">
                            <div className="font-bold text-white">{d.title}</div>
                            <div className="text-neutral-400 text-[11px]">
                              {d.date} · {d.distanceKm} km · {d.sport.toUpperCase()}
                            </div>
                            <div className="pt-1.5 border-t border-neutral-800 space-y-0.5">
                              <div className="text-emerald-400 font-bold">
                                Ascent: +{d.elevationGain}m
                              </div>
                              <div className="text-amber-400">
                                Cumulative: +{d.cumulativeElevation}m
                              </div>
                              <div className="text-rose-400">
                                Avg Heart Rate: {d.avgHeartRate} bpm
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="elevationGain"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativeElevation"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#1c1917' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2B: Dual-Axis Elevation vs Heart Rate Response & Altitude Profile */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Continuous Cardiac & Altitude Stream: {currentWorkout ? currentWorkout.title : 'Selected Activity'}
                </h4>
                <p className="text-xs text-neutral-400">
                  Real-time correlation: Altitude climb profile (emerald fill) plotted against Heart Rate surges (rose line)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Elevation (m)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Heart Rate (bpm)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trackStreamData}
                  margin={{ top: 15, right: 30, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="elevationAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="distanceKm"
                    stroke="#737373"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    unit="km"
                  />
                  {/* Left: Altitude */}
                  <YAxis
                    yAxisId="elev"
                    stroke="#10b981"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    unit="m"
                    domain={['auto', 'auto']}
                  />
                  {/* Right: Heart Rate */}
                  <YAxis
                    yAxisId="hr"
                    orientation="right"
                    stroke="#fb7185"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    unit="bpm"
                    domain={[100, (dataMax: number) => Math.max(190, dataMax + 5)]}
                  />
                  {/* LTHR reference line */}
                  <ReferenceLine
                    yAxisId="hr"
                    y={customLthr}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `LTHR (${customLthr})`,
                      fill: '#f59e0b',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      position: 'top',
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl font-mono text-xs space-y-1.5 shadow-2xl">
                            <div className="font-bold text-white">Distance: {pt.distanceKm} km</div>
                            <div className="space-y-0.5 text-[11px]">
                              <div className="text-emerald-400 font-bold">
                                Altitude: {pt.altitudeMeters} m
                              </div>
                              <div className="text-rose-400 font-bold">
                                Heart Rate: {pt.heartRateBpm} bpm ({pt.zone})
                              </div>
                              {pt.powerWatts && (
                                <div className="text-amber-400">Power: {pt.powerWatts} W</div>
                              )}
                              {pt.speedKmh && (
                                <div className="text-neutral-400">Speed: {pt.speedKmh} km/h</div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    yAxisId="elev"
                    type="monotone"
                    dataKey="altitudeMeters"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#elevationAreaGrad)"
                    name="Altitude"
                  />
                  <Line
                    yAxisId="hr"
                    type="monotone"
                    dataKey="heartRateBpm"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                    name="Heart Rate"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Summit & Grade Bento Metrics */}
            {trackStreamData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-800/80 font-mono text-xs">
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-sans">Peak Summit</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {Math.max(...trackStreamData.map((d) => d.altitudeMeters))} m
                  </div>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-sans">Min Elevation</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {Math.min(...trackStreamData.map((d) => d.altitudeMeters))} m
                  </div>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-sans">Max Heart Rate</div>
                  <div className="text-base font-bold text-rose-400 mt-0.5">
                    {Math.max(...trackStreamData.map((d) => d.heartRateBpm))} bpm
                  </div>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-sans">Avg Climb Rate (VAM)</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    {currentVAM} m/h
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: COMPLETED WORKOUTS LIST & DIRECT INSPECTOR                     */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Completed Workouts Registry
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {completedWorkouts.length} Sessions Logged
          </span>
        </div>

        <div className="space-y-2.5">
          {completedWorkouts.map((act) => {
            const isSelected = activeWorkoutId === act.id;
            return (
              <div
                key={act.id}
                onClick={() => setActiveWorkoutId(act.id)}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-neutral-950 border-orange-500/60 shadow-lg shadow-orange-500/10'
                    : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-800 text-neutral-300 font-bold">
                      {act.sport.replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-white hover:text-orange-400 transition">
                      {act.title}
                    </h4>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono flex flex-wrap items-center gap-2">
                    <span>{new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>·</span>
                    <span>{act.distanceKm.toFixed(1)} km</span>
                    <span>·</span>
                    <span>{formatDuration(act.movingTimeSeconds || act.durationSeconds)}</span>
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="flex items-center gap-3 font-mono text-xs self-end sm:self-auto">
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5" />
                    <span>+{act.elevationGainMeters}m</span>
                  </div>

                  {act.avgHeartRate && (
                    <div className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{act.avgHeartRate} bpm</span>
                    </div>
                  )}

                  <div className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400 font-bold">
                    {act.tss} TSS
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompareWorkoutAId(act.id);
                      const other = activities.find((a) => a.id !== act.id);
                      if (other) setCompareWorkoutBId(other.id);
                      setActiveViewMode('compare_workouts');
                    }}
                    className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 border border-orange-500/25 transition flex items-center gap-1 text-[11px]"
                    title="Compare this workout head-to-head"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span className="hidden md:inline font-mono">Compare</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectActivity) onSelectActivity(act);
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                    title="Open Full Map & Split Deep Dive"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  )}
  {/* Monthly Performance PDF Report Modal */}
  <MonthlyPerformanceReportModal
    isOpen={showReportModal}
    onClose={() => setShowReportModal(false)}
    athlete={profile}
    activities={activities}
    pmcMetrics={resolvedPmcMetrics}
  />
</div>
  );
};
