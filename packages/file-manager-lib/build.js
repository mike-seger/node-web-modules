#!/usr/bin/env node
'use strict';

/**
 * Production build for @nicemeta/file-manager-lib
 *
 * - Bundles all internal src/ modules into a single dist/index.cjs
 * - Marks runtime dependencies external (consumers install them)
 * - Copies & minifies static assets into dist/static/
 */

const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const STATIC_SRC = path.join(ROOT, 'static');
const STATIC_DEST = path.join(DIST, 'static');

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
        .replace(/\/\*[\s\S]*?\*\//g, '')    // remove comments
        .replace(/\s*([{}:;,>~+])\s*/g, '$1') // collapse whitespace around syntax
        .replace(/;\}/g, '}')                  // remove trailing semicolons
        .replace(/\s+/g, ' ')                  // collapse remaining whitespace
        .trim();
    fs.writeFileSync(filePath, css);
}

function minifyInlineScript(htmlPath) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    // esbuild can minify JS strings directly
    const scriptMatch = html.match(/(<script>)([\s\S]*?)(<\/script>)/);
    if (scriptMatch) {
        const result = esbuild.transformSync(scriptMatch[2], {
            minify: true,
            loader: 'js',
        });
        html = html.replace(scriptMatch[0], '<script>' + result.code.trim() + '</script>');
    }
    // Collapse HTML whitespace (but not inside <script>)
    const parts = html.split(/(<script>[\s\S]*?<\/script>)/);
    html = parts.map(p => {
        if (p.startsWith('<script>')) return p;
        return p.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ');
    }).join('');
    fs.writeFileSync(htmlPath, html);
}

// ── build ──

async function build() {
    const t0 = Date.now();
    rmrf(DIST);

    // 1. Bundle JS
    await esbuild.build({
        entryPoints: [path.join(ROOT, 'src', 'index.js')],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        outfile: path.join(DIST, 'index.cjs'),
        minify: true,
        sourcemap: false,
        // Keep runtime deps external — consumers provide them
        external: ['express', 'multer', 'archiver', 'mime-types'],
        banner: { js: '/* @nicemeta/file-manager-lib — production build */' },
    });

    // 2. Copy static assets
    copyDirSync(STATIC_SRC, STATIC_DEST);

    // 3. Minify CSS
    const cssPath = path.join(STATIC_DEST, 'file-manager', 'css', 'file-manager.css');
    if (fs.existsSync(cssPath)) minifyCss(cssPath);

    // 4. Minify inline JS in HTML
    const htmlPath = path.join(STATIC_DEST, 'file-manager', 'index.html');
    if (fs.existsSync(htmlPath)) minifyInlineScript(htmlPath);

    const elapsed = Date.now() - t0;
    const jsSize = (fs.statSync(path.join(DIST, 'index.cjs')).size / 1024).toFixed(1);
    console.log(`  lib  → dist/index.cjs (${jsSize} KB) + static assets [${elapsed}ms]`);
}

build().catch(err => { console.error(err); process.exit(1); });

