import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Heart,
  Zap,
  Mountain,
  Gauge,
  Clock,
  Wind,
  CloudSun,
  Flame,
  Award,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Activity, Segment } from '../../types';
import { RouteMap } from '../Map/RouteMap';
import {
  formatDuration,
  formatPace,
  formatSpeed,
  getHeartRateZone,
  downloadGPXFile,
} from '../../utils/geoUtils';

interface ActivityDeepDiveModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  segments?: Segment[];
}

export const ActivityDeepDiveModal: React.FC<ActivityDeepDiveModalProps> = ({
  activity,
  isOpen,
  onClose,
  segments = [],
}) => {
  const [hoverPointIndex, setHoverPointIndex] = useState<number | null>(null);
  const [highlightedSegment, setHighlightedSegment] = useState<Segment | null>(null);

  if (!isOpen || !activity) return null;

  const track = activity.gpsTrack || [];
  const hasElevations = track.some((p) => p.altitude !== undefined);

  // Elevation Profile points
  const minEle = track.length > 0 ? Math.min(...track.map((p) => p.altitude || 0)) : 0;
  const maxEle = track.length > 0 ? Math.max(...track.map((p) => p.altitude || 100)) : 100;
  const eleRange = Math.max(20, maxEle - minEle);

  const profileWidth = 700;
  const profileHeight = 120;
  const pad = { top: 15, right: 20, bottom: 25, left: 45 };
  const uW = profileWidth - pad.left - pad.right;
  const uH = profileHeight - pad.top - pad.bottom;

  const getProfileX = (idx: number) => pad.left + (idx / Math.max(1, track.length - 1)) * uW;
  const getProfileY = (alt: number) => pad.top + uH - ((alt - minEle) / eleRange) * uH;

  const elevationPointsString = track
    .map((p, i) => `${getProfileX(i)},${getProfileY(p.altitude || minEle)}`)
    .join(' ');

  const areaPointsString = `${getProfileX(0)},${pad.top + uH} ${elevationPointsString} ${getProfileX(
    track.length - 1
  )},${pad.top + uH}`;

  const hoveredPoint = hoverPointIndex !== null && track[hoverPointIndex] ? track[hoverPointIndex] : null;

  const handleDownloadGPX = () => {
    downloadGPXFile(activity.title, activity.sport, track, activity.date);
  };

  return (
    <div id="activity-deep-dive-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
              {activity.sport.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{activity.title}</h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>{new Date(activity.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span>·</span>
                <span className="capitalize">{activity.sport.replace('_', ' ')}</span>
                {activity.gearName && (
                  <>
                    <span>·</span>
                    <span className="text-neutral-300">{activity.gearName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-gpx-button"
              onClick={handleDownloadGPX}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download standard GPX 1.1 file"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>Export GPX</span>
            </button>
            <button
              id="close-deep-dive-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* PR Badges if any */}
          {activity.prBadges && activity.prBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activity.prBadges.map((badge) => (
                <div
                  key={badge}
                  className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recorded Atmospheric & Weather Conditions */}
          {activity.weather && (
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-amber-400">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{activity.weather.condition}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-orange-400 font-bold">
                    {activity.weather.tempC}°C ({((activity.weather.tempC * 9) / 5 + 32).toFixed(1)}°F)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-neutral-400 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  <span>Wind: {activity.weather.windKmh} km/h ({((activity.weather.windKmh * 0.621371)).toFixed(1)} mph)</span>
                </div>
                <div className="text-neutral-400">
                  Humidity: <strong className="text-neutral-200">{activity.weather.humidityPct}%</strong>
                </div>
              </div>
            </div>
          )}

          {/* Primary Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="text-[11px] uppercase font-semibold text-neutral-400">Distance</div>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {activity.distanceKm.toFixed(2)} <span className="text-xs text-neutral-500 font-sans">km</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="text-[11px] uppercase font-semibold text-neutral-400">Moving Time</div>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {formatDuration(activity.movingTimeSeconds || activity.durationSeconds)}
              </div>
              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Elapsed: {formatDuration(activity.durationSeconds)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="text-[11px] uppercase font-semibold text-neutral-400">
                {activity.sport === 'cycling' || activity.sport === 'gravel' ? 'Avg Speed' : 'Avg Pace'}
              </div>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {activity.sport === 'cycling' || activity.sport === 'gravel'
                  ? formatSpeed(activity.avgSpeedKmh)
                  : formatPace(activity.avgPaceSecondsPerKm)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="text-[11px] uppercase font-semibold text-neutral-400">Elevation Gain</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                +{activity.elevationGainMeters} <span className="text-xs text-neutral-500 font-sans">m</span>
              </div>
            </div>
          </div>

          {/* Secondary Telemetry: Power, HR, TSS, Training Effect */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/50 p-3.5 rounded-xl border border-neutral-800">
            <div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Avg / Norm Power</span>
              </div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {activity.avgPower ? `${activity.avgPower}W / ${activity.normalizedPower || activity.avgPower}W` : 'N/A'}
              </div>
              {activity.intensityFactor && (
                <div className="text-[10px] text-neutral-500">IF: {activity.intensityFactor}</div>
              )}
            </div>

            <div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Avg / Max HR</span>
              </div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {activity.avgHeartRate ? `${activity.avgHeartRate} / ${activity.maxHeartRate || activity.avgHeartRate + 12} bpm` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Training Stress (TSS)</span>
              </div>
              <div className="text-lg font-bold font-mono text-orange-400 mt-1">
                {activity.tss} TSS
              </div>
              <div className="text-[10px] text-neutral-500">{activity.calories} kcal burned</div>
            </div>

            <div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Garmin Training Effect</span>
              </div>
              <div className="text-sm font-bold font-mono text-white mt-1">
                Aerobic: <span className="text-sky-400">{activity.trainingEffectAerobic || '3.8'}</span> / Anaerobic: <span className="text-rose-400">{activity.trainingEffectAnaerobic || '1.6'}</span>
              </div>
            </div>
          </div>

          {/* Interactive Map with Synchronized Scrubber */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold uppercase tracking-wider text-neutral-300">GPS Route & Elevation Sync</span>
              {hoveredPoint && (
                <div className="font-mono text-xs text-amber-400 bg-neutral-900 px-2.5 py-0.5 rounded border border-neutral-800">
                  Elevation: <strong>{hoveredPoint.altitude?.toFixed(0)}m</strong> · HR: <strong>{hoveredPoint.heartRate} bpm</strong> · Power: <strong>{hoveredPoint.power}W</strong>
                </div>
              )}
            </div>

            {/* Map */}
            <RouteMap
              track={track}
              hoveredPointIndex={hoverPointIndex}
              heightClass="h-72 sm:h-88"
              segments={segments}
              sport={activity.sport}
              title={activity.title}
              onHoverPoint={setHoverPointIndex}
              onSelectSegment={(seg) => setHighlightedSegment(seg)}
            />

            {/* Matched Strava Segments & KOMs */}
            {segments && segments.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Strava Segments & KOM Leaderboard</span>
                  </h4>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {segments.length} segment{segments.length > 1 ? 's' : ''} on route
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {segments.slice(0, 3).map((seg) => {
                    const isSelected = highlightedSegment?.id === seg.id;
                    return (
                      <div
                        key={seg.id}
                        onClick={() => setHighlightedSegment(isSelected ? null : seg)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                            : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-xs text-white truncate max-w-[190px]">
                            {seg.name}
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-amber-400 text-black shrink-0">
                            {seg.climbCategory}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-neutral-400 mt-1.5 flex items-center gap-2">
                          <span>{seg.distanceKm} km</span>
                          <span>·</span>
                          <span className="text-neutral-300">{seg.avgGradePct}% grade</span>
                          <span>·</span>
                          <span>+{seg.elevationGainMeters}m</span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono">
                          <div className="text-neutral-400">
                            KOM: <strong className="text-amber-300">{seg.komTime}</strong>
                          </div>
                          {seg.personalRecordTime && (
                            <div className="text-emerald-400 font-bold flex items-center gap-1">
                              <span>PR: {seg.personalRecordTime}</span>
                              <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-[9px]">#{seg.personalRank || 1}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interactive Elevation Profile */}
            {hasElevations && (
              <div className="bg-neutral-900/90 rounded-xl p-3 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-1 flex justify-between">
                  <span>Elevation Profile (Hover along the curve to track route position)</span>
                  <span>Max: {Math.round(maxEle)}m</span>
                </div>

                <svg
                  viewBox={`0 0 ${profileWidth} ${profileHeight}`}
                  className="w-full h-auto select-none"
                  onMouseLeave={() => setHoverPointIndex(null)}
                >
                  <defs>
                    <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Base grid */}
                  <line x1={pad.left} y1={pad.top + uH} x2={profileWidth - pad.right} y2={pad.top + uH} stroke="#404040" strokeWidth="1" />

                  {/* Elevation fill and line */}
                  <polygon points={areaPointsString} fill="url(#eleGrad)" />
                  <polyline points={elevationPointsString} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />

                  {/* Y Axis text */}
                  <text x={pad.left - 6} y={pad.top + 10} fill="#737373" fontSize="9" fontFamily="monospace" textAnchor="end">
                    {Math.round(maxEle)}m
                  </text>
                  <text x={pad.left - 6} y={pad.top + uH} fill="#737373" fontSize="9" fontFamily="monospace" textAnchor="end">
                    {Math.round(minEle)}m
                  </text>

                  {/* Hitboxes for hovering */}
                  {track.map((_, i) => (
                    <rect
                      key={i}
                      x={getProfileX(i) - uW / (track.length * 2)}
                      y={pad.top}
                      width={uW / track.length}
                      height={uH}
                      fill="transparent"
                      onMouseEnter={() => setHoverPointIndex(i)}
                      className="cursor-crosshair"
                    />
                  ))}

                  {/* Hover line */}
                  {hoverPointIndex !== null && (
                    <g>
                      <line
                        x1={getProfileX(hoverPointIndex)}
                        y1={pad.top}
                        x2={getProfileX(hoverPointIndex)}
                        y2={pad.top + uH}
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={getProfileX(hoverPointIndex)}
                        cy={getProfileY(track[hoverPointIndex]?.altitude || minEle)}
                        r="4"
                        fill="#fbbf24"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}
                </svg>
              </div>
            )}
          </div>

          {/* Splits / Lap Table */}
          {activity.laps && activity.laps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Lap Splits ({activity.laps.length} Splits)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="py-2.5 px-3">Split</th>
                      <th className="py-2.5 px-3">Distance</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Pace / Speed</th>
                      <th className="py-2.5 px-3">Elev Gain</th>
                      <th className="py-2.5 px-3">Avg HR</th>
                      <th className="py-2.5 px-3">Avg Power</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                    {activity.laps.map((lap) => (
                      <tr key={lap.lapNumber} className="hover:bg-neutral-800/40">
                        <td className="py-2 px-3 font-bold text-white">Lap {lap.lapNumber}</td>
                        <td className="py-2 px-3">{lap.distanceKm} km</td>
                        <td className="py-2 px-3">{formatDuration(lap.durationSeconds)}</td>
                        <td className="py-2 px-3 font-semibold text-white">
                          {activity.sport === 'cycling' || activity.sport === 'gravel'
                            ? `${lap.avgSpeedKmh} km/h`
                            : formatPace(lap.avgPaceSecondsPerKm)}
                        </td>
                        <td className="py-2 px-3">+{lap.elevationGainMeters}m</td>
                        <td className="py-2 px-3">{lap.avgHeartRate ? `${lap.avgHeartRate} bpm` : '--'}</td>
                        <td className="py-2 px-3">{lap.avgPower ? `${lap.avgPower} W` : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Description & Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="sm:col-span-2 bg-neutral-900/40 p-4 rounded-xl border border-neutral-800/80">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Workout Debrief
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed">
                {activity.description || 'No detailed debrief provided for this session.'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">Perceived Exertion (RPE):</span>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold font-mono">
                  {activity.perceivedExertion}/10
                </span>
              </div>
            </div>

            {activity.weather && (
              <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-800/80 space-y-2">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-amber-400" />
                  <span>Atmosphere</span>
                </div>
                <div className="text-sm font-bold text-white">{activity.weather.condition}</div>
                <div className="text-xs font-mono text-neutral-400 space-y-1">
                  <div>Temp: {activity.weather.tempC}°C</div>
                  <div>Wind: {activity.weather.windKmh} km/h</div>
                  <div>Humidity: {activity.weather.humidityPct}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
