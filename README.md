# image2 Canvas

Static browser UI for generating `gpt-image-2` images with a user-provided API base URL and key.

## Local development

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

## Deployment

This app is configured for GitHub Pages at `https://itsVicOC.github.io/image2Canvas/`.
The workflow in `.github/workflows/pages.yml` builds `dist` and publishes it through Pages Actions.

Because this is a pure static app, browser requests must be made to an endpoint that allows CORS. The API key is kept in `sessionStorage` by default and only written to `localStorage` when the user enables remember mode.
