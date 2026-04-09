#!/usr/bin/env node
'use strict';

/**
 * Production build for @nicemeta/file-manager
 *
 * Produces dist/ with:
 *   dist/
 *     cli.cjs          ← bundled + minified CLI (fully self-contained)
 *     openapi.yaml     ← API spec
 *     static/          ← app assets (swagger-ui.html with CDN + inlined dark theme)
 *     lib-static/      ← lib UI assets (minified CSS + HTML)
 *
 * Usage:
 *   node dist/cli.cjs
 */

const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// ── helpers ──

function rmrf(dir) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
}

function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function minifyCss(filePath) {
    let css = fs.readFileSync(filePath, 'utf8');
    css = css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s*([{}:;,>~+])\s*/g, '$1')
        .replace(/;\}/g, '}')
        .replace(/\s+/g, ' ')
        .trim();
    fs.writeFileSync(filePath, css);
}

function minifyInlineScript(htmlPath) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    const scriptMatch = html.match(/(<script>)([\s\S]*?)(<\/script>)/);
    if (scriptMatch) {
        const result = esbuild.transformSync(scriptMatch[2], {
            minify: true,
            loader: 'js',
        });
        html = html.replace(scriptMatch[0], '<script>' + result.code.trim() + '</script>');
    }
    fs.writeFileSync(htmlPath, html);
}

// ── build ──

/** Stub iconv-lite — body-parser only needs it for non-UTF-8, which we don't use. Saves ~462KB. */
const iconvStubPlugin = {
    name: 'iconv-lite-stub',
    setup(build) {
        build.onResolve({ filter: /^iconv-lite$/ }, () => ({
            path: 'iconv-lite',
            namespace: 'iconv-stub',
        }));
        build.onLoad({ filter: /.*/, namespace: 'iconv-stub' }, () => ({
            contents: `
                module.exports = {
                    encodingExists: () => true,
                    getDecoder: () => ({ write: b => b.toString(), end: () => '' }),
                    getEncoder: () => ({ write: s => Buffer.from(s), end: () => Buffer.alloc(0) }),
                };
            `,
            loader: 'js',
        }));
    },
};

/** Deduplicate multer's bundled mime-db copy → use the top-level one. Saves ~208KB. */
const mimeDbDedup = {
    name: 'mime-db-dedup',
    setup(build) {
        build.onResolve({ filter: /mime-db/ }, args => {
            if (args.resolveDir.includes(path.join('multer', 'node_modules'))) {
                return { path: require.resolve('mime-db') };
            }
        });
        build.onResolve({ filter: /mime-types/ }, args => {
            if (args.resolveDir.includes(path.join('multer', 'node_modules'))) {
                return { path: require.resolve('mime-types') };
            }
        });
    },
};

async function build() {
    const t0 = Date.now();
    rmrf(DIST);
    fs.mkdirSync(DIST, { recursive: true });

    // Resolve lib locations
    const libRoot = path.dirname(require.resolve('@nicemeta/file-manager-lib'));
    const libStaticSrc = path.join(libRoot, '..', 'static');

    // 1. Bundle CLI — inline everything (no external dependencies)
    await esbuild.build({
        entryPoints: [path.join(ROOT, 'bin', 'cli.js')],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        outfile: path.join(DIST, 'cli.cjs'),
        minify: true,
        sourcemap: false,
        external: ['js-yaml'],
        plugins: [iconvStubPlugin, mimeDbDedup],
        banner: { js: '/* @nicemeta/file-manager — production build */' },
    });
    fs.chmodSync(path.join(DIST, 'cli.cjs'), 0o755);

    // 2. Convert openapi.yaml → openapi.json (avoids js-yaml at runtime)
    const yaml = require('js-yaml');
    const specYaml = fs.readFileSync(path.join(ROOT, 'src', 'openapi.yaml'), 'utf8');
    fs.writeFileSync(
        path.join(DIST, 'openapi.json'),
        JSON.stringify(yaml.load(specYaml))
    );
    // Also copy the YAML for reference
    fs.copyFileSync(
        path.join(ROOT, 'src', 'openapi.yaml'),
        path.join(DIST, 'openapi.yaml')
    );

    // 3. Copy app static assets (swagger-ui.html)
    const appStaticDest = path.join(DIST, 'static');
    copyDirSync(path.join(ROOT, 'static'), appStaticDest);

    // 4. Copy & minify lib static assets (file-manager UI)
    const libStaticDest = path.join(DIST, 'lib-static');
    if (fs.existsSync(libStaticSrc)) {
        copyDirSync(libStaticSrc, libStaticDest);
        const libCss = path.join(libStaticDest, 'file-manager', 'css', 'file-manager.css');
        if (fs.existsSync(libCss)) minifyCss(libCss);
        const libHtml = path.join(libStaticDest, 'file-manager', 'index.html');
        if (fs.existsSync(libHtml)) minifyInlineScript(libHtml);
    }

    // ── Report ──
    const cliSize = (fs.statSync(path.join(DIST, 'cli.cjs')).size / 1024).toFixed(1);
    const totalSize = dirSizeKB(DIST);
    const elapsed = Date.now() - t0;
    console.log(`  app  → dist/cli.cjs (${cliSize} KB), total dist: ${totalSize} KB [${elapsed}ms]`);
    console.log(`         Run: node dist/cli.cjs`);
}

function dirSizeKB(dir) {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) total += dirSizeKB(p) * 1024;
        else total += fs.statSync(p).size;
    }
    return (total / 1024).toFixed(0);
}

build().catch(err => { console.error(err); process.exit(1); });







