import { type Comparator } from "@/comparators/index";

export class ExactComparator implements Comparator {
  compare(a: string, b: string): number {
    return a === b ? 1.0 : 0.0;
  }
}
