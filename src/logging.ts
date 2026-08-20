import { resolveLogger, type LoggerAdapterLogger, type NormalizedLoggerAdapter } from "@package/logger-adapter";

type UploadsLoggerInput = LoggerAdapterLogger | null | undefined;

const UPLOADS_PACKAGE_SOURCE = "@trebired/uploads";

let activeLogger: UploadsLoggerInput = null;

function setUploadsLogger(logger: UploadsLoggerInput): void {
  activeLogger = logger;
}

function readRuntimeLog(): NormalizedLoggerAdapter {
  return resolveLogger({
      defaultLogger: false,
      fallback: "noop",
      logger: activeLogger || undefined,
      source: UPLOADS_PACKAGE_SOURCE,
  });
}

export { readRuntimeLog, setUploadsLogger, UPLOADS_PACKAGE_SOURCE };
export type { UploadsLoggerInput };
