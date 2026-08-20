import *as result from "@trebired/result";
import { generateId } from "@trebired/utils";
import fs from "fs";
import path from "path";

import { requireConfiguredImageUploadKinds } from "#55c2m2i0yvst";
import type { ImageUploadKindConfig } from "#42j6dszdy5t3";

type ImageEncodeOptions = Record<string, unknown>& {
  ext?: string;
  outName?: string;
  width?: number;
  crop?: unknown;
  quality?: number;
  maxBytes?: number;
  sourceMime?: string;
  sourceOriginalName?: string;
};

function ensureAbsDir(dir: unknown, kind: unknown) {
  const value = typeof dir === "string" ? dir.trim() : "";
  if (!value) {
    return result.badRequest("missing-upload-dir", {
        data: { kind: String(kind) },
    });
  }

  if (!path.isAbsolute(value)) {
    return result.badRequest("upload-dir-not-absolute", {
        data: { kind: String(kind), dir: value },
    });
  }

  return result.ok("success", { message: false, data: { dir: value } });
}

function ensureImageKind(kind: unknown) {
  const map = requireConfiguredImageUploadKinds();
  const cfg: ImageUploadKindConfig | null =
  map && Object.prototype.hasOwnProperty.call(map, kind as string)
  ? map[String(kind)]
  : null;
  if (!cfg) {
    return result.notFound("unknown-image-upload-kind", {
        data: { kind: String(kind) },
    });
  }

  const dirRes = ensureAbsDir(cfg.dir, kind);
  if (!dirRes || dirRes.ok !== true) return dirRes;
  const dirData: any = dirRes.data;

  return result.ok("success", {
      message: false,
      data: {
        dir: dirData.dir,
        mountPath: String(cfg.mountPath || ""),
        layout: String(cfg.layout || ""),
        url: cfg.url,
      },
  });
}

function defaultImageExt(opts: ImageEncodeOptions = {}): "gif" | "avif" {
  const ext = String(opts.ext || "")
  .trim()
  .toLowerCase();
  return ext === "gif" ? "gif" : "avif";
}

function makeOutputFileName(
  base: unknown,
  opts: ImageEncodeOptions = {},
): string {
  const ext: any = defaultImageExt(opts);
  const cleanBase =
  typeof base === "string" && base.trim()
  ? base.trim()
  : String(generateId("numeric"));

  if (/\.[a-z0-9]+$/i.test(cleanBase)) return cleanBase;
  if (typeof opts.outName === "string" && opts.outName.trim())
  return opts.outName.trim();
  return `${cleanBase}.${ext}`;
}

function isSafeFlatUploadFileName(fileName: unknown, kind: unknown): boolean {
  const cfgRes: any = ensureImageKind(kind);
  if (!cfgRes || cfgRes.ok !== true) return false;

  if (cfgRes.data.layout !== "flat") return false;
  if (typeof fileName !== "string") return false;

  const name: any = fileName.trim();
  if (!name) return false;

  const base: any = path.basename(name);
  if (!base || base !== name) return false;

  const ext: any = path.extname(base).toLowerCase().slice(1);
  if (!ext) return false;
  if (ext !== "avif" && ext !== "gif") return false;
  if (!/^[a-z0-9._-]+\.[a-z0-9]+$/i.test(base)) return false;

  return true;
}

function resolveFlatUploadFileName(
  base: unknown,
  kind: unknown,
  opts: ImageEncodeOptions = {},
): string {
  const cleanBase = typeof base === "string" && base.trim() ? base.trim() : "";
  if (!cleanBase) return "";

  if (/\.[a-z0-9]+$/i.test(cleanBase)) return cleanBase;

  const cfgRes: any = ensureImageKind(kind);
  if (!cfgRes || cfgRes.ok !== true || !cfgRes.data) {
    return makeOutputFileName(cleanBase, opts);
  }

  const cfgData: any = cfgRes.data;
  if (cfgData.layout !== "flat") {
    return makeOutputFileName(cleanBase, opts);
  }

  const dir = String(cfgData.dir || "").trim();
  if (dir) {
    for (const ext of ["avif", "gif"]) {
      const candidate = `${cleanBase}.${ext}`;
      try {
        if (fs.existsSync(path.join(dir, candidate))) return candidate;
      } catch {}
    }
  }

  return makeOutputFileName(cleanBase, opts);
}

export type { ImageEncodeOptions };

export {
  defaultImageExt,
  ensureAbsDir,
  ensureImageKind,
  isSafeFlatUploadFileName,
  makeOutputFileName,
  resolveFlatUploadFileName,
};
