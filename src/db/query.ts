import { sql } from "drizzle-orm";

export async function fetchRows(db: any, tableName: string, limit = 10): Promise<any[]> {
  const query = sql`SELECT * FROM ${sql.raw(tableName)} LIMIT ${limit}`;
  
  // Drizzle clients have different execution methods
  // We'll try to find a suitable one.
  if (typeof db.execute === "function") {
    const result = await db.execute(query);
    return (result as any).rows || result;
  } else if (typeof db.all === "function") {
    return await db.all(query);
  } else if (typeof db.run === "function") {
    return await db.run(query);
  }
  
  throw new Error("Unsupported database client: could not find execution method (execute, all, or run).");
}
