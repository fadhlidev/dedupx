import { test, expect } from "bun:test";
import { SoundexComparator } from "@/comparators/soundex";

test("SoundexComparator should return 1.0 for phonetically similar names", () => {
  const comparator = new SoundexComparator();
  expect(comparator.compare("Robert", "Rupert")).toBe(1.0);
  expect(comparator.compare("Ashcraft", "Ashcroft")).toBe(1.0);
  expect(comparator.compare("Euler", "Eyler")).toBe(1.0);
});

test("SoundexComparator should return 0.0 for phonetically different names", () => {
  const comparator = new SoundexComparator();
  expect(comparator.compare("Robert", "Smith")).toBe(0.0);
});

test("SoundexComparator should handle case insensitivity", () => {
  const comparator = new SoundexComparator();
  expect(comparator.compare("Robert", "robert")).toBe(1.0);
});

test("SoundexComparator should handle empty or single-character strings", () => {
  const comparator = new SoundexComparator();
  expect(comparator.compare("", "")).toBe(1.0);
  expect(comparator.compare("A", "A")).toBe(1.0);
  expect(comparator.compare("A", "B")).toBe(0.0);
});
