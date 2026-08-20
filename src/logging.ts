import {
  resolveLogger,
  type LoggerAdapterLogger,
  type LoggerAdapterWriter,
  type NormalizedLoggerAdapter,
} from "@package/logger-adapter";

type UploadsLoggerInput = LoggerAdapterLogger | null | undefined;
type UploadsLoggerAdapter = LoggerAdapterWriter | null | undefined;

const UPLOADS_PACKAGE_SOURCE = "@trebired/uploads";

let activeLogger: UploadsLoggerInput = null;
let activeLoggerAdapter: UploadsLoggerAdapter = null;

function setUploadsRuntimeLogger(
  logger: UploadsLoggerInput,
  adapter?: UploadsLoggerAdapter,
): void {
  activeLogger = logger || null;
  activeLoggerAdapter = adapter || null;
}

function readRuntimeLog(): NormalizedLoggerAdapter {
  return resolveLogger({
      adapter: activeLoggerAdapter || undefined,
      defaultLogger: false,
      fallback: "noop",
      logger: activeLogger || undefined,
      source: UPLOADS_PACKAGE_SOURCE,
  });
}

export {
  readRuntimeLog,
  setUploadsRuntimeLogger,
  UPLOADS_PACKAGE_SOURCE,
};
export type { UploadsLoggerAdapter, UploadsLoggerInput };
