import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  Flag,
  Navigation as NavIcon,
  Activity as ActivityIcon,
  Heart,
  Zap,
  Gauge,
  Mountain,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Sun,
  Wind,
  Thermometer,
  CloudRain,
  Compass,
  Download,
  Crosshair,
  MapPin,
  Signal,
  Layers,
  Table,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Activity, GPSPoint, LapSplit, SportType, HardwareSensorDevice } from '../../types';
import { RouteMap } from '../Map/RouteMap';
import { LiveWeatherCockpit } from './LiveWeatherCockpit';
import { LiveWeatherData } from '../../services/weatherService';
import { downloadGPXFile } from '../../utils/gpxExport';
import {
  calculateHaversineDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  getHeartRateZone,
  getPowerZone,
  calculateNormalizedPower,
  calculateTSS,
  PRESET_SIMULATION_ROUTES,
} from '../../utils/geoUtils';

interface LiveRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveActivity: (activity: Activity) => void;
  athleteFtp?: number;
  athleteLthr?: number;
  gearList?: { id: string; name: string }[];
  hardwareSensors?: HardwareSensorDevice[];
}

function getCardinalDirection(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

function getGpsSignalDetails(accuracy: number, status: string) {
  if (status === 'denied') return { bars: 0, label: 'GPS Denied', color: 'text-rose-500', sats: 0, fix: 'No Fix' };
  if (status === 'acquiring') return { bars: 1, label: 'Acquiring...', color: 'text-amber-400', sats: 4, fix: '2D Search' };
  if (accuracy <= 3.5) return { bars: 4, label: 'Multi-Band GNSS', color: 'text-emerald-400', sats: 22, fix: '3D Multi-Band' };
  if (accuracy <= 8) return { bars: 3, label: '3D High Accuracy', color: 'text-emerald-400', sats: 17, fix: '3D Fix' };
  if (accuracy <= 20) return { bars: 2, label: 'Standard GNSS', color: 'text-amber-400', sats: 11, fix: '3D Fix' };
  return { bars: 1, label: 'Weak Signal', color: 'text-rose-400', sats: 6, fix: '2D Fix' };
}

export const LiveRecordModal: React.FC<LiveRecordModalProps> = ({
  isOpen,
  onClose,
  onSaveActivity,
  athleteFtp = 310,
  athleteLthr = 172,
  gearList = [],
  hardwareSensors = [],
}) => {
  const [sport, setSport] = useState<SportType>('cycling');
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
  const [trackingMode, setTrackingMode] = useState<'real' | 'simulation'>('simulation');
  const [selectedSimRoute, setSelectedSimRoute] = useState(PRESET_SIMULATION_ROUTES[0].id);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(2); // 2x simulation speed
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);

  // Live Telemetry States
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [movingSeconds, setMovingSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [currentPaceSecPerKm, setCurrentPaceSecPerKm] = useState(0);
  const [currentHeartRate, setCurrentHeartRate] = useState(148);
  const [currentCadence, setCurrentCadence] = useState(88);
  const [currentPower, setCurrentPower] = useState(245);
  const [elevationGain, setElevationGain] = useState(0);
  const [currentGradePct, setCurrentGradePct] = useState(2.4);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(3.8); // meters
  const [liveTSS, setLiveTSS] = useState(0);

  // GPS Diagnostics & Breadcrumbs Stream State
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'locked' | 'denied' | 'error'>('idle');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [showBreadcrumbsPanel, setShowBreadcrumbsPanel] = useState(false);
  const [gpxExportedSuccess, setGpxExportedSuccess] = useState(false);
  const [liveGpsHeading, setLiveGpsHeading] = useState<number | null>(null);
  const [rawCoordinates, setRawCoordinates] = useState<{
    lat: number;
    lon: number;
    alt: number;
    acc: number;
    speed: number;
    timestamp: number;
  } | null>(null);

  // Track & Laps
  const [trackPoints, setTrackPoints] = useState<GPSPoint[]>([]);
  const [laps, setLaps] = useState<LapSplit[]>([]);
  const lastLapDistanceRef = useRef(0);
  const lastLapTimeRef = useRef(0);

  // Audio tone generator
  const playBeep = (freq = 880, durationMs = 120) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + durationMs / 1000);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // Save Workout Form State
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [perceivedExertion, setPerceivedExertion] = useState(7);
  const [selectedGear, setSelectedGear] = useState(gearList[0]?.name || 'Primary Equipment');
  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);

  // Simulation step tracker
  const simStepRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);

  // Timer Tick: In true endurance telemetry, elapsed time accumulates continuously once initiated (including paused stops), while moving time only ticks during active motion
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (status === 'recording' || status === 'paused') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        if (status === 'recording' && (currentSpeedKmh > 1.5 || !autoPauseEnabled)) {
          setMovingSeconds((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, currentSpeedKmh, autoPauseEnabled]);

  // Real GPS Telemetry Watcher
  useEffect(() => {
    if (!isOpen) return;

    if (trackingMode === 'real') {
      if (!navigator.geolocation) {
        setGpsStatus('error');
        setGpsErrorMessage('Geolocation is not supported by this browser.');
        return;
      }

      setGpsStatus((prev) => (prev === 'locked' ? 'locked' : 'acquiring'));

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, altitude, speed, accuracy, heading } = pos.coords;
          setGpsAccuracy(accuracy || 3.5);
          setGpsStatus('locked');
          setGpsErrorMessage(null);

          if (heading !== null && heading !== undefined && !isNaN(heading)) {
            setLiveGpsHeading(heading);
          }

          setRawCoordinates({
            lat: latitude,
            lon: longitude,
            alt: altitude || 15,
            acc: accuracy || 3.5,
            speed: (speed || 0) * 3.6,
            timestamp: pos.timestamp || Date.now(),
          });

          // Only record into track points when actively recording
          if (status === 'recording') {
            const newPt: GPSPoint = {
              latitude,
              longitude,
              altitude: altitude || 15,
              speed: speed || 0,
              heartRate: currentHeartRate,
              cadence: currentCadence,
              power: currentPower,
              timestamp: Date.now(),
            };

            setTrackPoints((prev) => {
              if (prev.length > 0) {
                const lastPt = prev[prev.length - 1];
                const dist = calculateHaversineDistance(
                  lastPt.latitude,
                  lastPt.longitude,
                  latitude,
                  longitude
                );

                // Movement filter: at least 2.5 meters to avoid stationary GPS noise/drift
                if (dist > 0.0025) {
                  setDistanceKm((d) => d + dist);
                  const spdKmh = (speed !== null && speed !== undefined ? speed : 0) * 3.6;
                  setCurrentSpeedKmh(spdKmh);
                  if (spdKmh > 0.5) {
                    setCurrentPaceSecPerKm(3600 / spdKmh);
                  }
                  if (altitude && lastPt.altitude && altitude > lastPt.altitude) {
                    const gain = altitude - lastPt.altitude;
                    setElevationGain((e) => e + gain);
                    setCurrentGradePct(Number(((gain / (dist * 1000)) * 100).toFixed(1)));
                  }
                }
              }
              return [...prev, newPt];
            });
          }
        },
        (err) => {
          console.warn('Geolocation capture watch error:', err);
          if (err.code === 1) {
            setGpsStatus('denied');
            setGpsErrorMessage('Browser location access was denied. Please allow location permissions in your browser bar.');
          } else if (err.code === 2) {
            setGpsStatus('error');
            setGpsErrorMessage('Position unavailable. Please ensure device GPS is turned on.');
          } else if (err.code === 3) {
            setGpsStatus('error');
            setGpsErrorMessage('GPS fix acquisition timed out. Re-trying satellite lock...');
          } else {
            setGpsStatus('error');
            setGpsErrorMessage(err.message || 'Error acquiring GPS coordinates.');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      watchIdRef.current = id;

      return () => {
        navigator.geolocation.clearWatch(id);
      };
    }
  }, [isOpen, trackingMode, status, currentHeartRate, currentCadence, currentPower]);

  // Simulation Mode Runner
  useEffect(() => {
    if (status !== 'recording' || trackingMode !== 'simulation') return;

    const selectedRoute =
      PRESET_SIMULATION_ROUTES.find((r) => r.id === selectedSimRoute) ||
      PRESET_SIMULATION_ROUTES[0];

    const intervalMs = Math.max(250, 1000 / simSpeedMultiplier);

    const simInterval = setInterval(() => {
      simStepRef.current += 1;
      const totalPoints = selectedRoute.pointsCount;
      const progress = (simStepRef.current % totalPoints) / totalPoints;
      const { lat, lon, ele } = selectedRoute.generatePoint(progress);

      // Realistic variations
      const isClimbing = Math.sin(progress * Math.PI * 4) > 0.3;
      const simulatedWatts = sport === 'cycling' || sport === 'gravel'
        ? Math.round(isClimbing ? 310 + Math.random() * 50 : 220 + Math.random() * 30)
        : Math.round(isClimbing ? 370 + Math.random() * 20 : 320 + Math.random() * 20);

      const simulatedSpeed = sport === 'cycling' || sport === 'gravel'
        ? (isClimbing ? 18 + Math.random() * 4 : 36 + Math.random() * 6)
        : (isClimbing ? 11 + Math.random() * 2 : 15.5 + Math.random() * 1.5);

      const simulatedHR = Math.round(isClimbing ? 166 + Math.random() * 12 : 144 + Math.random() * 8);
      const simulatedCadence = sport === 'cycling' || sport === 'gravel'
        ? Math.round(86 + Math.random() * 8)
        : Math.round(176 + Math.random() * 6);

      setCurrentHeartRate(simulatedHR);
      setCurrentPower(simulatedWatts);
      setCurrentSpeedKmh(simulatedSpeed);
      setCurrentPaceSecPerKm(3600 / simulatedSpeed);
      setCurrentCadence(simulatedCadence);
      setCurrentGradePct(isClimbing ? Number((4.5 + Math.random() * 3).toFixed(1)) : 0.8);

      const newPt: GPSPoint = {
        latitude: lat,
        longitude: lon,
        altitude: ele,
        speed: simulatedSpeed / 3.6,
        heartRate: simulatedHR,
        cadence: simulatedCadence,
        power: simulatedWatts,
        timestamp: Date.now(),
      };

      setRawCoordinates({
        lat,
        lon,
        alt: ele,
        acc: 2.1,
        speed: simulatedSpeed,
        timestamp: Date.now(),
      });

      setTrackPoints((prev) => {
        if (prev.length > 0) {
          const lastPt = prev[prev.length - 1];
          const dist = calculateHaversineDistance(
            lastPt.latitude,
            lastPt.longitude,
            lat,
            lon
          );
          setDistanceKm((d) => d + dist);
          if (ele > (lastPt.altitude || 0)) {
            setElevationGain((e) => e + (ele - (lastPt.altitude || 0)));
          }
        }
        return [...prev, newPt];
      });
    }, intervalMs);

    return () => clearInterval(simInterval);
  }, [status, trackingMode, selectedSimRoute, simSpeedMultiplier, sport]);

  // Auto-Lap Check (every 1.0 km)
  useEffect(() => {
    if (distanceKm - lastLapDistanceRef.current >= 1.0) {
      const lapDist = distanceKm - lastLapDistanceRef.current;
      const lapDuration = movingSeconds - lastLapTimeRef.current;
      const avgPace = lapDist > 0 ? lapDuration / lapDist : 0;
      const avgSpd = lapDuration > 0 ? (lapDist / (lapDuration / 3600)) : 0;

      const newLap: LapSplit = {
        lapNumber: laps.length + 1,
        distanceKm: Number(lapDist.toFixed(2)),
        durationSeconds: lapDuration,
        avgPaceSecondsPerKm: Math.round(avgPace),
        avgSpeedKmh: Number(avgSpd.toFixed(1)),
        elevationGainMeters: 15,
        avgHeartRate: currentHeartRate,
        avgPower: currentPower,
      };

      setLaps((prev) => [...prev, newLap]);
      lastLapDistanceRef.current = distanceKm;
      lastLapTimeRef.current = movingSeconds;
      playBeep(1046, 200); // High pitch auto-lap chime
    }
  }, [distanceKm, movingSeconds, laps.length, currentHeartRate, currentPower]);

  // Live TSS recalculation
  useEffect(() => {
    if (movingSeconds > 0 && currentPower > 0) {
      const powerHistory = trackPoints.map((p) => p.power || currentPower);
      const np = calculateNormalizedPower(powerHistory);
      const tss = calculateTSS(movingSeconds, np, athleteFtp);
      setLiveTSS(tss);
    }
  }, [movingSeconds, currentPower, trackPoints, athleteFtp]);

  // Handlers
  const handleStart = () => {
    setStatus('recording');
    playBeep(523, 150); // Start tone
  };

  const handlePause = () => {
    setStatus('paused');
    playBeep(392, 180); // Pause tone
  };

  const handleResume = () => {
    setStatus('recording');
    playBeep(587, 150);
  };

  const handleManualLap = () => {
    const lapDist = distanceKm - lastLapDistanceRef.current;
    const lapDuration = movingSeconds - lastLapTimeRef.current;
    const avgPace = lapDist > 0 ? lapDuration / lapDist : 0;
    const avgSpd = lapDuration > 0 ? (lapDist / (lapDuration / 3600)) : 0;

    const newLap: LapSplit = {
      lapNumber: laps.length + 1,
      distanceKm: Number(lapDist.toFixed(2)),
      durationSeconds: lapDuration,
      avgPaceSecondsPerKm: Math.round(avgPace),
      avgSpeedKmh: Number(avgSpd.toFixed(1)),
      elevationGainMeters: 12,
      avgHeartRate: currentHeartRate,
      avgPower: currentPower,
    };

    setLaps((prev) => [...prev, newLap]);
    lastLapDistanceRef.current = distanceKm;
    lastLapTimeRef.current = movingSeconds;
    playBeep(1318, 160);
  };

  const handleFinish = () => {
    setStatus('finished');
    playBeep(880, 300);

    // Set default title
    const sportName = sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' ');
    const timeOfDay = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';
    setSaveTitle(`${timeOfDay} ${sportName} - ${distanceKm.toFixed(1)}km`);
  };

  const handleConfirmSave = () => {
    const powerReadings = trackPoints.map((p) => p.power || 0).filter((w) => w > 0);
    const np = calculateNormalizedPower(powerReadings);
    const avgPwr = powerReadings.length > 0 ? Math.round(powerReadings.reduce((a, b) => a + b, 0) / powerReadings.length) : undefined;
    const avgSpd = movingSeconds > 0 ? (distanceKm / (movingSeconds / 3600)) : 0;
    const finalTss = calculateTSS(movingSeconds, np || avgPwr || 220, athleteFtp);

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      title: saveTitle.trim() || 'Veltrix Workout',
      sport,
      date: new Date().toISOString(),
      distanceKm: Number(distanceKm.toFixed(2)),
      durationSeconds: elapsedSeconds,
      movingTimeSeconds: movingSeconds || elapsedSeconds,
      elapsedTimeSeconds: elapsedSeconds,
      elevationGainMeters: Math.round(elevationGain),
      avgSpeedKmh: Number(avgSpd.toFixed(1)),
      maxSpeedKmh: Number((avgSpd * 1.45).toFixed(1)),
      avgPaceSecondsPerKm: distanceKm > 0 ? Math.round(movingSeconds / distanceKm) : 0,
      avgHeartRate: currentHeartRate,
      maxHeartRate: currentHeartRate + 14,
      avgCadence: currentCadence,
      avgPower: avgPwr,
      normalizedPower: np,
      tss: Math.max(12, finalTss),
      intensityFactor: np ? Number((np / athleteFtp).toFixed(2)) : 0.88,
      calories: Math.round(distanceKm * (sport === 'running' ? 72 : 32)),
      perceivedExertion,
      description: saveDescription.trim(),
      gearName: selectedGear,
      athleteName: 'Alex Rivera',
      athleteAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      athleteLocation: liveWeather?.locationName || 'Live Tracked GPS',
      weather: liveWeather
        ? {
            tempC: liveWeather.tempC,
            condition: liveWeather.condition,
            windKmh: liveWeather.windSpeedKmh,
            humidityPct: liveWeather.humidityPct,
          }
        : undefined,
      trainingEffectAerobic: Number((3.2 + Math.min(1.7, distanceKm / 20)).toFixed(1)),
      trainingEffectAnaerobic: Number((1.5 + (currentPower > athleteFtp ? 1.4 : 0.6)).toFixed(1)),
      kudosCount: 1,
      commentsCount: 0,
      gpsTrack: trackPoints.length > 0 ? trackPoints : [
        { latitude: 37.8324, longitude: -122.5028, altitude: 45, timestamp: Date.now() },
      ],
      laps: laps.length > 0 ? laps : [
        {
          lapNumber: 1,
          distanceKm: Number(distanceKm.toFixed(2)),
          durationSeconds: movingSeconds || elapsedSeconds,
          avgPaceSecondsPerKm: distanceKm > 0 ? Math.round(movingSeconds / distanceKm) : 0,
          avgSpeedKmh: Number(avgSpd.toFixed(1)),
          elevationGainMeters: Math.round(elevationGain),
        },
      ],
    };

    onSaveActivity(newActivity);

    // Trigger celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    onClose();
  };

  const handleReset = () => {
    setStatus('idle');
    setElapsedSeconds(0);
    setMovingSeconds(0);
    setDistanceKm(0);
    setElevationGain(0);
    setTrackPoints([]);
    setLaps([]);
    lastLapDistanceRef.current = 0;
    lastLapTimeRef.current = 0;
    simStepRef.current = 0;
  };

  const hrZone = getHeartRateZone(currentHeartRate, athleteLthr);
  const powerZone = getPowerZone(currentPower, athleteFtp);
  const currentPos = trackPoints.length > 0 ? trackPoints[trackPoints.length - 1] : null;

  // Selected simulation route point fallback when no track points yet
  const simInitialCoords = useMemo(() => {
    const route =
      PRESET_SIMULATION_ROUTES.find((r) => r.id === selectedSimRoute) ||
      PRESET_SIMULATION_ROUTES[0];
    return route.generatePoint(0);
  }, [selectedSimRoute]);

  const activeLat = currentPos
    ? currentPos.latitude
    : trackingMode === 'simulation'
    ? simInitialCoords.lat
    : undefined;

  const activeLon = currentPos
    ? currentPos.longitude
    : trackingMode === 'simulation'
    ? simInitialCoords.lon
    : undefined;

  // Calculate current athlete bearing / travel heading in degrees
  const athleteBearingDeg = useMemo(() => {
    if (trackPoints.length >= 2) {
      const p1 = trackPoints[trackPoints.length - 2];
      const p2 = trackPoints[trackPoints.length - 1];
      const y =
        Math.sin(((p2.longitude - p1.longitude) * Math.PI) / 180) *
        Math.cos((p2.latitude * Math.PI) / 180);
      const x =
        Math.cos((p1.latitude * Math.PI) / 180) * Math.sin((p2.latitude * Math.PI) / 180) -
        Math.sin((p1.latitude * Math.PI) / 180) *
          Math.cos((p2.latitude * Math.PI) / 180) *
          Math.cos(((p2.longitude - p1.longitude) * Math.PI) / 180);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
    return undefined;
  }, [trackPoints]);

  if (!isOpen) return null;

  return (
    <div id="live-record-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Header Cockpit Bar */}
        <div className="px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide uppercase">
              <span className={`w-2 h-2 rounded-full ${status === 'recording' ? 'bg-orange-500 animate-ping' : status === 'paused' ? 'bg-amber-400' : 'bg-neutral-500'}`} />
              {status === 'recording' ? 'LIVE TELEMETRY' : status === 'paused' ? 'PAUSED' : status === 'finished' ? 'COMPLETE' : 'READY TO RECORD'}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>GPS LOCK: ±{gpsAccuracy.toFixed(1)}m</span>
            </div>
          </div>

          {/* Quick Cockpit Settings */}
          <div className="flex items-center gap-2">
            <button
              id="toggle-audio-cues"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute audio tones' : 'Enable audio tones'}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {status === 'idle' && (
              <button
                id="close-live-modal"
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Finished / Save Workout View */}
        {status === 'finished' ? (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Save Your Activity</h3>
                <p className="text-xs text-neutral-400">Recorded {distanceKm.toFixed(2)} km in {formatDuration(movingSeconds, true)}</p>
              </div>
            </div>

            {/* Quick Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Distance</div>
                <div className="text-2xl font-black font-mono text-white mt-1">{distanceKm.toFixed(2)} <span className="text-xs text-neutral-400 font-sans">km</span></div>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Moving Time</div>
                <div className="text-2xl font-black font-mono text-white mt-1">{formatDuration(movingSeconds)}</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Active Motion</div>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Elapsed Time</div>
                <div className="text-2xl font-black font-mono text-neutral-300 mt-1">{formatDuration(elapsedSeconds)}</div>
                <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                  +{formatDuration(Math.max(0, elapsedSeconds - movingSeconds))} Paused
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Avg Pace/Speed</div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {sport === 'cycling' || sport === 'gravel' ? formatSpeed(currentSpeedKmh) : formatPace(currentPaceSecPerKm)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 col-span-2 sm:col-span-1">
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Estimated TSS</div>
                <div className="text-2xl font-black font-mono text-orange-400 mt-1">{liveTSS}</div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Training Stress</div>
              </div>
            </div>

            {/* Weather Encountered Summary Pill */}
            {liveWeather && (
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-amber-400 shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-white font-bold flex items-center gap-2">
                      <span>{liveWeather.condition}</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-orange-400 font-bold">{liveWeather.tempC}°C ({liveWeather.tempF}°F)</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Wind: {liveWeather.windSpeedKmh} km/h {liveWeather.windDirectionCardinal} (Gusts {liveWeather.windGustsKmh} km/h) · Humidity: {liveWeather.humidityPct}%
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-neutral-400">
                  <div className="text-neutral-200 font-semibold">{liveWeather.locationName}</div>
                  <div className="text-[10px] text-neutral-500">Recorded Live Weather Conditions</div>
                </div>
              </div>
            )}

            {/* Form Inputs */}
            <div className="space-y-4 bg-neutral-900/50 p-5 rounded-xl border border-neutral-800">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Activity Title
                </label>
                <input
                  id="activity-title-input"
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Workout Notes & Biomechanics
                </label>
                <textarea
                  id="activity-notes-input"
                  rows={3}
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="How did your legs feel? Any headwinds, gear changes, or pacing breakthroughs?"
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Perceived Exertion (RPE: {perceivedExertion}/10)
                  </label>
                  <input
                    id="rpe-slider"
                    type="range"
                    min="1"
                    max="10"
                    value={perceivedExertion}
                    onChange={(e) => setPerceivedExertion(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-500 mt-1">
                    <span>1 Easy Recovery</span>
                    <span>5 Moderate Tempo</span>
                    <span>10 All-Out Max</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Equipment / Gear
                  </label>
                  <select
                    id="gear-select"
                    value={selectedGear}
                    onChange={(e) => setSelectedGear(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-200 text-sm focus:outline-none focus:border-orange-500"
                  >
                    {gearList.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                    <option value="Primary Equipment">Primary Equipment</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                id="save-screen-export-gpx-btn"
                onClick={() => {
                  const filename = (saveTitle || 'workout_track').toLowerCase().replace(/[^a-z0-9]/g, '_');
                  const ok = downloadGPXFile(filename, trackPoints, sport);
                  if (ok) {
                    setGpxExportedSuccess(true);
                    setTimeout(() => setGpxExportedSuccess(false), 3000);
                  }
                }}
                disabled={trackPoints.length === 0}
                className="px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-sm font-semibold flex items-center gap-2 transition disabled:opacity-40"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{gpxExportedSuccess ? 'GPX File Exported!' : 'Export Standard GPX Track'}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  id="discard-activity-button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition text-sm font-medium"
                >
                  Discard
                </button>
                <button
                  id="save-activity-button"
                  onClick={handleConfirmSave}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold text-sm tracking-wide shadow-lg shadow-orange-500/20 flex items-center gap-2 transition"
                >
                  <Check className="w-4 h-4" />
                  Save & Analyze
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Recording & Cockpit View */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            {/* Sport & Mode Switcher (When Idle) */}
            {status === 'idle' && (
              <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Sport Selector */}
                  <div className="flex items-center gap-2">
                    {(['cycling', 'running', 'gravel', 'trail_running'] as SportType[]).map((st) => (
                      <button
                        key={st}
                        id={`sport-btn-${st}`}
                        onClick={() => setSport(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                          sport === st
                            ? 'bg-orange-500 text-black'
                            : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                    <button
                      id="mode-simulation-btn"
                      onClick={() => setTrackingMode('simulation')}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        trackingMode === 'simulation'
                          ? 'bg-neutral-800 text-white shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-300'
                      }`}
                    >
                      Scenic Simulation
                    </button>
                    <button
                      id="mode-real-gps-btn"
                      onClick={() => setTrackingMode('real')}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        trackingMode === 'real'
                          ? 'bg-neutral-800 text-white shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-300'
                      }`}
                    >
                      Real Device GPS
                    </button>
                  </div>
                </div>

                {trackingMode === 'simulation' ? (
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-800/80 text-xs">
                    <span className="text-neutral-400 font-medium">Simulation Route:</span>
                    <select
                      id="simulation-route-select"
                      value={selectedSimRoute}
                      onChange={(e) => setSelectedSimRoute(e.target.value)}
                      className="px-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 text-xs focus:outline-none focus:border-orange-500"
                    >
                      {PRESET_SIMULATION_ROUTES.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-neutral-500">Speed Multiplier:</span>
                      {[1, 2, 5].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setSimSpeedMultiplier(spd)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                            simSpeedMultiplier === spd
                              ? 'bg-orange-500 text-black font-bold'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-neutral-800/80 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${gpsStatus === 'locked' ? 'bg-emerald-500 animate-pulse' : gpsStatus === 'acquiring' ? 'bg-amber-400 animate-ping' : 'bg-rose-500'}`} />
                        <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                          {gpsStatus === 'locked' ? 'High-Precision GNSS Receiver Active' : gpsStatus === 'acquiring' ? 'Acquiring Satellites...' : 'GPS Offline / Permission Denied'}
                        </span>
                        {gpsStatus === 'locked' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                            ±{gpsAccuracy.toFixed(1)}m Accuracy
                          </span>
                        )}
                      </div>

                      {rawCoordinates && (
                        <div className="font-mono text-[11px] text-neutral-400 flex items-center gap-3">
                          <span className="text-neutral-300">{rawCoordinates.lat.toFixed(6)}°, {rawCoordinates.lon.toFixed(6)}°</span>
                          <span>Alt: {Math.round(rawCoordinates.alt)}m</span>
                          {liveGpsHeading !== null && (
                            <span className="text-orange-400">{Math.round(liveGpsHeading)}° {getCardinalDirection(liveGpsHeading)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {gpsStatus === 'denied' && (
                      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start justify-between gap-3 mt-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Browser Location Permission Required</span>
                            <span className="text-[11px] text-rose-200">{gpsErrorMessage || 'Please allow location permission in your browser address bar to record real GPS routes.'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTrackingMode('simulation')}
                          className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-white font-semibold text-[11px] shrink-0"
                        >
                          Use Simulation
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Real-Time Live Weather Cockpit Widget */}
            <LiveWeatherCockpit
              currentLat={activeLat}
              currentLon={activeLon}
              athleteBearingDeg={athleteBearingDeg}
              isRealGps={trackingMode === 'real'}
              onWeatherDataUpdate={setLiveWeather}
            />

            {/* GNSS & GPS Satellite Live Telemetry Ribbon */}
            {(() => {
              const sig = getGpsSignalDetails(gpsAccuracy, gpsStatus);
              return (
                <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          className={`w-1 rounded-sm transition-all ${
                            bar <= sig.bars
                              ? 'bg-emerald-400'
                              : 'bg-neutral-700'
                          }`}
                          style={{ height: `${bar * 3.5 + 4}px` }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-[11px]">{sig.label}</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">
                        {sig.fix}
                      </span>
                      <span className="text-neutral-500 font-mono text-[11px]">
                        (±{gpsAccuracy.toFixed(1)}m error margin)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {rawCoordinates ? (
                      <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1 text-neutral-300">
                          <MapPin className="w-3 h-3 text-orange-400" />
                          {rawCoordinates.lat.toFixed(5)}°, {rawCoordinates.lon.toFixed(5)}°
                        </span>
                        <span className="flex items-center gap-1 text-neutral-300">
                          <Compass className="w-3 h-3 text-sky-400" />
                          {liveGpsHeading !== null ? `${Math.round(liveGpsHeading)}° ${getCardinalDirection(liveGpsHeading)}` : 'Tracking'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-neutral-500 font-mono text-[11px]">Waiting for GPS lock...</span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        id="toggle-breadcrumbs-stream-btn"
                        onClick={() => setShowBreadcrumbsPanel(!showBreadcrumbsPanel)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition ${
                          showBreadcrumbsPanel
                            ? 'bg-orange-500 text-black font-bold border-orange-500'
                            : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                        }`}
                        title="View raw GPS breadcrumb coordinates stream"
                      >
                        <Table className="w-3 h-3" />
                        <span>GPS Stream ({trackPoints.length})</span>
                      </button>

                      <button
                        type="button"
                        id="live-export-gpx-btn"
                        onClick={() => {
                          const filename = `live_${sport}_${Date.now()}`;
                          const ok = downloadGPXFile(filename, trackPoints, sport);
                          if (ok) {
                            setGpxExportedSuccess(true);
                            setTimeout(() => setGpxExportedSuccess(false), 2500);
                          }
                        }}
                        disabled={trackPoints.length === 0}
                        className="px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-[11px] font-mono flex items-center gap-1.5 transition disabled:opacity-40"
                        title="Export current GPS track as .gpx file"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        <span>{gpxExportedSuccess ? 'Downloaded!' : 'GPX'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Expandable Live GPS Breadcrumbs Stream Inspector */}
            {showBreadcrumbsPanel && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      GNSS Telemetry & Breadcrumbs Stream ({trackPoints.length} Points Logged)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const filename = `gps_log_${Date.now()}`;
                        downloadGPXFile(filename, trackPoints, sport);
                      }}
                      disabled={trackPoints.length === 0}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono flex items-center gap-1 disabled:opacity-40"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      Save GPX
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBreadcrumbsPanel(false)}
                      className="text-neutral-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded-lg">
                  {trackPoints.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-500 font-mono">
                      No coordinates recorded yet. Start the workout or move to log GPS fixes.
                    </div>
                  ) : (
                    <table className="w-full text-[11px] font-mono text-left">
                      <thead className="bg-neutral-900 text-neutral-400 sticky top-0 border-b border-neutral-800">
                        <tr>
                          <th className="px-2.5 py-1.5">#</th>
                          <th className="px-2.5 py-1.5">Time</th>
                          <th className="px-2.5 py-1.5">Latitude</th>
                          <th className="px-2.5 py-1.5">Longitude</th>
                          <th className="px-2.5 py-1.5">Altitude</th>
                          <th className="px-2.5 py-1.5">Speed</th>
                          <th className="px-2.5 py-1.5">HR / Watts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900 text-neutral-300">
                        {trackPoints.slice(-50).reverse().map((pt, idx) => (
                          <tr key={pt.timestamp || idx} className="hover:bg-neutral-900/50">
                            <td className="px-2.5 py-1 text-neutral-500">{trackPoints.length - idx}</td>
                            <td className="px-2.5 py-1 text-neutral-400">
                              {pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString() : '--:--:--'}
                            </td>
                            <td className="px-2.5 py-1 text-emerald-400">{pt.latitude.toFixed(6)}°</td>
                            <td className="px-2.5 py-1 text-emerald-400">{pt.longitude.toFixed(6)}°</td>
                            <td className="px-2.5 py-1">{Math.round(pt.altitude || 0)}m</td>
                            <td className="px-2.5 py-1">{((pt.speed || 0) * 3.6).toFixed(1)} km/h</td>
                            <td className="px-2.5 py-1 text-orange-400">
                              {pt.heartRate || '--'} bpm · {pt.power || '--'}W
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Garmin Edge / Wahoo Heads-Up Display (HUD) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Tile 1: Speed / Pace */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
                  <span>{sport === 'cycling' || sport === 'gravel' ? 'Speed' : 'Current Pace'}</span>
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {sport === 'cycling' || sport === 'gravel' ? currentSpeedKmh.toFixed(1) : formatPace(currentPaceSecPerKm).replace('/km', '')}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">
                  {sport === 'cycling' || sport === 'gravel' ? 'km/h' : 'min / km'}
                </div>
              </div>

              {/* Tile 2: Distance */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
                  <span>Distance</span>
                  <NavIcon className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {distanceKm.toFixed(2)}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">Kilometers</div>
              </div>

              {/* Tile 3: Moving Time & Elapsed Time */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
                  <span>Moving Time</span>
                  <div className="flex items-center gap-1.5">
                    {status === 'recording' && currentSpeedKmh > 1.5 && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold animate-pulse">MOVING</span>
                    )}
                    {status === 'paused' && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono font-bold">PAUSED</span>
                    )}
                    <ActivityIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {formatDuration(movingSeconds)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <span>Elapsed: <strong className="text-neutral-200">{formatDuration(elapsedSeconds)}</strong></span>
                  {elapsedSeconds > movingSeconds && (
                    <span className="text-amber-400/90 text-[10px]">
                      +{formatDuration(elapsedSeconds - movingSeconds)} stop
                    </span>
                  )}
                </div>
              </div>

              {/* Tile 4: Heart Rate & Zone */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
                  <span>Heart Rate</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {status === 'recording' ? currentHeartRate : '--'}
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">bpm</span>
                </div>
                <div className={`text-[11px] font-bold ${hrZone.color}`}>
                  {status === 'recording' ? hrZone.label : 'Standby'}
                </div>
              </div>
            </div>

            {/* Secondary Row: Power, Cadence, Elevation, TSS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/80">
              <div className="px-2">
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Power (Watts)</span>
                </div>
                <div className="text-xl font-bold font-mono text-neutral-200 mt-1">
                  {status === 'recording' ? `${currentPower} W` : '--'}
                </div>
                <div className="text-[10px] text-neutral-500">{powerZone.label}</div>
              </div>

              <div className="px-2">
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3 text-sky-400" />
                  <span>Cadence</span>
                </div>
                <div className="text-xl font-bold font-mono text-neutral-200 mt-1">
                  {status === 'recording' ? `${currentCadence} rpm` : '--'}
                </div>
                <div className="text-[10px] text-neutral-500">{sport === 'running' ? 'Steps/min' : 'Crank rpm'}</div>
              </div>

              <div className="px-2">
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <Mountain className="w-3 h-3 text-emerald-400" />
                  <span>Elevation Gain</span>
                </div>
                <div className="text-xl font-bold font-mono text-neutral-200 mt-1">
                  +{Math.round(elevationGain)} m
                </div>
                <div className="text-[10px] text-neutral-500">Grade: {currentGradePct}%</div>
              </div>

              <div className="px-2">
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-orange-400" />
                  <span>Accumulated TSS</span>
                </div>
                <div className="text-xl font-bold font-mono text-orange-400 mt-1">
                  {liveTSS}
                </div>
                <div className="text-[10px] text-neutral-500">FTP: {athleteFtp}W</div>
              </div>
            </div>

            {/* Live GPS Map & Splits Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Map */}
              <div className="lg:col-span-2">
                <RouteMap
                  track={trackPoints}
                  currentPosition={currentPos}
                  heightClass="h-64 sm:h-80"
                  zoomLevel={15}
                />
              </div>

              {/* Laps List */}
              <div className="h-64 sm:h-80 bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  <span>Auto-Lap Splits</span>
                  <span className="text-neutral-500 font-mono">{laps.length} Laps</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1 text-xs font-mono">
                  {laps.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-sans text-center p-4">
                      Splits automatically record every 1.0 km or via the LAP button below.
                    </div>
                  ) : (
                    laps.map((lap) => (
                      <div
                        key={lap.lapNumber}
                        className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/80"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-bold">
                            {lap.lapNumber}
                          </span>
                          <span className="text-neutral-300">{lap.distanceKm} km</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">{formatDuration(lap.durationSeconds)}</div>
                          <div className="text-[10px] text-neutral-500">{lap.avgHeartRate} bpm · {lap.avgPower}W</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Cockpit Action Bar */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {status === 'idle' ? (
                  <button
                    id="start-workout-button"
                    onClick={handleStart}
                    className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-orange-500/25 transition active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Workout
                  </button>
                ) : status === 'recording' ? (
                  <>
                    <button
                      id="pause-workout-button"
                      onClick={handlePause}
                      className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm tracking-wider uppercase flex items-center gap-2 transition active:scale-95"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      Pause
                    </button>
                    <button
                      id="manual-lap-button"
                      onClick={handleManualLap}
                      className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm flex items-center gap-2 transition active:scale-95"
                    >
                      <Flag className="w-4 h-4 text-orange-400" />
                      Lap
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="resume-workout-button"
                      onClick={handleResume}
                      className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm tracking-wider uppercase flex items-center gap-2 transition active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Resume
                    </button>
                    <button
                      id="finish-workout-button"
                      onClick={handleFinish}
                      className="px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-rose-500/20 transition active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Finish & Save
                    </button>
                  </>
                )}
              </div>

              {/* Hardware Sensors & Status info */}
              <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                {hardwareSensors.filter((s) => s.isConnected).length > 0 && (
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-emerald-400">
                    <Cpu className="w-3 h-3 text-emerald-400" />
                    <span>{hardwareSensors.filter((s) => s.isConnected).length} Sensors Online</span>
                  </div>
                )}

                {trackPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const filename = `gps_${sport}_${Date.now()}`;
                      downloadGPXFile(filename, trackPoints, sport);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs flex items-center gap-1.5 transition"
                    title="Export GPX file"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>GPX Export</span>
                  </button>
                )}

                <div className="text-right">
                  <span className="text-white font-bold">{trackPoints.length}</span>
                  <span className="text-neutral-500"> GPS Points</span>
                  <span className="mx-2 text-neutral-700">·</span>
                  <span className="text-orange-400 font-bold">{sport.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
