/**
 * Tests for injectStyles() CSS generation.
 * Bun runs in Node without a real DOM, so we patch document.getElementById /
 * document.createElement / document.head minimally — enough for the CSS
 * injection path to run.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import type { WhatsAppFloatingConfig } from "../src/types";

// ── minimal DOM shim ──────────────────────────────────────────────────────────
let injectedCSS = "";

const fakeStyle = {
    id: "wa-floating-styles",
    type: "text/css",
    set textContent(v: string) { injectedCSS = v; },
    get textContent() { return injectedCSS; },
};

function shimDOM() {
    injectedCSS = "";
    (globalThis as any).document = {
        getElementById: (_id: string) => null,
        createElement: (_tag: string) => fakeStyle,
        head: { appendChild: () => {} },
    };
}

// ── helpers ───────────────────────────────────────────────────────────────────
function getCSS(config: WhatsAppFloatingConfig): string {
    shimDOM();
    // import after shimming so the module sees document
    const { injectStyles } = require("../src/styles");
    injectStyles(config);
    return injectedCSS;
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe("injectStyles — pill default colors", () => {
    it("uses #25D366 as default background", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain("background:#25D366");
    });

    it("uses white as default text color", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain("color:#ffffff");
    });

    it("uses 14px as default font size", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain("14px");
    });

    it("uses 600 as default font weight", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain("600 14px");
    });

    it("uses 18px as default padding-right", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain("padding-right:18px");
    });

    it("uses 999px as default border-radius", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain("border-radius:999px");
    });
});

describe("injectStyles — pill custom colors", () => {
    it("uses custom background color", () => {
        const css = getCSS({
            pill: { text: "Chat", color: "#128C7E" },
            fallback: { phone: "0" },
        });
        expect(css).toContain("background:#128C7E");
        expect(css).not.toContain("background:#25D366");
    });

    it("uses custom text color", () => {
        const css = getCSS({
            pill: { text: "Chat", textColor: "#1a1a1a" },
            fallback: { phone: "0" },
        });
        expect(css).toContain("color:#1a1a1a");
    });

    it("uses custom font size", () => {
        const css = getCSS({
            pill: { text: "Chat", fontSize: 18 },
            fallback: { phone: "0" },
        });
        expect(css).toContain("18px");
    });

    it("uses custom font weight", () => {
        const css = getCSS({
            pill: { text: "Chat", fontWeight: 400 },
            fallback: { phone: "0" },
        });
        expect(css).toContain("400 ");
    });

    it("uses custom padding-right", () => {
        const css = getCSS({
            pill: { text: "Chat", paddingRight: 32 },
            fallback: { phone: "0" },
        });
        expect(css).toContain("padding-right:32px");
    });

    it("uses custom border-radius", () => {
        const css = getCSS({
            pill: { text: "Chat", borderRadius: 8 },
            fallback: { phone: "0" },
        });
        expect(css).toContain("border-radius:8px");
    });

    it("borderRadius:0 produces a square pill", () => {
        const css = getCSS({
            pill: { text: "Chat", borderRadius: 0 },
            fallback: { phone: "0" },
        });
        expect(css).toContain("border-radius:0px");
    });
});

describe("injectStyles — pill expand behavior", () => {
    it("hover: adds :hover selector", () => {
        const css = getCSS({ pill: { text: "Chat", expand: "hover" }, fallback: { phone: "0" } });
        expect(css).toContain(":hover");
    });

    it("always: max-width is expanded immediately without hover trigger", () => {
        const css = getCSS({ pill: { text: "Chat", expand: "always" }, fallback: { phone: "0" } });
        expect(css).toContain("max-width:320px");
        // "always" must NOT use a :hover rule for the expand itself
        expect(css).not.toContain(".wa-floating-pill:hover{max-width");
    });

    it("never: no expand selector injected", () => {
        const css = getCSS({ pill: { text: "Chat", expand: "never" }, fallback: { phone: "0" } });
        expect(css).not.toContain(".wa-floating-pill:hover{max-width");
        expect(css).not.toContain("wa-floating-expanded");
    });

    it("click: uses wa-floating-expanded class", () => {
        const css = getCSS({ pill: { text: "Chat", expand: "click" }, fallback: { phone: "0" } });
        expect(css).toContain("wa-floating-expanded");
    });
});

describe("injectStyles — position", () => {
    it("bottom-right is the default corner", () => {
        const css = getCSS({ fallback: { phone: "0" } });
        expect(css).toContain("bottom:25px");
        expect(css).toContain("right:25px");
    });

    it("bottom-left applies bottom and left", () => {
        const css = getCSS({ position: "bottom-left", fallback: { phone: "0" } });
        expect(css).toContain("bottom:25px");
        expect(css).toContain("left:25px");
    });

    it("custom offset with explicit sides", () => {
        const css = getCSS({
            position: "custom",
            offset: { top: 10, right: 20 },
            fallback: { phone: "0" },
        });
        expect(css).toContain("top:10px");
        expect(css).toContain("right:20px");
    });

    it("custom is the only way to anchor to the top", () => {
        const css = getCSS({
            position: "custom",
            offset: { top: 10, left: 20 },
            fallback: { phone: "0" },
        });
        expect(css).toContain("top:10px");
        expect(css).toContain("left:20px");
    });
});

describe("injectStyles — pulse", () => {
    it("scale animation is injected when pulse.scale is true", () => {
        const css = getCSS({
            theme: { pulse: { scale: true } },
            fallback: { phone: "0" },
        });
        expect(css).toContain("wa-floating-pulse");
    });

    it("ring animation is injected when pulse.ring is true", () => {
        const css = getCSS({
            theme: { pulse: { ring: true } },
            fallback: { phone: "0" },
        });
        expect(css).toContain("wa-floating-ring");
    });

    it("scale defaults to true when pulse is an object without an explicit `scale` key", () => {
        // Regression test: `scale` must default to true whenever `pulse` is
        // set at all (matching the README), not just via the `pulse: true`
        // shorthand — omitting `scale` in object form previously left the
        // breathing animation silently disabled.
        const css = getCSS({
            theme: { pulse: { ring: true } },
            fallback: { phone: "0" },
        });
        expect(css).toContain("wa-floating-pulse");
        expect(css).toContain("wa-floating-ring");
    });

    it("scale:false explicitly disables the breathing animation", () => {
        const css = getCSS({
            theme: { pulse: { scale: false, ring: true } },
            fallback: { phone: "0" },
        });
        expect(css).not.toContain("@keyframes wa-floating-pulse");
        expect(css).toContain("wa-floating-ring");
    });

    it("no scale/ring animation at all when theme.pulse is unset", () => {
        const css = getCSS({ fallback: { phone: "0" } });
        expect(css).not.toContain("@keyframes wa-floating-pulse");
        expect(css).not.toContain("wa-floating-ring");
    });

    it("custom pulse color is used", () => {
        const css = getCSS({
            theme: { pulse: { ring: true, color: "#ff0000" } },
            fallback: { phone: "0" },
        });
        expect(css).toContain("#ff0000");
    });

    it("pulse:true shorthand injects scale animation", () => {
        const css = getCSS({
            theme: { pulse: true },
            fallback: { phone: "0" },
        });
        expect(css).toContain("wa-floating-pulse");
    });

    it("in pill mode, scale animates the pill-icon wrapper (the visible circle), not the inner svg", () => {
        // Regression test: the pill's visible "circle" is the
        // .wa-floating-pill-icon wrapper's background-color, not the SVG's
        // own circle path (which is made transparent in pill mode). Animating
        // only `.wa-floating-btn svg` made just the white glyph grow inside a
        // static-looking pill instead of the whole circle "breathing".
        const css = getCSS({
            pill: { text: "Chat" },
            theme: { pulse: { scale: true } },
            fallback: { phone: "0" },
        });
        expect(css).toContain(".wa-floating-pill-icon{animation:wa-floating-pulse");
        expect(css).toContain(".wa-floating-pill-icon svg{animation:none!important;}");
    });

    it("in pill mode, scale still defaults to true when pulse is an object without an explicit `scale` key", () => {
        const css = getCSS({
            pill: { text: "Chat" },
            theme: { pulse: { duration: 200, scaleAmount: 1.72 } },
            fallback: { phone: "0" },
        });
        expect(css).toContain(".wa-floating-pill-icon{animation:wa-floating-pulse");
        expect(css).toContain(".wa-floating-pill-icon svg{animation:none!important;}");
    });
});

describe("injectStyles — custom CSS appended", () => {
    it("appends config.css at the end", () => {
        const css = getCSS({
            css: ".custom { color: red; }",
            fallback: { phone: "0" },
        });
        expect(css.endsWith(".custom { color: red; }")).toBe(true);
    });
});

describe("injectStyles — pill icon rendering", () => {
    it("pill icon background (first child) is made transparent", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain(".wa-floating-pill-icon svg>:first-child{fill:transparent;}");
    });

    it("pill icon glyph path uses pill text color (default white)", () => {
        const css = getCSS({ pill: { text: "Chat" }, fallback: { phone: "0" } });
        expect(css).toContain(".wa-floating-pill-icon svg path:last-of-type{fill:#ffffff;}");
    });

    it("pill icon glyph path uses custom textColor", () => {
        const css = getCSS({ pill: { text: "Chat", textColor: "#222222" }, fallback: { phone: "0" } });
        expect(css).toContain(".wa-floating-pill-icon svg path:last-of-type{fill:#222222;}");
    });

    it("both icon CSS rules appear when pill is active", () => {
        const css = getCSS({ pill: { text: "Chat", color: "#128C7E", textColor: "#f0f0f0" }, fallback: { phone: "0" } });
        expect(css).toContain("fill:transparent");
        expect(css).toContain("fill:#f0f0f0");
    });

    it("icon CSS rules are NOT present when pill is not configured", () => {
        const css = getCSS({ fallback: { phone: "0" } });
        expect(css).not.toContain("wa-floating-pill-icon");
        expect(css).not.toContain("fill:transparent");
    });
});
