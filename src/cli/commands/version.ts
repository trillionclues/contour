// Version Command

import { Command } from 'commander';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../../../package.json');

export function createVersionCommand(): Command {
    return new Command('version')
        .description('Display version information')
        .action(() => {
            console.log(`contour v${pkg.version}`);
        });
}

export function getVersion(): string {
    return pkg.version;
}
