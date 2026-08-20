import { generateId, toTrimmedString } from "@trebired/utils";

import {
  ensureImageKind,
  isSafeFlatUploadFileName,
  resolveFlatUploadFileName,
} from "./helpers.js";

function flatUploadFileNameFromId(id: unknown, kind: unknown) {
  const base: any = toTrimmedString(id);
  if (!base) return "";
  return resolveFlatUploadFileName(base, kind, {});
}

function flatUploadUrlFromId(id: unknown, kind: unknown) {
  const fileName: any = flatUploadFileNameFromId(id, kind);
  if (!fileName) return "";

  if (!isSafeFlatUploadFileName(fileName, kind)) return "";

  const cfg = ensureImageKind(kind);
  const cfgData: any = cfg && cfg.ok === true ? cfg.data : null;
  if (!cfgData) return "";
  return cfgData.url("", fileName);
}

function flatUploadGeneratedId(): string {
  return toTrimmedString(generateId("numeric"));
}

function flatUploadIdFromValue(value: unknown): string {
  const current =
  value && typeof value === "object" && !Array.isArray(value)
  ? (value as any)
  : null;
  return toTrimmedString(current && current.id ? current.id : value);
}

export {
  flatUploadFileNameFromId,
  flatUploadGeneratedId,
  flatUploadIdFromValue,
  flatUploadUrlFromId,
};
