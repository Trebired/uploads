import *as result from "@trebired/result";
import { ensureDir, toTrimmedString } from "@trebired/utils";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import multer from "multer";
import { readRuntimeLog } from "./logging.js";
import { processImageBuffer } from "./image/buffer.js";
import type { ImageEncodeOptions } from "./image/helpers.js";

const uploadImages = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req: any, file: any, cb: any) => {
      const name = String(file.originalname || "");
      const type = String(file.mimetype || "");

      const okExt = /\.(jpe?g|png|gif|webp|avif)$/i.test(name);
      const okType = /^image\/(jpe?g|png|gif|webp|avif)$/i.test(type);

      if (okExt && okType) return cb(null, true);

      readRuntimeLog().warn("uploads.image.rejected", "image rejected by filter", {
          field: String(file?.fieldname || ""),
          original_name: name,
          mimetype: type,
          content_type: String(req?.headers?.["content-type"] || ""),
          reason: "type-or-extension-not-allowed",
      });

      return cb(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          "Only image files are allowed (jpeg, jpg, png, gif, webp, avif).",
        ),
      );
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

async function processImageFile(
  file: any,
  entityId: unknown,
  kind: unknown = "generic",
  outName?: string,
  encodeOpts: ImageEncodeOptions = {},
) {
  if (!file || !file.buffer || !Buffer.isBuffer(file.buffer)) {
    readRuntimeLog().warn("uploads.image.missing-file-buffer", "missing file buffer", {
        kind: String(kind),
        entity_id: String(entityId == null ? "" : entityId),
        field: String(file?.fieldname || ""),
        original_name: String(file?.originalname || ""),
        mimetype: String(file?.mimetype || ""),
        size: typeof file?.size === "number" ? file.size : null,
    });
    return result.badRequest("missing-file-buffer");
  }

  return processImageBuffer(file.buffer, entityId, kind, outName, {
      ...encodeOpts,
      sourceMime: file.mimetype,
      sourceOriginalName: file.originalname,
  });
}

async function processImageFiles(
  files: unknown,
  entityId: unknown,
  kind: unknown = "generic",
) {
  if (!Array.isArray(files)) return result.badRequest("invalid-files");

  const out = [];
  let order = 1;

  for (const file of files) {
    const one = await processImageFile(file, entityId, kind);
    if (!one || one.ok !== true) {
      return one || result.internal("image-process-failed");
    }

    const mimeType = String((file as any)?.mimetype || "");
    const fileType = mimeType.startsWith("video") ? "video" : "image";

    out.push({
        fileUrl: toTrimmedString(one.data?.url),
        fileType,
        originalName: String((file as any)?.originalname || ""),
        fileOrder: order++,
    });
  }

  return result.ok("success", { message: false, data: out });
}

function cleanRelPath(input: unknown): string {
  if (typeof input !== "string") return "";

  let rel = input.replace(/\0/g, "").replace(/\\/g, "/").replace(/^\/+/, "");
  rel = path.posix.normalize(rel);

  while (rel.startsWith("../")) rel = rel.slice(3);
  if (rel === "..") rel = "";

  return rel;
}

type RawUploaderOptions = {
  flatIncoming?: boolean;
  incomingRoot?: string;
  limits?: any;
};

function createStorageDirEnsurer(incomingRoot: string) {
  const ensuredDirs = new Set<string>();
  const pendingDirs = new Map<
  string,
  Array<(error:NodeJS.ErrnoException|null)=>void>
  >();

  ensureDir(incomingRoot);
  ensuredDirs.add(incomingRoot);

  function ensureStorageDir(dir: string, cb: any) {
    if (ensuredDirs.has(dir)) {
      cb(null);
      return;
    }

    const pending = pendingDirs.get(dir);
    if (pending) {
      pending.push(cb);
      return;
    }

    pendingDirs.set(dir, [cb]);
    fs.mkdir(dir, { recursive: true }, function(error) {
        const callbacks = pendingDirs.get(dir) || [];
        pendingDirs.delete(dir);
        if (!error) ensuredDirs.add(dir);
        callbacks.forEach((callback) => callback(error));
    });
  }

  return ensureStorageDir;
}

function rawUploadDestination(
  incomingRoot: string,
  flatIncoming: boolean,
  ensureStorageDir: any,
) {
  return function destination(_req: any, file: any, cb: any) {
    if (flatIncoming) {
      ensureStorageDir(incomingRoot, function(error: NodeJS.ErrnoException | null) {
          cb(error, incomingRoot);
      });
      return;
    }

    const rel = cleanRelPath(file.originalname || "");
    const relDir = rel ? path.posix.dirname(rel) : "";
    const destDir =
    relDir && relDir !== "." ? path.join(incomingRoot, relDir) : incomingRoot;

    ensureStorageDir(destDir, function(error: NodeJS.ErrnoException | null) {
        cb(error, destDir);
    });
  };
}

function rawUploadFilename(flatIncoming: boolean) {
  return function filename(_req: any, file: any, cb: any) {
    if (flatIncoming) {
      const rel = cleanRelPath(file.originalname || "");
      const ext = path.extname(rel || String(file.originalname || "")) || "";
      cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
      return;
    }

    const rel = cleanRelPath(file.originalname || "");
    const base = path.basename(rel || "file") || "file";
    cb(null, base);
  };
}

function makeRawUploader(opts: RawUploaderOptions = {}) {
  const incomingRoot =
  typeof opts.incomingRoot === "string" ? opts.incomingRoot : "";
  if (!incomingRoot) throw new Error("missing-incoming-root");

  const flatIncoming = Boolean(opts.flatIncoming);
  const ensureStorageDir = createStorageDirEnsurer(incomingRoot);
  const storage = multer.diskStorage({
      destination: rawUploadDestination(
        incomingRoot,
        flatIncoming,
        ensureStorageDir,
      ),
      filename: rawUploadFilename(flatIncoming),
  });

  return multer({
      limits: opts.limits,
      storage,
      preservePath: !flatIncoming,
  }).any();
}

export {
  makeRawUploader,
  processImageBuffer,
  processImageFile,
  processImageFiles,
  uploadImages,
};
