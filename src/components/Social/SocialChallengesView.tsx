import React, { useState } from 'react';
import {
  Trophy,
  Mountain,
  Flame,
  Zap,
  Bike,
  Compass,
  CheckCircle2,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  Award,
  Crown,
  Search,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Segment, SocialChallenge, AthleteProfile, Activity } from '../../types';
import { TopAthleteLeaderboard } from './TopAthleteLeaderboard';

interface ChallengesViewProps {
  challenges: SocialChallenge[];
  segments: Segment[];
  onToggleJoinChallenge: (challengeId: string) => void;
  currentProfile?: AthleteProfile;
  activities?: Activity[];
}

export const SocialChallengesView: React.FC<ChallengesViewProps> = ({
  challenges,
  segments,
  onToggleJoinChallenge,
  currentProfile,
  activities = [],
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'challenges' | 'segments'>('leaderboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [segmentSearch, setSegmentSearch] = useState('');

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Mountain': return <Mountain className="w-5 h-5 text-amber-400" />;
      case 'Bike': return <Bike className="w-5 h-5 text-orange-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-emerald-400" />;
      case 'Flame': return <Flame className="w-5 h-5 text-rose-400" />;
      default: return <Compass className="w-5 h-5 text-purple-400" />;
    }
  };

  const filteredChallenges = challenges.filter((c) => {
    if (selectedCategory === 'all') return true;
    return c.category === selectedCategory;
  });

  const filteredSegments = segments.filter((s) => {
    return s.name.toLowerCase().includes(segmentSearch.toLowerCase()) ||
           s.komAthlete.toLowerCase().includes(segmentSearch.toLowerCase());
  });

  const handleJoinClick = (c: SocialChallenge) => {
    if (!c.isJoined) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
    onToggleJoinChallenge(c.id);
  };

  return (
    <div id="challenges-segments-view" className="space-y-6">
      {/* Top Banner & View Switcher */}
      <div className="bg-gradient-to-r from-orange-950/40 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5" />
            <span>GLOBAL ATHLETIC LEAGUES & SEGMENTS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Compete, Summit, and Conquer
          </h2>
          <p className="text-sm text-neutral-300">
            Join official Veltrix monthly endurance quests, push your boundaries on legendary segments, and earn verifiable finisher badges.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-6">
          <button
            id="challenges-tab-button"
            onClick={() => setActiveTab('challenges')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              activeTab === 'challenges'
                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Monthly Challenges ({challenges.length})
          </button>
          <button
            id="segments-tab-button"
            onClick={() => setActiveTab('segments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              activeTab === 'segments'
                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            KOM Segments & Leaderboards ({segments.length})
          </button>
        </div>
      </div>

      {activeTab === 'challenges' ? (
        /* Challenges Section */
        <div className="space-y-5">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Challenges' },
              { id: 'endurance', label: 'Endurance & Distance' },
              { id: 'climbing', label: 'Elevation & Climbing' },
              { id: 'speed', label: 'Speed & PRs' },
              { id: 'consistency', label: 'Daily Consistency' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-neutral-800 text-orange-400 border border-orange-500/40'
                    : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Challenges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChallenges.map((c) => {
              const pct = Math.min(100, Math.round((c.currentValue / c.targetValue) * 100));
              const isFinished = pct >= 100;

              return (
                <div
                  key={c.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-inner">
                          {getIcon(c.badgeIcon)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition">
                            {c.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono mt-0.5">
                            <span className="capitalize">{c.category}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-neutral-500" />
                              {c.participantsCount.toLocaleString()} athletes
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {c.isJoined && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                          isFinished
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        }`}>
                          {isFinished ? 'Completed' : 'Joined'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  {/* Progress Meter */}
                  <div className="pt-4 border-t border-neutral-800/80 mt-4 space-y-2">
                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="text-neutral-400">
                        {c.currentValue.toLocaleString()} / {c.targetValue.toLocaleString()} {c.unit}
                      </span>
                      <span className="font-bold text-white">{pct}%</span>
                    </div>

                    <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFinished
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-orange-500 to-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>Ends May 31, 2026</span>
                      </div>

                      <button
                        id={`join-challenge-btn-${c.id}`}
                        onClick={() => handleJoinClick(c)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                          c.isJoined
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            : 'bg-orange-500 hover:bg-orange-600 text-black'
                        }`}
                      >
                        {c.isJoined ? (isFinished ? 'Claim Trophy' : 'Leave Challenge') : 'Join Challenge'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Segments Section */
        <div className="space-y-4">
          {/* Segment Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="segment-search-input"
              type="text"
              placeholder="Search segments by name or KOM holder..."
              value={segmentSearch}
              onChange={(e) => setSegmentSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Segments List */}
          <div className="space-y-3">
            {filteredSegments.map((s) => (
              <div
                key={s.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
              >
                <div className="space-y-1.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {s.climbCategory}
                    </span>
                    <h3 className="text-base font-bold text-white">{s.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-400">
                    <span>{s.distanceKm} km</span>
                    <span>·</span>
                    <span>Avg Grade: <strong className="text-neutral-200">{s.avgGradePct}%</strong></span>
                    <span>·</span>
                    <span>Elev Gain: <strong className="text-emerald-400">+{s.elevationGainMeters}m</strong></span>
                    <span>·</span>
                    <span>{s.totalAttempts.toLocaleString()} attempts</span>
                  </div>
                </div>

                {/* Leaderboard snapshot */}
                <div className="flex items-center gap-6 self-end md:self-auto bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 font-mono text-xs">
                  {/* KOM */}
                  <div>
                    <div className="text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>KOM / QOM</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">{s.komTime}</div>
                    <div className="text-[10px] text-neutral-400 truncate max-w-[120px]">{s.komAthlete}</div>
                    {s.komWatts && <div className="text-[10px] text-neutral-500">{s.komWatts}W avg</div>}
                  </div>

                  {/* Personal Record */}
                  <div className="border-l border-neutral-800 pl-4">
                    <div className="text-[10px] text-orange-400 uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3 h-3 text-orange-400" />
                      <span>Your PR</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">{s.personalRecordTime || '--:--'}</div>
                    <div className="text-[10px] text-emerald-400 font-bold">
                      {s.personalRank ? `Rank #${s.personalRank}` : 'No attempt yet'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
