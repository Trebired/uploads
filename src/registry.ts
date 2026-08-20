import { loadUploadsConfig } from "./config.js";
import type { ImageUploadKindConfig, LoadUploadsConfigOptions } from "./config.js";

let configuredImageKinds: Record<string, ImageUploadKindConfig>|null = null;

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

async function bootstrapUploadsConfig(options: LoadUploadsConfigOptions = {}): Promise<boolean> {
  const config = await loadUploadsConfig(options);
  if (!config?.imageKinds) return false;
  configureImageUploadKinds(config.imageKinds);
  return true;
}

export { bootstrapUploadsConfig, configureImageUploadKinds, requireConfiguredImageUploadKinds };
