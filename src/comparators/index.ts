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
export { ExactComparator } from "./exact";
export { FuzzyComparator } from "./fuzzy";
export { SoundexComparator } from "./soundex";
export { NgramComparator } from "./ngram";
export { NumericComparator } from "./numeric";

import { ExactComparator } from "./exact";
import { FuzzyComparator } from "./fuzzy";
import { SoundexComparator } from "./soundex";
import { NgramComparator } from "./ngram";
import { NumericComparator } from "./numeric";

// Export the comparator registry
export const comparatorRegistry: Record<string, Comparator> = {
  exact: new ExactComparator(),
  fuzzy: new FuzzyComparator(),
  soundex: new SoundexComparator(),
  ngram: new NgramComparator(),
  numeric: new NumericComparator(),
};
