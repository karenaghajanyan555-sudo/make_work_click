/**
 * Render settings shared by the pipeline (Node API) and remotion.config.ts
 * (Studio/CLI). Measured on the reference machine: see docs/DECISIONS.md.
 */
export const RENDER = {
  /** Chrome tabs rendering in parallel. 2 measured fastest per MB; 3 was not faster. */
  concurrency: 2,
  codec: 'h264',
  /** Master quality before platform re-encode. ~12 Mbps at 1080x1920. */
  crf: 16,
  pixelFormat: 'yuv420p',
  /** Intermediate frame format: JPEG q95 is visually lossless and light on RAM/disk. */
  imageFormat: 'jpeg',
  jpegQuality: 95,
  /** Remotion's default `--gl` is fine for CSS-only scenes; keep explicit for determinism. */
  gl: 'swangle',
} as const;
