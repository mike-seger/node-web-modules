#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const { createApp } = require('../src/app');
const pkg = require('../package.json');

const { values } = parseArgs({
    options: {
        port:    { type: 'string', short: 'p', default: '8080' },
        host:    { type: 'string', short: 'H', default: '0.0.0.0' },
        root:    { type: 'string', short: 'r', default: '/' },
        help:    { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
    },
    strict: true,
});

if (values.version) { console.log(pkg.version); process.exit(0); }
if (values.help) {
    console.log(`file-manager v${pkg.version}
  -p, --port <n>     Server port (default: 8080)
  -H, --host <addr>  Listening host (default: 0.0.0.0)
  -r, --root <path>  Root directory (default: /)
  -v, --version      Show version
  -h, --help         Show this help`);
    process.exit(0);
}

const port = parseInt(values.port, 10);
const host = values.host;

const app = createApp({ root: values.root });

app.listen(port, host, () => {
    console.log(`File Manager started`);
    console.log(`  UI:       http://localhost:${port}/file-manager/index.html`);
    console.log(`  API docs: http://localhost:${port}/file-manager/swagger-ui/index.html`);
    console.log(`  Root:     ${values.root}`);
});
