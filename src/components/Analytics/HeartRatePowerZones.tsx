import React from 'react';
import { Heart, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ZoneProps {
  athleteLthr?: number;
  athleteFtp?: number;
}

export const HeartRatePowerZones: React.FC<ZoneProps> = ({
  athleteLthr = 172,
  athleteFtp = 310,
}) => {
  const hrZones = [
    { zone: 'Z1', name: 'Active Recovery', minPct: '< 68%', bpmRange: `< ${Math.round(athleteLthr * 0.68)} bpm`, hours: '3h 15m', pct: 22, color: 'bg-neutral-500', text: 'text-neutral-400', desc: 'Promotes blood circulation & glycogen resynthesis without fatigue' },
    { zone: 'Z2', name: 'Aerobic Base', minPct: '68% - 83%', bpmRange: `${Math.round(athleteLthr * 0.68)} - ${Math.round(athleteLthr * 0.83)} bpm`, hours: '7h 45m', pct: 54, color: 'bg-sky-500', text: 'text-sky-400', desc: 'Mitochondrial density, capillary growth & maximal lipid oxidation' },
    { zone: 'Z3', name: 'Tempo', minPct: '84% - 94%', bpmRange: `${Math.round(athleteLthr * 0.84)} - ${Math.round(athleteLthr * 0.94)} bpm`, hours: '1h 10m', pct: 8, color: 'bg-emerald-500', text: 'text-emerald-400', desc: 'Aerobic endurance rhythm & carbohydrate economy' },
    { zone: 'Z4', name: 'Lactate Threshold', minPct: '95% - 105%', bpmRange: `${Math.round(athleteLthr * 0.95)} - ${Math.round(athleteLthr * 1.05)} bpm`, hours: '1h 35m', pct: 11, color: 'bg-amber-500', text: 'text-amber-400', desc: 'Lactate clearance capacity and hour-effort sustainable ceiling' },
    { zone: 'Z5', name: 'Anaerobic / VO2max', minPct: '> 106%', bpmRange: `> ${Math.round(athleteLthr * 1.06)} bpm`, hours: '0h 42m', pct: 5, color: 'bg-rose-500', text: 'text-rose-400', desc: 'Maximal stroke volume, cardiac output & high glycolytic flux' },
  ];

  const totalBasePct = 22 + 54; // 76% in Z1/Z2
  const totalHighIntensity = 11 + 5; // 16% in Z4/Z5
  const grayZone = 8; // 8% in Z3

  return (
    <div id="hr-power-zones-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-tight">Zone Distribution & Polarization</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
              Seiler 80/20 Model
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Lactate Threshold HR: {athleteLthr} bpm · Cycling FTP: {athleteFtp} W
          </p>
        </div>

        {/* Polarized Score Badge */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="text-xs font-semibold text-emerald-300">
            Optimal 80/20 Polarization ({totalBasePct}% Base / {totalHighIntensity}% Peak)
          </div>
        </div>
      </div>

      {/* Horizontal Stacked Distribution Bar */}
      <div className="space-y-1.5">
        <div className="h-4 w-full bg-neutral-800 rounded-lg overflow-hidden flex">
          {hrZones.map((z) => (
            <div
              key={z.zone}
              style={{ width: `${z.pct}%` }}
              className={`${z.color} h-full transition-all`}
              title={`${z.zone} ${z.name}: ${z.pct}% (${z.hours})`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[11px] font-mono text-neutral-500">
          <span>0%</span>
          <span>Weekly Time: 14h 27m Total</span>
          <span>100%</span>
        </div>
      </div>

      {/* Zone Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {hrZones.map((z) => (
          <div key={z.zone} className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold ${z.text}`}>{z.zone}</span>
                <span className="text-[10px] font-mono text-neutral-500">{z.minPct}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">{z.name}</div>
              <div className="text-xs font-mono text-neutral-400 mt-0.5">{z.bpmRange}</div>
            </div>

            <div className="pt-3 border-t border-neutral-800/60 mt-3">
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-base font-bold text-white">{z.hours}</span>
                <span className={`text-xs font-bold ${z.text}`}>{z.pct}%</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2 leading-tight">
                {z.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
