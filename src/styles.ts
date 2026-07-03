import type { CssOffset, PositionKeyword, PulseConfig, WhatsAppFloatingConfig } from "./types";

const STYLE_ID = "wa-floating-styles";

function toCssLength(value: CssOffset | undefined, fallback: string): string {
    if (value == null) return fallback;
    return typeof value === "number" ? `${value}px` : value;
}

/**
 * Resolves the CSS inset properties for a given position.
 *
 * For the four corner keywords, exactly one vertical (top/bottom) and one
 * horizontal (left/right) side is set, defaulting to bottom-right per spec.
 *
 * For "custom", every side present in `offset` is applied as-is — this is
 * what lets a caller anchor the button using any combination of sides
 * (e.g. only `top`, or `top`+`left` together) instead of being locked into
 * one of the four corners.
 */
function resolveCorner(position: PositionKeyword, offset: WhatsAppFloatingConfig["offset"]): string {
    const DEFAULT_GAP = "25px";
    const o = offset || {};

    if (position === "custom") {
        let css = "";
        (["top", "bottom", "left", "right"] as const).forEach((side) => {
            if (o[side] != null) css += `${side}:${toCssLength(o[side], DEFAULT_GAP)};`;
        });
        // Nothing specified at all — fall back to the same default as bottom-right.
        return css || `bottom:${DEFAULT_GAP};right:${DEFAULT_GAP};`;
    }

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
    const theme = config.theme || {};
    const position: PositionKeyword = config.position || "bottom-right";
    const corner = resolveCorner(position, config.offset);
    const zIndex = config.zIndex || 2147483647;

    // Icon/image size: always has a default and is always responsive —
    // desktop falls back to 64px, mobile falls back to iconSize (if set) or
    // 56px, so a caller who only sets `iconSize` gets a proportionally
    // smaller mobile size for free instead of an unresponsive fixed size.
    const iconSize = toCssLength(theme.iconSize, "64px");
    const iconSizeMobile = toCssLength(theme.iconSizeMobile ?? theme.iconSize, "56px");

    // Pulse: `true` normalizes to `{ scale: true }` (today's behavior,
    // unchanged); an object form additionally allows the ring/halo effect
    // and tuning duration/scale/color/opacity.
    const pulseRaw = theme.pulse;
    const pulse: PulseConfig = pulseRaw === true ? { scale: true } : pulseRaw || {};
    const pulseDuration = pulse.duration ?? 1800;
    const pulseScaleAmount = pulse.scaleAmount ?? 1.08;
    const pulseColor = pulse.color ?? "#25D366";
    const pulseOpacity = pulse.opacity ?? 0.55;

    const pill = config.pill;
    const pillExpand = pill?.expand || "hover";

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
        // No border-radius/box-shadow by default: the image is almost always
        // pre-designed artwork (a banner, a themed icon) and decorating it
        // with an extra frame/shadow just adds an unwanted halo around it.
        // Opt in via theme.rounded / theme.shadow if the asset is a plain
        // square icon that benefits from one.
        `.wa-floating-btn img,.wa-floating-btn svg{` +
        `max-width:90vw;` +
        `max-height:90vw;` +
        `height:${iconSize};` +
        `width:auto;` +
        `display:block;` +
        `}` +
        `@media(max-width:768px){.wa-floating-btn img,.wa-floating-btn svg{height:${iconSizeMobile};}}` +
        (theme.rounded ? `.wa-floating-btn img,.wa-floating-btn svg{border-radius:12px;}` : "") +
        (theme.shadow ? `.wa-floating-btn img,.wa-floating-btn svg{box-shadow:0 4px 16px rgba(0,0,0,.25);}` : "") +
        (theme.shadow && theme.dark ? `.wa-floating-btn img,.wa-floating-btn svg{box-shadow:0 4px 20px rgba(0,0,0,.6);}` : "") +
        // Pulse "scale" animates the image/icon itself (not the
        // .wa-floating-btn link), so it never fights with the
        // entrance/hover transform already applied to the link element.
        (pulse.scale
            ? `.wa-floating-btn img,.wa-floating-btn svg{animation:wa-floating-pulse ${pulseDuration}ms ease-in-out infinite;}` +
              `@keyframes wa-floating-pulse{0%,100%{transform:scale(1);}50%{transform:scale(${pulseScaleAmount});}}`
            : "") +
        // Pulse "ring" is a separate expanding halo on a ::after pseudo
        // element, so it composes cleanly with "scale" instead of fighting
        // over the same transform.
        (pulse.ring
            ? `.wa-floating-btn::after{content:"";position:absolute;inset:0;border-radius:50%;` +
              `box-shadow:0 0 0 0 ${pulseColor};opacity:${pulseOpacity};` +
              `animation:wa-floating-ring ${pulseDuration}ms ease-out infinite;pointer-events:none;}` +
              `@keyframes wa-floating-ring{0%{box-shadow:0 0 0 0 ${pulseColor};opacity:${pulseOpacity};}` +
              `100%{box-shadow:0 0 0 24px ${pulseColor};opacity:0;}}`
            : "") +
        // Pill mode: icon + text label in a pill shape, collapsed to
        // icon-only width by default and expanding per `pill.expand`.
        // Exclusive of the image/icon rules above (widget.ts renders one or
        // the other, never both), so these selectors only ever match when
        // `.wa-floating-pill` is actually present on the link.
        (pill
            ? `.wa-floating-btn.wa-floating-pill{` +
              `display:inline-flex;align-items:center;border-radius:999px;` +
              `background:#25D366;overflow:hidden;max-width:${iconSize};` +
              `transition:max-width .3s ease;white-space:nowrap;}` +
              `@media(max-width:768px){.wa-floating-btn.wa-floating-pill{max-width:${iconSizeMobile};}}` +
              `.wa-floating-pill-icon{flex:none;width:${iconSize};height:${iconSize};` +
              `display:flex;align-items:center;justify-content:center;}` +
              `@media(max-width:768px){.wa-floating-pill-icon{width:${iconSizeMobile};height:${iconSizeMobile};}}` +
              `.wa-floating-pill-icon svg{width:68%;height:68%;}` +
              `.wa-floating-pill-text{opacity:0;transition:opacity .2s ease .1s;padding-right:18px;` +
              `color:#fff;font:600 14px/1.3 -apple-system,BlinkMacSystemFont,sans-serif;}` +
              (pillExpand === "hover"
                  ? `.wa-floating-btn.wa-floating-pill:hover{max-width:320px;}` +
                    `.wa-floating-btn.wa-floating-pill:hover .wa-floating-pill-text{opacity:1;}`
                  : "") +
              (pillExpand === "always"
                  ? `.wa-floating-btn.wa-floating-pill{max-width:320px;}.wa-floating-pill-text{opacity:1;}`
                  : "") +
              (pillExpand === "click"
                  ? `.wa-floating-btn.wa-floating-pill.wa-floating-expanded{max-width:320px;}` +
                    `.wa-floating-btn.wa-floating-pill.wa-floating-expanded .wa-floating-pill-text{opacity:1;}`
                  : "")
            : "") +
        (config.css || "");

    // Re-injecting on every render (rather than a one-time guard) is what
    // lets position/offset/zIndex/theme changes actually apply on
    // `reload()` — a static injected-once stylesheet would silently ignore
    // any config change after the first render.
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        style.type = "text/css";
        document.head.appendChild(style);
    }
    style.textContent = css;
}
