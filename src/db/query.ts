import { sql } from "drizzle-orm";
import type { Row } from "@/engine/types";
import type { DbClientWrapper } from "@/db/client";

export async function fetchRows(db: any, tableName: string, limit?: number): Promise<Row[]> {
  let query = sql`SELECT * FROM ${sql.raw(tableName)}`;
  if (limit !== undefined) {
    query = sql`SELECT * FROM ${sql.raw(tableName)} LIMIT ${limit}`;
  }

  let rawRows: any[];
  // Drizzle clients have different execution methods
  if (typeof db.execute === "function") {
    const result = await db.execute(query);
    rawRows = (result as any).rows || result;
  } else if (typeof db.all === "function") {
    rawRows = await db.all(query);
  } else if (typeof db.run === "function") {
    rawRows = await db.run(query);
  } else {
    throw new Error("Unsupported database client: could not find execution method (execute, all, or run).");
  }

  // Ensure each row has an '_id' property.
  // Assuming 'id' is the primary key name in the database.
  return rawRows.map((row: any) => ({
    ...row,
    _id: String(row.id || row._id || ""), // Fallback to empty if not found, but usually should be row.id
  })) as Row[];
}

export async function createResultTable(
  dbClientWrapper: DbClientWrapper,
  sourceTable: string,
  outputTableName: string,
  sourcePkColumn: string = "id",
  outputSchema?: string
) {
  const { db } = dbClientWrapper;
  // Use raw sql execution as driver specifics vary. Drizzle's execute works for this.
  const schemaPrefix = outputSchema ? `${outputSchema}.` : "";
  const fullOutputTableName = `${schemaPrefix}${outputTableName}`;
  const fullSourceTableName = `${schemaPrefix}${sourceTable}`;

  // CREATE TABLE ... AS SELECT to copy schema and data
  const createTableQuery = sql`
    CREATE TABLE ${sql.raw(fullOutputTableName)} AS
    SELECT * FROM ${sql.raw(fullSourceTableName)}
  `;

  const columnsToAdd = [
    "canonical_id TEXT",
    "group_id TEXT",
    "is_duplicate BOOLEAN DEFAULT FALSE",
    "duplicate_score NUMERIC",
    "matched_rules JSON"
  ];

  if (typeof db.execute === "function") {
    await db.execute(createTableQuery);
    for (const col of columnsToAdd) {
      await db.execute(sql`ALTER TABLE ${sql.raw(fullOutputTableName)} ADD COLUMN ${sql.raw(col)}`);
    }
  } else if (typeof db.run === "function") {
    await db.run(createTableQuery);
    for (const col of columnsToAdd) {
      await db.run(sql`ALTER TABLE ${sql.raw(fullOutputTableName)} ADD COLUMN ${sql.raw(col)}`);
    }
  } else {
    throw new Error("Unsupported database client for table creation.");
  }
}

export async function insertDedupResults(
  dbClientWrapper: DbClientWrapper,
  outputTableName: string,
  results: { _id: string; canonical_id: string; group_id: string; is_duplicate: boolean; duplicate_score: number | null; matched_rules: string[] }[],
  sourcePkColumn: string = "id",
  outputSchema?: string,
  progressBar?: any
) {
  const { db } = dbClientWrapper;
  const schemaPrefix = outputSchema ? `${outputSchema}.` : "";
  const fullOutputTableName = `${schemaPrefix}${outputTableName}`;

  // Update rows in batch or individually
  // Since Drizzle's raw sql doesn't easily support dynamic multi-row UPDATE ... FROM VALUES in a cross-db way
  // We'll execute simple updates one by one, or we can use a basic batch if supported
  for (const result of results) {
    const rulesJson = JSON.stringify(result.matched_rules);
    const updateQuery = sql`
      UPDATE ${sql.raw(fullOutputTableName)}
      SET 
        canonical_id = ${result.canonical_id},
        group_id = ${result.group_id},
        is_duplicate = ${result.is_duplicate},
        duplicate_score = ${result.duplicate_score === null ? sql`NULL` : result.duplicate_score},
        matched_rules = ${rulesJson}
      WHERE ${sql.raw(sourcePkColumn)} = ${result._id}
    `;

    if (typeof db.execute === "function") {
      await db.execute(updateQuery);
    } else if (typeof db.run === "function") {
      await db.run(updateQuery);
    }
    if (progressBar) {
      progressBar.increment("Writing results");
    }
  }
}
