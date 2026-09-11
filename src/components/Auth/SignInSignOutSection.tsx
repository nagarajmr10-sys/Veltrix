import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeftRight,
  Copy,
  Check,
  Sparkles,
  KeyRound,
  Lock,
  User,
  Clock,
  Laptop,
  Radio,
  Zap,
  Flame,
  Activity,
  Award,
} from 'lucide-react';
import { AuthUser } from '../../types';

export const DEMO_AUTH_USERS: AuthUser[] = [
  {
    id: 'usr_alex_rivera',
    name: 'Alex Rivera',
    email: 'alex.rivera@endurance-veltrix.io',
    handle: '@alexrivera_velo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    ftpWatts: 285,
    weightKg: 68.5,
    isPro: true,
    proTier: 'Annual Season Pass',
    primarySport: 'cycling',
    location: 'Boulder, CO',
    token: 'tok_live_alex_session_001',
    memberSince: 'March 2024',
  },
  {
    id: 'usr_maya_lin',
    name: 'Maya Lin',
    email: 'maya.lin@trail-endurance.io',
    handle: '@mayaruns_ultra',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    ftpWatts: 240,
    weightKg: 58.0,
    isPro: true,
    proTier: 'Annual Season Pass',
    primarySport: 'running',
    location: 'Flagstaff, AZ',
    token: 'tok_live_maya_session_002',
    memberSince: 'January 2024',
  },
  {
    id: 'usr_marcus_vance',
    name: 'Marcus Vance',
    email: 'm.vance@tri-aero.com',
    handle: '@vance_triathlete',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    ftpWatts: 310,
    weightKg: 74.0,
    isPro: false,
    primarySport: 'gravel',
    location: 'Girona, Spain',
    token: 'tok_live_marcus_session_003',
    memberSince: 'June 2024',
  },
];

interface SignInSignOutSectionProps {
  currentUser: AuthUser | null;
  onSignOut: () => void;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onSwitchUser?: (user: AuthUser) => void;
  variant?: 'embedded' | 'card' | 'full';
  className?: string;
}

export const SignInSignOutSection: React.FC<SignInSignOutSectionProps> = ({
  currentUser,
  onSignOut,
  onOpenSignIn,
  onOpenSignUp,
  onSwitchUser,
  variant = 'card',
  className = '',
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleCopyToken = () => {
    if (currentUser?.token) {
      navigator.clipboard.writeText(currentUser.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const executeSignOut = () => {
    onSignOut();
    setShowSignOutConfirm(false);
    setFeedbackMessage('You have signed out of your Veltrix session. Running in Guest Mode.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleQuickSwitch = (demoUser: AuthUser) => {
    if (onSwitchUser) {
      onSwitchUser(demoUser);
      setFeedbackMessage(`Switched active athlete to ${demoUser.name}.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } else {
      onOpenSignIn();
    }
  };

  const wKg = currentUser && currentUser.weightKg > 0
    ? (currentUser.ftpWatts / currentUser.weightKg).toFixed(1)
    : '4.2';

  return (
    <section
      id="veltrix-sign-in-sign-out-section"
      className={`rounded-2xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-md overflow-hidden shadow-xl transition-all ${className}`}
    >
      {/* Section Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            {currentUser ? (
              <ShieldCheck className="w-4 h-4 text-orange-400" />
            ) : (
              <Lock className="w-4 h-4 text-neutral-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Authentication & Session Management</span>
              {currentUser ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Session
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Guest Mode
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              {currentUser
                ? `Authenticated as ${currentUser.name} (${currentUser.email})`
                : 'Sign in to synchronize training logs, PMC stress curves, and AI coaching.'}
            </p>
          </div>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                id="sign-in-section-switch-acc-btn"
                type="button"
                onClick={onOpenSignIn}
                className="px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 border border-neutral-700/60 transition"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Switch Account</span>
                <span className="sm:hidden">Switch</span>
              </button>

              {!showSignOutConfirm ? (
                <button
                  id="sign-in-section-sign-out-btn"
                  type="button"
                  onClick={() => setShowSignOutConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-mono font-bold flex items-center gap-1.5 border border-rose-500/30 transition shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-rose-950/40 p-1 rounded-xl border border-rose-500/40 animate-fade-in">
                  <span className="text-[11px] font-mono text-rose-300 font-bold px-1.5">Sign Out?</span>
                  <button
                    id="sign-in-section-confirm-sign-out-btn"
                    type="button"
                    onClick={executeSignOut}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-mono font-bold transition"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSignOutConfirm(false)}
                    className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-mono transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="sign-in-section-sign-in-btn"
                type="button"
                onClick={onOpenSignIn}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 border border-neutral-700 transition"
              >
                <LogIn className="w-3.5 h-3.5 text-orange-400" />
                <span>Sign In</span>
              </button>
              <button
                id="sign-in-section-sign-up-btn"
                type="button"
                onClick={onOpenSignUp}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-black" />
                <span>Register</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 space-y-6">
        {currentUser ? (
          /* =========================================================================
             SIGNED IN ATHLETE VIEW
             ========================================================================= */
          <div className="space-y-6">
            {/* Athlete Identity Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-500/40 shadow-lg"
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-white tracking-tight">{currentUser.name}</h4>
                    {currentUser.isPro && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-gradient-to-r from-amber-400 to-orange-400 text-black uppercase shadow-xs">
                        PRO ATHLETE
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {currentUser.primarySport?.toUpperCase() || 'CYCLING'}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{currentUser.handle}</span>
                    <span>•</span>
                    <span className="text-neutral-300">{currentUser.email}</span>
                    {currentUser.location && (
                      <>
                        <span>•</span>
                        <span>{currentUser.location}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                    <span className="text-orange-400 font-bold">
                      {currentUser.ftpWatts}W FTP
                    </span>
                    <span className="text-neutral-500">|</span>
                    <span className="text-neutral-300">
                      {currentUser.weightKg} kg ({wKg} W/kg)
                    </span>
                    <span className="text-neutral-500">|</span>
                    <span className="text-neutral-400">
                      Member since {currentUser.memberSince || '2024'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto">
                <button
                  id="sign-in-section-sign-out-btn-main"
                  type="button"
                  onClick={() => setShowSignOutConfirm(true)}
                  className="flex-1 sm:flex-initial w-full px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out Session</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="flex-1 sm:flex-initial w-full px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-2 transition"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Switch Athlete</span>
                </button>
              </div>
            </div>

            {/* Session Security & Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Token & Cryptographic Authentication */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-orange-400" />
                    Auth Session Token
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-neutral-300 bg-neutral-950 p-2 rounded-lg border border-neutral-800 truncate">
                  {currentUser.token || 'tok_live_session_vault_active'}
                </div>
                <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>HMAC-SHA256 Encrypted Bearer</span>
                </div>
              </div>

              {/* Ecosystem & Sync Status */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Cloud Sync Pipeline
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <p className="text-xs text-neutral-300">
                  Real-time PMC telemetry, Strava segments, and AI workouts linked.
                </p>
                <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  <span>Last synced just now</span>
                </div>
              </div>

              {/* Client & Device Environment */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-400 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-amber-400" />
                    Active Device
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Web Cockpit
                  </span>
                </div>
                <p className="text-xs text-neutral-300">
                  Chrome / WebKit client connected via secure HTTPS TLS 1.3
                </p>
                <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  <span>Storage: LocalStorage Vault</span>
                </div>
              </div>
            </div>

            {/* Quick Athlete Switcher (Convenient Profile Switching) */}
            <div className="pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-orange-400" />
                  Quick Account Switcher (Demo Athletes)
                </h5>
                <span className="text-[10px] font-mono text-neutral-500">1-click instant session change</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DEMO_AUTH_USERS.map((demo) => {
                  const isCurrent = demo.id === currentUser.id;
                  return (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => handleQuickSwitch(demo)}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-3 relative ${
                        isCurrent
                          ? 'bg-orange-500/10 border-orange-500/40 shadow-sm'
                          : 'bg-neutral-900/40 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <img
                        src={demo.avatar}
                        alt={demo.name}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-neutral-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{demo.name}</span>
                          {demo.isPro && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                              PRO
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 truncate">
                          {demo.ftpWatts}W FTP • {demo.primarySport}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             SIGNED OUT / GUEST VIEW
             ========================================================================= */
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-orange-950/20 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Guest Session
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    Data saved locally in this browser
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white tracking-tight">
                  Sign In to Unlock Full Endurance Intelligence
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Connect your account to synchronize multi-sport PMC stress metrics, Strava OAuth segments, Garmin/Wahoo device telemetry, AI base training plans, and gear maintenance trackers across all your devices.
                </p>
              </div>

              {/* Primary Sign In / Sign Up CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto shrink-0">
                <button
                  id="sign-in-section-cta-signin"
                  type="button"
                  onClick={onOpenSignIn}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 border border-neutral-700 shadow-sm transition"
                >
                  <LogIn className="w-4 h-4 text-orange-400" />
                  <span>Sign In</span>
                </button>
                <button
                  id="sign-in-section-cta-register"
                  type="button"
                  onClick={onOpenSignUp}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition"
                >
                  <UserPlus className="w-4 h-4 text-black" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Demo Sign In */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  1-Click Instant Sign In (Demo Profiles)
                </h5>
                <span className="text-[10px] font-mono text-neutral-500">No password required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DEMO_AUTH_USERS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleQuickSwitch(demo)}
                    className="p-3.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 text-left transition flex items-center gap-3 group shadow-xs"
                  >
                    <img
                      src={demo.avatar}
                      alt={demo.name}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 border border-neutral-700 group-hover:border-orange-500/50 transition"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-orange-400 transition truncate">
                          {demo.name}
                        </span>
                        {demo.isPro && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {demo.ftpWatts}W FTP • {demo.primarySport}
                      </div>
                      <div className="text-[10px] font-mono text-orange-400 flex items-center gap-1 mt-1">
                        <span>Sign in as {demo.name.split(' ')[0]}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800/80 text-xs">
              <div className="p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/60 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-neutral-200">End-to-End Encryption</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Your biometric zones and GPS coordinates remain private and secure.</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/60 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-neutral-200">Continuous Cloud Sync</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Seamless synchronization across mobile, browser cockpit, and bike computers.</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/60 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-neutral-200">AI Coach Training Continuity</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Preserve your custom periodized plans, fatigue recovery indices, and target goals.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
