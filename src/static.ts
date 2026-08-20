import fs from "fs";
import path from "path";

import {
  bootstrapUploadsConfig,
  readConfiguredImageUploadKinds,
} from "./registry.js";
import type { BootstrapUploadsConfigOptions } from "./registry.js";
import type { ImageUploadKindConfig } from "./config.js";

type UploadStaticRouteOptions = BootstrapUploadsConfigOptions& {
  cacheControl?: false | string;
};

type UploadStaticAttachResult = {
  attachedCount: number;
  skippedCount: number;
};

type UploadStaticHandler = (req: any, res: any, next?: any) => void;

type UploadStaticApp = {
  use: (mountPath: string, handler: UploadStaticHandler) => unknown;
};

const attachedApps = new WeakMap<object, Set<string>>();

function isUploadStaticApp(app: unknown): app is UploadStaticApp {
  return Boolean(app && typeof(app as any).use === "function");
}

function normalizeMountPath(mountPath: unknown): string {
  const value = typeof mountPath === "string" ? mountPath.trim() : "";
  if (!value) return "";

  const clean = value.replace(/^\/+/g, "").replace(/\/+$/g, "");
  return clean ? `/${clean}` : "/";
}

function routeKey(name: string, kind: ImageUploadKindConfig): string {
  return [
    name,
    normalizeMountPath(kind.mountPath),
    path.resolve(kind.dir || "."),
    kind.layout,
  ].join("\0");
}

function rememberAttachedRoute(app: UploadStaticApp, key: string): boolean {
  const objectApp = app as object;
  let keys = attachedApps.get(objectApp);
  if (!keys) {
    keys = new Set<string>();
    attachedApps.set(objectApp, keys);
  }

  if (keys.has(key)) return false;
  keys.add(key);
  return true;
}

function extractRequestPathname(req: any): string {
  const rawUrl = typeof req?.url === "string" ? req.url : "";
  if (!rawUrl) return "";

  try {
    return new URL(rawUrl, "http://uploads.local").pathname;
  } catch {
    return "";
  }
}

function decodePathSegments(pathname: string): string[] | null {
  const rawSegments = pathname.split("/").filter(Boolean);
  const segments: string[] = [];

  for (const segment of rawSegments) {
    try {
      segments.push(decodeURIComponent(segment));
    } catch {
      return null;
    }
  }

  return segments;
}

function isSafePathSegment(segment: string): boolean {
  return Boolean(
    segment &&
      segment !== "." &&
      segment !== ".." &&
      !segment.includes("/") &&
      !segment.includes("\\") &&
      !segment.includes("\0"),
  );
}

function isPathInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return Boolean(rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel)));
}

function uploadFilePathForSegments(
  kind: ImageUploadKindConfig,
  segments: string[],
): string | null {
  if (kind.layout === "flat") {
    if (segments.length !== 1 || !isSafePathSegment(segments[0])) return null;
  } else if (
    segments.length !== 2 ||
      !isSafePathSegment(segments[0]) ||
      !isSafePathSegment(segments[1])
  ) {
    return null;
  }

  const root = path.resolve(kind.dir || "");
  if (!root || !path.isAbsolute(root)) return null;

  const target = path.resolve(root, ...segments);
  return isPathInside(target, root) ? target : null;
}

function resolveUploadContentType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".avif":
    return "image/avif";
    case ".bmp":
    return "image/bmp";
    case ".gif":
    return "image/gif";
    case ".ico":
    return "image/x-icon";
    case ".jpeg":
    case ".jpg":
    return "image/jpeg";
    case ".png":
    return "image/png";
    case ".svg":
    return "image/svg+xml";
    case ".tif":
    case ".tiff":
    return "image/tiff";
    case ".webp":
    return "image/webp";
    default:
    return "application/octet-stream";
  }
}

function continueRequest(res: any, next: any) {
  if (typeof next === "function") {
    next();
    return;
  }

  if (!res.headersSent) res.statusCode = 404;
  if (typeof res.end === "function") res.end();
}

function setHeader(res: any, name: string, value: string | number): void {
  if (typeof res?.setHeader === "function") {
    res.setHeader(name, value);
  } else if (typeof res?.set === "function") {
    res.set(name, value);
  }
}

function createUploadStaticHandler(
  kind: ImageUploadKindConfig,
  options: UploadStaticRouteOptions,
): UploadStaticHandler {
  return function uploadStaticHandler(req: any, res: any, next: any) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      continueRequest(res, next);
      return;
    }

    const segments = decodePathSegments(extractRequestPathname(req));
    const filePath = segments ? uploadFilePathForSegments(kind, segments) : null;
    if (!filePath) {
      continueRequest(res, next);
      return;
    }

    fs.stat(filePath, (error: NodeJS.ErrnoException | null, stat: fs.Stats) => {
        if (error || !stat.isFile()) {
          continueRequest(res, next);
          return;
        }

        res.statusCode = 200;
        setHeader(res, "Content-Type", resolveUploadContentType(filePath));
        setHeader(res, "Content-Length", stat.size);
        setHeader(res, "X-Content-Type-Options", "nosniff");
        if (options.cacheControl !== false && options.cacheControl) {
          setHeader(res, "Cache-Control", options.cacheControl);
        }

        if (method === "HEAD") {
          res.end();
          return;
        }

        const stream = fs.createReadStream(filePath);
        stream.on("error", (streamError) => {
            if (res.headersSent) {
              if (typeof res.destroy === "function") res.destroy(streamError);
              return;
            }

            if (typeof next === "function") {
              next(streamError);
              return;
            }

            res.statusCode = 500;
            res.end();
        });
        stream.pipe(res);
    });
  };
}

async function attachUploadStaticRoutes(
  app: unknown,
  options: UploadStaticRouteOptions = {},
): Promise<UploadStaticAttachResult> {
  await bootstrapUploadsConfig({
      cwd: options.cwd,
      logger: options.logger,
      loggerAdapter: options.loggerAdapter,
  });

  const kinds = readConfiguredImageUploadKinds();
  if (!kinds || !isUploadStaticApp(app)) {
    return { attachedCount: 0, skippedCount: 0 };
  }

  let attachedCount = 0;
  let skippedCount = 0;

  for (const [name, kind] of Object.entries(kinds)) {
    const mountPath = normalizeMountPath(kind.mountPath);
    if (!mountPath || !kind.dir) {
      skippedCount += 1;
      continue;
    }

    if (!rememberAttachedRoute(app, routeKey(name, kind))) {
      skippedCount += 1;
      continue;
    }

    app.use(mountPath, createUploadStaticHandler(kind, options));
    attachedCount += 1;
  }

  return { attachedCount, skippedCount };
}

async function attachUploads(
  app: unknown,
  options: UploadStaticRouteOptions = {},
): Promise<UploadStaticAttachResult> {
  return attachUploadStaticRoutes(app, options);
}

export { attachUploads, attachUploadStaticRoutes };
export type { UploadStaticAttachResult, UploadStaticRouteOptions };
