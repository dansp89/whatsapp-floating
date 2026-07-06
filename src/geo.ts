import type { ResolvedLocation, WhatsAppFloatingConfig } from "./types";
import { getStorage, log, safeJSONParse } from "./utils";

const GEO_CACHE_KEY = "__wa_floating_geo_cache__";
const GEO_CACHE_TTL = 1000 * 60 * 60 * 6; // 6h
const EMPTY_LOCATION: ResolvedLocation = { country: null, state: null, city: null };

type GeoProviderParser = (data: Record<string, unknown>) => ResolvedLocation;
type GeoProviderIpParser = (data: Record<string, unknown>) => string | null;

interface GeoProvider {
    name: string;
    url: string;
    parse: GeoProviderParser;
    /** Extracts the visitor's own IP from the response, used to detect network/VPN changes for cache invalidation. Defaults to the common `ip`/`query` fields when omitted. */
    parseIp?: GeoProviderIpParser;
}

function str(val: unknown): string | null {
    return typeof val === "string" && val.length > 0 ? val : null;
}

const defaultParseIp: GeoProviderIpParser = (data) =>
    str(data.ip) ?? str(data.query) ?? str((data as { ip_address?: string }).ip_address);

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
    {
        name: "ip.oxylabs.io",
        url: "https://ip.oxylabs.io/location",
        // Aggregates several sub-providers (maxmind, dbip, ip2location, ipinfo)
        // keyed under `providers`; none of them expose a state/region field,
        // only country + city. `maxmind` is preferred for completeness.
        parse: (data) => {
            const providers = (data as { providers?: Record<string, { country?: string; city?: string }> }).providers;
            const preferred = providers && (providers.maxmind ?? providers.dbip ?? providers.ip2location ?? providers.ipinfo);
            return {
                country: str(preferred?.country),
                state: null,
                city: str(preferred?.city),
            };
        },
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

interface ProviderResult {
    location: ResolvedLocation;
    ip: string | null;
}

async function tryProvider(provider: GeoProvider, timeout: number, config: WhatsAppFloatingConfig): Promise<ProviderResult | null> {
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
        const ip = (provider.parseIp ?? defaultParseIp)(data);
        log(config, "info", `Geo provider ${provider.name} succeeded`, location);
        return { location, ip };
    } catch (err) {
        log(config, "warn", `Geo provider ${provider.name} failed`, err);
        return null;
    }
}

interface GeoCacheEntry {
    timestamp: number;
    ip: string | null;
    data: ResolvedLocation;
}

function readGeoCache(config: WhatsAppFloatingConfig): GeoCacheEntry | null {
    const storage = getStorage("localStorage");
    if (!storage) return null;
    const raw = storage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = safeJSONParse<GeoCacheEntry | null>(raw, null);
    if (!parsed || !parsed.timestamp || !parsed.data) return null;
    const ttl = config.geoCacheTTL != null ? config.geoCacheTTL : GEO_CACHE_TTL;
    if (ttl > 0 && Date.now() - parsed.timestamp > ttl) return null;
    return parsed;
}

function writeGeoCache(data: ResolvedLocation, ip: string | null): void {
    const storage = getStorage("localStorage");
    if (!storage) return;
    storage.setItem(GEO_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), ip, data }));
}

/**
 * Resolves the visitor's location. Order of precedence:
 * 1. Manual override (config.location)
 * 2. Cached result (localStorage, subject to TTL) — only when cacheLocation is explicitly
 *    true, and only if the visitor's IP still matches the one stored alongside the cache
 * 3. Provider chain — tries each geolocation API in order until one works
 * 4. Empty location (all null) if every provider fails
 *
 * Resolves in real time on every call by default (cacheLocation defaults to
 * false). When caching is enabled, a provider is still queried on every call
 * to read the current IP (each provider response already includes it, so this
 * costs no extra request) — if it matches the cached IP, the cached location
 * data is reused as-is; if it changed (e.g. VPN/network switch), the freshly
 * fetched location replaces the cache.
 */
export async function fetchGeoLocation(config: WhatsAppFloatingConfig): Promise<ResolvedLocation> {
    if (config.location && (config.location.country || config.location.city || config.location.state)) {
        return {
            country: config.location.country ?? null,
            state: config.location.state ?? config.location.region ?? null,
            city: config.location.city ?? null,
        };
    }

    const cacheEnabled = config.cacheLocation === true;
    const cached = cacheEnabled ? readGeoCache(config) : null;

    const providers = resolveProviders(config);
    const timeout = config.geoTimeout || 5000;

    for (const provider of providers) {
        const result = await tryProvider(provider, timeout, config);
        if (result) {
            if (cached && cached.ip && result.ip && cached.ip === result.ip) {
                log(config, "info", "IP unchanged, reusing cached geolocation", cached.data);
                return cached.data;
            }
            if (cacheEnabled) writeGeoCache(result.location, result.ip);
            return result.location;
        }
    }

    if (cached) {
        log(config, "warn", "All geolocation providers failed, falling back to stale cache", cached.data);
        return cached.data;
    }

    log(config, "error", "All geolocation providers failed");
    return EMPTY_LOCATION;
}
