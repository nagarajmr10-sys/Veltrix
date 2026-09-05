import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Star,
  Clock,
  Zap,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Award,
  BookOpen,
  ArrowRight,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ExternalLink,
  Flame,
  Download,
} from 'lucide-react';
import { PurchasablePlan, PurchasedPlanOrder, SportType, StructuredWorkout } from '../../types';
import { PURCHASABLE_PLANS } from '../../data/plansData';
import { PlanDetailModal } from './PlanDetailModal';
import { PlanCheckoutModal } from './PlanCheckoutModal';
import { generateCalendarICS, downloadICSFile } from '../../services/aiTrainingService';

interface PurchasePlansViewProps {
  purchasedPlans: PurchasedPlanOrder[];
  onCompletePurchase: (newOrder: PurchasedPlanOrder, scheduledWorkouts: StructuredWorkout[]) => void;
  onNavigateToCalendar: () => void;
  onOpenAIBasePlanModal?: () => void;
}

export const PurchasePlansView: React.FC<PurchasePlansViewProps> = ({
  purchasedPlans,
  onCompletePurchase,
  onNavigateToCalendar,
  onOpenAIBasePlanModal,
}) => {
  // Top View Mode: 'marketplace' | 'my_plans'
  const [viewMode, setViewMode] = useState<'marketplace' | 'my_plans'>('marketplace');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'price_asc' | 'price_desc'>('featured');

  // Modals
  const [selectedDetailPlan, setSelectedDetailPlan] = useState<PurchasablePlan | null>(null);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<PurchasablePlan | null>(null);

  // Filtered and Sorted Plans
  const filteredPlans = useMemo(() => {
    return PURCHASABLE_PLANS.filter((plan) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = plan.title.toLowerCase().includes(q);
        const matchSub = plan.subtitle.toLowerCase().includes(q);
        const matchCoach = plan.coach.name.toLowerCase().includes(q);
        const matchSport = plan.sport.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchCoach && !matchSport) return false;
      }

      // Sport filter
      if (selectedSport !== 'all' && plan.sport !== selectedSport) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'all' && plan.level !== selectedLevel) {
        return false;
      }

      // Duration filter
      if (selectedDuration === 'short' && plan.durationWeeks > 6) return false;
      if (selectedDuration === 'medium' && (plan.durationWeeks < 7 || plan.durationWeeks > 10)) return false;
      if (selectedDuration === 'long' && plan.durationWeeks < 11) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      // Default: featured (bestseller first)
      return (b.badge ? 1 : 0) - (a.badge ? 1 : 0);
    });
  }, [searchQuery, selectedSport, selectedLevel, selectedDuration, sortBy]);

  const sportsList = [
    { id: 'all', label: 'All Disciplines' },
    { id: 'cycling', label: 'Road Cycling' },
    { id: 'running', label: 'Marathon & Running' },
    { id: 'gravel', label: 'Gravel Endurance' },
  ];

  return (
    <div id="purchase-training-plans-view" className="space-y-6">
      {/* HERO BANNER SECTION */}
      <div className="relative rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold font-mono">
              <Award className="w-3.5 h-3.5" />
              <span>World Tour Tested Periodization Blueprints</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Elite Training Plan Marketplace
            </h1>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Step-by-step periodized training programs crafted by elite physiologists, Olympic coaches, and sports scientists. Fully calibrated to your personal FTP and LTHR zones, syncing automatically to Garmin, Wahoo, Apple Watch, and Zwift.
            </p>

            {/* Value Props Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>30-Day Money-Back Guarantee</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-orange-400" />
                <span>Instant Head Unit Sync</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-300">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>4.9/5 Average Athlete Rating</span>
              </div>
            </div>
          </div>

          {/* Right Action Box: AI Custom Plan CTA */}
          {onOpenAIBasePlanModal && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 max-w-sm space-y-3 shrink-0 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Prefer a Custom Algorithm?
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Use our Gemini AI engine to generate a bespoke training plan tuned to your exact hours, fitness profile, and race calendar.
              </p>
              <button
                id="hero-ai-plan-btn"
                onClick={onOpenAIBasePlanModal}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                <span>Generate AI Base Plan</span>
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW SELECTOR: MARKETPLACE VS MY PURCHASED PLANS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800">
        <div className="flex items-center gap-1.5">
          <button
            id="tab-plan-marketplace-btn"
            onClick={() => setViewMode('marketplace')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              viewMode === 'marketplace'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Plan Marketplace ({PURCHASABLE_PLANS.length})</span>
          </button>

          <button
            id="tab-my-purchased-plans-btn"
            onClick={() => setViewMode('my_plans')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              viewMode === 'my_plans'
                ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>My Purchased Plans ({purchasedPlans.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 px-3">
          <span>ALL PLANS INCLUDE:</span>
          <span className="text-neutral-200 font-semibold">Daily Intervals · TSS Ramps · .ICS Export</span>
        </div>
      </div>

      {/* TAB 1: PLAN MARKETPLACE */}
      {viewMode === 'marketplace' && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search by plan name, coach, or discipline (e.g. Marathon, Sweet Spot, Gravel)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 font-mono transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs font-mono"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-neutral-400 whitespace-nowrap">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="featured">Featured (Top Ranked)</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Sport & Level Pill Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/80 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {sportsList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSport(s.id)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition ${
                      selectedSport === s.id
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Duration Filter */}
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-neutral-300 focus:outline-none focus:border-orange-500"
                >
                  <option value="all">Any Duration</option>
                  <option value="short">4 - 6 Weeks</option>
                  <option value="medium">8 - 10 Weeks</option>
                  <option value="long">12+ Weeks</option>
                </select>

                {/* Level Filter */}
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-neutral-300 focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>

          {/* PLANS CATALOG GRID */}
          {filteredPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => {
                const isPurchased = purchasedPlans.some((p) => p.planId === plan.id);
                return (
                  <div
                    key={plan.id}
                    id={`plan-card-${plan.id}`}
                    className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-black/60 relative overflow-hidden"
                  >
                    {/* Top Tag & Rating Bar */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {plan.badge && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              {plan.badge}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-neutral-950 text-neutral-400 border border-neutral-800">
                            {plan.sport}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-amber-400 text-xs font-mono font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{plan.rating.toFixed(2)}</span>
                          <span className="text-neutral-500 text-[10px] font-normal">({plan.reviewCount})</span>
                        </div>
                      </div>

                      {/* Plan Title & Subtitle */}
                      <h3 className="text-lg font-black text-white tracking-tight leading-snug group-hover:text-orange-400 transition">
                        {plan.title}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {plan.subtitle}
                      </p>

                      {/* Coach Profile Cardlet */}
                      <div className="flex items-center gap-2.5 mt-4 p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                        <img
                          src={plan.coach.avatar}
                          alt={plan.coach.name}
                          className="w-8 h-8 rounded-lg object-cover border border-neutral-700"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-neutral-200 truncate">{plan.coach.name}</div>
                          <div className="text-[10px] text-neutral-500 truncate">{plan.coach.title}</div>
                        </div>
                      </div>

                      {/* Plan Metrics Row */}
                      <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-neutral-800/80 font-mono text-center">
                        <div className="bg-neutral-950/40 p-2 rounded-lg">
                          <div className="text-[10px] text-neutral-500 uppercase">Duration</div>
                          <div className="text-xs font-bold text-neutral-200 mt-0.5">{plan.durationWeeks} Wks</div>
                        </div>

                        <div className="bg-neutral-950/40 p-2 rounded-lg">
                          <div className="text-[10px] text-neutral-500 uppercase">Weekly Vol</div>
                          <div className="text-xs font-bold text-neutral-200 mt-0.5">{plan.avgWeeklyHours} hrs</div>
                        </div>

                        <div className="bg-neutral-950/40 p-2 rounded-lg">
                          <div className="text-[10px] text-neutral-500 uppercase">Avg TSS</div>
                          <div className="text-xs font-bold text-orange-400 mt-0.5">{plan.avgWeeklyTSS}</div>
                        </div>
                      </div>

                      {/* Feature Highlights Checklist */}
                      <div className="space-y-1.5 mt-4 text-xs text-neutral-300">
                        {plan.highlights.slice(0, 3).map((hl, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-[11px] text-neutral-300 line-clamp-1">{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Pricing & Action Buttons */}
                    <div className="mt-5 pt-4 border-t border-neutral-800 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white font-mono">${plan.price}</span>
                          {plan.originalPrice && (
                            <span className="text-xs font-mono line-through text-neutral-500">
                              ${plan.originalPrice}
                            </span>
                          )}
                        </div>
                        {isPurchased && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ✓ In Your Library
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id={`preview-plan-${plan.id}-btn`}
                          onClick={() => setSelectedDetailPlan(plan)}
                          className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Syllabus</span>
                        </button>

                        <button
                          id={`buy-plan-${plan.id}-btn`}
                          onClick={() => setSelectedCheckoutPlan(plan)}
                          className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition active:scale-95"
                        >
                          <span>{isPurchased ? 'Reschedule' : 'Get Plan'}</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
              <Search className="w-8 h-8 text-neutral-500 mx-auto" />
              <div className="text-base font-bold text-white">No training plans match your criteria</div>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Try clearing your search query or selecting "All Disciplines" to view the complete catalog.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSport('all');
                  setSelectedLevel('all');
                  setSelectedDuration('all');
                }}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-200 hover:bg-neutral-700 transition font-mono"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY PURCHASED PLANS */}
      {viewMode === 'my_plans' && (
        <div className="space-y-6">
          {purchasedPlans.length > 0 ? (
            <div className="space-y-4">
              {purchasedPlans.map((order) => {
                const planDetails = PURCHASABLE_PLANS.find((p) => p.id === order.planId);
                const progressPct = Math.round((order.currentWeek / order.durationWeeks) * 100);

                return (
                  <div
                    key={order.id}
                    id={`purchased-order-${order.id}`}
                    className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {order.status === 'active' ? '● Active Plan' : 'Completed'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-800 text-neutral-300">
                          {order.sport}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          Purchased on {order.purchaseDate}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white">{order.planTitle}</h3>
                      <p className="text-xs text-neutral-400">
                        Lead Coach: <strong className="text-neutral-200">{order.coachName}</strong> · Target Weekly Load:{' '}
                        <strong className="text-orange-400 font-mono">{order.avgWeeklyTSS} TSS</strong>
                      </p>

                      {/* Progress Bar */}
                      <div className="pt-2 max-w-lg space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-neutral-400">
                            Week {order.currentWeek} of {order.durationWeeks}
                          </span>
                          <span className="text-white font-bold">{progressPct}% Completed</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                      {planDetails && (
                        <button
                          onClick={() => setSelectedDetailPlan(planDetails)}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>View Syllabus</span>
                        </button>
                      )}

                      <button
                        onClick={onNavigateToCalendar}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Training Calendar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
              <ShoppingBag className="w-10 h-10 text-neutral-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Training Plans in Your Library Yet</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Browse our curated catalog of World Tour endurance plans to jumpstart your fitness and achieve your next personal record.
                </p>
              </div>
              <button
                onClick={() => setViewMode('marketplace')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-xs uppercase tracking-wider transition"
              >
                Browse Training Plans
              </button>
            </div>
          )}
        </div>
      )}

      {/* PLAN DETAIL MODAL */}
      <PlanDetailModal
        plan={selectedDetailPlan}
        isOpen={!!selectedDetailPlan}
        onClose={() => setSelectedDetailPlan(null)}
        onSelectBuy={(plan) => {
          setSelectedDetailPlan(null);
          setSelectedCheckoutPlan(plan);
        }}
      />

      {/* PLAN CHECKOUT MODAL */}
      <PlanCheckoutModal
        plan={selectedCheckoutPlan}
        isOpen={!!selectedCheckoutPlan}
        onClose={() => setSelectedCheckoutPlan(null)}
        onSuccess={(newOrder, scheduledWorkouts) => {
          onCompletePurchase(newOrder, scheduledWorkouts);
        }}
        onNavigateToCalendar={onNavigateToCalendar}
      />
    </div>
  );
};
