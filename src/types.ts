import type { IconVariantKey } from "./icons";

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

export interface PulseConfig {
    /** Icon "breathing" scale animation. Defaults to `true` whenever `theme.pulse` is set at all. */
    scale?: boolean;
    /** Colored expanding ring/halo around the button. Off by default. */
    ring?: boolean;
    /** Animation cycle length, in ms. Default `1800`. */
    duration?: number;
    /** Peak scale factor for the breathing effect. Default `1.08`. */
    scaleAmount?: number;
    /** Ring color. Default `"#25D366"`. */
    color?: string;
    /** Ring starting opacity. Default `0.55`. */
    opacity?: number;
}

export interface ThemeConfig {
    dark?: boolean;
    /** Adds a drop shadow behind the button image. Off by default — most images (banners, custom icons) already have their own design. */
    shadow?: boolean;
    /** Rounds the button image's corners. Off by default, for the same reason as `shadow`. */
    rounded?: boolean;
    /**
     * Makes the button pulse to draw attention. `true` enables the icon
     * scale/"breathing" animation with default timing (equivalent to
     * `{ scale: true }`). Pass a `PulseConfig` object to also enable the
     * ring/halo effect or tune duration, scale amount, color and opacity.
     */
    pulse?: boolean | PulseConfig;
    /**
     * Icon/image height on desktop. Accepts px (number) or any CSS length.
     * Always has a sane default (`64px`) and is always responsive — see `iconSizeMobile`.
     */
    iconSize?: CssOffset;
    /** Icon/image height at/below `mobileBreakpoint`. Defaults to `56px`, or to `iconSize` if you only want one fixed size everywhere. */
    iconSizeMobile?: CssOffset;
    [key: string]: unknown;
}

/**
 * Renders a pill-shaped button — an icon plus a text label — instead of an
 * image or bare icon. Picking `pill` is an exclusive button style: when
 * present, `images`/`assetsBaseUrl`/`icon`/`iconVariant` at the top level
 * are ignored entirely (use `pill.icon` to choose the icon shown inside it).
 */
export interface PillConfig {
    text: string;
    /**
     * How the text label expands relative to the icon:
     * - `"hover"` (default) — expands on mouse hover, collapses back to icon-only otherwise.
     * - `"always"` — always expanded.
     * - `"click"` — first click/tap expands it; the next click opens WhatsApp.
     * - `"never"` — stays icon-only; the text is still set as the accessible label.
     */
    expand?: "hover" | "always" | "click" | "never";
    /**
     * Override `expand` on mobile (at/below `mobileBreakpoint`).
     * Useful for "hover on desktop, always on mobile" patterns.
     * Falls back to `expand` when not set.
     */
    expandMobile?: "hover" | "always" | "click" | "never";
    /** Icon shown inside the pill. Defaults to the `"solid"` built-in variant. */
    icon?: IconVariantKey | (string & {});
    /** Pill background color. Defaults to `"#25D366"` (WhatsApp green). */
    color?: string;
    /** Pill text color. Defaults to `"#ffffff"`. */
    textColor?: string;
    /** Font size of the label in px. Defaults to `14`. */
    fontSize?: number;
    /** Font weight. Defaults to `600`. */
    fontWeight?: number | string;
    /** Extra horizontal padding between icon and text right edge, in px. Defaults to `18`. */
    paddingRight?: number;
    /** Border radius of the pill in px. Defaults to `999` (fully rounded). */
    borderRadius?: number;
}

/** Number = pixels. String accepts any valid CSS length, e.g. "5%", "2rem", "16px". */
export type CssOffset = number | string;

export type PositionKeyword = "bottom-right" | "bottom-left" | "top-right" | "top-left" | "custom";

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
    /** Built-in icon to use instead of `icon`/an image. See `PillConfig.icon` for the same choices used inside a pill. Ignored when `images`/`assetsBaseUrl` resolve to a URL, and when `pill` is set. */
    iconVariant?: IconVariantKey | (string & {});
    /** Renders a pill-shaped icon+text button instead of an image/icon. Exclusive of `images`/`icon`/`iconVariant`. */
    pill?: PillConfig;
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
    /** Cache the resolved location in localStorage. Default: false (always resolves in real time). */
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
