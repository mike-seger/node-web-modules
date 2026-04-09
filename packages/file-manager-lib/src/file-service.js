'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const yazl = require('yazl');
const { buildDirectoryInfo, toPlatformPath } = require('./directory-info');

/** Lightweight MIME lookup — covers common types, no 228KB db.json needed */
const MIME = {
    '.html':'text/html','.htm':'text/html','.css':'text/css','.js':'text/javascript',
    '.mjs':'text/javascript','.json':'application/json','.xml':'application/xml',
    '.txt':'text/plain','.csv':'text/csv','.md':'text/markdown','.yaml':'text/yaml',
    '.yml':'text/yaml','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
    '.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon',
    '.bmp':'image/bmp','.tiff':'image/tiff','.tif':'image/tiff','.avif':'image/avif',
    '.pdf':'application/pdf','.zip':'application/zip','.gz':'application/gzip',
    '.tar':'application/x-tar','.7z':'application/x-7z-compressed',
    '.rar':'application/vnd.rar','.bz2':'application/x-bzip2',
    '.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.flac':'audio/flac',
    '.mp4':'video/mp4','.webm':'video/webm','.avi':'video/x-msvideo',
    '.mov':'video/quicktime','.mkv':'video/x-matroska',
    '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf',
    '.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt':'application/vnd.ms-powerpoint','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.sh':'text/x-shellscript','.py':'text/x-python','.java':'text/x-java-source',
    '.c':'text/x-csrc','.cpp':'text/x-c++src','.h':'text/x-chdr',
    '.rs':'text/x-rust','.go':'text/x-go','.ts':'text/typescript',
    '.jsx':'text/jsx','.tsx':'text/tsx','.vue':'text/x-vue',
    '.sql':'application/sql','.wasm':'application/wasm','.map':'application/json',
};
function mimeType(filePath) {
    return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * File Manager Service — mirrors FileManagerService.java
 *
 * @param {object} [options]
 * @param {string} [options.root='/'] — root directory; all operations are jailed inside it
 */
class FileManagerService {
    constructor(options = {}) {
        this.root = path.resolve(options.root || '/');
    }

    /**
     * Convert a virtual path (as seen by the client) to a real filesystem path,
     * ensuring it stays inside the configured root.
     * @param {string} virtualPath — e.g. "/" or "/documents/readme.md"
     * @returns {string} absolute real path
     */
    toRealPath(virtualPath) {
        virtualPath = toPlatformPath(virtualPath || '/');
        // Resolve relative to root (strip leading / so it's treated as relative)
        const stripped = virtualPath.replace(/^[/\\]+/, '');
        const resolved = path.resolve(this.root, stripped);
        // Jail check: resolved must be at or inside root
        if (!resolved.startsWith(this.root)) {
            throw Object.assign(new Error('Access denied: path outside root'), { status: 403 });
        }
        return resolved;
    }

    /**
     * Convert a real filesystem path to a virtual path (as seen by the client).
     * The root directory maps to "/".
     * @param {string} realPath
     * @returns {string} virtual path with forward slashes
     */
    toVirtualPath(realPath) {
        const resolved = path.resolve(realPath);
        let relative = path.relative(this.root, resolved);
        if (relative === '') return '/';
        // Ensure forward slashes
        relative = relative.split(path.sep).join('/');
        return '/' + relative;
    }

    /**
     * List directory contents.
     * @param {string} virtualPath
     * @returns {object} DirectoryInfo (with virtual paths)
     */
    listDirectory(virtualPath) {
        const realPath = this.toRealPath(virtualPath);
        return buildDirectoryInfo(realPath, this.root);
    }

    /**
     * Resolve an existing file/directory or throw.
     * @param {string} virtualPath
     * @returns {string} resolved absolute real path
     */
    resolveExisting(virtualPath) {
        const resolved = this.toRealPath(virtualPath);
        if (!fs.existsSync(resolved)) {
            throw Object.assign(new Error('File not found'), { status: 404 });
        }
        return resolved;
    }

    /**
     * Download a file (attachment).
     * @param {string} virtualPath
     * @param {import('express').Response} res
     */
    downloadFile(virtualPath, res) {
        const resolved = this.resolveExisting(virtualPath);
        const stat = fs.statSync(resolved);
        if (!stat.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }
        const contentType = mimeType(resolved);
        res.set('Content-Type', contentType);
        res.set('Content-Disposition', `attachment; filename="${path.basename(resolved)}"`);
        res.set('Content-Length', stat.size);
        fs.createReadStream(resolved).pipe(res);
    }

    /**
     * View a file inline.
     * @param {string} virtualPath
     * @param {import('express').Response} res
     */
    viewFile(virtualPath, res) {
        const resolved = this.resolveExisting(virtualPath);
        const stat = fs.statSync(resolved);
        if (!stat.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }
        const contentType = mimeType(resolved);
        res.set('Content-Type', contentType);
        res.set('Content-Length', stat.size);
        fs.createReadStream(resolved).pipe(res);
    }

    /**
     * Download a file or directory as a ZIP archive.
     * @param {string} virtualPath
     * @param {import('express').Response} res
     */
    zipDownload(virtualPath, res) {
        const resolved = this.resolveExisting(virtualPath);
        const baseName = path.basename(resolved);
        const downloadName = baseName + '.zip';

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename="${downloadName}"`);

        const zip = new yazl.ZipFile();

        const stat = fs.statSync(resolved);
        if (stat.isFile()) {
            zip.addFile(resolved, baseName);
        } else if (stat.isDirectory()) {
            addDirectoryToZip(zip, resolved, '');
        }

        zip.outputStream.pipe(res);
        zip.end();
    }

    /**
     * Recursively delete a file or directory.
     * @param {string} virtualPath
     */
    async deleteFileOrDirectory(virtualPath) {
        const resolved = this.resolveExisting(virtualPath);
        // Never allow deleting the root itself
        if (resolved === this.root) {
            throw Object.assign(new Error('Cannot delete root directory'), { status: 403 });
        }
        await fsp.rm(resolved, { recursive: true, force: true });
    }

    /**
     * Upload files to a directory.
     * @param {string} virtualPath — target directory
     * @param {Array<{originalname: string, buffer: Buffer}>} files — multer files
     */
    async uploadFiles(virtualPath, files) {
        const resolved = this.resolveExisting(virtualPath);
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
            throw Object.assign(new Error('Target path is not a directory'), { status: 400 });
        }
        for (const file of files) {
            if (!file.originalname || file.originalname.trim() === '') continue;
            // Prevent path traversal in uploaded filenames
            const safeName = path.basename(file.originalname);
            const dest = path.join(resolved, safeName);
            await fsp.writeFile(dest, file.buffer);
        }
    }

    /**
     * Change file permissions.
     * @param {string} virtualPath
     * @param {string} mode — e.g. "+rw", "-x"
     */
    changeMode(virtualPath, mode) {
        const resolved = this.resolveExisting(virtualPath);
        const stat = fs.statSync(resolved);
        let currentMode = stat.mode;
        const add = mode.startsWith('+');

        if (mode.includes('r')) {
            currentMode = add ? (currentMode | 0o400) : (currentMode & ~0o400);
        }
        if (mode.includes('w')) {
            currentMode = add ? (currentMode | 0o200) : (currentMode & ~0o200);
        }
        if (mode.includes('x')) {
            currentMode = add ? (currentMode | 0o100) : (currentMode & ~0o100);
        }

        fs.chmodSync(resolved, currentMode);
    }
}

/**
 * Recursively add a directory's contents to a yazl ZipFile.
 */
function addDirectoryToZip(zip, dirPath, zipPrefix) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, entry.name);
        const zipPath = zipPrefix ? zipPrefix + '/' + entry.name : entry.name;
        if (entry.isDirectory()) {
            addDirectoryToZip(zip, fullPath, zipPath);
        } else if (entry.isFile()) {
            zip.addFile(fullPath, zipPath);
        }
    }
}

module.exports = FileManagerService;

