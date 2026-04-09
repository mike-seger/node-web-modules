'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getParentInfo, toUniversalPath } = require('./parent-info');

/**
 * Convert a real filesystem path to a virtual path relative to root.
 * @param {string} realPath
 * @param {string} root
 * @returns {string} virtual path with forward slashes
 */
function toVirtualPath(realPath, root) {
    if (!root || root === '/') return toUniversalPath(realPath);
    const resolved = path.resolve(realPath);
    const rootResolved = path.resolve(root);
    let relative = path.relative(rootResolved, resolved);
    if (relative === '') return '/';
    relative = relative.split(path.sep).join('/');
    return '/' + relative;
}

/**
 * Build a FileInfo object for a single file/directory.
 * Mirrors com.net128.oss.web.lib.filemanager.DirectoryInfo.FileInfo.
 *
 * @param {string} filePath — real absolute path
 * @param {string} root — root jail directory
 */
function buildFileInfo(filePath, root) {
    const info = {};
    info.parent = toVirtualPath(path.dirname(filePath), root);
    info.name = path.basename(filePath);

    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch {
        info.isReadable = false;
        info.isWritable = false;
        info.isExecutable = false;
        info.isDirectory = false;
        info.hasChildren = false;
        return info;
    }

    info.isDirectory = stat.isDirectory();

    if (info.isDirectory) {
        try {
            const children = fs.readdirSync(filePath);
            info.hasChildren = children.length > 0;
        } catch {
            info.hasChildren = false;
        }
    } else {
        info.length = stat.size;
        info.hasChildren = false;
    }

    // Permission checks
    try { fs.accessSync(filePath, fs.constants.R_OK); info.isReadable = true; } catch { info.isReadable = false; }
    try { fs.accessSync(filePath, fs.constants.W_OK); info.isWritable = true; } catch { info.isWritable = false; }
    try { fs.accessSync(filePath, fs.constants.X_OK); info.isExecutable = true; } catch { info.isExecutable = false; }

    // Timestamps — ISO local format (no timezone) to match Java's LocalDateTime
    if (stat.mtime) {
        info.modified = toLocalISO(stat.mtime);
    }
    if (stat.birthtime) {
        info.created = toLocalISO(stat.birthtime);
    }

    return info;
}

/**
 * Build the DirectoryInfo response.
 * Mirrors com.net128.oss.web.lib.filemanager.DirectoryInfo.
 *
 * @param {string} dirPath — real absolute path of the directory
 * @param {string} [root='/'] — root jail directory
 */
function buildDirectoryInfo(dirPath, root) {
    root = root ? path.resolve(root) : '/';

    // Normalise
    dirPath = toPlatformPath(dirPath);

    if (!dirPath || !fs.existsSync(dirPath)) {
        dirPath = root;
    }

    let stat;
    try {
        stat = fs.statSync(dirPath);
    } catch {
        dirPath = root;
        stat = fs.statSync(dirPath);
    }

    if (!stat.isDirectory()) {
        dirPath = path.dirname(dirPath);
    }

    const resolvedPath = path.resolve(dirPath);

    // Ensure we don't go above root
    if (!resolvedPath.startsWith(root)) {
        return buildDirectoryInfo(root, root);
    }

    // List & sort
    let entries;
    try {
        entries = fs.readdirSync(resolvedPath)
            .map(name => path.join(resolvedPath, name))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    } catch {
        entries = [];
    }

    const files = entries.map(f => buildFileInfo(f, root));
    const virtualPath = toVirtualPath(resolvedPath, root);

    const result = {
        name: virtualPath === '/' ? '>' : path.basename(resolvedPath),
        path: virtualPath,
        files,
    };

    // Writable?
    try { fs.accessSync(resolvedPath, fs.constants.W_OK); result.isWritable = true; } catch { result.isWritable = false; }

    // Parent breadcrumbs (not for virtual root)
    if (virtualPath !== '/') {
        result.parentInfos = getParentInfo(resolvedPath, root);
    }

    return result;
}

/* ── helpers ── */

function toPlatformPath(p) {
    if (p == null || p === '/') return p;
    return p.split('/').join(path.sep);
}

function toLocalISO(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = { buildDirectoryInfo, buildFileInfo, toPlatformPath };
