#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const { createApp } = require('../src/app');
const pkg = require('../package.json');

const { values } = parseArgs({
    options: {
        port:    { type: 'string', short: 'p', default: '12001' },
        host:    { type: 'string', short: 'H', default: '127.0.0.1' },
        root:    { type: 'string', short: 'r' },
        help:    { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
    },
    strict: true,
});

if (values.version) { console.log(pkg.version); process.exit(0); }
if (values.help) {
    console.log(`file-manager v${pkg.version}

Usage: file-manager [options]

Options:
  -p, --port <n>     Server port (default: 12001)
  -H, --host <addr>  Listening host (default: 127.0.0.1)
  -r, --root <path>  Root directory (default: current directory)
  -v, --version      Show version
  -h, --help         Show this help`);
    process.exit(0);
}

const port = parseInt(values.port, 10);
const host = values.host;
const root = values.root || process.cwd();

const app = createApp({ root });

app.listen(port, host, () => {
    console.log(`File Manager v${pkg.version}`);
    console.log(`  UI:       http://${host}:${port}/file-manager/index.html`);
    console.log(`  API docs: http://${host}:${port}/file-manager/swagger-ui/index.html`);
    console.log(`  Root:     ${root}`);
});
