import React, { useState } from 'react';
import {
  Navigation,
  NavTab,
} from './components/Navigation';
import { ActivityFeedView } from './components/Social/ActivityFeedView';
import { SocialChallengesView } from './components/Social/SocialChallengesView';
import { TrainingCalendarView } from './components/Training/TrainingCalendarView';
import { AthleteProfileModal } from './components/Profile/AthleteProfileModal';
import { LiveRecordModal } from './components/LiveTracker/LiveRecordModal';
import { ActivityDeepDiveModal } from './components/Analytics/ActivityDeepDiveModal';
import { PerformanceDashboard } from './components/Analytics/PerformanceDashboard';
import { PerformanceManagementChart } from './components/Analytics/PerformanceManagementChart';
import { PowerPaceDurationCurve } from './components/Analytics/PowerPaceDurationCurve';
import { HeartRatePowerZones } from './components/Analytics/HeartRatePowerZones';
import { AIBasePlanModal } from './components/Training/AIBasePlanModal';
import { MissedWorkoutAlert } from './components/Training/MissedWorkoutAlert';
import { PurchasePlansView } from './components/Plans/PurchasePlansView';
import { PaymentGatewayModal } from './components/Payments/PaymentGatewayModal';
import { AuthModal } from './components/Auth/AuthModal';
import {
  INITIAL_ACTIVITIES,
  INITIAL_ATHLETE,
  INITIAL_CHALLENGES,
  INITIAL_GEAR,
  INITIAL_SEGMENTS,
  INITIAL_STRUCTURED_WORKOUTS,
  generateHistoricalPMC,
} from './data/initialData';
import { INITIAL_PURCHASED_PLANS } from './data/plansData';
import {
  Activity,
  AthleteProfile,
  GearItem,
  Segment,
  SocialChallenge,
  StructuredWorkout,
  DailyTrainingMetric,
  PurchasedPlanOrder,
  PaymentTransactionReceipt,
  AuthUser,
} from './types';
import { Activity as ActivityIcon, BarChart3, TrendingUp, Zap, Heart, ShoppingBag, ArrowLeftRight, Calendar, UserCheck, LogIn } from 'lucide-react';

export default function App() {
  // Core Application State
  const [currentTab, setCurrentTab] = useState<NavTab>('analytics');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'dashboard' | 'compare_workouts' | 'compare' | 'pmc' | 'curves' | 'zones'>('dashboard');

  // Authenticated User State (defaults to active athlete Alex Rivera, persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('veltrix_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      id: 'usr_alex_rivera',
      name: 'Alex Rivera',
      email: 'alex.rivera@endurance-veltrix.io',
      handle: '@alexrivera_velo',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      ftpWatts: 285,
      weightKg: 68.5,
      isPro: false,
      token: 'tok_live_alex_session_001',
    };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile>(INITIAL_ATHLETE);
  const [gearList, setGearList] = useState<GearItem[]>(INITIAL_GEAR);
  const [challenges, setChallenges] = useState<SocialChallenge[]>(INITIAL_CHALLENGES);
  const [segments, setSegments] = useState<Segment[]>(INITIAL_SEGMENTS);
  const [workouts, setWorkouts] = useState<StructuredWorkout[]>(INITIAL_STRUCTURED_WORKOUTS);
  const [purchasedPlans, setPurchasedPlans] = useState<PurchasedPlanOrder[]>(INITIAL_PURCHASED_PLANS);
  const [pmcMetrics, setPmcMetrics] = useState<DailyTrainingMetric[]>(() => generateHistoricalPMC());

  // Modals and active selections
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedDashboardWorkoutId, setSelectedDashboardWorkoutId] = useState<string | null>(null);
  const [isLiveRecordOpen, setIsLiveRecordOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAIBasePlanOpen, setIsAIBasePlanOpen] = useState(false);
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    itemTitle: string;
    itemDescription: string;
    amount: number;
    tierName: string;
  }>({
    itemTitle: 'Veltrix Pro Athlete Membership',
    itemDescription: 'Unlimited AI training plans, Strava satellite heatmaps, advanced PMC analytics, and coaching support',
    amount: 79,
    tierName: 'Annual Season Pass',
  });

  const handleOpenPaymentGateway = (overrideConfig?: {
    itemTitle?: string;
    itemDescription?: string;
    amount?: number;
    tierName?: string;
  }) => {
    if (overrideConfig) {
      setPaymentConfig((prev) => ({
        ...prev,
        ...overrideConfig,
      }));
    }
    setIsPaymentGatewayOpen(true);
  };

  const handlePaymentSuccess = (receipt: PaymentTransactionReceipt) => {
    setAthleteProfile((prev) => ({
      ...prev,
      isPro: true,
      proTier: paymentConfig.tierName,
      proRenewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentReceipts: [receipt, ...(prev.paymentReceipts || [])],
    }));
  };

  // Auth Handlers
  const handleOpenSignIn = () => {
    setAuthModalInitialMode('sign-in');
    setIsAuthModalOpen(true);
  };

  const handleOpenSignUp = () => {
    setAuthModalInitialMode('sign-up');
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('veltrix_auth_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    // Synchronize athlete profile with logged in account
    setAthleteProfile((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
      handle: user.handle,
      avatar: user.avatar || prev.avatar,
      ftpWatts: user.ftpWatts || prev.ftpWatts,
      weightKg: user.weightKg || prev.weightKg,
      isPro: user.isPro ?? prev.isPro,
    }));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('veltrix_auth_user');
    } catch {
      // ignore
    }
  };

  // Handlers
  const handleSaveActivity = (newAct: Activity) => {
    setActivities((prev) => [newAct, ...prev]);

    // Update athlete profile totals
    setAthleteProfile((prev) => ({
      ...prev,
      totalActivitiesCount: prev.totalActivitiesCount + 1,
      totalDistanceKm: prev.totalDistanceKm + newAct.distanceKm,
      totalElevationGainMeters: prev.totalElevationGainMeters + newAct.elevationGainMeters,
    }));

    // Update gear distance if gear was used
    if (newAct.gearId) {
      setGearList((prev) =>
        prev.map((g) =>
          g.id === newAct.gearId
            ? { ...g, distanceKm: g.distanceKm + newAct.distanceKm }
            : g
        )
      );
    }

    // Set as active selection in dashboard
    setSelectedDashboardWorkoutId(newAct.id);
  };

  const handleToggleKudos = (activityId: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id === activityId) {
          const isKudoed = act.userHasKudoed;
          return {
            ...act,
            userHasKudoed: !isKudoed,
            kudosCount: isKudoed ? act.kudosCount - 1 : act.kudosCount + 1,
          };
        }
        return act;
      })
    );
  };

  const handleToggleJoinChallenge = (challengeId: string) => {
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id === challengeId) {
          return {
            ...c,
            isJoined: !c.isJoined,
            participantsCount: c.isJoined ? c.participantsCount - 1 : c.participantsCount + 1,
          };
        }
        return c;
      })
    );
  };

  const handleAddWorkout = (newWk: StructuredWorkout) => {
    setWorkouts((prev) => [newWk, ...prev]);
  };

  const handleApplyAIBasePlan = (newWorkouts: StructuredWorkout[]) => {
    setWorkouts((prev) => [...newWorkouts, ...prev]);
  };

  const handlePurchasePlan = (
    newOrder: PurchasedPlanOrder,
    scheduledWorkouts: StructuredWorkout[]
  ) => {
    setPurchasedPlans((prev) => [newOrder, ...prev]);
    setWorkouts((prev) => [...scheduledWorkouts, ...prev]);
  };

  const handleToggleWorkoutCompleted = (workoutId: string) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, isCompleted: !w.isCompleted } : w))
    );
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const missedWorkouts = workouts.filter((w) => !w.isCompleted && w.date < todayStr);
  const [isMissedAlertDismissed, setIsMissedAlertDismissed] = useState(false);

  const handleRescheduleWorkout = (workoutId: string, newDate: string) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, date: newDate } : w))
    );
  };

  const handleConvertToRestDay = (workoutId: string) => {
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workoutId
          ? {
              ...w,
              title: `${w.title} (Adapted to Rest Day)`,
              plannedTSS: 0,
              isCompleted: true,
              description: `Adapted rest and recovery day to absorb prior micro-cycle fatigue and reset form.`,
            }
          : w
      )
    );
  };

  const handleRemoveWorkout = (workoutId: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  };

  const handleSimulateMissedWorkout = () => {
    const yesterdayDate = new Date(Date.now() - 86400 * 1000).toISOString().split('T')[0];
    const simulated: StructuredWorkout = {
      id: `wk-simulated-${Date.now()}`,
      date: yesterdayDate,
      title: 'VO2 Max 5x3min Hill Surges',
      sport: 'running',
      plannedDurationMinutes: 60,
      plannedTSS: 80,
      description: 'High intensity aerobic power development: 5 reps at 3K-5K pace with 3min easy recovery jog.',
      structure: [
        { phase: 'Warmup', durationMinutes: 15, targetZone: 'Z2 Base', targetDescription: 'Progressive jog' },
        { phase: 'VO2 Max Repeats', durationMinutes: 30, targetZone: 'Z5 VO2 Max', targetDescription: '5x 3min @ 3:30/km' },
        { phase: 'Cooldown', durationMinutes: 15, targetZone: 'Z1 Flush', targetDescription: '15min easy walk/jog' },
      ],
      isCompleted: false,
    };
    setWorkouts((prev) => [simulated, ...prev]);
    setIsMissedAlertDismissed(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Global Navigation Header */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenLiveRecord={() => setIsLiveRecordOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAIBasePlan={() => setIsAIBasePlanOpen(true)}
        onOpenPayment={() => handleOpenPaymentGateway()}
        profile={athleteProfile}
        missedWorkoutsCount={missedWorkouts.length}
        onOpenMissedWorkoutsAlert={() => {
          setCurrentTab('calendar');
          setIsMissedAlertDismissed(false);
        }}
        isAuthenticated={Boolean(currentUser)}
        onOpenSignIn={handleOpenSignIn}
        onOpenSignUp={handleOpenSignUp}
        onSignOut={handleSignOut}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Guest Session Notice if signed out */}
        {!currentUser && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-orange-950/40 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Guest Athlete Session</h4>
                <p className="text-xs text-neutral-400">
                  Sign in or create a free account to sync your PMC power curve, KOM segments, and AI training plans.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenSignIn}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold transition"
              >
                Sign In
              </button>
              <button
                onClick={handleOpenSignUp}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider transition shadow-md shadow-orange-500/20"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* Global Missed Workout Alert Banner (Visible across tabs when dismissed is false) */}
        {missedWorkouts.length > 0 && !isMissedAlertDismissed && currentTab !== 'calendar' && (
          <MissedWorkoutAlert
            workouts={workouts}
            onRescheduleWorkout={handleRescheduleWorkout}
            onToggleWorkoutCompleted={handleToggleWorkoutCompleted}
            onConvertToRestDay={handleConvertToRestDay}
            onRemoveWorkout={handleRemoveWorkout}
            onSimulateMissedWorkout={handleSimulateMissedWorkout}
            onDismiss={() => setIsMissedAlertDismissed(true)}
          />
        )}
        {/* TAB 1: ACTIVITY FEED */}
        {currentTab === 'feed' && (
          <ActivityFeedView
            activities={activities}
            onSelectActivity={(act) => {
              setSelectedActivity(act);
            }}
            onToggleKudos={handleToggleKudos}
            onOpenLiveRecord={() => setIsLiveRecordOpen(true)}
          />
        )}

        {/* TAB 2: PERFORMANCE & ANALYTICS DASHBOARD */}
        {currentTab === 'analytics' && (
          <div className="space-y-6">
            {/* Analytics Section Sub-Navigation Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  id="subtab-dashboard-btn"
                  onClick={() => setAnalyticsSubTab('dashboard')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'dashboard'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Performance Dashboard</span>
                </button>

                <button
                  id="subtab-compare-workouts-btn"
                  onClick={() => setAnalyticsSubTab('compare_workouts')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'compare_workouts'
                      ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4 text-orange-400" />
                  <span>Compare Workouts</span>
                </button>

                <button
                  id="subtab-compare-btn"
                  onClick={() => setAnalyticsSubTab('compare')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'compare'
                      ? 'bg-neutral-800 text-sky-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Compare Periods</span>
                </button>

                <button
                  id="subtab-pmc-btn"
                  onClick={() => setAnalyticsSubTab('pmc')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'pmc'
                      ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Training Load (PMC)</span>
                </button>

                <button
                  id="subtab-curves-btn"
                  onClick={() => setAnalyticsSubTab('curves')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'curves'
                      ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Mean Maximal Curves</span>
                </button>

                <button
                  id="subtab-zones-btn"
                  onClick={() => setAnalyticsSubTab('zones')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'zones'
                      ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Physiological Zones</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-neutral-400 pr-2">
                <span>ATHLETE: {athleteProfile.name}</span>
                <span>·</span>
                <span className="text-orange-400">FTP: {athleteProfile.ftpWatts}W</span>
                <span>·</span>
                <span className="text-rose-400">LTHR: {athleteProfile.lthr} bpm</span>
              </div>
            </div>

            {/* Sub-tab 1: Performance Dashboard (Heart Rate Zones & Elevation Gain Graphs with Recharts) */}
            {analyticsSubTab === 'dashboard' && (
              <PerformanceDashboard
                activities={activities}
                profile={athleteProfile}
                initialViewMode="all"
                selectedActivityId={selectedDashboardWorkoutId}
                onSelectActivity={(act) => setSelectedActivity(act)}
                pmcMetrics={pmcMetrics}
                onNavigateToPMC={() => setAnalyticsSubTab('pmc')}
              />
            )}

            {/* Sub-tab: Compare Workouts (Workout vs Workout Telemetry & Splits) */}
            {analyticsSubTab === 'compare_workouts' && (
              <PerformanceDashboard
                activities={activities}
                profile={athleteProfile}
                initialViewMode="compare_workouts"
                selectedActivityId={selectedDashboardWorkoutId}
                onSelectActivity={(act) => setSelectedActivity(act)}
              />
            )}

            {/* Sub-tab: Compare Periods (Time Horizons Overlay) */}
            {analyticsSubTab === 'compare' && (
              <PerformanceDashboard
                activities={activities}
                profile={athleteProfile}
                initialViewMode="compare_periods"
                selectedActivityId={selectedDashboardWorkoutId}
                onSelectActivity={(act) => setSelectedActivity(act)}
              />
            )}

            {/* Sub-tab 2: TrainingPeaks Performance Management Chart (CTL / ATL / TSB) */}
            {analyticsSubTab === 'pmc' && (
              <PerformanceManagementChart metrics={pmcMetrics} />
            )}

            {/* Sub-tab 3: Power & Pace Duration Curves */}
            {analyticsSubTab === 'curves' && (
              <PowerPaceDurationCurve
                athleteWeightKg={athleteProfile.weightKg}
                athleteFtp={athleteProfile.ftpWatts}
              />
            )}

            {/* Sub-tab 4: Physiological HR & Power Zones 80/20 Distribution */}
            {analyticsSubTab === 'zones' && (
              <HeartRatePowerZones
                athleteLthr={athleteProfile.lthr}
                athleteFtp={athleteProfile.ftpWatts}
              />
            )}
          </div>
        )}

        {/* TAB 3: CHALLENGES & SEGMENTS */}
        {currentTab === 'challenges' && (
          <SocialChallengesView
            challenges={challenges}
            segments={segments}
            onToggleJoinChallenge={handleToggleJoinChallenge}
            currentProfile={athleteProfile}
            activities={activities}
          />
        )}

        {/* TAB 4: TRAINING CALENDAR */}
        {currentTab === 'calendar' && (
          <TrainingCalendarView
            workouts={workouts}
            onAddWorkout={handleAddWorkout}
            onToggleWorkoutCompleted={handleToggleWorkoutCompleted}
            onRescheduleWorkout={handleRescheduleWorkout}
            onConvertToRestDay={handleConvertToRestDay}
            onRemoveWorkout={handleRemoveWorkout}
            onSimulateMissedWorkout={handleSimulateMissedWorkout}
            onOpenAIBasePlanModal={() => setIsAIBasePlanOpen(true)}
            onBrowsePlans={() => setCurrentTab('plans')}
            activePlanName={purchasedPlans.find((p) => p.status === 'active')?.planTitle}
          />
        )}

        {/* TAB 5: PURCHASE TRAINING PLANS / MARKETPLACE */}
        {currentTab === 'plans' && (
          <PurchasePlansView
            purchasedPlans={purchasedPlans}
            onCompletePurchase={handlePurchasePlan}
            onNavigateToCalendar={() => setCurrentTab('calendar')}
            onOpenAIBasePlanModal={() => setIsAIBasePlanOpen(true)}
          />
        )}
      </main>

      {/* MODAL 1: LIVE ACTIVITY RECORDING */}
      <LiveRecordModal
        isOpen={isLiveRecordOpen}
        onClose={() => setIsLiveRecordOpen(false)}
        onSaveActivity={handleSaveActivity}
        athleteFtp={athleteProfile.ftpWatts}
        athleteLthr={athleteProfile.lthr}
        gearList={gearList.map((g) => ({ id: g.id, name: g.name }))}
      />

      {/* MODAL 2: ACTIVITY DEEP DIVE & GPS TELEMETRY MAP */}
      <ActivityDeepDiveModal
        activity={selectedActivity}
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        segments={segments}
      />

      {/* MODAL 3: ATHLETE PROFILE & GEAR VAULT */}
      <AthleteProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={athleteProfile}
        gearList={gearList}
        onUpdateProfile={(upd) => setAthleteProfile(upd)}
        onUpdateGear={(upd) => setGearList(upd)}
        onOpenPayment={() => handleOpenPaymentGateway()}
      />

      {/* MODAL 4: AI BASE TRAINING PLAN BUILDER */}
      <AIBasePlanModal
        isOpen={isAIBasePlanOpen}
        onClose={() => setIsAIBasePlanOpen(false)}
        athleteProfile={athleteProfile}
        currentCTL={pmcMetrics[pmcMetrics.length - 1]?.ctl || 58}
        onApplyPlanToCalendar={handleApplyAIBasePlan}
      />

      {/* MODAL 5: SECURE PAYMENT GATEWAY & SUBSCRIPTION BILLING */}
      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        onClose={() => setIsPaymentGatewayOpen(false)}
        itemTitle={paymentConfig.itemTitle}
        itemDescription={paymentConfig.itemDescription}
        amount={paymentConfig.amount}
        tierName={paymentConfig.tierName}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* MODAL 6: ATHLETE AUTHENTICATION (SIGN IN & SIGN UP) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalInitialMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
