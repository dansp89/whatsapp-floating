import { DEFAULT_ICON_SVG } from "./styles";

// No variant in this file draws its own border, outline or drop shadow —
// that's a hard rule for the bundled icon set. `theme.shadow`/`theme.rounded`
// remain available as opt-in CSS effects applied by the caller, but the
// icons themselves must always render clean.

// Shared WhatsApp glyph path — same coordinates as DEFAULT_ICON_SVG so the
// phone icon is identically centred across all variants (viewBox 0 0 32 32).
const GLYPH_PATH =
    '<path fill="#FFF" d="M25.144 22.63c-.4 1.13-1.99 2.07-3.25 2.34-.87.18-2 .33-5.8-1.24-4.86-2.02-7.99-6.94-8.23-7.26-.24-.32-1.97-2.62-1.97-5 0-2.38 1.24-3.55 1.68-4.03.44-.48.96-.6 1.28-.6.32 0 .64 0 .92.02.3.02.7-.11 1.09.83.4.96 1.36 3.34 1.48 3.58.12.24.2.52.04.84-.16.32-.24.52-.48.8-.24.28-.5.62-.72.84-.24.24-.49.5-.21.98.28.48 1.24 2.05 2.67 3.32 1.83 1.63 3.37 2.14 3.85 2.38.48.24.76.2 1.04-.12.28-.32 1.2-1.4 1.52-1.88.32-.48.64-.4 1.08-.24.44.16 2.8 1.32 3.28 1.56.48.24.8.36.92.56.12.2.12 1.14-.28 2.26z"/>';

const ROUNDED_SQUARE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">' +
    '<rect x="0" y="0" width="32" height="32" rx="9" fill="#25D366"/>' +
    GLYPH_PATH +
    "</svg>";

const FLAT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">' +
    '<circle cx="16" cy="16" r="16" fill="#25D366"/>' +
    GLYPH_PATH +
    "</svg>";

const MONO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">' +
    '<circle cx="16" cy="16" r="16" fill="#1a1a1a"/>' +
    GLYPH_PATH +
    "</svg>";

/**
 * Bundled WhatsApp icon variants, selectable via `config.iconVariant`
 * without hosting any image files. `solid` mirrors the library's own
 * default glyph (`DEFAULT_ICON_SVG` in styles.ts) so the two never drift
 * apart. None of these draw a border/outline/shadow — see the note above.
 */
export const ICON_VARIANTS = {
    solid: DEFAULT_ICON_SVG,
    roundedSquare: ROUNDED_SQUARE_SVG,
    flat: FLAT_SVG,
    mono: MONO_SVG,
} as const;

export type IconVariantKey = keyof typeof ICON_VARIANTS;
