import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Zap,
  Heart,
  Shield,
  Plus,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  CreditCard,
  Receipt,
  ExternalLink,
  Wrench,
  Trash2,
  RotateCcw,
  RefreshCw,
  Sliders,
  CheckCircle,
  Clock,
  Info,
  Layers,
  Link2,
  Unlink,
  Copy,
  ChevronRight,
  Bike,
  Activity as ActivityIcon,
  Award,
  Calendar,
  Radio,
} from 'lucide-react';
import { AthleteProfile, GearItem, GearCategory, Activity, Segment } from '../../types';
import { DeviceIntegrationsSection } from '../Devices/DeviceIntegrationsSection';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AthleteProfile;
  gearList: GearItem[];
  onUpdateProfile: (updated: AthleteProfile) => void;
  onUpdateGear: (updated: GearItem[]) => void;
  onOpenPayment?: () => void;
  onImportStravaData?: (activities: Activity[], segments: Segment[]) => void;
  onImportActivity?: (activity: Activity) => void;
  initialTab?: ModalTab;
}

type ModalTab = 'gear' | 'integrations' | 'biometrics' | 'billing';

const CATEGORY_DEFAULT_INTERVALS: Record<GearCategory, { intervalKm: number; milestoneName: string; label: string }> = {
  chain: { intervalKm: 2800, milestoneName: '0.5% elongation / wear check', label: 'Chain & Drivetrain' },
  tires: { intervalKm: 3500, milestoneName: 'Tread wear indicator inspection', label: 'Tires & Tubeless' },
  cassette: { intervalKm: 7500, milestoneName: 'Sprocket wear / tooth profile check', label: 'Cassette' },
  shoes: { intervalKm: 650, milestoneName: 'Midsole compression & foam retirement', label: 'Running Shoes' },
  bike: { intervalKm: 6000, milestoneName: 'Complete bearing & fork lower overhaul', label: 'Complete Bicycle' },
  power_meter: { intervalKm: 10000, milestoneName: 'Zero-offset & coin-cell replacement', label: 'Power Meter' },
  watch: { intervalKm: 15000, milestoneName: 'Barometric sensor calibration', label: 'GPS Sport Watch' },
  components: { intervalKm: 4000, milestoneName: 'General bolt torque & wear check', label: 'Components' },
};

export const AthleteProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  gearList,
  onUpdateProfile,
  onUpdateGear,
  onOpenPayment,
  onImportStravaData,
  onImportActivity,
  initialTab = 'gear',
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Biometrics State
  const [ftp, setFtp] = useState(profile.ftpWatts);
  const [lthr, setLthr] = useState(profile.lthr);
  const [maxHr, setMaxHr] = useState(profile.maxHeartRate);
  const [restingHr, setRestingHr] = useState(profile.restingHeartRate);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [vo2Max, setVo2Max] = useState(profile.vo2Max);
  const [weeklyGoalKm, setWeeklyGoalKm] = useState(profile.weeklyGoalKm);

  // Gear Vault State
  const [gearFilter, setGearFilter] = useState<'all' | 'alerts' | 'chain' | 'bike' | 'shoes' | 'tires'>('all');
  const [isAddingGear, setIsAddingGear] = useState(false);
  const [newGearName, setNewGearName] = useState('');
  const [newGearCategory, setNewGearCategory] = useState<GearCategory>('chain');
  const [newGearBrandModel, setNewGearBrandModel] = useState('');
  const [newGearCurrentKm, setNewGearCurrentKm] = useState(0);
  const [newGearIntervalKm, setNewGearIntervalKm] = useState(CATEGORY_DEFAULT_INTERVALS.chain.intervalKm);
  const [newGearMilestoneName, setNewGearMilestoneName] = useState(CATEGORY_DEFAULT_INTERVALS.chain.milestoneName);
  const [newGearNotes, setNewGearNotes] = useState('');
  const [serviceActionSuccess, setServiceActionSuccess] = useState<string | null>(null);

  // Strava Integration State
  const [isConnectingStrava, setIsConnectingStrava] = useState(false);
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);
  const [stravaSyncFeedback, setStravaSyncFeedback] = useState<string | null>(null);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [stravaAuthUrl, setStravaAuthUrl] = useState<string>('');
  const [stravaRedirectUri, setStravaRedirectUri] = useState<string>('');

  const currentDevUrl = 'https://ais-dev-vvpbmeam4xpfh3g6gv6nmm-224099897864.asia-southeast1.run.app/auth/strava/callback';
  const currentSharedUrl = 'https://ais-pre-vvpbmeam4xpfh3g6gv6nmm-224099897864.asia-southeast1.run.app/auth/strava/callback';

  // Load Strava URL metadata
  useEffect(() => {
    fetch('/api/strava/auth-url')
      .then((res) => res.json())
      .then((data) => {
        if (data.url) setStravaAuthUrl(data.url);
        if (data.redirectUri) setStravaRedirectUri(data.redirectUri);
      })
      .catch(() => {
        // Fallback default
        setStravaRedirectUri(currentDevUrl);
      });
  }, []);

  // Listen for Strava OAuth popup postMessage
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      // Validate origin if applicable
      if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
        const authCode = event.data.code;
        await triggerStravaSync(authCode);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [profile]);

  if (!isOpen) return null;

  const wattsPerKg = (ftp / weightKg).toFixed(2);

  // Compute Service Milestones & Alerts for Gear Vault
  const gearWithMetrics = gearList.map((item) => {
    const wearPct = Math.round((item.distanceKm / (item.maxDistanceKm || 1000)) * 100);
    const isOverdue = wearPct >= 100;
    const isDueSoon = wearPct >= 85 && wearPct < 100;
    const isMonitor = wearPct >= 70 && wearPct < 85;

    let badgeStatus: 'optimal' | 'monitor' | 'due' | 'overdue' = 'optimal';
    let badgeText = 'Optimal';
    let badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

    if (isOverdue) {
      badgeStatus = 'overdue';
      badgeText = `Service Overdue (${wearPct}%)`;
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    } else if (isDueSoon) {
      badgeStatus = 'due';
      badgeText = `Service Due Soon (${wearPct}%)`;
      badgeColor = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    } else if (isMonitor) {
      badgeStatus = 'monitor';
      badgeText = `Monitor Wear (${wearPct}%)`;
      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }

    return {
      ...item,
      wearPct,
      isOverdue,
      isDueSoon,
      isMonitor,
      badgeStatus,
      badgeText,
      badgeColor,
    };
  });

  const overdueItems = gearWithMetrics.filter((g) => g.isOverdue);
  const dueSoonItems = gearWithMetrics.filter((g) => g.isDueSoon);
  const totalServiceNeeded = overdueItems.length + dueSoonItems.length;

  const filteredGear = gearWithMetrics.filter((item) => {
    if (gearFilter === 'alerts') return item.isOverdue || item.isDueSoon;
    if (gearFilter === 'chain') return item.type === 'chain' || item.type === 'cassette';
    if (gearFilter === 'bike') return item.type === 'bike';
    if (gearFilter === 'shoes') return item.type === 'shoes';
    if (gearFilter === 'tires') return item.type === 'tires';
    return true;
  });

  // Gear Handlers
  const handleCategoryChange = (cat: GearCategory) => {
    setNewGearCategory(cat);
    const def = CATEGORY_DEFAULT_INTERVALS[cat];
    if (def) {
      setNewGearIntervalKm(def.intervalKm);
      setNewGearMilestoneName(def.milestoneName);
    }
  };

  const handleAddNewItem = () => {
    if (!newGearName.trim()) return;

    const newItem: GearItem = {
      id: `gear-${Date.now()}`,
      name: newGearName.trim(),
      type: newGearCategory,
      brandModel: newGearBrandModel.trim() || 'Custom Specification',
      distanceKm: Math.max(0, Number(newGearCurrentKm) || 0),
      maxDistanceKm: Math.max(100, Number(newGearIntervalKm) || 2500),
      isRetired: false,
      serviceMilestoneName: newGearMilestoneName.trim() || 'Standard service milestone',
      serviceIntervalKm: Number(newGearIntervalKm) || 2500,
      notes: newGearNotes.trim() || undefined,
      lastServiceDate: new Date().toISOString().split('T')[0],
    };

    const updated = [newItem, ...gearList];
    onUpdateGear(updated);

    // Reset Form
    setNewGearName('');
    setNewGearBrandModel('');
    setNewGearCurrentKm(0);
    setNewGearNotes('');
    setIsAddingGear(false);

    setServiceActionSuccess(`Added "${newItem.name}" to your Gear Vault.`);
    setTimeout(() => setServiceActionSuccess(null), 4000);
  };

  const handleRemoveItem = (gearId: string, gearName: string) => {
    const updated = gearList.filter((g) => g.id !== gearId);
    onUpdateGear(updated);
    setServiceActionSuccess(`Removed "${gearName}" from Gear Vault.`);
    setTimeout(() => setServiceActionSuccess(null), 3000);
  };

  const handleResetServiceMileage = (gearId: string, gearName: string) => {
    const updated = gearList.map((g) => {
      if (g.id === gearId) {
        return {
          ...g,
          distanceKm: 0,
          lastServiceDate: new Date().toISOString().split('T')[0],
        };
      }
      return g;
    });
    onUpdateGear(updated);
    setServiceActionSuccess(`Logged fresh service for "${gearName}". Distance reset to 0 km.`);
    setTimeout(() => setServiceActionSuccess(null), 4000);
  };

  // Strava Handlers
  const triggerStravaSync = async (authCode?: string) => {
    setIsSyncingStrava(true);
    setStravaError(null);
    setStravaSyncFeedback('Connecting to Strava API and retrieving activities & segments...');

    try {
      const response = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: authCode || 'demo_auth_code',
          athleteId: profile.stravaIntegration?.athleteId || 'strava-8841',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to synchronize with Strava API');
      }

      const data = await response.json();

      // Update Profile with connected state
      const updatedProfile: AthleteProfile = {
        ...profile,
        stravaIntegration: {
          isConnected: true,
          athleteId: data.athlete?.id || 'strava-ath-8841',
          athleteName: data.athlete?.name || profile.name,
          athleteUsername: data.athlete?.username || 'arivera_velo',
          profileUrl: 'https://www.strava.com/athletes/8841',
          connectedAt: new Date().toISOString(),
          lastSyncAt: data.syncedAt || new Date().toISOString(),
          syncedActivitiesCount: (profile.stravaIntegration?.syncedActivitiesCount || 0) + (data.syncedActivitiesCount || 3),
          syncedSegmentsCount: (profile.stravaIntegration?.syncedSegmentsCount || 0) + (data.syncedSegmentsCount || 2),
          autoSync: true,
          syncStatus: 'synced',
        },
      };

      onUpdateProfile(updatedProfile);

      // Push imported activities and segments to App state if handler provided
      if (onImportStravaData && data.importedActivities && data.importedSegments) {
        onImportStravaData(data.importedActivities, data.importedSegments);
      }

      setStravaSyncFeedback(
        `Import complete: ${data.syncedActivitiesCount} activities & ${data.syncedSegmentsCount} verified segments synchronized from Strava.`
      );
    } catch (err: any) {
      console.error('Strava sync error:', err);
      setStravaError(err.message || 'Error communicating with Strava');
    } finally {
      setIsSyncingStrava(false);
      setIsConnectingStrava(false);
    }
  };

  const handleOpenStravaOAuth = () => {
    setIsConnectingStrava(true);
    setStravaError(null);

    // Open popup
    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const targetUrl = stravaAuthUrl || `https://www.strava.com/oauth/authorize?client_id=148291&response_type=code&redirect_uri=${encodeURIComponent(currentDevUrl)}&scope=read,activity:read_all,profile:read_all`;

    const popup = window.open(
      targetUrl,
      'strava_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Fallback if browser blocked popup: offer direct instant sync
      setStravaError('Popup blocked by browser. You can click "Instant Sync (Demo)" to synchronize immediately.');
      setIsConnectingStrava(false);
    }
  };

  const handleDisconnectStrava = async () => {
    try {
      await fetch('/api/strava/disconnect', { method: 'POST' });
    } catch {
      // ignore
    }
    const updatedProfile: AthleteProfile = {
      ...profile,
      stravaIntegration: {
        isConnected: false,
        syncedActivitiesCount: 0,
        syncedSegmentsCount: 0,
        syncStatus: 'idle',
      },
    };
    onUpdateProfile(updatedProfile);
    setStravaSyncFeedback('Strava account disconnected.');
    setTimeout(() => setStravaSyncFeedback(null), 3000);
  };

  const handleSaveProfileBiometrics = () => {
    onUpdateProfile({
      ...profile,
      ftpWatts: ftp,
      lthr,
      maxHeartRate: maxHr,
      restingHeartRate: restingHr,
      weightKg,
      vo2Max,
      weeklyGoalKm,
    });
    setServiceActionSuccess('Biometric benchmarks and training zones updated.');
    setTimeout(() => setServiceActionSuccess(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div
      id="athlete-profile-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/50 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{profile.name}</h2>
                {profile.isPro && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-gradient-to-r from-amber-400 to-orange-400 text-black uppercase shadow-xs">
                    PRO
                  </span>
                )}
                {profile.stravaIntegration?.isConnected && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                    <ActivityIcon className="w-2.5 h-2.5" />
                    Strava Linked
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                {profile.handle} · {profile.location}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800/60 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Feedback Toast */}
        {serviceActionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-md">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{serviceActionSuccess}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-neutral-800/80 bg-neutral-900/30 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('gear')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'gear'
                ? 'border-orange-500 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Wrench className="w-4 h-4 text-orange-400" />
            <span>Gear Vault</span>
            {totalServiceNeeded > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-orange-500 text-black">
                {totalServiceNeeded}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'integrations'
                ? 'border-orange-500 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Devices & Ecosystems</span>
            {(profile.platformIntegrations?.filter((p) => p.isConnected).length || 0) > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {(profile.platformIntegrations?.filter((p) => p.isConnected).length || 0) +
                  (profile.hardwareSensors?.filter((s) => s.isConnected).length || 0)} Connected
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-neutral-800 text-neutral-400">
                Integrations
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('biometrics')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'biometrics'
                ? 'border-orange-500 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Biometrics & Zones</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'billing'
                ? 'border-orange-500 text-white bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Membership & Billing</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ======================================================== */}
          {/* TAB 1: GEAR VAULT & COMPONENT SERVICE MILESTONES        */}
          {/* ======================================================== */}
          {activeTab === 'gear' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Automated Service Notification Banner if mileage milestones reached */}
              {totalServiceNeeded > 0 ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-orange-950/40 border border-orange-500/40 shadow-xl">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">Automated Gear Maintenance Alerts</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                          {totalServiceNeeded} {totalServiceNeeded === 1 ? 'Item' : 'Items'} Due
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                        Component mileage milestones reached. Inspect chains, tires, or running foam to prevent drivetrain wear or loss of compliance:
                      </p>

                      <div className="mt-3 space-y-2">
                        {overdueItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-lg bg-neutral-950/80 border border-rose-500/30 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                              <strong className="text-white">{item.name}:</strong>
                              <span className="text-rose-400 font-bold">
                                {item.distanceKm} / {item.maxDistanceKm} km ({item.wearPct}%)
                              </span>
                              <span className="text-neutral-400 hidden sm:inline">· {item.serviceMilestoneName}</span>
                            </div>
                            <button
                              onClick={() => handleResetServiceMileage(item.id, item.name)}
                              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset to 0 km
                            </button>
                          </div>
                        ))}

                        {dueSoonItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-lg bg-neutral-950/80 border border-orange-500/30 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                              <strong className="text-white">{item.name}:</strong>
                              <span className="text-orange-400 font-bold">
                                {item.distanceKm} / {item.maxDistanceKm} km ({item.wearPct}%)
                              </span>
                              <span className="text-neutral-400 hidden sm:inline">· {item.serviceMilestoneName}</span>
                            </div>
                            <button
                              onClick={() => handleResetServiceMileage(item.id, item.name)}
                              className="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Log Service
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">All Equipment In Optimal Range</h4>
                      <p className="text-[11px] text-neutral-400">
                        No components have crossed their wear or replacement intervals.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold">
                    100% Service Ready
                  </span>
                </div>
              )}

              {/* Controls Bar: Filter Tabs & Add New Item Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                  <button
                    onClick={() => setGearFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      gearFilter === 'all'
                        ? 'bg-orange-500 text-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    All ({gearList.length})
                  </button>
                  <button
                    onClick={() => setGearFilter('alerts')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 ${
                      gearFilter === 'alerts'
                        ? 'bg-orange-500 text-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    <span>Service Alerts</span>
                    {totalServiceNeeded > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                        {totalServiceNeeded}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setGearFilter('chain')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      gearFilter === 'chain'
                        ? 'bg-orange-500 text-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Chains
                  </button>
                  <button
                    onClick={() => setGearFilter('tires')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      gearFilter === 'tires'
                        ? 'bg-orange-500 text-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Tires
                  </button>
                  <button
                    onClick={() => setGearFilter('bike')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      gearFilter === 'bike'
                        ? 'bg-orange-500 text-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Bikes
                  </button>
                  <button
                    onClick={() => setGearFilter('shoes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      gearFilter === 'shoes'
                        ? 'bg-orange-500 text-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Shoes
                  </button>
                </div>

                <button
                  onClick={() => setIsAddingGear(!isAddingGear)}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition shrink-0"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>{isAddingGear ? 'Close Form' : 'Add New Item'}</span>
                </button>
              </div>

              {/* Add New Gear Inline Panel */}
              {isAddingGear && (
                <div className="p-4 rounded-2xl bg-neutral-900 border border-orange-500/40 space-y-4 shadow-xl animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Wrench className="w-4 h-4 text-orange-400" />
                      <span>Register New Gear Item or Component</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">Custom Mileage Thresholds</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400 font-medium">Item Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Shimano Dura-Ace CN-M9100 Chain"
                        value={newGearName}
                        onChange={(e) => setNewGearName(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 font-medium">Category / Component Type</label>
                      <select
                        value={newGearCategory}
                        onChange={(e) => handleCategoryChange(e.target.value as GearCategory)}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="chain">Chain & Drivetrain</option>
                        <option value="tires">Tires & Tubeless</option>
                        <option value="cassette">Cassette</option>
                        <option value="bike">Complete Bicycle</option>
                        <option value="shoes">Running Shoes</option>
                        <option value="power_meter">Power Meter</option>
                        <option value="watch">GPS Sport Watch</option>
                        <option value="components">Other Components</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 font-medium">Brand & Model / Spec</label>
                      <input
                        type="text"
                        placeholder="e.g. SILCA Hot Melt Wax / 12-Speed"
                        value={newGearBrandModel}
                        onChange={(e) => setNewGearBrandModel(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 font-medium">
                        Service Milestone Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Chain replacement (0.5% wear)"
                        value={newGearMilestoneName}
                        onChange={(e) => setNewGearMilestoneName(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 font-medium">Current Mileage (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={newGearCurrentKm}
                        onChange={(e) => setNewGearCurrentKm(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 font-medium">
                        Service / Replacement Threshold (km) *
                      </label>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        value={newGearIntervalKm}
                        onChange={(e) => setNewGearIntervalKm(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 font-medium">Maintenance Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Clean and rewax every 300km; replace quick-link on disassembly"
                      value={newGearNotes}
                      onChange={(e) => setNewGearNotes(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingGear(false)}
                      className="px-3.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewItem}
                      disabled={!newGearName.trim()}
                      className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Save to Vault
                    </button>
                  </div>
                </div>
              )}

              {/* Gear List Cards */}
              <div className="space-y-3">
                {filteredGear.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-neutral-900/30 border border-neutral-800">
                    <Wrench className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                    <p className="text-xs text-neutral-400">No items found matching the selected filter.</p>
                  </div>
                ) : (
                  filteredGear.map((g) => {
                    return (
                      <div
                        key={g.id}
                        className={`p-4 rounded-xl border transition-all ${
                          g.isOverdue
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : g.isDueSoon
                            ? 'bg-orange-950/20 border-orange-500/40'
                            : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{g.name}</h4>
                              {/* Visual Service Due Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${g.badgeColor}`}
                              >
                                {g.isOverdue ? (
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                ) : g.isDueSoon ? (
                                  <Clock className="w-3 h-3 text-orange-400" />
                                ) : (
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                )}
                                <span>{g.badgeText}</span>
                              </span>
                            </div>

                            <div className="text-xs text-neutral-400 font-mono">
                              {g.brandModel}
                              {g.serviceMilestoneName && (
                                <span className="text-neutral-500"> · Interval: {g.serviceMilestoneName}</span>
                              )}
                            </div>

                            {g.notes && (
                              <p className="text-[11px] text-neutral-400 italic pt-0.5">{g.notes}</p>
                            )}

                            {g.lastServiceDate && (
                              <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 pt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>Last service logged: {g.lastServiceDate}</span>
                              </div>
                            )}
                          </div>

                          {/* Progress & Mileage Gauge */}
                          <div className="sm:w-64 space-y-1.5 shrink-0">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-neutral-400">
                                {g.distanceKm} / {g.maxDistanceKm} km
                              </span>
                              <span
                                className={
                                  g.isOverdue
                                    ? 'text-rose-400 font-black'
                                    : g.isDueSoon
                                    ? 'text-orange-400 font-bold'
                                    : 'text-neutral-300'
                                }
                              >
                                {g.wearPct}%
                              </span>
                            </div>

                            {/* Gauge Bar */}
                            <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  g.isOverdue
                                    ? 'bg-rose-500'
                                    : g.isDueSoon
                                    ? 'bg-orange-500'
                                    : g.isMonitor
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, g.wearPct)}%` }}
                              />
                            </div>

                            {/* Actions on Item: Reset mileage & Remove Item */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => handleResetServiceMileage(g.id, g.name)}
                                title="Reset mileage to 0 km after performing maintenance or replacing item"
                                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono font-semibold flex items-center gap-1 transition"
                              >
                                <RotateCcw className="w-3 h-3 text-orange-400" />
                                <span>Reset Km</span>
                              </button>

                              <button
                                onClick={() => handleRemoveItem(g.id, g.name)}
                                title="Remove item from Gear Vault"
                                className="p-1 rounded bg-neutral-800/60 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 border border-neutral-800 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DEVICES, PLATFORMS & SENSORS COCKPIT             */}
          {/* ======================================================== */}
          {activeTab === 'integrations' && (
            <div className="animate-fadeIn">
              <DeviceIntegrationsSection
                profile={profile}
                onUpdateProfile={onUpdateProfile}
                onImportActivity={onImportActivity}
                onImportStravaData={onImportStravaData}
                onShowFeedbackToast={(msg) => {
                  setServiceActionSuccess(msg);
                  setTimeout(() => setServiceActionSuccess(null), 3000);
                }}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: BIOMETRICS & THRESHOLDS                           */}
          {/* ======================================================== */}
          {activeTab === 'biometrics' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  Endurance Thresholds & Physiological Benchmarks
                </h3>
                <span className="text-xs font-mono text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                  Power-to-Weight: <strong className="text-amber-400">{wattsPerKg} W/kg</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <label className="text-[11px] text-neutral-400 font-medium">FTP (Watts)</label>
                  <input
                    type="number"
                    value={ftp}
                    onChange={(e) => setFtp(Number(e.target.value))}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <label className="text-[11px] text-neutral-400 font-medium">LTHR (Lactate Threshold)</label>
                  <input
                    type="number"
                    value={lthr}
                    onChange={(e) => setLthr(Number(e.target.value))}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <label className="text-[11px] text-neutral-400 font-medium">Max Heart Rate (BPM)</label>
                  <input
                    type="number"
                    value={maxHr}
                    onChange={(e) => setMaxHr(Number(e.target.value))}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <label className="text-[11px] text-neutral-400 font-medium">Resting HR (BPM)</label>
                  <input
                    type="number"
                    value={restingHr}
                    onChange={(e) => setRestingHr(Number(e.target.value))}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <label className="text-[11px] text-neutral-400 font-medium">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800">
                  <label className="text-[11px] text-neutral-400 font-medium">VO2 Max (ml/kg/min)</label>
                  <input
                    type="number"
                    value={vo2Max}
                    onChange={(e) => setVo2Max(Number(e.target.value))}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800 sm:col-span-3">
                  <label className="text-[11px] text-neutral-400 font-medium">Weekly Distance Goal (km)</label>
                  <input
                    type="number"
                    value={weeklyGoalKm}
                    onChange={(e) => setWeeklyGoalKm(Number(e.target.value))}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfileBiometrics}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Biometrics
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: MEMBERSHIP & BILLING PORTAL                       */}
          {/* ======================================================== */}
          {activeTab === 'billing' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-amber-500/30 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          {profile.isPro ? 'Veltrix Pro Athlete Membership' : 'Free Athlete Tier'}
                        </h3>
                        {profile.isPro && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-amber-400 text-black uppercase">
                            Active PRO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5 font-mono">
                        {profile.isPro
                          ? `${profile.proTier || 'Annual Season Pass'} · Renews ${profile.proRenewalDate || '2027-05-15'}`
                          : 'Upgrade to unlock full Strava Satellite & Topo maps, unlimited AI training plans & analytics'}
                      </div>
                    </div>
                  </div>

                  {onOpenPayment && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPayment();
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition shrink-0"
                    >
                      <CreditCard className="w-4 h-4 text-black" />
                      <span>{profile.isPro ? 'Payment Gateway & Billing' : 'Upgrade to Pro ($79)'}</span>
                    </button>
                  )}
                </div>

                {/* Past Payment Receipts if any */}
                {profile.paymentReceipts && profile.paymentReceipts.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-neutral-800/80">
                    <div className="text-[11px] font-mono font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-amber-400" />
                      <span>Payment Receipts & Invoices</span>
                    </div>
                    <div className="space-y-1.5">
                      {profile.paymentReceipts.map((rec) => (
                        <div
                          key={rec.transactionId}
                          className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-xs font-mono"
                        >
                          <div>
                            <div className="text-white font-bold">{rec.itemDescription}</div>
                            <div className="text-[10px] text-neutral-400">
                              {new Date(rec.date).toLocaleDateString()} · {rec.transactionId} ·{' '}
                              {rec.cardBrand ? `${rec.cardBrand} •••• ${rec.cardLast4}` : rec.method}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-amber-400 font-bold">
                              ${rec.amount} {rec.currency}
                            </div>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] uppercase font-bold">
                              Paid
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <div className="text-[11px] font-mono text-neutral-500">
            {activeTab === 'gear' && `${gearList.length} total gear items tracked`}
            {activeTab === 'integrations' && (profile.stravaIntegration?.isConnected ? 'Strava Connected' : 'Strava Ready')}
            {activeTab === 'biometrics' && `${wattsPerKg} W/kg threshold`}
            {activeTab === 'billing' && (profile.isPro ? 'Pro Active' : 'Free Tier')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                handleSaveProfileBiometrics();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition"
            >
              <Check className="w-4 h-4" />
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
