import { Command } from "commander";
import { loadConfig } from "@/config/loader";
import { getDbClient } from "@/db/client";
import { fetchRows, createResultTable, insertDedupResults } from "@/db/query";
import { runDedup } from "@/engine/dedup";
import { DedupProgressBar } from "@/reporter/progress";
import chalk from "chalk";

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

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

      const progressBar = new DedupProgressBar();

      progressBar.start("Loading rows", 1);
      const allRows = await fetchRows(dbClientWrapper.db, config.source.table);
      progressBar.stop("Loading rows", `✓ Fetched ${allRows.length} rows`);

      const startTime = performance.now();
      const { groupMap, dedupMetadata } = await runDedup(allRows, config, progressBar);
      const endTime = performance.now();

      progressBar.start("Writing results", dedupMetadata.length);
      const outputTableName = `${config.source.table}_dedup_${Date.now()}`;
      await createResultTable(dbClientWrapper, config.source.table, outputTableName, "id");
      await insertDedupResults(dbClientWrapper, outputTableName, dedupMetadata, "id", undefined, progressBar);
      progressBar.stop("Writing results");

      progressBar.stopAll();

      console.log(chalk.green(`\n✓ Deduplication process completed in ${((endTime - startTime) / 1000).toFixed(2)}s.`));

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

      const summaryLines = [
        `Total rows         ${allRows.length.toLocaleString()}`,
        `Duplicate groups   ${totalGroups.toLocaleString()}`,
        `Duplicates found   ${duplicateCount.toLocaleString()}`,
        `Unique records     ${uniqueRecords.toLocaleString()}`,
        `Output table:`,
        outputTableName
      ];

      const minWidth = 28;
      const contentWidth = Math.max(minWidth, "Results Summary".length, ...summaryLines.map(l => l.length));
      
      const topBorder = `┌${"─".repeat(contentWidth + 2)}┐`;
      const midBorder = `├${"─".repeat(contentWidth + 2)}┤`;
      const botBorder = `└${"─".repeat(contentWidth + 2)}┘`;

      console.log(chalk.bold.green(`\n${topBorder}`));
      console.log(chalk.bold.green(`│ ${"Results Summary".padEnd(contentWidth)} │`));
      console.log(chalk.bold.green(midBorder));
      console.log(chalk.green(`│ ${summaryLines[0]!.padEnd(contentWidth)} │`));
      console.log(chalk.green(`│ ${summaryLines[1]!.padEnd(contentWidth)} │`));
      console.log(chalk.green(`│ ${summaryLines[2]!.padEnd(contentWidth)} │`));
      console.log(chalk.green(`│ ${summaryLines[3]!.padEnd(contentWidth)} │`));
      console.log(chalk.bold.green(midBorder));
      console.log(chalk.green(`│ ${summaryLines[4]!.padEnd(contentWidth)} │`));
      console.log(chalk.green(`│ ${summaryLines[5]!.padEnd(contentWidth)} │`));
      console.log(chalk.bold.green(botBorder));

    } catch (error: any) {
      console.error("RAW ERROR CAUGHT:", error);
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