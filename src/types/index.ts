export type SportType = 'cycling' | 'running' | 'trail_running' | 'gravel' | 'rowing' | 'swimming';

export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number; // meters
  speed?: number; // m/s
  heartRate?: number; // bpm
  cadence?: number; // rpm
  power?: number; // watts
  timestamp: number; // unix ms
}

export interface LapSplit {
  lapNumber: number;
  distanceKm: number;
  durationSeconds: number;
  avgPaceSecondsPerKm: number;
  avgSpeedKmh: number;
  elevationGainMeters: number;
  avgHeartRate?: number;
  avgPower?: number;
}

export interface Activity {
  id: string;
  title: string;
  sport: SportType;
  date: string; // ISO date string
  distanceKm: number;
  durationSeconds: number;
  movingTimeSeconds: number;
  elevationGainMeters: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  avgPaceSecondsPerKm: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  avgPower?: number; // watts
  normalizedPower?: number; // NP
  tss: number; // Training Stress Score
  intensityFactor?: number; // IF
  calories: number;
  perceivedExertion: number; // 1-10
  description?: string;
  gearId?: string;
  gearName?: string;
  gpsTrack: GPSPoint[];
  laps: LapSplit[];
  kudosCount: number;
  userHasKudoed?: boolean;
  commentsCount: number;
  athleteName: string;
  athleteAvatar: string;
  athleteLocation?: string;
  trainingEffectAerobic?: number; // 0.0 - 5.0
  trainingEffectAnaerobic?: number; // 0.0 - 5.0
  prBadges?: string[];
  weather?: {
    tempC: number;
    condition: string;
    windKmh: number;
    humidityPct: number;
  };
}

export interface SocialChallenge {
  id: string;
  title: string;
  description: string;
  sport: SportType | 'all';
  targetValue: number;
  unit: 'km' | 'meters' | 'activities' | 'days';
  currentValue: number;
  startDate: string;
  endDate: string;
  participantsCount: number;
  isJoined: boolean;
  badgeIcon: string;
  badgeColor: string;
  category: 'endurance' | 'climbing' | 'consistency' | 'speed';
}

export interface Segment {
  id: string;
  name: string;
  distanceKm: number;
  avgGradePct: number;
  elevationGainMeters: number;
  climbCategory: 'Cat 4' | 'Cat 3' | 'Cat 2' | 'Cat 1' | 'HC' | 'Sprint';
  komAthlete: string;
  komTime: string;
  komWatts?: number;
  personalRecordTime?: string;
  personalRank?: number;
  totalAttempts: number;
  sport: SportType;
  polylineCoords: [number, number][];
}

export type LeaderboardMetricType = 'tss' | 'elevation';
export type LeaderboardTimeframe = 'month' | 'all_time';

export interface LeaderboardAthlete {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  location: string;
  country: string;
  flagEmoji: string;
  team?: string;
  isCurrentUser?: boolean;
  isPro?: boolean;
  primarySport: SportType;
  monthlyTSS: number;
  monthlyElevationMeters: number;
  monthlyDistanceKm: number;
  monthlyActiveHours: number;
  monthlyActivitiesCount: number;
  streakDays: number;
  rankChange?: number; // e.g. +2, -1, 0
  ftpWatts?: number;
  kudosCount: number;
  hasUserKudoed?: boolean;
  recentHighlight?: string;
}

export interface DailyTrainingMetric {
  date: string; // YYYY-MM-DD
  tss: number;
  ctl: number; // Chronic Training Load (Fitness)
  atl: number; // Acute Training Load (Fatigue)
  tsb: number; // Training Stress Balance (Form = CTL - ATL)
  workoutTitle?: string;
  workoutSport?: SportType;
  workoutDistanceKm?: number;
}

export interface StructuredWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  sport: SportType;
  plannedDurationMinutes: number;
  plannedTSS: number;
  description: string;
  structure: {
    phase: string;
    durationMinutes: number;
    targetZone: string;
    targetDescription: string;
  }[];
  isCompleted: boolean;
  completedActivityId?: string;
}

export interface GearItem {
  id: string;
  name: string;
  type: 'bike' | 'shoes' | 'watch' | 'power_meter';
  brandModel: string;
  distanceKm: number;
  maxDistanceKm: number; // alert threshold
  isRetired: boolean;
}

export interface AthleteProfile {
  name: string;
  handle: string;
  avatar: string;
  location: string;
  bio: string;
  email?: string;
  weightKg: number;
  heightCm: number;
  ftpWatts: number; // Functional Threshold Power
  thresholdPaceSecondsPerKm: number; // e.g. 235 (3:55/km)
  maxHeartRate: number;
  restingHeartRate: number;
  lthr: number; // Lactate Threshold Heart Rate
  vo2Max: number;
  weeklyGoalKm: number;
  totalActivitiesCount: number;
  totalDistanceKm: number;
  totalElevationGainMeters: number;
  isPro?: boolean;
  proTier?: string;
  proRenewalDate?: string;
  paymentReceipts?: PaymentTransactionReceipt[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  handle: string;
  isPro: boolean;
  proTier?: string;
  primarySport?: SportType;
  ftpWatts: number;
  weightKg: number;
  location: string;
  token?: string;
  memberSince: string;
}

export type BasePlanPhilosophy = 'sweet_spot' | 'polarized' | 'pyramidal' | 'traditional_aerobic';
export type BasePlanLevel = 'beginner' | 'intermediate' | 'advanced';

export interface BasePlanWorkout {
  dayOfWeek: string; // Monday, Tuesday, etc.
  dayOffset: number; // 0 for Mon ... 6 for Sun
  title: string;
  sport: SportType;
  durationMinutes: number;
  plannedTSS: number;
  intensity: 'Rest' | 'Recovery' | 'Endurance' | 'Tempo' | 'Sweet Spot' | 'Threshold' | 'VO2 Max';
  targetZone: string;
  description: string;
  intervalStructure: {
    phase: string;
    durationMinutes: number;
    targetZone: string;
    targetDescription: string;
  }[];
}

export interface BasePlanWeek {
  weekNumber: number;
  theme: string;
  focus: string;
  targetWeeklyHours: number;
  targetWeeklyTSS: number;
  isRecoveryWeek: boolean;
  workouts: BasePlanWorkout[];
}

export interface AIBaseTrainingPlan {
  id: string;
  title: string;
  sport: SportType;
  philosophy: BasePlanPhilosophy;
  level: BasePlanLevel;
  totalWeeks: number;
  goalDescription: string;
  targetWeeklyHours: number;
  weeklyTSSProgression: number[];
  physiologicalFocus: string[];
  keyAdaptations: string[];
  nutritionAdvice: string;
  benchmarkTestWeek: number;
  weeks: BasePlanWeek[];
  createdAt: string;
}

export interface AIBasePlanRequest {
  sport: SportType;
  philosophy: BasePlanPhilosophy;
  level: BasePlanLevel;
  totalWeeks: number;
  targetWeeklyHours: number;
  targetGoal: string;
  athleteFtpWatts: number;
  athleteLthrBpm: number;
  athleteWeightKg: number;
  currentCTL?: number;
  notes?: string;
}

export interface PlanCoach {
  name: string;
  title: string;
  credentials: string;
  avatar: string;
  bio: string;
}

export interface PlanReview {
  id: string;
  author: string;
  rating: number; // 1 to 5
  date: string;
  comment: string;
  verifiedAthlete: boolean;
  avatar?: string;
}

export interface PlanWeekOutline {
  weekNumber: number;
  title: string;
  focus: string;
  weeklyHours: number;
  weeklyTSS: number;
  keyWorkout: string;
  isRecoveryWeek?: boolean;
}

export interface PlanSampleWorkout {
  title: string;
  dayOfWeek: string;
  durationMinutes: number;
  targetZone: string;
  plannedTSS: number;
  intervals: {
    phase: string;
    durationMinutes: number;
    targetZone: string;
    targetDescription: string;
  }[];
}

export interface PurchasablePlan {
  id: string;
  title: string;
  subtitle: string;
  sport: SportType;
  level: BasePlanLevel | 'elite';
  philosophy: string;
  durationWeeks: number;
  avgWeeklyHours: number;
  avgWeeklyTSS: number;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  badge?: string; // "Bestseller", "World Tour Proven", "New", "Staff Pick"
  coach: PlanCoach;
  highlights: string[];
  description: string;
  prerequisites: string;
  weeklyStructure: PlanWeekOutline[];
  sampleWorkout: PlanSampleWorkout;
  reviews: PlanReview[];
  workoutsTemplate: {
    dayOffset: number; // 0 for Mon ... 6 for Sun
    weekOffset: number; // 0 for Week 1, etc.
    title: string;
    sport: SportType;
    durationMinutes: number;
    plannedTSS: number;
    targetZone: string;
    description: string;
  }[];
}

export interface PurchasedPlanOrder {
  id: string;
  planId: string;
  planTitle: string;
  sport: SportType;
  pricePaid: number;
  tier: 'digital' | 'consultation' | 'vip';
  purchaseDate: string;
  startDate: string;
  status: 'active' | 'completed' | 'paused';
  currentWeek: number;
  durationWeeks: number;
  coachName: string;
  avgWeeklyTSS: number;
}

// Health & Biometrics Telemetry
export interface HealthBiometricDay {
  date: string; // YYYY-MM-DD
  recoveryScore: number; // 0 - 100
  hrvRmssd: number; // ms
  hrvBaseline: number; // ms
  restingHr: number; // bpm
  sleepHours: number;
  sleepQualityScore: number; // 0 - 100
  deepSleepPct: number; // %
  remSleepPct: number; // %
  spo2Pct: number; // %
  respiratoryRate: number; // breaths / min
  skinTempDeviationCelsius: number; // e.g. -0.2
  subjectiveSoreness: number; // 1 (fresh) - 5 (severely sore)
  subjectiveStress: 'low' | 'moderate' | 'high';
  hydrationLitres: number;
  weightKg: number;
  readinessRecommendation: string;
  syncedWearable?: 'Garmin Connect' | 'Apple Health' | 'Whoop 4.0' | 'Oura Ring Gen 3' | 'Manual Log';
}

export interface WearableDeviceStatus {
  id: string;
  name: string;
  brand: 'garmin' | 'apple' | 'whoop' | 'oura' | 'wahoo';
  icon: string;
  batteryPct: number;
  lastSyncTime: string;
  isConnected: boolean;
  statusMessage: string;
}

// Performance Stats & Records
export interface PowerDurationPR {
  durationLabel: string;
  seconds: number;
  watts: number;
  wattsPerKg: number;
  dateAchieved: string;
  activityTitle: string;
  isAllTimeBest: boolean;
}

export interface PaceDurationPR {
  distanceLabel: string;
  distanceKm: number;
  paceSecondsPerKm: number;
  formattedPace: string;
  totalTime: string;
  dateAchieved: string;
  activityTitle: string;
  isAllTimeBest: boolean;
}

export interface PerformanceStatsData {
  ftpWatts: number;
  wattsPerKg: number;
  lthrBpm: number;
  maxHrBpm: number;
  vo2MaxEstimate: number;
  aerobicDecouplingPct: number; // Pw:HR drift %
  efficiencyFactor: number; // NP / Avg HR
  wPrimeJoules: number; // Anaerobic Work Capacity
  criticalPowerWatts: number;
  powerPRs: PowerDurationPR[];
  pacePRs: PaceDurationPR[];
  last30Days: {
    totalDistanceKm: number;
    totalElevationMeters: number;
    totalActiveHours: number;
    totalTSS: number;
    totalKilojoules: number;
    avgIntensityFactor: number;
    cyclingKm: number;
    runningKm: number;
    gravelKm: number;
  };
  zoneDistribution: {
    zone: string;
    hours: number;
    percentage: number;
    color: string;
  }[];
}

// Payment Gateway Types
export type PaymentMethodType = 'card' | 'apple_pay' | 'google_pay' | 'paypal' | 'klarna' | 'crypto';
export type PaymentCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export interface PaymentTransactionReceipt {
  transactionId: string;
  orderId: string;
  date: string;
  amount: number;
  currency: PaymentCurrency;
  method: PaymentMethodType;
  cardBrand?: string;
  cardLast4?: string;
  status: 'succeeded' | 'processing' | 'failed';
  authorizationCode: string;
  receiptNumber: string;
  customerName: string;
  customerEmail: string;
  itemDescription: string;
}
