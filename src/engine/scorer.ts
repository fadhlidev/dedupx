import type { Rule } from "@/config/schema";
import { comparatorRegistry } from "@/comparators";
import type { Row } from "@/engine/types";

/**
 * Calculates a combined similarity score between two Row objects based on configured rules.
 * The score is a weighted average of individual comparator scores.
 */
export function scoreRows(rowA: Row, rowB: Row, rules: Rule[]): number {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const rule of rules) {
    // Concatenate column values into a single string for comparison
    const valA = rule.columns.map(c => String(rowA[c] ?? "")).join(" ");
    const valB = rule.columns.map(c => String(rowB[c] ?? "")).join(" ");

    const comparator = comparatorRegistry[rule.comparator];
    if (!comparator) {
      console.warn(`Comparator '${rule.comparator}' not found. Skipping rule: ${rule.name}`);
      continue;
    }

    let score: number;
    // Apply toLowerCase only if the comparator is not 'exact', as 'exact' should be case-sensitive.
    // Also 'numeric' probably shouldn't be lowercased (though it's string anyway).
    if (rule.comparator !== "exact" && rule.comparator !== "numeric") {
      score = comparator.compare(valA.toLowerCase(), valB.toLowerCase(), rule.options as any);
    } else {
      score = comparator.compare(valA, valB, rule.options as any);
    }

    weightedScore += score * rule.weight;
    totalWeight += rule.weight;
  }

  // Avoid division by zero if no rules or all weights are zero
  return totalWeight === 0 ? 0 : weightedScore / totalWeight;
}
