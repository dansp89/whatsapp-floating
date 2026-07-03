# WhatsApp Floating

A dependency-free, TypeScript-built floating WhatsApp contact button. Drop one `<script>` tag on your site and it automatically picks the right phone number for each visitor based on geolocation, business hours, URL path, UTM campaign, language, referrer and more — then renders a floating button, no HTML required.

Built by **[Sellvex](https://sellvex.com.br)**.

**[Live demo (English / Português)](https://dansp89.github.io/whatsapp-floating/)** — a working page with the floating button, live event log, and every public API method wired to a button.

- **Zero dependencies** — no jQuery, no React, no build step required to use it.
- **Zero global pollution** — only `window.WhatsAppFloatingConfig` (input) and `window.WhatsAppFloating` (API) are created.
- **One HTTP call** for geolocation, cached in `localStorage`, with a 4-provider fallback chain so a single flaky API never breaks the widget.
- **Written in TypeScript**, shipped as a prebuilt bundle: `.min.js` (IIFE for `<script src>`/CDN), `.esm.js`, `.cjs.js` and `.d.ts`.
- Ships with default desktop/mobile PNG icons — override them globally, per rule, per path, or at runtime.

---

## Quick start

```html
<script>
  window.WhatsAppFloatingConfig = {
    message: "Hi! I'd like to make a reservation.",
    fallback: { phone: "5511999999999" }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/whatsapp-floating/dist/whatsapp-floating.min.js"></script>
```

That's it — no extra HTML markup needed. The button is created and inserted into the DOM automatically, positioned bottom-right by default.

### CDN options

```html
<!-- jsDelivr (npm) -->
<script src="https://cdn.jsdelivr.net/npm/whatsapp-floating@1/dist/whatsapp-floating.min.js"></script>

<!-- unpkg -->
<script src="https://unpkg.com/whatsapp-floating@1/dist/whatsapp-floating.min.js"></script>
```

Pin a version (`@1.0.0`) in production; use `@1` only if you want automatic minor/patch updates.

> `dist/` is not committed to the repository (see [Building from source](#building-from-source)) — it's published to npm instead, which is what the CDN links above resolve against. There is no `cdn.jsdelivr.net/gh/...` variant for this package.

### npm / bundlers

```bash
npm install whatsapp-floating
```

```ts
import WhatsAppFloating from "whatsapp-floating";

WhatsAppFloating.init({
  message: "Hi! I'd like to make a reservation.",
  fallback: { phone: "5511999999999" },
});
```

TypeScript types are bundled (`dist/whatsapp-floating.d.ts`) — no `@types` package needed.

---

## How it works

On load, the library:

1. Reads `window.WhatsAppFloatingConfig`.
2. Resolves the visitor's location (manual override → cache → geolocation API chain).
3. Evaluates `pathRules`, then `rules`, then `fallback` to pick a phone number and, optionally, an image override.
4. Resolves the desktop/mobile image to show.
5. Builds the floating `<a><img></a>` button and inserts it into `<body>`.
6. Logs the decision to the console (unless `production: true` and `debug` is off).

Only **one HTTP request** is made per page load for geolocation (subject to caching); the fallback chain only issues additional requests if a provider actually fails.

---

## Full configuration reference

All properties are optional except where noted. Everything is set on `window.WhatsAppFloatingConfig` (or passed to `WhatsAppFloating.init(config)`).

### Message & branding

| Property | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | `""` | Pre-filled WhatsApp message, URL-encoded into the `wa.me` link. |
| `appendUtmToMessage` | `boolean` | `false` | Appends detected `utm_*` query params to the message text. |
| `ariaLabel` | `string` | `"WhatsApp"` | `aria-label` on the button link. |
| `imageAlt` | `string` | `"WhatsApp"` | `alt` text on the `<img>`. |
| `icon` | `string` (raw SVG markup) | built-in WhatsApp glyph | Custom SVG used instead of an `<img>` when no image URL resolves. See also `iconVariant` (bundled icon set) and `pill` (icon + text button) under [Built-in icon variants](#built-in-icon-variants) and [Pill button](#pill-button-icon--text). |

### Images

| Property | Type | Default | Description |
|---|---|---|---|
| `images.desktop` | `string` (URL) | — | Desktop button image. |
| `images.mobile` | `string` (URL) | — | Mobile button image. |
| `assetsBaseUrl` | `string` (URL) | — | When `images` is not set, the library defaults to `${assetsBaseUrl}/whatsapp-desktop.png` and `${assetsBaseUrl}/whatsapp-mobile.png`. Point this at wherever you host the two standard PNGs (e.g. a CDN folder next to the script). |

Resolution order for the final image shown (highest priority first): a runtime `setImages()` call → a matching rule's/path rule's `images` → top-level `images` → the `assetsBaseUrl` defaults.

Images load with `loading="eager"`, `decoding="async"` and `fetchPriority="high"`, and the library injects a `<link rel="preload" as="image">` as soon as the URL is known — the icon is above-the-fold UI, so it is fetched immediately without blocking the main thread.

### Phone routing — location rules

```js
rules: [
  {
    country: "BR",
    state: "AM",
    cities: ["Manaus", "Manacapuru", "Iranduba"],
    phone: "5592999999999"
  },
  { country: "BR", state: "SP", phone: "5511988888888" },
  { country: "US", phone: "12025551234" }
]
```

Matching priority: **City → State → Country → Fallback**. Within each level, rules are scanned top to bottom; the first rule that matches the visitor's location (and any extra conditions below) wins.

| Property | Type | Description |
|---|---|---|
| `country` | `string` | ISO country code/name to match. |
| `state` | `string` | Region/state to match. |
| `city` / `cities` | `string \| string[]` | One or more cities to match (case/accent-insensitive). |
| `phone` | `string` | Fixed number for this rule. |
| `numbers` | `{ phone: string, weight?: number }[]` | Multiple numbers — use with `distribution`. |
| `distribution` | `"random" \| "roundrobin" \| "weighted"` | How to pick among `numbers`. Default `"random"`. (`"round-robin"`/`"round_robin"` are accepted aliases for `"roundrobin"`.) |
| `images` | `{ desktop?, mobile? }` | Overrides the button image when this rule matches. |
| `schedule` | see [Scheduling](#scheduling) | Rule only matches within business hours/days. |
| `utm` | see [UTM matching](#utm-campaign-matching) | Rule only matches for a given campaign. |
| `language` | `string` | Rule only matches if the browser language starts with this value (e.g. `"en"`). |
| `referrer` | `string` | Rule only matches if `document.referrer` contains this substring. |
| `domain` | `string` | Rule only matches if `location.hostname` contains this substring. |
| `page` | `string` | Rule only matches if the URL path contains this substring. |
| `continent` | `"AF"\|"AS"\|"EU"\|"NA"\|"SA"\|"OC"\|"AN"` | Rule only matches for that continent (derived from the resolved country). |

### Phone & image routing by URL path

`pathRules` are evaluated **before** `rules`, so they can override the phone number and/or images regardless of the visitor's location — useful for landing pages/campaigns (e.g. `/promocao`).

```js
pathRules: [
  {
    path: "/promocao",
    phone: "5511900000000",
    images: {
      desktop: "https://cdn.site.com/promo-desktop.png",
      mobile: "https://cdn.site.com/promo-mobile.png"
    }
  }
]
```

| Property | Type | Description |
|---|---|---|
| `path` | `string` | Substring the current pathname must contain. |
| `pathRegex` | `string` | Regular expression (no slashes) tested against the pathname; use instead of/with `path`. |
| `phone` / `numbers` / `distribution` | same as location rules | If omitted, the phone falls through to location-based `rules`/`fallback`. |
| `images` | `{ desktop?, mobile? }` | Applied even if `phone` is omitted — merges on top of whatever image would otherwise be shown. |
| `schedule`, `utm` | same as location rules | Extra conditions for the path rule to match. |

### Fallback

```js
fallback: {
  phone: "5511999999999",
  // or:
  numbers: [{ phone: "5511911111111", weight: 2 }, { phone: "5511922222222" }],
  distribution: "weighted"
}
```

Used when no `pathRules`/`rules` match. Supports the same `numbers`/`distribution` options as location rules.

### Scheduling

```js
schedule: {
  days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  hours: { start: "09:00", end: "18:00" },
  timezone: "America/Manaus" // optional, IANA name; defaults to browser local time
}
```

Attach a `schedule` to any rule (location or path) to restrict it to business hours/days. Overnight ranges (e.g. `22:00`–`06:00`) are supported.

### UTM campaign matching

```js
utm: { source: "google", medium: "cpc" }
```

Matches against `utm_source`, `utm_medium`, etc. query string parameters on the landing URL.

### Manual location override

```js
location: { country: "BR", state: "AM", city: "Manaus" }
```

Skips the geolocation API entirely and uses these values — useful for testing or server-rendered geo hints.

### Geolocation

| Property | Type | Default | Description |
|---|---|---|---|
| `geoApiUrl` | `string` | — | Custom primary geolocation endpoint, tried first. |
| `geoProviders` | `string[]` | — | Additional endpoints appended to the fallback chain. |
| `geoTimeout` | `number` (ms) | `5000` | Per-provider timeout before moving to the next one. |
| `cacheLocation` | `boolean` | `true` | Cache the resolved location in `localStorage`. |
| `geoCacheTTL` | `number` (ms) | `21600000` (6h) | Cache lifetime; `0` disables expiry. |

Built-in fallback chain (tried in order until one succeeds): **ipapi.co → ipwho.is → ip-api.com → ipinfo.io**. `geoApiUrl` (if set) is tried first, `geoProviders` are appended after the built-ins.

> `ip-api.com`'s free tier only serves plain HTTP. It's kept as a late fallback so it never blocks HTTPS sites from getting a result via the earlier HTTPS providers, but if you rely on it directly, be aware of mixed-content restrictions.

### Remote configuration

| Property | Type | Description |
|---|---|---|
| `remoteConfigUrl` | `string` | A JSON URL fetched and deep-merged into the local config before initializing — update rules/phones without redeploying the script tag. |

### Layout & positioning

| Property | Type | Default | Description |
|---|---|---|---|
| `position` | `"bottom-right"\|"bottom-left"\|"top-right"\|"top-left"\|"custom"` | `"bottom-right"` | Corner the button is anchored to. Use `"custom"` to control each side independently via `offset` (see below). |
| `offset.top` / `.bottom` / `.left` / `.right` | `number \| string` | `25` (px) | Distance from the anchored corner. Numbers are treated as px; strings accept any CSS length (`"5%"`, `"2rem"`). With `position: "custom"`, every side you set in `offset` is applied as-is — e.g. `{ top: 24, left: "10%" }` anchors to the top-left using independently chosen values instead of being locked to one of the four corner presets. |
| `mobileBreakpoint` | `number` | `768` | Viewport width (px) at/below which mobile is assumed. |
| `zIndex` | `number` | `2147483647` | Stacking order. |
| `theme.iconSize` | `number \| string` | `64px` | Icon/image height on desktop. Always has a default and is always responsive — see `iconSizeMobile`. |
| `theme.iconSizeMobile` | `number \| string` | `56px` | Icon/image height at/below `mobileBreakpoint`. Defaults independently of `iconSize`, so setting only one still yields a proportionally-adjusted mobile size instead of an unresponsive fixed size. |
| `theme.shadow` | `boolean` | `false` | Adds a drop shadow behind the image. Off by default — the bundled icons never draw their own border/shadow, and most custom images (banners, themed icons) already ship with their own design. |
| `theme.rounded` | `boolean` | `false` | Rounds the image's corners. Off by default for the same reason. |
| `theme.dark` | `boolean` | `false` | When combined with `theme.shadow`, uses a heavier shadow suited for dark backgrounds. |
| `css` | `string` | — | Raw CSS appended after the library's own styles, for custom tweaks. |

Mobile is detected when `window.innerWidth <= mobileBreakpoint` **or** the URL path contains `/mobile`. The button image never exceeds `90vw` in either dimension and keeps its natural aspect ratio — no cropping, no forced circle/square.

### Pulse animation

```js
theme: { pulse: true }
// or, fully configured:
theme: {
  pulse: {
    scale: true,       // icon "breathing" scale animation
    ring: true,         // expanding colored ring/halo
    duration: 1800,      // ms per cycle
    scaleAmount: 1.08,   // peak scale factor for the breathing effect
    color: "#25D366",    // ring color
    opacity: 0.55         // ring starting opacity
  }
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `theme.pulse` | `boolean \| PulseConfig` | `false` | `true` enables the icon scale/"breathing" animation with default timing — equivalent to `{ scale: true }`. Pass an object to also enable the ring/halo effect or tune timing/appearance. |
| `pulse.scale` | `boolean` | `true` when `pulse` is set at all | Icon scale ("breathing") animation. |
| `pulse.ring` | `boolean` | `false` | Expanding colored ring/halo around the button, independent of `scale` — enable either, both, or neither. |
| `pulse.duration` | `number` (ms) | `1800` | Animation cycle length, shared by both effects. |
| `pulse.scaleAmount` | `number` | `1.08` | Peak scale factor for the breathing effect. |
| `pulse.color` | `string` | `"#25D366"` | Ring color. |
| `pulse.opacity` | `number` | `0.55` | Ring starting opacity (fades to `0` as it expands). |

### Built-in icon variants

No image hosting required — pick a bundled, dependency-free SVG icon by name. None of them draw a border, outline or shadow of their own (that stays fully opt-in via `theme.shadow`/`theme.rounded` above).

```js
iconVariant: "roundedSquare"
```

| Key | Description |
|---|---|
| `"solid"` | The library's default circular WhatsApp glyph (used automatically if you set nothing at all). |
| `"roundedSquare"` | Same glyph on a rounded-square background. |
| `"flat"` | Larger circular glyph, flush edge-to-edge. |
| `"mono"` | Circular glyph on a dark/neutral background instead of WhatsApp green. |

`iconVariant` is ignored when `images`/`assetsBaseUrl` resolve to an actual image URL (images always win), and when `pill` is set (see below). An explicit `icon` (raw custom SVG string) still wins over `iconVariant`.

### Pill button (icon + text)

Renders an icon-and-text pill instead of an image/icon — no image hosting needed, matches your own call-to-action copy. Picking `pill` is an **exclusive** button style: when set, `images`, `assetsBaseUrl`, `icon` and `iconVariant` are all ignored entirely.

```js
pill: {
  text: "Fale conosco",
  expand: "hover",     // "hover" | "always" | "click" | "never"
  icon: "solid"          // any built-in icon variant key, defaults to "solid"
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `pill.text` | `string` | — (required) | The label shown next to the icon. |
| `pill.expand` | `"hover"\|"always"\|"click"\|"never"` | `"hover"` | `"hover"` expands on mouse hover, collapsing back to icon-only otherwise (desktop-friendly). `"always"` stays expanded. `"click"` — the first click/tap only reveals the label (no navigation, no `open` event); the next click opens WhatsApp normally. `"never"` stays icon-only forever; the text is still set as the accessible label. |
| `pill.icon` | icon variant key or custom SVG string | `"solid"` | Icon shown inside the pill — same choices as `iconVariant` above. |
| `pill.color` | `string` (CSS color) | `"#25D366"` | Pill background color. |
| `pill.textColor` | `string` (CSS color) | `"#ffffff"` | Pill label text color. |
| `pill.fontSize` | `number` (px) | `14` | Font size of the label in pixels. |
| `pill.fontWeight` | `number\|string` | `600` | CSS font-weight of the label (e.g. `400`, `700`). |
| `pill.paddingRight` | `number` (px) | `18` | Extra horizontal padding between the label and the right edge of the pill. |
| `pill.borderRadius` | `number` (px) | `999` | Border radius of the pill. Use `0` for a square button, `4`–`16` for rounded-rectangle, `999` for fully-rounded. |

`ariaLabel` still wins if explicitly set; otherwise the pill's `aria-label` defaults to `pill.text` (more descriptive than the generic "WhatsApp" fallback used elsewhere).

### Analytics

| Property | Type | Default | Description |
|---|---|---|---|
| `analytics` | `boolean` | `true` | Master switch for the integrations below. |

When enabled, `render` and `open` events are automatically pushed to:
- **Google Analytics (gtag.js)** — `gtag("event", ...)`
- **Google Tag Manager** — `window.dataLayer.push(...)`
- **Meta Pixel** — `fbq("trackCustom", ...)`

No extra configuration needed — the library detects `window.gtag`, `window.dataLayer` and `window.fbq` if present.

### Debug / production

| Property | Type | Default | Description |
|---|---|---|---|
| `debug` | `boolean` | `false` | Verbose console logging for every internal step. |
| `production` | `boolean` | `true` | When `true` and `debug` is `false`, suppresses the console summary block. |
| `lazyLoad` | `boolean` | `false` | Defer initialization until the `load` event instead of running immediately. |

### Events

| Property | Payload | Fired when |
|---|---|---|
| `onReady` | `{ phone, location, matched }` | The button has been rendered and is ready. |
| `onLocation` | `{ country, state, city }` | Geolocation has resolved. |
| `onPhoneSelected` | `{ phone, matched }` | A phone number has been chosen. |
| `onOpen` | `{ phone }` | The button was clicked (or `.open()` called). |
| `onClose` | `{ phone }` | `.close()` was called. |

`matched` is one of `"Path" | "Cidade" | "Estado" | "País" | "Fallback" | "Manual"`, describing which rule tier decided the number.

Every event is also dispatched as a `document`-level `CustomEvent` named `whatsappfloating:<event>` (e.g. `whatsappfloating:ready`), for listening from unrelated scripts without touching the config object.

### Console output

Unless suppressed by `production`/`debug`, every resolution prints a summary:

```
Country: BR
State: AM
City: Manaus
Matched: Cidade
Phone: 5592999999999
```

---

## Public API

Available on `window.WhatsAppFloating` (global build) or as the default export (npm build).

```ts
WhatsAppFloating.init(config);          // (re)initialize with a full config
WhatsAppFloating.reload(partialConfig?); // re-run resolution, optionally merging new config
WhatsAppFloating.open();                // open the wa.me link programmatically
WhatsAppFloating.close();               // hide the button
WhatsAppFloating.destroy();             // remove the button from the DOM
WhatsAppFloating.getPhone();            // -> string | null
WhatsAppFloating.getLocation();         // -> { country, state, city }
WhatsAppFloating.getMatched();          // -> "Path" | "Cidade" | "Estado" | "País" | "Fallback" | "Manual" | null
WhatsAppFloating.setPhone(phone);       // override the phone number at runtime
WhatsAppFloating.setImages(images);     // override desktop/mobile images at runtime — highest priority
WhatsAppFloating.getImages();           // -> the currently resolved { desktop, mobile }
WhatsAppFloating.isReady();             // -> boolean
WhatsAppFloating.on(event, fn);         // subscribe to an event without touching config
WhatsAppFloating.off(event, fn);        // unsubscribe
```

---

## Default assets

The library does not bundle icon binaries into the JS payload — instead it references two PNGs by convention:

```
whatsapp-desktop.png
whatsapp-mobile.png
```

Host these two files anywhere (your own CDN, the same folder as the script, etc.) and point `assetsBaseUrl` at that folder; the library builds the final URLs itself. You can always override them — globally via `images`, per rule/path via each rule's `images`, or at runtime via `setImages()`.

---

## Project structure

```
src/            TypeScript source (types, geo, rules, schedule, styles, analytics, widget, index)
dist/           Prebuilt output — this is what you deploy to a CDN
  whatsapp-floating.min.js     IIFE, minified — use this in <script src="...">
  whatsapp-floating.global.js  IIFE, unminified — for debugging
  whatsapp-floating.esm.js     ES module — for bundlers
  whatsapp-floating.cjs.js     CommonJS — for Node/older bundlers
  whatsapp-floating.d.ts       TypeScript type definitions
docs/           Standalone demo page (docs/index.html) + sample assets — also
                served as the public GitHub Pages site (github.com settings:
                Pages → Deploy from a branch → main → /docs)
```

Only `dist/` (plus `README.md`/`LICENSE`) is published to npm — the package is meant to be consumed as a build artifact, not compiled by consumers.

## Building from source

```bash
npm install
npm run build      # outputs to dist/
npm run typecheck  # tsc --noEmit
npm run dev         # watch mode
```

## Browser support

Chrome, Firefox, Safari, Edge, Opera, Android, iOS — any browser supporting `fetch`, `Promise` and `CustomEvent` (all evergreen browsers).

## License

MIT © [Sellvex](https://sellvex.com.br)
