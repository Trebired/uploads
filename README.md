# @trebired/uploads

Server-side upload processing for Trebired apps: multer wiring, image encode/resize via `sharp`, disk storage, and static serving for configured image upload kinds.

This package owns multer middleware construction, image buffer encoding (AVIF/GIF), writing encoded images to disk, and serving saved images from the configured `mountPath` for each kind. It does not own the client-side upload widget (`@trebired/frontend`'s `inputs/advanced/upload.tsx` owns that), mutating upload routes, authentication, or entity persistence — the app supplies routes that call into this package.

## Install

Runtime support: Bun 1+.

```sh
bun i @trebired/uploads
```

## Quick Start

```ts
import { attachUploads, processImageFile, uploadImages } from "@trebired/uploads";

await attachUploads(app);

app.post("/avatar", uploadImages.single("file"), async (req, res) => {
  const result = await processImageFile(req.file, req.user.id, "avatar");
  res.json(result);
});
```

## Concepts

### Image upload kinds

Every image goes through a named "kind" (for example `"avatar"`, `"logo"`), each mapping to a directory, a URL builder, and a layout (`"entity"`: files nested under `<dir>/<entityId>/`, or `"flat"`: files written directly into `<dir>`). Kinds are entirely app-defined — this package ships none.

### Encoding

Images encode to AVIF by default; GIFs are preserved as GIF when the source is a GIF. `width`, `crop`, `quality`, and `maxBytes` in `ImageEncodeOptions` control the output; quality steps down automatically until the result fits `maxBytes`.

## Configuration

### `.trebired/uploads/config.ts`

```ts
import { defineConfig } from "@trebired/uploads";

export default defineConfig({
  forVersion: "0.1.0",
  imageKinds: {
    avatar: {
      dir: "/var/data/uploads/avatars",
      mountPath: "/uploads/avatars",
      layout: "entity",
      url: (entityId, fileName) => `/uploads/avatars/${entityId}/${fileName}`,
    },
  },
});
```

Call `await attachUploads(app)` once at startup to load this file, register its `imageKinds`, and mount static GET/HEAD handlers for each configured `mountPath`. Apps that do not need static serving can call `bootstrapUploadsConfig()` directly. Apps that build kinds programmatically instead can call `configureImageUploadKinds(kinds)` directly before `attachUploads(app)` — `ensureImageKind`, `processImageBuffer`, and every function built on them read from whichever was called last, and throw a clear `uploads-not-configured` error if neither ran yet.

## Public API

- `attachUploads(app, options?)`, `attachUploadStaticRoutes(app, options?)`: load the upload config and mount static GET/HEAD handlers for configured image upload kind `mountPath` values.
- `bootstrapUploadsConfig(options?)`, `configureImageUploadKinds(kinds)`: register the app's image upload kinds, from config or programmatically.
- `defineConfig`, `loadUploadsConfig`: `.trebired/uploads/config.ts` support.
- `uploadImages`: a ready-made `multer` instance restricted to image MIME types/extensions, 5 MB limit.
- `processImageFile(file, entityId, kind, outName?, encodeOpts?)`, `processImageFiles(files, entityId, kind)`, `processImageBuffer(buffer, entityId, kind, outName?, encodeOpts?)`: encode and write an uploaded image.
- `makeRawUploader(options)`: a `multer` instance for non-image raw file uploads, with flat or path-preserving disk storage.
- `ensureImageKind(kind)`, `isSafeFlatUploadFileName(fileName, kind)`, `resolveFlatUploadFileName(base, kind, opts?)`, `makeOutputFileName(base, opts?)`, `defaultImageExt(opts?)`: the kind-resolution and filename primitives the functions above are built from.
- `flatUploadFileNameFromId`, `flatUploadGeneratedId`, `flatUploadIdFromValue`, `flatUploadUrlFromId`: helpers for flat-layout kinds keyed by a generated ID.

## What It Does Not Do

This package does not:

- Ship a client-side upload UI. Use `@trebired/frontend`'s upload component alongside it.
- Define any image upload kinds by default. The app configures every kind it uses.
- Handle authentication, authorization, or mutating upload route wiring.
- Persist upload metadata to a database.
