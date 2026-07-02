import type { CssOffset, PositionKeyword, WhatsAppFloatingConfig } from "./types";

const STYLE_ID = "wa-floating-styles";

function toCssLength(value: CssOffset | undefined, fallback: string): string {
    if (value == null) return fallback;
    return typeof value === "number" ? `${value}px` : value;
}

/**
 * Resolves the two CSS inset properties (e.g. "bottom" + "right") for a
 * given corner keyword, so the button can be anchored to any corner while
 * defaulting to bottom-right per spec.
 */
function resolveCorner(position: PositionKeyword, offset: WhatsAppFloatingConfig["offset"]): string {
    const DEFAULT_GAP = "16px";
    const o = offset || {};

    const vertical = position.indexOf("top") === 0 ? "top" : "bottom";
    const horizontal = position.indexOf("left") !== -1 ? "left" : "right";

    const verticalValue = toCssLength(o[vertical], DEFAULT_GAP);
    const horizontalValue = toCssLength(o[horizontal], DEFAULT_GAP);

    return `${vertical}:${verticalValue};${horizontal}:${horizontalValue};`;
}

export const DEFAULT_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">' +
    '<path fill="#25D366" d="M16 0C7.164 0 0 7.164 0 16c0 2.82.738 5.566 2.14 7.984L0 32l8.207-2.113A15.9 15.9 0 0 0 16 32c8.836 0 16-7.164 16-16S24.836 0 16 0z"/>' +
    '<path fill="#FFF" d="M25.144 22.63c-.4 1.13-1.99 2.07-3.25 2.34-.87.18-2 .33-5.8-1.24-4.86-2.02-7.99-6.94-8.23-7.26-.24-.32-1.97-2.62-1.97-5 0-2.38 1.24-3.55 1.68-4.03.44-.48.96-.6 1.28-.6.32 0 .64 0 .92.02.3.02.7-.11 1.09.83.4.96 1.36 3.34 1.48 3.58.12.24.2.52.04.84-.16.32-.24.52-.48.8-.24.28-.5.62-.72.84-.24.24-.49.5-.21.98.28.48 1.24 2.05 2.67 3.32 1.83 1.63 3.37 2.14 3.85 2.38.48.24.76.2 1.04-.12.28-.32 1.2-1.4 1.52-1.88.32-.48.64-.4 1.08-.24.44.16 2.8 1.32 3.28 1.56.48.24.8.36.92.56.12.2.12 1.14-.28 2.26z"/>' +
    "</svg>";

export function injectStyles(config: WhatsAppFloatingConfig): void {
    if (document.getElementById(STYLE_ID)) return;

    const theme = config.theme || {};
    const position: PositionKeyword = config.position || "bottom-right";
    const corner = resolveCorner(position, config.offset);
    const zIndex = config.zIndex || 2147483647;

    const css =
        `.wa-floating-btn{` +
        `position:fixed;` +
        corner +
        `z-index:${zIndex};` +
        `display:inline-flex;` +
        `align-items:center;` +
        `justify-content:center;` +
        `cursor:pointer;` +
        `border:0;` +
        `background:transparent;` +
        `line-height:0;` +
        `text-decoration:none;` +
        `transition:transform .2s ease,opacity .2s ease;` +
        `will-change:transform;` +
        `opacity:0;` +
        `transform:scale(.85);` +
        `}` +
        `.wa-floating-btn.wa-floating-visible{opacity:1;transform:scale(1);}` +
        `.wa-floating-btn:hover{transform:scale(1.06);}` +
        // Images keep their natural aspect ratio (banners, pills, icons all
        // work) — only capped so nothing overflows the viewport or grows
        // absurdly large on big screens. Width/height are NOT forced equal:
        // a rectangular banner asset must not be squeezed into a square.
        `.wa-floating-btn img,.wa-floating-btn svg{` +
        `max-width:90vw;` +
        `max-height:90vw;` +
        `height:64px;` +
        `width:auto;` +
        `display:block;` +
        `border-radius:12px;` +
        `box-shadow:0 4px 16px rgba(0,0,0,.25);` +
        `}` +
        `@media(max-width:768px){.wa-floating-btn img,.wa-floating-btn svg{height:56px;}}` +
        (theme.dark ? `.wa-floating-btn img,.wa-floating-btn svg{box-shadow:0 4px 20px rgba(0,0,0,.6);}` : "") +
        (config.css || "");

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}
