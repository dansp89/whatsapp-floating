import type {
    FallbackConfig,
    MatchContext,
    PathRuleConfig,
    PhoneMatchResult,
    ResolvedLocation,
    RuleConfig,
    WeightedNumber,
    WhatsAppFloatingConfig,
} from "./types";
import { normalize } from "./utils";
import { isWithinSchedule } from "./schedule";

const roundRobinState: Record<string, number> = {};

function pickPhoneFromRule(
    rule: RuleConfig | FallbackConfig | PathRuleConfig,
    ruleKey: string | number
): string | null {
    if (rule.phone) return rule.phone;

    const numbers: WeightedNumber[] | undefined = rule.numbers;
    if (!numbers || !numbers.length) return null;

    const strategy = rule.distribution || "random";

    if (strategy === "weighted") {
        let totalWeight = 0;
        for (const n of numbers) totalWeight += n.weight || 1;
        let rand = Math.random() * totalWeight;
        for (const n of numbers) {
            rand -= n.weight || 1;
            if (rand <= 0) return n.phone;
        }
        return numbers[numbers.length - 1]?.phone ?? null;
    }

    if (strategy === "roundrobin" || strategy === "round-robin" || strategy === "round_robin") {
        const key = "rule_" + ruleKey;
        const idx = roundRobinState[key] || 0;
        const entry = numbers[idx % numbers.length];
        roundRobinState[key] = idx + 1;
        return entry?.phone ?? null;
    }

    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers[randomIndex]?.phone ?? null;
}

function matchesArrayField(ruleValue: string | string[] | undefined, actualValue: string | null): boolean {
    if (ruleValue == null) return true;
    if (!actualValue) return false;
    const list = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
    return list.some((v) => normalize(v) === normalize(actualValue));
}

function matchesUTM(rule: RuleConfig, utmParams: Record<string, string>): boolean {
    if (!rule.utm) return true;
    for (const key in rule.utm) {
        if (!Object.prototype.hasOwnProperty.call(rule.utm, key)) continue;
        const expected = rule.utm[key];
        const actual = utmParams["utm_" + key] || utmParams[key];
        if (normalize(expected) !== normalize(actual)) return false;
    }
    return true;
}

function matchesContext(rule: RuleConfig, ctx: MatchContext): boolean {
    if (rule.language && normalize(ctx.language).indexOf(normalize(rule.language)) !== 0) return false;
    if (rule.referrer && ctx.referrer.indexOf(rule.referrer) === -1) return false;
    if (rule.domain && ctx.domain.indexOf(rule.domain) === -1) return false;
    if (rule.page && ctx.page.indexOf(rule.page) === -1) return false;
    if (rule.continent && normalize(rule.continent) !== normalize(ctx.continent)) return false;
    if (rule.schedule && !isWithinSchedule(rule.schedule)) return false;
    if (rule.utm && !matchesUTM(rule, ctx.utm)) return false;
    return true;
}

function matchesPathRule(rule: PathRuleConfig, ctx: MatchContext): boolean {
    if (rule.path && ctx.page.indexOf(rule.path) === -1) return false;
    if (rule.pathRegex) {
        try {
            if (!new RegExp(rule.pathRegex).test(ctx.page)) return false;
        } catch {
            return false;
        }
    }
    if (!rule.path && !rule.pathRegex) return false;
    if (rule.schedule && !isWithinSchedule(rule.schedule)) return false;
    if (rule.utm && !matchesUTM(rule as unknown as RuleConfig, ctx.utm)) return false;
    return true;
}

/**
 * Path rules are evaluated first and take priority over location-based
 * rules: the first matching rule's `phone` (if any) and `images` (if any)
 * are applied. A path rule may supply only `images`, only `phone`/`numbers`,
 * or both — whichever is omitted falls through to location-based resolution.
 */
export function resolvePathRule(config: WhatsAppFloatingConfig, ctx: MatchContext): PhoneMatchResult | null {
    const pathRules = config.pathRules || [];

    for (let i = 0; i < pathRules.length; i++) {
        const rule = pathRules[i] as PathRuleConfig;
        if (!matchesPathRule(rule, ctx)) continue;

        const phone = pickPhoneFromRule(rule, "path_" + i);
        if (phone || rule.images) {
            return {
                phone: phone,
                matched: "Path",
                rule,
                images: rule.images,
            };
        }
    }

    return null;
}

interface Level {
    key: "city" | "state" | "country";
    label: "Cidade" | "Estado" | "País";
}

const LEVELS: Level[] = [
    { key: "city", label: "Cidade" },
    { key: "state", label: "Estado" },
    { key: "country", label: "País" },
];

/** Whether `rule` targets exactly this location level and its geo fields match `location`. */
function ruleMatchesLevel(rule: RuleConfig, level: Level, location: ResolvedLocation): boolean {
    if (level.key === "city") {
        const cityField = rule.cities || rule.city;
        if (!cityField) return false;
        if (!matchesArrayField(cityField, location.city)) return false;
        if (rule.state && normalize(rule.state) !== normalize(location.state)) return false;
        if (rule.country && normalize(rule.country) !== normalize(location.country)) return false;
    } else if (level.key === "state") {
        if (!rule.state || rule.cities || rule.city) return false;
        if (normalize(rule.state) !== normalize(location.state)) return false;
        if (rule.country && normalize(rule.country) !== normalize(location.country)) return false;
    } else {
        if (!rule.country || rule.state || rule.cities || rule.city) return false;
        if (normalize(rule.country) !== normalize(location.country)) return false;
    }
    return true;
}

/**
 * Resolves phone + matched level + image override for the current visitor.
 *
 * Priority:
 * 1. Path rules (config.pathRules) — matched against the URL path, can
 *    override phone and/or images regardless of location.
 * 2. Location rules (config.rules) — City -> State -> Country.
 * 3. Fallback.
 *
 * A path rule that only overrides `images` (no phone) still lets the
 * location/fallback chain decide the phone number, but its image override
 * is merged into the final result.
 */
export function resolvePhone(
    config: WhatsAppFloatingConfig,
    location: ResolvedLocation,
    ctx: MatchContext
): PhoneMatchResult {
    const pathResult = resolvePathRule(config, ctx);
    if (pathResult && pathResult.phone) {
        return pathResult;
    }

    const imagesOverride = pathResult?.images;
    const rules = config.rules || [];

    for (const level of LEVELS) {
        const actualValue = location[level.key];
        if (!actualValue) continue;

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i] as RuleConfig;

            if (!matchesContext(rule, ctx)) continue;
            if (!ruleMatchesLevel(rule, level, location)) continue;

            const phone = pickPhoneFromRule(rule, i);
            if (phone) {
                return { phone, matched: level.label, rule, images: imagesOverride || rule.images };
            }
        }
    }

    let fallbackPhone: string | null = null;
    if (config.fallback) {
        fallbackPhone = pickPhoneFromRule(config.fallback, "fallback");
    }

    return { phone: fallbackPhone, matched: "Fallback", rule: config.fallback || null, images: imagesOverride };
}

/**
 * Resolves a single string field (`message` or `pillText`) that a rule may
 * override, independently of phone resolution — a rule can supply that
 * field without `phone` (or vice versa), so the rule that decides the phone
 * is not necessarily the one that supplies the override.
 *
 * Priority mirrors resolvePhone(): Path rule -> City -> State -> Country ->
 * Fallback -> the given top-level fallback value, using the first matching
 * rule (at each level) that actually has the field set, skipping ones that
 * don't.
 */
function resolveRuleOverride(
    config: WhatsAppFloatingConfig,
    location: ResolvedLocation,
    ctx: MatchContext,
    field: "message" | "pillText",
    topLevelValue: string | undefined
): string {
    const pathRules = config.pathRules || [];
    for (const rule of pathRules) {
        if (!matchesPathRule(rule, ctx)) continue;
        if (rule[field]) return rule[field] as string;
    }

    const rules = config.rules || [];
    for (const level of LEVELS) {
        const actualValue = location[level.key];
        if (!actualValue) continue;

        for (const rule of rules as RuleConfig[]) {
            if (!matchesContext(rule, ctx)) continue;
            if (!ruleMatchesLevel(rule, level, location)) continue;
            if (rule[field]) return rule[field] as string;
        }
    }

    if (config.fallback?.[field]) return config.fallback[field] as string;

    return topLevelValue || "";
}

/**
 * Resolves the wa.me `?text=` message for the current visitor — see
 * resolveRuleOverride() for the resolution order/independence guarantees.
 */
export function resolveMessage(
    config: WhatsAppFloatingConfig,
    location: ResolvedLocation,
    ctx: MatchContext
): string {
    return resolveRuleOverride(config, location, ctx, "message", config.message);
}

/**
 * Resolves the pill button's label (`pill.text`) for the current visitor —
 * see resolveRuleOverride() for the resolution order/independence
 * guarantees. Only meaningful when the top-level `pill` config is set;
 * callers should ignore the result otherwise.
 */
export function resolvePillText(
    config: WhatsAppFloatingConfig,
    location: ResolvedLocation,
    ctx: MatchContext
): string {
    return resolveRuleOverride(config, location, ctx, "pillText", config.pill?.text);
}
