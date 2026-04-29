export interface Comparator {
  /**
   * Compares two strings and returns a similarity score between 0.0 (no similarity) and 1.0 (exact match).
   * @param a The first string to compare.
   * @param b The second string to compare.
   * @param options Optional settings specific to the comparator (e.g., algorithm for fuzzy).
   */
  compare(a: string, b: string, options?: Record<string, unknown>): number; // 0.0 – 1.0
}

// Export individual comparators
export { ExactComparator } from "@/comparators/exact";
export { FuzzyComparator } from "@/comparators/fuzzy";
export { SoundexComparator } from "@/comparators/soundex";
export { NgramComparator } from "@/comparators/ngram";
export { NumericComparator } from "@/comparators/numeric";

import { ExactComparator } from "@/comparators/exact";
import { FuzzyComparator } from "@/comparators/fuzzy";
import { SoundexComparator } from "@/comparators/soundex";
import { NgramComparator } from "@/comparators/ngram";
import { NumericComparator } from "@/comparators/numeric";

// Export the comparator registry
export const comparatorRegistry: Record<string, Comparator> = {
  exact: new ExactComparator(),
  fuzzy: new FuzzyComparator(),
  soundex: new SoundexComparator(),
  ngram: new NgramComparator(),
  numeric: new NumericComparator(),
};
