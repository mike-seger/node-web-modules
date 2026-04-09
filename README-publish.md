# Publishing to npm

## Prerequisites

1. An [npm](https://www.npmjs.com/) account with access to the `@nicemeta` scope
2. Node.js 18+

## One-time setup

```bash
npm login
```

This authenticates your terminal session for all subsequent publish commands.

## Publish

From the **repository root** (`node-web-modules/`):

```bash
npm run publish:all
```

This single command builds both packages and publishes them in the correct order
(`file-manager-lib` first, then `file-manager-app`).

## Version bump

Update the version in **both** package.json files before publishing:

- `packages/file-manager-lib/package.json` — `version`
- `packages/file-manager-app/package.json` — `version` and the `@nicemeta/file-manager-lib` dependency range

## Unpublish a version

```bash
npm unpublish @nicemeta/file-manager-lib@<version>
npm unpublish @nicemeta/file-manager@<version>
```

> **Note:** npm will refuse to remove the *last* remaining version unless you pass `--force`,
> and after force-unpublishing, the package name is blocked from re-use for 24 hours.

