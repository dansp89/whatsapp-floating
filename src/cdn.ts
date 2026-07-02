/**
 * CDN-only entry point. Unlike index.ts (the npm/ESM/CJS entry, which uses
 * `export default` for bundler consumers), this file performs the global
 * `window.WhatsAppFloating` assignment directly and exports nothing — so
 * tsup's IIFE wrapper has no module exports object to clobber that
 * assignment with.
 */
import api, { boot } from "./index";

if (typeof window !== "undefined") {
    window.WhatsAppFloating = api;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
}
