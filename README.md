# image2 Canvas

[中文文档](./README.zh-CN.md)

`image2 Canvas` is a static browser app for generating `gpt-image-2` images with a user-provided API base URL and API key. It is designed for GitHub Pages, so it does not require a backend server.

Live site: [https://itsvicoc.github.io/image2Canvas/](https://itsvicoc.github.io/image2Canvas/)

## Features

- Pure frontend React app deployable to GitHub Pages.
- User-configurable API base URL, API key, model, prompt, count, size, quality, output format, background, and moderation.
- `gpt-image-2` size presets:
  - `Auto` -> model-selected dimensions
  - `1K square` -> `1024x1024`
  - `1K landscape` -> `1536x1024`
  - `1K portrait` -> `1024x1536`
  - `2K square` -> `2048x2048`
  - `2K landscape` -> `2048x1152`
  - `2K portrait` -> `1152x2048`
  - `4K landscape` -> `3840x2160`
  - `4K portrait` -> `2160x3840`
  - Custom size with client-side validation.
- Image result workspace with preview, reuse prompt, copy, download, delete, and history.
- Session-first connection storage. The API key and base URL are written to `localStorage` only when the user enables remember mode.
- Focused unit tests for API request construction, size validation, response parsing, and key persistence behavior.

## How It Works

The app sends a browser request to:

```text
POST {baseUrl}/images/generations
```

The default base URL is:

```text
https://api.openai.com/v1
```

If a user pastes a full `/images/generations` endpoint, the app normalizes it back to the API base URL before sending the request.

Example request body:

```json
{
  "model": "gpt-image-2",
  "prompt": "A product photo of a glass teacup",
  "n": 1,
  "size": "1024x1024",
  "quality": "auto",
  "output_format": "png",
  "background": "auto",
  "moderation": "auto"
}
```

`output_compression` is sent only for `jpeg` and `webp` output formats.

## Browser And Security Notes

This is a static app. All image generation requests are made directly from the user's browser.

- The target API endpoint must allow browser CORS requests.
- API keys are never committed, bundled, proxied, or sent anywhere except the base URL entered by the user.
- By default, the API key and base URL are stored in `sessionStorage` and disappear when the browser session ends.
- If remember mode is enabled, both values are stored in `localStorage` on that device.
- For stricter key protection or endpoints that do not support CORS, deploy a separate proxy service and point the app's base URL at that proxy.

## Custom Size Rules

Custom `gpt-image-2` sizes are validated in the browser:

- Width and height must be positive integers.
- Each edge must be a multiple of `16`.
- Maximum edge: `3840`.
- Maximum aspect ratio: `3:1`.
- Total pixels must be between `655,360` and `8,294,400`.

## Local Development

Requirements:

- Node.js 24+
- pnpm 11+

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

## Deployment

The project is configured for GitHub Pages under the repository path `/image2Canvas/`.

Deployment uses `.github/workflows/pages.yml`:

1. Install dependencies with pnpm.
2. Build the Vite app.
3. Upload `dist`.
4. Deploy through GitHub Pages Actions.

The Vite `base` is set to:

```ts
base: "/image2Canvas/"
```

## Project Structure

```text
src/
  App.tsx                  Main UI and generation workflow
  components/ui/           Small shadcn-style primitives
  lib/image-api.ts         Request construction and response parsing
  lib/key-storage.ts       API key persistence helpers
  lib/size-validation.ts   Custom size validation
  test/setup.ts            Vitest setup
```

## Limitations

- Text-to-image generation only.
- No backend proxy is included.
- No server-side key storage.
- Actual image generation depends on a valid API key, the selected provider's compatibility with the OpenAI Images API, and CORS support.
