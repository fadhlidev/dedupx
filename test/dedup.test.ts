import { test, expect } from "bun:test";
import { processFullScan, groupByBlockingKey } from "@/engine/dedup";
import { UnionFind } from "@/engine/grouper";
import type { Row } from "@/engine/types";
import type { Rule } from "@/config/schema";

test("processFullScan should group exact duplicates via UnionFind", async () => {
  const rows: Row[] = [
    { _id: "1", name: "John Doe" },
    { _id: "2", name: "John Doe" },
    { _id: "3", name: "Jane Smith" },
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const uf = new UnionFind(rows.map((r) => r._id));
  await processFullScan(rows, rules, 0.8, uf);

  // 1 and 2 should be in the same group
  expect(uf.find("1")).toBe(uf.find("2"));
  // 3 should be in its own group
  expect(uf.find("3")).not.toBe(uf.find("1"));
});

test("processFullScan should not group rows below threshold", async () => {
  const rows: Row[] = [
    { _id: "1", name: "John" },
    { _id: "2", name: "Jane" },
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const uf = new UnionFind(rows.map((r) => r._id));
  await processFullScan(rows, rules, 0.8, uf);

  expect(uf.find("1")).not.toBe(uf.find("2"));
});

test("processFullScan should handle transitive duplicates", async () => {
  // A matches B, B matches C -> all should be in the same group
  const rows: Row[] = [
    { _id: "1", name: "John Doe" },
    { _id: "2", name: "John Doe" },
    { _id: "3", name: "John Doe" },
  ];
  const rules: Rule[] = [
    { name: "name exact", columns: ["name"], comparator: "exact", weight: 1.0 },
  ];
  const uf = new UnionFind(rows.map((r) => r._id));
  await processFullScan(rows, rules, 0.8, uf);

  const root = uf.find("1");
  expect(uf.find("2")).toBe(root);
  expect(uf.find("3")).toBe(root);
});

test("groupByBlockingKey should partition rows by first 3 chars of column", () => {
  const rows: Row[] = [
    { _id: "1", last_name: "Smith" },
    { _id: "2", last_name: "Smyth" },
    { _id: "3", last_name: "Jones" },
    { _id: "4", last_name: "Johnson" },
  ];
  const blocks = groupByBlockingKey(rows, "last_name");

  // "Smith" and "Smyth" both have key "smi" and "smy" respectively — wait, first 3 chars:
  // "Smith" -> "smi", "Smyth" -> "smy", "Jones" -> "jon", "Johnson" -> "joh"
  expect(blocks.size).toBe(4);
  expect(blocks.get("smi")?.length).toBe(1);
  expect(blocks.get("smy")?.length).toBe(1);
  expect(blocks.get("jon")?.length).toBe(1);
  expect(blocks.get("joh")?.length).toBe(1);
});

test("groupByBlockingKey should group rows with same prefix", () => {
  const rows: Row[] = [
    { _id: "1", city: "New York" },
    { _id: "2", city: "New Jersey" },
    { _id: "3", city: "Los Angeles" },
  ];
  const blocks = groupByBlockingKey(rows, "city");

  // "New York" -> "new", "New Jersey" -> "new", "Los Angeles" -> "los"
  expect(blocks.size).toBe(2);
  expect(blocks.get("new")?.length).toBe(2);
  expect(blocks.get("los")?.length).toBe(1);
});

test("groupByBlockingKey should handle short values gracefully", () => {
  const rows: Row[] = [
    { _id: "1", code: "AB" },
    { _id: "2", code: "AB" },
    { _id: "3", code: "XY" },
  ];
  const blocks = groupByBlockingKey(rows, "code");

  // Values shorter than 3 chars use the full lowercased value as key
  expect(blocks.size).toBe(2);
  expect(blocks.get("ab")?.length).toBe(2);
  expect(blocks.get("xy")?.length).toBe(1);
});

test("groupByBlockingKey should handle null/undefined column values", () => {
  const rows: Row[] = [
    { _id: "1", name: null as any },
    { _id: "2", name: undefined },
    { _id: "3", name: "John" },
  ];
  const blocks = groupByBlockingKey(rows, "name");

  // null -> String(null) = "nul" (first 3 chars of "null"), undefined -> String("") = ""
  // Actually: row[col] ?? "" -> null ?? "" = "" for null, undefined ?? "" = "" for undefined
  // So both null and undefined map to key ""
  expect(blocks.has("")).toBe(true);
  expect(blocks.get("")?.length).toBe(2);
  expect(blocks.get("joh")?.length).toBe(1);
});
