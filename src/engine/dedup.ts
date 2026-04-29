import chalk from "chalk";
import Piscina from "piscina";
import type { Config } from "@/config/schema";
import type { Row } from "@/engine/types";
import { scoreRows } from "@/engine/scorer";
import { UnionFind } from "@/engine/grouper";
import type { WorkerInput, WorkerOutput } from "@/engine/worker";
import { logger } from "@/utils/logger";

import type { DedupProgressBar } from "@/reporter/progress";
import type { WorkerMatchDetail } from "@/engine/worker";

export type DedupMetadata = {
  _id: string;
  canonical_id: string;
  group_id: string;
  is_duplicate: boolean;
  duplicate_score: number | null;
  matched_rules: string[];
};

/**
 * Orchestrates the deduplication process.
 * Uses Piscina worker threads for parallel block processing, or falls back to full scan.
 */
export async function runDedup(
  rows: Row[],
  config: Config,
  progressBar?: DedupProgressBar
): Promise<{ groupMap: Map<string, string>; dedupMetadata: DedupMetadata[] }> {
  const uf = new UnionFind(rows.map((r) => String(r._id)));
  const { strategy, blocking_column, concurrency } = config.processing;
  const threshold = config.threshold;
  const rules = config.rules;

  let pool: Piscina | null = null;

  let allMatchDetails: WorkerMatchDetail[] = [];

  try {
    if (strategy === "block" && blocking_column) {
      if (progressBar) progressBar.start("Building blocks", 1);
      const blocks = groupByBlockingKey(rows, blocking_column);
      if (progressBar) progressBar.stop("Building blocks");

      // Initialize Piscina worker pool
      pool = new Piscina({
        filename: new URL("./worker.ts", import.meta.url).href,
        minThreads: 1,
        maxThreads: concurrency,
      });

      const blockKeys = Array.from(blocks.keys());
      const totalBlocks = blockKeys.length;
      
      if (progressBar) progressBar.start("Comparing pairs", totalBlocks);

      // Map each block to a promise for worker execution
      const tasks: Promise<WorkerOutput>[] = blockKeys.map((key) => {
        const blockRows = blocks.get(key)!;
        const workerInput: WorkerInput = {
          rows: blockRows,
          rules,
          threshold,
        };
        return pool!.run(workerInput).then((result: WorkerOutput) => {
          if (progressBar) progressBar.increment("Comparing pairs");
          return result;
        }).catch((err: unknown) => {
          logger.error("Worker error:", err);
          throw err;
        });
      });

      // Wait for all worker tasks to complete
      const allDuplicatePairs = await Promise.all(tasks);
      if (progressBar) progressBar.stop("Comparing pairs");

      for (const duplicatePairs of allDuplicatePairs) {
        allMatchDetails.push(...duplicatePairs);
        for (const { idA, idB } of duplicatePairs) {
          uf.union(idA!, idB!);
        }
      }
    } else {
      // Fallback to full_scan strategy or if blocking_column is missing
      if (progressBar) progressBar.start("Comparing pairs", 1);
      const matchDetails = await processFullScan(rows, rules, threshold, uf);
      allMatchDetails.push(...matchDetails);
      if (progressBar) progressBar.stop("Comparing pairs");
    }

    const groupMap = uf.getGroupMap();
    
    // Calculate best score and matched rules for each duplicate row
    const metadataMap = new Map<string, { maxScore: number, rules: Set<string> }>();
    for (const match of allMatchDetails) {
      const updateMeta = (id: string, score: number, rules: string[]) => {
        const existing = metadataMap.get(id);
        if (!existing || score > existing.maxScore) {
          metadataMap.set(id, { maxScore: score, rules: new Set(rules) });
        } else if (score === existing.maxScore) {
          rules.forEach(r => existing.rules.add(r));
        }
      };
      updateMeta(match.idA, match.score, match.matchedRules);
      updateMeta(match.idB, match.score, match.matchedRules);
    }

    const dedupMetadata: DedupMetadata[] = rows.map(r => {
      const idStr = String(r._id);
      const canonical_id = groupMap.get(idStr) || idStr;
      const group_id = canonical_id;
      const is_duplicate = canonical_id !== idStr;
      let duplicate_score: number | null = null;
      let matched_rules: string[] = [];

      if (is_duplicate || metadataMap.has(idStr)) {
        const meta = metadataMap.get(idStr);
        if (meta) {
          duplicate_score = meta.maxScore;
          matched_rules = Array.from(meta.rules);
        }
      }

      return {
        _id: idStr,
        canonical_id,
        group_id,
        is_duplicate,
        duplicate_score,
        matched_rules
      };
    });

    return { groupMap, dedupMetadata };
  } finally {
    // Ensure the worker pool is destroyed even if an error occurs
    if (pool) {
      // await pool.destroy();
    }
  }
}

export async function processFullScan(
  rows: Row[],
  rules: Config["rules"],
  threshold: number,
  uf: UnionFind,
): Promise<import("@/engine/worker").WorkerMatchDetail[]> {
  const numRows = rows.length;
  const matchDetails: import("@/engine/worker").WorkerMatchDetail[] = [];

  for (let i = 0; i < numRows; i++) {
    for (let j = i + 1; j < numRows; j++) {
      const rowA = rows[i]!;
      const rowB = rows[j]!;

      // Optimization: skip if they are already in the same group
      if (uf.find(rowA._id) === uf.find(rowB._id)) {
        continue;
      }

      const { score, matchedRules } = scoreRows(rowA, rowB, rules);

      if (score >= threshold) {
        uf.union(rowA._id, rowB._id);
        matchDetails.push({
          idA: rowA._id,
          idB: rowB._id,
          score,
          matchedRules,
        });
      }
    }
  }

  return matchDetails;
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
