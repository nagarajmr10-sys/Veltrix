import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  Heart,
  Activity,
  Calendar,
  Clock,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Flame,
  ChevronRight,
  ShieldCheck,
  Sliders,
  Plus,
  Compass,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AthleteProfile, DailyTrainingMetric, Activity as ActivityType, StructuredWorkout } from '../../types';
import { formatDuration } from '../../utils/geoUtils';

interface AICoachChatSectionProps {
  profile: AthleteProfile;
  pmcMetrics?: DailyTrainingMetric[];
  recentActivities?: ActivityType[];
  onAddWorkoutToCalendar?: (workout: Omit<StructuredWorkout, 'id' | 'isCompleted'>) => void;
  onNavigateToCalendar?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedWorkout?: {
    title: string;
    sport: 'cycling' | 'running' | 'gravel';
    durationMinutes: number;
    plannedTSS: number;
    description: string;
  };
}

export const AICoachChatSection: React.FC<AICoachChatSectionProps> = ({
  profile,
  pmcMetrics = [],
  recentActivities = [],
  onAddWorkoutToCalendar,
  onNavigateToCalendar,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `### Welcome to Veltrix AI Coach, ${profile.name}!

I am your personal exercise physiologist and endurance director. I have synced your baseline telemetry:

- **FTP:** **${profile.ftpWatts}W** (${(profile.ftpWatts / profile.weightKg).toFixed(2)} W/kg)
- **LTHR:** **${profile.lthr} bpm** | Max HR: ${profile.maxHeartRate} bpm
- **Current Form (TSB):** **-6** (Active Training Block)

Ask me anything about **lactate threshold intervals**, **moving vs. elapsed time pacing**, **carbohydrate fueling**, or **weekly periodization**!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tone, setTone] = useState<'scientific' | 'supportive' | 'tactical'>('scientific');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioSupported, setAudioSupported] = useState(true);
  const [addedWorkoutId, setAddedWorkoutId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Latest PMC metrics
  const latestMetric = pmcMetrics[pmcMetrics.length - 1] || {
    ctl: 78,
    atl: 84,
    tsb: -6,
  };

  const totalMovingSecs = recentActivities.reduce((acc, a) => acc + (a.movingTimeSeconds || a.durationSeconds), 0);
  const totalElapsedSecs = recentActivities.reduce((acc, a) => acc + (a.elapsedTimeSeconds || a.durationSeconds), 0);
  const efficiencyRatio = totalElapsedSecs > 0 ? Math.round((totalMovingSecs / totalElapsedSecs) * 100) : 94;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    setAudioSupported('speechSynthesis' in window);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const payload = {
        messages: [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        athleteProfile: {
          name: profile.name,
          ftpWatts: profile.ftpWatts,
          lthr: profile.lthr,
          weightKg: profile.weightKg,
          primarySport: 'cycling',
        },
        pmcStats: {
          ctl: latestMetric.ctl,
          atl: latestMetric.atl,
          tsb: latestMetric.tsb,
        },
        recentActivities: recentActivities.slice(0, 5).map((a) => ({
          title: a.title,
          distanceKm: a.distanceKm,
          movingTimeSeconds: a.movingTimeSeconds,
          elapsedTimeSeconds: a.elapsedTimeSeconds,
          tss: a.tss,
        })),
        tone,
      };

      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      // Check if the reply includes workout recommendations
      let suggestedWorkout: ChatMessage['suggestedWorkout'] = undefined;
      const qLower = query.toLowerCase();
      if (qLower.includes('interval') || qLower.includes('sweet spot') || qLower.includes('workout') || qLower.includes('session')) {
        suggestedWorkout = {
          title: `${profile.ftpWatts}W Sweet Spot Over-Unders (3x12m)`,
          sport: 'cycling',
          durationMinutes: 75,
          plannedTSS: 78,
          description: `Targeted 88-94% FTP intervals with VO2 bursts designed for ${profile.ftpWatts}W FTP baseline.`,
        };
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedWorkout,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      // Fallback offline message
      const botMsg: ChatMessage = {
        id: `bot-fb-${Date.now()}`,
        role: 'assistant',
        content: `### Telemetry Coach Analysis for ${profile.name}

At **${profile.ftpWatts}W FTP** and **Form TSB ${latestMetric.tsb}**:

- **Aerobic Conditioning:** Maintain high Zone 2 discipline (${Math.round(profile.ftpWatts * 0.65)}W–${Math.round(profile.ftpWatts * 0.75)}W) to accelerate mitochondrial adaptation and fat oxidation.
- **Moving vs Elapsed Time:** Your recent Activity Ratio is **${efficiencyRatio}%**. Keep moving time above 92% of elapsed duration to prevent unwanted cardiac drift.
- **Fueling:** For workouts exceeding 75 minutes, ingest 60–80g carbs/hour.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleToggleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    // Clean markdown hashes and asterisks for smooth reading
    const cleanText = text.replace(/[#*`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleScheduleWorkout = (workout: NonNullable<ChatMessage['suggestedWorkout']>, msgId: string) => {
    if (onAddWorkoutToCalendar) {
      onAddWorkoutToCalendar({
        title: workout.title,
        sport: workout.sport,
        plannedDurationMinutes: workout.durationMinutes,
        plannedTSS: workout.plannedTSS,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: workout.description,
        structure: [
          { phase: 'Warm-up', durationMinutes: 15, targetZone: 'Z2', targetDescription: 'Progressive spin 55-70% FTP' },
          { phase: 'Main Set', durationMinutes: 45, targetZone: 'Z4', targetDescription: '3x12m Sweet Spot (88-94% FTP)' },
          { phase: 'Cool-down', durationMinutes: 15, targetZone: 'Z1', targetDescription: 'Easy spin <55% FTP' },
        ],
      });
      setAddedWorkoutId(msgId);
      setTimeout(() => setAddedWorkoutId(null), 3000);
    }
  };

  const promptChips = [
    'Analyze my current PMC fitness (CTL) vs fatigue (ATL)',
    'Explain the difference between Moving Time and Elapsed Time',
    'Recommend a Sweet Spot session for 310W FTP',
    'What should my carbohydrate intake be on long rides?',
    'How do I taper my training load before my race?',
  ];

  return (
    <div id="ai-coach-section" className="space-y-6 animate-fade-in">
      {/* Top Header & Telemetry Snapshot Ribbon */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-0.5 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Veltrix AI Endurance Coach
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Powered by Gemini 2.5 Flash & Exercise Physiology Engine
              </p>
            </div>
          </div>

          {/* Persona / Tone Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <span className="text-[11px] text-neutral-500 font-mono px-2">Tone:</span>
            {[
              { id: 'scientific', label: 'Physiologist' },
              { id: 'supportive', label: 'Mentor' },
              { id: 'tactical', label: 'Director' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  tone === t.id
                    ? 'bg-orange-500 text-black shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Athlete Bio & Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-neutral-800/80 font-mono text-xs">
          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80">
            <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">FTP Baseline</div>
            <div className="text-base font-black text-white mt-0.5">
              {profile.ftpWatts} <span className="text-xs text-orange-400 font-sans">W</span>
            </div>
            <div className="text-[10px] text-neutral-400">{(profile.ftpWatts / profile.weightKg).toFixed(1)} W/kg</div>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80">
            <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">LTHR Threshold</div>
            <div className="text-base font-black text-rose-400 mt-0.5">
              {profile.lthr} <span className="text-xs text-neutral-500 font-sans">bpm</span>
            </div>
            <div className="text-[10px] text-neutral-400">Max {profile.maxHeartRate} bpm</div>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80">
            <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">Fitness (CTL)</div>
            <div className="text-base font-black text-sky-400 mt-0.5">
              {latestMetric.ctl} <span className="text-xs text-neutral-500 font-sans">TSS/d</span>
            </div>
            <div className="text-[10px] text-neutral-400">Fatigue (ATL): {latestMetric.atl}</div>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80">
            <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">Form (TSB)</div>
            <div className={`text-base font-black mt-0.5 ${latestMetric.tsb >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {latestMetric.tsb > 0 ? `+${latestMetric.tsb}` : latestMetric.tsb}
            </div>
            <div className="text-[10px] text-neutral-400">
              {latestMetric.tsb > 5 ? 'Fresh' : latestMetric.tsb >= -15 ? 'Optimal' : 'Fatigued'}
            </div>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80 col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase text-neutral-500 font-sans font-semibold">Moving / Elapsed</div>
            <div className="text-base font-black text-emerald-400 mt-0.5">
              {efficiencyRatio}% <span className="text-xs text-neutral-500 font-sans">ratio</span>
            </div>
            <div className="text-[10px] text-neutral-400">
              {formatDuration(totalMovingSecs)} / {formatDuration(totalElapsedSecs)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Conversation Canvas */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[620px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => {
            const isBot = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 sm:gap-4 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 text-sm transition ${
                    isBot
                      ? 'bg-neutral-950 border border-neutral-800 text-neutral-200'
                      : 'bg-gradient-to-r from-orange-600 to-amber-600 text-black font-medium shadow-lg shadow-orange-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-neutral-800/50 text-[11px] font-mono opacity-80">
                    <span className="font-bold">{isBot ? 'Veltrix AI Coach' : profile.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{msg.timestamp}</span>
                      {isBot && (
                        <>
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-neutral-800 transition"
                            title="Copy response"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                            )}
                          </button>
                          {audioSupported && (
                            <button
                              onClick={() => handleToggleSpeak(msg.content)}
                              className="p-1 rounded hover:bg-neutral-800 transition"
                              title="Listen to audio"
                            >
                              {isSpeaking ? (
                                <VolumeX className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Markdown formatted content */}
                  <div className={`prose prose-invert prose-sm max-w-none ${isBot ? 'text-neutral-300' : 'text-black'}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Optional Suggested Workout Interactive Card */}
                  {msg.suggestedWorkout && (
                    <div className="mt-4 pt-3 border-t border-neutral-800 bg-neutral-900/90 rounded-xl p-3.5 border text-neutral-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-white text-xs">{msg.suggestedWorkout.title}</span>
                        </div>
                        <span className="text-[11px] font-mono text-orange-400 font-bold">
                          {msg.suggestedWorkout.plannedTSS} TSS · {msg.suggestedWorkout.durationMinutes}m
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">{msg.suggestedWorkout.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-neutral-500 font-mono">Suggested date: Tomorrow</span>
                        <button
                          type="button"
                          onClick={() => handleScheduleWorkout(msg.suggestedWorkout!, msg.id)}
                          className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          {addedWorkoutId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added to Calendar!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Training Calendar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!isBot && (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-8 h-8 rounded-xl object-cover shrink-0 mt-1 border border-neutral-800"
                  />
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-neutral-400 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span className="font-mono text-xs">Veltrix AI analyzing physiological telemetry...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestions Carousel */}
        <div className="px-4 py-2.5 bg-neutral-950/60 border-t border-neutral-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-400" />
            Suggested:
          </span>
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-mono whitespace-nowrap transition disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Bottom Input Field Bar */}
        <div className="p-3 sm:p-4 bg-neutral-950 border-t border-neutral-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={textareaRef as any}
                id="ai-coach-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about training load, moving vs elapsed time, sweet spot intervals, or nutrition..."
                disabled={isLoading}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <button
              type="submit"
              id="ai-coach-send-btn"
              disabled={!inputMessage.trim() || isLoading}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold text-sm flex items-center gap-2 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Coach</span>
            </button>

            <button
              type="button"
              id="ai-coach-clear-btn"
              onClick={() => {
                setMessages([
                  {
                    id: `reset-${Date.now()}`,
                    role: 'assistant',
                    content: `Session refreshed. Ready to analyze your endurance training and physiology!`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }}
              className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              title="Clear conversation history"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
