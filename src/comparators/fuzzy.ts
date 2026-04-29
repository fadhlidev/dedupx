import { distance as levenshteinDistance } from "fastest-levenshtein";
import { type Comparator } from "@/comparators/index";

export class FuzzyComparator implements Comparator {
  compare(a: string, b: string, options?: { algorithm?: "levenshtein" | "jaro_winkler" }): number {
    const algorithm = options?.algorithm ?? "jaro_winkler";

    if (algorithm === "levenshtein") {
      const maxLen = Math.max(a.length, b.length);
      if (maxLen === 0) return 1.0; // Both empty strings are a perfect match
      return 1.0 - (levenshteinDistance(a, b) / maxLen);
    } else if (algorithm === "jaro_winkler") {
      return this.jaroWinkler(a, b);
    } else {
      throw new Error(`Unknown fuzzy algorithm: ${algorithm}`);
    }
  }

  /**
   * Jaro-Winkler Similarity Algorithm.
   * A robust string similarity metric, especially good for short strings like names.
   */
  private jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0 || len2 === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(len2 - 1, i + matchWindow);

      for (let j = start; j <= end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Calculate transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    transpositions /= 2;

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3;

    // Winkler modification
    const prefixScale = 0.1; // Common scaling factor
    let commonPrefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) { // Max prefix length of 4
      if (s1[i] === s2[i]) commonPrefix++;
      else break;
    }

    return jaro + commonPrefix * prefixScale * (1 - jaro);
  }
}
