import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Mountain,
  Zap,
  Gauge,
  Clock,
  Award,
  ChevronRight,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { Activity, SportType } from '../../types';
import { formatDuration, formatPace, formatSpeed } from '../../utils/geoUtils';

interface ActivityFeedProps {
  activities: Activity[];
  onSelectActivity: (activity: Activity) => void;
  onToggleKudos: (activityId: string) => void;
  onOpenLiveRecord: () => void;
}

export const ActivityFeedView: React.FC<ActivityFeedProps> = ({
  activities,
  onSelectActivity,
  onToggleKudos,
  onOpenLiveRecord,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [activeCommentDrawerId, setActiveCommentDrawerId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentsMap, setCommentsMap] = useState<{ [id: string]: { author: string; text: string; time: string }[] }>({
    'act-1': [
      { author: 'Mateo Chen', text: 'Crushed Hawk Hill! 370W on the climb is savage form.', time: '2h ago' },
      { author: 'Elena Vos', text: 'Coastal trail gravel looks sublime. Great ride!', time: '1h ago' },
    ],
    'act-2': [
      { author: 'Coach Marcus', text: 'Biomechanical efficiency was on point for reps 2 and 3.', time: '5h ago' },
    ],
  });

  const filteredActivities = activities.filter((act) => {
    if (selectedSport === 'all') return true;
    return act.sport === selectedSport;
  });

  const handleSendComment = (actId: string) => {
    if (!commentInput.trim()) return;
    const newComment = {
      author: 'Alex Rivera (You)',
      text: commentInput.trim(),
      time: 'Just now',
    };
    setCommentsMap((prev) => ({
      ...prev,
      [actId]: [...(prev[actId] || []), newComment],
    }));
    setCommentInput('');
  };

  return (
    <div id="activity-feed-view" className="space-y-6">
      {/* Feed Filter & Quick Record Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'cycling', label: 'Cycling' },
            { id: 'running', label: 'Running' },
            { id: 'gravel', label: 'Gravel' },
            { id: 'trail_running', label: 'Trail' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSport(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedSport === s.id
                  ? 'bg-orange-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          id="record-new-activity-feed-btn"
          onClick={onOpenLiveRecord}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Record GPS Session
        </button>
      </div>

      {/* Activities Feed Cards */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <p className="text-neutral-400 text-sm">No recorded sessions for this sport filter yet.</p>
            <button
              onClick={onOpenLiveRecord}
              className="mt-3 text-xs font-bold text-orange-400 hover:underline"
            >
              Record an activity now →
            </button>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const comments = commentsMap[act.id] || [];
            const isCommentOpen = activeCommentDrawerId === act.id;

            return (
              <div
                key={act.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl overflow-hidden transition shadow-lg shadow-black/20"
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={act.athleteAvatar}
                      alt={act.athleteName}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{act.athleteName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 capitalize">
                          {act.sport.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {new Date(act.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {act.athleteLocation && ` · ${act.athleteLocation}`}
                      </div>
                    </div>
                  </div>

                  {/* Training Effect / TSS pill */}
                  <div className="text-right font-mono">
                    <span className="px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
                      {act.tss} TSS
                    </span>
                  </div>
                </div>

                {/* Card Title & Debrief */}
                <div className="p-4 sm:p-5 space-y-3 cursor-pointer" onClick={() => onSelectActivity(act)}>
                  <div>
                    <h3 className="text-lg font-bold text-white hover:text-orange-400 transition">
                      {act.title}
                    </h3>
                    {act.description && (
                      <p className="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                        {act.description}
                      </p>
                    )}
                  </div>

                  {/* PR Badges */}
                  {act.prBadges && act.prBadges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {act.prBadges.map((badge) => (
                        <div
                          key={badge}
                          className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Award className="w-3 h-3" />
                          <span>{badge}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Telemetry Highlight Bento Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 font-mono">
                    <div>
                      <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">Distance</div>
                      <div className="text-xl font-black text-white mt-0.5">
                        {act.distanceKm.toFixed(1)} <span className="text-[10px] text-neutral-400 font-sans">km</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">Time</div>
                      <div className="text-xl font-black text-white mt-0.5">
                        {formatDuration(act.movingTimeSeconds || act.durationSeconds)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">Pace / Speed</div>
                      <div className="text-xl font-black text-white mt-0.5">
                        {act.sport === 'cycling' || act.sport === 'gravel'
                          ? formatSpeed(act.avgSpeedKmh)
                          : formatPace(act.avgPaceSecondsPerKm)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">Elevation</div>
                      <div className="text-xl font-black text-emerald-400 mt-0.5">
                        +{act.elevationGainMeters}m
                      </div>
                    </div>
                  </div>

                  {/* Power & Heart Rate snapshot chips */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-400">
                    {act.avgPower && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{act.avgPower}W avg ({act.normalizedPower || act.avgPower}W NP)</span>
                      </span>
                    )}
                    {act.avgHeartRate && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>{act.avgHeartRate} bpm avg</span>
                      </span>
                    )}
                    {act.trainingEffectAerobic && (
                      <span className="flex items-center gap-1 text-sky-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>TE: {act.trainingEffectAerobic} Aerobic</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Social Action Bar (Kudos & Comments) */}
                <div className="px-4 sm:px-5 py-3 border-t border-neutral-800 bg-neutral-950/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {/* Kudos button */}
                    <button
                      id={`kudos-button-${act.id}`}
                      onClick={() => onToggleKudos(act.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition active:scale-95 ${
                        act.userHasKudoed
                          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                          : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${act.userHasKudoed ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{act.kudosCount} Kudos</span>
                    </button>

                    {/* Comments drawer toggle */}
                    <button
                      id={`comment-toggle-${act.id}`}
                      onClick={() => setActiveCommentDrawerId(isCommentOpen ? null : act.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800 font-semibold transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{comments.length} Comments</span>
                    </button>
                  </div>

                  {/* Deep dive detail click */}
                  <button
                    onClick={() => onSelectActivity(act)}
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-semibold transition text-xs"
                  >
                    <span>Analyze Effort</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Comments Drawer */}
                {isCommentOpen && (
                  <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/80 space-y-3">
                    <div className="space-y-2">
                      {comments.length === 0 ? (
                        <p className="text-xs text-neutral-500 italic">No comments yet. Give your teammate some kudos!</p>
                      ) : (
                        comments.map((cm, idx) => (
                          <div key={idx} className="text-xs bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                            <div className="flex items-center justify-between text-neutral-400 mb-0.5">
                              <span className="font-bold text-white">{cm.author}</span>
                              <span className="text-[10px]">{cm.time}</span>
                            </div>
                            <p className="text-neutral-200">{cm.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Comment input form */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Write constructive athlete feedback..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment(act.id)}
                        className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                      />
                      <button
                        onClick={() => handleSendComment(act.id)}
                        className="p-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
