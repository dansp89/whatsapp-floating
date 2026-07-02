export interface ImagesConfig {
    desktop?: string;
    mobile?: string;
}

export interface WeightedNumber {
    phone: string;
    weight?: number;
}

export type DistributionStrategy = "random" | "roundrobin" | "round-robin" | "round_robin" | "weighted";

export interface ScheduleConfig {
    /** e.g. ["monday", "tuesday", "wednesday", "thursday", "friday"] */
    days?: string[];
    hours?: {
        /** "HH:MM" 24h format, local time */
        start: string;
        end: string;
    };
    /** IANA timezone, e.g. "America/Manaus". If omitted, uses browser local time. */
    timezone?: string;
}

export interface UtmMatch {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
    [key: string]: string | undefined;
}

export interface RuleConfig {
    country?: string;
    state?: string;
    city?: string;
    cities?: string[];

    /** Single fixed phone number for this rule */
    phone?: string;
    /** Multiple numbers for distribution strategies */
    numbers?: WeightedNumber[];
    distribution?: DistributionStrategy;

    /** Override the button image(s) when this rule matches */
    images?: ImagesConfig;

    schedule?: ScheduleConfig;
    utm?: UtmMatch;
    language?: string;
    referrer?: string;
    domain?: string;
    page?: string;
    continent?: string;

    [key: string]: unknown;
}

/**
 * Rules matched against the current URL path (e.g. "/promocao"), evaluated
 * BEFORE location-based rules. The first matching rule wins and its `phone`
 * / `images` override whatever location-based resolution would have picked.
 * A rule that omits `phone` still lets location rules decide the number,
 * while its `images` override still applies (or vice-versa).
 */
export interface PathRuleConfig {
    /** Substring or path the current pathname must contain. */
    path?: string;
    /** Regular expression (as string, no slashes) tested against the pathname. */
    pathRegex?: string;

    phone?: string;
    numbers?: WeightedNumber[];
    distribution?: DistributionStrategy;

    images?: ImagesConfig;

    schedule?: ScheduleConfig;
    utm?: UtmMatch;
}

export interface FallbackConfig {
    phone?: string;
    numbers?: WeightedNumber[];
    distribution?: DistributionStrategy;
}

export interface ThemeConfig {
    dark?: boolean;
    [key: string]: unknown;
}

/** Number = pixels. String accepts any valid CSS length, e.g. "5%", "2rem", "16px". */
export type CssOffset = number | string;

export type PositionKeyword = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface OffsetConfig {
    top?: CssOffset;
    bottom?: CssOffset;
    left?: CssOffset;
    right?: CssOffset;
}

export interface LocationOverride {
    country?: string;
    state?: string;
    region?: string;
    city?: string;
}

export interface ResolvedLocation {
    country: string | null;
    state: string | null;
    city: string | null;
}

export type MatchLevel = "Path" | "Cidade" | "Estado" | "País" | "Fallback" | "Manual";

export interface PhoneMatchResult {
    phone: string | null;
    matched: MatchLevel;
    rule: RuleConfig | FallbackConfig | PathRuleConfig | null;
    /** Image override carried by a matching path rule, applied on top of the resolved images. */
    images?: ImagesConfig;
}

export interface MatchContext {
    language: string;
    referrer: string;
    domain: string;
    page: string;
    utm: Record<string, string>;
    query: Record<string, string>;
    cookies: string;
    localStorage: Storage | null;
    sessionStorage: Storage | null;
    continent: string | null;
}

export interface ReadyEventPayload {
    phone: string | null;
    location: ResolvedLocation;
    matched: PhoneMatchResult["matched"];
}

export interface LocationEventPayload extends ResolvedLocation {}

export interface PhoneSelectedEventPayload {
    phone: string | null;
    matched: PhoneMatchResult["matched"];
}

export interface OpenEventPayload {
    phone: string | null;
}

export interface CloseEventPayload {
    phone: string | null;
}

export interface WhatsAppFloatingConfig {
    message?: string;
    /**
     * Explicit image URLs. When omitted, defaults to
     * `${assetsBaseUrl}/whatsapp-desktop.png` and `${assetsBaseUrl}/whatsapp-mobile.png`.
     * Can always be overridden programmatically via `WhatsAppFloating.setImages()`.
     */
    images?: ImagesConfig;
    /**
     * Base URL used to build the default PNG asset paths
     * (`whatsapp-desktop.png` / `whatsapp-mobile.png`) when `images` is not set.
     */
    assetsBaseUrl?: string;
    icon?: string;
    ariaLabel?: string;
    imageAlt?: string;

    fallback?: FallbackConfig;
    rules?: RuleConfig[];
    /**
     * Rules matched against the current URL path, evaluated before
     * location-based rules. First match wins and overrides phone/images.
     */
    pathRules?: PathRuleConfig[];

    /** Manually override detected location instead of calling the geo API */
    location?: LocationOverride;

    geoApiUrl?: string;
    /** Extra endpoints to try, in order, before giving up. Built-in providers are used if omitted. */
    geoProviders?: string[];
    geoTimeout?: number;
    cacheLocation?: boolean;
    geoCacheTTL?: number;

    remoteConfigUrl?: string;

    /** Viewport width (px) at or below which the mobile image/logic is used. */
    mobileBreakpoint?: number;
    /**
     * Corner the button is anchored to. Defaults to "bottom-right".
     * Fine-tune the exact distance from that corner with `offset`.
     */
    position?: PositionKeyword;
    /** Distance from the anchored corner(s). Accepts px (number) or any CSS length ("5%", "2rem"). */
    offset?: OffsetConfig;
    zIndex?: number;
    theme?: ThemeConfig;
    css?: string;

    appendUtmToMessage?: boolean;
    analytics?: boolean;

    lazyLoad?: boolean;
    debug?: boolean;
    production?: boolean;

    onReady?: (payload: ReadyEventPayload) => void;
    onLocation?: (payload: LocationEventPayload) => void;
    onPhoneSelected?: (payload: PhoneSelectedEventPayload) => void;
    onOpen?: (payload: OpenEventPayload) => void;
    onClose?: (payload: CloseEventPayload) => void;

    [key: string]: unknown;
}

export type EventName = "ready" | "location" | "phoneSelected" | "open" | "close";

declare global {
    interface Window {
        WhatsAppFloatingConfig?: WhatsAppFloatingConfig;
        WhatsAppFloating?: unknown;
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
        fbq?: (...args: unknown[]) => void;
    }
}
