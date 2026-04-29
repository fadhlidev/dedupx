import { test, expect } from "bun:test";
import { processBlock, type WorkerInput } from "@/engine/worker";
import type { Row } from "@/engine/types";
import type { Rule } from "@/config/schema";

test("processBlock should return empty array when no duplicates exist", () => {
  const rows: Row[] = [
    { _id: "1", name: "Alice", email: "alice@example.com" },
    { _id: "2", name: "Bob", email: "bob@example.com" },
    { _id: "3", name: "Charlie", email: "charlie@example.com" },
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const input: WorkerInput = { rows, rules, threshold: 0.8 };
  const result = processBlock(input);
  expect(result).toEqual([]);
});

test("processBlock should identify exact duplicate pairs", () => {
  const rows: Row[] = [
    { _id: "1", name: "John Doe", email: "john@example.com" },
    { _id: "2", name: "John Doe", email: "john@example.com" },
    { _id: "3", name: "Jane Smith", email: "jane@example.com" },
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const input: WorkerInput = { rows, rules, threshold: 0.8 };
  const result = processBlock(input);
  expect(result).toEqual([["1", "2"]]);
});

test("processBlock should identify fuzzy duplicate pairs above threshold", () => {
  const rows: Row[] = [
    { _id: "1", name: "John Doe" },
    { _id: "2", name: "Jhon Doe" },   // typo, fuzzy match
    { _id: "3", name: "Alice Wonder" }, // completely different
  ];
  const rules: Rule[] = [
    { name: "name fuzzy", columns: ["name"], comparator: "fuzzy", weight: 1.0 },
  ];
  const input: WorkerInput = { rows, rules, threshold: 0.8 };
  const result = processBlock(input);

  // "John Doe" vs "Jhon Doe" should score high (>0.8 via jaro_winkler)
  expect(result.length).toBe(1);
  expect(result[0]).toEqual(["1", "2"]);
});

test("processBlock should return multiple duplicate pairs when multiple matches exist", () => {
  const rows: Row[] = [
    { _id: "1", name: "John Doe" },
    { _id: "2", name: "John Doe" },
    { _id: "3", name: "John Doe" },
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const input: WorkerInput = { rows, rules, threshold: 0.8 };
  const result = processBlock(input);

  // All pairs: (1,2), (1,3), (2,3)
  expect(result).toEqual([
    ["1", "2"],
    ["1", "3"],
    ["2", "3"],
  ]);
});

test("processBlock should handle single row without errors", () => {
  const rows: Row[] = [
    { _id: "1", name: "John Doe" },
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const input: WorkerInput = { rows, rules, threshold: 0.8 };
  const result = processBlock(input);
  expect(result).toEqual([]);
});

test("processBlock should handle empty rows without errors", () => {
  const rows: Row[] = [];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const input: WorkerInput = { rows, rules, threshold: 0.8 };
  const result = processBlock(input);
  expect(result).toEqual([]);
});

test("processBlock should respect threshold - no matches below threshold", () => {
  const rows: Row[] = [
    { _id: "1", name: "John" },
    { _id: "2", name: "Jonathan" }, // similar but may not meet 0.95
  ];
  const rules: Rule[] = [
    { name: "name fuzzy", columns: ["name"], comparator: "fuzzy", weight: 1.0, options: { algorithm: "levenshtein" } },
  ];
  // Levenshtein: "john" vs "jonathan" = distance 4, maxLen 8 -> 1 - (4/8) = 0.5
  const input: WorkerInput = { rows, rules, threshold: 0.95 };
  const result = processBlock(input);
  expect(result).toEqual([]);
});

test("processBlock should use weighted rules correctly", () => {
  const rows: Row[] = [
    { _id: "1", name: "John", email: "john@example.com" },
    { _id: "2", name: "Jane", email: "john@example.com" }, // different name, same email
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 0.3 },
    { name: "email exact", columns: ["email"], comparator: "exact", weight: 0.7 },
  ];
  // Score: (0.0 * 0.3 + 1.0 * 0.7) / (0.3 + 0.7) = 0.7
  // With threshold 0.6, this should match
  const input: WorkerInput = { rows, rules, threshold: 0.6 };
  const result = processBlock(input);
  expect(result).toEqual([["1", "2"]]);
});
