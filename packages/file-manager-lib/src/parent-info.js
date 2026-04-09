'use strict';

const path = require('node:path');

/**
 * Build the parent-info chain for breadcrumb navigation.
 * Stops at the configured root directory (never exposes paths above it).
 *
 * @param {string} dirPath – absolute real path
 * @param {string} [root='/'] – root jail directory
 * @returns {{ path: string, name: string }[]}
 */
function getParentInfo(dirPath, root) {
    root = root ? path.resolve(root) : '/';
    const parents = [];
    let current = path.resolve(dirPath);
    let parent = path.dirname(current);

    while (parent !== current && current !== root) {
        // Convert parent to virtual path
        const virtualParent = toVirtualPath(parent, root);
        const name = virtualParent === '/' ? '>' : path.basename(parent);
        parents.push({
            path: virtualParent,
            name: name,
        });
        current = parent;
        parent = path.dirname(current);
    }

    return parents;
}

/**
 * Convert a real filesystem path to a virtual path relative to root.
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
 * Convert a native path to forward-slash universal form.
 */
function toUniversalPath(p) {
    if (p == null || p === '/') return p;
    return p.split(path.sep).join('/');
}

module.exports = { getParentInfo, toUniversalPath };

