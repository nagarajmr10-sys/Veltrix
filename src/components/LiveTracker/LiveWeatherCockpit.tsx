import React, { useState, useEffect } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Compass,
  Droplets,
  Thermometer,
  RefreshCw,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LiveWeatherData, calculateRelativeWind, fetchRealtimeWeather, requestCurrentPosition } from '../../services/weatherService';

interface LiveWeatherCockpitProps {
  currentLat?: number;
  currentLon?: number;
  athleteBearingDeg?: number;
  isRealGps: boolean;
  onWeatherDataUpdate?: (data: LiveWeatherData) => void;
}

export const LiveWeatherCockpit: React.FC<LiveWeatherCockpitProps> = ({
  currentLat,
  currentLon,
  athleteBearingDeg,
  isRealGps,
  onWeatherDataUpdate,
}) => {
  const [weather, setWeather] = useState<LiveWeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [lastRefreshedLocation, setLastRefreshedLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Fetch weather for coordinates
  const loadWeather = async (lat: number, lon: number, showSpinner = true) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const data = await fetchRealtimeWeather(lat, lon);
      setWeather(data);
      setLastRefreshedLocation({ lat, lon });
      if (onWeatherDataUpdate) {
        onWeatherDataUpdate(data);
      }
    } catch (err) {
      console.error('Weather load error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load using provided coordinates or user's browser location
  useEffect(() => {
    let isMounted = true;

    const initLocationAndWeather = async () => {
      setLoading(true);

      // If coordinates are explicitly provided by the tracker
      if (currentLat !== undefined && currentLon !== undefined) {
        await loadWeather(currentLat, currentLon, false);
        return;
      }

      // Try browser geolocation first
      try {
        const pos = await requestCurrentPosition();
        if (isMounted) {
          await loadWeather(pos.latitude, pos.longitude, false);
        }
      } catch {
        // Fallback to default endurance test coordinates (Boulder, CO)
        if (isMounted) {
          await loadWeather(40.015, -105.27, false);
        }
      }
    };

    initLocationAndWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update weather if athlete coordinates move significantly (> 5km)
  useEffect(() => {
    if (currentLat === undefined || currentLon === undefined) return;
    if (!lastRefreshedLocation) {
      loadWeather(currentLat, currentLon, false);
      return;
    }

    const dLat = Math.abs(currentLat - lastRefreshedLocation.lat);
    const dLon = Math.abs(currentLon - lastRefreshedLocation.lon);
    // ~5km movement threshold
    if (dLat > 0.045 || dLon > 0.045) {
      loadWeather(currentLat, currentLon, false);
    }
  }, [currentLat, currentLon]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (weather) {
        loadWeather(weather.latitude, weather.longitude, false);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [weather]);

  const handleManualRefresh = async () => {
    if (isRealGps) {
      try {
        const pos = await requestCurrentPosition();
        await loadWeather(pos.latitude, pos.longitude, true);
        return;
      } catch {
        // Fallback to existing coordinate
      }
    }

    const lat = currentLat ?? weather?.latitude ?? 40.015;
    const lon = currentLon ?? weather?.longitude ?? -105.27;
    await loadWeather(lat, lon, true);
  };

  const renderWeatherIcon = (iconType: LiveWeatherData['iconType'], className: string) => {
    switch (iconType) {
      case 'sun':
        return <Sun className={`${className} text-amber-400`} />;
      case 'cloud-sun':
        return <CloudSun className={`${className} text-amber-300`} />;
      case 'cloud':
        return <Cloud className={`${className} text-slate-300`} />;
      case 'cloud-rain':
        return <CloudRain className={`${className} text-sky-400`} />;
      case 'cloud-snow':
        return <CloudSnow className={`${className} text-indigo-200`} />;
      case 'cloud-lightning':
        return <CloudLightning className={`${className} text-purple-400`} />;
      case 'fog':
        return <Wind className={`${className} text-neutral-400`} />;
      default:
        return <Sun className={`${className} text-amber-400`} />;
    }
  };

  if (loading && !weather) {
    return (
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin" />
          <span>Connecting to Real-Time Weather Station...</span>
        </div>
        <span className="text-[11px] text-neutral-500">Open-Meteo Telemetry</span>
      </div>
    );
  }

  if (!weather) return null;

  const windImpact = calculateRelativeWind(
    weather.windDirectionDeg,
    weather.windSpeedKmh,
    athleteBearingDeg
  );

  const displayTemp = unit === 'metric' ? `${weather.tempC}°C` : `${weather.tempF}°F`;
  const displayApparent = unit === 'metric' ? `${weather.apparentTempC}°C` : `${weather.apparentTempF}°F`;
  const displayWindSpeed = unit === 'metric' ? `${weather.windSpeedKmh} km/h` : `${weather.windSpeedMph} mph`;
  const displayGusts = unit === 'metric' ? `${weather.windGustsKmh} km/h` : `${weather.windGustsMph} mph`;
  const isHighWind = weather.windGustsKmh > 35;

  return (
    <div
      id="live-weather-cockpit"
      className="bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden shadow-lg transition-all"
    >
      {/* Primary Weather Bar */}
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Location & Conditions Pill */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
            {renderWeatherIcon(weather.iconType, 'w-5 h-5')}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {weather.condition}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 uppercase font-semibold">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono mt-0.5">
              <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[280px]">
                {weather.locationName}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-500 text-[10px]">
                {weather.updatedAt}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Temperature & Wind Stats */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Temperature Block */}
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
                  {displayTemp}
                </span>
                <button
                  id="weather-unit-toggle"
                  onClick={() => setUnit(unit === 'metric' ? 'imperial' : 'metric')}
                  className="text-[10px] font-mono text-neutral-400 hover:text-orange-400 underline transition"
                  title="Toggle Celsius / Fahrenheit"
                >
                  {unit === 'metric' ? '°C' : '°F'}
                </button>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                Feels {displayApparent}
              </div>
            </div>
          </div>

          {/* Wind Block */}
          <div className="flex items-center gap-2">
            {/* Visual Rotating Wind Direction Arrow */}
            <div
              className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center relative shrink-0 shadow-inner"
              title={`Wind origin: ${weather.windDirectionDeg}° (${weather.windDirectionCardinal})`}
            >
              <Compass
                className="w-4 h-4 text-sky-400 transition-transform duration-500"
                style={{
                  transform: `rotate(${weather.windDirectionDeg}deg)`,
                }}
              />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-bold font-mono text-orange-400 bg-neutral-900 px-0.5 rounded border border-neutral-700">
                {weather.windDirectionCardinal}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black font-mono text-white tracking-tight">
                  {displayWindSpeed}
                </span>
                <span className="text-[10px] font-mono text-sky-400 font-bold">
                  {weather.windDirectionCardinal}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                Gusts {displayGusts}
              </div>
            </div>
          </div>

          {/* Wind Aero Impact Badge */}
          <div
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${windImpact.badgeColor}`}
            title={windImpact.description}
          >
            <Wind className="w-3.5 h-3.5" />
            <span className="capitalize">{windImpact.type}</span>
          </div>
        </div>

        {/* Right: Controls & Expand Toggle */}
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <button
            id="refresh-live-weather-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition"
            title="Refresh current location weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          <button
            id="toggle-weather-details-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-mono flex items-center gap-1 transition"
          >
            <span>{isExpanded ? 'Less' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Atmospheric Breakdown Panel */}
      {isExpanded && (
        <div className="border-t border-neutral-800 bg-neutral-950/70 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          {/* Wind Dynamics */}
          <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
            <div className="text-neutral-500 text-[10px] uppercase font-semibold flex items-center justify-between">
              <span>Wind Angle</span>
              <Compass className="w-3 h-3 text-sky-400" />
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {weather.windDirectionDeg}° {weather.windDirectionCardinal}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {windImpact.description}
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
            <div className="text-neutral-500 text-[10px] uppercase font-semibold flex items-center justify-between">
              <span>Relative Humidity</span>
              <Droplets className="w-3 h-3 text-sky-400" />
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {weather.humidityPct}%
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {weather.humidityPct > 70 ? 'High sweat rate' : 'Comfortable evaporative cooling'}
            </div>
          </div>

          {/* Precipitation */}
          <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
            <div className="text-neutral-500 text-[10px] uppercase font-semibold flex items-center justify-between">
              <span>Precipitation</span>
              <CloudRain className="w-3 h-3 text-sky-400" />
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {weather.precipitationMm} mm/h
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              {weather.precipitationMm > 0 ? 'Wet road / Grip caution' : 'Dry asphalt / Optimal traction'}
            </div>
          </div>

          {/* Sensor Source & GPS Lock */}
          <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
            <div className="text-neutral-500 text-[10px] uppercase font-semibold flex items-center justify-between">
              <span>Station Link</span>
              <MapPin className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-1 truncate">
              {isRealGps ? 'Device GPS Lock' : 'Simulation Route'}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
              {weather.source}
            </div>
          </div>

          {/* Gust Warning Banner if windy */}
          {isHighWind && (
            <div className="col-span-2 sm:col-span-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-center gap-2 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Gust Warning: Strong gusts detected up to {displayGusts}. Use caution with deep-section aerodynamic wheels.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
