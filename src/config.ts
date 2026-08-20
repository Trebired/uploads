import { loadPackageConfig } from "@trebired/utils";

const PACKAGE_NAME = "uploads";

type ImageUploadUrlResolver = (entityId: unknown, fileName: string) => string;

type ImageUploadKindConfigInput = {
  dir: string;
  layout: "entity" | "flat";
  mountPath: string;
  url?: ImageUploadUrlResolver;
  urlPattern?: string;
};

type ImageUploadKindConfig = {
  dir: string;
  layout: "entity" | "flat";
  mountPath: string;
  url: ImageUploadUrlResolver;
};

type UploadsConfig = {
  forVersion: string;
  baseDir?: string;
  imageKinds?: Record<string, ImageUploadKindConfigInput>;
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
export type {
  ImageUploadKindConfig,
  ImageUploadKindConfigInput,
  ImageUploadUrlResolver,
  LoadUploadsConfigOptions,
  UploadsConfig,
};
