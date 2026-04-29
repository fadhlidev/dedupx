import { type Comparator } from "./index";

export class NumericComparator implements Comparator {
  compare(a: string, b: string, options?: { max_relative_diff?: number }): number {
    const numA = parseFloat(a);
    const numB = parseFloat(b);

    if (isNaN(numA) || isNaN(numB)) {
      return 0.0;
    }

    if (numA === numB) {
      return 1.0;
    }

    if (numA === 0 && numB === 0) {
      return 1.0;
    }
    if (numA === 0 || numB === 0) {
      return 0.0;
    }

    const absoluteDifference = Math.abs(numA - numB);
    const average = (Math.abs(numA) + Math.abs(numB)) / 2;

    const relativeDifferenceScore = 1.0 - absoluteDifference / average;

    const maxRelativeDiff = options?.max_relative_diff;
    if (maxRelativeDiff !== undefined && maxRelativeDiff >= 0) {
      const actualRelativeDiff = absoluteDifference / average;
      if (actualRelativeDiff > maxRelativeDiff) {
        return 0.0;
      }
    }

    return Math.max(0.0, relativeDifferenceScore);
  }
}
