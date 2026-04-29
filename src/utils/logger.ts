import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

const envLogLevelStr = process.env.LOG_LEVEL?.toUpperCase();
export const currentLogLevel: LogLevel = (envLogLevelStr && envLogLevelStr in LogLevel)
  ? LogLevel[envLogLevelStr as keyof typeof LogLevel]
  : LogLevel.INFO; // Default to INFO

export class Logger {
  private logLevel: LogLevel;

  constructor(level: LogLevel = currentLogLevel) {
    this.logLevel = level;
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (level >= this.logLevel) {
      const timestamp = new Date().toISOString();
      let prefix: string;
      let outputFn: (...data: any[]) => void;

      switch (level) {
        case LogLevel.DEBUG: prefix = chalk.gray(`[${timestamp}] [DEBUG]`); outputFn = console.debug; break;
        case LogLevel.INFO:  prefix = chalk.blue(`[${timestamp}] [INFO]`);  outputFn = console.info;  break;
        case LogLevel.WARN:  prefix = chalk.yellow(`[${timestamp}] [WARN]`);  outputFn = console.warn;  break;
        case LogLevel.ERROR: prefix = chalk.red(`[${timestamp}] [ERROR]`); outputFn = console.error; break;
        default: return; // SILENT
      }
      outputFn(prefix, message, ...args);
    }
  }

  debug(message: string, ...args: any[]) { this.log(LogLevel.DEBUG, message, ...args); }
  info(message: string, ...args: any[]) { this.log(LogLevel.INFO, message, ...args); }
  warn(message: string, ...args: any[]) { this.log(LogLevel.WARN, message, ...args); }
  error(message: string, ...args: any[]) { this.log(LogLevel.ERROR, message, ...args); }
}

export const logger = new Logger();
