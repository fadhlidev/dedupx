import { test, expect } from "bun:test";
import { UnionFind } from "@/engine/grouper";

test("UnionFind should initialize each ID as its own parent", () => {
  const uf = new UnionFind(["1", "2", "3"]);
  expect(uf.find("1")).toBe("1");
  expect(uf.find("2")).toBe("2");
  expect(uf.find("3")).toBe("3");
});

test("UnionFind should merge groups", () => {
  const uf = new UnionFind(["1", "2", "3", "4"]);
  uf.union("1", "2");
  expect(uf.find("1")).toBe(uf.find("2"));
  expect(uf.find("1")).not.toBe(uf.find("3"));
});

test("UnionFind should handle transitive relationships", () => {
  const uf = new UnionFind(["A", "B", "C", "D"]);
  uf.union("A", "B");
  uf.union("B", "C");
  expect(uf.find("A")).toBe(uf.find("C"));
  expect(uf.find("A")).not.toBe(uf.find("D"));
});

test("UnionFind should perform path compression", () => {
  const uf = new UnionFind(["1", "2", "3", "4"]);
  uf.union("1", "2");
  uf.union("2", "3");
  uf.union("3", "4");
  
  // Before find, the structure might be linear.
  // find(1) should compress it.
  const root = uf.find("1");
  expect(root).toBe("4");
  
  // This is internal state but we expect it to be fast.
  expect(uf.find("2")).toBe("4");
});

test("UnionFind should return correct group map", () => {
  const uf = new UnionFind(["A", "B", "C", "D", "E"]);
  uf.union("A", "B");
  uf.union("C", "D");
  uf.union("B", "E");

  const map = uf.getGroupMap();
  expect(map.get("A")).toBe(map.get("B"));
  expect(map.get("A")).toBe(map.get("E"));
  expect(map.get("C")).toBe(map.get("D"));
  expect(map.get("A")).not.toBe(map.get("C"));
});

test("UnionFind should return correct group count", () => {
  const uf = new UnionFind(["1", "2", "3", "4", "5", "6"]);
  expect(uf.getGroupCount()).toBe(6);
  
  uf.union("1", "2");
  uf.union("3", "4");
  uf.union("2", "3");
  expect(uf.getGroupCount()).toBe(3); // Groups: {1,2,3,4}, {5}, {6}
  
  uf.union("5", "6");
  expect(uf.getGroupCount()).toBe(2); // Groups: {1,2,3,4}, {5,6}
});
