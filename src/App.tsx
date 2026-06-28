import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Brush,
  Check,
  Copy,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  Maximize2,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trash2,
  WandSparkles,
} from "lucide-react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select } from "./components/ui/select";
import { Switch } from "./components/ui/switch";
import { Textarea } from "./components/ui/textarea";
import {
  BACKGROUND_OPTIONS,
  BACKGROUND_LABELS,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  type GeneratedImage,
  type ImageGenerationSettings,
  MODERATION_LABELS,
  MODERATION_OPTIONS,
  OUTPUT_FORMATS,
  QUALITY_LABELS,
  QUALITY_OPTIONS,
  SIZE_PRESET_DETAILS,
  SIZE_PRESETS,
  buildImageRequest,
  parseImageResponse,
  readImageApiError,
} from "./lib/image-api";
import { clearStoredKey, readStoredKey, saveStoredKey } from "./lib/key-storage";
import { validateImage2Size } from "./lib/size-validation";
import { cn } from "./lib/utils";

type Settings = ImageGenerationSettings & {
  rememberKey: boolean;
};

const DEFAULT_PROMPT =
  "一只透明玻璃茶杯放在拉丝金属桌面上，柔和影棚光，产品摄影构图，细节清晰，质感高级";

function createInitialSettings(): Settings {
  const stored = readStoredKey();
  return {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: stored.apiKey,
    rememberKey: stored.remember,
    model: DEFAULT_MODEL,
    prompt: DEFAULT_PROMPT,
    count: 1,
    sizePreset: "1k-square",
    customWidth: 1024,
    customHeight: 1024,
    quality: "auto",
    outputFormat: "png",
    outputCompression: 82,
    background: "auto",
    moderation: "auto",
  };
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

async function copyImage(image: GeneratedImage) {
  if (image.src.startsWith("data:") && "ClipboardItem" in window && navigator.clipboard.write) {
    const blob = await fetch(image.src).then((response) => response.blob());
    await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })]);
    return;
  }

  await navigator.clipboard.writeText(image.src);
}

function downloadImage(image: GeneratedImage) {
  const extension = image.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const anchor = document.createElement("a");
  anchor.href = image.src;
  anchor.download = `image2-${image.id}.${extension}`;
  anchor.rel = "noreferrer";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => createInitialSettings());
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0],
    [images, selectedId],
  );

  const customSizeValidation = useMemo(
    () => validateImage2Size(settings.customWidth, settings.customHeight),
    [settings.customHeight, settings.customWidth],
  );

  useEffect(() => {
    if (settings.apiKey.trim()) {
      saveStoredKey(settings.apiKey, settings.rememberKey);
    } else {
      clearStoredKey();
    }
  }, [settings.apiKey, settings.rememberKey]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewImage]);

  function updateSetting<Key extends keyof Settings>(key: Key, value: Settings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    let request: ReturnType<typeof buildImageRequest>;
    try {
      request = buildImageRequest(settings);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求参数无效。");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);

    try {
      const response = await fetch(request.endpoint, {
        ...request.init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await readImageApiError(response));
      }

      const payload = await response.json();
      const generated = parseImageResponse(payload, settings.prompt.trim(), settings.outputFormat);
      setImages((current) => [...generated, ...current]);
      setSelectedId(generated[0]?.id ?? "");
      setNotice(`已生成 ${generated.length} 张图片`);
    } catch (generationError) {
      if (generationError instanceof DOMException && generationError.name === "AbortError") {
        setNotice("已取消生成");
        return;
      }

      setError(generationError instanceof Error ? generationError.message : "生成失败。");
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }

  function abortGenerate() {
    abortRef.current?.abort();
  }

  function openPreview(image: GeneratedImage) {
    setSelectedId(image.id);
    setPreviewImage(image);
  }

  async function handleCopy(image: GeneratedImage) {
    try {
      await copyImage(image);
      setNotice("已复制图片");
    } catch {
      try {
        await navigator.clipboard.writeText(image.src);
        setNotice("已复制图片地址");
      } catch {
        setError("浏览器拒绝复制，请手动保存图片。");
      }
    }
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
    setPreviewImage((current) => (current?.id === id ? null : current));
    if (selectedId === id) {
      const nextImage = images.find((image) => image.id !== id);
      setSelectedId(nextImage?.id ?? "");
    }
  }

  function reusePrompt(image: GeneratedImage) {
    updateSetting("prompt", image.revisedPrompt ?? image.prompt);
    setNotice("提示词已放回编辑区");
  }

  return (
    <main className="min-h-screen bg-app text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-border bg-panel/95 px-4 py-4 backdrop-blur lg:h-screen lg:w-[390px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5">
          <form className="space-y-5" onSubmit={handleGenerate}>
            <header className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Brush className="size-4" />
                  image2 Canvas
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal">在线图片画布</h1>
              </div>
              <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                GitHub Pages
              </div>
            </header>

            <section className="space-y-3 rounded-md border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">连接</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>记住 key</span>
                  <Switch
                    checked={settings.rememberKey}
                    onChange={(event) => updateSetting("rememberKey", event.currentTarget.checked)}
                    aria-label="记住 API key"
                  />
                </div>
              </div>

              <Field label="Base URL" htmlFor="base-url">
                <Input
                  id="base-url"
                  value={settings.baseUrl}
                  onChange={(event) => updateSetting("baseUrl", event.currentTarget.value)}
                  placeholder="https://api.openai.com/v1"
                  spellCheck={false}
                />
              </Field>

              <Field label="API key" htmlFor="api-key">
                <Input
                  id="api-key"
                  value={settings.apiKey}
                  onChange={(event) => updateSetting("apiKey", event.currentTarget.value)}
                  placeholder="sk-..."
                  type="password"
                  spellCheck={false}
                />
              </Field>
            </section>

            <section className="space-y-3 rounded-md border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">生成参数</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings(createInitialSettings())}
                  title="重置参数"
                >
                  <RotateCcw />
                  重置
                </Button>
              </div>

              <Field label="模型" htmlFor="model">
                <Input
                  id="model"
                  value={settings.model}
                  onChange={(event) => updateSetting("model", event.currentTarget.value)}
                  spellCheck={false}
                />
              </Field>

              <Field label="提示词" htmlFor="prompt">
                <Textarea
                  id="prompt"
                  value={settings.prompt}
                  onChange={(event) => updateSetting("prompt", event.currentTarget.value)}
                  rows={7}
                  placeholder="描述你要生成的图片..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="数量" htmlFor="count">
                  <Input
                    id="count"
                    min={1}
                    max={10}
                    type="number"
                    value={settings.count}
                    onChange={(event) => updateSetting("count", Number(event.currentTarget.value))}
                  />
                </Field>

                <Field label="尺寸" htmlFor="size">
                  <Select
                    id="size"
                    value={settings.sizePreset}
                    onChange={(event) => updateSetting("sizePreset", event.currentTarget.value as Settings["sizePreset"])}
                  >
                    {SIZE_PRESETS.map((option) => (
                      <option key={option} value={option}>
                        {SIZE_PRESET_DETAILS[option].size
                          ? `${SIZE_PRESET_DETAILS[option].label} (${SIZE_PRESET_DETAILS[option].size})`
                          : SIZE_PRESET_DETAILS[option].label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {settings.sizePreset === "custom" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="宽度" htmlFor="width">
                      <Input
                        id="width"
                        min={16}
                        max={3840}
                        step={16}
                        type="number"
                        value={settings.customWidth}
                        onChange={(event) => updateSetting("customWidth", Number(event.currentTarget.value))}
                      />
                    </Field>
                    <Field label="高度" htmlFor="height">
                      <Input
                        id="height"
                        min={16}
                        max={3840}
                        step={16}
                        type="number"
                        value={settings.customHeight}
                        onChange={(event) => updateSetting("customHeight", Number(event.currentTarget.value))}
                      />
                    </Field>
                  </div>
                  <p
                    className={cn(
                      "text-xs",
                      customSizeValidation.valid ? "text-muted-foreground" : "text-destructive",
                    )}
                  >
                    {customSizeValidation.valid
                      ? `${customSizeValidation.size} · ${customSizeValidation.pixels.toLocaleString()} px`
                      : customSizeValidation.message}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Field label="质量" htmlFor="quality">
                  <Select
                    id="quality"
                    value={settings.quality}
                    onChange={(event) => updateSetting("quality", event.currentTarget.value as Settings["quality"])}
                  >
                    {QUALITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {QUALITY_LABELS[option]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="格式" htmlFor="format">
                  <Select
                    id="format"
                    value={settings.outputFormat}
                    onChange={(event) =>
                      updateSetting("outputFormat", event.currentTarget.value as Settings["outputFormat"])
                    }
                  >
                    {OUTPUT_FORMATS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {settings.outputFormat !== "png" ? (
                <Field label={`压缩 ${settings.outputCompression}`} htmlFor="compression">
                  <input
                    id="compression"
                    className="h-2 w-full accent-primary"
                    min={0}
                    max={100}
                    type="range"
                    value={settings.outputCompression}
                    onChange={(event) => updateSetting("outputCompression", Number(event.currentTarget.value))}
                  />
                </Field>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Field label="背景" htmlFor="background">
                  <Select
                    id="background"
                    value={settings.background}
                    onChange={(event) =>
                      updateSetting("background", event.currentTarget.value as Settings["background"])
                    }
                  >
                    {BACKGROUND_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {BACKGROUND_LABELS[option]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="审核" htmlFor="moderation">
                  <Select
                    id="moderation"
                    value={settings.moderation}
                    onChange={(event) =>
                      updateSetting("moderation", event.currentTarget.value as Settings["moderation"])
                    }
                  >
                    {MODERATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {MODERATION_LABELS[option]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>

            {error ? (
              <Status tone="error" icon={<AlertCircle className="size-4" />}>
                {error}
              </Status>
            ) : null}
            {notice ? (
              <Status tone="success" icon={<Check className="size-4" />}>
                {notice}
              </Status>
            ) : null}

            <div className="-mx-4 border-t border-border bg-panel/96 px-4 py-3 backdrop-blur lg:-mx-5 lg:px-5">
              {isGenerating ? (
                <Button type="button" className="w-full" variant="destructive" onClick={abortGenerate}>
                  <Square />
                  取消生成
                </Button>
              ) : (
                <Button type="submit" className="w-full">
                  <WandSparkles />
                  生成图片
                </Button>
              )}
            </div>
          </form>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <header className="flex flex-col gap-3 border-b border-border bg-background/88 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between lg:px-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
              <h2 className="mt-1 text-xl font-semibold">生成结果</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                {settings.sizePreset === "custom"
                  ? `${settings.customWidth}x${settings.customHeight}`
                  : SIZE_PRESET_DETAILS[settings.sizePreset].badge}
              </Badge>
              <Badge>{settings.outputFormat}</Badge>
              <Badge>{QUALITY_LABELS[settings.quality]}</Badge>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(420px,1fr)_auto] gap-4 p-4 lg:p-6">
            <div className="relative min-h-[420px] overflow-hidden rounded-md border border-border bg-canvas shadow-soft">
              {isGenerating ? (
                <div className="absolute inset-0 z-10 grid place-items-center bg-background/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    正在生成图片
                  </div>
                </div>
              ) : null}

              {selectedImage ? (
                <div className="flex h-full min-h-[420px] flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/70 px-3 py-2">
                    <div className="min-w-0 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{formatDate(selectedImage.createdAt)}</span>
                      <span className="mx-2">/</span>
                      <span>{selectedImage.mimeType}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => reusePrompt(selectedImage)}
                        title="复用提示词"
                      >
                        <RefreshCw />
                        复用
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(selectedImage)}
                        title="复制图片"
                      >
                        <Copy />
                        复制
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadImage(selectedImage)}
                        title="下载图片"
                      >
                        <Download />
                        下载
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeImage(selectedImage.id)}
                        title="删除图片"
                        aria-label="删除图片"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <div className="grid flex-1 place-items-center p-4">
                    <button
                      type="button"
                      className="group relative max-h-[68vh] max-w-full overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => openPreview(selectedImage)}
                      aria-label="预览生成图片"
                    >
                      <img
                        src={selectedImage.src}
                        alt={selectedImage.revisedPrompt ?? selectedImage.prompt}
                        className="max-h-[68vh] max-w-full object-contain shadow-2xl"
                      />
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Maximize2 className="size-3.5" />
                        预览
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid h-full min-h-[420px] place-items-center p-6 text-center">
                  <div className="max-w-sm">
                    <div className="mx-auto grid size-16 place-items-center rounded-md border border-border bg-background shadow-soft">
                      <ImageIcon className="size-8 text-primary" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">等待第一张图片</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      填写 base URL 和 key，调整参数后即可在这个画布中查看、复制和下载结果。
                    </p>
                    <Button
                      type="button"
                      className="mt-5"
                      variant="secondary"
                      onClick={() => {
                        const form = document.querySelector("form");
                        form?.requestSubmit();
                      }}
                      disabled={isGenerating}
                    >
                      <Play />
                      使用当前参数生成
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-[132px] rounded-md border border-border bg-card p-3 shadow-soft">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">历史</h3>
                <span className="text-xs text-muted-foreground">{images.length} 张</span>
              </div>
              {images.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className={cn(
                        "group overflow-hidden rounded-md border bg-background text-left transition",
                        selectedImage?.id === image.id
                          ? "border-primary shadow-soft"
                          : "border-border hover:border-primary/60",
                      )}
                    >
                      <button
                        type="button"
                        className="relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => openPreview(image)}
                        aria-label="预览历史图片"
                      >
                        <div className="aspect-square bg-canvas">
                          <img src={image.src} alt="" className="h-full w-full object-cover" />
                        </div>
                        <span className="absolute inset-x-2 bottom-2 inline-flex items-center justify-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
                          <Eye className="size-3.5" />
                          点击预览
                        </span>
                      </button>
                      <div className="flex items-center gap-1 px-2 py-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedId(image.id)}
                          title="选中图片"
                        >
                          {image.revisedPrompt ?? image.prompt}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => downloadImage(image)}
                          title="下载历史图片"
                          aria-label="下载历史图片"
                        >
                          <Download className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  生成后的图片会保留在当前浏览器会话中。
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/75 p-3 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
        >
          <div
            className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="min-w-0 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">图片预览</span>
                <span className="mx-2">/</span>
                <span>{formatDate(previewImage.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => downloadImage(previewImage)}>
                  <Download />
                  下载
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewImage(null)}>
                  关闭
                </Button>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 place-items-center bg-canvas p-3">
              <img
                src={previewImage.src}
                alt={previewImage.revisedPrompt ?? previewImage.prompt}
                className="max-h-[76vh] max-w-full rounded-sm object-contain shadow-2xl"
              />
            </div>
            <div className="border-t border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
              {previewImage.revisedPrompt ?? previewImage.prompt}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Status({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone: "error" | "success";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        tone === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-emerald-700/20 bg-emerald-50 text-emerald-800",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
