import path from "node:path";

import { logPackageInitialized } from "@package/logger-adapter";
import { readProcessEnvValue } from "@trebired/env";
import { loadUploadsConfig } from "./config.js";
import {
  setUploadsRuntimeLogger,
  UPLOADS_PACKAGE_SOURCE,
} from "./logging.js";
import type {
  ImageUploadKindConfig,
  ImageUploadKindConfigInput,
  LoadUploadsConfigOptions,
  UploadsConfig,
} from "./config.js";
import type { UploadsLoggerAdapter, UploadsLoggerInput } from "./logging.js";

let configuredImageKinds: Record<string, ImageUploadKindConfig>|null = null;

type BootstrapUploadsConfigOptions = LoadUploadsConfigOptions& {
  logger?: UploadsLoggerInput;
  loggerAdapter?: UploadsLoggerAdapter;
};

function configureImageUploadKinds(kinds: Record<string, ImageUploadKindConfig>): void {
  configuredImageKinds = kinds;
}

function requireConfiguredImageUploadKinds(): Record<string, ImageUploadKindConfig> {
  if (!configuredImageKinds) {
    throw new Error(
      "uploads-not-configured :: call configureImageUploadKinds() or bootstrapUploadsConfig() before using image upload helpers",
    );
  }
  return configuredImageKinds;
}

function readConfiguredImageUploadKinds(): Record<string, ImageUploadKindConfig>|null {
  return configuredImageKinds;
}

async function bootstrapUploadsConfig(
  options: BootstrapUploadsConfigOptions = {},
): Promise<boolean> {
  const { logger, loggerAdapter, ...loadOptions } = options;
  if (logger !== undefined || loggerAdapter !== undefined) {
    setUploadsRuntimeLogger(logger, loggerAdapter);
  }

  const config = await loadUploadsConfig(loadOptions);
  const configured = Boolean(config?.imageKinds);
  if (config?.imageKinds) configureImageUploadKinds(resolveImageUploadKinds(config));
  logPackageInitialized({
      adapter: loggerAdapter || undefined,
      defaultLogger: false,
      fallback: "noop",
      logger: logger || undefined,
      source: UPLOADS_PACKAGE_SOURCE,
  });
  return configured;
}

function resolveImageUploadKinds(config: UploadsConfig): Record<string, ImageUploadKindConfig> {
  const baseDir = resolveUploadPath(config.baseDir || "", "");
  return Object.fromEntries(
    Object.entries(config.imageKinds || {}).map(([name, kind]) => [
        name,
        resolveImageUploadKind(kind, baseDir),
    ]),
  );
}

function resolveImageUploadKind(
  kind: ImageUploadKindConfigInput,
  baseDir: string,
): ImageUploadKindConfig {
  const mountPath = String(kind.mountPath || "");
  const layout = kind.layout === "flat" ? "flat" : "entity";
  return {
    dir: resolveUploadPath(kind.dir, baseDir),
    layout,
    mountPath,
    url:
    typeof kind.url === "function"
    ? kind.url
    : createUploadUrlResolver(
      kind.urlPattern || defaultUploadUrlPattern(mountPath, layout),
    ),
  };
}

function resolveUploadPath(input: unknown, baseDir: string): string {
  const value = resolveConfigTokens(String(input || "").trim());
  if (!value) return "";
  if (path.isAbsolute(value)) return path.normalize(value);
  return path.resolve(baseDir || ".", value);
}

function resolveConfigTokens(input: string): string {
  return input.replace(/\{env\.([A-Z0-9_]+)\}/g, (_match, name) =>
    readProcessEnvValue(name).trim(),
  );
}

function defaultUploadUrlPattern(mountPath: string, layout: "entity" | "flat"): string {
  const base = mountPath.replace(/\/+$/g, "") || "/";
  return layout === "flat" ? `${base}/{fileName}` : `${base}/{entityId}/{fileName}`;
}

function createUploadUrlResolver(pattern: string) {
  return function uploadUrl(entityId: unknown, fileName: string): string {
    return pattern
    .replace(/\{entityId\}/g, encodeURIComponent(String(entityId)))
    .replace(/\{fileName\}/g, fileName);
  };
}

export {
  bootstrapUploadsConfig,
  configureImageUploadKinds,
  readConfiguredImageUploadKinds,
  requireConfiguredImageUploadKinds,
  resolveImageUploadKinds,
};
export type { BootstrapUploadsConfigOptions };
