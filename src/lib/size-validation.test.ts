import { describe, expect, it } from "vitest";

import { validateImage2Size } from "./size-validation";

describe("validateImage2Size", () => {
  it("accepts valid custom dimensions", () => {
    expect(validateImage2Size(1024, 1536)).toEqual({
      valid: true,
      size: "1024x1536",
      pixels: 1_572_864,
    });
  });

  it("requires both edges to be multiples of 16", () => {
    const result = validateImage2Size(1025, 1024);
    expect(result.valid).toBe(false);
    expect(result).toMatchObject({ message: "宽高都必须是 16 的倍数。" });
  });

  it("rejects images wider than the 3:1 aspect ratio", () => {
    const result = validateImage2Size(3072, 1008);
    expect(result.valid).toBe(false);
    expect(result).toMatchObject({ message: "宽高比不能超过 3:1。" });
  });

  it("rejects total pixels outside the supported range", () => {
    expect(validateImage2Size(512, 512)).toMatchObject({
      valid: false,
      message: "总像素不能低于 655,360。",
    });
    expect(validateImage2Size(3840, 3840)).toMatchObject({
      valid: false,
      message: "总像素不能超过 8,294,400。",
    });
  });
});
