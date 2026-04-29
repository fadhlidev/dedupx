import { scoreRows } from "@/engine/scorer";
import type { Rule } from "@/config/schema";
import type { Row } from "@/engine/types";

/**
 * The input type for the worker function.
 * Contains the subset of rows to process, the rules to apply, and the similarity threshold.
 */
export type WorkerInput = {
  rows: Row[];
  rules: Rule[];
  threshold: number;
};

/**
 * The output type for the worker function.
 * An array of tuples, where each tuple represents a pair of row IDs identified as duplicates.
 */
export type WorkerOutput = [string, string][];

/**
 * The main function executed by each worker thread.
 * It compares all unique pairs within its assigned block of rows and returns identified duplicates.
 * @param input The WorkerInput containing rows, rules, and threshold.
 * @returns An array of duplicate pairs (row ID tuples).
 */
export function processBlock(input: WorkerInput): WorkerOutput {
  const { rows, rules, threshold } = input;
  const duplicatesFound: WorkerOutput = [];
  const numRows = rows.length;

  // This is essentially the `processFullScan` logic, but applied only to the worker's block.
  for (let i = 0; i < numRows; i++) {
    for (let j = i + 1; j < numRows; j++) {
      const rowA = rows[i]!;
      const rowB = rows[j]!;

      const score = scoreRows(rowA, rowB, rules);

      if (score >= threshold) {
        duplicatesFound.push([rowA._id, rowB._id]);
      }
    }
  }
  return duplicatesFound;
}

export default processBlock;
