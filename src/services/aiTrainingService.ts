import { AIBasePlanRequest, AIBaseTrainingPlan, BasePlanWeek, BasePlanWorkout, StructuredWorkout } from '../types';

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
