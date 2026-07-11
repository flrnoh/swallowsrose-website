// Geo helpers for the tour planner — fully self-contained, no external API.
//
// `geo-cities.json` maps a normalized city name → [lat, lng] for the DACH
// cities that appear in our gigs + contacts. Coordinates derived once from the
// public GeoNames postal dumps (DE/AT/CZ, CC-BY) and bundled as a small subset;
// unmatched cities simply don't plot. Regenerate the subset when many new
// cities are added.
import cities from '../data/geo-cities.json';

export type LatLng = [number, number];
const GEO = cities as Record<string, LatLng>;

/** Same normalization used to build geo-cities.json — keep in sync. */
export function normCity(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/\(.*?\)/g, '') // strip "(AT)", "(CZ)" …
    .replace(/[^a-z0-9]+/g, '');
}

export function geocode(city: string | null | undefined): LatLng | null {
  const n = normCity(city);
  return n ? (GEO[n] ?? null) : null;
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// DACH bounding box for the schematic map projection.
const BBOX = { minLat: 46.3, maxLat: 55.1, minLng: 5.8, maxLng: 17.2 };
// Aspect ratio (width:height) that keeps the map roughly undistorted at these
// latitudes (longitude degrees are ~cos(51°) as wide as latitude degrees).
export const MAP_ASPECT =
  ((BBOX.maxLng - BBOX.minLng) * Math.cos((((BBOX.minLat + BBOX.maxLat) / 2) * Math.PI) / 180)) /
  (BBOX.maxLat - BBOX.minLat);

/** Project a coordinate to unit space [0..1, 0..1] (x → right, y → down). */
export function projectUnit([lat, lng]: LatLng): [number, number] {
  const ux = (lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng);
  const uy = (BBOX.maxLat - lat) / (BBOX.maxLat - BBOX.minLat);
  return [Math.min(1, Math.max(0, ux)), Math.min(1, Math.max(0, uy))];
}
