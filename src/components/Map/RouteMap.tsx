import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GPSPoint } from '../../types';

interface RouteMapProps {
  track: GPSPoint[];
  currentPosition?: GPSPoint | null;
  hoveredPointIndex?: number | null;
  interactive?: boolean;
  heightClass?: string;
  zoomLevel?: number;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  track,
  currentPosition,
  hoveredPointIndex,
  interactive = true,
  heightClass = 'h-72',
  zoomLevel,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const liveMarkerRef = useRef<L.CircleMarker | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    // Dark high-contrast sports cartography (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [interactive]);

  // Update track & markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove previous polylines
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (track && track.length > 0) {
      const latlngs: [number, number][] = track.map((pt) => [pt.latitude, pt.longitude]);

      // Draw high-visibility sports path
      const polyline = L.polyline(latlngs, {
        color: '#f97316', // Veltrix signature fiery orange
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);

      polylineRef.current = polyline;

      // Start pin
      const startPt = latlngs[0];
      L.circleMarker(startPt, {
        radius: 6,
        fillColor: '#10b981',
        fillOpacity: 1,
        color: '#ffffff',
        weight: 2,
      }).addTo(map);

      // Fit bounds if not actively locked on live single position
      if (!currentPosition) {
        const bounds = polyline.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: zoomLevel || 15 });
        }
      }
    }
  }, [track, currentPosition, zoomLevel]);

  // Update live marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentPosition) {
      const pos: [number, number] = [currentPosition.latitude, currentPosition.longitude];

      if (!liveMarkerRef.current) {
        liveMarkerRef.current = L.circleMarker(pos, {
          radius: 8,
          fillColor: '#3b82f6', // Live athlete dot
          fillOpacity: 1,
          color: '#ffffff',
          weight: 3,
        }).addTo(map);
      } else {
        liveMarkerRef.current.setLatLng(pos);
      }

      // Pan to live marker smoothly
      map.panTo(pos, { animate: true });
    } else if (liveMarkerRef.current) {
      map.removeLayer(liveMarkerRef.current);
      liveMarkerRef.current = null;
    }
  }, [currentPosition]);

  // Update elevation scrubber hover marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !track || track.length === 0) return;

    if (hoveredPointIndex !== null && hoveredPointIndex !== undefined && track[hoveredPointIndex]) {
      const pt = track[hoveredPointIndex];
      const pos: [number, number] = [pt.latitude, pt.longitude];

      if (!hoverMarkerRef.current) {
        hoverMarkerRef.current = L.circleMarker(pos, {
          radius: 7,
          fillColor: '#fbbf24', // Amber scrub pin
          fillOpacity: 1,
          color: '#ffffff',
          weight: 2,
        }).addTo(map);
      } else {
        hoverMarkerRef.current.setLatLng(pos);
      }
    } else if (hoverMarkerRef.current) {
      map.removeLayer(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }
  }, [hoveredPointIndex, track]);

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Subtle sports branding watermark */}
      <div className="absolute bottom-2 left-2 z-10 pointer-events-none bg-neutral-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 border border-neutral-800/80">
        VELTRIX GPS ENGINE
      </div>
    </div>
  );
};
