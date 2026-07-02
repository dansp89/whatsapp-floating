import type {
    EventName,
    ImagesConfig,
    PhoneMatchResult,
    ResolvedLocation,
    WhatsAppFloatingConfig,
} from "./types";
import { WhatsAppFloatingWidget, VERSION } from "./widget";

export type * from "./types";

const instance = new WhatsAppFloatingWidget();

export interface WhatsAppFloatingAPI {
    version: string;
    init(config: WhatsAppFloatingConfig): Promise<PhoneMatchResult | null>;
    reload(config?: Partial<WhatsAppFloatingConfig>): Promise<PhoneMatchResult | null>;
    open(): WhatsAppFloatingWidget;
    close(): WhatsAppFloatingWidget;
    destroy(): WhatsAppFloatingWidget;
    getPhone(): string | null;
    getLocation(): ResolvedLocation;
    getMatched(): PhoneMatchResult["matched"] | null;
    setPhone(phone: string): WhatsAppFloatingWidget;
    setImages(images: ImagesConfig): WhatsAppFloatingWidget;
    getImages(): ImagesConfig;
    isReady(): boolean;
    on(name: EventName, fn: (detail: unknown) => void): WhatsAppFloatingWidget;
    off(name: EventName, fn: (detail: unknown) => void): WhatsAppFloatingWidget;
}

const api: WhatsAppFloatingAPI = {
    version: VERSION,
    init: (config) => instance.init(config),
    reload: (config) => instance.reload(config),
    open: () => instance.open(),
    close: () => instance.close(),
    destroy: () => instance.destroy(),
    getPhone: () => instance.getPhone(),
    getLocation: () => instance.getLocation(),
    getMatched: () => instance.getMatched(),
    setPhone: (phone) => instance.setPhone(phone),
    setImages: (images) => instance.setImages(images),
    getImages: () => instance.getImages(),
    isReady: () => instance.isReady(),
    on: (name, fn) => instance.on(name, fn),
    off: (name, fn) => instance.off(name, fn),
};

export function boot(): void {
    if (typeof window === "undefined") return;
    if (window.WhatsAppFloatingConfig) {
        void instance.init(window.WhatsAppFloatingConfig);
    }
}

export default api;
