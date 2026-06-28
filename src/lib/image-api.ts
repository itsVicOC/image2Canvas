import { validateImage2Size } from "./size-validation";

export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_MODEL = "gpt-image-2";

export const SIZE_PRESETS = ["auto", "1024x1024", "1024x1536", "1536x1024", "custom"] as const;
export const QUALITY_OPTIONS = ["auto", "low", "medium", "high"] as const;
export const OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;
export const BACKGROUND_OPTIONS = ["auto", "opaque", "transparent"] as const;
export const MODERATION_OPTIONS = ["auto", "low"] as const;

export type SizePreset = (typeof SIZE_PRESETS)[number];
export type Quality = (typeof QUALITY_OPTIONS)[number];
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
export type Background = (typeof BACKGROUND_OPTIONS)[number];
export type Moderation = (typeof MODERATION_OPTIONS)[number];

export type ImageGenerationSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  count: number;
  sizePreset: SizePreset;
  customWidth: number;
  customHeight: number;
  quality: Quality;
  outputFormat: OutputFormat;
  outputCompression: number;
  background: Background;
  moderation: Moderation;
};

export type ImageRequestBody = {
  model: string;
  prompt: string;
  n: number;
  size: string;
  quality: Quality;
  output_format: OutputFormat;
  output_compression?: number;
  background: Background;
  moderation: Moderation;
};

export type GeneratedImage = {
  id: string;
  src: string;
  mimeType: string;
  prompt: string;
  revisedPrompt?: string;
  createdAt: number;
};

type ImageApiData = {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
};

type ImageApiResponse = {
  data?: ImageApiData[];
};

export function normalizeBaseUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  const pathname = url.pathname.replace(/\/+$/, "").replace(/\/images\/generations$/i, "");
  url.pathname = pathname || "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

export function getImageEndpoint(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/images/generations`;
}

export function getMimeType(format: OutputFormat) {
  if (format === "jpeg") {
    return "image/jpeg";
  }

  if (format === "webp") {
    return "image/webp";
  }

  return "image/png";
}

export function resolveSize(settings: Pick<ImageGenerationSettings, "sizePreset" | "customWidth" | "customHeight">) {
  if (settings.sizePreset !== "custom") {
    return settings.sizePreset;
  }

  const result = validateImage2Size(settings.customWidth, settings.customHeight);
  if (!result.valid) {
    throw new Error(result.message);
  }

  return result.size;
}

export function buildImageRequest(settings: ImageGenerationSettings) {
  const prompt = settings.prompt.trim();
  const model = settings.model.trim();
  const apiKey = settings.apiKey.trim();

  if (!prompt) {
    throw new Error("请输入提示词。");
  }

  if (!model) {
    throw new Error("请输入模型名称。");
  }

  if (!apiKey) {
    throw new Error("请输入 API key。");
  }

  const body: ImageRequestBody = {
    model,
    prompt,
    n: Math.min(Math.max(Math.round(settings.count), 1), 10),
    size: resolveSize(settings),
    quality: settings.quality,
    output_format: settings.outputFormat,
    background: settings.background,
    moderation: settings.moderation,
  };

  if (settings.outputFormat !== "png") {
    body.output_compression = Math.min(Math.max(Math.round(settings.outputCompression), 0), 100);
  }

  return {
    endpoint: getImageEndpoint(settings.baseUrl),
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    } satisfies RequestInit,
    body,
  };
}

export function parseImageResponse(
  payload: unknown,
  prompt: string,
  outputFormat: OutputFormat,
  now = Date.now(),
): GeneratedImage[] {
  const data = (payload as ImageApiResponse)?.data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("响应中没有图片数据。");
  }

  const mimeType = getMimeType(outputFormat);
  return data.map((item, index) => {
    const src = item.b64_json ? `data:${mimeType};base64,${item.b64_json}` : item.url;
    if (!src) {
      throw new Error("响应中的图片缺少 b64_json 或 url。");
    }

    return {
      id: `${now}-${index}`,
      src,
      mimeType,
      prompt,
      revisedPrompt: item.revised_prompt,
      createdAt: now,
    };
  });
}

export async function readImageApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string }; message?: string };
    return payload.error?.message ?? payload.message ?? `请求失败：${response.status}`;
  } catch {
    return `请求失败：${response.status}`;
  }
}
