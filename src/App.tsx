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
import { PurchasePlansView } from './components/Plans/PurchasePlansView';
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
} from './types';
import { Activity as ActivityIcon, BarChart3, TrendingUp, Zap, Heart, ShoppingBag, ArrowLeftRight } from 'lucide-react';

export default function App() {
  // Core Application State
  const [currentTab, setCurrentTab] = useState<NavTab>('analytics');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'dashboard' | 'compare' | 'pmc' | 'curves' | 'zones'>('dashboard');

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Global Navigation Header */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenLiveRecord={() => setIsLiveRecordOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAIBasePlan={() => setIsAIBasePlanOpen(true)}
        profile={athleteProfile}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
                  id="subtab-compare-btn"
                  onClick={() => setAnalyticsSubTab('compare')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition ${
                    analyticsSubTab === 'compare'
                      ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
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
              />
            )}

            {/* Sub-tab: Compare Periods (Time Horizons Overlay) */}
            {analyticsSubTab === 'compare' && (
              <PerformanceDashboard
                activities={activities}
                profile={athleteProfile}
                initialViewMode="compare"
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
          />
        )}

        {/* TAB 4: TRAINING CALENDAR */}
        {currentTab === 'calendar' && (
          <TrainingCalendarView
            workouts={workouts}
            onAddWorkout={handleAddWorkout}
            onToggleWorkoutCompleted={handleToggleWorkoutCompleted}
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
      />

      {/* MODAL 3: ATHLETE PROFILE & GEAR VAULT */}
      <AthleteProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={athleteProfile}
        gearList={gearList}
        onUpdateProfile={(upd) => setAthleteProfile(upd)}
        onUpdateGear={(upd) => setGearList(upd)}
      />

      {/* MODAL 4: AI BASE TRAINING PLAN BUILDER */}
      <AIBasePlanModal
        isOpen={isAIBasePlanOpen}
        onClose={() => setIsAIBasePlanOpen(false)}
        athleteProfile={athleteProfile}
        currentCTL={pmcMetrics[pmcMetrics.length - 1]?.ctl || 58}
        onApplyPlanToCalendar={handleApplyAIBasePlan}
      />
    </div>
  );
}
