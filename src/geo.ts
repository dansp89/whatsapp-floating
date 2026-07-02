import type { ResolvedLocation, WhatsAppFloatingConfig } from "./types";
import { getStorage, log, safeJSONParse } from "./utils";

const GEO_CACHE_KEY = "__wa_floating_geo_cache__";
const GEO_CACHE_TTL = 1000 * 60 * 60 * 6; // 6h
const EMPTY_LOCATION: ResolvedLocation = { country: null, state: null, city: null };

type GeoProviderParser = (data: Record<string, unknown>) => ResolvedLocation;

interface GeoProvider {
    name: string;
    url: string;
    parse: GeoProviderParser;
}

function str(val: unknown): string | null {
    return typeof val === "string" && val.length > 0 ? val : null;
}

/**
 * Built-in provider chain. Each is tried in order until one returns usable
 * data; a single flaky/rate-limited provider must not take the widget down.
 */
// `state` prefers the short region CODE (e.g. "AM") over the full region
// NAME (e.g. "Amazonas") wherever the provider exposes both, since rule
// configs are written with short codes (see README examples). `normalize()`
// matching in rules.ts is still accent/case-insensitive as a second line of
// defense, but code-vs-name mismatches can't be fixed by normalization alone.
const BUILT_IN_PROVIDERS: GeoProvider[] = [
    {
        name: "ipapi.co",
        url: "https://ipapi.co/json/",
        parse: (data) => ({
            country: str(data.country) ?? str(data.country_code),
            state: str(data.region_code) ?? str(data.region),
            city: str(data.city),
        }),
    },
    {
        name: "ipwho.is",
        url: "https://ipwho.is/",
        parse: (data) => ({
            country: str(data.country_code) ?? str(data.country),
            state: str((data as { region_code?: string }).region_code) ?? str(data.region),
            city: str(data.city),
        }),
    },
    {
        name: "ip-api.com",
        // Note: free tier is HTTP-only; kept as a late fallback (see README).
        url: "http://ip-api.com/json/",
        parse: (data) => ({
            country: str(data.countryCode) ?? str(data.country),
            state: str(data.region) ?? str((data as { regionName?: string }).regionName),
            city: str(data.city),
        }),
    },
    {
        name: "ipinfo.io",
        url: "https://ipinfo.io/json",
        parse: (data) => ({
            country: str(data.country),
            state: str(data.region),
            city: str(data.city),
        }),
    },
];

function resolveProviders(config: WhatsAppFloatingConfig): GeoProvider[] {
    const providers = [...BUILT_IN_PROVIDERS];

    if (config.geoApiUrl) {
        providers.unshift({
            name: "custom:geoApiUrl",
            url: config.geoApiUrl,
            parse: (data) => ({
                country: str(data.country) ?? str(data.country_code) ?? str(data.countryCode),
                state: str(data.region) ?? str(data.region_code) ?? str(data.regionName) ?? str(data.state),
                city: str(data.city),
            }),
        });
    }

    if (config.geoProviders && config.geoProviders.length) {
        for (const url of config.geoProviders) {
            providers.push({
                name: "custom:" + url,
                url,
                parse: (data) => ({
                    country: str(data.country) ?? str(data.country_code) ?? str(data.countryCode),
                    state: str(data.region) ?? str(data.region_code) ?? str(data.regionName) ?? str(data.state),
                    city: str(data.city),
                }),
            });
        }
    }

    return providers;
}

function isUsable(location: ResolvedLocation): boolean {
    return !!(location.country || location.state || location.city);
}

function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    if (typeof AbortController === "undefined") {
        return fetch(url);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function tryProvider(provider: GeoProvider, timeout: number, config: WhatsAppFloatingConfig): Promise<ResolvedLocation | null> {
    try {
        const res = await fetchWithTimeout(provider.url, timeout);
        if (!res.ok) {
            log(config, "warn", `Geo provider ${provider.name} responded with status ${res.status}`);
            return null;
        }
        const data = (await res.json()) as Record<string, unknown>;
        const location = provider.parse(data);
        if (!isUsable(location)) {
            log(config, "warn", `Geo provider ${provider.name} returned no usable fields`);
            return null;
        }
        log(config, "info", `Geo provider ${provider.name} succeeded`, location);
        return location;
    } catch (err) {
        log(config, "warn", `Geo provider ${provider.name} failed`, err);
        return null;
    }
}

function readGeoCache(config: WhatsAppFloatingConfig): ResolvedLocation | null {
    const storage = getStorage("localStorage");
    if (!storage) return null;
    const raw = storage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = safeJSONParse<{ timestamp: number; data: ResolvedLocation } | null>(raw, null);
    if (!parsed || !parsed.timestamp || !parsed.data) return null;
    const ttl = config.geoCacheTTL != null ? config.geoCacheTTL : GEO_CACHE_TTL;
    if (ttl > 0 && Date.now() - parsed.timestamp > ttl) return null;
    return parsed.data;
}

function writeGeoCache(data: ResolvedLocation): void {
    const storage = getStorage("localStorage");
    if (!storage) return;
    storage.setItem(GEO_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
}

/**
 * Resolves the visitor's location. Order of precedence:
 * 1. Manual override (config.location)
 * 2. Cached result (localStorage, subject to TTL)
 * 3. Provider chain — tries each geolocation API in order until one works
 * 4. Empty location (all null) if every provider fails
 *
 * Guarantees exactly one HTTP round-trip on success (no repeated calls),
 * per the "1 chamada HTTP" requirement — the chain only makes additional
 * requests when a provider actually fails or times out.
 */
export async function fetchGeoLocation(config: WhatsAppFloatingConfig): Promise<ResolvedLocation> {
    if (config.location && (config.location.country || config.location.city || config.location.state)) {
        return {
            country: config.location.country ?? null,
            state: config.location.state ?? config.location.region ?? null,
            city: config.location.city ?? null,
        };
    }

    const cached = config.cacheLocation !== false ? readGeoCache(config) : null;
    if (cached) {
        log(config, "info", "Using cached geolocation", cached);
        return cached;
    }

    const providers = resolveProviders(config);
    const timeout = config.geoTimeout || 5000;

    for (const provider of providers) {
        const location = await tryProvider(provider, timeout, config);
        if (location) {
            if (config.cacheLocation !== false) writeGeoCache(location);
            return location;
        }
    }

    log(config, "error", "All geolocation providers failed");
    return EMPTY_LOCATION;
}
