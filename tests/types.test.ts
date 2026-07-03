/**
 * PillConfig field validation tests — confirm the new optional fields
 * are correctly typed and flow through to the config without TS errors.
 * This file is also a compile-time check: if it builds, the type extensions
 * in src/types.ts are correct.
 */
import { describe, expect, it } from "bun:test";
import type { PillConfig, WhatsAppFloatingConfig } from "../src/types";

describe("PillConfig — new styling fields", () => {
    it("accepts all new optional styling fields", () => {
        const pill: PillConfig = {
            text: "Fale conosco",
            expand: "hover",
            icon: "solid",
            color: "#128C7E",
            textColor: "#f0f0f0",
            fontSize: 16,
            fontWeight: 700,
            paddingRight: 24,
            borderRadius: 8,
        };
        expect(pill.text).toBe("Fale conosco");
        expect(pill.color).toBe("#128C7E");
        expect(pill.textColor).toBe("#f0f0f0");
        expect(pill.fontSize).toBe(16);
        expect(pill.fontWeight).toBe(700);
        expect(pill.paddingRight).toBe(24);
        expect(pill.borderRadius).toBe(8);
    });

    it("all new fields are optional (minimal config still valid)", () => {
        const pill: PillConfig = { text: "Chat" };
        expect(pill.text).toBe("Chat");
        expect(pill.color).toBeUndefined();
        expect(pill.textColor).toBeUndefined();
        expect(pill.fontSize).toBeUndefined();
    });

    it("expand values are all accepted", () => {
        const values: Array<PillConfig["expand"]> = ["hover", "always", "click", "never"];
        values.forEach((v) => {
            const p: PillConfig = { text: "x", expand: v };
            expect(p.expand).toBe(v);
        });
    });

    it("can be embedded in WhatsAppFloatingConfig", () => {
        const config: WhatsAppFloatingConfig = {
            pill: {
                text: "Reservar",
                color: "#ff6600",
                textColor: "#ffffff",
                borderRadius: 4,
            },
            fallback: { phone: "5511999999999" },
        };
        expect(config.pill?.color).toBe("#ff6600");
        expect(config.pill?.borderRadius).toBe(4);
    });
});
