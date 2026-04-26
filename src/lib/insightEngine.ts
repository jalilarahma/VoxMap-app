/**
 * VoxMap AI Pattern Analyst
 * Analyzes daily voting results to find interesting geographic
 * and demographic contrasts. Generates natural-language insights.
 *
 * No external LLM needed — uses statistical pattern detection
 * with template-based natural language generation.
 */

// ── Types ──
export interface VoteData {
  country_code: string;
  region: string | null;
  option_index: number; // 0 = agree, 1 = disagree
}

interface CountryStats {
  country: string;
  agree: number;
  disagree: number;
  total: number;
  agree_pct: number;
}

interface RegionStats {
  region: string;
  agree: number;
  disagree: number;
  total: number;
  agree_pct: number;
}

export interface Insight {
  type: "geographic_contrast" | "consensus" | "division" | "outlier" | "trend" | "global_summary";
  headline: string;
  body: string;
  emoji: string;
  strength: number; // 0-1, how interesting this insight is
  data?: Record<string, unknown>;
}

// ── Country name mapping ──
const COUNTRY_NAMES: Record<string, string> = {
  QA: "Qatar", SA: "Saudi Arabia", AE: "UAE", KW: "Kuwait", BH: "Bahrain",
  OM: "Oman", EG: "Egypt", JO: "Jordan", LB: "Lebanon", IQ: "Iraq",
  SY: "Syria", PS: "Palestine", YE: "Yemen", LY: "Libya", TN: "Tunisia",
  DZ: "Algeria", MA: "Morocco", SD: "Sudan", US: "United States", GB: "United Kingdom",
  FR: "France", DE: "Germany", IT: "Italy", ES: "Spain", PT: "Portugal",
  NL: "Netherlands", BE: "Belgium", CH: "Switzerland", AT: "Austria", SE: "Sweden",
  NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland", CZ: "Czech Republic",
  RO: "Romania", GR: "Greece", TR: "Turkey", RU: "Russia", UA: "Ukraine",
  IN: "India", PK: "Pakistan", BD: "Bangladesh", CN: "China", JP: "Japan",
  KR: "South Korea", TW: "Taiwan", TH: "Thailand", VN: "Vietnam", PH: "Philippines",
  ID: "Indonesia", MY: "Malaysia", SG: "Singapore", AU: "Australia", NZ: "New Zealand",
  CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina", CO: "Colombia",
  CL: "Chile", PE: "Peru", NG: "Nigeria", KE: "Kenya", ZA: "South Africa",
  GH: "Ghana", ET: "Ethiopia", TZ: "Tanzania", PS: "Palestine", IR: "Iran",
  AF: "Afghanistan",
};

// ── Regional groupings ──
const REGION_GROUPS: Record<string, string[]> = {
  "Middle East": ["QA", "SA", "AE", "KW", "BH", "OM", "IQ", "SY", "JO", "LB", "YE", "PS", "IR"],
  "North Africa": ["EG", "LY", "TN", "DZ", "MA", "SD"],
  "Europe": ["GB", "FR", "DE", "IT", "ES", "PT", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "PL", "CZ", "RO", "GR"],
  "North America": ["US", "CA", "MX"],
  "South America": ["BR", "AR", "CO", "CL", "PE"],
  "South Asia": ["IN", "PK", "BD"],
  "East Asia": ["CN", "JP", "KR", "TW"],
  "Southeast Asia": ["TH", "VN", "PH", "ID", "MY", "SG"],
  "Sub-Saharan Africa": ["NG", "KE", "ZA", "GH", "ET", "TZ"],
  "Turkey & Central Asia": ["TR", "RU", "UA"],
  "Oceania": ["AU", "NZ"],
};

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code;
}

function getRegionName(countryCode: string): string {
  for (const [region, countries] of Object.entries(REGION_GROUPS)) {
    if (countries.includes(countryCode)) return region;
  }
  return "Other";
}

// ── Core Analysis Functions ──

function aggregateByCountry(votes: VoteData[]): CountryStats[] {
  const map: Record<string, { agree: number; disagree: number }> = {};

  votes.forEach((v) => {
    if (!v.country_code) return;
    if (!map[v.country_code]) map[v.country_code] = { agree: 0, disagree: 0 };
    if (v.option_index === 0) map[v.country_code].agree++;
    else map[v.country_code].disagree++;
  });

  return Object.entries(map)
    .map(([country, stats]) => ({
      country,
      ...stats,
      total: stats.agree + stats.disagree,
      agree_pct: Math.round((stats.agree / (stats.agree + stats.disagree)) * 100),
    }))
    .filter((s) => s.total >= 2) // need at least 2 votes to be meaningful
    .sort((a, b) => b.total - a.total);
}

function aggregateByRegion(votes: VoteData[]): RegionStats[] {
  const map: Record<string, { agree: number; disagree: number }> = {};

  votes.forEach((v) => {
    if (!v.country_code) return;
    const region = getRegionName(v.country_code);
    if (!map[region]) map[region] = { agree: 0, disagree: 0 };
    if (v.option_index === 0) map[region].agree++;
    else map[region].disagree++;
  });

  return Object.entries(map)
    .map(([region, stats]) => ({
      region,
      ...stats,
      total: stats.agree + stats.disagree,
      agree_pct: Math.round((stats.agree / (stats.agree + stats.disagree)) * 100),
    }))
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.total - a.total);
}

// ── Insight Generators ──

function findGeographicContrasts(countries: CountryStats[]): Insight[] {
  const insights: Insight[] = [];
  if (countries.length < 2) return insights;

  // Find biggest contrast between any two countries
  let maxDiff = 0;
  let countryA: CountryStats | null = null;
  let countryB: CountryStats | null = null;

  for (let i = 0; i < Math.min(countries.length, 10); i++) {
    for (let j = i + 1; j < Math.min(countries.length, 10); j++) {
      const diff = Math.abs(countries[i].agree_pct - countries[j].agree_pct);
      if (diff > maxDiff && countries[i].total >= 3 && countries[j].total >= 3) {
        maxDiff = diff;
        countryA = countries[i];
        countryB = countries[j];
      }
    }
  }

  if (countryA && countryB && maxDiff >= 20) {
    const higher = countryA.agree_pct > countryB.agree_pct ? countryA : countryB;
    const lower = countryA.agree_pct > countryB.agree_pct ? countryB : countryA;

    insights.push({
      type: "geographic_contrast",
      emoji: "🌍",
      headline: `${getCountryName(higher.country)} vs ${getCountryName(lower.country)}: A ${maxDiff}% opinion gap`,
      body: `${getCountryName(higher.country)} agrees at ${higher.agree_pct}% while ${getCountryName(lower.country)} only agrees at ${lower.agree_pct}%. That is a ${maxDiff} percentage point gap on the same question. Geography shapes opinion.`,
      strength: Math.min(maxDiff / 60, 1),
      data: { countryA: higher.country, countryB: lower.country, diff: maxDiff },
    });
  }

  return insights;
}

function findRegionalContrasts(regions: RegionStats[]): Insight[] {
  const insights: Insight[] = [];
  if (regions.length < 2) return insights;

  let maxDiff = 0;
  let regionA: RegionStats | null = null;
  let regionB: RegionStats | null = null;

  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const diff = Math.abs(regions[i].agree_pct - regions[j].agree_pct);
      if (diff > maxDiff) {
        maxDiff = diff;
        regionA = regions[i];
        regionB = regions[j];
      }
    }
  }

  if (regionA && regionB && maxDiff >= 15) {
    const higher = regionA.agree_pct > regionB.agree_pct ? regionA : regionB;
    const lower = regionA.agree_pct > regionB.agree_pct ? regionB : regionA;

    insights.push({
      type: "geographic_contrast",
      emoji: "🗺️",
      headline: `${higher.region} and ${lower.region} see this very differently`,
      body: `${higher.region} agrees at ${higher.agree_pct}% (${higher.total} votes) while ${lower.region} agrees at only ${lower.agree_pct}% (${lower.total} votes). Regional culture drives a ${maxDiff}% divide.`,
      strength: Math.min(maxDiff / 50, 1),
    });
  }

  return insights;
}

function findConsensus(countries: CountryStats[], totalAgree: number, totalDisagree: number): Insight[] {
  const insights: Insight[] = [];
  const total = totalAgree + totalDisagree;
  if (total < 5) return insights;

  const globalPct = Math.round((totalAgree / total) * 100);

  // Strong global consensus (>80% agree or >80% disagree)
  if (globalPct >= 80) {
    insights.push({
      type: "consensus",
      emoji: "🤝",
      headline: `Global consensus: ${globalPct}% of the world agrees`,
      body: `Across ${countries.length} countries and ${total} votes, an overwhelming ${globalPct}% agree. This is one of those rare questions where the world speaks with one voice.`,
      strength: (globalPct - 70) / 30,
    });
  } else if (globalPct <= 20) {
    insights.push({
      type: "consensus",
      emoji: "🚫",
      headline: `Global rejection: Only ${globalPct}% agree`,
      body: `Across ${countries.length} countries, only ${globalPct}% agree. The world has spoken clearly: ${100 - globalPct}% disagree with this statement.`,
      strength: (80 - globalPct) / 30,
    });
  }

  return insights;
}

function findDivision(totalAgree: number, totalDisagree: number): Insight[] {
  const insights: Insight[] = [];
  const total = totalAgree + totalDisagree;
  if (total < 5) return insights;

  const globalPct = Math.round((totalAgree / total) * 100);

  // Close to 50/50 = maximum division
  if (globalPct >= 45 && globalPct <= 55) {
    insights.push({
      type: "division",
      emoji: "⚡",
      headline: `The world is split: ${globalPct}% agree, ${100 - globalPct}% disagree`,
      body: `This question divides humanity almost perfectly in half. Neither side has a clear majority. This is the type of question that defines generations, and VoxMap is capturing it in real time.`,
      strength: 1 - Math.abs(globalPct - 50) / 10,
    });
  }

  return insights;
}

function findOutliers(countries: CountryStats[], totalAgree: number, totalDisagree: number): Insight[] {
  const insights: Insight[] = [];
  const total = totalAgree + totalDisagree;
  if (total < 5 || countries.length < 3) return insights;

  const globalPct = Math.round((totalAgree / total) * 100);

  // Find countries that deviate most from global average
  const outliers = countries
    .filter((c) => c.total >= 3)
    .map((c) => ({ ...c, deviation: Math.abs(c.agree_pct - globalPct) }))
    .sort((a, b) => b.deviation - a.deviation);

  if (outliers.length > 0 && outliers[0].deviation >= 25) {
    const o = outliers[0];
    const direction = o.agree_pct > globalPct ? "more likely to agree" : "more likely to disagree";

    insights.push({
      type: "outlier",
      emoji: "📊",
      headline: `${getCountryName(o.country)} stands alone: ${o.deviation}% away from global average`,
      body: `While the world averages ${globalPct}% agreement, ${getCountryName(o.country)} is at ${o.agree_pct}%. Voters there are ${o.deviation}% ${direction} than the global average. What makes this country think so differently?`,
      strength: Math.min(o.deviation / 40, 1),
    });
  }

  return insights;
}

function generateGlobalSummary(
  countries: CountryStats[],
  totalAgree: number,
  totalDisagree: number,
  questionText: string
): Insight {
  const total = totalAgree + totalDisagree;
  const globalPct = total > 0 ? Math.round((totalAgree / total) * 100) : 50;
  const countriesCount = countries.length;

  const verdict = globalPct >= 65
    ? "The world leans strongly toward agreement."
    : globalPct <= 35
    ? "The world leans strongly toward disagreement."
    : globalPct >= 55
    ? "A slight majority agrees, but the debate is alive."
    : globalPct <= 45
    ? "A slight majority disagrees, but opinions are divided."
    : "The world is evenly split. This question is a true divider.";

  return {
    type: "global_summary",
    emoji: "🌐",
    headline: `Today's Pulse: ${globalPct}% agree across ${countriesCount} countries`,
    body: `"${questionText}" — ${total} people from ${countriesCount} countries have voted. ${verdict} The conversation continues.`,
    strength: 0.5,
  };
}

// ── Main Analysis Function ──

export function analyzeVotes(
  votes: VoteData[],
  questionText: string
): Insight[] {
  if (votes.length === 0) return [];

  const countries = aggregateByCountry(votes);
  const regions = aggregateByRegion(votes);

  const totalAgree = votes.filter((v) => v.option_index === 0).length;
  const totalDisagree = votes.filter((v) => v.option_index === 1).length;

  // Collect all insights
  const allInsights: Insight[] = [
    ...findGeographicContrasts(countries),
    ...findRegionalContrasts(regions),
    ...findConsensus(countries, totalAgree, totalDisagree),
    ...findDivision(totalAgree, totalDisagree),
    ...findOutliers(countries, totalAgree, totalDisagree),
  ];

  // Sort by strength (most interesting first)
  allInsights.sort((a, b) => b.strength - a.strength);

  // Always include a global summary as the last insight
  const summary = generateGlobalSummary(countries, totalAgree, totalDisagree, questionText);

  // Return top 3 insights + summary
  return [...allInsights.slice(0, 3), summary];
}
