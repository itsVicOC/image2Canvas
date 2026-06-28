export const IMAGE2_MIN_PIXELS = 655_360;
export const IMAGE2_MAX_PIXELS = 8_294_400;
export const IMAGE2_MAX_EDGE = 3_840;
export const IMAGE2_EDGE_MULTIPLE = 16;
export const IMAGE2_MAX_ASPECT_RATIO = 3;

export type SizeValidationResult =
  | { valid: true; size: `${number}x${number}`; pixels: number }
  | { valid: false; message: string };

export function validateImage2Size(width: number, height: number): SizeValidationResult {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return { valid: false, message: "宽高必须是整数。" };
  }

  if (width <= 0 || height <= 0) {
    return { valid: false, message: "宽高必须大于 0。" };
  }

  if (width > IMAGE2_MAX_EDGE || height > IMAGE2_MAX_EDGE) {
    return { valid: false, message: "单边不能超过 3840 像素。" };
  }

  if (width % IMAGE2_EDGE_MULTIPLE !== 0 || height % IMAGE2_EDGE_MULTIPLE !== 0) {
    return { valid: false, message: "宽高都必须是 16 的倍数。" };
  }

  const ratio = Math.max(width, height) / Math.min(width, height);
  if (ratio > IMAGE2_MAX_ASPECT_RATIO) {
    return { valid: false, message: "宽高比不能超过 3:1。" };
  }

  const pixels = width * height;
  if (pixels < IMAGE2_MIN_PIXELS) {
    return { valid: false, message: "总像素不能低于 655,360。" };
  }

  if (pixels > IMAGE2_MAX_PIXELS) {
    return { valid: false, message: "总像素不能超过 8,294,400。" };
  }

  return { valid: true, size: `${width}x${height}`, pixels };
}
