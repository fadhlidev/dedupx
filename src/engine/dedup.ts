import chalk from "chalk";
import type { Config } from "@/config/schema";
import type { Row } from "@/engine/types";
import { scoreRows } from "@/engine/scorer";
import { UnionFind } from "@/engine/grouper";

/**
 * Orchestrates the deduplication process.
 * Decides between full scan or blocking strategy and identifies duplicate groups.
 */
export async function runDedup(rows: Row[], config: Config): Promise<Map<string, string>> {
  const uf = new UnionFind(rows.map(r => String(r._id)));
  const { strategy, blocking_column } = config.processing;
  const threshold = config.threshold;
  const rules = config.rules;

  if (strategy === "block" && blocking_column) {
    console.log(chalk.cyan(`Processing with blocking strategy on column: ${blocking_column}`));
    const blocks = groupByBlockingKey(rows, blocking_column);
    console.log(chalk.green(`✓ Generated ${blocks.size} blocks.`));
    console.log(chalk.dim("  (Phase 3: Processing blocks sequentially with full scan logic within each block)"));

    for (const [key, blockRows] of blocks) {
      // In Phase 3, we process blocks sequentially. Parallelism comes in Phase 4.
      await processFullScan(blockRows, rules, threshold, uf);
    }
  } else {
    console.log(chalk.cyan("Processing with full scan strategy."));
    await processFullScan(rows, rules, threshold, uf);
  }

  return uf.getGroupMap();
}

/**
 * Helper function to perform a full O(n^2) comparison within a set of rows.
 */
export async function processFullScan(rows: Row[], rules: Config["rules"], threshold: number, uf: UnionFind) {
  const numRows = rows.length;
  for (let i = 0; i < numRows; i++) {
    for (let j = i + 1; j < numRows; j++) {
      const rowA = rows[i]!;
      const rowB = rows[j]!;

      // Optimization: skip if they are already in the same group
      if (uf.find(rowA._id) === uf.find(rowB._id)) {
        continue;
      }

      const score = scoreRows(rowA, rowB, rules);

      if (score >= threshold) {
        uf.union(rowA._id, rowB._id);
      }
    }
  }
}

/**
 * Groups rows by a blocking key derived from a specific column.
 */
export function groupByBlockingKey(rows: Row[], col: string): Map<string, Row[]> {
  const blocks = new Map<string, Row[]>();
  for (const row of rows) {
    const value = String(row[col] ?? "");
    // Simple blocking key: first 3 characters, lowercased.
    const key = value.length >= 3 ? value.slice(0, 3).toLowerCase() : value.toLowerCase();

    if (!blocks.has(key)) {
      blocks.set(key, []);
    }
    blocks.get(key)!.push(row);
  }
  return blocks;
}
