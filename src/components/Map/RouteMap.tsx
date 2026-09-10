import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Layers,
  Maximize2,
  Minimize2,
  Navigation,
  Trophy,
  Flag,
  MapPin,
  Gauge,
  Mountain,
  Heart,
  Zap,
  RotateCcw,
  Sparkles,
  Flame,
  Activity as ActivityIcon,
} from 'lucide-react';
import { GPSPoint, Segment, SportType } from '../../types';
import {
  calculateHaversineDistance,
  formatPace,
  formatSpeed,
} from '../../utils/geoUtils';

export type MapTileLayerType = 'strava_dark' | 'strava_standard' | 'satellite' | 'topographic';
export type PolylineColorMode = 'orange' | 'elevation' | 'speed' | 'heart_rate';

interface RouteMapProps {
  track: GPSPoint[];
  currentPosition?: GPSPoint | null;
  hoveredPointIndex?: number | null;
  interactive?: boolean;
  heightClass?: string;
  zoomLevel?: number;
  segments?: Segment[];
  sport?: SportType;
  title?: string;
  initialLayer?: MapTileLayerType;
  onHoverPoint?: (index: number | null) => void;
  onSelectSegment?: (segment: Segment) => void;
}

const TILE_SERVERS: Record<MapTileLayerType, { url: string; label: string; subdomains?: string; maxZoom: number; desc: string }> = {
  strava_dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    label: 'Strava Dark',
    subdomains: 'abcd',
    maxZoom: 19,
    desc: 'Athletic dark matter cartography',
  },
  strava_standard: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    label: 'Strava Standard',
    subdomains: 'abcd',
    maxZoom: 19,
    desc: 'Classic high-contrast streets & paths',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    label: 'Satellite Hybrid',
    maxZoom: 18,
    desc: 'High-res aerial terrain photography',
  },
  topographic: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    label: 'Outdoors Topo',
    subdomains: 'abc',
    maxZoom: 17,
    desc: 'Topographic contour lines & trails',
  },
};

// Calculate cumulative distances and split benchmarks along the track
function computeTrackSplits(track: GPSPoint[]) {
  if (!track || track.length < 2) return [];

  const splits: {
    kmMark: number;
    pointIndex: number;
    coord: [number, number];
    elevationMeters: number;
    speedKmh: number;
    paceSecPerKm: number;
    heartRate?: number;
    power?: number;
    elevationDelta: number;
  }[] = [];

  let cumulativeKm = 0;
  let nextSplitTarget = 1.0; // Every 1km
  let lastSplitIndex = 0;

  for (let i = 1; i < track.length; i++) {
    const prev = track[i - 1];
    const curr = track[i];
    const dist = calculateHaversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    cumulativeKm += dist;

    if (cumulativeKm >= nextSplitTarget) {
      const splitSlice = track.slice(lastSplitIndex, i + 1);
      const avgSpeed = splitSlice.reduce((acc, p) => acc + (p.speed || 0), 0) / splitSlice.length * 3.6;
      const pace = avgSpeed > 0 ? Math.round(3600 / avgSpeed) : 0;
      const avgHr = splitSlice.some(p => p.heartRate)
        ? Math.round(splitSlice.reduce((acc, p) => acc + (p.heartRate || 0), 0) / splitSlice.length)
        : undefined;
      const avgPwr = splitSlice.some(p => p.power)
        ? Math.round(splitSlice.reduce((acc, p) => acc + (p.power || 0), 0) / splitSlice.length)
        : undefined;
      const eleDelta = Math.round((curr.altitude || 0) - (track[lastSplitIndex].altitude || 0));

      splits.push({
        kmMark: Math.round(nextSplitTarget),
        pointIndex: i,
        coord: [curr.latitude, curr.longitude],
        elevationMeters: Math.round(curr.altitude || 0),
        speedKmh: Number(avgSpeed.toFixed(1)),
        paceSecPerKm: pace,
        heartRate: avgHr,
        power: avgPwr,
        elevationDelta: eleDelta,
      });

      nextSplitTarget += 1.0;
      lastSplitIndex = i;
    }
  }

  return splits;
}

// Color interpolation for gradient polyline
function getElevationColor(val: number, min: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
  if (ratio < 0.25) return '#10b981'; // Valley emerald
  if (ratio < 0.5) return '#eab308'; // Rising yellow
  if (ratio < 0.75) return '#f97316'; // Mountain orange
  return '#ef4444'; // Peak alpine red
}

function getSpeedColor(speedKmh: number, min: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, (speedKmh - min) / (max - min || 1)));
  if (ratio < 0.3) return '#06b6d4'; // Low speed / steep climb cyan
  if (ratio < 0.7) return '#f97316'; // Cruising orange
  return '#ef4444'; // Full throttle sprint / descent
}

function getHeartRateColor(hr: number): string {
  if (hr < 125) return '#94a3b8'; // Z1 Recovery
  if (hr < 145) return '#3b82f6'; // Z2 Endurance
  if (hr < 160) return '#10b981'; // Z3 Tempo
  if (hr < 175) return '#f59e0b'; // Z4 Threshold
  return '#ef4444'; // Z5 Anaerobic
}

export const RouteMap: React.FC<RouteMapProps> = ({
  track,
  currentPosition,
  hoveredPointIndex,
  interactive = true,
  heightClass = 'h-80',
  zoomLevel,
  segments = [],
  sport = 'cycling',
  title,
  initialLayer = 'strava_dark',
  onHoverPoint,
  onSelectSegment,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups to manage dynamic rendering
  const polylineGroupRef = useRef<L.LayerGroup | null>(null);
  const splitsGroupRef = useRef<L.LayerGroup | null>(null);
  const segmentsGroupRef = useRef<L.LayerGroup | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const liveMarkerRef = useRef<L.CircleMarker | null>(null);
  const hoverMarkerRef = useRef<L.LayerGroup | null>(null);

  // User Interactive Settings
  const [activeLayer, setActiveLayer] = useState<MapTileLayerType>(initialLayer);
  const [colorMode, setColorMode] = useState<PolylineColorMode>('orange');
  const [showSplits, setShowSplits] = useState(true);
  const [showSegments, setShowSegments] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Computed splits and route metrics
  const splits = useMemo(() => computeTrackSplits(track), [track]);

  const routeSummary = useMemo(() => {
    if (!track || track.length < 2) return null;
    let distKm = 0;
    let minEle = Infinity;
    let maxEle = -Infinity;
    let minSpeed = Infinity;
    let maxSpeed = -Infinity;

    for (let i = 1; i < track.length; i++) {
      distKm += calculateHaversineDistance(
        track[i - 1].latitude,
        track[i - 1].longitude,
        track[i].latitude,
        track[i].longitude
      );
      const ele = track[i].altitude || 0;
      if (ele < minEle) minEle = ele;
      if (ele > maxEle) maxEle = ele;

      const spd = (track[i].speed || 0) * 3.6;
      if (spd < minSpeed) minSpeed = spd;
      if (spd > maxSpeed) maxSpeed = spd;
    }

    return {
      distanceKm: Number(distKm.toFixed(2)),
      minEle: isFinite(minEle) ? minEle : 0,
      maxEle: isFinite(maxEle) ? maxEle : 1000,
      elevationGain: Math.max(0, Math.round(maxEle - minEle)),
      minSpeed: isFinite(minSpeed) ? minSpeed : 10,
      maxSpeed: isFinite(maxSpeed) ? maxSpeed : 45,
    };
  }, [track]);

  // Point hovered details for the Strava floating HUD
  const activeHoverPoint = useMemo(() => {
    if (hoveredPointIndex !== null && hoveredPointIndex !== undefined && track[hoveredPointIndex]) {
      const pt = track[hoveredPointIndex];
      // Compute cumulative distance up to hovered point
      let dist = 0;
      for (let i = 1; i <= hoveredPointIndex; i++) {
        dist += calculateHaversineDistance(
          track[i - 1].latitude,
          track[i - 1].longitude,
          track[i].latitude,
          track[i].longitude
        );
      }

      // Grade estimate based on nearby 3 points
      let grade = 0;
      if (hoveredPointIndex > 0) {
        const prev = track[hoveredPointIndex - 1];
        const runM = calculateHaversineDistance(prev.latitude, prev.longitude, pt.latitude, pt.longitude) * 1000;
        const riseM = (pt.altitude || 0) - (prev.altitude || 0);
        if (runM > 5) {
          grade = Number(((riseM / runM) * 100).toFixed(1));
        }
      }

      return {
        point: pt,
        distanceKm: Number(dist.toFixed(2)),
        gradePct: grade,
        speedKmh: Number(((pt.speed || 0) * 3.6).toFixed(1)),
        paceSecPerKm: (pt.speed || 0) > 0 ? Math.round(1000 / (pt.speed || 1)) : 0,
        altitude: Math.round(pt.altitude || 0),
        heartRate: pt.heartRate,
        power: pt.power,
        cadence: pt.cadence,
      };
    }
    return null;
  }, [hoveredPointIndex, track]);

  // Center/fit bounds helper
  const handleFitRoute = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      if (track && track.length > 1) {
        const latlngs: [number, number][] = track.map((p) => [p.latitude, p.longitude]);
        const bounds = L.latLngBounds(latlngs);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: zoomLevel || 16, animate: true });
          return;
        }
      }
      if (track && track.length === 1) {
        map.setView([track[0].latitude, track[0].longitude], zoomLevel || 15);
        return;
      }
      if (currentPosition) {
        map.setView([currentPosition.latitude, currentPosition.longitude], zoomLevel || 15);
        return;
      }
    } catch {
      // fallback safe center
      if (track && track.length > 0) {
        map.setView([track[0].latitude, track[0].longitude], zoomLevel || 14);
      }
    }
  }, [track, currentPosition, zoomLevel]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Determine initial center and zoom so map is ALWAYS initialized with valid coordinates
    const initialCenter: [number, number] =
      currentPosition
        ? [currentPosition.latitude, currentPosition.longitude]
        : track && track.length > 0
        ? [track[0].latitude, track[0].longitude]
        : [37.7749, -122.4194]; // Default fallback coordinate (San Francisco)

    const initialZoom = zoomLevel || (track && track.length > 1 ? 14 : 14);

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      dragging: interactive,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    // Ensure map state is explicitly loaded with initial center and zoom
    map.setView(initialCenter, initialZoom);

    // Add zoom control at bottom right like Strava
    if (interactive) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    // Set active tile layer
    const layerConfig = TILE_SERVERS[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || 'abc',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Initialize layer groups
    polylineGroupRef.current = L.layerGroup().addTo(map);
    splitsGroupRef.current = L.layerGroup().addTo(map);
    segmentsGroupRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    hoverMarkerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Initial fit
    if (track && track.length > 1) {
      try {
        const latlngs: [number, number][] = track.map((p) => [p.latitude, p.longitude]);
        const bounds = L.latLngBounds(latlngs);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: zoomLevel || 15 });
        }
      } catch {
        map.setView(initialCenter, initialZoom);
      }
    } else if (track && track.length === 1) {
      map.setView([track[0].latitude, track[0].longitude], initialZoom);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [interactive]);

  // Re-fit map when track updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !track || track.length === 0) return;

    try {
      if (track.length > 1) {
        const latlngs: [number, number][] = track.map((p) => [p.latitude, p.longitude]);
        const bounds = L.latLngBounds(latlngs);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: zoomLevel || 15 });
        }
      } else if (track.length === 1) {
        map.setView([track[0].latitude, track[0].longitude], zoomLevel || 15);
      }
    } catch {
      // ignore
    }
  }, [track, zoomLevel]);

  // Change Basemap Tile Layer dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layerConfig = TILE_SERVERS[activeLayer];
    const newLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || 'abc',
    }).addTo(map);

    // Ensure polyline and markers remain on top
    newLayer.bringToBack();
    tileLayerRef.current = newLayer;
  }, [activeLayer]);

  // Draw Route Polyline with selected Strava color mode
  useEffect(() => {
    const group = polylineGroupRef.current;
    if (!group || !track || track.length < 2) return;

    group.clearLayers();

    if (colorMode === 'orange') {
      // Classic Strava Iconic Orange: Dark outer outline + Vibrant Strava Orange Core (#FC4C02)
      const latlngs: [number, number][] = track.map((p) => [p.latitude, p.longitude]);

      // Outer drop contour for maximum visibility against satellite or dark roads
      L.polyline(latlngs, {
        color: '#000000',
        weight: 6,
        opacity: 0.6,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(group);

      // Strava signature fiery orange polyline
      const mainLine = L.polyline(latlngs, {
        color: '#FC4C02',
        weight: 4.5,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(group);

      // Interactive hover along the polyline to detect nearest point
      if (onHoverPoint) {
        mainLine.on('mousemove', (e: L.LeafletMouseEvent) => {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          let closestIdx = 0;
          let minDist = Infinity;
          for (let i = 0; i < track.length; i++) {
            const d = (track[i].latitude - lat) ** 2 + (track[i].longitude - lng) ** 2;
            if (d < minDist) {
              minDist = d;
              closestIdx = i;
            }
          }
          onHoverPoint(closestIdx);
        });
      }
    } else {
      // Dynamic Metric Gradient Polylines
      const minEle = routeSummary?.minEle || 0;
      const maxEle = routeSummary?.maxEle || 1000;
      const minSpd = routeSummary?.minSpeed || 10;
      const maxSpd = routeSummary?.maxSpeed || 45;

      // Group nearby points into segments to keep DOM elements performant
      const step = Math.max(1, Math.floor(track.length / 150));
      for (let i = 0; i < track.length - 1; i += step) {
        const nextIdx = Math.min(track.length - 1, i + step);
        const p1 = track[i];
        const p2 = track[nextIdx];

        let strokeColor = '#FC4C02';
        if (colorMode === 'elevation') {
          strokeColor = getElevationColor(p1.altitude || 0, minEle, maxEle);
        } else if (colorMode === 'speed') {
          strokeColor = getSpeedColor((p1.speed || 0) * 3.6, minSpd, maxSpd);
        } else if (colorMode === 'heart_rate') {
          strokeColor = getHeartRateColor(p1.heartRate || 140);
        }

        // Shadow outline
        L.polyline([[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]], {
          color: '#000000',
          weight: 6,
          opacity: 0.5,
          lineCap: 'round',
        }).addTo(group);

        // Core colored segment
        const seg = L.polyline([[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]], {
          color: strokeColor,
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
        }).addTo(group);

        if (onHoverPoint) {
          seg.on('mouseover', () => onHoverPoint(i));
        }
      }
    }
  }, [track, colorMode, routeSummary, onHoverPoint]);

  // Render Start, Finish & General Markers
  useEffect(() => {
    const group = markersGroupRef.current;
    if (!group || !track || track.length === 0) return;

    group.clearLayers();

    const startPt = track[0];
    const finishPt = track[track.length - 1];

    // Strava Green Start Pin
    const startIcon = L.divIcon({
      className: 'custom-start-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-black text-white">
            ▲
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([startPt.latitude, startPt.longitude], { icon: startIcon })
      .bindTooltip('<div class="font-bold text-xs">Route Start</div>', { direction: 'top', offset: [0, -10] })
      .addTo(group);

    // Strava Chequered Finish Pin
    const finishIcon = L.divIcon({
      className: 'custom-finish-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="w-6 h-6 rounded-full bg-neutral-900 border-2 border-orange-500 shadow-lg flex items-center justify-center text-[10px] text-orange-400 font-bold">
            🏁
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([finishPt.latitude, finishPt.longitude], { icon: finishIcon })
      .bindTooltip('<div class="font-bold text-xs">Route Finish</div>', { direction: 'top', offset: [0, -10] })
      .addTo(group);
  }, [track]);

  // Render Kilometer Split Badges (Iconic Strava Feature)
  useEffect(() => {
    const group = splitsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showSplits || splits.length === 0) return;

    splits.forEach((split) => {
      const splitIcon = L.divIcon({
        className: 'strava-split-pin',
        html: `
          <div class="group relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
            <div class="w-5 h-5 rounded-full bg-neutral-950 border-2 border-orange-500 text-orange-400 text-[9px] font-mono font-black flex items-center justify-center shadow-md transition-transform group-hover:scale-125 group-hover:bg-orange-500 group-hover:text-black">
              ${split.kmMark}
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const tooltipContent = `
        <div class="p-1 font-mono text-xs text-left leading-snug">
          <div class="font-black text-orange-400 flex items-center justify-between gap-3">
            <span>SPLIT ${split.kmMark} KM</span>
            <span class="text-neutral-300 font-normal">${sport === 'running' ? formatPace(split.paceSecPerKm) : formatSpeed(split.speedKmh)}</span>
          </div>
          <div class="text-[10px] text-neutral-300 mt-1 space-y-0.5">
            <div>Elev: <strong class="text-white">${split.elevationMeters}m</strong> (${split.elevationDelta >= 0 ? '+' : ''}${split.elevationDelta}m)</div>
            ${split.heartRate ? `<div>Avg HR: <strong class="text-rose-400">${split.heartRate} bpm</strong></div>` : ''}
            ${split.power ? `<div>Avg Power: <strong class="text-amber-400">${split.power} W</strong></div>` : ''}
          </div>
        </div>
      `;

      const marker = L.marker(split.coord, { icon: splitIcon })
        .bindTooltip(tooltipContent, { direction: 'top', offset: [0, -8], className: 'strava-custom-tooltip' })
        .addTo(group);

      marker.on('click', () => {
        if (onHoverPoint) onHoverPoint(split.pointIndex);
      });
    });
  }, [showSplits, splits, sport, onHoverPoint]);

  // Render Strava Segments & KOM Trophy Pins
  useEffect(() => {
    const group = segmentsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showSegments || !segments || segments.length === 0) return;

    segments.forEach((seg) => {
      if (!seg.polylineCoords || seg.polylineCoords.length === 0) return;
      const startCoord = seg.polylineCoords[0];

      const segmentIcon = L.divIcon({
        className: 'strava-segment-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black tracking-wider flex items-center gap-1 shadow-lg border border-amber-300 hover:scale-110 transition">
              <span>👑</span>
              <span class="hidden sm:inline">${seg.climbCategory}</span>
            </div>
          </div>
        `,
        iconSize: [40, 20],
        iconAnchor: [20, 10],
      });

      const tooltipContent = `
        <div class="p-1 font-mono text-xs text-left">
          <div class="font-bold text-amber-400 flex items-center gap-1.5">
            <span>🏆</span>
            <span>${seg.name}</span>
          </div>
          <div class="text-[10px] text-neutral-300 mt-1 space-y-0.5">
            <div>${seg.distanceKm} km · ${seg.avgGradePct}% avg grade · +${seg.elevationGainMeters}m</div>
            <div class="text-amber-300">KOM: <strong>${seg.komTime}</strong> (${seg.komAthlete})</div>
            ${seg.personalRecordTime ? `<div class="text-emerald-400">PR: <strong>${seg.personalRecordTime}</strong> (Rank #${seg.personalRank || 1})</div>` : ''}
          </div>
        </div>
      `;

      const marker = L.marker(startCoord, { icon: segmentIcon })
        .bindTooltip(tooltipContent, { direction: 'top', offset: [0, -10], className: 'strava-custom-tooltip' })
        .addTo(group);

      marker.on('click', () => {
        if (onSelectSegment) onSelectSegment(seg);
      });
    });
  }, [showSegments, segments, onSelectSegment]);

  // Update Live Athlete Position Marker (for Live Recording)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentPosition) {
      const pos: [number, number] = [currentPosition.latitude, currentPosition.longitude];

      try {
        if (!liveMarkerRef.current) {
          liveMarkerRef.current = L.circleMarker(pos, {
            radius: 9,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            color: '#ffffff',
            weight: 3,
          }).addTo(map);
        } else {
          liveMarkerRef.current.setLatLng(pos);
        }

        // Safely pan or setView without throwing if map center is in transition
        // @ts-ignore
        if (map._loaded) {
          map.panTo(pos, { animate: true, duration: 0.8 });
        } else {
          map.setView(pos, zoomLevel || 15);
        }
      } catch {
        try {
          map.setView(pos, zoomLevel || 15);
        } catch {
          // ignore
        }
      }
    } else if (liveMarkerRef.current) {
      try {
        map.removeLayer(liveMarkerRef.current);
      } catch {
        // ignore
      }
      liveMarkerRef.current = null;
    }
  }, [currentPosition, zoomLevel]);

  // Update Synchronized Scrubber Beacon Pin
  useEffect(() => {
    const group = hoverMarkerRef.current;
    if (!group || !track || track.length === 0) return;

    group.clearLayers();

    if (hoveredPointIndex !== null && hoveredPointIndex !== undefined && track[hoveredPointIndex]) {
      const pt = track[hoveredPointIndex];
      const pos: [number, number] = [pt.latitude, pt.longitude];

      // Pulsing outer ripple
      L.circleMarker(pos, {
        radius: 14,
        fillColor: '#FC4C02',
        fillOpacity: 0.35,
        color: '#FC4C02',
        weight: 1,
      }).addTo(group);

      // Core beacon pin
      L.circleMarker(pos, {
        radius: 7,
        fillColor: '#ffffff',
        fillOpacity: 1,
        color: '#FC4C02',
        weight: 3,
      }).addTo(group);
    }
  }, [hoveredPointIndex, track]);

  // Invalidate map size on fullscreen toggle, container change or resize
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // ignore
        }
      }
    });

    try {
      ro.observe(container);
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // ignore
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      try {
        ro.disconnect();
      } catch {
        // ignore
      }
    };
  }, [isFullscreen, heightClass]);

  return (
    <div
      id="strava-route-map-wrapper"
      className={`relative w-full rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : heightClass
      }`}
    >
      {/* Primary Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Strava Top-Left Quick Telemetry Pill */}
      {routeSummary && (
        <div className="absolute top-3 left-3 z-10 bg-neutral-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-neutral-800/90 shadow-xl flex items-center gap-4 text-xs font-mono select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="font-bold text-white tracking-wider">
              {routeSummary.distanceKm} <span className="text-neutral-400 font-normal text-[10px]">KM</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-neutral-300">
            <Mountain className="w-3.5 h-3.5 text-amber-400" />
            <span>+{routeSummary.elevationGain}m</span>
          </div>
          <div className="hidden sm:inline text-neutral-500">|</div>
          <div className="text-[10px] text-neutral-400 uppercase font-sans font-semibold tracking-wider">
            Strava GPS Engine
          </div>
        </div>
      )}

      {/* Strava Floating Scrubber Telemetry HUD (Shown when hovering route or elevation graph) */}
      {activeHoverPoint && (
        <div className="absolute bottom-4 left-3 right-3 sm:right-auto sm:max-w-md z-10 bg-neutral-950/90 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-orange-500/40 shadow-2xl animate-fadeIn font-mono text-xs">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800">
            <div className="flex items-center gap-1.5 text-orange-400 font-black">
              <MapPin className="w-3.5 h-3.5" />
              <span>BEACON: {activeHoverPoint.distanceKm} KM</span>
            </div>
            <div className="text-[10px] text-neutral-400">
              Grade: <span className={`font-bold ${activeHoverPoint.gradePct > 4 ? 'text-rose-400' : 'text-emerald-400'}`}>{activeHoverPoint.gradePct > 0 ? '+' : ''}{activeHoverPoint.gradePct}%</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-800">
              <div className="text-[9px] text-neutral-400 flex items-center justify-center gap-1">
                <Mountain className="w-2.5 h-2.5 text-amber-400" />
                <span>ELEV</span>
              </div>
              <div className="text-white font-bold text-xs mt-0.5">{activeHoverPoint.altitude}m</div>
            </div>

            <div className="bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-800">
              <div className="text-[9px] text-neutral-400 flex items-center justify-center gap-1">
                <Gauge className="w-2.5 h-2.5 text-sky-400" />
                <span>SPEED</span>
              </div>
              <div className="text-white font-bold text-xs mt-0.5">{activeHoverPoint.speedKmh}</div>
            </div>

            <div className="bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-800">
              <div className="text-[9px] text-neutral-400 flex items-center justify-center gap-1">
                <Heart className="w-2.5 h-2.5 text-rose-500" />
                <span>HR</span>
              </div>
              <div className="text-white font-bold text-xs mt-0.5">{activeHoverPoint.heartRate ? `${activeHoverPoint.heartRate}` : '---'}</div>
            </div>

            <div className="bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-800">
              <div className="text-[9px] text-neutral-400 flex items-center justify-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span>WATTS</span>
              </div>
              <div className="text-white font-bold text-xs mt-0.5">{activeHoverPoint.power ? `${activeHoverPoint.power}W` : '---'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Strava Top-Right Map Controls Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 select-none">
        {/* Color Mode Selector (Orange, Elevation, Speed, HR) */}
        <div className="hidden sm:flex items-center bg-neutral-950/90 backdrop-blur-md p-1 rounded-xl border border-neutral-800 text-[11px] font-mono shadow-lg">
          <button
            type="button"
            onClick={() => setColorMode('orange')}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              colorMode === 'orange' ? 'bg-orange-500 text-black' : 'text-neutral-400 hover:text-white'
            }`}
            title="Strava Signature Orange"
          >
            <Flame className="w-3 h-3" />
            <span>Classic</span>
          </button>
          <button
            type="button"
            onClick={() => setColorMode('elevation')}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              colorMode === 'elevation' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:text-white'
            }`}
            title="Color Polyline by Elevation Gradient"
          >
            <Mountain className="w-3 h-3" />
            <span>Elev</span>
          </button>
          <button
            type="button"
            onClick={() => setColorMode('speed')}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              colorMode === 'speed' ? 'bg-neutral-800 text-sky-400' : 'text-neutral-400 hover:text-white'
            }`}
            title="Color Polyline by Speed/Pace"
          >
            <Gauge className="w-3 h-3" />
            <span>Speed</span>
          </button>
          <button
            type="button"
            onClick={() => setColorMode('heart_rate')}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              colorMode === 'heart_rate' ? 'bg-neutral-800 text-rose-400' : 'text-neutral-400 hover:text-white'
            }`}
            title="Color Polyline by Heart Rate Zones"
          >
            <Heart className="w-3 h-3" />
            <span>HR</span>
          </button>
        </div>

        {/* Splits Toggle Button */}
        <button
          type="button"
          onClick={() => setShowSplits(!showSplits)}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition shadow-lg backdrop-blur-md ${
            showSplits
              ? 'bg-neutral-950/90 text-orange-400 border-orange-500/40'
              : 'bg-neutral-950/70 text-neutral-500 border-neutral-800 hover:text-neutral-300'
          }`}
          title="Toggle 1-km split markers"
        >
          Splits ({splits.length})
        </button>

        {/* Segments Toggle Button */}
        {segments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSegments(!showSegments)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition shadow-lg backdrop-blur-md flex items-center gap-1 ${
              showSegments
                ? 'bg-neutral-950/90 text-amber-400 border-amber-500/40'
                : 'bg-neutral-950/70 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
            title="Toggle KOM/PR Segment pins"
          >
            <Trophy className="w-3 h-3" />
            <span>KOMs</span>
          </button>
        )}

        {/* Layer Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="p-2 rounded-xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white shadow-lg backdrop-blur-md transition flex items-center gap-1.5"
            title="Select Basemap Cartography (Strava Dark, Standard, Satellite, Topo)"
          >
            <Layers className="w-4 h-4 text-orange-400" />
            <span className="hidden sm:inline text-xs font-mono font-medium">
              {TILE_SERVERS[activeLayer].label.split(' ')[0]}
            </span>
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-neutral-950 border border-neutral-800 p-2 shadow-2xl backdrop-blur-xl z-20 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Select Basemap Layer
              </div>
              {(Object.keys(TILE_SERVERS) as MapTileLayerType[]).map((key) => {
                const conf = TILE_SERVERS[key];
                const isSelected = activeLayer === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveLayer(key);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-mono transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{conf.label}</div>
                      <div className="text-[10px] text-neutral-400">{conf.desc}</div>
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Center / Fit Route Button */}
        <button
          type="button"
          onClick={handleFitRoute}
          className="p-2 rounded-xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white shadow-lg backdrop-blur-md transition"
          title="Center on Route"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Fullscreen Expand / Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white shadow-lg backdrop-blur-md transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Strava Route View'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Fullscreen Close Floating Button when Active */}
      {isFullscreen && (
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="absolute bottom-6 right-6 z-20 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-mono font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 transition"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Exit Fullscreen</span>
        </button>
      )}
    </div>
  );
};
