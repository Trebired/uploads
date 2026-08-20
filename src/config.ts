import { loadPackageConfig } from "@trebired/utils";

const PACKAGE_NAME = "uploads";

type ImageUploadKindConfig = {
  dir: string;
  layout: "entity" | "flat";
  mountPath: string;
  url: (entityId: unknown, fileName: string) => string;
};

type UploadsConfig = {
  forVersion: string;
  imageKinds?: Record<string, ImageUploadKindConfig>;
};

type LoadUploadsConfigOptions = {
  cwd?: string;
};

function defineConfig(config: UploadsConfig): UploadsConfig {
  return config;
}

async function loadUploadsConfig(
  options: LoadUploadsConfigOptions = {},
): Promise<UploadsConfig|null> {
  const { config } = await loadPackageConfig<UploadsConfig>(PACKAGE_NAME, { cwd: options.cwd });
  return config;
}

export { defineConfig, loadUploadsConfig };
export type { ImageUploadKindConfig, LoadUploadsConfigOptions, UploadsConfig };
