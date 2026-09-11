# Changelog

All notable changes to `@trebired/uploads` will be documented here.

This project follows semantic versioning once published.

## 0.2.1

- Changed the verification scripts and examples to print through `@trebired/logger-adapter` instead of `console` and `process.stdout`.

## 0.2.0

- Updated the `@trebired/utils` dependency range to `^0.9.0`, keeping every `@trebired` package on one range so a project cannot resolve two copies.
- Updated the shipped `.trebired/logger/config.ts` `forVersion` to `2.7.0` and the `@trebired/code-discipline` / `@trebired/configs` ranges to `^7.2.0` / `^0.4.0`. The logger config named an older release, so under `@trebired/logger` 2.7 the version check threw and this package's log prefix was dropped.

## 0.1.4

- Added package-owned static serving for configured image upload kinds through `attachUploads`/`attachUploadStaticRoutes`.
- Added generic GET/HEAD handling for configured `mountPath` values, with traversal-safe path resolution and image content types.

## 0.1.3

- Updated env and result dependency ranges to the current package releases so consumers do not retain older nested logger-adapter installs.

## 0.1.2

- Updated the logger-adapter dependency so uploads initialization logs remain idempotent.

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
