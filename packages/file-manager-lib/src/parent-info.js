'use strict';

const path = require('node:path');

/**
 * Build the parent-info chain for breadcrumb navigation.
 * Mirrors com.net128.oss.web.lib.filemanager.ParentInfoUtil.
 *
 * @param {string} dirPath – absolute, forward-slash–normalised path
 * @returns {{ path: string, name: string }[]}
 */
function getParentInfo(dirPath) {
    const parents = [];
    let current = path.resolve(dirPath);
    let parent = path.dirname(current);

    while (parent !== current) {
        const name = path.basename(parent) || '>';
        parents.push({
            path: toUniversalPath(parent),
            name: name,
        });
        current = parent;
        parent = path.dirname(current);
    }

    // On Windows with multiple drive roots the Java version adds a virtual "/" root.
    // We replicate the same behaviour: if the top-most entry's name is empty, set it.
    if (parents.length > 0) {
        const last = parents[parents.length - 1];
        if (!last.name || last.name === '') {
            last.name = '>';
        }
    }

    return parents;
}

/**
 * Convert a native path to forward-slash universal form.
 */
function toUniversalPath(p) {
    if (p == null || p === '/') return p;
    return p.split(path.sep).join('/');
}

module.exports = { getParentInfo, toUniversalPath };

