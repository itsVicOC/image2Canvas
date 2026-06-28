import { describe, expect, it } from "vitest";

import {
  DEFAULT_MODEL,
  type ImageGenerationSettings,
  buildImageRequest,
  getImageEndpoint,
  normalizeBaseUrl,
  parseImageResponse,
} from "./image-api";

const baseSettings: ImageGenerationSettings = {
  baseUrl: "api.example.test/v1/",
  apiKey: "test-key",
  model: DEFAULT_MODEL,
  prompt: "A ceramic teapot",
  count: 2,
  sizePreset: "1024x1024",
  customWidth: 1024,
  customHeight: 1024,
  quality: "high",
  outputFormat: "png",
  outputCompression: 80,
  background: "auto",
  moderation: "auto",
};

describe("normalizeBaseUrl", () => {
  it("adds https and strips trailing slashes", () => {
    expect(normalizeBaseUrl("api.example.test/v1/")).toBe("https://api.example.test/v1");
  });

  it("accepts a pasted images/generations endpoint", () => {
    expect(getImageEndpoint("https://api.example.test/v1/images/generations")).toBe(
      "https://api.example.test/v1/images/generations",
    );
  });
});

describe("buildImageRequest", () => {
  it("builds the image generation endpoint and JSON body", () => {
    const request = buildImageRequest(baseSettings);
    expect(request.endpoint).toBe("https://api.example.test/v1/images/generations");
    expect(request.body).toEqual({
      model: DEFAULT_MODEL,
      prompt: "A ceramic teapot",
      n: 2,
      size: "1024x1024",
      quality: "high",
      output_format: "png",
      background: "auto",
      moderation: "auto",
    });
    expect(request.init.headers).toMatchObject({ Authorization: "Bearer test-key" });
  });

  it("validates and serializes custom size plus compression", () => {
    const request = buildImageRequest({
      ...baseSettings,
      sizePreset: "custom",
      customWidth: 1536,
      customHeight: 1024,
      outputFormat: "webp",
      outputCompression: 72,
    });
    expect(request.body.size).toBe("1536x1024");
    expect(request.body.output_compression).toBe(72);
  });

  it("clamps count and compression to supported ranges", () => {
    const request = buildImageRequest({
      ...baseSettings,
      count: 42,
      outputFormat: "jpeg",
      outputCompression: 140,
    });
    expect(request.body.n).toBe(10);
    expect(request.body.output_compression).toBe(100);
  });
});

describe("parseImageResponse", () => {
  it("converts base64 images to data URLs", () => {
    const images = parseImageResponse({ data: [{ b64_json: "abc", revised_prompt: "better" }] }, "prompt", "png", 100);
    expect(images).toEqual([
      {
        id: "100-0",
        src: "data:image/png;base64,abc",
        mimeType: "image/png",
        prompt: "prompt",
        revisedPrompt: "better",
        createdAt: 100,
      },
    ]);
  });

  it("accepts URL image responses", () => {
    const images = parseImageResponse({ data: [{ url: "https://cdn.example.test/image.png" }] }, "prompt", "jpeg", 100);
    expect(images[0]?.src).toBe("https://cdn.example.test/image.png");
    expect(images[0]?.mimeType).toBe("image/jpeg");
  });
});
