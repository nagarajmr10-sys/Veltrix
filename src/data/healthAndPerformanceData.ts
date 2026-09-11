import {
  HealthBiometricDay,
  WearableDeviceStatus,
  PerformanceStatsData,
} from '../types';

export const INITIAL_WEARABLES: WearableDeviceStatus[] = [
  {
    id: 'wearable-garmin',
    name: 'Garmin Forerunner 965',
    brand: 'garmin',
    icon: 'Watch',
    batteryPct: 82,
    lastSyncTime: '12 mins ago',
    isConnected: true,
    statusMessage: 'Continuous optical HR & HRV nightly status active',
  },
  {
    id: 'wearable-whoop',
    name: 'Whoop 4.0 Strap',
    brand: 'whoop',
    icon: 'Activity',
    batteryPct: 64,
    lastSyncTime: '4 mins ago',
    isConnected: true,
    statusMessage: 'Sleep stages & Recovery score synced',
  },
  {
    id: 'wearable-oura',
    name: 'Oura Ring Gen 3 Horizon',
    brand: 'oura',
    icon: 'CircleDot',
    batteryPct: 48,
    lastSyncTime: '1 hour ago',
    isConnected: true,
    statusMessage: 'Skin temperature deviation & resting respiration logged',
  },
  {
    id: 'wearable-wahoo',
    name: 'Wahoo ELEMNT ROAM v2',
    brand: 'wahoo',
    icon: 'Cpu',
    batteryPct: 90,
    lastSyncTime: 'Yesterday, 18:45',
    isConnected: true,
    statusMessage: 'ANT+ dual-sided power & cadence synced',
  },
];

// Generate 14 days of realistic physiological recovery metrics and steps
export function generateHealthBiometricsHistory(): HealthBiometricDay[] {
  const days: HealthBiometricDay[] = [];
  const today = new Date();

  const baselineHRV = 72;
  const baselineRHR = 42;

  // Typical hourly distribution for today (e.g., morning walk, lunch stroll, evening walk)
  const generateTodayHourlySteps = (totalToday: number) => {
    const hourlyDistributionWeights = [
      0, 0, 0, 0, 0, 0.02, 0.08, 0.14, 0.10, 0.06, 0.05, 0.09, 0.12, 0.08, 0.06, 0.04, 0.06, 0.05, 0.03, 0.02, 0, 0, 0, 0
    ];
    return hourlyDistributionWeights.map((weight, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      steps: Math.round(totalToday * weight),
    }));
  };

  // Pre-configured realistic step counts over 14 days
  const stepCounts14Days = [
    9420,  // Today
    12450, // Yesterday
    10820, // 2 days ago
    8640,  // 3 days ago
    14120, // 4 days ago
    11300, // 5 days ago
    10250, // 6 days ago
    9810,  // 7 days ago
    13200, // 8 days ago
    11050, // 9 days ago
    8940,  // 10 days ago
    12680, // 11 days ago
    10420, // 12 days ago
    11890, // 13 days ago
  ];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Some variations in recovery
    const isHardDay = i === 1 || i === 5 || i === 9;
    const isRecoveryDay = i === 0 || i === 4 || i === 8;

    let recoveryScore = isHardDay ? 58 + Math.round(Math.random() * 8) : isRecoveryDay ? 88 + Math.round(Math.random() * 8) : 74 + Math.round(Math.random() * 12);
    recoveryScore = Math.min(99, Math.max(45, recoveryScore));

    const hrvRmssd = Math.round(recoveryScore > 75 ? baselineHRV + Math.random() * 12 : baselineHRV - (Math.random() * 14 + 4));
    const restingHr = recoveryScore > 75 ? baselineRHR - Math.round(Math.random() * 2) : baselineRHR + Math.round(Math.random() * 5 + 1);
    const sleepHours = Number((6.8 + (recoveryScore / 100) * 1.6 + (Math.random() * 0.4 - 0.2)).toFixed(1));
    const sleepQuality = Math.min(98, Math.round(recoveryScore * 0.95 + Math.random() * 6));
    const deepSleepPct = Math.round(18 + Math.random() * 7);
    const remSleepPct = Math.round(21 + Math.random() * 6);
    const spo2Pct = Number((98.2 + Math.random() * 1.2).toFixed(1));
    const respiratoryRate = Number((13.4 + Math.random() * 0.8).toFixed(1));
    const skinTempDeviationCelsius = Number(((recoveryScore < 65 ? 0.3 : -0.2) + (Math.random() * 0.2 - 0.1)).toFixed(2));
    const soreness = isHardDay ? 4 : isRecoveryDay ? 1 : 2;
    const stress: 'low' | 'moderate' | 'high' = recoveryScore > 80 ? 'low' : recoveryScore > 60 ? 'moderate' : 'high';

    let recommendation = 'Optimal autonomic balance. Prime for high-intensity intervals or threshold testing.';
    if (recoveryScore < 65) {
      recommendation = 'Sympathetic dominance detected. Suppressed HRV. Recommend easy Z1/Z2 recovery spin or active rest.';
    } else if (recoveryScore < 80) {
      recommendation = 'Moderate recovery state. Standard aerobic endurance and tempo maintenance advised.';
    }

    const steps = stepCounts14Days[i] ?? 10000;
    const stepGoal = 10000;
    const activeMinutes = Math.round((steps / 1000) * 8.5); // ~80 mins for 9.5k steps
    const walkingDistanceKm = Number(((steps * 0.78) / 1000).toFixed(2)); // ~0.78m average stride
    const caloriesBurned = Math.round(steps * 0.043 + 420); // active walking calories
    const floorsClimbed = Math.round((steps / 1000) * 1.8 + Math.random() * 4);

    days.push({
      date: dateStr,
      recoveryScore,
      hrvRmssd,
      hrvBaseline: baselineHRV,
      restingHr,
      sleepHours,
      sleepQualityScore: sleepQuality,
      deepSleepPct,
      remSleepPct,
      spo2Pct,
      respiratoryRate,
      skinTempDeviationCelsius,
      subjectiveSoreness: soreness,
      subjectiveStress: stress,
      hydrationLitres: Number((2.8 + Math.random() * 0.8).toFixed(1)),
      weightKg: Number((69.2 + (Math.random() * 0.6 - 0.3)).toFixed(1)),
      readinessRecommendation: recommendation,
      syncedWearable: i === 0 ? 'Whoop 4.0' : i % 2 === 0 ? 'Garmin Connect' : 'Oura Ring Gen 3',
      steps,
      stepGoal,
      activeMinutes,
      walkingDistanceKm,
      caloriesBurned,
      floorsClimbed,
      hourlySteps: i === 0 ? generateTodayHourlySteps(steps) : undefined,
    });
  }

  return days;
}

export const INITIAL_PERFORMANCE_STATS: PerformanceStatsData = {
  ftpWatts: 310,
  wattsPerKg: 4.46, // 310W / 69.5kg
  lthrBpm: 172,
  maxHrBpm: 194,
  vo2MaxEstimate: 63.4,
  aerobicDecouplingPct: 2.8, // Low drift = excellent aerobic base (< 5% is elite)
  efficiencyFactor: 1.80, // 310W / 172 bpm
  wPrimeJoules: 21500, // 21.5 kJ anaerobic work capacity
  criticalPowerWatts: 304,
  powerPRs: [
    {
      durationLabel: '5 Seconds',
      seconds: 5,
      watts: 1045,
      wattsPerKg: 15.04,
      dateAchieved: '2026-08-14',
      activityTitle: 'Boulder Crit Final Sprint',
      isAllTimeBest: true,
    },
    {
      durationLabel: '15 Seconds',
      seconds: 15,
      watts: 890,
      wattsPerKg: 12.81,
      dateAchieved: '2026-08-14',
      activityTitle: 'Boulder Crit Final Sprint',
      isAllTimeBest: true,
    },
    {
      durationLabel: '1 Minute',
      seconds: 60,
      watts: 575,
      wattsPerKg: 8.27,
      dateAchieved: '2026-07-22',
      activityTitle: 'Flagstaff Mountain Kick',
      isAllTimeBest: true,
    },
    {
      durationLabel: '5 Minutes',
      seconds: 300,
      watts: 395,
      wattsPerKg: 5.68,
      dateAchieved: '2026-08-28',
      activityTitle: 'Sunshine Canyon VO2 Max Repeats',
      isAllTimeBest: true,
    },
    {
      durationLabel: '20 Minutes',
      seconds: 1200,
      watts: 326,
      wattsPerKg: 4.69,
      dateAchieved: '2026-09-01',
      activityTitle: 'FTP Benchmark Field Test',
      isAllTimeBest: true,
    },
    {
      durationLabel: '60 Minutes',
      seconds: 3600,
      watts: 295,
      wattsPerKg: 4.24,
      dateAchieved: '2026-08-19',
      activityTitle: 'Peak Peak Highway Time Trial',
      isAllTimeBest: false,
    },
  ],
  pacePRs: [
    {
      distanceLabel: '1 Kilometer',
      distanceKm: 1,
      paceSecondsPerKm: 188,
      formattedPace: '3:08 /km',
      totalTime: '3m 08s',
      dateAchieved: '2026-07-15',
      activityTitle: 'Track 1000m Strides',
      isAllTimeBest: true,
    },
    {
      distanceLabel: '5 Kilometers',
      distanceKm: 5,
      paceSecondsPerKm: 204,
      formattedPace: '3:24 /km',
      totalTime: '17m 00s',
      dateAchieved: '2026-08-05',
      activityTitle: 'Pearl Street 5K Road Race',
      isAllTimeBest: true,
    },
    {
      distanceLabel: '10 Kilometers',
      distanceKm: 10,
      paceSecondsPerKm: 216,
      formattedPace: '3:36 /km',
      totalTime: '36m 00s',
      dateAchieved: '2026-08-12',
      activityTitle: 'Bolder Boulder 10K Simulation',
      isAllTimeBest: true,
    },
    {
      distanceLabel: 'Half Marathon (21.1 km)',
      distanceKm: 21.1,
      paceSecondsPerKm: 232,
      formattedPace: '3:52 /km',
      totalTime: '1h 21m 35s',
      dateAchieved: '2026-06-20',
      activityTitle: 'Girona Half Marathon Tune-Up',
      isAllTimeBest: true,
    },
    {
      distanceLabel: 'Marathon (42.2 km)',
      distanceKm: 42.2,
      paceSecondsPerKm: 254,
      formattedPace: '4:14 /km',
      totalTime: '2h 58m 52s',
      dateAchieved: '2026-04-18',
      activityTitle: 'Boston Marathon Sub-3 Breakthrough',
      isAllTimeBest: true,
    },
  ],
  last30Days: {
    totalDistanceKm: 1240,
    totalElevationMeters: 14850,
    totalActiveHours: 48.5,
    totalTSS: 2450,
    totalKilojoules: 34200,
    avgIntensityFactor: 0.81,
    cyclingKm: 980,
    runningKm: 195,
    gravelKm: 65,
  },
  zoneDistribution: [
    { zone: 'Z1 Active Recovery', hours: 8.2, percentage: 17, color: '#64748b' },
    { zone: 'Z2 Aerobic Endurance', hours: 24.5, percentage: 51, color: '#3b82f6' },
    { zone: 'Z3 Tempo', hours: 7.8, percentage: 16, color: '#10b981' },
    { zone: 'Z4 Sweet Spot & Threshold', hours: 5.2, percentage: 11, color: '#f59e0b' },
    { zone: 'Z5 VO2 Max', hours: 1.9, percentage: 4, color: '#ef4444' },
    { zone: 'Z6 Anaerobic Capacity', hours: 0.9, percentage: 1, color: '#a855f7' },
  ],
};
