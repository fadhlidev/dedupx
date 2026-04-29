import { expect, test, mock, beforeEach, afterEach } from "bun:test";
import { Logger, LogLevel } from "@/utils/logger";
import chalk from "chalk";

let logger: Logger;
let consoleDebugMock: any;
let consoleInfoMock: any;
let consoleWarnMock: any;
let consoleErrorMock: any;

beforeEach(() => {
  logger = new Logger(LogLevel.INFO);
  consoleDebugMock = mock(() => {});
  consoleInfoMock = mock(() => {});
  consoleWarnMock = mock(() => {});
  consoleErrorMock = mock(() => {});

  console.debug = consoleDebugMock;
  console.info = consoleInfoMock;
  console.warn = consoleWarnMock;
  console.error = consoleErrorMock;
});

afterEach(() => {
  mock.restore();
});

test("Logger - INFO level should not log DEBUG", () => {
  logger.debug("test debug");
  expect(consoleDebugMock).not.toHaveBeenCalled();
});

test("Logger - INFO level should log INFO, WARN, ERROR", () => {
  logger.info("test info");
  expect(consoleInfoMock).toHaveBeenCalled();
  
  logger.warn("test warn");
  expect(consoleWarnMock).toHaveBeenCalled();
  
  logger.error("test error");
  expect(consoleErrorMock).toHaveBeenCalled();
});

test("Logger - SILENT level should not log anything", () => {
  logger.setLogLevel(LogLevel.SILENT);
  
  logger.debug("test debug");
  logger.info("test info");
  logger.warn("test warn");
  logger.error("test error");
  
  expect(consoleDebugMock).not.toHaveBeenCalled();
  expect(consoleInfoMock).not.toHaveBeenCalled();
  expect(consoleWarnMock).not.toHaveBeenCalled();
  expect(consoleErrorMock).not.toHaveBeenCalled();
});
