import { type Comparator } from "@/comparators/index";

export class NgramComparator implements Comparator {
  compare(a: string, b: string, options?: { n?: number }): number {
    const n = options?.n ?? 2; // Default to bigrams

    const cleanA = a.toLowerCase().trim();
    const cleanB = b.toLowerCase().trim();

    if (cleanA === cleanB) return 1.0;
    if (cleanA.length < n || cleanB.length < n) {
      return 0.0;
    }

    const setA = this.generateNgrams(cleanA, n);
    const setB = this.generateNgrams(cleanB, n);

    if (setA.size === 0 && setB.size === 0) return 1.0;
    if (setA.size === 0 || setB.size === 0) return 0.0;

    // Calculate intersection size
    let intersectionSize = 0;
    for (const gram of setA) {
      if (setB.has(gram)) {
        intersectionSize++;
      }
    }

    // Calculate Dice coefficient
    return (2 * intersectionSize) / (setA.size + setB.size);
  }

  private generateNgrams(s: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    if (s.length < n) return ngrams;
    for (let i = 0; i <= s.length - n; i++) {
      ngrams.add(s.substring(i, i + n));
    }
    return ngrams;
  }
}
