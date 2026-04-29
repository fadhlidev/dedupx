import { Command } from "commander";
import { loadConfig } from "@/config/loader";
import { getDbClient } from "@/db/client";
import { fetchRows } from "@/db/query";
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

      // --- Placeholder for actual deduplication logic (Phase 3 onwards) ---
      console.log(chalk.magenta("Starting deduplication process (placeholder)..."));
      // Example: Fetch some rows to demonstrate DB connection
      const sampleRows = await fetchRows(dbClientWrapper.db, config.source.table, 5);
      console.log(chalk.dim("  Fetched sample rows:"));
      sampleRows.forEach((row, idx) => console.log(chalk.dim(`    ${idx + 1}. ${JSON.stringify(row).substring(0, 80)}...`)));
      console.log(chalk.green("\n✓ Deduplication process completed (placeholder)."));

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