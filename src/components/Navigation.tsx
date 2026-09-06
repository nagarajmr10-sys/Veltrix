import React from 'react';
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
} from 'lucide-react';
import { AthleteProfile } from '../types';

export type NavTab = 'feed' | 'analytics' | 'challenges' | 'calendar' | 'plans';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenLiveRecord: () => void;
  onOpenProfile: () => void;
  onOpenAIBasePlan?: () => void;
  profile: AthleteProfile;
  missedWorkoutsCount?: number;
  onOpenMissedWorkoutsAlert?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenLiveRecord,
  onOpenProfile,
  onOpenAIBasePlan,
  profile,
  missedWorkoutsCount = 0,
  onOpenMissedWorkoutsAlert,
}) => {
  const wKg = (profile.ftpWatts / profile.weightKg).toFixed(1);

  const navItems = [
    { id: 'feed' as NavTab, label: 'Activity Feed', icon: Activity },
    { id: 'analytics' as NavTab, label: 'Performance & PMC', icon: BarChart3 },
    { id: 'challenges' as NavTab, label: 'Challenges & KOMs', icon: Trophy },
    { id: 'calendar' as NavTab, label: 'Training Calendar', icon: Calendar, badge: missedWorkoutsCount },
    { id: 'plans' as NavTab, label: 'Training Plans', icon: ShoppingBag },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <div
            onClick={() => onTabChange('feed')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
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

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 transition relative ${
                    isActive
                      ? 'bg-neutral-800 text-orange-400 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
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
        <div className="flex items-center gap-2.5">
          {/* Missed Workout Alert Header Button */}
          {missedWorkoutsCount > 0 && onOpenMissedWorkoutsAlert && (
            <button
              id="nav-missed-workout-alert-btn"
              onClick={onOpenMissedWorkoutsAlert}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold transition shadow-sm"
              title={`${missedWorkoutsCount} missed workout${missedWorkoutsCount > 1 ? 's' : ''} require attention`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Missed Workout</span>
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
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700/80 hover:border-orange-500/60 text-neutral-200 hover:text-orange-400 text-xs font-bold transition shadow-sm"
              title="Generate AI Base Training Plan"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>AI Base Plan</span>
            </button>
          )}

          {/* Main Record Activity Trigger */}
          <button
            id="main-record-btn"
            onClick={onOpenLiveRecord}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/25 transition active:scale-95"
          >
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <Radio className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Record Activity</span>
            <span className="sm:hidden">Record</span>
          </button>

          {/* Athlete Profile Badge */}
          <button
            id="athlete-profile-button"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition"
            title="View Athlete Profile & Gear"
          >
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-7 h-7 rounded-lg object-cover"
            />
            <div className="hidden lg:block text-left text-xs font-mono">
              <div className="font-bold text-white leading-none truncate max-w-[100px]">{profile.name}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">{profile.ftpWatts}W · {wKg} W/kg</div>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition relative ${
                isActive ? 'text-orange-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4 mb-0.5" />
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
