import chalk from "chalk";
import Piscina from "piscina";
import type { Config } from "@/config/schema";
import type { Row } from "@/engine/types";
import { scoreRows } from "@/engine/scorer";
import { UnionFind } from "@/engine/grouper";
import type { WorkerInput, WorkerOutput } from "@/engine/worker";

/**
 * A simple console-based progress reporter for tracking block processing.
 */
interface ProgressReporter {
  _lastPercentage: number;
  _total: number;
  start: (total: number) => void;
  update: (current: number, total: number) => void;
  stop: () => void;
}

const simpleProgressReporter: ProgressReporter = {
  _lastPercentage: -1,
  _total: 0,
  start(total: number) {
    this._total = total;
    this._lastPercentage = -1;
    process.stdout.write(
      chalk.cyan("  Processing blocks: [") +
        chalk.gray("░".repeat(20)) +
        chalk.cyan("] 0%\r"),
    );
  },
  update(current: number, total: number) {
    const percentage = Math.floor((current / total) * 100);
    if (percentage > this._lastPercentage) {
      const filled = Math.floor(percentage / 5);
      const empty = 20 - filled;
      process.stdout.write(
        chalk.cyan("  Processing blocks: [") +
          chalk.green("█".repeat(filled)) +
          chalk.gray("░".repeat(empty)) +
          chalk.cyan(`] ${percentage}%\r`),
      );
      this._lastPercentage = percentage;
    }
  },
  stop() {
    process.stdout.write(
      chalk.cyan("  Processing blocks: [") +
        chalk.green("█".repeat(20)) +
        chalk.cyan("] 100% ✓\n"),
    );
  },
};

/**
 * Orchestrates the deduplication process.
 * Uses Piscina worker threads for parallel block processing, or falls back to full scan.
 */
export async function runDedup(
  rows: Row[],
  config: Config,
): Promise<Map<string, string>> {
  const uf = new UnionFind(rows.map((r) => String(r._id)));
  const { strategy, blocking_column, concurrency } = config.processing;
  const threshold = config.threshold;
  const rules = config.rules;

  let pool: Piscina | null = null;

  try {
    if (strategy === "block" && blocking_column) {
      console.log(
        chalk.cyan(
          `Processing with blocking strategy on column: ${blocking_column}`,
        ),
      );

      const blocks = groupByBlockingKey(rows, blocking_column);
      console.log(chalk.green(`✓ Generated ${blocks.size} blocks.`));
      console.log(
        chalk.cyan(
          `  Initializing worker pool with ${concurrency} threads...`,
        ),
      );

      // Initialize Piscina worker pool
      pool = new Piscina({
        filename: new URL("./worker.ts", import.meta.url).href,
        minThreads: 1,
        maxThreads: concurrency,
      });
      console.log(chalk.green("✓ Worker pool ready."));

      const blockKeys = Array.from(blocks.keys());
      const totalBlocks = blockKeys.length;
      let processedBlocks = 0;

      simpleProgressReporter.start(totalBlocks);

      // Map each block to a promise for worker execution
      const tasks: Promise<WorkerOutput>[] = blockKeys.map((key) => {
        const blockRows = blocks.get(key)!;
        const workerInput: WorkerInput = {
          rows: blockRows,
          rules,
          threshold,
        };
        return pool!.run(workerInput).then((result: WorkerOutput) => {
          processedBlocks++;
          simpleProgressReporter.update(processedBlocks, totalBlocks);
          return result;
        });
      });

      // Wait for all worker tasks to complete
      const allDuplicatePairs = await Promise.all(tasks);
      simpleProgressReporter.stop();

      console.log(chalk.cyan("Merging results from worker threads..."));
      let totalDuplicatesFound = 0;
      for (const duplicatePairs of allDuplicatePairs) {
        for (const [idA, idB] of duplicatePairs) {
          uf.union(idA!, idB!);
          totalDuplicatesFound++;
        }
      }
      console.log(
        chalk.green(
          `✓ Merged ${totalDuplicatesFound} duplicate pairs from workers.`,
        ),
      );
    } else {
      // Fallback to full_scan strategy or if blocking_column is missing
      console.log(
        chalk.cyan(
          "Processing with full scan strategy (or blocking_column missing).",
        ),
      );
      await processFullScan(rows, rules, threshold, uf);
    }

    console.log(`Found ${uf.getGroupCount()} distinct groups.`);
    return uf.getGroupMap();
  } finally {
    // Ensure the worker pool is destroyed even if an error occurs
    if (pool) {
      console.log(chalk.cyan("Shutting down worker pool..."));
      await pool.destroy();
      console.log(chalk.green("✓ Worker pool shut down."));
    }
  }
}

/**
 * Helper function to perform a full O(n^2) comparison within a set of rows.
 */
export async function processFullScan(
  rows: Row[],
  rules: Config["rules"],
  threshold: number,
  uf: UnionFind,
) {
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
export function groupByBlockingKey(
  rows: Row[],
  col: string,
): Map<string, Row[]> {
  const blocks = new Map<string, Row[]>();
  for (const row of rows) {
    const value = String(row[col] ?? "");
    // Simple blocking key: first 3 characters, lowercased.
    const key =
      value.length >= 3
        ? value.slice(0, 3).toLowerCase()
        : value.toLowerCase();

    if (!blocks.has(key)) {
      blocks.set(key, []);
    }
    blocks.get(key)!.push(row);
  }
  return blocks;
}
