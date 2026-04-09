'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getParentInfo, toUniversalPath } = require('./parent-info');

/**
 * Build a FileInfo object for a single file/directory.
 * Mirrors com.net128.oss.web.lib.filemanager.DirectoryInfo.FileInfo.
 */
function buildFileInfo(filePath) {
    const info = {};
    const parentDir = path.dirname(filePath);
    info.parent = toUniversalPath(parentDir);
    info.name = path.basename(filePath);

    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch {
        // If we can't stat, return minimal info
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
 */
function buildDirectoryInfo(dirPath) {
    // Normalise
    dirPath = toPlatformPath(dirPath);

    if (!dirPath || !fs.existsSync(dirPath)) {
        dirPath = '/';
    }

    let stat;
    try {
        stat = fs.statSync(dirPath);
    } catch {
        dirPath = '/';
        stat = fs.statSync(dirPath);
    }

    if (!stat.isDirectory()) {
        dirPath = path.dirname(dirPath);
    }

    const resolvedPath = path.resolve(dirPath);

    // List & sort
    let entries;
    try {
        entries = fs.readdirSync(resolvedPath)
            .map(name => path.join(resolvedPath, name))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    } catch {
        entries = [];
    }

    const files = entries.map(buildFileInfo);
    const universalPath = toUniversalPath(resolvedPath);

    const result = {
        name: path.basename(resolvedPath) || universalPath.replace(/:[/\\]$/, ''),
        path: universalPath,
        files,
    };

    // Writable?
    try { fs.accessSync(resolvedPath, fs.constants.W_OK); result.isWritable = true; } catch { result.isWritable = false; }

    // Parent breadcrumbs (not for root)
    if (universalPath !== '/') {
        result.parentInfos = getParentInfo(resolvedPath);
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

