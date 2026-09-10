import { GPSPoint, SportType } from '../types';

/**
 * Generates a valid, standards-compliant GPX 1.1 file string with Garmin TrackPointExtensions
 * Compatible with Strava, Garmin Connect, TrainingPeaks, Wahoo Fitness, GoldenCheetah, and Zwift.
 */
export function generateGPXString(
  activityTitle: string,
  trackPoints: GPSPoint[],
  sport: SportType = 'cycling',
  recordedDate: string = new Date().toISOString()
): string {
  const sanitizedTitle = activityTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const pointsXml = trackPoints
    .map((pt) => {
      const timeIso = new Date(pt.timestamp).toISOString();
      const ele = pt.altitude !== undefined ? `<ele>${pt.altitude.toFixed(1)}</ele>` : '<ele>10.0</ele>';
      
      const hrTag = pt.heartRate ? `<gpxtpx:hr>${Math.round(pt.heartRate)}</gpxtpx:hr>` : '';
      const cadTag = pt.cadence ? `<gpxtpx:cad>${Math.round(pt.cadence)}</gpxtpx:cad>` : '';
      const speedTag = pt.speed ? `<gpxtpx:speed>${pt.speed.toFixed(2)}</gpxtpx:speed>` : '';
      const powerTag = pt.power ? `<power>${Math.round(pt.power)}</power>` : '';

      const hasExtensions = hrTag || cadTag || speedTag || powerTag;

      return `      <trkpt lat="${pt.latitude.toFixed(6)}" lon="${pt.longitude.toFixed(6)}">
        ${ele}
        <time>${timeIso}</time>
        ${
          hasExtensions
            ? `<extensions>
          <gpxtpx:TrackPointExtension>
            ${hrTag}
            ${cadTag}
            ${speedTag}
          </gpxtpx:TrackPointExtension>
          ${powerTag}
        </extensions>`
            : ''
        }
      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" 
     creator="Veltrix Athletic Performance - High Precision GNSS Capture" 
     xmlns="http://www.topografix.com/GPX/1/1" 
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">
  <metadata>
    <name>${sanitizedTitle}</name>
    <desc>Captured with Veltrix GPS Multi-Band GNSS Telemetry Engine</desc>
    <time>${recordedDate}</time>
  </metadata>
  <trk>
    <name>${sanitizedTitle}</name>
    <type>${sport}</type>
    <trkseg>
${pointsXml}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Triggers an immediate browser download of the generated GPX file
 */
export function downloadGPXFile(
  activityTitle: string,
  trackPoints: GPSPoint[],
  sport: SportType = 'cycling',
  recordedDate: string = new Date().toISOString()
): boolean {
  if (!trackPoints || trackPoints.length === 0) {
    return false;
  }

  const gpxContent = generateGPXString(activityTitle, trackPoints, sport, recordedDate);
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safeName = (activityTitle || 'veltrix_gps_track')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const filename = `${safeName}_${Date.now()}.gpx`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
