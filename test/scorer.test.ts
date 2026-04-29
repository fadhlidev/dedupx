import { test, expect, spyOn } from "bun:test";
import { scoreRows } from "@/engine/scorer";
import type { Rule } from "@/config/schema";
import type { Row } from "@/engine/types";
import "@/comparators"; // Ensure comparators are registered

test("scoreRows should return 1.0 for exact matches with single rule", () => {
  const row1: Row = { _id: "1", name: "John Doe", email: "john@example.com" };
  const row2: Row = { _id: "2", name: "John Doe", email: "john@example.com" };
  const rules: Rule[] = [{ name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 }];
  expect(scoreRows(row1, row2, rules)).toEqual({ score: 1.0, matchedRules: ["name exact"] });
});

test("scoreRows should return 0.0 for no match with single rule", () => {
  const row1: Row = { _id: "1", name: "John Doe", email: "john@example.com" };
  const row2: Row = { _id: "2", name: "Jane Smith", email: "jane@example.com" };
  const rules: Rule[] = [{ name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 }];
  expect(scoreRows(row1, row2, rules)).toEqual({ score: 0.0, matchedRules: [] });
});

test("scoreRows should calculate weighted average for multiple rules", () => {
  const row1: Row = { _id: "1", name: "John Doe", email: "john@example.com" };
  const row2: Row = { _id: "2", name: "Jonh Doe", email: "john.doe@example.com" }; // Typo in name, different email
  const rules: Rule[] = [
    { name: "name fuzzy", columns: ["name"], comparator: "fuzzy", weight: 0.7, options: { algorithm: "levenshtein" } },
    { name: "email exact", columns: ["email"], comparator: "exact", weight: 0.3 },
  ];

  // "John Doe" vs "Jonh Doe" (Levenshtein): 2 edits (h->n, n->h), max len 8 -> 1 - (2/8) = 0.75
  // "john@example.com" vs "john.doe@example.com" (Exact): 0.0
  // Expected score: (0.75 * 0.7) + (0.0 * 0.3) / (0.7 + 0.3) = 0.525 / 1.0 = 0.525
  const result = scoreRows(row1, row2, rules);
  expect(result.score).toBeCloseTo(0.525);
  expect(result.matchedRules).toEqual(["name fuzzy"]);
});

test("scoreRows should handle different casing for non-exact comparators", () => {
  const row1: Row = { _id: "1", name: "John Doe" };
  const row2: Row = { _id: "2", name: "john doe" };
  const rulesFuzzy: Rule[] = [{ name: "name fuzzy", columns: ["name"], comparator: "fuzzy", weight: 1.0 }];
  const rulesExact: Rule[] = [{ name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 }];

  // Fuzzy should ignore case (due to toLowerCase in scorer)
  expect(scoreRows(row1, row2, rulesFuzzy)).toEqual({ score: 1.0, matchedRules: ["name fuzzy"] });
  // Exact should be case-sensitive
  expect(scoreRows(row1, row2, rulesExact)).toEqual({ score: 0.0, matchedRules: [] });
});

test("scoreRows should handle combined columns", () => {
  const row1: Row = { _id: "1", first: "John", last: "Doe" };
  const row2: Row = { _id: "2", first: "Jon", last: "Doh" };
  const rules: Rule[] = [{ name: "full name fuzzy", columns: ["first", "last"], comparator: "fuzzy", weight: 1.0 }];

  const result = scoreRows(row1, row2, rules);
  expect(result.score).toBeGreaterThan(0.0);
  expect(result.score).toBeLessThan(1.0);
  expect(result.matchedRules).toEqual(["full name fuzzy"]);
});

test("scoreRows should return 0 if no rules are provided", () => {
  const row1: Row = { _id: "1", name: "John Doe" };
  const row2: Row = { _id: "2", name: "Jonh Doe" };
  const rules: Rule[] = [];
  expect(scoreRows(row1, row2, rules)).toEqual({ score: 0.0, matchedRules: [] });
});

test("scoreRows should handle null/undefined column values gracefully", () => {
  const row1: Row = { _id: "1", name: "John", email: null as any };
  const row2: Row = { _id: "2", name: "John", email: undefined };
  const rules: Rule[] = [{ name: "email exact", columns: ["email"], comparator: "exact", weight: 1.0 }];

  // String(null ?? "") is "", String(undefined ?? "") is ""
  // "" === ""
  expect(scoreRows(row1, row2, rules)).toEqual({ score: 1.0, matchedRules: ["email exact"] });

  const rulesFuzzy: Rule[] = [{ name: "email fuzzy", columns: ["email"], comparator: "fuzzy", weight: 1.0 }];
  expect(scoreRows(row1, row2, rulesFuzzy)).toEqual({ score: 1.0, matchedRules: ["email fuzzy"] });
});

test("scoreRows should warn and skip unknown comparators", () => {
  const row1: Row = { _id: "1", name: "John Doe" };
  const row2: Row = { _id: "2", name: "Jane Smith" };
  const rules: Rule[] = [
    { name: "unknown", columns: ["name"], comparator: "unknown_comparator" as any, weight: 1.0 }
  ];

  const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => { });

  expect(scoreRows(row1, row2, rules)).toEqual({ score: 0.0, matchedRules: [] });
  expect(consoleWarnSpy).toHaveBeenCalled();

  consoleWarnSpy.mockRestore();
});
