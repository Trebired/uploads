import type { ImageEncodeOptions } from "./helpers.js";

type ImageCropSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const num: any = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const intValue: any = Math.floor(num);
  if (intValue < min) return min;
  if (intValue > max) return max;
  return intValue;
}

async function createSharp(
  input: Buffer,
  options: Record<string, unknown> = {},
) {
  const { default: sharp } = await import("sharp");
  return sharp(input, options);
}

async function encodeAvifFromBuffer(
  buffer: Buffer,
  opts: ImageEncodeOptions = {},
): Promise<Buffer> {
  const maxBytes = clampInt(opts.maxBytes, 1, 1024 * 1024 * 1024, 500 * 1024);
  let quality = clampInt(opts.quality, 1, 100, 80);
  const makePipeline = async(nextQuality: number) =>
  (await createSharp(buffer, { failOnError: false })).avif({
      quality: nextQuality,
  });
  let out = await (await makePipeline(quality)).toBuffer();

  while (out.length > maxBytes && quality > 10) {
    quality -= 10;
    out = await (await makePipeline(quality)).toBuffer();
  }

  return out;
}

function parseImageCropSpec(value: unknown): ImageCropSpec | null {
  let raw = value;
  if (typeof raw === "string") {
    raw = raw.trim();
    if (!raw) return null;
    try {
      raw = JSON.parse(String(raw));
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== "object") return null;
  const crop = raw as Record<string, unknown>;
  const localX: any = Number(crop.x);
  const localY: any = Number(crop.y);
  const width: any = Number(crop.width);
  const height: any = Number(crop.height);
  if (
    !Number.isFinite(localX) ||
      !Number.isFinite(localY) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
  )
  return null;
  if (width <= 0 || height <= 0) return null;
  return { x: localX, y: localY, width, height };
}

function resolveImageCrop(meta: any, crop: ImageCropSpec | null) {
  if (!meta || !crop) return null;

  const sourceWidth = Number.isFinite(meta.width) ? meta.width : 0;
  const sourceHeight = Number.isFinite(meta.pageHeight)
  ? meta.pageHeight
  : Number.isFinite(meta.height)
  ? meta.height
  : 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  const left = Math.max(0, Math.floor(crop.x));
  const top = Math.max(0, Math.floor(crop.y));
  const width = Math.max(1, Math.round(crop.width));
  const height = Math.max(1, Math.round(crop.height));
  if (left >= sourceWidth || top >= sourceHeight) return null;

  return {
    left,
    top,
    width: Math.min(width, sourceWidth - left),
    height: Math.min(height, sourceHeight - top),
  };
}

async function prepareImageBufferForAvif(
  buffer: Buffer,
  opts: ImageEncodeOptions = {},
): Promise<Buffer> {
  const width = clampInt(opts.width, 1, 100000, 1280);
  const crop: any = parseImageCropSpec(opts.crop);
  let image = await createSharp(buffer, { failOnError: false });
  const meta: any = await image.metadata();
  const extract = resolveImageCrop(meta, crop);

  if (extract) image = image.extract(extract);
  const currentWidth = extract
  ? extract.width
  : Number.isFinite(meta?.width)
  ? meta.width
  : 0;
  if (currentWidth > 0 && currentWidth > width)
  image = image.resize({ width, withoutEnlargement: true });
  return image.toBuffer();
}

async function encodeGifFromBuffer(
  buffer: Buffer,
  opts: ImageEncodeOptions = {},
): Promise<Buffer> {
  const width = clampInt(opts.width, 1, 100000, 1280);
  const crop: any = parseImageCropSpec(opts.crop);
  let image = await createSharp(buffer, { animated: true, failOnError: false });
  const meta: any = await image.metadata();
  const extract = resolveImageCrop(meta, crop);

  if (extract) image = image.extract(extract);
  const currentWidth = extract
  ? extract.width
  : Number.isFinite(meta?.width)
  ? meta.width
  : 0;
  if (currentWidth > 0 && currentWidth > width)
  image = image.resize({ width, withoutEnlargement: true });

  const gifOptions: any = { effort: 7 };
  if (Number.isFinite(meta?.loop)) gifOptions.loop = meta.loop;
  if (Array.isArray(meta?.delay) && meta.delay.length)
  gifOptions.delay = meta.delay;
  return image.gif(gifOptions).toBuffer();
}

export { encodeAvifFromBuffer, encodeGifFromBuffer, prepareImageBufferForAvif };
