import *as result from "@trebired/result";
import { ensureDir } from "@trebired/utils";
import fs from "fs";
import path from "path";

import { readRuntimeLog } from "#6cinjyhwhjyq";
import { ensureImageKind, makeOutputFileName } from "./helpers.js";
import type { ImageEncodeOptions } from "./helpers.js";
import type { ImageUploadKindConfig } from "#42j6dszdy5t3";
import {
  encodeAvifFromBuffer,
  encodeGifFromBuffer,
  prepareImageBufferForAvif,
} from "./processing.js";

function invalidImageBufferResult(buffer: unknown, kind: unknown) {
  readRuntimeLog().warn("uploads.image.invalid-buffer", "invalid image buffer", {
      kind: String(kind),
      buffer_type: buffer == null ? "null" : typeof buffer,
      buffer_len:
      buffer && typeof(buffer as any).length === "number"
      ? (buffer as any).length
      : null,
  });

  return result.badRequest("invalid-buffer");
}

function shouldPreserveGif(encodeOpts: ImageEncodeOptions) {
  const sourceMime = String(encodeOpts.sourceMime || "")
  .trim()
  .toLowerCase();
  const sourceOriginalName = String(encodeOpts.sourceOriginalName || "")
  .trim()
  .toLowerCase();

  return sourceMime === "image/gif" || /\.gif$/i.test(sourceOriginalName);
}

async function encodeUploadImageBuffer(
  buffer: Buffer,
  kind: unknown,
  encodeOpts: ImageEncodeOptions = {},
) {
  const preserveOriginalGif = shouldPreserveGif(encodeOpts);
  let outputBuffer: Buffer | null = null;
  let outputExt: "gif" | "avif" = preserveOriginalGif ? "gif" : "avif";

  if (preserveOriginalGif) {
    try {
      outputBuffer = await encodeGifFromBuffer(buffer, encodeOpts);
    } catch (error: any) {
      readRuntimeLog().warn("uploads.image.encode-failed", "gif encode failed", {
          kind: String(kind),
          error: String(error?.message || error),
      });
      return result.internal("encode-failed");
    }
  } else {
    try {
      const preparedBuffer = await prepareImageBufferForAvif(
        buffer,
        encodeOpts,
      );
      outputBuffer = await encodeAvifFromBuffer(preparedBuffer, encodeOpts);
    } catch (error: any) {
      readRuntimeLog().warn("uploads.image.encode-failed", "image encode failed", {
          kind: String(kind),
          error: String(error?.message || error),
      });
      return result.internal("encode-failed");
    }
  }

  if (!outputBuffer) return result.internal("encode-failed");

  return result.ok("success", {
      message: false,
      data: {
        outputBuffer,
        outputExt,
      },
  });
}

function makeUploadOutputName(
  outName: string | undefined,
  encodeOpts: ImageEncodeOptions,
  outputExt: "gif" | "avif",
) {
  const fileName =
  typeof outName === "string" && outName.trim()
  ? makeOutputFileName(outName.trim(), { ...encodeOpts, ext: outputExt })
  : makeOutputFileName("", { ...encodeOpts, ext: outputExt });

  return fileName;
}

function removeFlatAlternateFormats(cfg: any, fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/i, "");

  for (const ext of ["avif", "gif"]) {
    const candidate = `${stem}.${ext}`;
    if (candidate === fileName) continue;

    try {
      const candidateAbs = path.join(cfg.dir, candidate);
      if (fs.existsSync(candidateAbs)) fs.unlinkSync(candidateAbs);
    } catch {}
  }
}

async function writeEncodedImage(
  kind: unknown,
  cfg: ImageUploadKindConfig,
  entityId: unknown,
  fileName: string,
  outputBuffer: Buffer,
) {
  let savedAbs = "";
  let url = "";

  try {
    if (cfg.layout === "flat") {
      ensureDir(cfg.dir);
      savedAbs = path.join(cfg.dir, fileName);
      removeFlatAlternateFormats(cfg, fileName);
      await fs.promises.writeFile(savedAbs, outputBuffer);
      url = cfg.url(entityId, fileName);
    } else {
      const dir = path.join(cfg.dir, String(entityId));
      ensureDir(dir);
      savedAbs = path.join(dir, fileName);
      await fs.promises.writeFile(savedAbs, outputBuffer);
      url = cfg.url(entityId, fileName);
    }
  } catch (error: any) {
    readRuntimeLog().warn("uploads.image.write-failed", "image write failed", {
        kind: String(kind),
        file_name: fileName,
        saved_abs: savedAbs,
        error: String(error?.message || error),
    });
    return result.internal("write-failed");
  }

  return result.ok("success", {
      message: false,
      data: {
        savedAbs,
        url,
      },
  });
}

function imageSavedResult(
  kind: unknown,
  cfg: ImageUploadKindConfig,
  entityId: unknown,
  fileName: string,
  saved: any,
  bytes: number,
) {
  readRuntimeLog().info("uploads.image.saved", "image saved", {
      kind: String(kind),
      layout: String(cfg.layout),
      entity_id: String(entityId == null ? "" : entityId),
      file_name: fileName,
      saved_abs: saved.savedAbs,
      url: saved.url,
      bytes,
  });

  return result.ok("success", {
      message: false,
      data: {
        url: saved.url,
        saved_abs: saved.savedAbs,
        file_name: fileName,
        bytes,
        kind: String(kind),
      },
  });
}

async function processImageBuffer(
  buffer: unknown,
  entityId: unknown,
  kind: unknown = "generic",
  outName?: string,
  encodeOpts: ImageEncodeOptions = {},
) {
  const cfgRes: any = ensureImageKind(kind);
  if (!cfgRes || cfgRes.ok !== true) return cfgRes;

  const cfg: ImageUploadKindConfig = cfgRes.data;

  if (!buffer || !Buffer.isBuffer(buffer)) {
    return invalidImageBufferResult(buffer, kind);
  }

  const encoded: any = await encodeUploadImageBuffer(buffer, kind, encodeOpts);
  if (!encoded || encoded.ok !== true) return encoded;

  const outputBuffer = encoded.data.outputBuffer;
  const outputExt = encoded.data.outputExt;
  const fileName = makeUploadOutputName(outName, encodeOpts, outputExt);
  const saved: any = await writeEncodedImage(
    kind,
    cfg,
    entityId,
    fileName,
    outputBuffer,
  );
  if (!saved || saved.ok !== true) return saved;

  return imageSavedResult(
    kind,
    cfg,
    entityId,
    fileName,
    saved.data,
    outputBuffer.length,
  );
}

export { processImageBuffer };
