import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Download,
  RotateCcw,
  Sliders,
  Dumbbell,
  ShieldCheck,
  X,
  Target,
  Activity,
  Heart,
  Info,
  Apple,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import {
  AthleteProfile,
  SportType,
  BasePlanPhilosophy,
  BasePlanLevel,
  AIBaseTrainingPlan,
  AIBasePlanRequest,
  StructuredWorkout,
} from '../../types';
import {
  requestAIBasePlan,
  convertPlanToStructuredWorkouts,
  generatePlanICS,
} from '../../services/aiTrainingService';

interface AIBasePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteProfile: AthleteProfile;
  currentCTL?: number;
  onApplyPlanToCalendar: (newWorkouts: StructuredWorkout[]) => void;
}

export const AIBasePlanModal: React.FC<AIBasePlanModalProps> = ({
  isOpen,
  onClose,
  athleteProfile,
  currentCTL = 58,
  onApplyPlanToCalendar,
}) => {
  // Form State
  const [sport, setSport] = useState<SportType>('cycling');
  const [philosophy, setPhilosophy] = useState<BasePlanPhilosophy>('sweet_spot');
  const [level, setLevel] = useState<BasePlanLevel>('intermediate');
  const [totalWeeks, setTotalWeeks] = useState<number>(6);
  const [targetWeeklyHours, setTargetWeeklyHours] = useState<number>(8);
  const [targetGoal, setTargetGoal] = useState<string>(
    'Build high aerobic capacity, increase mitochondrial density, and expand lactate threshold'
  );
  const [athleteFtp, setAthleteFtp] = useState<number>(athleteProfile.ftpWatts || 285);
  const [athleteLthr, setAthleteLthr] = useState<number>(athleteProfile.lthr || 172);
  const [athleteWeight, setAthleteWeight] = useState<number>(athleteProfile.weightKg || 72);
  const [customNotes, setCustomNotes] = useState<string>('');

  // Generation & Result State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<AIBaseTrainingPlan | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number>(0);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [generationSource, setGenerationSource] = useState<string>('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setAppliedSuccess(false);

    try {
      const payload: AIBasePlanRequest = {
        sport,
        philosophy,
        level,
        totalWeeks,
        targetWeeklyHours,
        targetGoal,
        athleteFtpWatts: athleteFtp,
        athleteLthrBpm: athleteLthr,
        athleteWeightKg: athleteWeight,
        currentCTL,
        notes: customNotes.trim() || undefined,
      };

      const response = await requestAIBasePlan(payload);
      setGeneratedPlan(response.plan);
      setGenerationSource(response.source);
      setActiveWeekIndex(0);
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to generate training plan. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToCalendar = () => {
    if (!generatedPlan) return;
    const workouts = convertPlanToStructuredWorkouts(generatedPlan);
    onApplyPlanToCalendar(workouts);
    setAppliedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const handleDownloadICS = () => {
    if (!generatedPlan) return;
    const icsContent = generatePlanICS(generatedPlan);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Veltrix_BasePlan_${generatedPlan.philosophy}_${generatedPlan.totalWeeks}W.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prepare chart data for weekly TSS ramp
  const chartData = generatedPlan
    ? generatedPlan.weeks.map((w) => ({
        name: `W${w.weekNumber}`,
        tss: w.targetWeeklyTSS,
        hours: w.targetWeeklyHours,
        isRecovery: w.isRecoveryWeek,
      }))
    : [];

  const activeWeek = generatedPlan ? generatedPlan.weeks[activeWeekIndex] : null;

  return (
    <div
      id="ai-base-plan-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-black shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5 fill-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">AI Base Training Plan Generator</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-bold uppercase">
                  Gemini 3.8 Flash Engine
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Calibrated periodization, mitochondrial adaptations, and microcycle interval architecture
              </p>
            </div>
          </div>

          <button
            id="close-ai-base-plan-modal-btn"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* If plan is NOT generated yet, show the configuration builder */}
          {!generatedPlan ? (
            <div className="space-y-6">
              {/* Profile Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Athlete FTP</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <input
                      type="number"
                      value={athleteFtp}
                      onChange={(e) => setAthleteFtp(Number(e.target.value))}
                      className="w-20 bg-neutral-950 border border-neutral-700 px-2 py-0.5 rounded text-white font-mono text-sm font-bold focus:border-orange-500 focus:outline-none"
                    />
                    <span className="text-xs text-neutral-400 font-mono">W</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {(athleteFtp / (athleteWeight || 1)).toFixed(2)} W/kg
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Lactate Threshold (LTHR)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <input
                      type="number"
                      value={athleteLthr}
                      onChange={(e) => setAthleteLthr(Number(e.target.value))}
                      className="w-20 bg-neutral-950 border border-neutral-700 px-2 py-0.5 rounded text-white font-mono text-sm font-bold focus:border-orange-500 focus:outline-none"
                    />
                    <span className="text-xs text-neutral-400 font-mono">BPM</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Zone 4 Threshold</span>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Body Weight</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <input
                      type="number"
                      value={athleteWeight}
                      onChange={(e) => setAthleteWeight(Number(e.target.value))}
                      className="w-20 bg-neutral-950 border border-neutral-700 px-2 py-0.5 rounded text-white font-mono text-sm font-bold focus:border-orange-500 focus:outline-none"
                    />
                    <span className="text-xs text-neutral-400 font-mono">kg</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Power-to-weight base</span>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Current CTL (Fitness)</span>
                  <div className="text-sm font-mono font-bold text-orange-400 mt-1">
                    {currentCTL} <span className="text-[10px] text-neutral-400">TSS/day</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">TrainingPeaks baseline</span>
                </div>
              </div>

              {/* Main Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Discipline & Philosophy */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                      Primary Sport Discipline
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['cycling', 'running', 'gravel', 'trail_running'] as SportType[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSport(s)}
                          className={`p-3 rounded-xl border text-xs font-bold capitalize transition flex flex-col items-center justify-center gap-1.5 ${
                            sport === s
                              ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                          <span>{s.replace('_', ' ')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                      Base Training Periodization Philosophy
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          id: 'sweet_spot',
                          title: 'Sweet Spot Base (TrainerRoad / Coggan)',
                          desc: 'Time-efficient: 88-94% FTP intervals + Z2 foundation. Maximizes aerobic adaptations in 6-10 hrs/wk.',
                        },
                        {
                          id: 'polarized',
                          title: 'Polarized 80/20 Base (Dr. Stephen Seiler)',
                          desc: '80% low-intensity strict Z1-Z2 aerobic cruising, 20% high-intensity Z5 bursts. Minimizes autonomic fatigue.',
                        },
                        {
                          id: 'pyramidal',
                          title: 'Pyramidal Aerobic Base (Classical Periodization)',
                          desc: 'High aerobic foundation with progressive tempo and threshold blocks. Proven for Gran Fondos & Marathons.',
                        },
                        {
                          id: 'traditional_aerobic',
                          title: 'Traditional High-Volume Base (Lydiard)',
                          desc: 'Extensive low-intensity aerobic mileage focused on fat oxidation and capillary bed expansion.',
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setPhilosophy(item.id as BasePlanPhilosophy)}
                          className={`p-3 rounded-xl border cursor-pointer transition ${
                            philosophy === item.id
                              ? 'bg-orange-500/10 border-orange-500/60 shadow-sm'
                              : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${philosophy === item.id ? 'text-orange-400' : 'text-neutral-200'}`}>
                              {item.title}
                            </span>
                            {philosophy === item.id && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Volume, Duration, Goals */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                        Plan Duration
                      </label>
                      <select
                        value={totalWeeks}
                        onChange={(e) => setTotalWeeks(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value={4}>4 Weeks (1 Base Block)</option>
                        <option value={6}>6 Weeks (Base I + II Microcycles)</option>
                        <option value={8}>8 Weeks (Full Base Macrocycle)</option>
                        <option value={12}>12 Weeks (Comprehensive Periodization)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                        Athlete Level
                      </label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value as BasePlanLevel)}
                        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="beginner">Beginner (Foundation)</option>
                        <option value="intermediate">Intermediate (Experienced)</option>
                        <option value="advanced">Advanced / Competitive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                        Target Weekly Training Volume
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTargetWeeklyHours((prev) => Math.max(3, prev - 1))}
                          className="w-6 h-6 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold flex items-center justify-center transition"
                          title="Decrease 1 hour"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-orange-400 min-w-[5.5rem] text-center">
                          {targetWeeklyHours} Hours / Week
                        </span>
                        <button
                          type="button"
                          onClick={() => setTargetWeeklyHours((prev) => Math.min(25, prev + 1))}
                          className="w-6 h-6 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold flex items-center justify-center transition"
                          title="Increase 1 hour"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Range Slider */}
                    <input
                      type="range"
                      min={3}
                      max={22}
                      step={1}
                      value={targetWeeklyHours}
                      onChange={(e) => setTargetWeeklyHours(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] font-mono text-neutral-500 mr-1">Presets:</span>
                      {[4, 6, 8, 10, 12, 14, 16].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => setTargetWeeklyHours(hours)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                            targetWeeklyHours === hours
                              ? 'bg-orange-500 text-black shadow-sm'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                          }`}
                        >
                          {hours}h
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1">
                      <span>3-5 hrs (Time-Crunched)</span>
                      <span>8-10 hrs (Standard Base)</span>
                      <span>15+ hrs (Elite/Pro)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Primary Goal & Adaptation Target
                    </label>
                    <input
                      type="text"
                      value={targetGoal}
                      onChange={(e) => setTargetGoal(e.target.value)}
                      placeholder="e.g. Century Ride, Sub-3hr Marathon, Lactate Threshold push"
                      className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Coaching Constraints / Special Notes
                    </label>
                    <textarea
                      rows={3}
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="e.g., Saturday preferred for longest ride, focus on high-cadence pedaling, recovering from knee tweak..."
                      className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {generationError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {generationError}
                </div>
              )}

              {/* Generate Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Calculates daily interval targets (% FTP, LTHR, and TSS) for every workout</span>
                </div>

                <button
                  id="submit-generate-base-plan-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 transition disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing Microcycles...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>Generate AI Base Training Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Plan is generated: Show Full Interactive Plan Studio */
            <div className="space-y-6">
              {/* Plan Summary Banner */}
              <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-5 sm:p-6 rounded-3xl border border-neutral-800 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold uppercase border border-orange-500/30">
                        {generatedPlan.philosophy.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-bold uppercase">
                        {generatedPlan.totalWeeks} Weeks
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-bold uppercase">
                        ~{generatedPlan.targetWeeklyHours}h/wk
                      </span>
                      {generationSource && (
                        <span className="text-[10px] font-mono text-neutral-500">
                          Engine: {generationSource}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-white mt-1 tracking-tight">
                      {generatedPlan.title}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                      {generatedPlan.goalDescription}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                    <button
                      onClick={handleDownloadICS}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export .ICS</span>
                    </button>

                    <button
                      onClick={() => setGeneratedPlan(null)}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Modify Plan</span>
                    </button>

                    <button
                      id="apply-ai-plan-to-calendar-btn"
                      onClick={handleApplyToCalendar}
                      disabled={appliedSuccess}
                      className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg ${
                        appliedSuccess
                          ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                          : 'bg-orange-500 hover:bg-orange-600 text-black shadow-orange-500/20'
                      }`}
                    >
                      {appliedSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Applied to Calendar!</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4" />
                          <span>Commit to Calendar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Macrocycle Progression Chart */}
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      <span>Weekly Training Stress Score (TSS) Ramp Progression</span>
                    </span>
                    <span className="font-mono text-neutral-400 text-[11px]">
                      Peak: {Math.max(...generatedPlan.weeklyTSSProgression)} TSS/wk
                    </span>
                  </div>

                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#737373"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-neutral-900 border border-neutral-700 p-2 rounded-lg text-xs font-mono shadow-xl">
                                  <div className="font-bold text-white">
                                    {data.name} {data.isRecovery && '(Recovery & Adapt)'}
                                  </div>
                                  <div className="text-orange-400 font-bold">{data.tss} TSS</div>
                                  <div className="text-neutral-400">{data.hours} hours</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="tss"
                          radius={[4, 4, 0, 0]}
                          fill="#f97316"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Physiological Mechanisms & Fueling Guidelines */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
                    <div className="font-bold text-neutral-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Target className="w-3.5 h-3.5 text-orange-400" />
                      <span>Target Physiological Adaptations</span>
                    </div>
                    <ul className="space-y-1 text-neutral-400 text-[11px]">
                      {generatedPlan.physiologicalFocus.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-orange-400 font-mono mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
                    <div className="font-bold text-neutral-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Apple className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nutritional & Hydration Protocol</span>
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      {generatedPlan.nutritionAdvice}
                    </p>
                  </div>
                </div>
              </div>

              {/* Week Tabs Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {generatedPlan.weeks.map((w, idx) => {
                    const isSelected = idx === activeWeekIndex;
                    return (
                      <button
                        key={w.weekNumber}
                        onClick={() => setActiveWeekIndex(idx)}
                        className={`px-4 py-2.5 rounded-2xl border text-xs font-mono font-bold whitespace-nowrap transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-orange-500 text-black border-orange-500 shadow-md shadow-orange-500/20'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <span>Week {w.weekNumber}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${isSelected ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                          {w.isRecoveryWeek ? 'Recovery' : `${w.targetWeeklyTSS} TSS`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Week Details & Workouts */}
                {activeWeek && (
                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{activeWeek.theme}</h4>
                          {activeWeek.isRecoveryWeek && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase border border-emerald-500/30">
                              Adaptation Phase
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{activeWeek.focus}</p>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-neutral-400">
                          Target Volume: <strong className="text-white">{activeWeek.targetWeeklyHours}h</strong>
                        </span>
                        <span className="text-orange-400 font-bold">
                          {activeWeek.targetWeeklyTSS} TSS
                        </span>
                      </div>
                    </div>

                    {/* 7 Daily Workouts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeWeek.workouts.map((wk, wIdx) => {
                        const isRest = wk.durationMinutes === 0;

                        return (
                          <div
                            key={wIdx}
                            className={`p-4 rounded-2xl border flex flex-col justify-between transition ${
                              isRest
                                ? 'bg-neutral-950/50 border-neutral-900 text-neutral-500'
                                : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700 text-neutral-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between font-mono text-[11px] pb-2 border-b border-neutral-800/60">
                                <span className="font-bold text-orange-400">{wk.dayOfWeek}</span>
                                {isRest ? (
                                  <span className="text-neutral-500 uppercase text-[10px]">Rest</span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-neutral-400">{wk.durationMinutes}m</span>
                                    <span className="text-orange-400 font-bold">{wk.plannedTSS} TSS</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2.5">
                                <h5 className="font-bold text-sm text-white line-clamp-1">{wk.title}</h5>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 capitalize">
                                    {wk.sport}
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                    {wk.intensity}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                                  {wk.description}
                                </p>
                              </div>
                            </div>

                            {/* Interval Structure Preview */}
                            {wk.intervalStructure && wk.intervalStructure.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-neutral-800/60 space-y-1">
                                <div className="text-[10px] font-mono text-neutral-500 uppercase">Interval Profile</div>
                                <div className="space-y-1 font-mono text-[10px]">
                                  {wk.intervalStructure.map((step, sIdx) => (
                                    <div key={sIdx} className="flex items-center justify-between text-neutral-400">
                                      <span className="truncate pr-2">
                                        {step.phase} ({step.durationMinutes}m)
                                      </span>
                                      <span className="text-orange-400 font-semibold shrink-0">
                                        {step.targetZone}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
