import type { WhatsAppFloatingConfig } from "./types";

export function isObject(val: unknown): val is Record<string, unknown> {
    return val !== null && typeof val === "object" && !Array.isArray(val);
}

export function merge<T>(target: T, source: Partial<T>): T {
    const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    const src = source as Record<string, unknown>;
    for (const key in src) {
        if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
        const sourceVal = src[key];
        const targetVal = out[key];
        if (isObject(sourceVal) && isObject(targetVal)) {
            out[key] = merge(targetVal, sourceVal);
        } else {
            out[key] = sourceVal;
        }
    }
    return out as T;
}

export function log(
    config: WhatsAppFloatingConfig | null | undefined,
    level: "info" | "warn" | "error",
    ...args: unknown[]
): void {
    if (!config || !config.debug) return;
    const prefix = "[WhatsAppFloating]";
    if (level === "error") {
        console.error(prefix, ...args);
    } else if (level === "warn") {
        console.warn(prefix, ...args);
    } else {
        console.log(prefix, ...args);
    }
}

export function safeJSONParse<T>(str: string, fallback: T): T {
    try {
        return JSON.parse(str) as T;
    } catch {
        return fallback;
    }
}

export function getStorage(type: "localStorage" | "sessionStorage"): Storage | null {
    try {
        const storage = window[type];
        const testKey = "__wa_floating_test__";
        storage.setItem(testKey, "1");
        storage.removeItem(testKey);
        return storage;
    } catch {
        return null;
    }
}

export function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2] as string) : null;
}

export function setCookie(name: string, value: string, days?: number): void {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

export function getQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const search = window.location.search.replace(/^\?/, "");
    if (!search) return params;
    const pairs = search.split("&");
    for (const pair of pairs) {
        const [rawKey, rawValue] = pair.split("=");
        const key = decodeURIComponent(rawKey || "");
        const value = decodeURIComponent((rawValue || "").replace(/\+/g, " "));
        if (key) params[key] = value;
    }
    return params;
}

export function isMobile(config: WhatsAppFloatingConfig): boolean {
    const byWidth = window.innerWidth <= (config.mobileBreakpoint || 768);
    const byUrl = /\/mobile/i.test(window.location.pathname) || /\/mobile/i.test(window.location.href);
    return byWidth || byUrl;
}

export function isDarkMode(): boolean {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function getBrowserLanguage(): string {
    return (navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || "en").toLowerCase();
}

const CONTINENT_MAP: Record<string, string[]> = {
    AF: ["DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "CI", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW"],
    AS: ["AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CY", "GE", "IN", "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN", "YE"],
    EU: ["AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA"],
    NA: ["AG", "BS", "BB", "BZ", "CA", "CR", "CU", "DM", "DO", "SV", "GD", "GT", "HT", "HN", "JM", "MX", "NI", "PA", "KN", "LC", "VC", "TT", "US"],
    SA: ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"],
    OC: ["AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO", "TV", "VU"],
    AN: ["AQ"],
};

export function getContinent(countryCode: string | null): string | null {
    if (!countryCode) return null;
    for (const continent in CONTINENT_MAP) {
        if (CONTINENT_MAP[continent]?.indexOf(countryCode) !== -1) return continent;
    }
    return null;
}

export function normalize(str: unknown): string {
    return String(str ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();
}
