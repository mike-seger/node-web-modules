'use strict';

const express = require('express');
const multer = require('multer');
const path = require('node:path');
const FileManagerService = require('./file-service');

/**
 * Create the Express Router with all 7 file-manager API endpoints
 * and static-file serving for the UI.
 *
 * @param {object} [options]
 * @returns {import('express').Router}
 */
function createRouter(options = {}) {
    const router = express.Router();
    const service = new FileManagerService({ root: options.root });
    const upload = multer({ storage: multer.memoryStorage() });

    // ── Serve static UI ──
    const staticDir = options.staticDir || path.join(__dirname, '..', 'static', 'file-manager');
    router.use('/file-manager', express.static(staticDir));

    // ── API routes ──
    const api = express.Router();

    // GET /list
    api.get('/list', (req, res, next) => {
        try {
            const dirPath = req.query.path || '/';
            const result = service.listDirectory(dirPath);
            res.json(result);
        } catch (err) {
            next(err);
        }
    });

    // GET /download
    api.get('/download', (req, res, next) => {
        try {
            service.downloadFile(req.query.path, res);
        } catch (err) {
            next(err);
        }
    });

    // GET /zip
    api.get('/zip', (req, res, next) => {
        try {
            service.zipDownload(req.query.path, res);
        } catch (err) {
            next(err);
        }
    });

    // GET /view
    api.get('/view', (req, res, next) => {
        try {
            service.viewFile(req.query.path, res);
        } catch (err) {
            next(err);
        }
    });

    // DELETE /delete
    api.delete('/delete', async (req, res, next) => {
        try {
            await service.deleteFileOrDirectory(req.query.path);
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    });

    // POST /upload
    api.post('/upload', upload.array('file'), async (req, res, next) => {
        try {
            await service.uploadFiles(req.query.path, req.files || []);
            res.status(200).end();
        } catch (err) {
            next(err);
        }
    });

    // PUT /mode
    api.put('/mode', (req, res, next) => {
        try {
            service.changeMode(req.query.path, req.query.mode);
            res.status(200).end();
        } catch (err) {
            next(err);
        }
    });

    router.use('/file-manager/api', api);

    // ── Error handler ──
    router.use((err, _req, res, _next) => {
        const status = err.status || 500;
        res.status(status).json({ error: err.message });
    });

    return router;
}

module.exports = { createRouter };

