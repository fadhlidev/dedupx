import { sql } from "drizzle-orm";
import { Row } from "@/engine/types";

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
