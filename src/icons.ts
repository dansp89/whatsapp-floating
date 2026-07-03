import { DEFAULT_ICON_SVG } from "./styles";

// No variant in this file draws its own border, outline or drop shadow —
// that's a hard rule for the bundled icon set. `theme.shadow`/`theme.rounded`
// remain available as opt-in CSS effects applied by the caller, but the
// icons themselves must always render clean.

const ROUNDED_SQUARE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">' +
    '<rect x="0" y="0" width="32" height="32" rx="9" fill="#25D366"/>' +
    '<path fill="#FFF" d="M22.14 17.9c-.34-.17-2.03-1-2.35-1.11-.31-.11-.55-.17-.78.17-.23.35-.9 1.12-1.1 1.35-.2.23-.4.25-.75.08-.34-.17-1.45-.53-2.76-1.7-1.02-.91-1.71-2.03-1.9-2.38-.2-.34-.02-.53.15-.7.15-.16.34-.4.51-.6.17-.2.23-.34.34-.57.12-.23.06-.43-.03-.6-.09-.17-.78-1.87-1.06-2.56-.28-.67-.57-.58-.78-.59-.2 0-.43-.01-.66-.01-.23 0-.6.08-.92.43-.32.34-1.21 1.18-1.21 2.88 0 1.7 1.24 3.35 1.41 3.58.17.23 2.44 3.72 5.9 5.22.83.36 1.48.57 1.98.73.83.26 1.6.22 2.2.14.67-.1 2.03-.83 2.32-1.63.28-.8.28-1.5.19-1.64-.08-.15-.31-.24-.65-.4z"/>' +
    "</svg>";

const FLAT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">' +
    '<circle cx="16" cy="16" r="16" fill="#25D366"/>' +
    '<path fill="#FFF" d="M23.14 20.9c-.34-.17-2.03-1-2.35-1.11-.31-.11-.55-.17-.78.17-.23.35-.9 1.12-1.1 1.35-.2.23-.4.25-.75.08-.34-.17-1.45-.53-2.76-1.7-1.02-.91-1.71-2.03-1.9-2.38-.2-.34-.02-.53.15-.7.15-.16.34-.4.51-.6.17-.2.23-.34.34-.57.12-.23.06-.43-.03-.6-.09-.17-.78-1.87-1.06-2.56-.28-.67-.57-.58-.78-.59-.2 0-.43-.01-.66-.01-.23 0-.6.08-.92.43-.32.34-1.21 1.18-1.21 2.88 0 1.7 1.24 3.35 1.41 3.58.17.23 2.44 3.72 5.9 5.22.83.36 1.48.57 1.98.73.83.26 1.6.22 2.2.14.67-.1 2.03-.83 2.32-1.63.28-.8.28-1.5.19-1.64-.08-.15-.31-.24-.65-.4z"/>' +
    "</svg>";

const MONO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">' +
    '<circle cx="16" cy="16" r="16" fill="#1a1a1a"/>' +
    '<path fill="#FFF" d="M23.14 20.9c-.34-.17-2.03-1-2.35-1.11-.31-.11-.55-.17-.78.17-.23.35-.9 1.12-1.1 1.35-.2.23-.4.25-.75.08-.34-.17-1.45-.53-2.76-1.7-1.02-.91-1.71-2.03-1.9-2.38-.2-.34-.02-.53.15-.7.15-.16.34-.4.51-.6.17-.2.23-.34.34-.57.12-.23.06-.43-.03-.6-.09-.17-.78-1.87-1.06-2.56-.28-.67-.57-.58-.78-.59-.2 0-.43-.01-.66-.01-.23 0-.6.08-.92.43-.32.34-1.21 1.18-1.21 2.88 0 1.7 1.24 3.35 1.41 3.58.17.23 2.44 3.72 5.9 5.22.83.36 1.48.57 1.98.73.83.26 1.6.22 2.2.14.67-.1 2.03-.83 2.32-1.63.28-.8.28-1.5.19-1.64-.08-.15-.31-.24-.65-.4z"/>' +
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
