#!/usr/bin/env node
"use strict";

// Injects docs/locales/*.json into docs/app.js as an inline `I18N` object,
// between the `I18N_INJECT_START`/`I18N_INJECT_END` markers.
//
// Why inline instead of fetch() at runtime: docs/index.html (which loads
// app.js) is opened both as a static GitHub Pages deployment (https://,
// fetch works fine) and directly from disk (file://, where fetch() of
// local JSON is blocked by CORS in most browsers). Locales are still
// authored as separate JSON files for editability — this script is the
// only place that reads them, and it must run before publishing/committing.

const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "..", "docs");
const LOCALES_DIR = path.join(DOCS_DIR, "locales");
const APP_JS = path.join(DOCS_DIR, "app.js");

const START_MARKER = "/* I18N_INJECT_START */";
const END_MARKER = "/* I18N_INJECT_END */";

function main() {
    const localeFiles = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"));
    if (!localeFiles.length) {
        throw new Error(`No locale JSON files found in ${LOCALES_DIR}`);
    }

    const i18n = {};
    for (const file of localeFiles) {
        const lang = path.basename(file, ".json");
        const raw = fs.readFileSync(path.join(LOCALES_DIR, file), "utf8");
        try {
            i18n[lang] = JSON.parse(raw);
        } catch (err) {
            throw new Error(`Invalid JSON in docs/locales/${file}: ${err.message}`);
        }
    }

    if (!i18n["en-us"]) {
        throw new Error("docs/locales/en-us.json is required as the fallback locale");
    }

    const js = fs.readFileSync(APP_JS, "utf8");
    const startIdx = js.indexOf(START_MARKER);
    const endIdx = js.indexOf(END_MARKER);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw new Error(`Could not find ${START_MARKER}/${END_MARKER} markers in docs/app.js`);
    }

    const injected = `${START_MARKER}\n    var I18N = ${JSON.stringify(i18n)};\n    `;
    const newJs = js.slice(0, startIdx) + injected + js.slice(endIdx);

    fs.writeFileSync(APP_JS, newJs);
    console.log(
        `Injected ${localeFiles.length} locale(s) into docs/app.js: ${Object.keys(i18n).join(", ")}`
    );
}

main();
