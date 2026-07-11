# image2 Canvas

[English README](./README.md)

`image2 Canvas` 是一个部署在 GitHub Pages 上的静态网页版图片生成画布。用户可以在浏览器中填写 `gpt-image-2` 或兼容接口的 `Base URL` 和 `API key`，再输入提示词生成图片。

线上地址：[https://itsvicoc.github.io/image2Canvas/](https://itsvicoc.github.io/image2Canvas/)

## 功能特性

- 纯前端 React 应用，可直接部署到 GitHub Pages。
- 支持用户填写 API Base URL、API key、模型、提示词、生成数量、尺寸、质量、输出格式、背景和审核强度。
- 内置 `gpt-image-2` 尺寸预设：
  - `1K 方图` -> `1024x1024`
  - `2K 方图` -> `2048x2048`
  - `2K 横图` -> `2048x1152`
  - `2K 竖图` -> `1152x2048`
  - `4K 横图` -> `3840x2160`
  - `4K 竖图` -> `2160x3840`
  - `自定义`，并带有前端尺寸校验。
- 生成结果支持大图预览、复用提示词、复制、下载、删除和历史记录。
- API key 和 Base URL 默认只保存在 `sessionStorage`；用户开启“记住连接”后，两者会一起写入 `localStorage`。
- 包含请求体构建、尺寸校验、响应解析和 key 存储行为的单元测试。

## 工作方式

应用会从浏览器直接请求：

```text
POST {baseUrl}/images/generations
```

默认 Base URL：

```text
https://api.openai.com/v1
```

如果用户粘贴了完整的 `/images/generations` 地址，应用会先把它归一化为 API Base URL，再拼接请求路径。

示例请求体：

```json
{
  "model": "gpt-image-2",
  "prompt": "一只透明玻璃茶杯放在拉丝金属桌面上",
  "n": 1,
  "size": "1024x1024",
  "quality": "auto",
  "output_format": "png",
  "background": "auto",
  "moderation": "auto"
}
```

当输出格式为 `jpeg` 或 `webp` 时，才会发送 `output_compression`。

## 浏览器与安全说明

这是一个静态前端应用，所有生成请求都从用户浏览器直接发出。

- 目标 API 必须允许浏览器 CORS 请求。
- API key 不会被提交到仓库、打包进产物、转发到后端或发送到用户填写 Base URL 以外的位置。
- 默认情况下，API key 和 Base URL 存在 `sessionStorage`，浏览器会话结束后失效。
- 开启“记住连接”后，API key 和 Base URL 会一起存入当前设备的 `localStorage`。
- 如果需要更严格的密钥保护，或目标接口不支持 CORS，需要另行部署代理服务，并把应用里的 Base URL 指向该代理。

## 自定义尺寸规则

自定义 `gpt-image-2` 尺寸会在浏览器中校验：

- 宽高必须是大于 `0` 的整数。
- 宽高都必须是 `16` 的倍数。
- 单边最大 `3840`。
- 最大宽高比 `3:1`。
- 总像素范围：`655,360` 到 `8,294,400`。

## 本地开发

环境要求：

- Node.js 24+
- pnpm 11+

安装依赖：

```bash
pnpm install
```

启动开发服务：

```bash
pnpm dev
```

生产构建：

```bash
pnpm build
```

本地预览生产构建：

```bash
pnpm preview
```

## 验证

```bash
pnpm test
pnpm lint
pnpm build
```

## 部署

项目已按 GitHub Pages 的仓库路径 `/image2Canvas/` 配置。

部署流程在 `.github/workflows/pages.yml` 中：

1. 使用 pnpm 安装依赖。
2. 构建 Vite 应用。
3. 上传 `dist`。
4. 通过 GitHub Pages Actions 发布。

Vite 的 `base` 配置为：

```ts
base: "/image2Canvas/"
```

## 项目结构

```text
src/
  App.tsx                  主界面与生成流程
  components/ui/           shadcn 风格基础组件
  lib/image-api.ts         请求体构建与响应解析
  lib/key-storage.ts       API key 存储辅助函数
  lib/size-validation.ts   自定义尺寸校验
  test/setup.ts            Vitest 测试初始化
```

## 限制

- 当前只支持文生图。
- 不包含后端代理。
- 不提供服务端 API key 存储。
- 实际生成是否成功取决于有效 API key、接口是否兼容 OpenAI Images API，以及目标接口是否支持浏览器 CORS。
