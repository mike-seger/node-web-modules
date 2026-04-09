# node-web-modules — File Manager Specification

## Overview

A Node.js reimplementation of the Java-based `com.net128.oss.web.app.fileManager` Spring Boot application.
This monorepo contains two npm packages:

| Package | npm name | Purpose |
|---|---|---|
| `packages/file-manager-lib` | `@nicemeta/file-manager-lib` | Reusable Express router/middleware for file management |
| `packages/file-manager-app` | `@nicemeta/file-manager` | Standalone CLI app with Swagger UI, publishable to npm |

## Installation & Usage

```bash
npm install -g @nicemeta/file-manager
file-manager --port 8080 --host 0.0.0.0 --root /path/to/serve
```

Then open:
- **File Manager UI**: http://localhost:8080/file-manager/index.html
- **Swagger UI**: http://localhost:8080/swagger-ui/index.html

## Architecture

### Monorepo Layout

```
node-web-modules/
├── package.json              # root workspace (private)
├── .gitignore
├── README.md
├── SPEC.md                   # this file
├── packages/
│   ├── file-manager-lib/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js           # exports createRouter(options)
│   │   │   ├── file-service.js    # all 7 file operations
│   │   │   ├── directory-info.js  # DirectoryInfo + FileInfo model
│   │   │   ├── parent-info.js     # breadcrumb parent chain
│   │   │   └── routes.js          # Express Router with 7 API endpoints
│   │   └── static/
│   │       └── file-manager/
│   │           ├── index.html
│   │           ├── css/file-manager.css
│   │           └── fonts/symbols.woff2
│   └── file-manager-app/
│       ├── package.json
│       ├── bin/cli.js             # CLI entry point
│       ├── src/
│       │   ├── app.js             # Express app factory
│       │   └── openapi.yaml       # OpenAPI 3.0 spec
│       └── static/
│           └── swagger-dark.css
```

### Dependencies

| Package | Dependency | Purpose | Replaces (Java) |
|---|---|---|---|
| lib | `express` | HTTP framework | Spring Boot Web |
| lib | `multer` | Multipart upload handling | Spring MultipartFile |
| lib | `archiver` | ZIP archive creation | zt-zip (ZipUtil) |
| lib | `mime-types` | MIME type detection | jmimemagic |
| app | `commander` | CLI argument parsing | Spring Boot args |
| app | `swagger-ui-express` | Swagger UI serving | springdoc-openapi |
| app | `js-yaml` | YAML OpenAPI spec loading | — |

## REST API

All endpoints are mounted under `/file-manager/api/`.

### GET /file-manager/api/list

List directory contents.

**Parameters:**
- `path` (query, default: `/`) — Absolute path of the directory

**Response (200):** `DirectoryInfo` JSON object:
```json
{
  "name": "projects",
  "path": "/home/user/projects",
  "isWritable": true,
  "parentInfos": [
    { "path": "/home/user", "name": "user" },
    { "path": "/home", "name": "home" },
    { "path": "/", "name": ">" }
  ],
  "files": [
    {
      "parent": "/home/user/projects",
      "name": "src",
      "isDirectory": true,
      "isReadable": true,
      "isWritable": true,
      "isExecutable": true,
      "hasChildren": true,
      "modified": "2024-01-15T10:30:00",
      "created": "2024-01-10T08:00:00"
    },
    {
      "parent": "/home/user/projects",
      "name": "README.md",
      "length": 1234,
      "isDirectory": false,
      "isReadable": true,
      "isWritable": true,
      "isExecutable": false,
      "hasChildren": false,
      "modified": "2024-01-14T16:45:00",
      "created": "2024-01-10T08:00:00"
    }
  ]
}
```

### GET /file-manager/api/download

Download a file as an attachment.

**Parameters:**
- `path` (query, required) — Absolute path of the file

**Response (200):** File content with `Content-Disposition: attachment`
**Response (400):** Path is not a file

### GET /file-manager/api/zip

Download a file or directory as a ZIP archive.

**Parameters:**
- `path` (query, required) — Absolute path of the file or directory

**Response (200):** ZIP archive

### GET /file-manager/api/view

View a file inline in the browser.

**Parameters:**
- `path` (query, required) — Absolute path of the file

**Response (200):** File content (inline)
**Response (400):** Path is not a file

### DELETE /file-manager/api/delete

Recursively delete a file or directory.

**Parameters:**
- `path` (query, required) — Absolute path

**Response (204):** Successfully deleted

### POST /file-manager/api/upload

Upload one or more files to a directory.

**Parameters:**
- `path` (query, required) — Absolute path of the target directory
- `file` (multipart, required) — One or more files

**Response (200):** Files uploaded successfully

### PUT /file-manager/api/mode

Change file permissions.

**Parameters:**
- `path` (query, required) — Absolute path of the file
- `mode` (query, required) — Permission mode (e.g., `+rw`, `-x`)

**Response (200):** Permissions changed

## Client-Side Features

The web UI is a single-page application served from `/file-manager/index.html`.

### Visual Design
- Dark navy card theme (inspired by [file-browser-modern-theme](https://github.com/Teraskull/file-browser-modern-theme))
- Material Symbols Rounded icon font (reduced woff2 subset: ~84 glyphs)
- Color palette: `#0d1117` background, `#151c2c` cards, `#6c7ee1` accent
- Card-based responsive grid layout (`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`)

### Navigation
- Breadcrumb path bar with clickable parent segments
- Browser back/forward history integration (`pushState`/`popstate`)
- Clicking a folder navigates into it
- Hidden dot-files (`.` prefix) by default

### File Operations
- **Download**: click download icon (single file or ZIP for directories)
- **View**: click view icon (opens in new tab)
- **Delete**: click delete icon → centered OK/Cancel confirmation overlay
  - Only shown for items without children and that are writable
  - Supports Escape (cancel) and Enter (confirm) keyboard shortcuts
- **Upload**: drag-and-drop files onto the content pane or directly onto a folder
  - Green outline when upload is allowed (directory is writable)
  - Red outline when the folder is read-only
  - Per-folder drop targets: releasing over a folder uploads into that folder
  - Mobile: floating action button (FAB) on touch devices

### Zoom
- Zoom slider: 70% to 200% range, step 5%
- CSS `transform: scale()` on the file list with `ZOOM_BASE = 1.05`
- Zoom level persisted in `localStorage` (`fm-zoom`)

### Scroll Persistence
- Scroll position saved per directory path in `localStorage` (`fm-scroll-{path}`)
- Restored on navigation

## Swagger UI

- Served at `/swagger-ui/index.html`
- Dark navy theme CSS matching the file manager palette
- OpenAPI 3.0 spec with all 7 endpoints documented
- Tags sorted alphabetically, operations sorted by method

## CLI Options

| Flag | Default | Description |
|---|---|---|
| `--port`, `-p` | `8080` | Server port |
| `--host`, `-H` | `0.0.0.0` | Listening host |
| `--root`, `-r` | `/` | Root directory (base path for file operations) |

## Platform Support

- **Server**: Node.js 18+ on macOS, Linux, Windows
- **Client**: Any modern browser (Chrome, Firefox, Safari, Edge)
- Windows path normalization: forward slashes ↔ backslashes (same as Java `toPlatformPath`/`toUniversalPath`)

## Publishing

```bash
cd packages/file-manager-app
npm publish --access public

cd packages/file-manager-lib
npm publish --access public
```

The app package includes a `bin` entry so `npx @nicemeta/file-manager` works immediately after install.

