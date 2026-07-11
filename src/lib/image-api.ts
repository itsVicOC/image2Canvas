import { validateImage2Size } from "./size-validation";

export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_MODEL = "gpt-image-2";

export const SIZE_PRESETS = [
  "auto",
  "1k-square",
  "1k-landscape",
  "1k-portrait",
  "2k-square",
  "2k-landscape",
  "2k-portrait",
  "4k-landscape",
  "4k-portrait",
  "custom",
] as const;
export const QUALITY_OPTIONS = ["auto", "low", "medium", "high"] as const;
export const OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;
export const BACKGROUND_OPTIONS = ["auto", "opaque", "transparent"] as const;
export const MODERATION_OPTIONS = ["auto", "low"] as const;

export type SizePreset = (typeof SIZE_PRESETS)[number];
export type Quality = (typeof QUALITY_OPTIONS)[number];
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
export type Background = (typeof BACKGROUND_OPTIONS)[number];
export type Moderation = (typeof MODERATION_OPTIONS)[number];

export const SIZE_PRESET_DETAILS = {
  auto: { label: "自动", badge: "自动尺寸", size: "auto", description: "由模型自动选择" },
  "1k-square": {
    label: "1K 方图",
    badge: "1K 方图 · 1024x1024",
    size: "1024x1024",
    description: "1:1 · 1.0 MP",
  },
  "1k-landscape": {
    label: "1K 横图",
    badge: "1K 横图 · 1536x1024",
    size: "1536x1024",
    description: "3:2 · 1.6 MP",
  },
  "1k-portrait": {
    label: "1K 竖图",
    badge: "1K 竖图 · 1024x1536",
    size: "1024x1536",
    description: "2:3 · 1.6 MP",
  },
  "2k-square": {
    label: "2K 方图",
    badge: "2K 方图 · 2048x2048",
    size: "2048x2048",
    description: "1:1 · 4.2 MP",
  },
  "2k-landscape": {
    label: "2K 宽屏",
    badge: "2K 宽屏 · 2048x1152",
    size: "2048x1152",
    description: "16:9 · 2.4 MP",
  },
  "2k-portrait": {
    label: "2K 竖屏",
    badge: "2K 竖屏 · 1152x2048",
    size: "1152x2048",
    description: "9:16 · 2.4 MP",
  },
  "4k-landscape": {
    label: "4K 宽屏",
    badge: "4K 宽屏 · 3840x2160",
    size: "3840x2160",
    description: "16:9 · 8.3 MP",
  },
  "4k-portrait": {
    label: "4K 竖屏",
    badge: "4K 竖屏 · 2160x3840",
    size: "2160x3840",
    description: "9:16 · 8.3 MP",
  },
  custom: { label: "自定义", badge: "自定义", size: null, description: "手动输入宽高" },
} satisfies Record<SizePreset, { label: string; badge: string; size: string | null; description: string }>;

export const SIZE_PRESET_GROUPS = [
  { label: "智能", options: ["auto"] },
  { label: "1K", options: ["1k-square", "1k-landscape", "1k-portrait"] },
  { label: "2K", options: ["2k-square", "2k-landscape", "2k-portrait"] },
  { label: "4K", options: ["4k-landscape", "4k-portrait"] },
  { label: "高级", options: ["custom"] },
] as const satisfies ReadonlyArray<{ label: string; options: ReadonlyArray<SizePreset> }>;

export const QUALITY_LABELS = {
  auto: "自动",
  low: "低",
  medium: "中",
  high: "高",
} satisfies Record<Quality, string>;

export const BACKGROUND_LABELS = {
  auto: "自动",
  opaque: "不透明",
  transparent: "透明",
} satisfies Record<Background, string>;

export const MODERATION_LABELS = {
  auto: "自动",
  low: "低强度",
} satisfies Record<Moderation, string>;

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
    return SIZE_PRESET_DETAILS[settings.sizePreset].size;
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
  const count = Number.isFinite(settings.count) ? Math.min(Math.max(Math.round(settings.count), 1), 10) : 1;

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
    n: count,
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
