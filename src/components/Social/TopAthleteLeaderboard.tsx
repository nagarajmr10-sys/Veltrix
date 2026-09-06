import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  Mountain,
  Flame,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Sparkles,
  Search,
  Users,
  CheckCircle2,
  Bike,
  Award,
  Globe,
  Compass,
  ArrowUpRight,
  Info,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  LeaderboardAthlete,
  LeaderboardMetricType,
  SportType,
  AthleteProfile,
  Activity,
} from '../../types';
import {
  INITIAL_LEADERBOARD_ATHLETES,
  calculateUserMonthlyLeaderboardStats,
} from '../../data/leaderboardData';

interface TopAthleteLeaderboardProps {
  currentProfile?: AthleteProfile;
  activities?: Activity[];
  onSelectAthlete?: (athlete: LeaderboardAthlete) => void;
}

export const TopAthleteLeaderboard: React.FC<TopAthleteLeaderboardProps> = ({
  currentProfile,
  activities = [],
  onSelectAthlete,
}) => {
  // State
  const [metricMode, setMetricMode] = useState<LeaderboardMetricType>('tss');
  const [sportFilter, setSportFilter] = useState<'all' | SportType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [proOnly, setProOnly] = useState(false);
  const [athletes, setAthletes] = useState<LeaderboardAthlete[]>(() => {
    if (!currentProfile) return INITIAL_LEADERBOARD_ATHLETES;
    const userStats = calculateUserMonthlyLeaderboardStats(activities, currentProfile);
    return INITIAL_LEADERBOARD_ATHLETES.map((a) => {
      if (a.isCurrentUser) {
        return {
          ...a,
          ...userStats,
        };
      }
      return a;
    });
  });

  const [selectedAthleteDetail, setSelectedAthleteDetail] = useState<LeaderboardAthlete | null>(null);

  // Sync with prop updates if userProfile changes
  useMemo(() => {
    if (currentProfile) {
      const userStats = calculateUserMonthlyLeaderboardStats(activities, currentProfile);
      setAthletes((prev) =>
        prev.map((a) => (a.isCurrentUser ? { ...a, ...userStats } : a))
      );
    }
  }, [currentProfile, activities]);

  // Give Kudos to an athlete
  const handleToggleKudos = (athleteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAthletes((prev) =>
      prev.map((a) => {
        if (a.id === athleteId) {
          const nextState = !a.hasUserKudoed;
          if (nextState) {
            confetti({
              particleCount: 25,
              spread: 45,
              origin: { y: 0.6 },
            });
          }
          return {
            ...a,
            hasUserKudoed: nextState,
            kudosCount: nextState ? a.kudosCount + 1 : a.kudosCount - 1,
          };
        }
        return a;
      })
    );
  };

  // Filtered & Sorted Athletes
  const sortedAthletes = useMemo(() => {
    let list = [...athletes];

    // Filter by sport
    if (sportFilter !== 'all') {
      list = list.filter((a) => a.primarySport === sportFilter);
    }

    // Filter Pro
    if (proOnly) {
      list = list.filter((a) => a.isPro);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.handle.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q) ||
          (a.team && a.team.toLowerCase().includes(q))
      );
    }

    // Sort by selected primary metric
    list.sort((a, b) => {
      if (metricMode === 'tss') {
        return b.monthlyTSS - a.monthlyTSS;
      } else {
        return b.monthlyElevationMeters - a.monthlyElevationMeters;
      }
    });

    return list;
  }, [athletes, metricMode, sportFilter, proOnly, searchQuery]);

  // Top 1 Reference values for percentage bars
  const maxTSS = useMemo(() => {
    return Math.max(...athletes.map((a) => a.monthlyTSS), 3200);
  }, [athletes]);

  const maxElevation = useMemo(() => {
    return Math.max(...athletes.map((a) => a.monthlyElevationMeters), 48000);
  }, [athletes]);

  // Find Current User Position
  const currentUserStanding = useMemo(() => {
    const userIndex = sortedAthletes.findIndex((a) => a.isCurrentUser);
    if (userIndex === -1) return null;
    const userAthlete = sortedAthletes[userIndex];
    const prevAthlete = userIndex > 0 ? sortedAthletes[userIndex - 1] : null;

    const tssGap = prevAthlete ? prevAthlete.monthlyTSS - userAthlete.monthlyTSS : 0;
    const eleGap = prevAthlete ? prevAthlete.monthlyElevationMeters - userAthlete.monthlyElevationMeters : 0;

    return {
      rank: userIndex + 1,
      totalRanked: sortedAthletes.length,
      athlete: userAthlete,
      prevAthlete,
      tssGap,
      eleGap,
    };
  }, [sortedAthletes]);

  // Podium (Top 3 of current filtered list)
  const podiumAthletes = useMemo(() => {
    return {
      first: sortedAthletes[0] || null,
      second: sortedAthletes[1] || null,
      third: sortedAthletes[2] || null,
    };
  }, [sortedAthletes]);

  return (
    <div id="top-athlete-leaderboard-root" className="space-y-6">
      {/* 1. Header Banner & League Status */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Global Athletic League · May 2026 Season</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Top Athlete Global Leaderboard</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 font-semibold hidden sm:inline">
                Live Division 1
              </span>
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Official worldwide standings ranked by cumulative Monthly Training Stress Score (<strong className="text-amber-400">TSS</strong>) and total vertical climbing (<strong className="text-amber-400">Elevation Gain</strong>). Compare endurance capacity with the world's most disciplined athletes.
            </p>
          </div>

          {/* Quick League Cumulative Telemetry */}
          <div className="grid grid-cols-2 gap-3 shrink-0 font-mono text-xs">
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" />
                <span>Ranked Athletes</span>
              </div>
              <div className="text-lg font-black text-white mt-1">14,820</div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Top 1% Tier</div>
            </div>

            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-orange-400" />
                <span>Season Window</span>
              </div>
              <div className="text-lg font-black text-white mt-1">24 Days</div>
              <div className="text-[10px] text-neutral-400 font-semibold mt-0.5">Until Season Lock</div>
            </div>
          </div>
        </div>

        {/* 2. Interactive Ranking Metric & Filter Toolbar */}
        <div className="mt-6 pt-5 border-t border-neutral-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Primary Metric Toggle (TSS vs Elevation Gain) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider mr-1">
              Rank By:
            </span>
            <div className="inline-flex p-1 bg-neutral-950 rounded-xl border border-neutral-800 shadow-inner text-xs font-mono font-bold">
              <button
                type="button"
                id="rank-metric-tss-btn"
                onClick={() => setMetricMode('tss')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  metricMode === 'tss'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Monthly TSS (Volume)</span>
              </button>

              <button
                type="button"
                id="rank-metric-elevation-btn"
                onClick={() => setMetricMode('elevation')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  metricMode === 'elevation'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Mountain className="w-3.5 h-3.5" />
                <span>Elevation Gain (m)</span>
              </button>
            </div>
          </div>

          {/* Secondary Filters (Sport, Pro, Search) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sport Selector */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
              {(['all', 'cycling', 'running', 'trail_running'] as const).map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSportFilter(sport)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                    sportFilter === sport
                      ? 'bg-neutral-800 text-amber-400 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {sport === 'all' ? 'All Sports' : sport.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Pro Only Toggle */}
            <button
              type="button"
              onClick={() => setProOnly(!proOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                proOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Pro Athletes</span>
            </button>

            {/* Search athlete */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search athlete, team, country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 text-xs font-mono focus:outline-none focus:border-amber-500 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. "Your Global Standing" Sticky Highlight Card */}
      {currentUserStanding && (
        <div
          id="current-user-standing-card"
          className="bg-neutral-900/95 border-2 border-orange-500/60 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={currentUserStanding.athlete.avatar}
                  alt={currentUserStanding.athlete.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-orange-500 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-orange-500 text-black text-[10px] font-mono font-black px-1.5 py-0.2 rounded shadow">
                  YOU
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                    Your Global Standing
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    TOP 1.8% WORLDWIDE
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <span>Rank #{currentUserStanding.rank}</span>
                  <span className="text-neutral-500 font-normal text-xs">of {currentUserStanding.totalRanked}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-0.5 ml-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+{currentUserStanding.athlete.rankChange || 2} this week</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Stats Snapshot */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-xs">
              <div className="bg-neutral-950/90 px-3 py-2 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Monthly TSS</span>
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {currentUserStanding.athlete.monthlyTSS.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">TSS</span>
                </div>
              </div>

              <div className="bg-neutral-950/90 px-3 py-2 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-amber-400" />
                  <span>Elevation Gain</span>
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {currentUserStanding.athlete.monthlyElevationMeters.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">m</span>
                </div>
              </div>

              <div className="bg-neutral-950/90 px-3 py-2 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Active Streak</span>
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {currentUserStanding.athlete.streakDays} <span className="text-[10px] text-neutral-500 font-normal">days</span>
                </div>
              </div>

              {currentUserStanding.prevAthlete && (
                <div className="hidden xl:block text-left text-[11px] text-neutral-300 font-mono border-l border-neutral-800 pl-4">
                  <div className="text-neutral-500">Gap to #{currentUserStanding.rank - 1} ({currentUserStanding.prevAthlete.name.split(' ')[0]}):</div>
                  <div className="text-orange-400 font-bold mt-0.5">
                    {metricMode === 'tss'
                      ? `+${currentUserStanding.tssGap} TSS needed`
                      : `+${currentUserStanding.eleGap.toLocaleString()}m climbing needed`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Podium Visual for Top 3 Leaders */}
      {sortedAthletes.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place Silver */}
          {podiumAthletes.second && (
            <div
              onClick={() => setSelectedAthleteDetail(podiumAthletes.second)}
              className="order-2 md:order-1 bg-gradient-to-b from-neutral-850 to-neutral-900 border border-neutral-700/80 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-500 transition cursor-pointer group shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-700 text-neutral-100 text-xs font-mono font-black flex items-center gap-1 shadow">
                    <span>🥈</span>
                    <span>2ND PLACE</span>
                  </span>
                  <span className="text-xl">{podiumAthletes.second.flagEmoji}</span>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={podiumAthletes.second.avatar}
                    alt={podiumAthletes.second.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-neutral-400 shadow-md group-hover:scale-105 transition"
                  />
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition">
                      {podiumAthletes.second.name}
                    </h3>
                    <div className="text-xs text-neutral-400 font-mono">{podiumAthletes.second.location}</div>
                    {podiumAthletes.second.team && (
                      <div className="text-[10px] text-neutral-500 truncate max-w-[170px]">
                        {podiumAthletes.second.team}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-neutral-300 italic line-clamp-1 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800">
                  "{podiumAthletes.second.recentHighlight}"
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Monthly TSS:</span>
                  </span>
                  <span className="font-black text-white text-sm">{podiumAthletes.second.monthlyTSS.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-amber-400" />
                    <span>Elevation:</span>
                  </span>
                  <span className="font-bold text-amber-300">+{podiumAthletes.second.monthlyElevationMeters.toLocaleString()}m</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span>{podiumAthletes.second.monthlyDistanceKm} km</span>
                  <span>{podiumAthletes.second.monthlyActiveHours} hrs</span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleKudos(podiumAthletes.second!.id, e)}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition ${
                      podiumAthletes.second.hasUserKudoed
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${podiumAthletes.second.hasUserKudoed ? 'fill-orange-500 text-orange-500' : ''}`} />
                    <span>{podiumAthletes.second.kudosCount}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place Gold Champion */}
          {podiumAthletes.first && (
            <div
              onClick={() => setSelectedAthleteDetail(podiumAthletes.first)}
              className="order-1 md:order-2 bg-gradient-to-b from-amber-950/50 via-neutral-900 to-neutral-900 border-2 border-amber-500/80 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-400 transition cursor-pointer group shadow-2xl relative md:-translate-y-2"
            >
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>LEAGUE LEADER</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-mono font-black flex items-center gap-1.5 shadow-lg">
                    <span>👑</span>
                    <span>1ST PLACE CHAMPION</span>
                  </span>
                  <span className="text-2xl">{podiumAthletes.first.flagEmoji}</span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="relative">
                    <img
                      src={podiumAthletes.first.avatar}
                      alt={podiumAthletes.first.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-xl group-hover:scale-105 transition"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black p-1 rounded-full shadow">
                      <Crown className="w-3 h-3" />
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-white text-lg group-hover:text-amber-400 transition flex items-center gap-1.5">
                      <span>{podiumAthletes.first.name}</span>
                      {podiumAthletes.first.isPro && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase bg-amber-400 text-black">
                          PRO
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-neutral-300 font-mono">{podiumAthletes.first.location}</div>
                    {podiumAthletes.first.team && (
                      <div className="text-xs text-amber-400/90 font-medium truncate max-w-[200px]">
                        {podiumAthletes.first.team}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-amber-200/90 italic bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20">
                  "{podiumAthletes.first.recentHighlight}"
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold">Monthly TSS:</span>
                  </span>
                  <span className="font-black text-amber-400 text-base">{podiumAthletes.first.monthlyTSS.toLocaleString()} TSS</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Mountain className="w-4 h-4 text-amber-400" />
                    <span className="font-bold">Elevation:</span>
                  </span>
                  <span className="font-black text-white text-sm">+{podiumAthletes.first.monthlyElevationMeters.toLocaleString()}m</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-300 pt-1">
                  <span>{podiumAthletes.first.monthlyDistanceKm} km</span>
                  <span>{podiumAthletes.first.monthlyActiveHours} hrs</span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleKudos(podiumAthletes.first!.id, e)}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                      podiumAthletes.first.hasUserKudoed
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${podiumAthletes.first.hasUserKudoed ? 'fill-orange-500 text-orange-500' : ''}`} />
                    <span>{podiumAthletes.first.kudosCount}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place Bronze */}
          {podiumAthletes.third && (
            <div
              onClick={() => setSelectedAthleteDetail(podiumAthletes.third)}
              className="order-3 bg-gradient-to-b from-neutral-850 to-neutral-900 border border-neutral-700/80 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-500 transition cursor-pointer group shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-900/60 text-amber-200 text-xs font-mono font-black flex items-center gap-1 shadow border border-amber-800/60">
                    <span>🥉</span>
                    <span>3RD PLACE</span>
                  </span>
                  <span className="text-xl">{podiumAthletes.third.flagEmoji}</span>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={podiumAthletes.third.avatar}
                    alt={podiumAthletes.third.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-700 shadow-md group-hover:scale-105 transition"
                  />
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition">
                      {podiumAthletes.third.name}
                    </h3>
                    <div className="text-xs text-neutral-400 font-mono">{podiumAthletes.third.location}</div>
                    {podiumAthletes.third.team && (
                      <div className="text-[10px] text-neutral-500 truncate max-w-[170px]">
                        {podiumAthletes.third.team}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-neutral-300 italic line-clamp-1 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800">
                  "{podiumAthletes.third.recentHighlight}"
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Monthly TSS:</span>
                  </span>
                  <span className="font-black text-white text-sm">{podiumAthletes.third.monthlyTSS.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-amber-400" />
                    <span>Elevation:</span>
                  </span>
                  <span className="font-bold text-amber-300">+{podiumAthletes.third.monthlyElevationMeters.toLocaleString()}m</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span>{podiumAthletes.third.monthlyDistanceKm} km</span>
                  <span>{podiumAthletes.third.monthlyActiveHours} hrs</span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleKudos(podiumAthletes.third!.id, e)}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition ${
                      podiumAthletes.third.hasUserKudoed
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${podiumAthletes.third.hasUserKudoed ? 'fill-orange-500 text-orange-500' : ''}`} />
                    <span>{podiumAthletes.third.kudosCount}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Complete Ranked Athletes Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Global Standings · Full Division Rankings
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              ({sortedAthletes.length} Athletes Ranked)
            </span>
          </div>

          <div className="text-xs font-mono text-neutral-400 flex items-center gap-3">
            <span>Primary Metric: <strong className="text-amber-400 uppercase">{metricMode === 'tss' ? 'Monthly TSS Volume' : 'Elevation Gain'}</strong></span>
            <span>·</span>
            <span>Updated: Live</span>
          </div>
        </div>

        {/* Table List View */}
        <div className="divide-y divide-neutral-800/80">
          {sortedAthletes.map((ath, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const tssPct = Math.min(100, Math.round((ath.monthlyTSS / maxTSS) * 100));
            const elePct = Math.min(100, Math.round((ath.monthlyElevationMeters / maxElevation) * 100));

            return (
              <div
                key={ath.id}
                onClick={() => {
                  setSelectedAthleteDetail(ath);
                  if (onSelectAthlete) onSelectAthlete(ath);
                }}
                className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition cursor-pointer select-none group ${
                  ath.isCurrentUser
                    ? 'bg-orange-500/10 hover:bg-orange-500/15 border-l-4 border-l-orange-500'
                    : 'hover:bg-neutral-850/60'
                }`}
              >
                {/* Left: Rank, Avatar, Athlete Profile */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Rank Number & Momentum Badge */}
                  <div className="flex flex-col items-center justify-center w-8 shrink-0 font-mono">
                    <span
                      className={`text-base sm:text-lg font-black ${
                        rank === 1
                          ? 'text-amber-400'
                          : rank === 2
                          ? 'text-neutral-200'
                          : rank === 3
                          ? 'text-amber-600'
                          : 'text-neutral-400'
                      }`}
                    >
                      {rank}
                    </span>

                    {/* Rank change */}
                    {ath.rankChange !== undefined && ath.rankChange !== 0 ? (
                      <span
                        className={`text-[9px] font-bold flex items-center ${
                          ath.rankChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {ath.rankChange > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        <span>{Math.abs(ath.rankChange)}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-600 font-bold">
                        <Minus className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={ath.avatar}
                      alt={ath.name}
                      className={`w-11 h-11 rounded-xl object-cover border ${
                        ath.isCurrentUser
                          ? 'border-orange-500 shadow-md'
                          : isTop3
                          ? 'border-amber-400/80'
                          : 'border-neutral-700'
                      }`}
                    />
                    <span className="absolute -bottom-1 -right-1 text-xs">
                      {ath.flagEmoji}
                    </span>
                  </div>

                  {/* Athlete Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-bold text-sm truncate ${
                          ath.isCurrentUser
                            ? 'text-orange-400 font-black'
                            : 'text-white group-hover:text-amber-300 transition'
                        }`}
                      >
                        {ath.name}
                      </h4>
                      {ath.isPro && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase bg-amber-400 text-black shrink-0">
                          PRO
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 capitalize">
                        {ath.primarySport.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono mt-0.5 truncate">
                      <span>{ath.location}</span>
                      {ath.team && (
                        <>
                          <span>·</span>
                          <span className="text-neutral-500 truncate">{ath.team}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: TSS & Elevation Meters Bars & Metrics */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-5 sm:gap-8 justify-between lg:justify-end shrink-0 font-mono">
                  {/* Monthly TSS Metric & Visual Meter */}
                  <div className="w-36 sm:w-44 text-right">
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Monthly TSS</span>
                      </span>
                      <span
                        className={`font-black ${
                          metricMode === 'tss' ? 'text-amber-400 text-sm' : 'text-white'
                        }`}
                      >
                        {ath.monthlyTSS.toLocaleString()}
                      </span>
                    </div>
                    {/* Fill bar */}
                    <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${tssPct}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">
                      ~{Math.round(ath.monthlyTSS / 30)} TSS/day avg
                    </div>
                  </div>

                  {/* Monthly Elevation Metric & Visual Meter */}
                  <div className="w-36 sm:w-44 text-right">
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                        <Mountain className="w-3 h-3 text-amber-400" />
                        <span>Climb Gain</span>
                      </span>
                      <span
                        className={`font-black ${
                          metricMode === 'elevation' ? 'text-amber-400 text-sm' : 'text-white'
                        }`}
                      >
                        +{ath.monthlyElevationMeters.toLocaleString()}m
                      </span>
                    </div>
                    {/* Fill bar */}
                    <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${elePct}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">
                      {Math.round(ath.monthlyElevationMeters / (ath.monthlyDistanceKm || 1))}m per km
                    </div>
                  </div>

                  {/* Distance & Hours */}
                  <div className="hidden md:block text-right text-xs">
                    <div className="text-neutral-300 font-bold">{ath.monthlyDistanceKm} km</div>
                    <div className="text-[10px] text-neutral-500">{ath.monthlyActiveHours} hrs active</div>
                  </div>

                  {/* Social Kudos Action */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleKudos(ath.id, e)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      ath.hasUserKudoed
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                    title="Give athlete kudos"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        ath.hasUserKudoed ? 'fill-orange-500 text-orange-500' : ''
                      }`}
                    />
                    <span>{ath.kudosCount}</span>
                  </button>

                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Athlete Detail Performance Modal / Inspect Drawer */}
      {selectedAthleteDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedAthleteDetail.avatar}
                  alt={selectedAthleteDetail.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{selectedAthleteDetail.name}</h3>
                    <span className="text-lg">{selectedAthleteDetail.flagEmoji}</span>
                    {selectedAthleteDetail.isPro && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase bg-amber-400 text-black">
                        PRO
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    @{selectedAthleteDetail.handle} · {selectedAthleteDetail.location}
                  </div>
                  {selectedAthleteDetail.team && (
                    <div className="text-xs text-amber-400 font-semibold mt-0.5">
                      {selectedAthleteDetail.team}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAthleteDetail(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-sm font-mono"
              >
                ✕
              </button>
            </div>

            {/* Quote / Highlight */}
            {selectedAthleteDetail.recentHighlight && (
              <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 text-xs text-neutral-300 italic">
                "{selectedAthleteDetail.recentHighlight}"
              </div>
            )}

            {/* Performance Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase">Monthly TSS</div>
                <div className="text-base font-black text-amber-400 mt-0.5">
                  {selectedAthleteDetail.monthlyTSS}
                </div>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase">Elevation</div>
                <div className="text-base font-black text-white mt-0.5">
                  +{selectedAthleteDetail.monthlyElevationMeters}m
                </div>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase">Distance</div>
                <div className="text-base font-black text-white mt-0.5">
                  {selectedAthleteDetail.monthlyDistanceKm} km
                </div>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-400 uppercase">Active Hours</div>
                <div className="text-base font-black text-white mt-0.5">
                  {selectedAthleteDetail.monthlyActiveHours} hrs
                </div>
              </div>
            </div>

            {/* Physiological Thresholds */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Primary Discipline:</span>
                <span className="font-bold text-white capitalize">{selectedAthleteDetail.primarySport.replace('_', ' ')}</span>
              </div>
              {selectedAthleteDetail.ftpWatts && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Estimated FTP:</span>
                  <span className="font-bold text-amber-400">{selectedAthleteDetail.ftpWatts} Watts</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Consecutive Days Streak:</span>
                <span className="font-bold text-rose-400">{selectedAthleteDetail.streakDays} Days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Activities Completed:</span>
                <span className="font-bold text-neutral-200">{selectedAthleteDetail.monthlyActivitiesCount} workouts</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => handleToggleKudos(selectedAthleteDetail.id, e)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${
                  selectedAthleteDetail.hasUserKudoed
                    ? 'bg-orange-500 text-black font-black'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${selectedAthleteDetail.hasUserKudoed ? 'fill-black' : ''}`} />
                <span>{selectedAthleteDetail.hasUserKudoed ? 'Kudos Sent!' : 'Send Athlete Kudos'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAthleteDetail(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
