import { type Comparator } from "@/comparators/index";

export class SoundexComparator implements Comparator {
  compare(a: string, b: string): number {
    if (a === "" && b === "") return 1.0;
    if (a === "" || b === "") return 0.0;

    const soundexA = this.soundex(a);
    const soundexB = this.soundex(b);
    return soundexA === soundexB ? 1.0 : 0.0;
  }

  /**
   * Generates the Soundex code for a given string.
   * Implements the standard Soundex algorithm.
   */
  private soundex(s: string): string {
    s = s.toUpperCase().replace(/[^A-Z]/g, ""); // Convert to uppercase, remove non-alphabetic
    if (!s) return "";

    let code = s[0];
    const mappings: Record<string, string> = {
      B: "1", F: "1", P: "1", V: "1",
      C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
      D: "3", T: "3",
      L: "4",
      M: "5", N: "5",
      R: "6",
    };

    let lastCode = mappings[s[0]!] ?? ""; // Store code for the first letter

    for (let i = 1; i < s.length; i++) {
      const char = s[i]!;
      const currentCode = mappings[char];

      // Step 2: Skip vowels and H, W, Y
      if (!currentCode) continue;

      // Step 4: Adjacency rule
      if (currentCode !== lastCode) {
        code += currentCode;
      }
      lastCode = currentCode;

      if (code.length === 4) break; // Truncate early
    }

    // Step 5: Pad with zeros and truncate to 4 characters
    return (code + "000").slice(0, 4);
  }
}
