import React, { useState } from 'react';
import { X, Check, Activity, Zap, Heart, Shield, Plus, AlertTriangle } from 'lucide-react';
import { AthleteProfile, GearItem } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AthleteProfile;
  gearList: GearItem[];
  onUpdateProfile: (updated: AthleteProfile) => void;
  onUpdateGear: (updated: GearItem[]) => void;
}

export const AthleteProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  gearList,
  onUpdateProfile,
  onUpdateGear,
}) => {
  const [ftp, setFtp] = useState(profile.ftpWatts);
  const [lthr, setLthr] = useState(profile.lthr);
  const [maxHr, setMaxHr] = useState(profile.maxHeartRate);
  const [restingHr, setRestingHr] = useState(profile.restingHeartRate);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [vo2Max, setVo2Max] = useState(profile.vo2Max);
  const [weeklyGoalKm, setWeeklyGoalKm] = useState(profile.weeklyGoalKm);

  // New gear item
  const [newGearName, setNewGearName] = useState('');
  const [newGearType, setNewGearType] = useState<GearItem['type']>('shoes');
  const [newGearLimit, setNewGearLimit] = useState(600);

  if (!isOpen) return null;

  const wattsPerKg = (ftp / weightKg).toFixed(2);

  const handleSave = () => {
    onUpdateProfile({
      ...profile,
      ftpWatts: ftp,
      lthr,
      maxHeartRate: maxHr,
      restingHeartRate: restingHr,
      weightKg,
      vo2Max,
      weeklyGoalKm,
    });
    onClose();
  };

  const handleAddGear = () => {
    if (!newGearName.trim()) return;
    const item: GearItem = {
      id: `gear-${Date.now()}`,
      name: newGearName.trim(),
      type: newGearType,
      brandModel: 'Added Gear',
      distanceKm: 0,
      maxDistanceKm: newGearLimit,
      isRetired: false,
    };
    onUpdateGear([...gearList, item]);
    setNewGearName('');
  };

  return (
    <div id="athlete-profile-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/50"
            />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{profile.name}</h2>
              <div className="text-xs text-neutral-400 font-mono">{profile.handle} · {profile.location}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Thresholds & Biometrics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Endurance Thresholds & Benchmarks
              </h3>
              <span className="text-xs font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                Current: <strong className="text-amber-400">{wattsPerKg} W/kg</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <label className="text-[11px] text-neutral-400 font-medium">FTP (Watts)</label>
                <input
                  type="number"
                  value={ftp}
                  onChange={(e) => setFtp(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <label className="text-[11px] text-neutral-400 font-medium">LTHR (Lactate Threshold)</label>
                <input
                  type="number"
                  value={lthr}
                  onChange={(e) => setLthr(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <label className="text-[11px] text-neutral-400 font-medium">Max Heart Rate</label>
                <input
                  type="number"
                  value={maxHr}
                  onChange={(e) => setMaxHr(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <label className="text-[11px] text-neutral-400 font-medium">Weight (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <label className="text-[11px] text-neutral-400 font-medium">VO2 Max (ml/kg/min)</label>
                <input
                  type="number"
                  value={vo2Max}
                  onChange={(e) => setVo2Max(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                <label className="text-[11px] text-neutral-400 font-medium">Weekly Goal (km)</label>
                <input
                  type="number"
                  value={weeklyGoalKm}
                  onChange={(e) => setWeeklyGoalKm(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-sm text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Gear Tracker & Wear Gauges */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Gear Mileage & Component Wear Tracker
            </h3>

            <div className="space-y-2.5">
              {gearList.map((g) => {
                const wearPct = Math.round((g.distanceKm / g.maxDistanceKm) * 100);
                const isNearRetirement = wearPct >= 85;

                return (
                  <div key={g.id} className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{g.name}</span>
                        {isNearRetirement && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Retirement Alert
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 font-mono">{g.brandModel}</div>
                    </div>

                    <div className="sm:w-56 space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-neutral-400">{g.distanceKm} / {g.maxDistanceKm} km</span>
                        <span className={isNearRetirement ? 'text-rose-400 font-bold' : 'text-neutral-300'}>{wearPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isNearRetirement ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, wearPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Gear */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="New gear name (e.g. Asics Metaspeed Sky+)"
                value={newGearName}
                onChange={(e) => setNewGearName(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={handleAddGear}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Gear
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/60 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
          >
            <Check className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};
