import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { AIBasePlanRequest, AIBaseTrainingPlan, BasePlanWeek, BasePlanWorkout } from './src/types';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '2mb' }));

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Fallback high-fidelity base training plan generator
function generateDeterministicBasePlan(req: AIBasePlanRequest): AIBaseTrainingPlan {
  const {
    sport = 'cycling',
    philosophy = 'sweet_spot',
    level = 'intermediate',
    totalWeeks = 6,
    targetWeeklyHours = 7,
    targetGoal = 'Build aerobic engine and lactate threshold',
    athleteFtpWatts = 285,
    athleteLthrBpm = 172,
    athleteWeightKg = 72,
  } = req;

  const wPerKg = (athleteFtpWatts / athleteWeightKg).toFixed(2);
  const baseTssPerHour = philosophy === 'sweet_spot' ? 62 : philosophy === 'polarized' ? 52 : 56;
  const initialWeeklyTSS = Math.round(targetWeeklyHours * baseTssPerHour);

  const weeklyTSSProgression: number[] = [];
  const weeks: BasePlanWeek[] = [];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let w = 1; w <= totalWeeks; w++) {
    const isRecoveryWeek = w % 4 === 0 || w === totalWeeks;
    const factor = isRecoveryWeek ? 0.65 : 1 + (w - 1) * 0.06;
    const weekTSS = Math.round(initialWeeklyTSS * factor);
    const weekHours = Number((targetWeeklyHours * (isRecoveryWeek ? 0.7 : 1 + (w - 1) * 0.04)).toFixed(1));
    weeklyTSSProgression.push(weekTSS);

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

    // Schedule 7 days
    if (isRecoveryWeek) {
      // Monday: Rest
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
      // Tuesday: Easy Spin
      workouts.push({
        dayOfWeek: 'Tuesday',
        dayOffset: 1,
        title: 'Aerobic Flush & Spin',
        sport,
        durationMinutes: 45,
        plannedTSS: 25,
        intensity: 'Recovery',
        targetZone: 'Z1 Active Recovery (<55% FTP)',
        description: 'High cadence spin (95-100 RPM) to promote active blood flow without autonomic fatigue.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 10, targetZone: 'Z1 Active Recovery', targetDescription: 'Progressive easy spin' },
          { phase: 'Spin Ups', durationMinutes: 25, targetZone: 'Z1 High Cadence', targetDescription: '95-105 RPM smooth pedal stroke' },
          { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1 Flush', targetDescription: 'Gentle deceleration' },
        ],
      });
      // Wednesday: Rest
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
      // Thursday: Z2 Foundation
      workouts.push({
        dayOfWeek: 'Thursday',
        dayOffset: 3,
        title: 'Easy Aerobic Base Check',
        sport,
        durationMinutes: 60,
        plannedTSS: 40,
        intensity: 'Endurance',
        targetZone: 'Z2 Aerobic Base (60-70% FTP)',
        description: 'Smooth endurance effort maintaining steady aerobic breathing below LTHR.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 10, targetZone: 'Z1 Recovery', targetDescription: 'Gradual ramp' },
          { phase: 'Steady Base', durationMinutes: 40, targetZone: 'Z2 Aerobic Base', targetDescription: 'Steady fat burning rhythm' },
          { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1 Recovery', targetDescription: 'Easy spin down' },
        ],
      });
      // Friday: Rest
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
      // Saturday: Mid-length Endurance
      workouts.push({
        dayOfWeek: 'Saturday',
        dayOffset: 5,
        title: 'Endurance Coffee Ride / Run',
        sport,
        durationMinutes: 90,
        plannedTSS: 65,
        intensity: 'Endurance',
        targetZone: 'Z2 Aerobic Base (65% FTP)',
        description: 'Relaxed aerobic volume with friends or solo, keeping heart rate well under zone 3.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 15, targetZone: 'Z1-Z2', targetDescription: 'Easy warm pace' },
          { phase: 'Main Base', durationMinutes: 65, targetZone: 'Z2 Aerobic', targetDescription: 'Conversational pace' },
          { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1 Flush', targetDescription: 'Easy spin' },
        ],
      });
      // Sunday: Ramp Test or Easy Foundation
      workouts.push({
        dayOfWeek: 'Sunday',
        dayOffset: 6,
        title: w === totalWeeks ? 'Final Benchmark Ramp Test' : 'Aerobic Maintenance Spin',
        sport,
        durationMinutes: 60,
        plannedTSS: 50,
        intensity: w === totalWeeks ? 'Threshold' : 'Endurance',
        targetZone: w === totalWeeks ? 'Max Effort Ramp Test' : 'Z2 Aerobic',
        description: w === totalWeeks ? 'FTP validation test to gauge aerobic fitness gains.' : 'Easy aerobic cruising.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 15, targetZone: 'Z1-Z2 Progressive', targetDescription: 'Progressive openers' },
          { phase: 'Main Effort', durationMinutes: 35, targetZone: w === totalWeeks ? 'Ramp Protocol' : 'Z2 Endurance', targetDescription: 'Assess metabolic ceiling' },
          { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1 Flush', targetDescription: 'Full recovery' },
        ],
      });
    } else {
      // Normal Training Week
      // Monday: Rest
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
      // Tuesday: Quality Session 1
      const isSweetSpot = philosophy === 'sweet_spot';
      workouts.push({
        dayOfWeek: 'Tuesday',
        dayOffset: 1,
        title: isSweetSpot
          ? `Sweet Spot Intervals (${w + 2}x${8 + w}min)`
          : `VO2 Max Intervals (${w + 3}x3min)`,
        sport,
        durationMinutes: 75 + w * 5,
        plannedTSS: Math.round(65 + w * 6),
        intensity: isSweetSpot ? 'Sweet Spot' : 'VO2 Max',
        targetZone: isSweetSpot
          ? `88-93% FTP (${Math.round(athleteFtpWatts * 0.9)}W) / ${Math.round(athleteLthrBpm * 0.94)} BPM`
          : `108-115% FTP (${Math.round(athleteFtpWatts * 1.1)}W) / ${athleteLthrBpm}+ BPM`,
        description: isSweetSpot
          ? 'Sustained muscular endurance intervals right at the sweet spot border to expand aerobic threshold without high autonomic stress.'
          : 'High-intensity intervals designed to drive cardiac stroke volume and plasma volume expansion.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 15, targetZone: 'Z1-Z2', targetDescription: 'Gradual ramp with 3x30s high-cadence openers' },
          { phase: 'Interval Blocks', durationMinutes: 45 + w * 5, targetZone: isSweetSpot ? 'Z4 Sweet Spot' : 'Z5 VO2 Max', targetDescription: 'Main work sets with 3-5min recovery valleys' },
          { phase: 'Cooldown', durationMinutes: 15, targetZone: 'Z1 Recovery', targetDescription: 'Low-cadence flush spin' },
        ],
      });
      // Wednesday: Z2 Base
      workouts.push({
        dayOfWeek: 'Wednesday',
        dayOffset: 2,
        title: 'Aerobic Base Endurance Builder',
        sport,
        durationMinutes: 60 + w * 5,
        plannedTSS: Math.round(45 + w * 4),
        intensity: 'Endurance',
        targetZone: `65-72% FTP (${Math.round(athleteFtpWatts * 0.68)}W) / Z2 Aerobic`,
        description: 'Strict zone 2 endurance riding. Focus on fat oxidation and high pedaling efficiency (90+ RPM).',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 10, targetZone: 'Z1', targetDescription: 'Progressive warmup' },
          { phase: 'Aerobic Cruise', durationMinutes: 40 + w * 5, targetZone: 'Z2 Aerobic Base', targetDescription: 'Steady uninterrupted aerobic load' },
          { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1', targetDescription: 'Light spin down' },
        ],
      });
      // Thursday: Quality Session 2
      workouts.push({
        dayOfWeek: 'Thursday',
        dayOffset: 3,
        title: isSweetSpot
          ? `Over-Under Threshold Blocks (3x10min)`
          : `Tempo & Cadence Bursts (${w + 1}x12min)`,
        sport,
        durationMinutes: 75 + w * 5,
        plannedTSS: Math.round(70 + w * 5),
        intensity: isSweetSpot ? 'Threshold' : 'Tempo',
        targetZone: isSweetSpot
          ? `95% / 105% FTP Alternating (${Math.round(athleteFtpWatts * 1.0)}W)`
          : `78-85% FTP (${Math.round(athleteFtpWatts * 0.82)}W)`,
        description: isSweetSpot
          ? 'Over-under threshold intervals teaching the muscles to process and buffer lactate at race pace.'
          : 'Tempo rhythm block reinforcing muscular resilience and aerobic capacity.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 15, targetZone: 'Z1-Z2', targetDescription: 'Progressive ramp' },
          { phase: 'Over-Under Sets', durationMinutes: 45 + w * 5, targetZone: 'Z4 Threshold', targetDescription: '2min at 95% FTP, 1min at 105% FTP repeating' },
          { phase: 'Cooldown', durationMinutes: 15, targetZone: 'Z1', targetDescription: 'Easy recovery spin' },
        ],
      });
      // Friday: Rest or Active Flush
      workouts.push({
        dayOfWeek: 'Friday',
        dayOffset: 4,
        title: 'Rest & Nutrition Fueling',
        sport,
        durationMinutes: 0,
        plannedTSS: 0,
        intensity: 'Rest',
        targetZone: 'Rest',
        description: 'Rest day ahead of the weekend volume block. Hydrate with electrolytes and carbohydrate-rich whole foods.',
        intervalStructure: [],
      });
      // Saturday: Weekend Long Base
      workouts.push({
        dayOfWeek: 'Saturday',
        dayOffset: 5,
        title: `Weekend Long Aerobic Expedition (${Math.round(2 + w * 0.25)}h)`,
        sport,
        durationMinutes: 120 + w * 15,
        plannedTSS: Math.round(110 + w * 12),
        intensity: 'Endurance',
        targetZone: `62-72% FTP (${Math.round(athleteFtpWatts * 0.67)}W) / Z2 Aerobic`,
        description: 'The cornerstone long ride/run of the micro-cycle. Builds mitochondrial enzyme activity and capillary density in slow-twitch muscle fibers.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 20, targetZone: 'Z1-Z2', targetDescription: 'Gentle start' },
          { phase: 'Long Base', durationMinutes: 90 + w * 15, targetZone: 'Z2 Aerobic Base', targetDescription: 'Steady endurance pace, 60g carbs/hr' },
          { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1', targetDescription: 'Easy spin home' },
        ],
      });
      // Sunday: Aerobic Maintenance + Cadence
      workouts.push({
        dayOfWeek: 'Sunday',
        dayOffset: 6,
        title: 'Aerobic Recovery & Cadence Flush',
        sport,
        durationMinutes: 60 + w * 5,
        plannedTSS: Math.round(45 + w * 4),
        intensity: 'Endurance',
        targetZone: 'Z2 Low (60-65% FTP)',
        description: 'Light aerobic endurance spin or jog on tired legs to simulate late-event fatigue and stimulate glycogen sparing adaptations.',
        intervalStructure: [
          { phase: 'Warmup', durationMinutes: 10, targetZone: 'Z1', targetDescription: 'Easy warm' },
          { phase: 'Steady Spin', durationMinutes: 40 + w * 5, targetZone: 'Z2 Aerobic', targetDescription: 'Smooth high-rpm pedal stroke' },
          { phase: 'Cooldown', durationMinutes: 10, targetZone: 'Z1 Flush', targetDescription: 'Relaxed spin' },
        ],
      });
    }

    weeks.push({
      weekNumber: w,
      theme,
      focus,
      targetWeeklyHours: weekHours,
      targetWeeklyTSS: weekTSS,
      isRecoveryWeek,
      workouts,
    });
  }

  const philosophyTitles: Record<string, string> = {
    sweet_spot: 'Sweet Spot Base Periodization (High Efficiency)',
    polarized: 'Seiler 80/20 Polarized Base Blueprint',
    pyramidal: 'Pyramidal Aerobic Threshold Architecture',
    traditional_aerobic: 'Traditional High-Volume Aerobic Foundation',
  };

  return {
    id: `base-plan-${Date.now()}`,
    title: `${athleteWeightKg}kg / ${athleteFtpWatts}W (${wPerKg} W/kg) ${philosophyTitles[philosophy] || 'AI Base Training Plan'}`,
    sport,
    philosophy,
    level,
    totalWeeks,
    goalDescription: targetGoal,
    targetWeeklyHours,
    weeklyTSSProgression,
    physiologicalFocus: [
      'Mitochondrial biogenesis: Expands the number and size of ATP-generating mitochondria in type I slow-twitch fibers.',
      'Capillary angiogenesis: Increases microvascular density around working muscle beds for faster oxygen and lactate exchange.',
      'Fat oxidation shift: Spares intramuscular glycogen by elevating fat oxidation rates at 65-75% VO2 max.',
      'Cardiac stroke volume: Increases left ventricular chamber compliance and stroke volume for lowered submaximal heart rate.',
    ],
    keyAdaptations: [
      `Elevate Functional Threshold Power from current ${athleteFtpWatts}W towards target endurance ceiling.`,
      `Shift Lactate Balance Point from ${athleteLthrBpm} bpm downward for identical wattage outputs.`,
      'Improve fatigue resistance past the 3-hour mark without cardiac drift.',
      'Optimized nutritional intake strategy (60-90g/hr carbohydrates during key workouts).',
    ],
    nutritionAdvice:
      'Consume 60–90g of maltodextrin/fructose carbohydrates per hour during quality sessions exceeding 75 minutes. Maintain 500–750ml fluid per hour with 500–800mg sodium. Prioritize 25–35g leucine-rich protein within 45 minutes post-workout.',
    benchmarkTestWeek: totalWeeks,
    weeks,
    createdAt: new Date().toISOString(),
  };
}

// AI Endpoint: Generate Base Training Plan
app.post('/api/ai/generate-base-plan', async (req, res) => {
  try {
    const planRequest = req.body as AIBasePlanRequest;

    const gemini = getGeminiClient();
    if (!gemini) {
      // Fallback deterministic plan when no GEMINI_API_KEY is configured
      const fallbackPlan = generateDeterministicBasePlan(planRequest);
      return res.json({
        plan: fallbackPlan,
        source: 'deterministic_fallback',
        message: 'Generated base training plan using calibrated physiological engine.',
      });
    }

    // Call Gemini 3.8 Flash with structured JSON schema
    const prompt = `
You are an Olympic and World Tour exercise physiologist and master endurance coach.
Create an elite, science-backed ${planRequest.totalWeeks || 6}-week BASE TRAINING PLAN for an athlete with the following profile:
- Sport: ${planRequest.sport}
- Philosophy: ${planRequest.philosophy} (Sweet Spot, Polarized 80/20, Pyramidal, or Traditional Aerobic)
- Level: ${planRequest.level}
- Target Weekly Hours: ${planRequest.targetWeeklyHours} hours/week
- Target Goal: ${planRequest.targetGoal}
- Current FTP: ${planRequest.athleteFtpWatts} Watts
- Current LTHR: ${planRequest.athleteLthrBpm} BPM
- Athlete Weight: ${planRequest.athleteWeightKg} kg (${(planRequest.athleteFtpWatts / planRequest.athleteWeightKg).toFixed(2)} W/kg)
- Current Fitness (CTL): ${planRequest.currentCTL || 58}
- Special Notes: ${planRequest.notes || 'None'}

Include exact microcycle structure for ALL ${planRequest.totalWeeks || 6} weeks:
- Include 7 daily workouts for each week (Monday through Sunday).
- Explicitly mark rest days with 0 duration and 0 TSS.
- Calculate realistic planned TSS for every workout.
- Detail the interval structure (warmup, main sets with targets in % FTP / Watts / BPM, and cooldown).
- Design a recovery/adaptation week every 3rd or 4th week (approx 60-65% volume and TSS).
- Provide physiological rationale, key adaptations, and sports nutrition guidelines.
`;

    const response = await gemini.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a world-class endurance exercise physiologist and coach. You produce structured, scientifically rigorous endurance training plans with exact wattage, heart rate zones, TSS calculations, and periodization.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            sport: { type: Type.STRING },
            philosophy: { type: Type.STRING },
            level: { type: Type.STRING },
            totalWeeks: { type: Type.INTEGER },
            goalDescription: { type: Type.STRING },
            targetWeeklyHours: { type: Type.NUMBER },
            weeklyTSSProgression: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
            },
            physiologicalFocus: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            keyAdaptations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            nutritionAdvice: { type: Type.STRING },
            benchmarkTestWeek: { type: Type.INTEGER },
            weeks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  weekNumber: { type: Type.INTEGER },
                  theme: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  targetWeeklyHours: { type: Type.NUMBER },
                  targetWeeklyTSS: { type: Type.NUMBER },
                  isRecoveryWeek: { type: Type.BOOLEAN },
                  workouts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        dayOfWeek: { type: Type.STRING },
                        dayOffset: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        sport: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        plannedTSS: { type: Type.NUMBER },
                        intensity: { type: Type.STRING },
                        targetZone: { type: Type.STRING },
                        description: { type: Type.STRING },
                        intervalStructure: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              phase: { type: Type.STRING },
                              durationMinutes: { type: Type.INTEGER },
                              targetZone: { type: Type.STRING },
                              targetDescription: { type: Type.STRING },
                            },
                            required: ['phase', 'durationMinutes', 'targetZone', 'targetDescription'],
                          },
                        },
                      },
                      required: [
                        'dayOfWeek',
                        'dayOffset',
                        'title',
                        'sport',
                        'durationMinutes',
                        'plannedTSS',
                        'intensity',
                        'targetZone',
                        'description',
                      ],
                    },
                  },
                },
                required: [
                  'weekNumber',
                  'theme',
                  'focus',
                  'targetWeeklyHours',
                  'targetWeeklyTSS',
                  'isRecoveryWeek',
                  'workouts',
                ],
              },
            },
          },
          required: [
            'id',
            'title',
            'sport',
            'philosophy',
            'level',
            'totalWeeks',
            'goalDescription',
            'targetWeeklyHours',
            'weeklyTSSProgression',
            'physiologicalFocus',
            'keyAdaptations',
            'nutritionAdvice',
            'weeks',
          ],
        },
      },
    });

    const parsedPlan = JSON.parse(response.text?.trim() || '{}') as AIBaseTrainingPlan;
    if (!parsedPlan.weeks || parsedPlan.weeks.length === 0) {
      throw new Error('Incomplete plan returned from Gemini');
    }

    parsedPlan.createdAt = new Date().toISOString();
    return res.json({
      plan: parsedPlan,
      source: 'gemini_3.8_flash',
      message: 'Base training plan successfully generated by Gemini AI.',
    });
  } catch (error: any) {
    console.error('Gemini base plan generation failed, falling back to deterministic engine:', error);
    const fallbackPlan = generateDeterministicBasePlan(req.body);
    return res.json({
      plan: fallbackPlan,
      source: 'deterministic_fallback',
      message: 'Base training plan generated using physiological endurance model.',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Setup Vite middleware in dev or static server in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
