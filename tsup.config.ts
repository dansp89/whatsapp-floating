import { defineConfig } from "tsup";

export default defineConfig([
    // Global IIFE build for <script src="..."> / CDN usage (minified).
    // Uses src/cdn.ts (no module exports) so the IIFE wrapper's implicit
    // `return <exports>` never overwrites the manual `window.WhatsAppFloating`
    // assignment performed inside that entry file.
    {
        entry: { "whatsapp-floating.min": "src/cdn.ts" },
        format: ["iife"],
        platform: "browser",
        target: "es2017",
        minify: true,
        sourcemap: true,
        dts: false,
        clean: true,
        outDir: "dist",
        outExtension: () => ({ js: ".js" }),
        footer: {
            js: "// WhatsApp Floating — https://github.com/dansp89/whatsapp-floating",
        },
    },
    // Unminified IIFE for debugging
    {
        entry: { "whatsapp-floating.global": "src/cdn.ts" },
        format: ["iife"],
        platform: "browser",
        target: "es2017",
        minify: false,
        sourcemap: false,
        dts: false,
        clean: false,
        outDir: "dist",
        outExtension: () => ({ js: ".js" }),
    },
    // ESM + CJS for bundlers / npm consumers, with type declarations
    {
        entry: { "whatsapp-floating.esm": "src/index.ts" },
        format: ["esm"],
        platform: "neutral",
        target: "es2017",
        minify: false,
        sourcemap: true,
        dts: { resolve: true },
        clean: false,
        outDir: "dist",
        outExtension: () => ({ js: ".js", dts: ".d.ts" }),
    },
    {
        entry: { "whatsapp-floating.cjs": "src/index.ts" },
        format: ["cjs"],
        platform: "node",
        target: "es2017",
        minify: false,
        sourcemap: true,
        dts: false,
        clean: false,
        outDir: "dist",
        outExtension: () => ({ js: ".js" }),
    },
]);
