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
  ReferenceLine,
} from 'recharts';
import {
  ArrowLeftRight,
  Calendar,
  CalendarRange,
  TrendingUp,
  TrendingDown,
  Activity as ActivityIcon,
  Heart,
  Zap,
  Mountain,
  Clock,
  Gauge,
  Filter,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Sliders,
  Info,
  Layers,
  Award,
} from 'lucide-react';
import { Activity, AthleteProfile } from '../../types';
import { formatDuration } from '../../utils/geoUtils';

interface ComparePerformanceViewProps {
  activities: Activity[];
  profile: AthleteProfile;
  onSelectActivity?: (activity: Activity) => void;
}

type PresetType =
  | 'last_14_vs_prior_14'
  | 'last_30_vs_prior_30'
  | 'this_month_vs_last_month'
  | 'last_8w_vs_prior_8w'
  | 'custom';

type OverlayMetricType = 'distance' | 'elevation' | 'tss' | 'movingTime';

export const ComparePerformanceView: React.FC<ComparePerformanceViewProps> = ({
  activities,
  profile,
  onSelectActivity,
}) => {
  // Preset and Date State
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('last_30_vs_prior_30');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [overlayMetric, setOverlayMetric] = useState<OverlayMetricType>('distance');
  const [weeklyMetric, setWeeklyMetric] = useState<'distance' | 'tss' | 'hours'>('distance');

  // Custom Date States initialized to last 30 vs prior 30 days
  const now = useMemo(() => new Date(), []);

  const [dateRangeA, setDateRangeA] = useState<{ start: string; end: string }>(() => {
    // Period A (Baseline / Prior 30 Days: day -60 to day -31)
    const end = new Date(now.getTime() - 30 * 86400 * 1000);
    const start = new Date(now.getTime() - 60 * 86400 * 1000);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  const [dateRangeB, setDateRangeB] = useState<{ start: string; end: string }>(() => {
    // Period B (Comparison / Recent 30 Days: day -30 to today)
    const end = now;
    const start = new Date(now.getTime() - 30 * 86400 * 1000);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  // Handle Preset Switching
  const applyPreset = (preset: PresetType) => {
    setSelectedPreset(preset);
    const today = new Date();

    if (preset === 'last_14_vs_prior_14') {
      const endB = today;
      const startB = new Date(today.getTime() - 14 * 86400 * 1000);
      const endA = new Date(today.getTime() - 14 * 86400 * 1000);
      const startA = new Date(today.getTime() - 28 * 86400 * 1000);

      setDateRangeB({
        start: startB.toISOString().split('T')[0],
        end: endB.toISOString().split('T')[0],
      });
      setDateRangeA({
        start: startA.toISOString().split('T')[0],
        end: endA.toISOString().split('T')[0],
      });
    } else if (preset === 'last_30_vs_prior_30') {
      const endB = today;
      const startB = new Date(today.getTime() - 30 * 86400 * 1000);
      const endA = new Date(today.getTime() - 30 * 86400 * 1000);
      const startA = new Date(today.getTime() - 60 * 86400 * 1000);

      setDateRangeB({
        start: startB.toISOString().split('T')[0],
        end: endB.toISOString().split('T')[0],
      });
      setDateRangeA({
        start: startA.toISOString().split('T')[0],
        end: endA.toISOString().split('T')[0],
      });
    } else if (preset === 'last_8w_vs_prior_8w') {
      const endB = today;
      const startB = new Date(today.getTime() - 56 * 86400 * 1000);
      const endA = new Date(today.getTime() - 56 * 86400 * 1000);
      const startA = new Date(today.getTime() - 112 * 86400 * 1000);

      setDateRangeB({
        start: startB.toISOString().split('T')[0],
        end: endB.toISOString().split('T')[0],
      });
      setDateRangeA({
        start: startA.toISOString().split('T')[0],
        end: endA.toISOString().split('T')[0],
      });
    } else if (preset === 'this_month_vs_last_month') {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      // Period B: start of current month to today
      const startB = new Date(currentYear, currentMonth, 1);
      const endB = today;

      // Period A: start of last month to end of last month
      const startA = new Date(currentYear, currentMonth - 1, 1);
      const endA = new Date(currentYear, currentMonth, 0);

      setDateRangeB({
        start: startB.toISOString().split('T')[0],
        end: endB.toISOString().split('T')[0],
      });
      setDateRangeA({
        start: startA.toISOString().split('T')[0],
        end: endA.toISOString().split('T')[0],
      });
    }
  };

  // Swap Periods A and B
  const handleSwapPeriods = () => {
    const temp = { ...dateRangeA };
    setDateRangeA({ ...dateRangeB });
    setDateRangeB(temp);
    setSelectedPreset('custom');
  };

  // Filter activities by date range and sport
  const filterActivities = (startStr: string, endStr: string) => {
    const start = new Date(startStr).getTime();
    // End date should include the full end day (23:59:59)
    const end = new Date(endStr).getTime() + 86400 * 1000 - 1;

    return activities
      .filter((act) => {
        const actTime = new Date(act.date).getTime();
        if (actTime < start || actTime > end) return false;
        if (selectedSport !== 'all' && act.sport !== selectedSport) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const activitiesA = useMemo(
    () => filterActivities(dateRangeA.start, dateRangeA.end),
    [activities, dateRangeA, selectedSport]
  );

  const activitiesB = useMemo(
    () => filterActivities(dateRangeB.start, dateRangeB.end),
    [activities, dateRangeB, selectedSport]
  );

  // Compute Aggregates for Period A and Period B
  const aggregateMetrics = (acts: Activity[], startStr: string, endStr: string) => {
    const totalDistance = acts.reduce((s, a) => s + a.distanceKm, 0);
    const totalElevation = acts.reduce((s, a) => s + a.elevationGainMeters, 0);
    const totalMovingSeconds = acts.reduce(
      (s, a) => s + (a.movingTimeSeconds || a.durationSeconds),
      0
    );
    const totalHours = totalMovingSeconds / 3600;
    const totalTss = acts.reduce((s, a) => s + a.tss, 0);
    const count = acts.length;

    const avgSpeedKmh =
      totalMovingSeconds > 0 ? (totalDistance / (totalMovingSeconds / 3600)) : 0;
    const avgHeartRate =
      acts.filter((a) => a.avgHeartRate).length > 0
        ? Math.round(
            acts.reduce((s, a) => s + (a.avgHeartRate || 0), 0) /
              acts.filter((a) => a.avgHeartRate).length
          )
        : 0;

    const cyclingActs = acts.filter((a) => a.avgPower && a.avgPower > 0);
    const avgPower =
      cyclingActs.length > 0
        ? Math.round(cyclingActs.reduce((s, a) => s + (a.avgPower || 0), 0) / cyclingActs.length)
        : 0;

    const avgNormalizedPower =
      cyclingActs.length > 0
        ? Math.round(
            cyclingActs.reduce((s, a) => s + (a.normalizedPower || a.avgPower || 0), 0) /
              cyclingActs.length
          )
        : 0;

    // Span in days
    const diffDays = Math.max(
      1,
      Math.round(
        (new Date(endStr).getTime() - new Date(startStr).getTime()) / (86400 * 1000)
      ) + 1
    );

    const weeklyDistance = (totalDistance / diffDays) * 7;
    const weeklyHours = (totalHours / diffDays) * 7;
    const weeklyTSS = (totalTss / diffDays) * 7;

    return {
      totalDistance,
      totalElevation,
      totalMovingSeconds,
      totalHours,
      totalTss,
      count,
      avgSpeedKmh,
      avgHeartRate,
      avgPower,
      avgNormalizedPower,
      diffDays,
      weeklyDistance,
      weeklyHours,
      weeklyTSS,
    };
  };

  const statsA = useMemo(
    () => aggregateMetrics(activitiesA, dateRangeA.start, dateRangeA.end),
    [activitiesA, dateRangeA]
  );

  const statsB = useMemo(
    () => aggregateMetrics(activitiesB, dateRangeB.start, dateRangeB.end),
    [activitiesB, dateRangeB]
  );

  // Calculate Delta and % Change
  const getDelta = (valA: number, valB: number) => {
    const diff = valB - valA;
    const pct = valA > 0 ? (diff / valA) * 100 : valB > 0 ? 100 : 0;
    return {
      diff,
      pct,
      isPositive: diff >= 0,
      formattedPct: `${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    };
  };

  // Physiological HR Zone Distribution Calculation
  const lthr = profile.lthr || 172;
  const maxHr = profile.maxHeartRate || 195;

  const zoneBounds = useMemo(() => {
    return [
      { zone: 'Z1', name: 'Active Recovery', min: 0, max: Math.round(lthr * 0.68) },
      { zone: 'Z2', name: 'Aerobic Base', min: Math.round(lthr * 0.68), max: Math.round(lthr * 0.83) },
      { zone: 'Z3', name: 'Tempo', min: Math.round(lthr * 0.84), max: Math.round(lthr * 0.94) },
      { zone: 'Z4', name: 'Threshold', min: Math.round(lthr * 0.95), max: Math.round(lthr * 1.05) },
      { zone: 'Z5', name: 'VO2 Max', min: Math.round(lthr * 1.06), max: maxHr },
    ];
  }, [lthr, maxHr]);

  const computeZonesForList = (acts: Activity[]) => {
    const zoneSeconds: { [z: string]: number } = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    acts.forEach((act) => {
      const totalSec = act.movingTimeSeconds || act.durationSeconds || 3600;
      const hr = act.avgHeartRate || lthr * 0.8;

      if (hr < lthr * 0.75) {
        zoneSeconds['Z1'] += totalSec * 0.35;
        zoneSeconds['Z2'] += totalSec * 0.55;
        zoneSeconds['Z3'] += totalSec * 0.08;
        zoneSeconds['Z4'] += totalSec * 0.02;
      } else if (hr < lthr * 0.9) {
        zoneSeconds['Z1'] += totalSec * 0.15;
        zoneSeconds['Z2'] += totalSec * 0.45;
        zoneSeconds['Z3'] += totalSec * 0.25;
        zoneSeconds['Z4'] += totalSec * 0.12;
        zoneSeconds['Z5'] += totalSec * 0.03;
      } else {
        zoneSeconds['Z1'] += totalSec * 0.1;
        zoneSeconds['Z2'] += totalSec * 0.25;
        zoneSeconds['Z3'] += totalSec * 0.25;
        zoneSeconds['Z4'] += totalSec * 0.3;
        zoneSeconds['Z5'] += totalSec * 0.1;
      }
    });

    const total = Object.values(zoneSeconds).reduce((a, b) => a + b, 0) || 1;
    return zoneBounds.map((zb) => {
      const sec = zoneSeconds[zb.zone] || 0;
      const pct = Math.round((sec / total) * 100);
      const hours = Number((sec / 3600).toFixed(1));
      return {
        zone: zb.zone,
        name: zb.name,
        percentage: pct,
        hours,
      };
    });
  };

  const zonesA = useMemo(() => computeZonesForList(activitiesA), [activitiesA, zoneBounds]);
  const zonesB = useMemo(() => computeZonesForList(activitiesB), [activitiesB, zoneBounds]);

  // Combined Zones Bar Data
  const comparativeZonesChartData = useMemo(() => {
    return zoneBounds.map((zb, idx) => {
      return {
        zone: zb.zone,
        name: zb.name,
        periodA_pct: zonesA[idx]?.percentage || 0,
        periodB_pct: zonesB[idx]?.percentage || 0,
        periodA_hrs: zonesA[idx]?.hours || 0,
        periodB_hrs: zonesB[idx]?.hours || 0,
      };
    });
  }, [zoneBounds, zonesA, zonesB]);

  // Polarization Scores (80/20 rule: Z1+Z2 vs Z3 vs Z4+Z5)
  const polarizationA = useMemo(() => {
    const low = (zonesA[0]?.percentage || 0) + (zonesA[1]?.percentage || 0);
    const mid = zonesA[2]?.percentage || 0;
    const high = (zonesA[3]?.percentage || 0) + (zonesA[4]?.percentage || 0);
    return { low, mid, high, isPolarized: low >= 75 && high >= 10 };
  }, [zonesA]);

  const polarizationB = useMemo(() => {
    const low = (zonesB[0]?.percentage || 0) + (zonesB[1]?.percentage || 0);
    const mid = zonesB[2]?.percentage || 0;
    const high = (zonesB[3]?.percentage || 0) + (zonesB[4]?.percentage || 0);
    return { low, mid, high, isPolarized: low >= 75 && high >= 10 };
  }, [zonesB]);

  // Normalized Day-by-Day Progression Overlay (Day 1 to Day N)
  const normalizedProgressionData = useMemo(() => {
    const maxDays = Math.max(statsA.diffDays, statsB.diffDays, 14);

    // Build map of offset days for Period A
    const mapA: { [day: number]: { distance: number; elevation: number; tss: number; timeSec: number; dateStr: string } } = {};
    const startA = new Date(dateRangeA.start).getTime();
    activitiesA.forEach((act) => {
      const actTime = new Date(act.date).getTime();
      const dayOffset = Math.floor((actTime - startA) / (86400 * 1000)) + 1;
      if (!mapA[dayOffset]) {
        mapA[dayOffset] = { distance: 0, elevation: 0, tss: 0, timeSec: 0, dateStr: act.date.split('T')[0] };
      }
      mapA[dayOffset].distance += act.distanceKm;
      mapA[dayOffset].elevation += act.elevationGainMeters;
      mapA[dayOffset].tss += act.tss;
      mapA[dayOffset].timeSec += (act.movingTimeSeconds || act.durationSeconds);
    });

    // Build map of offset days for Period B
    const mapB: { [day: number]: { distance: number; elevation: number; tss: number; timeSec: number; dateStr: string } } = {};
    const startB = new Date(dateRangeB.start).getTime();
    activitiesB.forEach((act) => {
      const actTime = new Date(act.date).getTime();
      const dayOffset = Math.floor((actTime - startB) / (86400 * 1000)) + 1;
      if (!mapB[dayOffset]) {
        mapB[dayOffset] = { distance: 0, elevation: 0, tss: 0, timeSec: 0, dateStr: act.date.split('T')[0] };
      }
      mapB[dayOffset].distance += act.distanceKm;
      mapB[dayOffset].elevation += act.elevationGainMeters;
      mapB[dayOffset].tss += act.tss;
      mapB[dayOffset].timeSec += (act.movingTimeSeconds || act.durationSeconds);
    });

    let cumDistA = 0;
    let cumEleA = 0;
    let cumTssA = 0;

    let cumDistB = 0;
    let cumEleB = 0;
    let cumTssB = 0;

    const data = [];
    for (let day = 1; day <= maxDays; day++) {
      const itemA = mapA[day];
      const itemB = mapB[day];

      if (itemA) {
        cumDistA += itemA.distance;
        cumEleA += itemA.elevation;
        cumTssA += itemA.tss;
      }

      if (itemB) {
        cumDistB += itemB.distance;
        cumEleB += itemB.elevation;
        cumTssB += itemB.tss;
      }

      // Calculate calendar dates for label context
      const calDateA = new Date(startA + (day - 1) * 86400 * 1000);
      const calDateB = new Date(startB + (day - 1) * 86400 * 1000);

      const labelA = `${calDateA.getMonth() + 1}/${calDateA.getDate()}`;
      const labelB = `${calDateB.getMonth() + 1}/${calDateB.getDate()}`;

      data.push({
        dayIndex: day,
        dayLabel: `Day ${day}`,
        dateA: labelA,
        dateB: labelB,
        // Cumulative Metrics
        cumDistA: Number(cumDistA.toFixed(1)),
        cumDistB: Number(cumDistB.toFixed(1)),
        cumEleA: Math.round(cumEleA),
        cumEleB: Math.round(cumEleB),
        cumTssA: Math.round(cumTssA),
        cumTssB: Math.round(cumTssB),
        // Daily Single Day Metrics
        dailyDistA: Number((itemA?.distance || 0).toFixed(1)),
        dailyDistB: Number((itemB?.distance || 0).toFixed(1)),
        dailyTssA: itemA?.tss || 0,
        dailyTssB: itemB?.tss || 0,
      });
    }

    return data;
  }, [activitiesA, activitiesB, dateRangeA, dateRangeB, statsA.diffDays, statsB.diffDays]);

  // Weekly Comparative Volume Data (Grouped Bar Chart)
  const weeklyComparisonData = useMemo(() => {
    const numWeeks = Math.max(
      Math.ceil(statsA.diffDays / 7),
      Math.ceil(statsB.diffDays / 7),
      4
    );

    const weekData: {
      weekLabel: string;
      periodA_dist: number;
      periodB_dist: number;
      periodA_tss: number;
      periodB_tss: number;
      periodA_hrs: number;
      periodB_hrs: number;
    }[] = [];

    const startA = new Date(dateRangeA.start).getTime();
    const startB = new Date(dateRangeB.start).getTime();

    for (let w = 1; w <= numWeeks; w++) {
      const wStartA = startA + (w - 1) * 7 * 86400 * 1000;
      const wEndA = wStartA + 7 * 86400 * 1000;
      const wStartB = startB + (w - 1) * 7 * 86400 * 1000;
      const wEndB = wStartB + 7 * 86400 * 1000;

      const actsWkA = activitiesA.filter((a) => {
        const t = new Date(a.date).getTime();
        return t >= wStartA && t < wEndA;
      });

      const actsWkB = activitiesB.filter((a) => {
        const t = new Date(a.date).getTime();
        return t >= wStartB && t < wEndB;
      });

      const distA = actsWkA.reduce((s, a) => s + a.distanceKm, 0);
      const distB = actsWkB.reduce((s, a) => s + a.distanceKm, 0);
      const tssA = actsWkA.reduce((s, a) => s + a.tss, 0);
      const tssB = actsWkB.reduce((s, a) => s + a.tss, 0);
      const hrsA = actsWkA.reduce((s, a) => s + (a.movingTimeSeconds || a.durationSeconds), 0) / 3600;
      const hrsB = actsWkB.reduce((s, a) => s + (a.movingTimeSeconds || a.durationSeconds), 0) / 3600;

      weekData.push({
        weekLabel: `Week ${w}`,
        periodA_dist: Number(distA.toFixed(1)),
        periodB_dist: Number(distB.toFixed(1)),
        periodA_tss: Math.round(tssA),
        periodB_tss: Math.round(tssB),
        periodA_hrs: Number(hrsA.toFixed(1)),
        periodB_hrs: Number(hrsB.toFixed(1)),
      });
    }

    return weekData;
  }, [activitiesA, activitiesB, dateRangeA, dateRangeB, statsA.diffDays, statsB.diffDays]);

  // Smart Comparative Insights Engine
  const insights = useMemo(() => {
    const findings: string[] = [];

    const distDelta = getDelta(statsA.totalDistance, statsB.totalDistance);
    const eleDelta = getDelta(statsA.totalElevation, statsB.totalElevation);
    const tssDelta = getDelta(statsA.totalTss, statsB.totalTss);
    const hrDelta = statsB.avgHeartRate - statsA.avgHeartRate;
    const speedDelta = statsB.avgSpeedKmh - statsA.avgSpeedKmh;

    if (distDelta.diff > 0) {
      findings.push(
        `Volume Expansion: You covered +${distDelta.diff.toFixed(1)} km (${distDelta.formattedPct}) more total distance in Period B.`
      );
    } else if (distDelta.diff < 0) {
      findings.push(
        `Recovery / Tapering: Total mileage decreased by ${Math.abs(distDelta.diff).toFixed(1)} km (${distDelta.formattedPct}), indicating deload or focused recovery.`
      );
    }

    if (eleDelta.diff > 100) {
      findings.push(
        `Vertical Climbing Elevation: Ascended +${Math.round(eleDelta.diff)}m more vertical gain in Period B (${eleDelta.formattedPct}), building muscular torque and endurance.`
      );
    }

    if (speedDelta > 0.5 && hrDelta <= 2) {
      findings.push(
        `Aerobic Efficiency Spike: Average speed increased by +${speedDelta.toFixed(1)} km/h while heart rate remained steady (Δ ${hrDelta >= 0 ? '+' : ''}${hrDelta} bpm), demonstrating cardiovascular adaptation.`
      );
    } else if (hrDelta <= -3) {
      findings.push(
        `Heart Rate Suppression / Fitness Gain: Average heart rate dropped by ${Math.abs(hrDelta)} bpm across comparable workloads.`
      );
    }

    if (polarizationB.isPolarized && !polarizationA.isPolarized) {
      findings.push(
        `Polarized Discipline: Period B achieved optimal Seiler 80/20 polarization (${polarizationB.low}% Aerobic Z1-Z2 / ${polarizationB.high}% High Intensity Z4-Z5).`
      );
    }

    if (findings.length === 0) {
      findings.push(
        `Stable Baseline: Both periods maintained steady physiological volume and balanced stress density.`
      );
    }

    return findings;
  }, [statsA, statsB, polarizationA, polarizationB]);

  return (
    <div id="compare-performance-view" className="space-y-6 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. CONTROL HEADER: PRESETS, TIME PERIOD SELECTORS, AND SPORT FILTER        */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <ArrowLeftRight className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                  PERIOD PERFORMANCE COMPARISON
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Select two distinct time horizons to overlay training load, aerobic adaptation, and intensity metrics
                </p>
              </div>
            </div>
          </div>

          {/* Quick Preset Selector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
            <button
              id="preset-last-14"
              onClick={() => applyPreset('last_14_vs_prior_14')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedPreset === 'last_14_vs_prior_14'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              14d vs Prior 14d
            </button>

            <button
              id="preset-last-30"
              onClick={() => applyPreset('last_30_vs_prior_30')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedPreset === 'last_30_vs_prior_30'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              30d vs Prior 30d
            </button>

            <button
              id="preset-this-month"
              onClick={() => applyPreset('this_month_vs_last_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedPreset === 'this_month_vs_last_month'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              This Mo. vs Last Mo.
            </button>

            <button
              id="preset-last-8w"
              onClick={() => applyPreset('last_8w_vs_prior_8w')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedPreset === 'last_8w_vs_prior_8w'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              8 Weeks vs Prior 8w
            </button>
          </div>
        </div>

        {/* Date Pickers Grid for Period A & Period B */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-4 border-t border-neutral-800/80 items-center">
          {/* Period A (Baseline / Reference) */}
          <div className="md:col-span-5 bg-neutral-950 p-4 rounded-xl border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-500/50" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
                  PERIOD A (BASELINE)
                </span>
              </div>
              <span className="text-[11px] font-mono text-sky-400/80 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {statsA.count} Workouts · {statsA.diffDays} Days
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                  Start Date
                </label>
                <input
                  id="period-a-start"
                  type="date"
                  value={dateRangeA.start}
                  onChange={(e) => {
                    setDateRangeA((prev) => ({ ...prev, start: e.target.value }));
                    setSelectedPreset('custom');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded-lg px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                  End Date
                </label>
                <input
                  id="period-a-end"
                  type="date"
                  value={dateRangeA.end}
                  onChange={(e) => {
                    setDateRangeA((prev) => ({ ...prev, end: e.target.value }));
                    setSelectedPreset('custom');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded-lg px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Swap Button (Middle) */}
          <div className="md:col-span-2 flex justify-center">
            <button
              id="swap-periods-btn"
              onClick={handleSwapPeriods}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-mono flex items-center gap-1.5 transition shadow-sm"
              title="Swap Period A and Period B"
            >
              <ArrowLeftRight className="w-4 h-4 text-orange-400" />
              <span className="hidden md:inline">Swap</span>
            </button>
          </div>

          {/* Period B (Comparison / Current) */}
          <div className="md:col-span-5 bg-neutral-950 p-4 rounded-xl border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400 shadow-sm shadow-orange-500/50" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-300">
                  PERIOD B (COMPARISON)
                </span>
              </div>
              <span className="text-[11px] font-mono text-orange-400/80 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                {statsB.count} Workouts · {statsB.diffDays} Days
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                  Start Date
                </label>
                <input
                  id="period-b-start"
                  type="date"
                  value={dateRangeB.start}
                  onChange={(e) => {
                    setDateRangeB((prev) => ({ ...prev, start: e.target.value }));
                    setSelectedPreset('custom');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                  End Date
                </label>
                <input
                  id="period-b-end"
                  type="date"
                  value={dateRangeB.end}
                  onChange={(e) => {
                    setDateRangeB((prev) => ({ ...prev, end: e.target.value }));
                    setSelectedPreset('custom');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sport Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/60">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400 font-mono">Discipline Filter:</span>
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
              {(['all', 'cycling', 'running', 'gravel', 'trail_running'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSport(s)}
                  className={`px-2.5 py-1 rounded-md capitalize text-[11px] font-mono transition ${
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

          <div className="text-xs text-neutral-400 font-mono">
            Comparing <span className="text-sky-400 font-bold">{activitiesA.length}</span> (A) vs{' '}
            <span className="text-orange-400 font-bold">{activitiesB.length}</span> (B) Sessions
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KEY METRIC DELTA CARDS (PERIOD A vs PERIOD B)                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        {/* Total Distance Card */}
        {(() => {
          const delta = getDelta(statsA.totalDistance, statsB.totalDistance);
          return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">
                  Distance Volume
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-0.5 ${
                    delta.isPositive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {delta.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {delta.formattedPct}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-sky-400 font-bold">{statsA.totalDistance.toFixed(1)} km</span>
                  <span className="text-neutral-500 text-xs">vs</span>
                  <span className="text-orange-400 font-bold">{statsB.totalDistance.toFixed(1)} km</span>
                </div>
                <div className="text-[11px] text-neutral-400 font-sans">
                  Delta: <strong className="text-white font-mono">{delta.diff >= 0 ? '+' : ''}{delta.diff.toFixed(1)} km</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Total Elevation Card */}
        {(() => {
          const delta = getDelta(statsA.totalElevation, statsB.totalElevation);
          return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">
                  Elevation Gain
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-0.5 ${
                    delta.isPositive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {delta.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {delta.formattedPct}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-sky-400 font-bold">+{Math.round(statsA.totalElevation)} m</span>
                  <span className="text-neutral-500 text-xs">vs</span>
                  <span className="text-orange-400 font-bold">+{Math.round(statsB.totalElevation)} m</span>
                </div>
                <div className="text-[11px] text-neutral-400 font-sans">
                  Delta: <strong className="text-white font-mono">{delta.diff >= 0 ? '+' : ''}{Math.round(delta.diff)} m</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Total Training Stress (TSS) */}
        {(() => {
          const delta = getDelta(statsA.totalTss, statsB.totalTss);
          return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">
                  Training Stress (TSS)
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-0.5 ${
                    delta.isPositive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/30'
                  }`}
                >
                  {delta.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {delta.formattedPct}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-sky-400 font-bold">{Math.round(statsA.totalTss)} TSS</span>
                  <span className="text-neutral-500 text-xs">vs</span>
                  <span className="text-orange-400 font-bold">{Math.round(statsB.totalTss)} TSS</span>
                </div>
                <div className="text-[11px] text-neutral-400 font-sans">
                  Avg/Wk: <strong className="text-white font-mono">{Math.round(statsA.weeklyTSS)} vs {Math.round(statsB.weeklyTSS)}</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Average Heart Rate & Speed */}
        {(() => {
          const hrDelta = statsB.avgHeartRate - statsA.avgHeartRate;
          const speedDelta = statsB.avgSpeedKmh - statsA.avgSpeedKmh;
          return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider font-sans font-semibold">
                  Avg Heart Rate & Speed
                </span>
                <span className="text-[10px] text-neutral-400">
                  {statsB.avgHeartRate > 0 && statsA.avgHeartRate > 0
                    ? `Δ ${hrDelta >= 0 ? '+' : ''}${hrDelta} bpm`
                    : 'N/A'}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-sky-400 font-bold">{statsA.avgHeartRate || '--'} bpm</span>
                  <span className="text-neutral-500 text-xs">vs</span>
                  <span className="text-orange-400 font-bold">{statsB.avgHeartRate || '--'} bpm</span>
                </div>
                <div className="text-[11px] text-neutral-400 font-sans">
                  Speed: <strong className="text-white font-mono">{statsA.avgSpeedKmh.toFixed(1)} vs {statsB.avgSpeedKmh.toFixed(1)} km/h</strong>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* 3. PRIMARY OVERLAY VISUALIZATION: NORMALIZED TIMELINE ACCUMULATION         */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-400" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                Normalized Day-by-Day Progression Overlay
              </h4>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Aligns both periods from Day 1 to inspect cumulative acceleration in volume and load
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            {(
              [
                { id: 'distance', label: 'Distance (km)' },
                { id: 'elevation', label: 'Elevation (m)' },
                { id: 'tss', label: 'Training Stress (TSS)' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setOverlayMetric(m.id)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                  overlayMetric === m.id
                    ? 'bg-neutral-800 text-orange-400 font-bold border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs font-mono pt-1">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-sky-400" />
            <span className="text-neutral-300">Period A ({dateRangeA.start} to {dateRangeA.end})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-neutral-300">Period B ({dateRangeB.start} to {dateRangeB.end})</span>
          </div>
        </div>

        {/* Recharts Area / Line Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={normalizedProgressionData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="dayLabel" stroke="#737373" fontSize={11} fontStyle="italic" />
              <YAxis
                stroke="#737373"
                fontSize={11}
                tickFormatter={(v) => (overlayMetric === 'elevation' ? `${v}m` : `${v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const valA =
                      overlayMetric === 'distance'
                        ? d.cumDistA
                        : overlayMetric === 'elevation'
                        ? d.cumEleA
                        : d.cumTssA;
                    const valB =
                      overlayMetric === 'distance'
                        ? d.cumDistB
                        : overlayMetric === 'elevation'
                        ? d.cumEleB
                        : d.cumTssB;
                    const diff = valB - valA;
                    const unit = overlayMetric === 'distance' ? 'km' : overlayMetric === 'elevation' ? 'm' : 'TSS';

                    return (
                      <div className="bg-neutral-950 border border-neutral-700 p-3 rounded-xl shadow-xl font-mono text-xs space-y-1.5">
                        <div className="font-bold text-white border-b border-neutral-800 pb-1 flex justify-between gap-4">
                          <span>{d.dayLabel}</span>
                          <span className="text-neutral-400 font-normal">
                            A: {d.dateA} · B: {d.dateB}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sky-400">
                          <span>Period A:</span>
                          <span className="font-bold">{valA} {unit}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-orange-400">
                          <span>Period B:</span>
                          <span className="font-bold">{valB} {unit}</span>
                        </div>
                        <div className="pt-1 border-t border-neutral-800 flex items-center justify-between gap-4 text-neutral-300">
                          <span>Net Variance:</span>
                          <span className={diff >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(1)} {unit}
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
                dataKey={
                  overlayMetric === 'distance'
                    ? 'cumDistA'
                    : overlayMetric === 'elevation'
                    ? 'cumEleA'
                    : 'cumTssA'
                }
                name="Period A"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorA)"
              />
              <Area
                type="monotone"
                dataKey={
                  overlayMetric === 'distance'
                    ? 'cumDistB'
                    : overlayMetric === 'elevation'
                    ? 'cumEleB'
                    : 'cumTssB'
                }
                name="Period B"
                stroke="#f97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorB)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DUAL PANELS: WEEKLY BREAKDOWN & PHYSIOLOGICAL INTENSITY ZONES           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Weekly Grouped Bar Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                Weekly Volume Breakdown
              </h4>
            </div>

            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setWeeklyMetric('distance')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  weeklyMetric === 'distance'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Distance
              </button>
              <button
                onClick={() => setWeeklyMetric('hours')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  weeklyMetric === 'hours'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Hours
              </button>
              <button
                onClick={() => setWeeklyMetric('tss')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  weeklyMetric === 'tss'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                TSS
              </button>
            </div>
          </div>

          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="weekLabel" stroke="#737373" fontSize={11} />
                <YAxis stroke="#737373" fontSize={11} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const valA =
                        weeklyMetric === 'distance'
                          ? `${d.periodA_dist} km`
                          : weeklyMetric === 'hours'
                          ? `${d.periodA_hrs} hrs`
                          : `${d.periodA_tss} TSS`;
                      const valB =
                        weeklyMetric === 'distance'
                          ? `${d.periodB_dist} km`
                          : weeklyMetric === 'hours'
                          ? `${d.periodB_hrs} hrs`
                          : `${d.periodB_tss} TSS`;

                      return (
                        <div className="bg-neutral-950 border border-neutral-700 p-2.5 rounded-xl font-mono text-xs space-y-1 shadow-xl">
                          <div className="font-bold text-white">{d.weekLabel}</div>
                          <div className="text-sky-400">Period A: {valA}</div>
                          <div className="text-orange-400">Period B: {valB}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey={
                    weeklyMetric === 'distance'
                      ? 'periodA_dist'
                      : weeklyMetric === 'hours'
                      ? 'periodA_hrs'
                      : 'periodA_tss'
                  }
                  name="Period A"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={
                    weeklyMetric === 'distance'
                      ? 'periodB_dist'
                      : weeklyMetric === 'hours'
                      ? 'periodB_hrs'
                      : 'periodB_tss'
                  }
                  name="Period B"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Heart Rate & Intensity Zones Comparison */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                Physiological Intensity (HR Zones)
              </h4>
            </div>

            <span className="text-xs font-mono text-neutral-400">
              LTHR: {lthr} bpm
            </span>
          </div>

          {/* Grouped Zone Bar Chart */}
          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativeZonesChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="zone" stroke="#737373" fontSize={11} />
                <YAxis stroke="#737373" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-neutral-950 border border-neutral-700 p-2.5 rounded-xl font-mono text-xs space-y-1 shadow-xl">
                          <div className="font-bold text-white">{d.zone}: {d.name}</div>
                          <div className="text-sky-400">Period A: {d.periodA_pct}% ({d.periodA_hrs} hrs)</div>
                          <div className="text-orange-400">Period B: {d.periodB_pct}% ({d.periodB_hrs} hrs)</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="periodA_pct" name="Period A %" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="periodB_pct" name="Period B %" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Seiler Polarization Score Comparison */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800 text-xs font-mono">
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-sky-500/20">
              <div className="text-neutral-400 text-[10px] uppercase">Period A Polarization</div>
              <div className="text-sky-400 font-bold mt-0.5">
                {polarizationA.low}% Low / {polarizationA.mid}% Mid / {polarizationA.high}% High
              </div>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-xl border border-orange-500/20">
              <div className="text-neutral-400 text-[10px] uppercase">Period B Polarization</div>
              <div className="text-orange-400 font-bold mt-0.5">
                {polarizationB.low}% Low / {polarizationB.mid}% Mid / {polarizationB.high}% High
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. COMPARATIVE COACHING TAKEAWAYS & PHYSIOLOGICAL SUMMARY                  */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-white">
            Performance Progression & Adaptation Takeaways
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-neutral-300 font-sans"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SIDE-BY-SIDE LOG COMPARISON: PERIOD A vs PERIOD B WORKOUTS             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period A Activities Column */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono">
                Period A Sessions ({activitiesA.length})
              </h4>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {statsA.totalDistance.toFixed(1)} km total
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {activitiesA.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 font-mono">
                No recorded workouts in Period A range.
              </div>
            ) : (
              activitiesA.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onSelectActivity && onSelectActivity(act)}
                  className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-sky-500/50 cursor-pointer transition flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white hover:text-sky-400 transition truncate max-w-[200px]">
                      {act.title}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {act.sport.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-bold text-white">{act.distanceKm.toFixed(1)} km</div>
                      <div className="text-[10px] text-emerald-400">+{act.elevationGainMeters}m</div>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                      {act.tss} TSS
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Period B Activities Column */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">
                Period B Sessions ({activitiesB.length})
              </h4>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {statsB.totalDistance.toFixed(1)} km total
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {activitiesB.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 font-mono">
                No recorded workouts in Period B range.
              </div>
            ) : (
              activitiesB.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onSelectActivity && onSelectActivity(act)}
                  className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-orange-500/50 cursor-pointer transition flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white hover:text-orange-400 transition truncate max-w-[200px]">
                      {act.title}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {act.sport.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-bold text-white">{act.distanceKm.toFixed(1)} km</div>
                      <div className="text-[10px] text-emerald-400">+{act.elevationGainMeters}m</div>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
                      {act.tss} TSS
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
