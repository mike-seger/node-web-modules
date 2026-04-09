# node-web-modules

A collection of Node.js web utility modules — a reimplementation of the Java-based [web-modules](https://github.com/mike-seger/web-modules).

## Packages

| Package | npm | Description |
|---|---|---|
| [`@nicemeta/file-manager`](packages/file-manager-app) | `npm install -g @nicemeta/file-manager` | Standalone file manager CLI app |
| [`@nicemeta/file-manager-lib`](packages/file-manager-lib) | `npm install @nicemeta/file-manager-lib` | Express router/middleware for file management |

## Quick Start

```bash
# Install dependencies
npm install

# Start the file manager (dev mode)
npm start
```

Then open:
- **File Manager**: http://localhost:8080/file-manager/index.html
- **Swagger UI**: http://localhost:8080/swagger-ui/index.html

## Production Build

```bash
# Build all packages
npm run build

# Run the production build (fully self-contained, no npm install needed)
node packages/file-manager-app/dist/cli.cjs --port 8080
```

The build uses [esbuild](https://esbuild.github.io/) to:
- Bundle & minify all server JS into a single `cli.cjs` (~1.4 MB)
- Minify CSS and inline HTML scripts
- Copy static assets (UI, fonts, Swagger dark theme)

The production `dist/` is **fully self-contained** (1.5 MB total) — just copy it and run with `node cli.cjs`. Swagger UI loads from CDN at runtime.

```bash
# Clean build artifacts
npm run clean
```

## Global Install

```bash
npm install -g @nicemeta/file-manager
file-manager --port 3000 --root /home/user/documents
```

## CLI Options

| Flag | Default | Description |
|---|---|---|
| `--port`, `-p` | `8080` | Server port |
| `--host`, `-H` | `0.0.0.0` | Listening host |
| `--root`, `-r` | `/` | Root directory for file operations |

## Using the Library

```javascript
const express = require('express');
const { createRouter } = require('@nicemeta/file-manager-lib');

const app = express();
app.use(createRouter());
app.listen(8080);
```

## Features

- Modern dark-themed file browser UI
- Drag-and-drop file upload with visual feedback
- File download (single + ZIP archives)
- Inline file viewing
- Delete with confirmation dialog
- Breadcrumb navigation with browser history integration
- Zoom slider with session persistence
- Mobile upload support (FAB button)
- Swagger/OpenAPI documentation with dark theme
- Cross-platform (macOS, Linux, Windows)

## System Requirements

- **Node.js** 18+
- **Browser**: Chrome, Firefox, Safari, Edge

## License

MIT



# node-web-modules
