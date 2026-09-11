import { AIBasePlanRequest, AIBaseTrainingPlan, BasePlanWeek, BasePlanWorkout, StructuredWorkout, DailyTrainingMetric } from '../types';

export interface AIRecoveryInsightResponse {
  threeSentenceSummary: string;
  recoveryStatus: 'optimal_freshness' | 'productive_overload' | 'neutral_maintenance' | 'overreaching_alert' | 'transition';
  statusBadge: string;
  actionableRecommendation: string;
  nextSessionGuidance: string;
  targetTssToday: number;
  metricsAnalyzed: {
    ctl: number;
    atl: number;
    tsb: number;
    rampRate: number;
  };
  source: 'gemini_3.8_flash' | 'physiological_model';
  message?: string;
}

export async function requestAIRecoveryInsights(params: {
  ctl: number;
  atl: number;
  tsb: number;
  rampRate: number;
  recentTrends?: DailyTrainingMetric[];
  focus?: string;
}): Promise<AIRecoveryInsightResponse> {
  try {
    const res = await fetch('/api/ai/recovery-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error fetching AI recovery insights:', err);
    // Client-side fallback if network fails
    const ctl = Math.round(params.ctl);
    const atl = Math.round(params.atl);
    const tsb = Math.round(params.tsb);
    const rampRate = Number(params.rampRate.toFixed(1));

    let s1 = `With a Training Stress Balance of ${tsb} (CTL ${ctl} vs. ATL ${atl}), you are currently in a productive progressive overload state.`;
    let s2 = `Your recent 7-day ramp rate of ${rampRate > 0 ? '+' : ''}${rampRate} TSS/week reflects steady cardiovascular adaptation within safe physiological limits.`;
    let s3 = `Prioritize adequate sleep and hydration tonight, and proceed with your scheduled moderate-aerobic session before targeting your next threshold interval block.`;

    if (tsb < -30) {
      s1 = `With an acute Training Stress Balance of ${tsb} (CTL ${ctl} vs. ATL ${atl}), your fatigue level is significantly elevated into the acute overreaching risk corridor.`;
      s2 = `Your rapid accumulation of training stress with a ramp rate of ${rampRate > 0 ? '+' : ''}${rampRate} TSS/week is taxing your autonomic nervous system and glycogen reserves.`;
      s3 = `Prescribe a dedicated active recovery day or complete rest today to prevent overtraining and restore parasympathetic recovery tone.`;
    } else if (tsb > 5) {
      s1 = `With a positive Training Stress Balance of +${tsb} alongside an established Chronic Training Load of ${ctl}, your physiology is primed for peak performance and freshness.`;
      s2 = `Recent tapering has reduced your acute fatigue (ATL: ${atl}) while locking in your aerobic fitness foundation over the last two weeks.`;
      s3 = `Take advantage of this supercompensation window over the next 24 to 48 hours by keeping volume modest with brief high-cadence neuromuscular openers.`;
    }

    return {
      threeSentenceSummary: `${s1} ${s2} ${s3}`,
      recoveryStatus: tsb < -30 ? 'overreaching_alert' : tsb > 5 ? 'optimal_freshness' : 'productive_overload',
      statusBadge: tsb < -30 ? 'High Fatigue Risk' : tsb > 5 ? 'Peak Freshness' : 'Productive Overload',
      actionableRecommendation: s3,
      nextSessionGuidance: tsb < -30 ? 'Zone 1 Recovery Spin or Rest' : tsb > 5 ? 'Race Openers + Z2' : 'Zone 2 Base / Sweet Spot',
      targetTssToday: tsb < -30 ? 25 : tsb > 5 ? 45 : 70,
      metricsAnalyzed: { ctl, atl, tsb, rampRate },
      source: 'physiological_model',
    };
  }
}

export interface GenerateBasePlanResponse {
  plan: AIBaseTrainingPlan;
  source: 'gemini_3.8_flash' | 'deterministic_fallback';
  message: string;
}

export async function requestAIBasePlan(params: AIBasePlanRequest): Promise<GenerateBasePlanResponse> {
  try {
    const res = await fetch('/api/ai/generate-base-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('Network request failed for AI base plan, utilizing calibrated physiological engine fallback:', err);
    const plan = generateClientDeterministicBasePlan(params);
    return {
      plan,
      source: 'deterministic_fallback',
      message: 'Base training plan generated using client-side physiological endurance model.',
    };
  }
}

export function generateClientDeterministicBasePlan(req: AIBasePlanRequest): AIBaseTrainingPlan {
  const {
    sport = 'cycling',
    philosophy = 'sweet_spot',
    level = 'intermediate',
    totalWeeks = 6,
    targetWeeklyHours = 8,
    targetGoal = 'Aerobic base development & mitochondrial density expansion',
    athleteFtpWatts = 285,
    athleteLthrBpm = 172,
    athleteWeightKg = 72,
  } = req;

  const weeklyTSSProgression: number[] = [];
  const weeks: BasePlanWeek[] = [];
  const roundTo5 = (mins: number, minVal = 20) => Math.max(minVal, Math.round(mins / 5) * 5);

  for (let w = 1; w <= totalWeeks; w++) {
    const isRecoveryWeek = w % 4 === 0 || w === totalWeeks;
    const progressionFactor = isRecoveryWeek ? 0.65 : 1 + (w - 1) * 0.04;
    const weekHours = Number((targetWeeklyHours * progressionFactor).toFixed(1));
    const totalWeekMinutes = Math.round(weekHours * 60);

    const theme = isRecoveryWeek
      ? `Week ${w}: Recovery & Mitochondrial Adaptation`
      : w === 1
      ? `Week ${w}: Aerobic Foundation & Base Primer`
      : w === 2
      ? `Week ${w}: Aerobic Volume & Muscular Endurance`
      : w === 3
      ? `Week ${w}: Overload Micro-Cycle & Sweet Spot Build`
      : `Week ${w}: Progressive Aerobic Density & Glycogen Sparing`;

    const focus = isRecoveryWeek
      ? 'Active recovery spins, tissue remodeling, glycogen replenishment, and baseline adaptation.'
      : philosophy === 'sweet_spot'
      ? 'Targeted 88-94% FTP intervals, building fatigue resistance and lactate clearing capacity.'
      : philosophy === 'polarized'
      ? '80% low-intensity Z2 fat-oxidation base with 20% high-intensity Z5 VO2 max micro-bursts.'
      : 'Progressive aerobic volume, cardiovascular remodeling, and capillary network expansion.';

    const workouts: BasePlanWorkout[] = [];

    if (isRecoveryWeek) {
      const tueMin = roundTo5(totalWeekMinutes * 0.20, 20);
      const thuMin = roundTo5(totalWeekMinutes * 0.32, 25);
      const satMin = roundTo5(totalWeekMinutes * 0.30, 25);
      const sunMin = Math.max(20, totalWeekMinutes - (tueMin + thuMin + satMin));

      workouts.push({
        dayOfWeek: 'Monday',
        dayOffset: 0,
        title: 'Rest & Adaptation Day',
        sport,
        durationMinutes: 0,
        plannedTSS: 0,
        intensity: 'Rest',
        targetZone: 'Rest',
        description: 'Complete rest or light stretching/foam rolling. Cellular repair and adaptation phase.',
        intervalStructure: [],
      });
      workouts.push({
        dayOfWeek: 'Tuesday',
        dayOffset: 1,
        title: 'Aerobic Flush & Spin',
        sport,
        durationMinutes: tueMin,
        plannedTSS: Math.round((tueMin / 60) * 35),
        intensity: 'Recovery',
        targetZone: 'Z1 Active Recovery (<55% FTP)',
        description: 'High cadence spin (95-100 RPM) to promote active blood flow without autonomic fatigue.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(tueMin * 0.25), targetZone: 'Z1 Active Recovery', targetDescription: 'Progressive easy spin' },
          { phase: 'Spin Ups', durationMinutes: Math.round(tueMin * 0.55), targetZone: 'Z1 High Cadence', targetDescription: '95-105 RPM smooth pedal stroke' },
          { phase: 'Cooldown', durationMinutes: Math.round(tueMin * 0.20), targetZone: 'Z1 Flush', targetDescription: 'Gentle deceleration' },
        ],
      });
      workouts.push({
        dayOfWeek: 'Wednesday',
        dayOffset: 2,
        title: 'Mid-Week Rest & Mobility',
        sport,
        durationMinutes: 0,
        plannedTSS: 0,
        intensity: 'Rest',
        targetZone: 'Rest',
        description: 'Mobility work, core stability, and hydration focus.',
        intervalStructure: [],
      });
      workouts.push({
        dayOfWeek: 'Thursday',
        dayOffset: 3,
        title: 'Easy Aerobic Base Check',
        sport,
        durationMinutes: thuMin,
        plannedTSS: Math.round((thuMin / 60) * 45),
        intensity: 'Endurance',
        targetZone: 'Z2 Aerobic Base (60-70% FTP)',
        description: 'Smooth endurance effort maintaining steady aerobic breathing below LTHR.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(thuMin * 0.2), targetZone: 'Z1 Recovery', targetDescription: 'Gradual ramp' },
          { phase: 'Steady Base', durationMinutes: Math.round(thuMin * 0.65), targetZone: 'Z2 Aerobic Base', targetDescription: 'Steady fat burning rhythm' },
          { phase: 'Cooldown', durationMinutes: Math.round(thuMin * 0.15), targetZone: 'Z1 Recovery', targetDescription: 'Easy spin down' },
        ],
      });
      workouts.push({
        dayOfWeek: 'Friday',
        dayOffset: 4,
        title: 'Pre-Weekend Rest Day',
        sport,
        durationMinutes: 0,
        plannedTSS: 0,
        intensity: 'Rest',
        targetZone: 'Rest',
        description: 'Rest and mental reset.',
        intervalStructure: [],
      });
      workouts.push({
        dayOfWeek: 'Saturday',
        dayOffset: 5,
        title: 'Endurance Coffee Ride / Run',
        sport,
        durationMinutes: satMin,
        plannedTSS: Math.round((satMin / 60) * 50),
        intensity: 'Endurance',
        targetZone: 'Z2 Aerobic Base (65% FTP)',
        description: 'Relaxed aerobic volume with friends or solo, keeping heart rate well under zone 3.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(satMin * 0.18), targetZone: 'Z1-Z2', targetDescription: 'Easy warm pace' },
          { phase: 'Main Base', durationMinutes: Math.round(satMin * 0.67), targetZone: 'Z2 Aerobic', targetDescription: 'Conversational pace' },
          { phase: 'Cooldown', durationMinutes: Math.round(satMin * 0.15), targetZone: 'Z1 Flush', targetDescription: 'Easy spin' },
        ],
      });
      workouts.push({
        dayOfWeek: 'Sunday',
        dayOffset: 6,
        title: w === totalWeeks ? 'Final Benchmark Ramp Test' : 'Aerobic Maintenance Spin',
        sport,
        durationMinutes: sunMin,
        plannedTSS: Math.round((sunMin / 60) * (w === totalWeeks ? 70 : 45)),
        intensity: w === totalWeeks ? 'Threshold' : 'Endurance',
        targetZone: w === totalWeeks ? 'Max Effort Ramp Test' : 'Z2 Aerobic',
        description: w === totalWeeks ? 'FTP validation test to gauge aerobic fitness gains.' : 'Easy aerobic cruising.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(sunMin * 0.25), targetZone: 'Z1-Z2 Progressive', targetDescription: 'Progressive openers' },
          { phase: 'Main Effort', durationMinutes: Math.round(sunMin * 0.55), targetZone: w === totalWeeks ? 'Ramp Protocol' : 'Z2 Endurance', targetDescription: 'Assess metabolic ceiling' },
          { phase: 'Cooldown', durationMinutes: Math.round(sunMin * 0.20), targetZone: 'Z1 Flush', targetDescription: 'Full recovery' },
        ],
      });
    } else {
      const tueMin = roundTo5(totalWeekMinutes * 0.22, 25);
      const wedMin = roundTo5(totalWeekMinutes * 0.18, 20);
      const thuMin = roundTo5(totalWeekMinutes * 0.22, 25);
      const satMin = roundTo5(totalWeekMinutes * 0.26, 30);
      const sunMin = Math.max(20, totalWeekMinutes - (tueMin + wedMin + thuMin + satMin));

      const isSweetSpot = philosophy === 'sweet_spot';

      workouts.push({
        dayOfWeek: 'Monday',
        dayOffset: 0,
        title: 'Recovery & Adaptation Day',
        sport,
        durationMinutes: 0,
        plannedTSS: 0,
        intensity: 'Rest',
        targetZone: 'Rest',
        description: 'Rest day to ensure full supercompensation ahead of the mid-week quality sessions.',
        intervalStructure: [],
      });
      workouts.push({
        dayOfWeek: 'Tuesday',
        dayOffset: 1,
        title: isSweetSpot
          ? `Sweet Spot Intervals (${w + 2}x${8 + w}min)`
          : `VO2 Max Intervals (${w + 3}x3min)`,
        sport,
        durationMinutes: tueMin,
        plannedTSS: Math.round((tueMin / 60) * (isSweetSpot ? 72 : 82)),
        intensity: isSweetSpot ? 'Sweet Spot' : 'VO2 Max',
        targetZone: isSweetSpot
          ? `88-93% FTP (${Math.round(athleteFtpWatts * 0.9)}W) / ${Math.round(athleteLthrBpm * 0.94)} BPM`
          : `108-115% FTP (${Math.round(athleteFtpWatts * 1.1)}W) / ${athleteLthrBpm}+ BPM`,
        description: isSweetSpot
          ? 'Sustained muscular endurance intervals right at the sweet spot border to expand aerobic threshold without high autonomic stress.'
          : 'High-intensity intervals designed to drive cardiac stroke volume and plasma volume expansion.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(tueMin * 0.2), targetZone: 'Z1-Z2', targetDescription: 'Gradual ramp with openers' },
          { phase: 'Interval Blocks', durationMinutes: Math.round(tueMin * 0.65), targetZone: isSweetSpot ? 'Z4 Sweet Spot' : 'Z5 VO2 Max', targetDescription: 'Main work sets' },
          { phase: 'Cooldown', durationMinutes: Math.round(tueMin * 0.15), targetZone: 'Z1 Recovery', targetDescription: 'Low-cadence flush spin' },
        ],
      });
      workouts.push({
        dayOfWeek: 'Wednesday',
        dayOffset: 2,
        title: 'Aerobic Base Endurance Builder',
        sport,
        durationMinutes: wedMin,
        plannedTSS: Math.round((wedMin / 60) * 50),
        intensity: 'Endurance',
        targetZone: `65-72% FTP (${Math.round(athleteFtpWatts * 0.68)}W) / Z2 Aerobic`,
        description: 'Strict zone 2 endurance riding. Focus on fat oxidation and high pedaling efficiency (90+ RPM).',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(wedMin * 0.2), targetZone: 'Z1', targetDescription: 'Progressive warmup' },
          { phase: 'Aerobic Cruise', durationMinutes: Math.round(wedMin * 0.65), targetZone: 'Z2 Aerobic Base', targetDescription: 'Steady uninterrupted aerobic load' },
          { phase: 'Cooldown', durationMinutes: Math.round(wedMin * 0.15), targetZone: 'Z1', targetDescription: 'Light spin down' },
        ],
      });
      workouts.push({
        dayOfWeek: 'Thursday',
        dayOffset: 3,
        title: isSweetSpot
          ? `Over-Under Threshold Blocks (3x10min)`
          : `Tempo & Cadence Bursts (${w + 1}x12min)`,
        sport,
        durationMinutes: thuMin,
        plannedTSS: Math.round((thuMin / 60) * (isSweetSpot ? 75 : 66)),
        intensity: isSweetSpot ? 'Threshold' : 'Tempo',
        targetZone: isSweetSpot
          ? `95% / 105% FTP Alternating (${Math.round(athleteFtpWatts * 1.0)}W)`
          : `78-85% FTP (${Math.round(athleteFtpWatts * 0.82)}W)`,
        description: isSweetSpot
          ? 'Over-under threshold intervals teaching the muscles to process and buffer lactate at race pace.'
          : 'Tempo rhythm block reinforcing muscular resilience and aerobic capacity.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(thuMin * 0.2), targetZone: 'Z1-Z2', targetDescription: 'Progressive ramp' },
          { phase: 'Over-Under Sets', durationMinutes: Math.round(thuMin * 0.65), targetZone: 'Z4 Threshold', targetDescription: 'Alternating threshold intervals' },
          { phase: 'Cooldown', durationMinutes: Math.round(thuMin * 0.15), targetZone: 'Z1', targetDescription: 'Easy recovery spin' },
        ],
      });
      workouts.push({
        dayOfWeek: 'Friday',
        dayOffset: 4,
        title: 'Rest & Nutrition Fueling',
        sport,
        durationMinutes: 0,
        plannedTSS: 0,
        intensity: 'Rest',
        targetZone: 'Rest',
        description: 'Rest day ahead of the weekend volume block.',
        intervalStructure: [],
      });
      workouts.push({
        dayOfWeek: 'Saturday',
        dayOffset: 5,
        title: `Weekend Long Aerobic Expedition (${(satMin / 60).toFixed(1)}h)`,
        sport,
        durationMinutes: satMin,
        plannedTSS: Math.round((satMin / 60) * 58),
        intensity: 'Endurance',
        targetZone: `62-72% FTP (${Math.round(athleteFtpWatts * 0.67)}W) / Z2 Aerobic`,
        description: 'The cornerstone long session of the micro-cycle.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(satMin * 0.15), targetZone: 'Z1-Z2', targetDescription: 'Gentle start' },
          { phase: 'Long Base', durationMinutes: Math.round(satMin * 0.72), targetZone: 'Z2 Aerobic Base', targetDescription: 'Steady endurance pace' },
          { phase: 'Cooldown', durationMinutes: Math.round(satMin * 0.13), targetZone: 'Z1', targetDescription: 'Easy spin home' },
        ],
      });
      workouts.push({
        dayOfWeek: 'Sunday',
        dayOffset: 6,
        title: 'Aerobic Recovery & Cadence Flush',
        sport,
        durationMinutes: sunMin,
        plannedTSS: Math.round((sunMin / 60) * 46),
        intensity: 'Endurance',
        targetZone: 'Z2 Low (60-65% FTP)',
        description: 'Light aerobic endurance spin or jog on tired legs.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: Math.round(sunMin * 0.2), targetZone: 'Z1', targetDescription: 'Easy warm' },
          { phase: 'Steady Spin', durationMinutes: Math.round(sunMin * 0.65), targetZone: 'Z2 Aerobic', targetDescription: 'Smooth cadence' },
          { phase: 'Cooldown', durationMinutes: Math.round(sunMin * 0.15), targetZone: 'Z1 Flush', targetDescription: 'Relaxed spin' },
        ],
      });
    }

    const calculatedWeekMinutes = workouts.reduce((s, wk) => s + wk.durationMinutes, 0);
    const calculatedWeekHours = Number((calculatedWeekMinutes / 60).toFixed(1));
    const calculatedWeekTSS = workouts.reduce((s, wk) => s + wk.plannedTSS, 0);
    weeklyTSSProgression.push(calculatedWeekTSS);

    weeks.push({
      weekNumber: w,
      theme,
      focus,
      targetWeeklyHours: calculatedWeekHours,
      targetWeeklyTSS: calculatedWeekTSS,
      isRecoveryWeek,
      workouts,
    });
  }

  return {
    id: `base-plan-${Date.now()}`,
    title: `${totalWeeks}-Week ${philosophy.replace('_', ' ').toUpperCase()} Base Plan (${targetWeeklyHours}h/wk)`,
    sport,
    philosophy,
    level,
    totalWeeks,
    goalDescription: targetGoal,
    targetWeeklyHours,
    weeklyTSSProgression,
    physiologicalFocus: [
      'Mitochondrial biogenesis and slow-twitch muscle fiber capillary density expansion',
      'Enhanced lipid oxidation and glycogen sparing at sub-threshold outputs',
      'Fatigue resistance and systemic cardiovascular stroke volume enhancement',
    ],
    keyAdaptations: [
      `Progressive aerobic volume calibrated to exactly ${targetWeeklyHours} hours/week`,
      'Targeted threshold and sweet spot blocks to push functional aerobic ceiling',
      'Built-in 4th week deload for parasympathetic recovery and cellular adaptation',
    ],
    nutritionAdvice: 'Maintain 60-90g/hr carbohydrates on sessions >75 minutes. Consume 25-30g protein within 45 minutes post-workout.',
    benchmarkTestWeek: totalWeeks,
    weeks,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Converts an AI Base Training Plan into concrete StructuredWorkout items with dates
 * starting from the next upcoming Monday (or a specified start date).
 */
export function convertPlanToStructuredWorkouts(
  plan: AIBaseTrainingPlan,
  startDate?: Date
): StructuredWorkout[] {
  // Find next Monday
  const baseDate = startDate ? new Date(startDate) : new Date();
  if (!startDate) {
    const day = baseDate.getDay();
    const diff = (8 - (day === 0 ? 7 : day)) % 7;
    baseDate.setDate(baseDate.getDate() + (diff === 0 ? 7 : diff));
  }

  const workouts: StructuredWorkout[] = [];

  plan.weeks.forEach((week) => {
    const weekStart = new Date(baseDate);
    weekStart.setDate(weekStart.getDate() + (week.weekNumber - 1) * 7);

    week.workouts.forEach((wk) => {
      // Don't create empty rest day workout items if duration is 0, or create a rest reminder
      if (wk.durationMinutes === 0 && wk.intensity === 'Rest') {
        return;
      }

      const workoutDate = new Date(weekStart);
      workoutDate.setDate(workoutDate.getDate() + wk.dayOffset);
      const dateStr = workoutDate.toISOString().split('T')[0];

      workouts.push({
        id: `ai-wk-${plan.id}-w${week.weekNumber}-d${wk.dayOffset}-${Date.now() % 10000}`,
        date: dateStr,
        title: `[W${week.weekNumber}] ${wk.title}`,
        sport: wk.sport,
        plannedDurationMinutes: wk.durationMinutes,
        plannedTSS: wk.plannedTSS,
        description: `${wk.description}\nTarget: ${wk.targetZone} (${wk.intensity})`,
        structure: wk.intervalStructure || [
          { phase: 'Warmup', durationMinutes: Math.round(wk.durationMinutes * 0.2), targetZone: 'Z1-Z2', targetDescription: 'Progressive warmup' },
          { phase: 'Main Work', durationMinutes: Math.round(wk.durationMinutes * 0.65), targetZone: wk.targetZone, targetDescription: wk.description },
          { phase: 'Cooldown', durationMinutes: Math.round(wk.durationMinutes * 0.15), targetZone: 'Z1 Flush', targetDescription: 'Easy cool down' },
        ],
        isCompleted: false,
      });
    });
  });

  return workouts;
}

/**
 * Generates an iCalendar (.ics) string for export to Apple Calendar, Google Calendar, or Garmin Connect.
 */
export function generatePlanICS(plan: AIBaseTrainingPlan): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Veltrix Athletic Performance//AI Base Training Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Veltrix ${plan.title}`,
  ];

  const workouts = convertPlanToStructuredWorkouts(plan);

  workouts.forEach((wk) => {
    const cleanDate = wk.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${wk.id}@veltrix.internal`);
    lines.push(`DTSTAMP:${cleanDate}T000000Z`);
    lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
    lines.push(`SUMMARY:${wk.title} (${wk.plannedTSS} TSS)`);
    lines.push(`DESCRIPTION:${wk.description.replace(/\n/g, '\\n')}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generic iCalendar generator for structured workout lists
 */
export function generateCalendarICS(
  workouts: { date: string; title: string; sport: string; durationMinutes: number; plannedTSS: number; description: string }[],
  planTitle: string
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Veltrix Athletic Performance//Training Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Veltrix - ${planTitle}`,
  ];

  workouts.forEach((wk, index) => {
    const cleanDate = wk.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:veltrix-${cleanDate}-${index}@veltrix.internal`);
    lines.push(`DTSTAMP:${cleanDate}T060000Z`);
    lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
    lines.push(`SUMMARY:${wk.title} [${wk.plannedTSS} TSS / ${wk.durationMinutes}m]`);
    lines.push(`DESCRIPTION:Sport: ${wk.sport}\\n${wk.description.replace(/\n/g, '\\n')}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Browser helper to trigger a download of an .ics file
 */
export function downloadICSFile(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
