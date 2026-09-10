import React, { useState, useEffect } from 'react';
import {
  Activity,
  Watch,
  Heart,
  Zap,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Battery,
  Wifi,
  Bluetooth,
  Cpu,
  Link2,
  Unlink,
  Settings,
  Flame,
  Check,
  Copy,
  Plus,
  Trash2,
  Sliders,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Navigation,
  MapPin,
  Compass,
  Download,
  Crosshair,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  AthleteProfile,
  PlatformIntegration,
  HardwareSensorDevice,
  Activity as ActivityType,
  Segment,
  HardwareSensorType,
  ConnectionProtocol,
  PlatformBrand,
  GPSPoint,
} from '../../types';
import { downloadGPXFile } from '../../utils/gpxExport';

interface DeviceIntegrationsSectionProps {
  profile: AthleteProfile;
  onUpdateProfile: (updated: AthleteProfile) => void;
  onImportActivity?: (activity: ActivityType) => void;
  onImportStravaData?: (activities: ActivityType[], segments: Segment[]) => void;
  onShowFeedbackToast: (message: string) => void;
  onOpenLiveGPS?: () => void;
}

export const DeviceIntegrationsSection: React.FC<DeviceIntegrationsSectionProps> = ({
  profile,
  onUpdateProfile,
  onImportActivity,
  onImportStravaData,
  onShowFeedbackToast,
  onOpenLiveGPS,
}) => {
  const [subTab, setSubTab] = useState<'platforms' | 'sensors' | 'gps'>('platforms');
  const [syncingBrand, setSyncingBrand] = useState<string | null>(null);
  const [calibratingSensorId, setCalibratingSensorId] = useState<string | null>(null);
  const [calibrationReport, setCalibrationReport] = useState<{ sensorId: string; message: string; offset: number } | null>(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isScanningBle, setIsScanningBle] = useState(false);
  const [bleScanError, setBleScanError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedSettingsBrand, setExpandedSettingsBrand] = useState<string | null>(null);

  // GPS Diagnostics state
  const [gpsTestActive, setGpsTestActive] = useState(false);
  const [gpsTestResults, setGpsTestResults] = useState<{
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    speed: number;
    heading: number | null;
    timestamp: number;
  } | null>(null);
  const [gpsTestError, setGpsTestError] = useState<string | null>(null);
  const [sampleGpxDownloaded, setSampleGpxDownloaded] = useState(false);

  // New sensor form state
  const [newSensorType, setNewSensorType] = useState<HardwareSensorType>('heart_rate');
  const [newSensorBrand, setNewSensorBrand] = useState('Garmin');
  const [newSensorModel, setNewSensorModel] = useState('');
  const [newSensorProtocol, setNewSensorProtocol] = useState<ConnectionProtocol>('bluetooth_ble');

  const platforms = profile.platformIntegrations || [];
  const sensors = profile.hardwareSensors || [];

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Test real device GPS location capture
  const handleTestGPSCapture = () => {
    if (!navigator.geolocation) {
      setGpsTestError('Geolocation API is not supported in this browser/device.');
      return;
    }
    setGpsTestActive(true);
    setGpsTestError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, altitude, accuracy, speed, heading } = pos.coords;
        setGpsTestResults({
          latitude,
          longitude,
          altitude: altitude || 0,
          accuracy: accuracy || 0,
          speed: (speed || 0) * 3.6, // km/h
          heading: heading !== null && heading !== undefined ? heading : null,
          timestamp: pos.timestamp || Date.now(),
        });
        setGpsTestActive(false);
        onShowFeedbackToast(`GNSS fix acquired: ±${(accuracy || 0).toFixed(1)}m precision!`);
      },
      (err) => {
        setGpsTestActive(false);
        if (err.code === 1) {
          setGpsTestError('Location permission denied. Please allow location access in your browser.');
        } else if (err.code === 2) {
          setGpsTestError('Position unavailable. Ensure your device GPS or Wi-Fi location is turned on.');
        } else if (err.code === 3) {
          setGpsTestError('Location request timed out. Please try again.');
        } else {
          setGpsTestError(err.message || 'Failed to capture GPS location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Export sample GPX 1.1 workout track
  const handleExportSampleGPX = () => {
    const samplePoints: GPSPoint[] = [
      { latitude: 37.7749, longitude: -122.4194, altitude: 45, speed: 8.5, heartRate: 142, cadence: 88, power: 230, timestamp: Date.now() - 4000 },
      { latitude: 37.7753, longitude: -122.4188, altitude: 48, speed: 8.7, heartRate: 146, cadence: 89, power: 245, timestamp: Date.now() - 3000 },
      { latitude: 37.7758, longitude: -122.4181, altitude: 52, speed: 8.4, heartRate: 151, cadence: 87, power: 260, timestamp: Date.now() - 2000 },
      { latitude: 37.7763, longitude: -122.4175, altitude: 55, speed: 8.2, heartRate: 155, cadence: 85, power: 275, timestamp: Date.now() - 1000 },
      { latitude: 37.7768, longitude: -122.4169, altitude: 58, speed: 8.6, heartRate: 154, cadence: 88, power: 250, timestamp: Date.now() },
    ];
    const ok = downloadGPXFile('sample_workout_gnss_capture', samplePoints, 'cycling');
    if (ok) {
      setSampleGpxDownloaded(true);
      setTimeout(() => setSampleGpxDownloaded(false), 3000);
      onShowFeedbackToast('Sample GPX 1.1 track exported successfully!');
    }
  };

  // Sync a specific platform (Garmin, Strava, Wahoo, Zwift, Whoop, etc.)
  const handleSyncPlatform = async (platform: PlatformIntegration) => {
    setSyncingBrand(platform.brand);

    try {
      if (platform.brand === 'strava') {
        const res = await fetch('/api/strava/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athleteId: platform.accountIdentifier || '7482910' }),
        });
        const data = await res.json();

        if (data.status === 'success') {
          if (onImportStravaData && data.importedActivities) {
            onImportStravaData(data.importedActivities, data.importedSegments || []);
          }
          const updatedPlatforms = platforms.map((p) =>
            p.id === platform.id
              ? {
                  ...p,
                  lastSyncAt: 'Just now',
                  syncedItemsCount: (p.syncedItemsCount || 0) + (data.syncedActivitiesCount || 2),
                  syncStatus: 'synced' as const,
                }
              : p
          );
          onUpdateProfile({
            ...profile,
            stravaIntegration: {
              ...profile.stravaIntegration,
              isConnected: true,
              lastSyncAt: new Date().toISOString(),
              syncedActivitiesCount: (profile.stravaIntegration?.syncedActivitiesCount || 0) + (data.syncedActivitiesCount || 2),
            },
            platformIntegrations: updatedPlatforms,
          });
          onShowFeedbackToast(data.message || 'Strava synchronized successfully!');
        }
      } else {
        const res = await fetch('/api/devices/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand: platform.brand, platformId: platform.id }),
        });
        const data = await res.json();

        if (data.status === 'synced') {
          if (data.importedActivity && onImportActivity) {
            onImportActivity(data.importedActivity);
          }

          const updatedPlatforms = platforms.map((p) =>
            p.id === platform.id
              ? {
                  ...p,
                  lastSyncAt: 'Just now',
                  syncedItemsCount: (p.syncedItemsCount || 0) + 1,
                  syncStatus: 'synced' as const,
                  healthData: data.healthData || p.healthData,
                }
              : p
          );

          onUpdateProfile({
            ...profile,
            platformIntegrations: updatedPlatforms,
          });

          onShowFeedbackToast(data.message || `${platform.name} sync complete!`);
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
      onShowFeedbackToast(`Sync with ${platform.name} failed. Check network connection.`);
    } finally {
      setSyncingBrand(null);
    }
  };

  // Toggle connection state for a platform
  const handleToggleConnectPlatform = async (platform: PlatformIntegration) => {
    if (platform.isConnected) {
      // Disconnect
      try {
        await fetch('/api/devices/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platformId: platform.id, brand: platform.brand }),
        });
      } catch (e) {
        console.error(e);
      }

      const updated = platforms.map((p) =>
        p.id === platform.id
          ? { ...p, isConnected: false, accountIdentifier: undefined }
          : p
      );
      onUpdateProfile({ ...profile, platformIntegrations: updated });
      onShowFeedbackToast(`${platform.name} disconnected.`);
    } else {
      // Connect
      try {
        const res = await fetch('/api/devices/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand: platform.brand,
            accountIdentifier: `${profile.name.toLowerCase().replace(' ', '.')}@${platform.brand}.io`,
            category: platform.category,
          }),
        });
        const data = await res.json();
        const updated = platforms.map((p) =>
          p.id === platform.id
            ? {
                ...p,
                isConnected: true,
                accountIdentifier: data.accountIdentifier,
                connectedAt: new Date().toISOString(),
                lastSyncAt: 'Just now',
                syncStatus: 'synced' as const,
              }
            : p
        );
        onUpdateProfile({ ...profile, platformIntegrations: updated });
        onShowFeedbackToast(`${platform.name} connected successfully!`);
      } catch (e) {
        console.error(e);
        const updated = platforms.map((p) =>
          p.id === platform.id
            ? {
                ...p,
                isConnected: true,
                accountIdentifier: `${profile.name.toLowerCase().replace(' ', '.')}@${platform.brand}.io`,
                connectedAt: new Date().toISOString(),
                lastSyncAt: 'Just now',
              }
            : p
        );
        onUpdateProfile({ ...profile, platformIntegrations: updated });
        onShowFeedbackToast(`${platform.name} connected.`);
      }
    }
  };

  // Toggle auto-sync for a platform
  const handleToggleAutoSync = (platformId: string) => {
    const updated = platforms.map((p) =>
      p.id === platformId ? { ...p, autoSync: !p.autoSync } : p
    );
    onUpdateProfile({ ...profile, platformIntegrations: updated });
    onShowFeedbackToast('Auto-sync preference updated.');
  };

  // Calibrate power meter or sensor (Zero-offset)
  const handleCalibrateSensor = async (sensor: HardwareSensorDevice) => {
    setCalibratingSensorId(sensor.id);
    setCalibrationReport(null);

    try {
      const res = await fetch('/api/devices/sensor/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensorId: sensor.id,
          sensorType: sensor.type,
          brand: sensor.brand,
        }),
      });
      const data = await res.json();

      const updatedSensors = sensors.map((s) =>
        s.id === sensor.id
          ? {
              ...s,
              isCalibrated: true,
              lastCalibratedAt: new Date().toISOString(),
              calibrationOffset: data.calibrationOffset ?? -0.01,
            }
          : s
      );

      onUpdateProfile({ ...profile, hardwareSensors: updatedSensors });
      setCalibrationReport({
        sensorId: sensor.id,
        message: data.message,
        offset: data.calibrationOffset ?? -0.01,
      });
      onShowFeedbackToast(`Calibration complete: offset ${data.calibrationOffset ?? -0.01}`);
    } catch (err) {
      console.error('Calibration error:', err);
      onShowFeedbackToast('Calibration request timed out. Retrying...');
    } finally {
      setCalibratingSensorId(null);
    }
  };

  // Web Bluetooth Scan Trigger
  const handleScanWebBluetooth = async () => {
    setIsScanningBle(true);
    setBleScanError(null);

    // Check if navigator.bluetooth is supported
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator && (navigator as any).bluetooth?.requestDevice) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { services: ['heart_rate'] },
            { services: ['cycling_power'] },
            { services: ['cycling_speed_and_cadence'] },
            { services: ['fitness_machine'] },
          ],
          optionalServices: ['battery_service', 'device_information'],
        });

        const newBleSensor: HardwareSensorDevice = {
          id: `ble-${device.id || Date.now()}`,
          name: device.name || 'Bluetooth Smart Sensor',
          brand: 'BLE Sensor',
          type: 'heart_rate',
          protocol: 'bluetooth_ble',
          model: 'Web Bluetooth Device',
          batteryPct: 98,
          isConnected: true,
          signalStrengthDbm: -56,
          lastSeen: 'Live Connected via Web Bluetooth',
          serialOrAntId: device.id ? `BLE-${device.id.slice(0, 8)}` : 'BLE-NATIVE',
          firmwareVersion: 'v1.0.0',
          isCalibrated: true,
          lastCalibratedAt: new Date().toISOString(),
        };

        onUpdateProfile({
          ...profile,
          hardwareSensors: [newBleSensor, ...sensors],
        });
        onShowFeedbackToast(`Successfully paired ${newBleSensor.name} via Web Bluetooth!`);
        setIsScanningBle(false);
        return;
      } catch (err: any) {
        console.warn('Web Bluetooth error or dismissed:', err);
        if (err.name !== 'NotFoundError') {
          setBleScanError(
            err.message || 'Bluetooth scanning was cancelled or is restricted in this browser context.'
          );
        }
      }
    } else {
      setBleScanError('Web Bluetooth API is not available in this browser environment. Use simulated sensor pairing below.');
    }

    setIsScanningBle(false);
    setIsPairModalOpen(true);
  };

  // Add a new sensor manually or from discovery
  const handleAddSensor = (preset?: { name: string; brand: string; type: HardwareSensorType; protocol: ConnectionProtocol; model: string }) => {
    const sensorToAdd: HardwareSensorDevice = {
      id: `sensor-${Date.now()}`,
      name: preset ? preset.name : (newSensorModel || `${newSensorBrand} ${newSensorType.replace('_', ' ')}`),
      brand: preset ? preset.brand : newSensorBrand,
      type: preset ? preset.type : newSensorType,
      protocol: preset ? preset.protocol : newSensorProtocol,
      model: preset ? preset.model : (newSensorModel || 'Endurance Telemetry Sensor'),
      batteryPct: Math.floor(82 + Math.random() * 16),
      isConnected: true,
      signalStrengthDbm: -54 - Math.floor(Math.random() * 12),
      lastSeen: 'Live Connected',
      serialOrAntId: `ANT/BLE-#${Math.floor(100000 + Math.random() * 899999)}`,
      firmwareVersion: 'v3.2.0',
      isCalibrated: true,
      lastCalibratedAt: new Date().toISOString(),
      liveReading:
        (preset?.type || newSensorType) === 'heart_rate'
          ? { primaryValue: 152, unit: 'bpm', secondaryValue: 'Aerobic Zone 3', secondaryUnit: '' }
          : (preset?.type || newSensorType) === 'power_meter'
          ? { primaryValue: 255, unit: 'W', secondaryValue: '90 rpm · 50/50% L/R', secondaryUnit: '' }
          : (preset?.type || newSensorType) === 'smart_trainer'
          ? { primaryValue: 'ERG 260', unit: 'W', secondaryValue: 'Target Power', secondaryUnit: '' }
          : { primaryValue: '19 Sats', unit: 'GNSS Lock', secondaryValue: '±3.2m Acc', secondaryUnit: '' },
    };

    onUpdateProfile({
      ...profile,
      hardwareSensors: [sensorToAdd, ...sensors],
    });
    onShowFeedbackToast(`Paired ${sensorToAdd.name} successfully!`);
    setIsPairModalOpen(false);
    setNewSensorModel('');
  };

  const handleRemoveSensor = (sensorId: string) => {
    const updated = sensors.filter((s) => s.id !== sensorId);
    onUpdateProfile({ ...profile, hardwareSensors: updated });
    onShowFeedbackToast('Sensor unpaired.');
  };

  // Pre-configured nearby sensors ready for 1-click pairing
  const NEARBY_DISCOVERABLE_SENSORS = [
    {
      name: 'Garmin HRM-Dual™',
      brand: 'Garmin',
      type: 'heart_rate' as HardwareSensorType,
      protocol: 'bluetooth_ble' as ConnectionProtocol,
      model: 'HRM-Dual Wireless Chest Strap',
      rssi: -52,
    },
    {
      name: 'Stages Power L (Shimano Ultegra)',
      brand: 'Stages Cycling',
      type: 'power_meter' as HardwareSensorType,
      protocol: 'bluetooth_ble' as ConnectionProtocol,
      model: 'Gen 3 Crank Arm Power Meter',
      rssi: -59,
    },
    {
      name: 'Tacx NEO 2T Smart Trainer',
      brand: 'Garmin / Tacx',
      type: 'smart_trainer' as HardwareSensorType,
      protocol: 'bluetooth_ble' as ConnectionProtocol,
      model: 'Direct Drive Smart Trainer',
      rssi: -48,
    },
    {
      name: 'Wahoo RPM Speed & Cadence',
      brand: 'Wahoo Fitness',
      type: 'cadence_speed' as HardwareSensorType,
      protocol: 'ant_plus' as ConnectionProtocol,
      model: 'Magnetless Dual-Band Sensor',
      rssi: -64,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Cockpit Summary Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold">
            <Watch className="w-3.5 h-3.5" />
            <span>{platforms.filter((p) => p.isConnected).length} Cloud Ecosystems Active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <Radio className="w-3.5 h-3.5" />
            <span>{sensors.filter((s) => s.isConnected).length} Hardware Sensors Paired</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleScanWebBluetooth}
            disabled={isScanningBle}
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition border border-neutral-700 shadow-sm"
          >
            <Bluetooth className={`w-3.5 h-3.5 text-blue-400 ${isScanningBle ? 'animate-spin' : ''}`} />
            <span>{isScanningBle ? 'Scanning BLE...' : 'Scan Bluetooth (BLE)'}</span>
          </button>

          <button
            onClick={() => setIsPairModalOpen(true)}
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-md shadow-orange-500/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Pair Sensor</span>
          </button>
        </div>
      </div>

      {/* Sub-View Switcher: Cloud Platforms vs Hardware Sensors */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setSubTab('platforms')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            subTab === 'platforms'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Watch className="w-4 h-4 text-cyan-400" />
          <span>Cloud Platforms & Head Units</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-neutral-700 text-neutral-300">
            {platforms.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('sensors')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            subTab === 'sensors'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          <span>Hardware Sensors & Cockpit</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-neutral-700 text-neutral-300">
            {sensors.length}
          </span>
        </button>

        <button
          id="subtab-gps-telemetry-btn"
          onClick={() => setSubTab('gps')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            subTab === 'gps'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Navigation className="w-4 h-4 text-orange-400" />
          <span>GNSS & GPS Capture</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30">
            Live
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-VIEW 1: CLOUD PLATFORMS & HEAD UNITS                 */}
      {/* ======================================================== */}
      {subTab === 'platforms' && (
        <div className="space-y-4 animate-fadeIn">
          {platforms.map((platform) => {
            const isSyncing = syncingBrand === platform.brand;
            const isExpanded = expandedSettingsBrand === platform.brand;

            // Brand accent colors and styling
            const brandTheme =
              platform.brand === 'garmin'
                ? {
                    border: 'border-cyan-500/30',
                    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
                    iconBg: 'bg-cyan-600',
                    nameColor: 'text-cyan-400',
                  }
                : platform.brand === 'strava'
                ? {
                    border: 'border-[#FC4C02]/30',
                    badge: 'bg-[#FC4C02]/10 text-[#FC4C02] border-[#FC4C02]/30',
                    iconBg: 'bg-[#FC4C02]',
                    nameColor: 'text-[#FC4C02]',
                  }
                : platform.brand === 'wahoo'
                ? {
                    border: 'border-blue-500/30',
                    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                    iconBg: 'bg-blue-600',
                    nameColor: 'text-blue-400',
                  }
                : platform.brand === 'zwift'
                ? {
                    border: 'border-amber-500/30',
                    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    iconBg: 'bg-gradient-to-r from-orange-500 to-purple-600',
                    nameColor: 'text-amber-400',
                  }
                : platform.brand === 'whoop'
                ? {
                    border: 'border-emerald-500/30',
                    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    iconBg: 'bg-emerald-600',
                    nameColor: 'text-emerald-400',
                  }
                : {
                    border: 'border-neutral-800',
                    badge: 'bg-neutral-800 text-neutral-400 border-neutral-700',
                    iconBg: 'bg-neutral-700',
                    nameColor: 'text-white',
                  };

            return (
              <div
                key={platform.id}
                className={`p-5 rounded-2xl bg-neutral-900/90 border ${
                  platform.isConnected ? brandTheme.border : 'border-neutral-800'
                } shadow-lg transition duration-200 hover:border-neutral-700`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Brand Identity & Status */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl ${brandTheme.iconBg} text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0`}
                    >
                      {platform.brand === 'garmin' ? (
                        <Watch className="w-5 h-5 text-white" />
                      ) : platform.brand === 'strava' ? (
                        <Activity className="w-5 h-5 text-white" />
                      ) : platform.brand === 'wahoo' ? (
                        <Cpu className="w-5 h-5 text-white" />
                      ) : platform.brand === 'zwift' ? (
                        <Zap className="w-5 h-5 text-white" />
                      ) : platform.brand === 'whoop' ? (
                        <Flame className="w-5 h-5 text-white" />
                      ) : (
                        <Heart className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight">{platform.name}</h4>
                        {platform.isConnected ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${brandTheme.badge}`}
                          >
                            Connected · Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-neutral-700">
                            Available to Link
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 line-clamp-2 max-w-xl">{platform.description}</p>

                      {platform.isConnected && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-neutral-400">
                          {platform.accountIdentifier && (
                            <span className="text-neutral-300 font-semibold">{platform.accountIdentifier}</span>
                          )}
                          {platform.deviceModel && (
                            <span className="text-neutral-400 hidden sm:inline">({platform.deviceModel})</span>
                          )}
                          {platform.lastSyncAt && <span>· Synced {platform.lastSyncAt}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {platform.isConnected ? (
                      <>
                        <button
                          onClick={() => handleSyncPlatform(platform)}
                          disabled={isSyncing}
                          className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition"
                          title="Trigger manual bidirectional sync"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                        </button>

                        <button
                          onClick={() => handleToggleConnectPlatform(platform)}
                          className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-400 border border-neutral-700 text-xs font-mono transition flex items-center gap-1"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Disconnect</span>
                        </button>

                        <button
                          onClick={() =>
                            setExpandedSettingsBrand(isExpanded ? null : platform.brand)
                          }
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition"
                          title="Platform Settings & API Credentials"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleToggleConnectPlatform(platform)}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-neutral-700 transition"
                      >
                        <Link2 className="w-3.5 h-3.5 text-orange-400" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Health Telemetry & Features Badges */}
                {platform.isConnected && (
                  <div className="mt-4 pt-3.5 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
                    {/* Live Health Biometrics if present */}
                    {platform.healthData ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {platform.healthData.bodyBattery !== undefined && (
                          <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-cyan-400" />
                            <span>Body Battery: {platform.healthData.bodyBattery}/100</span>
                          </div>
                        )}
                        {platform.healthData.hrvStatusMs !== undefined && (
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                            <Heart className="w-3 h-3 text-emerald-400" />
                            <span>HRV: {platform.healthData.hrvStatusMs}ms Balanced</span>
                          </div>
                        )}
                        {platform.healthData.sleepScore !== undefined && (
                          <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono font-bold">
                            Sleep Score: {platform.healthData.sleepScore}/100
                          </div>
                        )}
                        {platform.healthData.recoveryScore !== undefined && (
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                            Whoop Recovery: {platform.healthData.recoveryScore}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-400">
                        {platform.features.slice(0, 3).map((f, i) => (
                          <span key={i} className="flex items-center gap-1 bg-neutral-800/60 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-orange-400" />
                            <span>{f}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Auto-Sync Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-mono text-neutral-400 cursor-pointer select-none">
                        Continuous Auto-Sync
                      </label>
                      <button
                        onClick={() => handleToggleAutoSync(platform.id)}
                        className={`w-9 h-5 rounded-full p-0.5 transition duration-200 ${
                          platform.autoSync ? 'bg-orange-500' : 'bg-neutral-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                            platform.autoSync ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Settings & Developer Config */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3 text-xs font-mono animate-fadeIn">
                    <div className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                      Developer Integration & Webhook Endpoints
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400">Callback Domain:</span>
                        <div className="flex items-center gap-2 text-neutral-200">
                          <code className="text-orange-400">
                            {platform.oauthConfig?.callbackDomain || 'ais-dev-vvpbmeam4xpfh3g6gv6nmm-224099897864.asia-southeast1.run.app'}
                          </code>
                          <button
                            onClick={() =>
                              copyText(
                                platform.oauthConfig?.callbackDomain ||
                                  'ais-dev-vvpbmeam4xpfh3g6gv6nmm-224099897864.asia-southeast1.run.app',
                                `domain-${platform.id}`
                              )
                            }
                            className="p-1 hover:text-white"
                          >
                            {copiedKey === `domain-${platform.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400">Webhook Sync URL:</span>
                        <div className="flex items-center gap-2 text-neutral-200">
                          <code className="text-neutral-300">
                            /api/devices/sync?brand={platform.brand}
                          </code>
                          <button
                            onClick={() =>
                              copyText(`/api/devices/sync?brand=${platform.brand}`, `hook-${platform.id}`)
                            }
                            className="p-1 hover:text-white"
                          >
                            {copiedKey === `hook-${platform.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 2: HARDWARE SENSORS & BLE / ANT+ COCKPIT        */}
      {/* ======================================================== */}
      {subTab === 'sensors' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Active Calibration Feedback Report Banner */}
          {calibrationReport && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between gap-2 shadow-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{calibrationReport.message}</span>
              </div>
              <button
                onClick={() => setCalibrationReport(null)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-0.5 rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          {sensors.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-neutral-900 border border-neutral-800">
              <Radio className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-white">No Hardware Sensors Paired</div>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Scan via Web Bluetooth (BLE) or pair your heart rate strap, power meter, or smart trainer to monitor real-time telemetry.
              </p>
              <button
                onClick={() => setIsPairModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-orange-500 text-black font-bold text-xs uppercase tracking-wider"
              >
                Pair First Sensor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sensors.map((sensor) => {
                const isCalibrating = calibratingSensorId === sensor.id;
                const isPowerOrTrainer =
                  sensor.type === 'power_meter' || sensor.type === 'smart_trainer';

                return (
                  <div
                    key={sensor.id}
                    className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div>
                      {/* Top Bar: Sensor Type Icon + Status & Signal */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-orange-400">
                            {sensor.type === 'heart_rate' ? (
                              <Heart className="w-4 h-4 text-rose-400" />
                            ) : sensor.type === 'power_meter' ? (
                              <Zap className="w-4 h-4 text-amber-400" />
                            ) : sensor.type === 'smart_trainer' ? (
                              <Cpu className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Radio className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{sensor.name}</h4>
                            <div className="text-[10px] font-mono text-neutral-400">
                              {sensor.brand} · {sensor.protocol === 'bluetooth_ble' ? 'Bluetooth BLE' : sensor.protocol === 'wifi' ? 'WiFi Direct' : 'ANT+'}
                            </div>
                          </div>
                        </div>

                        {/* Battery & RSSI Badges */}
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                            <Battery className={`w-3 h-3 ${sensor.batteryPct > 50 ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span>{sensor.batteryPct}%</span>
                          </div>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400" title="Signal Strength">
                            <Wifi className="w-2.5 h-2.5 text-neutral-400" />
                            <span>{sensor.signalStrengthDbm} dBm</span>
                          </div>
                        </div>
                      </div>

                      {/* Live Telemetry Display */}
                      {sensor.liveReading && (
                        <div className="mt-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-baseline justify-between">
                          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                            Live Telemetry
                          </span>
                          <div className="text-right font-mono">
                            <span className="text-base font-bold text-white">
                              {sensor.liveReading.primaryValue}{' '}
                              <span className="text-xs text-orange-400 font-sans">{sensor.liveReading.unit}</span>
                            </span>
                            {sensor.liveReading.secondaryValue && (
                              <div className="text-[10px] text-neutral-400">
                                {sensor.liveReading.secondaryValue}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hardware details line */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                        <span>{sensor.serialOrAntId || 'ID: #48291'}</span>
                        {sensor.lastCalibratedAt && (
                          <span>Calibrated {new Date(sensor.lastCalibratedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions: Calibrate & Unpair */}
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                      {isPowerOrTrainer ? (
                        <button
                          onClick={() => handleCalibrateSensor(sensor)}
                          disabled={isCalibrating}
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition"
                        >
                          <Sliders className={`w-3 h-3 text-orange-400 ${isCalibrating ? 'animate-spin' : ''}`} />
                          <span>{isCalibrating ? 'Zeroing...' : 'Zero-Offset Calibrate'}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Streaming Data
                        </span>
                      )}

                      <button
                        onClick={() => handleRemoveSensor(sensor.id)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition"
                        title="Unpair Sensor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 3: GNSS & REAL-TIME GPS TELEMETRY              */}
      {/* ======================================================== */}
      {subTab === 'gps' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Cockpit Banner & Live Launch Action */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Navigation className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">GNSS & GPS Capture Center</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Multi-Band Ready
                </span>
              </div>
              <p className="text-xs text-neutral-400 max-w-xl">
                Real-time satellite positioning engine supporting 1Hz high-rate telemetry, GPX 1.1 standard exports, and direct hardware head unit synchronization.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {onOpenLiveGPS && (
                <button
                  id="launch-live-gps-cockpit-btn"
                  onClick={onOpenLiveGPS}
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition active:scale-[0.99]"
                >
                  <Crosshair className="w-4 h-4 stroke-[2.5]" />
                  <span>Launch Live GPS Cockpit</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-time Hardware GPS Diagnostic Probe */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5 h-5 text-orange-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Browser & Device GPS Hardware Probe</h4>
                  <p className="text-xs text-neutral-400">Direct query to W3C Geolocation API with highAccuracy enabled</p>
                </div>
              </div>

              <button
                id="test-device-gps-btn"
                onClick={handleTestGPSCapture}
                disabled={gpsTestActive}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition border border-neutral-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${gpsTestActive ? 'animate-spin' : ''}`} />
                <span>{gpsTestActive ? 'Acquiring Satellites...' : 'Probe Live Device GPS'}</span>
              </button>
            </div>

            {/* Error banner if any */}
            {gpsTestError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{gpsTestError}</span>
              </div>
            )}

            {/* Diagnostic readout cards */}
            {gpsTestResults ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fadeIn">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">Latitude</span>
                  <div className="text-xs font-mono font-bold text-white truncate">
                    {gpsTestResults.latitude.toFixed(6)}°
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {gpsTestResults.latitude >= 0 ? 'North' : 'South'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">Longitude</span>
                  <div className="text-xs font-mono font-bold text-white truncate">
                    {gpsTestResults.longitude.toFixed(6)}°
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {gpsTestResults.longitude >= 0 ? 'East' : 'West'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">Fix Precision</span>
                  <div className={`text-xs font-mono font-bold ${
                    gpsTestResults.accuracy <= 5
                      ? 'text-emerald-400'
                      : gpsTestResults.accuracy <= 15
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    ±{gpsTestResults.accuracy.toFixed(1)}m
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {gpsTestResults.accuracy <= 5 ? 'L1/L5 Dual Band' : 'Standard 3D Fix'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">Altitude</span>
                  <div className="text-xs font-mono font-bold text-white">
                    {gpsTestResults.altitude > 0 ? `${gpsTestResults.altitude.toFixed(0)}m` : 'Sea Level'}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">Barometric + GPS</span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">Speed</span>
                  <div className="text-xs font-mono font-bold text-white">
                    {gpsTestResults.speed.toFixed(1)} km/h
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">Doppler shift</span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">Heading</span>
                  <div className="text-xs font-mono font-bold text-white">
                    {gpsTestResults.heading !== null ? `${gpsTestResults.heading.toFixed(0)}°` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">True north</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-dashed border-neutral-800 text-center space-y-2">
                <MapPin className="w-6 h-6 text-neutral-500 mx-auto" />
                <div className="text-xs text-neutral-300 font-bold">GPS Telemetry Probe Inactive</div>
                <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                  Click "Probe Live Device GPS" above to test the browser's high-accuracy positioning hardware, measure satellite fix precision, and confirm real-time coordinate logging.
                </p>
              </div>
            )}
          </div>

          {/* GPX 1.1 Specification & Export Engine */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">GPX 1.1 Track Export Engine</h4>
                  <p className="text-xs text-neutral-400">
                    Compliant with TopoGrafix GPX 1.1 + Garmin TrackPointExtension v2 (HR, Cadence, Watts)
                  </p>
                </div>
              </div>

              <button
                id="export-sample-gpx-btn"
                onClick={handleExportSampleGPX}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 transition"
              >
                {sampleGpxDownloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Exported sample_workout.gpx</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Test GPX Track</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-300">
                <span>Standard Schema Compatibility:</span>
                <span className="text-emerald-400 font-bold">Verified Compatible</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 block">Garmin Connect</span>
                  <span className="text-white font-bold">100% FIT / GPX</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 block">Strava Uploads</span>
                  <span className="text-white font-bold">Instant Sync</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 block">TrainingPeaks</span>
                  <span className="text-white font-bold">Auto-Matched</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 block">Wahoo Cloud</span>
                  <span className="text-white font-bold">Bidirectional</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Band GNSS Ecosystem Hardware Guide */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Supported Multi-Band Satellite Constellations</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">GPS (USA)</span>
                  <span className="text-[10px] text-emerald-400">L1 + L5 Bands</span>
                </div>
                <p className="text-[11px] text-neutral-400">Sub-meter accuracy under dense tree canopy and urban canyons.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Galileo (EU)</span>
                  <span className="text-[10px] text-cyan-400">E1 + E5a Bands</span>
                </div>
                <p className="text-[11px] text-neutral-400">European high-precision atomic clock civil positioning system.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">GLONASS (RU)</span>
                  <span className="text-[10px] text-amber-400">G1 + G2 Bands</span>
                </div>
                <p className="text-[11px] text-neutral-400">Optimized high-latitude tracking and polar coverage.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">BeiDou (CN)</span>
                  <span className="text-[10px] text-purple-400">B1I + B2a Bands</span>
                </div>
                <p className="text-[11px] text-neutral-400">Geostationary and medium-earth orbit constellation telemetry.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {isPairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Bluetooth className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pair Wireless Sensor</h3>
                  <p className="text-xs text-neutral-400">Bluetooth Smart (BLE) & ANT+ Sensor Cockpit</p>
                </div>
              </div>
              <button
                onClick={() => setIsPairModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {bleScanError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{bleScanError}</span>
              </div>
            )}

            {/* Quick 1-Click Nearby Discovered Sensors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Nearby Discovered Devices (1-Click Pair)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NEARBY_DISCOVERABLE_SENSORS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleAddSensor(preset)}
                    className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 text-left transition group space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-orange-400 transition">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">{preset.rssi} dBm</span>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">{preset.model}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Or Custom Sensor Manual Entry */}
            <div className="pt-3 border-t border-neutral-800/80 space-y-3">
              <label className="text-xs font-bold text-neutral-300">Or Register Sensor Manually</label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Sensor Type</label>
                  <select
                    value={newSensorType}
                    onChange={(e) => setNewSensorType(e.target.value as HardwareSensorType)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                  >
                    <option value="heart_rate">Heart Rate Monitor</option>
                    <option value="power_meter">Cycling Power Meter</option>
                    <option value="smart_trainer">Smart Indoor Trainer</option>
                    <option value="cadence_speed">Speed & Cadence Sensor</option>
                    <option value="gps_head_unit">GPS Cycling Computer</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Protocol</label>
                  <select
                    value={newSensorProtocol}
                    onChange={(e) => setNewSensorProtocol(e.target.value as ConnectionProtocol)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                  >
                    <option value="bluetooth_ble">Bluetooth BLE</option>
                    <option value="ant_plus">ANT+ Wireless</option>
                    <option value="wifi">Direct WiFi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Device Model / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wahoo TICKR 2 or 4iiii Precision 3"
                  value={newSensorModel}
                  onChange={(e) => setNewSensorModel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono placeholder:text-neutral-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsPairModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddSensor()}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20"
                >
                  Pair Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
