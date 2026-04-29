import { test, expect } from "bun:test";
import { NgramComparator } from "@/comparators/ngram";

test("NgramComparator (n=2) should return 1.0 for identical strings", () => {
  const comparator = new NgramComparator();
  expect(comparator.compare("apple", "apple", { n: 2 })).toBe(1.0);
  expect(comparator.compare("", "", { n: 2 })).toBe(1.0);
});

test("NgramComparator (n=2) should return partial scores for similar strings", () => {
  const comparator = new NgramComparator();
  // "apple" (ap, pp, pl, le) vs "aple" (ap, pl, le) - 3 common bigrams, sizes 4 and 3
  expect(comparator.compare("apple", "aple", { n: 2 })).toBeCloseTo((2 * 3) / (4 + 3)); // 6/7 = 0.857
});

test("NgramComparator (n=2) should return 0.0 for very different strings", () => {
  const comparator = new NgramComparator();
  expect(comparator.compare("apple", "banana", { n: 2 })).toBe(0.0);
});

test("NgramComparator should handle strings shorter than N", () => {
  const comparator = new NgramComparator();
  expect(comparator.compare("a", "a", { n: 2 })).toBe(1.0);
  expect(comparator.compare("a", "b", { n: 2 })).toBe(0.0);
});
