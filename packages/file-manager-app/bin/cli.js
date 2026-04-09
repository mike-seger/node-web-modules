#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const { createApp } = require('../src/app');
const pkg = require('../package.json');

const { values } = parseArgs({
    options: {
        port:    { type: 'string', short: 'p', default: '8080' },
        host:    { type: 'string', short: 'H', default: '0.0.0.0' },
        root:    { type: 'string', short: 'r' },
        ipv4:    { type: 'boolean', short: '4', default: false },
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
  -r, --root <path>  Root directory (default: current directory)
  -4, --ipv4         Use IPv4 only
  -v, --version      Show version
  -h, --help         Show this help`);
    process.exit(0);
}

const port = parseInt(values.port, 10);
const host = values.ipv4 && values.host === '0.0.0.0' ? '127.0.0.1' : values.host;
const root = values.root || process.cwd();

const app = createApp({ root });

app.listen(port, host, () => {
    console.log(`File Manager started`);
    console.log(`  UI:       http://localhost:${port}/file-manager/index.html`);
    console.log(`  API docs: http://localhost:${port}/file-manager/swagger-ui/index.html`);
    console.log(`  Root:     ${root}`);
});
