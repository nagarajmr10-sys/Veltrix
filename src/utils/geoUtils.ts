import { GPSPoint, LapSplit } from '../types';

/**
 * Calculates distance between two lat/lng coordinates in kilometers using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number, forceHours = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0 || forceHours) {
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace (seconds per km) to mm:ss/km
 */
export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || !isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600) {
    return '--:--/km';
  }
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

/**
 * Format speed in km/h
 */
export function formatSpeed(kmh: number): string {
  if (isNaN(kmh) || kmh < 0) return '0.0 km/h';
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Calculate HR Zone based on LTHR (Lactate Threshold Heart Rate)
 */
export function getHeartRateZone(
  hr: number,
  lthr: number = 168
): { zone: number; label: string; color: string; desc: string } {
  const pct = hr / lthr;
  if (pct < 0.68) {
    return { zone: 1, label: 'Z1 Active Recovery', color: 'text-neutral-400', desc: 'Easy aerobic flush' };
  } else if (pct < 0.84) {
    return { zone: 2, label: 'Z2 Aerobic Endurance', color: 'text-sky-400', desc: 'Base building & fat burn' };
  } else if (pct < 0.95) {
    return { zone: 3, label: 'Z3 Tempo', color: 'text-emerald-400', desc: 'Aerobic fitness & rhythm' };
  } else if (pct < 1.05) {
    return { zone: 4, label: 'Z4 Threshold', color: 'text-amber-400', desc: 'Lactate threshold ceiling' };
  } else {
    return { zone: 5, label: 'Z5 Anaerobic / VO2max', color: 'text-rose-400', desc: 'Max capacity & sprint' };
  }
}

/**
 * Calculate Power Zone based on FTP (Functional Threshold Power)
 */
export function getPowerZone(
  watts: number,
  ftp: number = 295
): { zone: number; label: string; color: string } {
  const pct = (watts / ftp) * 100;
  if (pct < 55) return { zone: 1, label: 'Z1 Active Recovery', color: 'text-neutral-400' };
  if (pct < 75) return { zone: 2, label: 'Z2 Endurance', color: 'text-sky-400' };
  if (pct < 90) return { zone: 3, label: 'Z3 Tempo', color: 'text-emerald-400' };
  if (pct < 105) return { zone: 4, label: 'Z4 Sweet Spot / Threshold', color: 'text-amber-400' };
  if (pct < 120) return { zone: 5, label: 'Z5 VO2 Max', color: 'text-orange-400' };
  if (pct < 150) return { zone: 6, label: 'Z6 Anaerobic Capacity', color: 'text-rose-400' };
  return { zone: 7, label: 'Z7 Neuromuscular Power', color: 'text-purple-400' };
}

/**
 * Compute Normalized Power (NP) using 30-second rolling average 4th power
 */
export function calculateNormalizedPower(powerReadings: number[]): number {
  if (!powerReadings || powerReadings.length < 30) {
    if (!powerReadings || powerReadings.length === 0) return 0;
    return Math.round(powerReadings.reduce((a, b) => a + b, 0) / powerReadings.length);
  }

  // 30s rolling average
  const rolling30s: number[] = [];
  const windowSize = 30;
  let currentSum = 0;

  for (let i = 0; i < powerReadings.length; i++) {
    currentSum += powerReadings[i];
    if (i >= windowSize) {
      currentSum -= powerReadings[i - windowSize];
      rolling30s.push(currentSum / windowSize);
    } else if (i === windowSize - 1) {
      rolling30s.push(currentSum / windowSize);
    }
  }

  if (rolling30s.length === 0) return 0;
  const sum4th = rolling30s.reduce((acc, val) => acc + Math.pow(val, 4), 0);
  const avg4th = sum4th / rolling30s.length;
  return Math.round(Math.pow(avg4th, 0.25));
}

/**
 * Calculate Training Stress Score (TSS)
 */
export function calculateTSS(
  durationSeconds: number,
  normalizedPower: number,
  ftp: number
): number {
  if (!ftp || ftp <= 0 || !normalizedPower || durationSeconds <= 0) return 0;
  const intensityFactor = normalizedPower / ftp;
  const tss = ((durationSeconds * normalizedPower * intensityFactor) / (ftp * 3600)) * 100;
  return Math.round(tss);
}

/**
 * Export GPS track points as standard GPX 1.1 file
 */
export function downloadGPXFile(
  title: string,
  sport: string,
  track: GPSPoint[],
  dateStr?: string
): void {
  const startTime = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

  let trkpts = '';
  track.forEach((pt) => {
    const timeIso = new Date(pt.timestamp).toISOString();
    const ele = pt.altitude !== undefined ? `<ele>${pt.altitude.toFixed(1)}</ele>` : '';
    const hr = pt.heartRate !== undefined ? `<gpxtpx:hr>${pt.heartRate}</gpxtpx:hr>` : '';
    const cad = pt.cadence !== undefined ? `<gpxtpx:cad>${pt.cadence}</gpxtpx:cad>` : '';
    const power = pt.power !== undefined ? `<power>${pt.power}</power>` : '';

    let extensions = '';
    if (hr || cad) {
      extensions = `
        <extensions>
          <gpxtpx:TrackPointExtension>
            ${hr}
            ${cad}
          </gpxtpx:TrackPointExtension>
        </extensions>`;
    }

    trkpts += `
      <trkpt lat="${pt.latitude}" lon="${pt.longitude}">
        ${ele}
        <time>${timeIso}</time>
        ${power}
        ${extensions}
      </trkpt>`;
  });

  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Veltrix Athletic Performance"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(title)}</name>
    <time>${startTime}</time>
    <type>${sport}</type>
  </metadata>
  <trk>
    <name>${escapeXml(title)}</name>
    <type>${sport}</type>
    <trkseg>${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_veltrix.gpx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Pre-defined simulation scenic routes for test tracking & realistic telemetry
 */
export const PRESET_SIMULATION_ROUTES = [
  {
    id: 'marin_headlands',
    name: 'Marin Headlands Coastal Loop (San Francisco)',
    sport: 'cycling' as const,
    center: [37.8324, -122.5028] as [number, number],
    baseElevation: 85,
    distanceTotal: 22.4,
    pointsCount: 120,
    generatePoint: (pct: number) => {
      // Loop shape over Golden Gate & Marin
      const angle = pct * Math.PI * 2;
      const lat = 37.8324 + 0.025 * Math.sin(angle) + 0.01 * Math.sin(angle * 3);
      const lon = -122.5028 + 0.035 * Math.cos(angle) + 0.015 * Math.cos(angle * 2);
      const ele = 70 + 240 * Math.pow(Math.sin(angle), 2);
      return { lat, lon, ele };
    },
  },
  {
    id: 'central_park',
    name: 'Central Park Outer Drive Loop (New York)',
    sport: 'running' as const,
    center: [40.785091, -73.968285] as [number, number],
    baseElevation: 25,
    distanceTotal: 9.7,
    pointsCount: 100,
    generatePoint: (pct: number) => {
      const angle = pct * Math.PI * 2;
      const lat = 40.785091 + 0.02 * Math.cos(angle);
      const lon = -73.968285 + 0.01 * Math.sin(angle);
      const ele = 22 + 18 * Math.sin(angle * 2 + 1);
      return { lat, lon, ele };
    },
  },
  {
    id: 'alpe_huez',
    name: 'Alpe d\'Huez 21 Hairpins Ascent (French Alps)',
    sport: 'cycling' as const,
    center: [45.0924, 6.0691] as [number, number],
    baseElevation: 720,
    distanceTotal: 13.8,
    pointsCount: 140,
    generatePoint: (pct: number) => {
      // Zigzagging hairpins climbing up
      const t = pct;
      const switchbacks = Math.sin(t * Math.PI * 21) * 0.008;
      const lat = 45.058 + t * 0.035 + switchbacks;
      const lon = 6.045 + t * 0.03 + switchbacks * 0.7;
      const ele = 720 + t * 1120; // climbs to 1840m
      return { lat, lon, ele };
    },
  },
];
