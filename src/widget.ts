import type {
    EventName,
    ImagesConfig,
    MatchContext,
    PhoneMatchResult,
    ResolvedLocation,
    WhatsAppFloatingConfig,
} from "./types";
import { getBrowserLanguage, getContinent, getQueryParams, getStorage, isMobile, log, merge } from "./utils";
import { fetchGeoLocation } from "./geo";
import { resolvePhone } from "./rules";
import { trackEvent } from "./analytics";
import { DEFAULT_ICON_SVG, injectStyles } from "./styles";

const VERSION = "1.0.0";
const DEFAULT_DESKTOP_ASSET = "whatsapp-desktop.png";
const DEFAULT_MOBILE_ASSET = "whatsapp-mobile.png";

type Listener = (detail: unknown) => void;

export class WhatsAppFloatingWidget {
    private config: WhatsAppFloatingConfig | null = null;
    private location: ResolvedLocation = { country: null, state: null, city: null };
    private phone: string | null = null;
    private matched: PhoneMatchResult["matched"] | null = null;
    private el: HTMLAnchorElement | null = null;
    private ready = false;
    private listeners: Partial<Record<EventName, Listener[]>> = {};
    private geoPromise: Promise<PhoneMatchResult | null> | null = null;
    /** Rule-driven image override (from a matching pathRule/rule). */
    private ruleImages: ImagesConfig | undefined;
    /** Explicit programmatic override set via setImages(), takes precedence over everything. */
    private manualImages: ImagesConfig | undefined;

    private emit(name: EventName, detail: unknown): void {
        const config = this.config;
        const handlerName = ("on" + name.charAt(0).toUpperCase() + name.slice(1)) as keyof WhatsAppFloatingConfig;

        try {
            const handler = config?.[handlerName];
            if (typeof handler === "function") {
                (handler as (payload: unknown) => void)(detail);
            }
        } catch (e) {
            log(config, "error", `Error in ${String(handlerName)} handler`, e);
        }

        const handlers = this.listeners[name] || [];
        for (const fn of handlers) {
            try {
                fn(detail);
            } catch (e) {
                log(config, "error", `Error in listener for ${name}`, e);
            }
        }

        try {
            document.dispatchEvent(new CustomEvent(`whatsappfloating:${name}`, { detail }));
        } catch {
            /* CustomEvent unsupported — ignore */
        }
    }

    on(name: EventName, fn: Listener): this {
        if (!this.listeners[name]) this.listeners[name] = [];
        this.listeners[name]?.push(fn);
        return this;
    }

    off(name: EventName, fn: Listener): this {
        const arr = this.listeners[name];
        if (!arr) return this;
        this.listeners[name] = arr.filter((f) => f !== fn);
        return this;
    }

    private buildContext(): MatchContext {
        const qs = getQueryParams();
        const utm: Record<string, string> = {};
        for (const key in qs) {
            if (/^utm_/i.test(key)) utm[key] = qs[key] as string;
        }

        return {
            language: getBrowserLanguage(),
            referrer: document.referrer || "",
            domain: window.location.hostname || "",
            page: window.location.pathname || "",
            utm,
            query: qs,
            cookies: document.cookie,
            localStorage: getStorage("localStorage"),
            sessionStorage: getStorage("sessionStorage"),
            continent: null,
        };
    }

    async init(userConfig: WhatsAppFloatingConfig): Promise<PhoneMatchResult | null> {
        const defaultConfig: WhatsAppFloatingConfig = {
            debug: false,
            production: true,
            mobileBreakpoint: 768,
            cacheLocation: true,
            analytics: true,
            lazyLoad: false,
        };

        let config = merge(defaultConfig, userConfig || {});
        this.config = config;

        config = await this.loadRemoteConfig(config);
        this.config = config;

        const start = async (): Promise<PhoneMatchResult> => {
            const ctx = this.buildContext();

            const location = await fetchGeoLocation(config);
            this.location = location;
            ctx.continent = getContinent(location.country);

            this.emit("location", location);

            const result = resolvePhone(config, location, ctx);
            this.phone = result.phone;
            this.matched = result.matched;
            this.ruleImages = result.images;

            this.printConsole(location, result);
            this.emit("phoneSelected", { phone: result.phone, matched: result.matched });

            this.render();
            this.ready = true;
            this.emit("ready", { phone: this.phone, location: this.location, matched: this.matched });

            return result;
        };

        if (config.lazyLoad) {
            this.geoPromise = new Promise((resolve) => {
                if (document.readyState === "complete") {
                    setTimeout(() => start().then(resolve), 0);
                } else {
                    window.addEventListener("load", () => start().then(resolve));
                }
            });
            return null;
        }

        this.geoPromise = start();
        return this.geoPromise;
    }

    private async loadRemoteConfig(config: WhatsAppFloatingConfig): Promise<WhatsAppFloatingConfig> {
        if (!config.remoteConfigUrl) return config;
        try {
            const res = await fetch(config.remoteConfigUrl);
            const remote = (await res.json()) as Partial<WhatsAppFloatingConfig>;
            return merge(config, remote);
        } catch (err) {
            log(config, "warn", "Failed to load remote config", err);
            return config;
        }
    }

    private printConsole(location: ResolvedLocation, result: PhoneMatchResult): void {
        const config = this.config;
        if (!config || (config.production && !config.debug)) return;

        console.log(
            "%c[WhatsAppFloating]%c\n" +
                `Country: ${location.country || "-"}\n` +
                `State: ${location.state || "-"}\n` +
                `City: ${location.city || "-"}\n` +
                `Matched: ${result.matched}\n` +
                `Phone: ${result.phone || "-"}`,
            "color:#25D366;font-weight:bold;",
            "color:inherit;"
        );
    }

    private resolveImages(): ImagesConfig {
        const config = this.config;
        if (!config) return {};

        const defaultBase = config.assetsBaseUrl ? config.assetsBaseUrl.replace(/\/+$/, "") : "";
        const defaults: ImagesConfig = defaultBase
            ? { desktop: `${defaultBase}/${DEFAULT_DESKTOP_ASSET}`, mobile: `${defaultBase}/${DEFAULT_MOBILE_ASSET}` }
            : {};

        // Precedence: manual override > rule/pathRule override > explicit config.images > defaults
        return {
            desktop:
                this.manualImages?.desktop ||
                this.ruleImages?.desktop ||
                config.images?.desktop ||
                defaults.desktop,
            mobile:
                this.manualImages?.mobile ||
                this.ruleImages?.mobile ||
                config.images?.mobile ||
                defaults.mobile,
        };
    }

    private resolveImage(): string | undefined {
        const config = this.config;
        if (!config) return undefined;
        const images = this.resolveImages();
        const mobile = isMobile(config);
        return mobile ? images.mobile || images.desktop : images.desktop || images.mobile;
    }

    private buildLink(): string {
        const config = this.config;
        const phone = (this.phone || "").replace(/\D/g, "");
        const message = config?.message || "";
        let utmSuffix = "";

        if (config?.appendUtmToMessage) {
            const ctx = this.buildContext();
            const parts = Object.keys(ctx.utm).map((k) => `${k}=${ctx.utm[k]}`);
            if (parts.length) utmSuffix = ` [${parts.join(", ")}]`;
        }

        return `https://wa.me/${phone}?text=${encodeURIComponent(message + utmSuffix)}`;
    }

    private preloadImage(url: string): void {
        try {
            if (document.querySelector(`link[rel="preload"][href="${url}"]`)) return;
            const link = document.createElement("link");
            link.rel = "preload";
            link.as = "image";
            link.href = url;
            document.head.appendChild(link);
        } catch {
            /* preload is a perf optimization only — safe to skip on failure */
        }
    }

    private render(): void {
        const config = this.config;
        if (!config) return;

        if (!this.phone) {
            log(config, "warn", "No phone number resolved; button will not be rendered");
            return;
        }

        this.destroy(true);
        injectStyles(config);

        const imageUrl = this.resolveImage();
        if (imageUrl) this.preloadImage(imageUrl);

        const link = document.createElement("a");
        link.className = "wa-floating-btn";
        link.setAttribute("href", this.buildLink());
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
        link.setAttribute("aria-label", config.ariaLabel || "WhatsApp");

        if (imageUrl) {
            const img = document.createElement("img");
            // The button image is always above the fold and must appear
            // immediately — eager + async decoding avoids both a blank
            // button (lazy) and a main-thread decode stall (sync decoding).
            img.loading = "eager";
            img.decoding = "async";
            img.fetchPriority = "high";
            img.alt = config.imageAlt || "WhatsApp";
            img.src = imageUrl;
            link.appendChild(img);
        } else {
            link.innerHTML = config.icon || DEFAULT_ICON_SVG;
        }

        link.addEventListener("click", () => {
            this.emit("open", { phone: this.phone });
            trackEvent(config, "open", { phone: this.phone, matched: this.matched });
        });

        document.body.appendChild(link);
        this.el = link;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.el?.classList.add("wa-floating-visible");
            });
        });

        trackEvent(config, "render", { phone: this.phone, matched: this.matched });
    }

    reload(newConfig?: Partial<WhatsAppFloatingConfig>): Promise<PhoneMatchResult | null> {
        const config = newConfig && this.config ? merge(this.config, newConfig) : this.config;
        return this.init(config as WhatsAppFloatingConfig);
    }

    open(): this {
        if (!this.phone) {
            log(this.config, "warn", "Cannot open: no phone resolved yet");
            return this;
        }
        const url = this.buildLink();
        window.open(url, "_blank", "noopener,noreferrer");
        this.emit("open", { phone: this.phone });
        if (this.config) trackEvent(this.config, "open", { phone: this.phone, matched: this.matched });
        return this;
    }

    close(): this {
        this.el?.classList.remove("wa-floating-visible");
        this.emit("close", { phone: this.phone });
        return this;
    }

    destroy(silent = false): this {
        if (this.el?.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        this.el = null;
        if (!silent) this.ready = false;
        return this;
    }

    setPhone(phone: string): this {
        this.phone = phone;
        this.matched = "Manual";
        if (this.el) this.render();
        this.emit("phoneSelected", { phone, matched: "Manual" });
        return this;
    }

    /** Programmatically override the desktop/mobile images, taking precedence over config and rules. */
    setImages(images: ImagesConfig): this {
        this.manualImages = { ...this.manualImages, ...images };
        if (this.el) this.render();
        return this;
    }

    getImages(): ImagesConfig {
        return this.resolveImages();
    }

    getPhone(): string | null {
        return this.phone;
    }

    getLocation(): ResolvedLocation {
        return this.location;
    }

    getMatched(): PhoneMatchResult["matched"] | null {
        return this.matched;
    }

    isReady(): boolean {
        return this.ready;
    }

    getVersion(): string {
        return VERSION;
    }
}

export { VERSION };
