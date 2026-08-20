# Changelog

All notable changes to `@trebired/uploads` will be documented here.

This project follows semantic versioning once published.

## 0.1.1

- Changed uploads initialization logging to call `@package/logger-adapter` directly from `bootstrapUploadsConfig`.
- Removed the public `setUploadsLogger` API; package runtime logging is initialized through `bootstrapUploadsConfig({ logger, loggerAdapter })`.

## 0.1.0

- Added `uploadImages`, `processImageFile`, `processImageFiles`, `processImageBuffer`, `makeRawUploader`: multer wiring and image encode/write, moved from platform's `core/uploads.ts`.
- Added `ensureImageKind`, `isSafeFlatUploadFileName`, `resolveFlatUploadFileName`, `makeOutputFileName`, `defaultImageExt`: kind-resolution and filename primitives, moved from `core/uploads/image/helpers.ts`.
- Added `flatUploadFileNameFromId`, `flatUploadGeneratedId`, `flatUploadIdFromValue`, `flatUploadUrlFromId`, moved from `core/uploads/image/flat.ts`.
- Changed image upload kinds from hardcoded (the previous `buildImageUploadTypeConfig` shipped app-specific directories and mount paths) to app-configured: `configureImageUploadKinds`/`bootstrapUploadsConfig` register kinds from `.trebired/uploads/config.ts` or programmatically. Packages don't ship app-specific data.
- Removed `getUploadStaticMounts`: unused anywhere in the codebase it moved from.
- Added `setUploadsLogger` to point internal logging at the app's own logger; defaults to a no-op.
