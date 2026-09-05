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
