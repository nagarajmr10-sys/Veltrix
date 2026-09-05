import React, { useState } from 'react';
import {
  X,
  Star,
  Clock,
  Zap,
  Calendar,
  CheckCircle2,
  Award,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  BookOpen,
  MessageSquare,
  Sparkles,
  BarChart2,
  Activity,
  Layers,
} from 'lucide-react';
import { PurchasablePlan } from '../../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PlanDetailModalProps {
  plan: PurchasablePlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectBuy: (plan: PurchasablePlan) => void;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSelectBuy,
}) => {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'workout' | 'coach' | 'reviews'>('syllabus');

  if (!isOpen || !plan) return null;

  // Chart data for TSS progression across weeks
  const tssChartData = plan.weeklyStructure.map((w) => ({
    week: `Wk ${w.weekNumber}`,
    tss: w.weeklyTSS,
    hours: w.weeklyHours,
    isRecovery: w.isRecoveryWeek,
  }));

  return (
    <div
      id="plan-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="plan-detail-modal-container"
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-neutral-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Banner */}
        <div className="relative p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800">
          <button
            id="close-plan-detail-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            {plan.badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {plan.badge}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase bg-neutral-800 text-neutral-300 border border-neutral-700">
              {plan.sport}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono capitalize bg-neutral-800 text-neutral-300 border border-neutral-700">
              {plan.level} Level
            </span>
            <div className="flex items-center gap-1 ml-auto text-amber-400 text-xs font-bold font-mono">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{plan.rating.toFixed(2)}</span>
              <span className="text-neutral-500 font-normal">({plan.reviewCount} verified reviews)</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {plan.title}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            {plan.subtitle}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-neutral-800/80">
            <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>Duration</span>
              </div>
              <div className="text-lg font-black text-white font-mono mt-0.5">{plan.durationWeeks} Weeks</div>
            </div>

            <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Weekly Volume</span>
              </div>
              <div className="text-lg font-black text-white font-mono mt-0.5">{plan.avgWeeklyHours} hrs/wk</div>
            </div>

            <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span>Avg Weekly Load</span>
              </div>
              <div className="text-lg font-black text-orange-400 font-mono mt-0.5">{plan.avgWeeklyTSS} TSS</div>
            </div>

            <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compatibility</span>
              </div>
              <div className="text-xs font-semibold text-emerald-300 mt-1 truncate">Garmin · Wahoo · Zwift</div>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-800 bg-neutral-900 overflow-x-auto">
          <button
            id="tab-syllabus-btn"
            onClick={() => setActiveTab('syllabus')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'syllabus'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Weekly Syllabus ({plan.durationWeeks} Wks)</span>
          </button>

          <button
            id="tab-workout-btn"
            onClick={() => setActiveTab('workout')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'workout'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Sample Structured Interval</span>
          </button>

          <button
            id="tab-coach-btn"
            onClick={() => setActiveTab('coach')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'coach'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Coach & Methodology</span>
          </button>

          <button
            id="tab-reviews-btn"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Reviews ({plan.reviews.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SYLLABUS & TSS LOAD RAMP */}
          {activeTab === 'syllabus' && (
            <div className="space-y-6">
              {/* Description & Prerequisites */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Plan Overview</h3>
                <p className="text-sm text-neutral-300 leading-relaxed">{plan.description}</p>
                <div className="mt-3 p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                  <span className="font-bold text-neutral-200">Athlete Prerequisites:</span> {plan.prerequisites}
                </div>
              </div>

              {/* TSS Progression Ramp Recharts */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Planned Periodization Ramp (Weekly TSS)
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Periodic dips indicate scheduled active recovery weeks
                  </span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tssChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="planTssGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" stroke="#525252" tick={{ fill: '#737373', fontSize: 10 }} />
                      <YAxis stroke="#525252" tick={{ fill: '#737373', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#171717',
                          borderColor: '#333',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: string) => [
                          name === 'tss' ? `${value} TSS` : `${value} hrs`,
                          name === 'tss' ? 'Weekly Load' : 'Weekly Volume',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="tss"
                        stroke="#f97316"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#planTssGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Week by Week Syllabus Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Microcycle Breakdown ({plan.weeklyStructure.length} Weeks)
                </h4>
                <div className="space-y-2">
                  {plan.weeklyStructure.map((w) => (
                    <div
                      key={w.weekNumber}
                      className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        w.isRecoveryWeek
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                          : 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                            Week {w.weekNumber}
                          </span>
                          <span className="font-bold text-white text-sm">{w.title}</span>
                          {w.isRecoveryWeek && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Recovery & Supercompensation
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400">{w.focus}</p>
                        <div className="text-xs text-orange-400/90 font-mono">
                          ★ Key Session: {w.keyWorkout}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 shrink-0 self-end sm:self-center">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          <strong className="text-neutral-200">{w.weeklyHours}</strong> hrs
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-orange-500" />
                          <strong className="text-orange-400">{w.weeklyTSS}</strong> TSS
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SAMPLE STRUCTURED WORKOUT */}
          {activeTab === 'workout' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-orange-400 uppercase tracking-wide">
                      {plan.sampleWorkout.dayOfWeek}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{plan.sampleWorkout.title}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-200">
                      ⏱ {plan.sampleWorkout.durationMinutes} mins
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-orange-950/60 text-orange-400 border border-orange-800/50">
                      ⚡ {plan.sampleWorkout.plannedTSS} TSS
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300">
                      🎯 {plan.sampleWorkout.targetZone}
                    </span>
                  </div>
                </div>

                {/* Interval Step Visualizer */}
                <div className="space-y-2 pt-3 border-t border-neutral-800/80">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Step-by-Step Interval Telemetry
                  </div>
                  <div className="space-y-1.5">
                    {plan.sampleWorkout.intervals.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 border border-neutral-800/70 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center font-mono font-bold text-neutral-300 text-[11px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white">{step.phase}</span>
                            <p className="text-neutral-400 text-[11px] mt-0.5">{step.targetDescription}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          <div className="font-bold text-orange-400">{step.durationMinutes}m</div>
                          <div className="text-[10px] text-neutral-400">{step.targetZone}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compatibility Guarantee */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-orange-950/30 via-neutral-900 to-neutral-950 border border-orange-500/20 flex items-center gap-3 text-xs text-neutral-300">
                <Sparkles className="w-5 h-5 text-orange-400 shrink-0" />
                <span>
                  Workouts from this plan automatically convert into native <code>.fit</code> files, syncing straight to your Garmin Edge head unit, Wahoo ELEMNT, Apple Watch, and Zwift / TrainerRoad workout players.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: COACH & METHODOLOGY */}
          {activeTab === 'coach' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 bg-neutral-950 rounded-2xl border border-neutral-800">
                <img
                  src={plan.coach.avatar}
                  alt={plan.coach.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-500/40 shadow-lg shadow-black/60"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{plan.coach.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      Verified Coach
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-orange-400 font-mono">{plan.coach.title}</div>
                  <div className="text-xs text-neutral-400">{plan.coach.credentials}</div>
                  <p className="text-xs text-neutral-300 pt-2">{plan.coach.bio}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Coaching Philosophy & Physiological Adaptation
                </h4>
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 leading-relaxed space-y-3">
                  <p>
                    <strong className="text-white">Core Focus:</strong> {plan.philosophy}
                  </p>
                  <p>
                    Every workout in this training plan is calibrated against physiological thresholds (Lactate Threshold Heart Rate and Functional Threshold Power). Unlike generic fixed-wattage templates, workouts dynamically scale as your fitness evolves.
                  </p>
                  <ul className="space-y-1.5 list-disc pl-4 text-neutral-400">
                    {plan.highlights.map((hl, i) => (
                      <li key={i} className="text-neutral-300">{hl}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ATHLETE REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-white font-mono">{plan.rating.toFixed(2)}</div>
                  <div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">Based on {plan.reviewCount} verified athlete logs</div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-mono">
                  <ShieldCheck className="w-4 h-4" />
                  <span>100% Verified Purchases</span>
                </div>
              </div>

              <div className="space-y-3">
                {plan.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {rev.avatar ? (
                          <img src={rev.avatar} alt={rev.author} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">
                            {rev.author[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{rev.author}</span>
                            {rev.verifiedAthlete && (
                              <span className="text-[10px] text-emerald-400 font-normal">✓ Verified Athlete</span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500">{rev.date}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed pl-9">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Footer & Checkout Action */}
        <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-black text-white font-mono tracking-tight">${plan.price}</span>
            {plan.originalPrice && (
              <span className="text-sm font-mono line-through text-neutral-500">${plan.originalPrice}</span>
            )}
            <span className="text-xs text-neutral-400">One-time payment · Lifetime access</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="plan-detail-cancel-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider text-neutral-300 transition"
            >
              Close
            </button>

            <button
              id="plan-detail-buy-now-btn"
              onClick={() => {
                onClose();
                onSelectBuy(plan);
              }}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/25 active:scale-95"
            >
              <span>Get Plan & Schedule Calendar</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
