'use strict';

const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { createRouter } = require('@nicemeta/file-manager-lib');

// ── OpenAPI spec ──
// In dev: loaded from openapi.yaml via js-yaml (optional dev dependency)
// In prod bundle: loaded from openapi.json (pre-converted by build.js)
function loadSpec() {
    const jsonPath = path.join(__dirname, 'openapi.json');
    if (fs.existsSync(jsonPath)) {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    // Dev fallback: parse YAML
    const yamlPath = path.join(__dirname, 'openapi.yaml');
    const yaml = require('js-yaml');
    return yaml.load(fs.readFileSync(yamlPath, 'utf8'));
}

/**
 * Create the full Express application.
 *
 * @param {object} [options]
 * @param {string} [options.root='/'] — root directory for file operations
 * @returns {import('express').Application}
 */
function createApp(options = {}) {
    const app = express();

    // Determine where static UI assets are:
    // In dev: lib's own static/file-manager/ (resolved by the lib via __dirname)
    // In prod bundle: dist/lib-static/file-manager/ (next to the bundle)
    const libStaticDir = path.join(__dirname, 'lib-static', 'file-manager');
    const routerOptions = { ...options };
    if (fs.existsSync(libStaticDir)) {
        routerOptions.staticDir = libStaticDir;
    }

    // Mount file-manager library router (API + static UI)
    app.use(createRouter(routerOptions));

    // Root redirect
    app.get('/', (_req, res) => {
        res.redirect('/file-manager/index.html');
    });

    // ── OpenAPI spec (JSON) ──
    const specDoc = loadSpec();

    app.get('/file-manager/api-docs/openapi.json', (_req, res) => {
        res.json(specDoc);
    });

    // ── Swagger UI (CDN-loaded, dark theme inlined) ──
    // Try multiple locations: static/ next to __dirname, or ../static/ for dev
    const candidates = [
        path.join(__dirname, 'static', 'swagger-ui.html'),
        path.join(__dirname, '..', 'static', 'swagger-ui.html'),
    ];
    const swaggerHtmlPath = candidates.find(p => fs.existsSync(p));
    const swaggerHtml = swaggerHtmlPath
        ? fs.readFileSync(swaggerHtmlPath, 'utf8')
        : null;

    app.get('/file-manager/swagger-ui/index.html', (_req, res) => {
        if (swaggerHtml) {
            res.type('html').send(swaggerHtml);
        } else {
            res.status(404).send('swagger-ui.html not found');
        }
    });

    // Redirect bare /file-manager/swagger-ui to /file-manager/swagger-ui/index.html
    app.get('/file-manager/swagger-ui', (_req, res) => {
        res.redirect('/file-manager/swagger-ui/index.html');
    });

    return app;
}

module.exports = { createApp };

