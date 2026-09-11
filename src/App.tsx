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
import { TrendsDashboardView } from './components/Analytics/TrendsDashboardView';
import { PerformanceManagementChart } from './components/Analytics/PerformanceManagementChart';
import { PowerPaceDurationCurve } from './components/Analytics/PowerPaceDurationCurve';
import { HeartRatePowerZones } from './components/Analytics/HeartRatePowerZones';
import { AIBasePlanModal } from './components/Training/AIBasePlanModal';
import { MissedWorkoutAlert } from './components/Training/MissedWorkoutAlert';
import { PurchasePlansView } from './components/Plans/PurchasePlansView';
import { PaymentGatewayModal } from './components/Payments/PaymentGatewayModal';
import { AuthModal } from './components/Auth/AuthModal';
import { AICoachChatSection } from './components/AI/AICoachChatSection';
import { SignInSignOutSection } from './components/Auth/SignInSignOutSection';
import { HealthAndStepsTracker } from './components/Health/HealthAndStepsTracker';
import { DailyStepsHealthWidget } from './components/Health/DailyStepsHealthWidget';
import { generateHealthBiometricsHistory } from './data/healthAndPerformanceData';
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
  HealthBiometricDay,
} from './types';
import { Activity as ActivityIcon, BarChart3, TrendingUp, Zap, Heart, ShoppingBag, ArrowLeftRight, Calendar, UserCheck, LogIn, Bot, ShieldCheck, ChevronUp, ChevronDown, Footprints } from 'lucide-react';

export default function App() {
  // Core Application State
  const [currentTab, setCurrentTab] = useState<NavTab>('analytics');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'dashboard' | 'trends' | 'health' | 'compare_workouts' | 'compare' | 'pmc' | 'curves' | 'zones'>('dashboard');

  // Daily Steps & Health Biometrics State
  const [biometricsHistory, setBiometricsHistory] = useState<HealthBiometricDay[]>(() =>
    generateHealthBiometricsHistory()
  );

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
  const [profileInitialTab, setProfileInitialTab] = useState<'gear' | 'integrations' | 'biometrics' | 'billing' | 'account'>('gear');
  const [isAuthSectionExpanded, setIsAuthSectionExpanded] = useState(false);
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

  const handleQuickAddSteps = (amount: number) => {
    setBiometricsHistory((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      const currentSteps = updated[lastIdx]?.steps ?? athleteProfile.todaySteps ?? 9420;
      const newSteps = currentSteps + amount;
      updated[lastIdx] = {
        ...updated[lastIdx],
        steps: newSteps,
      };
      return updated;
    });
    setAthleteProfile((prev) => ({
      ...prev,
      todaySteps: (prev.todaySteps ?? 9420) + amount,
    }));
  };

  const handleQuickAddWater = (ml: number) => {
    setBiometricsHistory((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      const currentLitres = updated[lastIdx]?.hydrationLitres ?? 3.2;
      const newLitres = Number((currentLitres + ml / 1000).toFixed(1));
      updated[lastIdx] = {
        ...updated[lastIdx],
        hydrationLitres: newLitres,
      };
      return updated;
    });
  };

  const handleOpenHealthSteps = () => {
    setCurrentTab('analytics');
    setAnalyticsSubTab('health');
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

  const handleSwitchUser = (newUser: AuthUser) => {
    handleAuthSuccess(newUser);
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
        onOpenProfile={(tab) => {
          setProfileInitialTab(tab || 'gear');
          setIsProfileOpen(true);
        }}
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
        onOpenAccountSection={() => {
          setProfileInitialTab('account');
          setIsProfileOpen(true);
        }}
        onOpenHealthSteps={handleOpenHealthSteps}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-28 sm:pb-32">
        {/* Guest Session Notice if signed out */}
        {!currentUser && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-orange-950/40 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Guest Athlete Session</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Unauthenticated
                  </span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Sign in or create an account to sync your PMC power curve, KOM segments, AI training plans, and gear mileage.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                id="guest-toggle-auth-section-btn"
                type="button"
                onClick={() => setIsAuthSectionExpanded(!isAuthSectionExpanded)}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-orange-500/50 text-neutral-200 hover:text-white font-mono text-xs font-bold transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAuthSectionExpanded ? 'Hide Auth Section' : 'Sign In / Sign Out Section'}</span>
                {isAuthSectionExpanded ? (
                  <ChevronUp className="w-3 h-3 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                )}
              </button>
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

        {/* Dedicated In-Page Sign In / Sign Out Section (Collapsible) */}
        {isAuthSectionExpanded && (
          <div className="animate-fadeIn space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono text-neutral-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Sign In / Sign Out & Authentication Section
              </span>
              <button
                type="button"
                onClick={() => setIsAuthSectionExpanded(false)}
                className="text-xs text-neutral-400 hover:text-white font-mono"
              >
                ✕ Close Section
              </button>
            </div>
            <SignInSignOutSection
              currentUser={currentUser}
              onSignOut={handleSignOut}
              onOpenSignIn={handleOpenSignIn}
              onOpenSignUp={handleOpenSignUp}
              onSwitchUser={handleSwitchUser}
              variant="full"
            />
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
          <div className="space-y-6">
            <DailyStepsHealthWidget
              profile={athleteProfile}
              todayHealth={biometricsHistory[biometricsHistory.length - 1]}
              onOpenFullTracker={handleOpenHealthSteps}
              onQuickAddSteps={handleQuickAddSteps}
              onQuickAddWater={handleQuickAddWater}
            />

            <ActivityFeedView
              activities={activities}
              onSelectActivity={(act) => {
                setSelectedActivity(act);
              }}
              onToggleKudos={handleToggleKudos}
              onOpenLiveRecord={() => setIsLiveRecordOpen(true)}
            />
          </div>
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
                  id="subtab-health-btn"
                  onClick={() => setAnalyticsSubTab('health')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'health'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Footprints className="w-4 h-4 text-orange-400" />
                  <span>Daily Steps & Health</span>
                </button>

                <button
                  id="subtab-trends-btn"
                  onClick={() => setAnalyticsSubTab('trends')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'trends'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span>Trends & Progression</span>
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
                onNavigateToTrends={() => setAnalyticsSubTab('trends')}
              />
            )}

            {/* Sub-tab: Daily Steps & Health Telemetry Tracker */}
            {analyticsSubTab === 'health' && (
              <HealthAndStepsTracker
                profile={athleteProfile}
                initialHistory={biometricsHistory}
                onUpdateProfile={(updated) => {
                  setAthleteProfile((prev) => ({ ...prev, ...updated }));
                }}
                onLogBiometrics={(newEntry) => {
                  setBiometricsHistory((prev) => {
                    const updated = [...prev];
                    const existingIdx = updated.findIndex((d) => d.date === newEntry.date);
                    if (existingIdx >= 0) {
                      updated[existingIdx] = newEntry;
                    } else {
                      updated.push(newEntry);
                    }
                    return updated;
                  });
                  if (newEntry.steps) {
                    setAthleteProfile((prev) => ({ ...prev, todaySteps: newEntry.steps }));
                  }
                }}
              />
            )}

            {/* Sub-tab: Macro-Cycle Training Trends & Progression */}
            {analyticsSubTab === 'trends' && (
              <TrendsDashboardView
                activities={activities}
                profile={athleteProfile}
                pmcMetrics={pmcMetrics}
                onOpenLiveRecord={() => setIsLiveRecordOpen(true)}
                onOpenCurves={() => setAnalyticsSubTab('curves')}
                onOpenZones={() => setAnalyticsSubTab('zones')}
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

        {/* TAB 3: AI COACH CHAT SECTION */}
        {currentTab === 'ai_coach' && (
          <AICoachChatSection
            profile={athleteProfile}
            pmcMetrics={pmcMetrics}
            recentActivities={activities}
            onAddWorkoutToCalendar={handleAddWorkout}
            onNavigateToCalendar={() => setCurrentTab('calendar')}
          />
        )}

        {/* TAB 4: CHALLENGES & SEGMENTS */}
        {currentTab === 'challenges' && (
          <SocialChallengesView
            challenges={challenges}
            segments={segments}
            onToggleJoinChallenge={handleToggleJoinChallenge}
            currentProfile={athleteProfile}
            activities={activities}
          />
        )}

        {/* TAB 5: TRAINING CALENDAR */}
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

        {/* TAB 6: PURCHASE TRAINING PLANS / MARKETPLACE */}
        {currentTab === 'plans' && (
          <PurchasePlansView
            purchasedPlans={purchasedPlans}
            onCompletePurchase={handlePurchasePlan}
            onNavigateToCalendar={() => setCurrentTab('calendar')}
            onOpenAIBasePlanModal={() => setIsAIBasePlanOpen(true)}
          />
        )}
      </main>

      {/* Floating Quick AI Coach Trigger Button */}
      {currentTab !== 'ai_coach' && (
        <button
          id="floating-ai-coach-btn"
          onClick={() => setCurrentTab('ai_coach')}
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-30 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold text-xs tracking-wide flex items-center gap-2 shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition group touch-manipulation"
          title="Open Veltrix AI Coach"
        >
          <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="hidden sm:inline">Chat with AI Coach</span>
          <span className="sm:hidden font-mono font-bold">AI Coach</span>
          <span className="w-2 h-2 rounded-full bg-black/40 animate-ping" />
        </button>
      )}

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
        initialTab={profileInitialTab}
        profile={athleteProfile}
        gearList={gearList}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenSignIn={handleOpenSignIn}
        onOpenSignUp={handleOpenSignUp}
        onSwitchUser={handleSwitchUser}
        onUpdateProfile={(upd) => setAthleteProfile(upd)}
        onUpdateGear={(upd) => setGearList(upd)}
        onOpenPayment={() => handleOpenPaymentGateway()}
        onImportActivity={(newActivity) => {
          setActivities((prev) => {
            const exists = prev.some((a) => a.id === newActivity.id);
            if (exists) {
              return prev.map((a) => (a.id === newActivity.id ? newActivity : a));
            }
            return [newActivity, ...prev];
          });
          setSelectedDashboardWorkoutId(newActivity.id);
        }}
        onImportStravaData={(newActivities, newSegments) => {
          setActivities((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const fresh = newActivities.filter((a) => !existingIds.has(a.id));
            return [...fresh, ...prev];
          });
          setSegments((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const fresh = newSegments.filter((s) => !existingIds.has(s.id));
            return [...fresh, ...prev];
          });
        }}
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
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
