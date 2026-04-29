import { test, expect } from "bun:test";
import { ExactComparator } from "@/comparators/exact";

test("ExactComparator should return 1.0 for identical strings", () => {
  const comparator = new ExactComparator();
  expect(comparator.compare("hello", "hello")).toBe(1.0);
  expect(comparator.compare("WORLD", "WORLD")).toBe(1.0);
  expect(comparator.compare("", "")).toBe(1.0);
});

test("ExactComparator should return 0.0 for different strings", () => {
  const comparator = new ExactComparator();
  expect(comparator.compare("hello", "world")).toBe(0.0);
  expect(comparator.compare("hello", "Hello")).toBe(0.0); // Case-sensitive
  expect(comparator.compare(" test", "test")).toBe(0.0);   // Whitespace matters
  expect(comparator.compare("123", "123.0")).toBe(0.0);
  expect(comparator.compare("a", "")).toBe(0.0);
});
