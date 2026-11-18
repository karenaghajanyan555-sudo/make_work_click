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
  /**
   * RGB → YUV with the BT.709 matrix, tagged (D40). Remotion 4's default is BT.601 with the
   * matrix untagged: Chrome then showed the brand lime as 199,230,93 instead of 201,242,93.
   */
  colorSpace: 'bt709',
  /** Remotion's default `--gl` is fine for CSS-only scenes; keep explicit for determinism. */
  gl: 'swangle',
} as const;
