import { describe, expect, it } from "bun:test";
import { getContinent, isObject, merge, normalize, safeJSONParse } from "../src/utils";

describe("normalize", () => {
    it("lowercases and removes diacritics", () => {
        expect(normalize("São Paulo")).toBe("sao paulo");
        expect(normalize("BRASIL")).toBe("brasil");
        expect(normalize("Ação")).toBe("acao");
    });

    it("trims whitespace", () => {
        expect(normalize("  ok  ")).toBe("ok");
    });

    it("handles null/undefined gracefully", () => {
        expect(normalize(null)).toBe("");
        expect(normalize(undefined)).toBe("");
    });

    it("coerces numbers to strings", () => {
        expect(normalize(42)).toBe("42");
    });
});

describe("isObject", () => {
    it("returns true for plain objects", () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ a: 1 })).toBe(true);
    });

    it("returns false for arrays, null, primitives", () => {
        expect(isObject([])).toBe(false);
        expect(isObject(null)).toBe(false);
        expect(isObject("str")).toBe(false);
        expect(isObject(42)).toBe(false);
    });
});

describe("merge", () => {
    it("deep merges nested objects", () => {
        const base = { a: 1, b: { c: 2, d: 3 } };
        const src = { b: { c: 99 }, e: 5 };
        expect(merge(base, src)).toEqual({ a: 1, b: { c: 99, d: 3 }, e: 5 });
    });

    it("does not mutate the target", () => {
        const base = { a: 1 };
        merge(base, { a: 2 });
        expect(base.a).toBe(1);
    });

    it("overwrites primitives from source", () => {
        expect(merge({ a: "old" }, { a: "new" })).toEqual({ a: "new" });
    });

    it("treats arrays as atomic (replaces, does not concat)", () => {
        const result = merge({ items: [1, 2] }, { items: [3] });
        expect(result.items).toEqual([3]);
    });
});

describe("safeJSONParse", () => {
    it("parses valid JSON", () => {
        expect(safeJSONParse('{"a":1}', null)).toEqual({ a: 1 });
    });

    it("returns fallback on invalid JSON", () => {
        expect(safeJSONParse("not json", "fallback")).toBe("fallback");
    });
});

describe("getContinent", () => {
    it("maps Brazil to SA", () => {
        expect(getContinent("BR")).toBe("SA");
    });

    it("maps US to NA", () => {
        expect(getContinent("US")).toBe("NA");
    });

    it("maps DE to EU", () => {
        expect(getContinent("DE")).toBe("EU");
    });

    it("maps JP to AS", () => {
        expect(getContinent("JP")).toBe("AS");
    });

    it("returns null for unknown code", () => {
        expect(getContinent("XX")).toBe(null);
    });

    it("returns null for null input", () => {
        expect(getContinent(null)).toBe(null);
    });
});
