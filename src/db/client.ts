import { type Config } from "@/config/schema";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Client: PgClient } = pg;
import { drizzle as drizzleMySql } from "drizzle-orm/mysql2";
import { createPool as createMySqlPool } from "mysql2/promise";
import { drizzle as drizzleBunSqlite } from "drizzle-orm/bun-sqlite";
import { Database as BunSqliteDatabase } from "bun:sqlite";

// Define a union type for the Drizzle clients we'll be using
export type DrizzleDbClient = any;

export interface DbClientWrapper {
  db: DrizzleDbClient;
  close: () => Promise<void> | void; // Close method might be async or sync depending on driver
}

export async function getDbClient(config: Config): Promise<DbClientWrapper> {
  const { connection, driver } = config.source;

  switch (driver) {
    case "postgres": {
      const client = new PgClient({ connectionString: connection });
      await client.connect(); // Establish connection
      const db = drizzlePg(client);
      return {
        db: db,
        close: async () => await client.end(), // Close the pg client
      };
    }
    case "mysql": {
      // MySQL2 uses a connection pool, no explicit connect needed here,
      // connections are made on demand.
      const pool = createMySqlPool(connection);
      const db = drizzleMySql(pool);
      return {
        db: db,
        close: async () => await pool.end(), // Close the mysql pool
      };
    }
    case "sqlite": {
      // Bun's SQLite opens/creates the database file
      const sqliteDb = new BunSqliteDatabase(connection);
      const db = drizzleBunSqlite(sqliteDb);
      return {
        db: db,
        close: () => sqliteDb.close(), // Close the Bun SQLite database
      };
    }
    default:
      throw new Error(`Unsupported database driver: ${driver}`);
  }
}
