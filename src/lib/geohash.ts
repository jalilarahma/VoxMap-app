/**
 * Geohash Locality Verification — Phase A of ZKP
 *
 * Converts GPS coordinates to a geohash (precision 4 = ~20km x 20km grid cell).
 * Server checks if geohash falls within a known city bounding box.
 * Vote gets a "Verified Local" badge without revealing exact coordinates.
 *
 * This is the simplified version before full ZK proofs (Phase C).
 */

// ── Base32 encoding for geohash ──
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Encode lat/lng to a geohash string.
 * Precision 4 = ~20km x 20km cell (good for city-level locality)
 * Precision 5 = ~5km x 5km cell
 * Precision 6 = ~1km x 1km cell
 */
export function encodeGeohash(lat: number, lng: number, precision: number = 4): string {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch |= (1 << (4 - bit));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isLng = !isLng;
    bit++;

    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Decode a geohash back to a bounding box.
 * Returns { minLat, maxLat, minLng, maxLng }
 */
export function decodeGeohash(hash: string): {
  minLat: number; maxLat: number; minLng: number; maxLng: number;
  centerLat: number; centerLng: number;
} {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let isLng = true;

  for (const ch of hash) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;

    for (let bit = 4; bit >= 0; bit--) {
      if (isLng) {
        const mid = (lngMin + lngMax) / 2;
        if (idx & (1 << bit)) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & (1 << bit)) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isLng = !isLng;
    }
  }

  return {
    minLat: latMin, maxLat: latMax,
    minLng: lngMin, maxLng: lngMax,
    centerLat: (latMin + latMax) / 2,
    centerLng: (lngMin + lngMax) / 2,
  };
}

/**
 * Top cities with bounding boxes (from OpenStreetMap Nominatim).
 * Each city has a bounding box that defines its geographic extent.
 * The geohash of a user's GPS is checked against these boxes.
 */
export interface CityBoundingBox {
  name: string;
  country: string;
  countryCode: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const CITY_BOUNDING_BOXES: CityBoundingBox[] = [
  // Middle East
  { name: "Doha", country: "Qatar", countryCode: "QA", minLat: 25.15, maxLat: 25.45, minLng: 51.35, maxLng: 51.65 },
  { name: "Lusail", country: "Qatar", countryCode: "QA", minLat: 25.40, maxLat: 25.50, minLng: 51.45, maxLng: 51.55 },
  { name: "Al Wakrah", country: "Qatar", countryCode: "QA", minLat: 25.10, maxLat: 25.20, minLng: 51.55, maxLng: 51.65 },
  { name: "Riyadh", country: "Saudi Arabia", countryCode: "SA", minLat: 24.50, maxLat: 24.90, minLng: 46.50, maxLng: 46.90 },
  { name: "Jeddah", country: "Saudi Arabia", countryCode: "SA", minLat: 21.30, maxLat: 21.80, minLng: 39.00, maxLng: 39.40 },
  { name: "Dubai", country: "UAE", countryCode: "AE", minLat: 25.00, maxLat: 25.40, minLng: 55.00, maxLng: 55.55 },
  { name: "Abu Dhabi", country: "UAE", countryCode: "AE", minLat: 24.30, maxLat: 24.60, minLng: 54.30, maxLng: 54.80 },
  { name: "Kuwait City", country: "Kuwait", countryCode: "KW", minLat: 29.20, maxLat: 29.50, minLng: 47.80, maxLng: 48.10 },
  { name: "Manama", country: "Bahrain", countryCode: "BH", minLat: 26.10, maxLat: 26.30, minLng: 50.50, maxLng: 50.70 },
  { name: "Muscat", country: "Oman", countryCode: "OM", minLat: 23.50, maxLat: 23.70, minLng: 58.30, maxLng: 58.65 },
  { name: "Amman", country: "Jordan", countryCode: "JO", minLat: 31.85, maxLat: 32.05, minLng: 35.80, maxLng: 36.00 },
  { name: "Beirut", country: "Lebanon", countryCode: "LB", minLat: 33.82, maxLat: 33.92, minLng: 35.45, maxLng: 35.55 },
  { name: "Baghdad", country: "Iraq", countryCode: "IQ", minLat: 33.20, maxLat: 33.45, minLng: 44.25, maxLng: 44.55 },
  // Africa
  { name: "Cairo", country: "Egypt", countryCode: "EG", minLat: 29.95, maxLat: 30.15, minLng: 31.15, maxLng: 31.45 },
  { name: "Casablanca", country: "Morocco", countryCode: "MA", minLat: 33.50, maxLat: 33.65, minLng: -7.70, maxLng: -7.45 },
  { name: "Lagos", country: "Nigeria", countryCode: "NG", minLat: 6.35, maxLat: 6.70, minLng: 3.20, maxLng: 3.60 },
  { name: "Nairobi", country: "Kenya", countryCode: "KE", minLat: -1.40, maxLat: -1.15, minLng: 36.65, maxLng: 36.95 },
  { name: "Cape Town", country: "South Africa", countryCode: "ZA", minLat: -34.10, maxLat: -33.80, minLng: 18.35, maxLng: 18.70 },
  // Europe
  { name: "London", country: "United Kingdom", countryCode: "GB", minLat: 51.30, maxLat: 51.70, minLng: -0.50, maxLng: 0.30 },
  { name: "Paris", country: "France", countryCode: "FR", minLat: 48.80, maxLat: 48.92, minLng: 2.22, maxLng: 2.47 },
  { name: "Berlin", country: "Germany", countryCode: "DE", minLat: 52.35, maxLat: 52.65, minLng: 13.10, maxLng: 13.65 },
  { name: "Madrid", country: "Spain", countryCode: "ES", minLat: 40.30, maxLat: 40.55, minLng: -3.85, maxLng: -3.55 },
  { name: "Istanbul", country: "Turkey", countryCode: "TR", minLat: 40.80, maxLat: 41.20, minLng: 28.60, maxLng: 29.20 },
  { name: "Moscow", country: "Russia", countryCode: "RU", minLat: 55.55, maxLat: 55.95, minLng: 37.30, maxLng: 37.90 },
  // Americas
  { name: "New York", country: "United States", countryCode: "US", minLat: 40.50, maxLat: 40.90, minLng: -74.30, maxLng: -73.70 },
  { name: "Los Angeles", country: "United States", countryCode: "US", minLat: 33.70, maxLat: 34.30, minLng: -118.70, maxLng: -118.10 },
  { name: "Toronto", country: "Canada", countryCode: "CA", minLat: 43.55, maxLat: 43.85, minLng: -79.65, maxLng: -79.10 },
  { name: "Mexico City", country: "Mexico", countryCode: "MX", minLat: 19.20, maxLat: 19.55, minLng: -99.35, maxLng: -98.95 },
  { name: "Sao Paulo", country: "Brazil", countryCode: "BR", minLat: -23.75, maxLat: -23.35, minLng: -46.85, maxLng: -46.35 },
  // Asia
  { name: "Tokyo", country: "Japan", countryCode: "JP", minLat: 35.50, maxLat: 35.85, minLng: 139.50, maxLng: 139.90 },
  { name: "Mumbai", country: "India", countryCode: "IN", minLat: 18.85, maxLat: 19.30, minLng: 72.75, maxLng: 73.05 },
  { name: "Delhi", country: "India", countryCode: "IN", minLat: 28.40, maxLat: 28.85, minLng: 76.85, maxLng: 77.35 },
  { name: "Shanghai", country: "China", countryCode: "CN", minLat: 31.00, maxLat: 31.50, minLng: 121.20, maxLng: 121.80 },
  { name: "Singapore", country: "Singapore", countryCode: "SG", minLat: 1.20, maxLat: 1.47, minLng: 103.60, maxLng: 104.00 },
  { name: "Jakarta", country: "Indonesia", countryCode: "ID", minLat: -6.40, maxLat: -6.05, minLng: 106.65, maxLng: 107.00 },
  { name: "Seoul", country: "South Korea", countryCode: "KR", minLat: 37.40, maxLat: 37.70, minLng: 126.75, maxLng: 127.20 },
  // Oceania
  { name: "Sydney", country: "Australia", countryCode: "AU", minLat: -34.00, maxLat: -33.65, minLng: 150.95, maxLng: 151.35 },
  { name: "Melbourne", country: "Australia", countryCode: "AU", minLat: -37.95, maxLat: -37.60, minLng: 144.80, maxLng: 145.20 },
];

/**
 * Check if a geohash falls within any known city bounding box.
 * Returns the city name if matched, null otherwise.
 */
export function verifyLocality(lat: number, lng: number): CityBoundingBox | null {
  for (const city of CITY_BOUNDING_BOXES) {
    if (lat >= city.minLat && lat <= city.maxLat &&
        lng >= city.minLng && lng <= city.maxLng) {
      return city;
    }
  }
  return null;
}

/**
 * Full verification flow:
 * 1. Convert GPS to geohash (privacy: reduces precision)
 * 2. Check geohash center against city bounding boxes
 * 3. Return verification result
 */
export function getLocalityProof(lat: number, lng: number): {
  geohash: string;
  verified: boolean;
  city: CityBoundingBox | null;
} {
  const geohash = encodeGeohash(lat, lng, 4);
  const decoded = decodeGeohash(geohash);
  const city = verifyLocality(decoded.centerLat, decoded.centerLng);

  return {
    geohash,
    verified: city !== null,
    city,
  };
}
