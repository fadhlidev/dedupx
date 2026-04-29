import { expect, test, describe } from "bun:test";
import { getDbClient } from "@/db/client";
import { fetchRows } from "@/db/query";
import { type Config } from "@/config/schema";

describe("Database Client & Query", () => {
  const testConfig: Config = {
    source: {
      connection: ":memory:",
      driver: "sqlite",
      table: "test_table"
    },
    rules: [{ name: "test", columns: ["name"], comparator: "exact", weight: 1.0 }],
    threshold: 0.5,
    processing: {
      batch_size: 500,
      concurrency: 4,
      strategy: "block"
    }
  };

  test("should connect to SQLite in-memory", async () => {
    const client = await getDbClient(testConfig);
    expect(client.db).toBeDefined();
    client.close();
  });

  test("should fetch rows from table", async () => {
    const client = await getDbClient(testConfig);
    const db = client.db;

    // Create table and insert data
    // For SQLite, we can use raw SQL via db.run
    await (db as any).run(require("drizzle-orm").sql`CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)`);
    await (db as any).run(require("drizzle-orm").sql`INSERT INTO test_table (name) VALUES ('test1'), ('test2')`);

    const rows = await fetchRows(db, "test_table", 10);
    expect(rows.length).toBe(2);
    expect(rows[0].name).toBe("test1");

    client.close();
  });
});
