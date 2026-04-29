import { z } from "zod";

const ComparatorEnum = z.enum(["exact", "fuzzy", "soundex", "ngram", "numeric"]);

const RuleSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()).min(1),
  comparator: ComparatorEnum,
  options: z.record(z.string(), z.unknown()).optional(),
  weight: z.number().min(0).max(1).default(1.0),
});

export const ConfigSchema = z.object({
  source: z.object({
    connection: z.string(),
    driver: z.enum(["postgres", "mysql", "sqlite"]),
    table: z.string(),
  }),
  output: z.object({
    schema: z.string().optional(),
  }).optional(),
  rules: z.array(RuleSchema).min(1),
  threshold: z.number().min(0).max(1),
  processing: z.object({
    batch_size: z.number().int().positive().default(500),
    concurrency: z.number().int().min(1).max(32).default(4),
    strategy: z.enum(["block", "full_scan"]).default("block"),
    blocking_column: z.string().optional(),
  }).default({
    batch_size: 500,
    concurrency: 4,
    strategy: "block",
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;
