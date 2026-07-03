import { describe, expect, it } from "bun:test";
import { resolvePathRule, resolvePhone } from "../src/rules";
import type { MatchContext, ResolvedLocation, WhatsAppFloatingConfig } from "../src/types";

function makeCtx(overrides: Partial<MatchContext> = {}): MatchContext {
    return {
        language: "pt-br",
        referrer: "",
        domain: "example.com",
        page: "/",
        utm: {},
        query: {},
        cookies: "",
        localStorage: null,
        sessionStorage: null,
        continent: "SA",
        ...overrides,
    };
}

function makeLoc(overrides: Partial<ResolvedLocation> = {}): ResolvedLocation {
    return { country: "BR", state: "AM", city: "Manaus", ...overrides };
}

const baseConfig: WhatsAppFloatingConfig = {
    fallback: { phone: "5500000000000" },
};

describe("resolvePhone — fallback", () => {
    it("returns fallback when no rules match", () => {
        const result = resolvePhone(baseConfig, makeLoc(), makeCtx());
        expect(result.matched).toBe("Fallback");
        expect(result.phone).toBe("5500000000000");
    });

    it("returns null phone when fallback is missing", () => {
        const result = resolvePhone({}, makeLoc(), makeCtx());
        expect(result.phone).toBeNull();
        expect(result.matched).toBe("Fallback");
    });
});

describe("resolvePhone — country match", () => {
    it("matches by country", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ country: "BR", phone: "5511999999999" }],
        };
        const result = resolvePhone(config, makeLoc(), makeCtx());
        expect(result.matched).toBe("País");
        expect(result.phone).toBe("5511999999999");
    });

    it("does not match a different country", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ country: "US", phone: "15551234567" }],
        };
        const result = resolvePhone(config, makeLoc({ country: "BR" }), makeCtx());
        expect(result.matched).toBe("Fallback");
    });

    it("country match is case-insensitive", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ country: "br", phone: "5511999999999" }],
        };
        const result = resolvePhone(config, makeLoc({ country: "BR" }), makeCtx());
        expect(result.matched).toBe("País");
    });
});

describe("resolvePhone — state match", () => {
    it("matches by state within the correct country", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ country: "BR", state: "AM", phone: "5592900000000" }],
        };
        const result = resolvePhone(config, makeLoc(), makeCtx());
        expect(result.matched).toBe("Estado");
        expect(result.phone).toBe("5592900000000");
    });

    it("state rule without country still matches", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ state: "AM", phone: "5592900000000" }],
        };
        const result = resolvePhone(config, makeLoc(), makeCtx());
        expect(result.matched).toBe("Estado");
    });

    it("does not use a state rule when city is also set in the rule", () => {
        // a rule with city should be evaluated at city level, not state level
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ state: "AM", cities: ["Manaus"], phone: "5592111111111" }],
        };
        const result = resolvePhone(config, makeLoc(), makeCtx());
        expect(result.matched).toBe("Cidade");
        expect(result.phone).toBe("5592111111111");
    });
});

describe("resolvePhone — city match", () => {
    it("matches by city", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ country: "BR", state: "AM", cities: ["Manaus"], phone: "5592111111111" }],
        };
        const result = resolvePhone(config, makeLoc(), makeCtx());
        expect(result.matched).toBe("Cidade");
        expect(result.phone).toBe("5592111111111");
    });

    it("city matching is accent-insensitive", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [{ cities: ["São Paulo"], phone: "5511888888888" }],
        };
        const result = resolvePhone(config, makeLoc({ city: "Sao Paulo" }), makeCtx());
        expect(result.matched).toBe("Cidade");
    });
});

describe("resolvePhone — priority (city > state > country)", () => {
    it("city rule wins over state rule", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "5500000000000" },
            rules: [
                { country: "BR", state: "AM", phone: "STATE" },
                { country: "BR", state: "AM", cities: ["Manaus"], phone: "CITY" },
            ],
        };
        const result = resolvePhone(config, makeLoc(), makeCtx());
        expect(result.phone).toBe("CITY");
        expect(result.matched).toBe("Cidade");
    });
});

describe("resolvePhone — weighted distribution", () => {
    it("always returns one of the defined phones", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: {
                distribution: "weighted",
                numbers: [
                    { phone: "AAA", weight: 1 },
                    { phone: "BBB", weight: 9 },
                ],
            },
        };
        for (let i = 0; i < 20; i++) {
            const result = resolvePhone(config, makeLoc(), makeCtx());
            expect(["AAA", "BBB"]).toContain(result.phone);
        }
    });
});

describe("resolvePathRule", () => {
    it("matches by path substring", () => {
        const config: WhatsAppFloatingConfig = {
            pathRules: [{ path: "/promo", phone: "PROMO" }],
        };
        const result = resolvePathRule(config, makeCtx({ page: "/promo-verao" }));
        expect(result?.phone).toBe("PROMO");
    });

    it("does not match a different path", () => {
        const config: WhatsAppFloatingConfig = {
            pathRules: [{ path: "/promo", phone: "PROMO" }],
        };
        const result = resolvePathRule(config, makeCtx({ page: "/blog" }));
        expect(result).toBeNull();
    });

    it("matches by pathRegex", () => {
        const config: WhatsAppFloatingConfig = {
            pathRules: [{ pathRegex: "^/reserva/\\d+$", phone: "RESERVA" }],
        };
        const result = resolvePathRule(config, makeCtx({ page: "/reserva/42" }));
        expect(result?.phone).toBe("RESERVA");
    });

    it("a rule with neither path nor pathRegex never matches", () => {
        const config: WhatsAppFloatingConfig = {
            pathRules: [{ phone: "GHOST" }],
        };
        const result = resolvePathRule(config, makeCtx());
        expect(result).toBeNull();
    });

    it("path rule takes priority over location rules in resolvePhone", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "FALLBACK" },
            rules: [{ country: "BR", phone: "COUNTRY" }],
            pathRules: [{ path: "/especial", phone: "PATH" }],
        };
        const result = resolvePhone(config, makeLoc(), makeCtx({ page: "/especial" }));
        expect(result.phone).toBe("PATH");
        expect(result.matched).toBe("Path");
    });
});

describe("resolvePhone — roundrobin distribution", () => {
    it("cycles through numbers in order", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: {
                distribution: "roundrobin",
                numbers: [{ phone: "AAA" }, { phone: "BBB" }, { phone: "CCC" }],
            },
        };
        const phones = [1, 2, 3].map(() => resolvePhone(config, makeLoc(), makeCtx()).phone);
        expect(phones).toEqual(["AAA", "BBB", "CCC"]);
    });
});

describe("resolvePhone — UTM matching", () => {
    it("matches when UTM params match the rule", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "FALLBACK" },
            rules: [{ country: "BR", utm: { source: "google" }, phone: "GOOGLE" }],
        };
        const ctx = makeCtx({ utm: { utm_source: "google" } });
        const result = resolvePhone(config, makeLoc(), ctx);
        expect(result.phone).toBe("GOOGLE");
    });

    it("does not match when UTM params differ", () => {
        const config: WhatsAppFloatingConfig = {
            fallback: { phone: "FALLBACK" },
            rules: [{ country: "BR", utm: { source: "google" }, phone: "GOOGLE" }],
        };
        const ctx = makeCtx({ utm: { utm_source: "facebook" } });
        const result = resolvePhone(config, makeLoc(), ctx);
        expect(result.matched).toBe("Fallback");
    });
});
