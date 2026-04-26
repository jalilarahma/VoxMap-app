// ═══════════════════════════════════════════════════
// SYNTHETIC DATA GENERATOR
// High-density simulated global sentiment data
// Fills the map with realistic vote clusters
// ═══════════════════════════════════════════════════

export interface SyntheticVote {
  lat: number;
  lng: number;
  option_index: number; // 0 = agree, 1 = disagree
  intensity: number; // 0-1 activity level
  timestamp: number;
}

export interface HotspotCluster {
  name: string;
  lat: number;
  lng: number;
  radius: number; // degrees spread
  density: number; // number of synthetic votes
  agreeRatio: number; // 0-1, how much agreement
  intensity: number; // 0-1, activity level
}

// Global hotspots — major cities and geopolitical centers
const HOTSPOT_CLUSTERS: HotspotCluster[] = [
  // Middle East — highest activity (home region)
  { name: "Doha", lat: 25.286, lng: 51.534, radius: 0.15, density: 120, agreeRatio: 0.72, intensity: 1.0 },
  { name: "Lusail", lat: 25.42, lng: 51.49, radius: 0.08, density: 60, agreeRatio: 0.68, intensity: 0.9 },
  { name: "Riyadh", lat: 24.713, lng: 46.675, radius: 0.25, density: 95, agreeRatio: 0.55, intensity: 0.85 },
  { name: "Dubai", lat: 25.204, lng: 55.270, radius: 0.2, density: 85, agreeRatio: 0.61, intensity: 0.88 },
  { name: "Abu Dhabi", lat: 24.453, lng: 54.377, radius: 0.15, density: 50, agreeRatio: 0.59, intensity: 0.7 },
  { name: "Jeddah", lat: 21.485, lng: 39.192, radius: 0.18, density: 55, agreeRatio: 0.48, intensity: 0.65 },
  { name: "Kuwait City", lat: 29.376, lng: 47.977, radius: 0.12, density: 40, agreeRatio: 0.52, intensity: 0.6 },
  { name: "Muscat", lat: 23.588, lng: 58.382, radius: 0.12, density: 35, agreeRatio: 0.64, intensity: 0.55 },
  { name: "Bahrain", lat: 26.066, lng: 50.558, radius: 0.08, density: 30, agreeRatio: 0.58, intensity: 0.5 },
  { name: "Tehran", lat: 35.689, lng: 51.389, radius: 0.3, density: 70, agreeRatio: 0.35, intensity: 0.75 },
  { name: "Baghdad", lat: 33.312, lng: 44.366, radius: 0.25, density: 45, agreeRatio: 0.42, intensity: 0.6 },
  { name: "Beirut", lat: 33.894, lng: 35.502, radius: 0.1, density: 35, agreeRatio: 0.38, intensity: 0.65 },
  { name: "Amman", lat: 31.956, lng: 35.946, radius: 0.12, density: 30, agreeRatio: 0.45, intensity: 0.5 },
  { name: "Istanbul", lat: 41.008, lng: 28.978, radius: 0.25, density: 80, agreeRatio: 0.47, intensity: 0.8 },

  // Europe
  { name: "London", lat: 51.507, lng: -0.128, radius: 0.25, density: 90, agreeRatio: 0.62, intensity: 0.9 },
  { name: "Paris", lat: 48.857, lng: 2.352, radius: 0.2, density: 75, agreeRatio: 0.53, intensity: 0.78 },
  { name: "Berlin", lat: 52.520, lng: 13.405, radius: 0.2, density: 60, agreeRatio: 0.57, intensity: 0.7 },
  { name: "Madrid", lat: 40.417, lng: -3.704, radius: 0.18, density: 50, agreeRatio: 0.49, intensity: 0.6 },
  { name: "Rome", lat: 41.902, lng: 12.496, radius: 0.15, density: 45, agreeRatio: 0.51, intensity: 0.55 },
  { name: "Amsterdam", lat: 52.370, lng: 4.895, radius: 0.1, density: 35, agreeRatio: 0.66, intensity: 0.5 },
  { name: "Stockholm", lat: 59.329, lng: 18.069, radius: 0.12, density: 30, agreeRatio: 0.71, intensity: 0.45 },
  { name: "Moscow", lat: 55.756, lng: 37.617, radius: 0.3, density: 65, agreeRatio: 0.33, intensity: 0.72 },

  // Americas
  { name: "Washington DC", lat: 38.907, lng: -77.037, radius: 0.2, density: 100, agreeRatio: 0.58, intensity: 0.95 },
  { name: "New York", lat: 40.713, lng: -74.006, radius: 0.25, density: 95, agreeRatio: 0.63, intensity: 0.92 },
  { name: "Los Angeles", lat: 34.052, lng: -118.244, radius: 0.3, density: 70, agreeRatio: 0.60, intensity: 0.75 },
  { name: "Chicago", lat: 41.878, lng: -87.630, radius: 0.15, density: 45, agreeRatio: 0.52, intensity: 0.55 },
  { name: "Toronto", lat: 43.653, lng: -79.383, radius: 0.18, density: 50, agreeRatio: 0.65, intensity: 0.6 },
  { name: "Mexico City", lat: 19.432, lng: -99.133, radius: 0.25, density: 55, agreeRatio: 0.44, intensity: 0.6 },
  { name: "São Paulo", lat: -23.551, lng: -46.633, radius: 0.3, density: 60, agreeRatio: 0.41, intensity: 0.65 },
  { name: "Buenos Aires", lat: -34.604, lng: -58.382, radius: 0.2, density: 40, agreeRatio: 0.47, intensity: 0.5 },
  { name: "Bogotá", lat: 4.711, lng: -74.072, radius: 0.15, density: 35, agreeRatio: 0.50, intensity: 0.45 },

  // Africa
  { name: "Cairo", lat: 30.044, lng: 31.236, radius: 0.25, density: 65, agreeRatio: 0.39, intensity: 0.7 },
  { name: "Lagos", lat: 6.524, lng: 3.379, radius: 0.25, density: 55, agreeRatio: 0.43, intensity: 0.6 },
  { name: "Nairobi", lat: -1.286, lng: 36.817, radius: 0.15, density: 35, agreeRatio: 0.56, intensity: 0.45 },
  { name: "Casablanca", lat: 33.573, lng: -7.589, radius: 0.18, density: 50, agreeRatio: 0.52, intensity: 0.6 },
  { name: "Johannesburg", lat: -26.204, lng: 28.048, radius: 0.2, density: 40, agreeRatio: 0.48, intensity: 0.5 },
  { name: "Algiers", lat: 36.737, lng: 3.087, radius: 0.12, density: 30, agreeRatio: 0.40, intensity: 0.45 },

  // Asia
  { name: "Tokyo", lat: 35.676, lng: 139.650, radius: 0.25, density: 80, agreeRatio: 0.69, intensity: 0.82 },
  { name: "Beijing", lat: 39.904, lng: 116.407, radius: 0.3, density: 70, agreeRatio: 0.31, intensity: 0.7 },
  { name: "New Delhi", lat: 28.614, lng: 77.209, radius: 0.3, density: 75, agreeRatio: 0.46, intensity: 0.75 },
  { name: "Mumbai", lat: 19.076, lng: 72.878, radius: 0.25, density: 65, agreeRatio: 0.50, intensity: 0.68 },
  { name: "Singapore", lat: 1.352, lng: 103.820, radius: 0.08, density: 40, agreeRatio: 0.72, intensity: 0.6 },
  { name: "Seoul", lat: 37.566, lng: 126.978, radius: 0.2, density: 60, agreeRatio: 0.55, intensity: 0.7 },
  { name: "Jakarta", lat: -6.175, lng: 106.845, radius: 0.3, density: 55, agreeRatio: 0.44, intensity: 0.6 },
  { name: "Bangkok", lat: 13.756, lng: 100.502, radius: 0.15, density: 40, agreeRatio: 0.58, intensity: 0.5 },
  { name: "Karachi", lat: 24.861, lng: 67.010, radius: 0.25, density: 50, agreeRatio: 0.37, intensity: 0.55 },

  // Oceania
  { name: "Sydney", lat: -33.869, lng: 151.209, radius: 0.2, density: 50, agreeRatio: 0.64, intensity: 0.6 },
  { name: "Melbourne", lat: -37.814, lng: 144.963, radius: 0.15, density: 35, agreeRatio: 0.61, intensity: 0.5 },
];

// Seeded pseudo-random for deterministic data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate gaussian-distributed offset from center
function gaussianOffset(rng: () => number, radius: number): { dlat: number; dlng: number } {
  // Box-Muller transform
  const u1 = rng();
  const u2 = rng();
  const mag = radius * Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001)));
  const angle = 2 * Math.PI * u2;
  return {
    dlat: mag * Math.cos(angle) * 0.6,
    dlng: mag * Math.sin(angle),
  };
}

let cachedVotes: SyntheticVote[] | null = null;

export function generateSyntheticVotes(): SyntheticVote[] {
  if (cachedVotes) return cachedVotes;

  const rng = seededRandom(42);
  const votes: SyntheticVote[] = [];
  const now = Date.now();

  for (const cluster of HOTSPOT_CLUSTERS) {
    for (let i = 0; i < cluster.density; i++) {
      const { dlat, dlng } = gaussianOffset(rng, cluster.radius);
      const isAgree = rng() < cluster.agreeRatio;
      const localIntensity = cluster.intensity * (0.5 + 0.5 * rng());
      const hoursAgo = rng() * 24;

      votes.push({
        lat: cluster.lat + dlat,
        lng: cluster.lng + dlng,
        option_index: isAgree ? 0 : 1,
        intensity: localIntensity,
        timestamp: now - hoursAgo * 3600000,
      });
    }
  }

  cachedVotes = votes;
  return votes;
}

export function getHotspotClusters(): HotspotCluster[] {
  return HOTSPOT_CLUSTERS;
}

// Get top clusters for data arc connections
export function getArcConnections(): { from: HotspotCluster; to: HotspotCluster; strength: number }[] {
  const top = HOTSPOT_CLUSTERS
    .filter(c => c.intensity > 0.5)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 20);

  const arcs: { from: HotspotCluster; to: HotspotCluster; strength: number }[] = [];
  const rng = seededRandom(123);

  // Connect high-activity clusters with arcs
  for (let i = 0; i < top.length; i++) {
    // Each cluster connects to 1-3 others
    const numConnections = 1 + Math.floor(rng() * 2);
    for (let j = 0; j < numConnections; j++) {
      const targetIdx = Math.floor(rng() * top.length);
      if (targetIdx === i) continue;

      const dist = Math.sqrt(
        Math.pow(top[i].lat - top[targetIdx].lat, 2) +
        Math.pow(top[i].lng - top[targetIdx].lng, 2)
      );

      // Only connect clusters that aren't too close
      if (dist > 5 && dist < 80) {
        arcs.push({
          from: top[i],
          to: top[targetIdx],
          strength: (top[i].intensity + top[targetIdx].intensity) / 2,
        });
      }
    }
  }

  return arcs;
}
