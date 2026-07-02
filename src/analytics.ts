import type { WhatsAppFloatingConfig } from "./types";
import { log } from "./utils";

export function trackEvent(config: WhatsAppFloatingConfig, eventName: string, payload: Record<string, unknown>): void {
    try {
        if (config.analytics === false) return;

        if (typeof window.gtag === "function") {
            window.gtag("event", eventName, payload);
        }

        if (window.dataLayer && typeof window.dataLayer.push === "function") {
            window.dataLayer.push({ event: "whatsapp_floating_" + eventName, ...payload });
        }

        if (typeof window.fbq === "function") {
            window.fbq("trackCustom", "WhatsAppFloating_" + eventName, payload);
        }
    } catch (e) {
        log(config, "warn", "Analytics tracking failed", e);
    }
}
