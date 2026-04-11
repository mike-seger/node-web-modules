# node-web-modules

A collection of Node.js web utility modules — a reimplementation of the Java-based [web-modules](https://github.com/mike-seger/web-modules).

## Packages

| Package | npm | Description |
|---|---|---|
| [`@nicemeta/file-manager`](packages/file-manager-app) | `npm install -g @nicemeta/file-manager` | Standalone file manager CLI app |
| [`@nicemeta/file-manager-lib`](packages/file-manager-lib) | `npm install @nicemeta/file-manager-lib` | Express router/middleware for file management |

## Quick Start

```bash
npx @nicemeta/file-manager
```

Then open: http://127.0.0.1:12001/file-manager/index.html

## CLI Options

```
$ file-manager --help

Usage: file-manager [options]

Options:
  -p, --port <n>     Server port (default: 12001)
  -H, --host <addr>  Listening host (default: 127.0.0.1)
  -r, --root <path>  Root directory (default: current directory)
  -v, --version      Show version
  -h, --help         Show this help
```

## Global Install

```bash
npm install -g @nicemeta/file-manager
file-manager --port 3000 --root /home/user/documents
```

Or run directly without installing:

```bash
npx @nicemeta/file-manager --port 3000 --root /home/user/documents
```

## Development

```bash
# Install dependencies
npm install

# Start the file manager (dev mode)
npm start
```

## Production Build

```bash
# Build all packages
npm run build

# Run the production build (fully self-contained, no npm install needed)
node packages/file-manager-app/dist/cli.cjs
```

The build uses [esbuild](https://esbuild.github.io/) to:
- Bundle & minify all server JS into a single `cli.cjs` (~420 KB)
- Minify CSS and inline HTML scripts
- Copy static assets (UI, fonts)

The production `dist/` is **fully self-contained** (~460 KB total) — just copy it and run with `node cli.cjs`.

```bash
# Clean build artifacts
npm run clean
```

## Using the Library

```javascript
const express = require('express');
const { createRouter } = require('@nicemeta/file-manager-lib');

const app = express();
app.use(createRouter({ root: '/home/user/documents' }));
app.listen(12001);
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
- OpenAPI documentation with dark theme
- Root directory jail (path containment)
- Cross-platform (macOS, Linux, Windows)

## System Requirements

- **Node.js** 18+
- **Browser**: Chrome, Firefox, Safari, Edge

## License

MIT
