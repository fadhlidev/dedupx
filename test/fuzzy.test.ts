import { test, expect } from "bun:test";
import { FuzzyComparator } from "@/comparators/fuzzy";

test("FuzzyComparator (Jaro-Winkler) should return high score for similar strings", () => {
  const comparator = new FuzzyComparator();
  expect(comparator.compare("MARTHA", "MARHTA")).toBeGreaterThan(0.9); // Transposition
  expect(comparator.compare("DIXON", "DICKSONX")).toBeGreaterThan(0.7); // Longer, some difference
  expect(comparator.compare("DWAYNE", "DUANE")).toBeGreaterThan(0.8);
  expect(comparator.compare("JONES", "JOHNSON")).toBeGreaterThan(0.7);
  expect(comparator.compare("hello", "hallo")).toBeGreaterThan(0.8);
  expect(comparator.compare("test", "test")).toBe(1.0);
  expect(comparator.compare("", "")).toBe(1.0);
});

test("FuzzyComparator (Jaro-Winkler) should return low score for very different strings", () => {
  const comparator = new FuzzyComparator();
  expect(comparator.compare("apple", "banana")).toBeLessThan(0.5);
  expect(comparator.compare("abc", "xyz")).toBeLessThan(0.2);
});

test("FuzzyComparator (Levenshtein) should return high score for similar strings", () => {
  const comparator = new FuzzyComparator();
  const options = { algorithm: "levenshtein" } as const;
  expect(comparator.compare("kitten", "sitting", options)).toBeCloseTo(1 - (3/7)); // 3 edits, max length 7
  expect(comparator.compare("test", "test", options)).toBe(1.0);
});
