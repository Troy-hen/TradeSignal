import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type MarketSignalMapPoint = {
  market_signal_trade_match_id: string;
  signal_type: string;
  title: string;
  postcode_district: string | null;
  location_label: string;
  location_scope: "exact" | "regional";
  latitude: number;
  longitude: number;
  trade_category_id: string;
  trade_name: string;
  trade_slug: string;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  fit_score: number | null;
  opportunity_bucket: string | null;
  deadline_at: string | null;
  buyer_name: string | null;
  access_level: "full" | "teaser";
  source_url: string | null;
};

type RawMarketSignalMapPoint = Omit<MarketSignalMapPoint, "latitude" | "longitude"> & {
  latitude: number | null;
  longitude: number | null;
  delivery_postcode: string | null;
  delivery_regions: string[];
};

type PostcodesIoResponse = {
  result?: Array<{
    query?: string;
    result?: { latitude?: number | null; longitude?: number | null } | null;
  }>;
};

const REGION_CENTRES: Record<string, { latitude: number; longitude: number }> = {
  "north east england": { latitude: 54.85, longitude: -1.75 },
  "north west england": { latitude: 54.0, longitude: -2.65 },
  "yorkshire and the humber": { latitude: 53.95, longitude: -1.35 },
  "east midlands": { latitude: 52.95, longitude: -0.95 },
  "west midlands": { latitude: 52.5, longitude: -2.0 },
  "east of england": { latitude: 52.25, longitude: 0.3 },
  london: { latitude: 51.5074, longitude: -0.1278 },
  "south east england": { latitude: 51.25, longitude: -0.55 },
  "south west england": { latitude: 50.8, longitude: -3.5 },
  wales: { latitude: 52.2, longitude: -3.7 },
  scotland: { latitude: 56.5, longitude: -4.2 },
  "northern ireland": { latitude: 54.7, longitude: -6.6 },
};

export async function getCanonicalOpportunityMapPoints(limit = 2000) {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: rawOpportunities, error } = await supabase
    .from("opportunities")
    .select("id, legacy_application_trade_opportunity_id, location_id, title, status, score, b2b_eligible, customer_visible")
    .eq("b2b_eligible", true)
    .eq("customer_visible", true)
    .order("score", { ascending: false })
    .limit(limit);
  if (error || !rawOpportunities?.length) {
    if (error) console.error("canonical opportunity map failed", error);
    return [];
  }

  const opportunities = rawOpportunities as Array<Record<string, unknown>>;
  const locationIds = [...new Set(opportunities.map((row) => row.location_id).filter((id): id is string => typeof id === "string"))];
  const legacyIds = [...new Set(opportunities.map((row) => row.legacy_application_trade_opportunity_id).filter((id): id is string => typeof id === "string"))];
  const [{ data: locations }, { data: legacy }] = await Promise.all([
    locationIds.length ? supabase.from("business_locations").select("id, postcode_district, town_city, latitude, longitude").in("id", locationIds) : Promise.resolve({ data: [] }),
    legacyIds.length ? supabase.from("application_trade_opportunities").select("id, estimated_trade_value_low, estimated_trade_value_high").in("id", legacyIds) : Promise.resolve({ data: [] }),
  ]);
  const locationById = new Map((locations ?? []).map((row) => [row.id, row]));
  const legacyById = new Map((legacy ?? []).map((row) => [row.id, row]));
  const grouped = new Map<string, {
    postcode_district: string;
    post_town: string;
    latitude: number;
    longitude: number;
    opportunity_count: number;
    estimated_trade_value_low: number;
    estimated_trade_value_high: number;
    teaser_project_type: string | null;
    teaser_status: string | null;
    monthly_price_pence: number;
  }>();

  for (const opportunity of opportunities) {
    const location = locationById.get(opportunity.location_id as string);
    const district = typeof location?.postcode_district === "string" ? location.postcode_district : null;
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    if (!district || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const current = grouped.get(district);
    const legacyRow = legacyById.get(opportunity.legacy_application_trade_opportunity_id as string);
    const low = Number(legacyRow?.estimated_trade_value_low ?? 0);
    const high = Number(legacyRow?.estimated_trade_value_high ?? 0);
    if (!current) {
      grouped.set(district, {
        postcode_district: district,
        post_town: typeof location?.town_city === "string" && location.town_city ? location.town_city : district,
        latitude,
        longitude,
        opportunity_count: 1,
        estimated_trade_value_low: Number.isFinite(low) ? low : 0,
        estimated_trade_value_high: Number.isFinite(high) ? high : 0,
        teaser_project_type: typeof opportunity.title === "string" ? opportunity.title : null,
        teaser_status: typeof opportunity.status === "string" ? opportunity.status : null,
        monthly_price_pence: 2999,
      });
    } else {
      current.latitude = (current.latitude * (current.opportunity_count - 1) + latitude) / current.opportunity_count;
      current.longitude = (current.longitude * (current.opportunity_count - 1) + longitude) / current.opportunity_count;
      current.opportunity_count += 1;
      current.estimated_trade_value_low += Number.isFinite(low) ? low : 0;
      current.estimated_trade_value_high += Number.isFinite(high) ? high : 0;
    }
  }

  return [...grouped.values()].map((point) => ({
    ...point,
    commercial_opportunity_count: point.opportunity_count,
    commercial_estimated_trade_value_low: point.estimated_trade_value_low,
    commercial_estimated_trade_value_high: point.estimated_trade_value_high,
    commercial_teaser_project_type: point.teaser_project_type,
    commercial_teaser_status: point.teaser_status,
    commercial_teaser_estimated_trade_value_low: point.estimated_trade_value_low,
    commercial_teaser_estimated_trade_value_high: point.estimated_trade_value_high,
    trade_category_id: "unified",
    trade_name: "Relevant opportunities",
    trade_slug: "unified",
    territory_status: "available",
  }));
}

export async function getMarketSignalMapPoints(limit = 600): Promise<MarketSignalMapPoint[]> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase.rpc("browse_market_signal_map", { p_trade_slug: null, p_limit: limit });
  if (error) {
    console.error("market signal map failed", error);
    return [];
  }

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map(normalizeRow);
  const missingExact = rows.filter((row) => row.location_scope === "exact" && (row.latitude === null || row.longitude === null) && row.delivery_postcode);
  const postcodeCoordinates = await geocodePostcodes(missingExact.map((row) => row.delivery_postcode!).filter(Boolean));

  return rows.flatMap((row) => {
    let latitude = row.latitude;
    let longitude = row.longitude;

    if ((latitude === null || longitude === null) && row.delivery_postcode) {
      const geocoded = postcodeCoordinates.get(normalizePostcode(row.delivery_postcode));
      if (geocoded) {
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
      }
    }

    if ((latitude === null || longitude === null) && row.location_scope === "regional") {
      const regional = centreForRegions(row.delivery_regions);
      if (regional) {
        latitude = regional.latitude;
        longitude = regional.longitude;
      }
    }

    if (latitude === null || longitude === null) return [];
    if (latitude < 49.4 || latitude > 61 || longitude < -8.8 || longitude > 2.5) return [];

    return [{
      market_signal_trade_match_id: row.market_signal_trade_match_id,
      signal_type: row.signal_type,
      title: row.title,
      postcode_district: row.postcode_district,
      location_label: row.location_label,
      location_scope: row.location_scope,
      latitude,
      longitude,
      trade_category_id: row.trade_category_id,
      trade_name: row.trade_name,
      trade_slug: row.trade_slug,
      estimated_trade_value_low: row.estimated_trade_value_low,
      estimated_trade_value_high: row.estimated_trade_value_high,
      fit_score: row.fit_score,
      opportunity_bucket: row.opportunity_bucket,
      deadline_at: row.deadline_at,
      buyer_name: row.buyer_name,
      access_level: row.access_level,
      source_url: row.source_url,
    }];
  });
}

function normalizeRow(row: Record<string, unknown>): RawMarketSignalMapPoint {
  return {
    market_signal_trade_match_id: String(row.market_signal_trade_match_id ?? ""),
    signal_type: String(row.signal_type ?? "tender"),
    title: String(row.title ?? "Public opportunity"),
    postcode_district: stringOrNull(row.postcode_district),
    location_label: String(row.location_label ?? "Regional opportunity"),
    location_scope: row.location_scope === "regional" ? "regional" : "exact",
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    delivery_postcode: stringOrNull(row.delivery_postcode),
    delivery_regions: Array.isArray(row.delivery_regions) ? row.delivery_regions.filter((item): item is string => typeof item === "string") : [],
    trade_category_id: String(row.trade_category_id ?? ""),
    trade_name: String(row.trade_name ?? "Trade"),
    trade_slug: String(row.trade_slug ?? ""),
    estimated_trade_value_low: numberOrNull(row.estimated_trade_value_low),
    estimated_trade_value_high: numberOrNull(row.estimated_trade_value_high),
    fit_score: numberOrNull(row.fit_score),
    opportunity_bucket: stringOrNull(row.opportunity_bucket),
    deadline_at: stringOrNull(row.deadline_at),
    buyer_name: stringOrNull(row.buyer_name),
    access_level: row.access_level === "full" ? "full" : "teaser",
    source_url: stringOrNull(row.source_url),
  };
}

async function geocodePostcodes(postcodes: string[]) {
  const unique = [...new Set(postcodes.map(normalizePostcode).filter(Boolean))];
  const coordinates = new Map<string, { latitude: number; longitude: number }>();
  if (unique.length === 0) return coordinates;

  for (let start = 0; start < unique.length; start += 100) {
    const batch = unique.slice(start, start + 100);
    try {
      const response = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ postcodes: batch }),
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) continue;
      const payload = await response.json() as PostcodesIoResponse;
      for (const item of payload.result ?? []) {
        const key = normalizePostcode(item.query ?? "");
        const latitude = item.result?.latitude;
        const longitude = item.result?.longitude;
        if (key && typeof latitude === "number" && typeof longitude === "number") coordinates.set(key, { latitude, longitude });
      }
    } catch (error) {
      console.warn("Postcode map geocoding unavailable", error);
    }
  }
  return coordinates;
}

function centreForRegions(regions: string[]) {
  const centres = regions.map(normaliseRegion).map((region) => REGION_CENTRES[region]).filter(Boolean);
  if (centres.length === 0) return null;
  return {
    latitude: centres.reduce((sum, item) => sum + item.latitude, 0) / centres.length,
    longitude: centres.reduce((sum, item) => sum + item.longitude, 0) / centres.length,
  };
}

function normaliseRegion(value: string) {
  const trimmed = value.trim();
  const code = trimmed.toUpperCase();
  if (code.startsWith("UKC")) return "north east england";
  if (code.startsWith("UKD")) return "north west england";
  if (code.startsWith("UKE")) return "yorkshire and the humber";
  if (code.startsWith("UKF")) return "east midlands";
  if (code.startsWith("UKG")) return "west midlands";
  if (code.startsWith("UKH")) return "east of england";
  if (code.startsWith("UKI")) return "london";
  if (code.startsWith("UKJ")) return "south east england";
  if (code.startsWith("UKK")) return "south west england";
  if (code.startsWith("UKL")) return "wales";
  if (code.startsWith("UKM")) return "scotland";
  if (code.startsWith("UKN")) return "northern ireland";
  const lower = trimmed.toLowerCase();
  if (lower === "north east") return "north east england";
  if (lower === "north west") return "north west england";
  if (lower === "south east") return "south east england";
  if (lower === "south west") return "south west england";
  return lower;
}

function normalizePostcode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}
function numberOrNull(value: unknown) { const parsed = Number(value); return value !== null && value !== undefined && Number.isFinite(parsed) ? parsed : null; }
function stringOrNull(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
