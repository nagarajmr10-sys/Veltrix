import React, { useState, useEffect } from 'react';
import {
  Radio,
  Navigation,
  Compass,
  Zap,
  Heart,
  Signal,
  ChevronUp,
  ChevronDown,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
  X,
  Gauge,
  Activity as ActivityIcon,
} from 'lucide-react';
import { SportType } from '../../types';

interface GPSBottomCenterSectionProps {
  onOpenLiveRecord: () => void;
  isRecording?: boolean;
  className?: string;
}

export const GPSBottomCenterSection: React.FC<GPSBottomCenterSectionProps> = ({
  onOpenLiveRecord,
  isRecording = false,
  className = '',
}) => {
  const [isQuickDockOpen, setIsQuickDockOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportType>('cycling');
  const [hasRealGeoPermission, setHasRealGeoPermission] = useState<boolean | null>(null);

  // Check if browser geolocation is supported/permitted
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.permissions?.query?.({ name: 'geolocation' as PermissionName }).then((result) => {
        setHasRealGeoPermission(result.state === 'granted');
        result.onchange = () => {
          setHasRealGeoPermission(result.state === 'granted');
        };
      }).catch(() => {
        // Fallback for browsers that don't support permission query
        setHasRealGeoPermission(true);
      });
    }
  }, []);

  const sportsList: { type: SportType; label: string; icon: string }[] = [
    { type: 'cycling', label: 'Ride', icon: '🚴' },
    { type: 'running', label: 'Run', icon: '🏃' },
    { type: 'gravel', label: 'Gravel', icon: '🚵' },
    { type: 'trail_running', label: 'Trail', icon: '⛰️' },
    { type: 'rowing', label: 'Rowing', icon: '🚣' },
  ];

  const handleStartGPS = () => {
    setIsQuickDockOpen(false);
    onOpenLiveRecord();
  };

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Expandable Bottom Center GPS Quick Dock / Mini Cockpit */}
      {isQuickDockOpen && (
        <>
          {/* Backdrop for closing dock on outside touch */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsQuickDockOpen(false)}
          />

          <div
            id="gps-quick-cockpit-drawer"
            className="fixed bottom-[72px] sm:bottom-20 left-1/2 -translate-x-1/2 w-[94vw] max-w-md z-50 p-4 rounded-2xl bg-neutral-950 border border-orange-500/40 shadow-[0_-10px_35px_rgba(249,115,22,0.25)] animate-in fade-in slide-in-from-bottom-5 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-black tracking-wide text-white font-mono flex items-center gap-1.5">
                    <span>GPS TELEMETRY COCKPIT</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Signal className="w-3 h-3" />
                    <span>Multi-Band GNSS 3D Fix (±3.2m accuracy)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickDockOpen(false)}
                className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition"
                aria-label="Close GPS Dock"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Sport Mode Selector */}
            <div className="py-3">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center justify-between">
                <span>Select Sport Discipline</span>
                <span className="text-orange-400">{selectedSport.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {sportsList.map((sport) => {
                  const isSelected = selectedSport === sport.type;
                  return (
                    <button
                      key={sport.type}
                      type="button"
                      onClick={() => setSelectedSport(sport.type)}
                      className={`min-h-[44px] p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                        isSelected
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-sm'
                          : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span className="text-base">{sport.icon}</span>
                      <span className="text-[10px] font-semibold truncate leading-none">{sport.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sensor Readiness Status Strip */}
            <div className="grid grid-cols-3 gap-2 py-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-neutral-400 truncate">GNSS Satellites</div>
                  <div className="text-[11px] font-bold text-emerald-400">22 Locked</div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-neutral-400 truncate">HR Monitor</div>
                  <div className="text-[11px] font-bold text-neutral-200">ANT+ / BLE</div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-neutral-400 truncate">Power Meter</div>
                  <div className="text-[11px] font-bold text-neutral-200">Dual-Sided</div>
                </div>
              </div>
            </div>

            {/* Launch GPS Recording Action Button */}
            <div className="pt-3">
              <button
                id="gps-dock-start-recording-btn"
                type="button"
                onClick={handleStartGPS}
                className="w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition"
              >
                <Radio className="w-4 h-4 stroke-[2.5] animate-pulse" />
                <span>Launch GPS Live Cockpit</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Center Elevated GPS Record Button Container */}
      <div className="flex flex-col items-center justify-center select-none group">
        {/* Subtle quick drawer toggle chevron */}
        <button
          id="bottom-gps-dock-toggle-btn"
          type="button"
          onClick={() => setIsQuickDockOpen(!isQuickDockOpen)}
          className="hidden sm:flex items-center justify-center -top-2 absolute w-6 h-3 rounded-t-md bg-neutral-900/90 border-t border-x border-neutral-700/80 text-neutral-400 hover:text-orange-400 hover:bg-neutral-800 transition"
          title="Toggle GPS Quick Dock"
          aria-label="Toggle GPS Quick Dock"
        >
          {isQuickDockOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {/* Elevated Main Button */}
        <div className="relative -mt-4 sm:-mt-5">
          {/* Glowing halo pulse */}
          <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-md group-hover:bg-orange-500/35 animate-pulse transition" />

          <button
            id="bottom-nav-gps-record-btn"
            type="button"
            onClick={onOpenLiveRecord}
            className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-0.5 shadow-xl shadow-orange-500/30 group-hover:scale-105 active:scale-95 transition-all flex items-center justify-center touch-manipulation"
            aria-label="Start GPS Activity Recording"
            title="Start Live GPS Activity Recording"
          >
            {/* Inner circle with icon */}
            <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center group-hover:bg-neutral-900 transition relative overflow-hidden">
              {/* Radar beam subtle sweep effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-transparent opacity-60 pointer-events-none" />

              <div className="relative flex items-center justify-center">
                <Radio className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-orange-400 stroke-[2.5] group-hover:text-amber-300 transition" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            </div>
          </button>
        </div>

        {/* Label underneath elevated button */}
        <button
          type="button"
          onClick={onOpenLiveRecord}
          className="mt-0.5 text-[9px] sm:text-[10px] font-bold font-mono uppercase tracking-wider text-orange-400 group-hover:text-amber-300 transition text-center flex items-center gap-0.5 leading-none"
        >
          <span>GPS REC</span>
        </button>
      </div>
    </div>
  );
};
