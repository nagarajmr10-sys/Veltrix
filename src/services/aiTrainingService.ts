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
    console.error('Error generating AI base plan:', err);
    throw err;
  }
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
