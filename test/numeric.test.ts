import { test, expect } from "bun:test";
import { NumericComparator } from "@/comparators/numeric";

test("NumericComparator should return 1.0 for identical numbers", () => {
  const comparator = new NumericComparator();
  expect(comparator.compare("100", "100")).toBe(1.0);
  expect(comparator.compare("0", "0")).toBe(1.0);
});

test("NumericComparator should return scores based on relative difference", () => {
  const comparator = new NumericComparator();
  expect(comparator.compare("100", "101")).toBeCloseTo(1 - (1/100.5));
  expect(comparator.compare("10", "20")).toBeCloseTo(1 - (10/15));
});

test("NumericComparator should respect max_relative_diff option", () => {
  const comparator = new NumericComparator();
  expect(comparator.compare("100", "101", { max_relative_diff: 0.01 })).toBeCloseTo(1 - (1/100.5));
  expect(comparator.compare("100", "102", { max_relative_diff: 0.01 })).toBe(0.0);
});
