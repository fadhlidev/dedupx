/**
 * Union-Find (Disjoint Set Union) data structure for efficient grouping of duplicates.
 * Supports path compression and union by rank (simplified to basic union here).
 */
export class UnionFind {
  private parent: Map<string, string> = new Map();

  constructor(ids: string[]) {
    // Each ID starts as its own parent (representative of its own group)
    for (const id of ids) {
      this.parent.set(id, id);
    }
  }

  /**
   * Finds the root parent (representative) of an element, with path compression.
   * Path compression flattens the tree for subsequent finds.
   */
  find(x: string): string {
    const p = this.parent.get(x);
    if (p === undefined) {
      throw new Error(`ID '${x}' not found in UnionFind.`);
    }

    if (p === x) {
      return x;
    }

    // Path compression
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  /**
   * Unites two groups by setting one group's root to be the parent of the other's root.
   */
  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }

  /**
   * Returns a map where each ID points to its canonical root ID.
   */
  getGroupMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const id of this.parent.keys()) {
      map.set(id, this.find(id));
    }
    return map;
  }

  /**
   * Returns the count of unique groups.
   */
  getGroupCount(): number {
    const roots = new Set<string>();
    for (const id of this.parent.keys()) {
      roots.add(this.find(id));
    }
    return roots.size;
  }
}
