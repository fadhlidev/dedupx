import { Command } from "commander";
import { loadConfig } from "@/config/loader";
import { getDbClient } from "@/db/client";
import { fetchRows } from "@/db/query";
import { runDedup } from "@/engine/dedup";
import chalk from "chalk";

function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    if (error.message) return error.message;
    if (error.name === "AggregateError" && Array.isArray((error as any).errors)) {
      return (error as any).errors.map((e: any) => e.message || String(e)).join(", ");
    }
    return error.name || "Unknown Error";
  }
  return String(error);
}

const program = new Command();

program
  .name("dedupx")
  .description("A CLI tool for deduplicating database records.")
  .version("0.1.0");

program
  .command("run")
  .description("Runs the deduplication process based on the provided configuration.")
  .option("-c, --config <file>", "Path to the YAML or JSON configuration file", "config.example.yaml")
  .action(async (options) => {
    console.log(chalk.bold.blue("┌─────────────────────────────────────────┐"));
    console.log(chalk.bold.blue("│  🔍 DedupX CLI  v0.1.0                  │"));
    console.log(chalk.bold.blue("└─────────────────────────────────────────┘\n"));
    console.log(chalk.yellow(`Attempting to run deduplication with config: ${options.config}`));

    let dbClientWrapper;
    try {
      // 1. Load and Validate Configuration
      console.log(chalk.cyan("Loading configuration..."));
      const config = loadConfig(options.config);
      console.log(chalk.green("✓ Configuration loaded and validated successfully."));
      console.log(`  Source Table: ${config.source.table}`);
      console.log(`  Rules: ${config.rules.length} active`);
      console.log(`  Threshold: ${config.threshold}\n`);

      // 2. Establish Database Connection
      console.log(chalk.cyan("Connecting to database..."));
      dbClientWrapper = await getDbClient(config);
      console.log(chalk.green("✓ Database connection successful."));

      console.log(chalk.cyan("Fetching all rows from source table..."));
      const allRows = await fetchRows(dbClientWrapper.db, config.source.table);
      console.log(chalk.green(`✓ Fetched ${allRows.length} rows.`));

      console.log(chalk.magenta("Starting deduplication process..."));
      const startTime = performance.now();
      const groupMap = await runDedup(allRows, config);
      const endTime = performance.now();
      console.log(chalk.green(`✓ Deduplication process completed in ${((endTime - startTime) / 1000).toFixed(2)}s.`));

      // Analyze results from groupMap
      let duplicateCount = 0;
      const uniqueGroupRoots = new Set<string>();
      for (const [rowId, canonicalId] of groupMap) {
        uniqueGroupRoots.add(canonicalId);
        if (rowId !== canonicalId) {
          duplicateCount++;
        }
      }
      const totalGroups = uniqueGroupRoots.size;
      const uniqueRecords = totalGroups; // Each group root represents one unique record

      console.log(chalk.bold.green("\n┌──────────────────────────────┐"));
      console.log(chalk.bold.green("│  Results Summary             │"));
      console.log(chalk.bold.green("├──────────────────────────────┤"));
      console.log(chalk.green(`│  Total rows       ${allRows.length.toLocaleString().padEnd(10)} │`));
      console.log(chalk.green(`│  Duplicate groups   ${totalGroups.toLocaleString().padEnd(10)} │`));
      console.log(chalk.green(`│  Duplicates found   ${duplicateCount.toLocaleString().padEnd(10)} │`));
      console.log(chalk.green(`│  Unique records    ${uniqueRecords.toLocaleString().padEnd(10)} │`));
      console.log(chalk.bold.green("└──────────────────────────────┘"));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error during deduplication: ${getErrorMessage(error)}`));
      process.exit(1);
    } finally {
      if (dbClientWrapper) {
        console.log(chalk.cyan("Closing database connection..."));
        await dbClientWrapper.close();
        console.log(chalk.green("✓ Database connection closed."));
      }
    }
  });

program
  .command("check")
  .description("Validates the configuration file and tests the database connection.")
  .option("-c, --config <file>", "Path to the YAML or JSON configuration file", "config.example.yaml")
  .action(async (options) => {
    console.log(chalk.blue("Running configuration and database check..."));

    let dbClientWrapper;
    try {
      // 1. Load and Validate Configuration
      console.log(chalk.cyan("Loading configuration..."));
      const config = loadConfig(options.config);
      console.log(chalk.green("✓ Configuration loaded and validated successfully."));
      console.log(`  Source Driver: ${config.source.driver}`);
      console.log(`  Source Table: ${config.source.table}`);

      // 2. Establish Database Connection
      console.log(chalk.cyan("Connecting to database..."));
      dbClientWrapper = await getDbClient(config);
      console.log(chalk.green("✓ Database connection successful."));

      // Optional: Fetch a few rows to confirm connectivity
      console.log(chalk.cyan(`Attempting to fetch 1 row from '${config.source.table}'...`));
      const testRows = await fetchRows(dbClientWrapper.db, config.source.table, 1);
      const testRow = Array.isArray(testRows) ? testRows[0] : testRows;

      if (testRow) {
        console.log(chalk.green("✓ Successfully fetched a test row. Database is accessible."));
        console.log(chalk.dim(`  Sample data: ${JSON.stringify(testRow).substring(0, 80)}...`));
      } else {
        console.log(chalk.yellow("⚠ No rows found in the table, but connection is successful."));
      }

      console.log(chalk.green("\nAll checks passed successfully!"));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Check failed: ${getErrorMessage(error)}`));
      process.exit(1);
    } finally {
      if (dbClientWrapper) {
        console.log(chalk.cyan("Closing database connection..."));
        await dbClientWrapper.close();
        console.log(chalk.green("✓ Database connection closed."));
      }
    }
  });

program
  .command("rules")
  .description("Dry-run: show which rules would fire (sample). (Not implemented in Phase 1)")
  .action(() => {
    console.log(chalk.yellow("The 'rules' command is not yet implemented."));
  });

program.parse(process.argv);