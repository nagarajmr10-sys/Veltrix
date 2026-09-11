import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Trophy,
  Calendar,
  Radio,
  User,
  Zap,
  Flame,
  Plus,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  LogIn,
  UserPlus,
  LogOut,
  ChevronDown,
  CreditCard,
  Watch,
  Bot,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { AthleteProfile } from '../types';
import { GPSBottomCenterSection } from './LiveTracker/GPSBottomCenterSection';

export type NavTab = 'feed' | 'analytics' | 'challenges' | 'calendar' | 'plans' | 'ai_coach';

export interface NavItemDef {
  id: NavTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isAi?: boolean;
}

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenLiveRecord: () => void;
  onOpenProfile: (tab?: 'gear' | 'integrations' | 'biometrics' | 'billing' | 'account') => void;
  onOpenAIBasePlan?: () => void;
  onOpenPayment?: () => void;
  profile: AthleteProfile;
  missedWorkoutsCount?: number;
  onOpenMissedWorkoutsAlert?: () => void;
  isAuthenticated?: boolean;
  onOpenSignIn?: () => void;
  onOpenSignUp?: () => void;
  onSignOut?: () => void;
  onOpenAccountSection?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenLiveRecord,
  onOpenProfile,
  onOpenAIBasePlan,
  onOpenPayment,
  profile,
  missedWorkoutsCount = 0,
  onOpenMissedWorkoutsAlert,
  isAuthenticated = true,
  onOpenSignIn,
  onOpenSignUp,
  onSignOut,
  onOpenAccountSection,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const wKg = (profile.ftpWatts / profile.weightKg).toFixed(1);

  const leftNavItems: NavItemDef[] = [
    { id: 'feed', label: 'Activity Feed', mobileLabel: 'Feed', icon: Activity },
    { id: 'analytics', label: 'Performance & Training', mobileLabel: 'Analytics', icon: BarChart3 },
    { id: 'ai_coach', label: 'AI Coach', mobileLabel: 'AI Coach', icon: Bot, isAi: true },
  ];

  const rightNavItems: NavItemDef[] = [
    { id: 'challenges', label: 'Challenges & KOMs', mobileLabel: 'KOMs', icon: Trophy },
    { id: 'calendar', label: 'Training Calendar', mobileLabel: 'Calendar', icon: Calendar, badge: missedWorkoutsCount },
    { id: 'plans', label: 'Training Plans', mobileLabel: 'Plans', icon: ShoppingBag },
  ];

  const allNavItems: NavItemDef[] = [...leftNavItems, ...rightNavItems];

  const renderNavTabButton = (item: NavItemDef) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        id={`nav-link-${item.id}`}
        onClick={() => onTabChange(item.id)}
        className={`relative flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-h-[48px] min-w-[44px] sm:min-w-[56px] px-1 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold tracking-wide transition select-none group touch-manipulation active:scale-95 flex-1 sm:flex-initial ${
          isActive
            ? 'bg-neutral-900 text-orange-400 border border-orange-500/30 shadow-md shadow-orange-500/10'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-transparent'
        }`}
        title={item.label}
        aria-label={item.label}
      >
        {/* Active Indicator Top Accent Bar */}
        {isActive && (
          <span className="absolute -top-1 sm:-top-2 left-1/2 -translate-x-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
        )}

        <div className="relative flex items-center justify-center">
          <Icon
            className={`w-5 h-5 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
              isActive ? 'text-orange-400' : 'text-neutral-400 group-hover:text-neutral-200'
            }`}
          />
          {Boolean(item.badge && item.badge > 0) && (
            <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-amber-400 text-black text-[9px] font-mono font-bold animate-pulse leading-none shadow-sm">
              {item.badge}
            </span>
          )}
        </div>

        <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight whitespace-nowrap">
          <span className="sm:hidden">{item.mobileLabel}</span>
          <span className="hidden sm:inline">{item.label}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Top Cockpit Header: Brand Logo & Cockpit Controls */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Desktop Navigation */}
          <div className="flex items-center gap-6 xl:gap-8">
            <div
              onClick={() => onTabChange('feed')}
              className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-0.5 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition">
                <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500 group-hover:text-orange-400 transition" />
                </div>
              </div>
              <div>
                <span className="text-xl font-black tracking-wider text-white font-mono flex items-center gap-1">
                  VELTRIX
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                </span>
                <span className="block text-[9px] font-mono tracking-widest text-neutral-400 -mt-1 uppercase">
                  Endurance Intelligence
                </span>
              </div>
            </div>

            {/* Desktop Nav Links in Header */}
            <nav className="hidden lg:flex items-center gap-1">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={`top-${item.id}`}
                    id={`top-nav-link-${item.id}`}
                    onClick={() => onTabChange(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-1.5 transition relative select-none whitespace-nowrap ${
                      isActive
                        ? 'bg-neutral-800 text-orange-400 shadow-sm border border-neutral-700/80'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                    title={item.label}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-neutral-500'}`} />
                    <span>{item.label}</span>
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

        {/* Right Cockpit Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Missed Workout Alert Header Button */}
          {missedWorkoutsCount > 0 && onOpenMissedWorkoutsAlert && (
            <button
              id="nav-missed-workout-alert-btn"
              onClick={onOpenMissedWorkoutsAlert}
              className="flex items-center gap-1.5 min-h-[44px] px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold transition shadow-sm touch-manipulation active:scale-95"
              title={`${missedWorkoutsCount} missed workout${missedWorkoutsCount > 1 ? 's' : ''} require attention`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Missed</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[10px] font-black leading-none">
                {missedWorkoutsCount}
              </span>
            </button>
          )}

          {/* AI Base Training Plan Trigger */}
          {onOpenAIBasePlan && (
            <button
              id="nav-ai-base-plan-btn"
              onClick={onOpenAIBasePlan}
              className="hidden md:flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700/80 hover:border-orange-500/60 text-neutral-200 hover:text-orange-400 text-xs font-bold transition shadow-sm"
              title="Generate AI Base Training Plan"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>AI Base Plan</span>
            </button>
          )}

          {/* Veltrix Pro Membership / Payment Gateway Trigger */}
          {onOpenPayment && (
            <button
              id="nav-membership-pro-btn"
              onClick={onOpenPayment}
              className={`flex items-center gap-1.5 min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-mono font-bold transition shadow-sm touch-manipulation active:scale-95 ${
                profile.isPro
                  ? 'bg-neutral-900 border border-amber-500/40 text-amber-300 hover:bg-neutral-850 hover:border-amber-400'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black uppercase tracking-wider shadow-amber-500/20'
              }`}
              title={profile.isPro ? 'Manage Veltrix Pro Subscription & Billing' : 'Upgrade to Veltrix Pro ($79/yr)'}
            >
              <Sparkles className={`w-4 h-4 ${profile.isPro ? 'text-amber-400' : 'text-black'}`} />
              <span className="hidden sm:inline">{profile.isPro ? 'PRO ATHLETE' : 'PAYMENT GATEWAY'}</span>
              <span className="sm:hidden">{profile.isPro ? 'PRO' : 'PAY'}</span>
            </button>
          )}

          {/* Main Record Activity Trigger (Header) */}
          <button
            id="main-record-btn"
            onClick={onOpenLiveRecord}
            className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/25 transition active:scale-95 touch-manipulation"
          >
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <Radio className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Record Activity</span>
            <span className="sm:hidden">Record</span>
          </button>

          {/* Authentication State Buttons: Logged In vs Logged Out */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                id="athlete-profile-button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] p-1 sm:p-1.5 sm:pr-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition touch-manipulation active:scale-95"
                title="Athlete Account & Profile"
              >
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <div className="hidden lg:block text-left text-xs font-mono">
                  <div className="font-bold text-white leading-none truncate max-w-[90px]">{profile.name}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{profile.ftpWatts}W · {wKg} W/kg</div>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  id="user-profile-dropdown"
                  className="absolute right-0 mt-2 w-56 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-fade-in"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-neutral-800/80">
                    <div className="text-xs font-bold text-white truncate">{profile.name}</div>
                    <div className="text-[10px] font-mono text-neutral-400 truncate">{profile.handle || '@athlete'}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold">
                        {profile.ftpWatts}W FTP
                      </span>
                      {profile.isPro && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      id="nav-user-account-auth-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenAccountSection) {
                          onOpenAccountSection();
                        } else {
                          onOpenProfile('account');
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Sign In / Sign Out Section</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Auth
                      </span>
                    </button>

                    <button
                      id="nav-user-profile-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-2 transition"
                    >
                      <User className="w-4 h-4 text-neutral-400" />
                      <span>Athlete Profile & Gear Vault</span>
                    </button>

                    <button
                      id="nav-user-devices-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile('integrations');
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <Watch className="w-4 h-4 text-cyan-400" />
                        <span>Devices & Ecosystems</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        {(profile.platformIntegrations?.filter(p => p.isConnected).length || 0) + (profile.hardwareSensors?.filter(s => s.isConnected).length || 0)} Connected
                      </span>
                    </button>

                    {onOpenPayment && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenPayment();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-2 transition"
                      >
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <span>Payment Gateway & Billing</span>
                      </button>
                    )}

                    {onOpenSignIn && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSignIn();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-2 transition"
                      >
                        <LogIn className="w-4 h-4 text-sky-400" />
                        <span>Sign In / Switch Account</span>
                      </button>
                    )}

                    {onOpenSignUp && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSignUp();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-2 transition"
                      >
                        <UserPlus className="w-4 h-4 text-orange-400" />
                        <span>Sign Up New Athlete</span>
                      </button>
                    )}
                  </div>

                  {onSignOut && (
                    <div className="pt-1 border-t border-neutral-800/80">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {onOpenSignIn && (
                <button
                  id="nav-sign-in-btn"
                  onClick={onOpenSignIn}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition touch-manipulation active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-neutral-400" />
                  <span>Sign In</span>
                </button>
              )}
              {onOpenSignUp && (
                <button
                  id="nav-sign-up-btn"
                  onClick={onOpenSignUp}
                  className="hidden sm:flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-orange-400 text-xs font-mono font-bold transition touch-manipulation active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>

      {/* Universal Bottom Navigation Bar with Center GPS Record Section */}
      <nav
        id="bottom-app-navigation-bar"
        aria-label="Application Tabs"
        className="fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 border-t border-neutral-800/90 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-safe"
      >
        <div className="max-w-6xl mx-auto px-1 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between sm:justify-center sm:gap-2 md:gap-3 py-1 sm:py-1.5">
            {/* Left Nav Group: Feed, Analytics, AI Coach */}
            <div className="flex items-center justify-around flex-1 sm:flex-initial sm:gap-2 md:gap-3">
              {leftNavItems.map((item) => renderNavTabButton(item))}
            </div>

            {/* GPS RECORD SECTION AT THE BOTTOM CENTRE */}
            <div className="flex items-center justify-center px-1 sm:px-3 shrink-0 z-10">
              <GPSBottomCenterSection onOpenLiveRecord={onOpenLiveRecord} />
            </div>

            {/* Right Nav Group: Challenges, Calendar, Plans */}
            <div className="flex items-center justify-around flex-1 sm:flex-initial sm:gap-2 md:gap-3">
              {rightNavItems.map((item) => renderNavTabButton(item))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
