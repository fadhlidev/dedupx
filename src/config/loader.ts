import { readFileSync } from "fs";
import { load as parseYaml } from "js-yaml";
import { type Config, ConfigSchema } from "@/config/schema";
import { ZodError } from "zod";

export function loadConfig(filePath: string): Config {
  try {
    const fileContent = readFileSync(filePath, "utf8");
    let parsedConfig: unknown;

    if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      parsedConfig = parseYaml(fileContent);
    } else if (filePath.endsWith(".json")) {
      parsedConfig = JSON.parse(fileContent);
    } else {
      throw new Error("Unsupported config file format. Please use .yaml, .yml, or .json.");
    }

    // Validate the parsed configuration against the Zod schema
    return ConfigSchema.parse(parsedConfig);
  } catch (error) {
    if (error instanceof ZodError) {
      // Provide more detailed Zod validation errors
      const errorMessages = error.issues.map(err => `  - ${err.path.join(".")} : ${err.message}`).join("\n");
      throw new Error(`Invalid configuration file structure:\n${errorMessages}`);
    }
    if (error instanceof Error) {
      throw new Error(`Failed to load or parse configuration file '${filePath}': ${error.message}`);
    }
    throw new Error(`An unknown error occurred while loading config file '${filePath}'.`);
  }
}
