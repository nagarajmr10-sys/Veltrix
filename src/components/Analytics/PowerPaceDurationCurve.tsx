import React, { useState } from 'react';
import { Zap, Gauge, Award, Flame } from 'lucide-react';

interface PowerCurvePoint {
  durationLabel: string;
  durationSeconds: number;
  seasonWatts: number;
  allTimeWatts: number;
  energySystem: string;
  wKg: number;
}

interface PaceCurvePoint {
  distanceLabel: string;
  timeLabel: string;
  pacePerKm: string;
  paceSecPerKm: number;
  speedKmh: number;
  dateAchieved: string;
}

interface PowerPaceProps {
  athleteWeightKg?: number;
  athleteFtp?: number;
}

export const PowerPaceDurationCurve: React.FC<PowerPaceProps> = ({
  athleteWeightKg = 69.5,
  athleteFtp = 310,
}) => {
  const [activeTab, setActiveTab] = useState<'power' | 'pace'>('power');

  const powerData: PowerCurvePoint[] = [
    { durationLabel: '5s', durationSeconds: 5, seasonWatts: 965, allTimeWatts: 1040, energySystem: 'ATP-CP / Neuromuscular', wKg: 13.9 },
    { durationLabel: '30s', durationSeconds: 30, seasonWatts: 690, allTimeWatts: 725, energySystem: 'Anaerobic Glycolysis', wKg: 9.9 },
    { durationLabel: '1m', durationSeconds: 60, seasonWatts: 545, allTimeWatts: 575, energySystem: 'Anaerobic Capacity', wKg: 7.8 },
    { durationLabel: '5m', durationSeconds: 300, seasonWatts: 418, allTimeWatts: 432, energySystem: 'Maximal Aerobic / VO2 Max', wKg: 6.0 },
    { durationLabel: '20m', durationSeconds: 1200, seasonWatts: 332, allTimeWatts: 340, energySystem: 'Functional Threshold Power', wKg: 4.8 },
    { durationLabel: '60m', durationSeconds: 3600, seasonWatts: 310, allTimeWatts: 315, energySystem: 'Aerobic Threshold', wKg: 4.5 },
    { durationLabel: '90m', durationSeconds: 5400, seasonWatts: 278, allTimeWatts: 285, energySystem: 'Aerobic Lipolysis & Stamina', wKg: 4.0 },
  ];

  const paceData: PaceCurvePoint[] = [
    { distanceLabel: '400m', timeLabel: '1:06', pacePerKm: '2:45 /km', paceSecPerKm: 165, speedKmh: 21.8, dateAchieved: 'Track Time Trial' },
    { distanceLabel: '1 km', timeLabel: '3:04', pacePerKm: '3:04 /km', paceSecPerKm: 184, speedKmh: 19.6, dateAchieved: 'Boulder Track Club' },
    { distanceLabel: '1 Mile', timeLabel: '4:54', pacePerKm: '3:03 /km', paceSecPerKm: 183, speedKmh: 19.7, dateAchieved: 'Downtown Mile' },
    { distanceLabel: '5 km', timeLabel: '17:15', pacePerKm: '3:27 /km', paceSecPerKm: 207, speedKmh: 17.4, dateAchieved: 'Spring Fling 5K' },
    { distanceLabel: '10 km', timeLabel: '36:10', pacePerKm: '3:37 /km', paceSecPerKm: 217, speedKmh: 16.6, dateAchieved: 'BolderBoulder 10K' },
    { distanceLabel: 'Half Marathon', timeLabel: '1:19:42', pacePerKm: '3:47 /km', paceSecPerKm: 227, speedKmh: 15.9, dateAchieved: 'Rock \'n\' Roll Denver' },
    { distanceLabel: 'Marathon', timeLabel: '2:49:15', pacePerKm: '4:01 /km', paceSecPerKm: 241, speedKmh: 14.9, dateAchieved: 'California International' },
  ];

  return (
    <div id="power-pace-curve-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-5">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-tight">Mean Maximal Curves</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
              Power & Pace Profile
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Peak duration performance envelope across all recorded efforts
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('power')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'power'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Power Duration (Cycling)
          </button>
          <button
            onClick={() => setActiveTab('pace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'pace'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Pace Duration (Running)
          </button>
        </div>
      </div>

      {activeTab === 'power' ? (
        /* Power Curve */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800/80">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">FTP Benchmark</div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">{athleteFtp} <span className="text-xs text-neutral-500 font-sans">Watts</span></div>
              <div className="text-[11px] text-neutral-400">{(athleteFtp / athleteWeightKg).toFixed(2)} W/kg</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Sprint (5s Peak)</div>
              <div className="text-2xl font-black font-mono text-white mt-1">965 <span className="text-xs text-neutral-500 font-sans">Watts</span></div>
              <div className="text-[11px] text-neutral-400">13.9 W/kg (Cat 1)</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">VO2 Max (5m Peak)</div>
              <div className="text-2xl font-black font-mono text-white mt-1">418 <span className="text-xs text-neutral-500 font-sans">Watts</span></div>
              <div className="text-[11px] text-neutral-400">6.0 W/kg (Pro Level)</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">20m TT Power</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">332 <span className="text-xs text-neutral-500 font-sans">Watts</span></div>
              <div className="text-[11px] text-neutral-400">4.8 W/kg</div>
            </div>
          </div>

          {/* Bar Chart Representation of Power Curve */}
          <div className="space-y-2 pt-2">
            {powerData.map((pt) => {
              const pctOfMax = (pt.seasonWatts / 1000) * 100;
              return (
                <div key={pt.durationLabel} className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white w-10 text-sm">{pt.durationLabel}</span>
                      <span className="text-neutral-400 font-sans">{pt.energySystem}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-neutral-500 text-[11px]">All-Time: {pt.allTimeWatts}W</span>
                      <span className="text-white font-bold text-sm">{pt.seasonWatts} W</span>
                      <span className="text-amber-400 font-semibold text-xs">({pt.wKg} W/kg)</span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pctOfMax}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Pace Curve */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800/80">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Threshold Pace</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">3:48 <span className="text-xs text-neutral-500 font-sans">/km</span></div>
              <div className="text-[11px] text-neutral-400">15.8 km/h</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">5K Personal Best</div>
              <div className="text-2xl font-black font-mono text-white mt-1">17:15</div>
              <div className="text-[11px] text-neutral-400">3:27 /km</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">10K Personal Best</div>
              <div className="text-2xl font-black font-mono text-white mt-1">36:10</div>
              <div className="text-[11px] text-neutral-400">3:37 /km</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Half Marathon PR</div>
              <div className="text-2xl font-black font-mono text-sky-400 mt-1">1:19:42</div>
              <div className="text-[11px] text-neutral-400">3:47 /km</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {paceData.map((pt) => (
              <div key={pt.distanceLabel} className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{pt.distanceLabel}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {pt.speedKmh} km/h
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{pt.dateAchieved}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black font-mono text-emerald-400">{pt.timeLabel}</div>
                  <div className="text-[11px] font-mono text-neutral-400">{pt.pacePerKm}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
