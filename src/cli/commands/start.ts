// Start Command - Main entry point for mock server

import { Command } from 'commander';
import type { Config } from '../../types/index.js';
import { DEFAULT_CONFIG } from '../../types/index.js';
import { displayBanner, displayServerStarted, displayError } from '../ui/index.js';
import { startSpinner, succeedSpinner, failSpinner } from '../ui/index.js';
import { loadSpec } from '../../loader/index.js';
import { createServer } from '../../server/index.js';
import { ContourError } from '../../utils/errors.js';

interface StartOptions {
    port?: string;
    stateful?: boolean;
    deterministic?: boolean;
    delay?: string;
    errorRate?: string;
    requireAuth?: boolean;
}

function parseDelay(value: string): [number, number] {
    const match = value.match(/^(\d+)-(\d+)$/);
    if (!match) {
        throw new Error('Delay must be in format: min-max (e.g., 200-500)');
    }
    const [, min, max] = match;
    const minDelay = parseInt(min, 10);
    const maxDelay = parseInt(max, 10);

    if (minDelay > maxDelay) {
        throw new Error('Min delay cannot be greater than max delay');
    }
    if (maxDelay > 10000) {
        throw new Error('Max delay cannot exceed 10 seconds');
    }
    return [minDelay, maxDelay];
}

function parsePort(value: string): number {
    const port = parseInt(value, 10);
    if (isNaN(port)) {
        throw new Error('Port must be a number');
    }
    if (port < 1024 || port > 65535) {
        throw new Error('Port must be between 1024 and 65535');
    }
    return port;
}

function parseErrorRate(value: string): number {
    const rate = parseInt(value, 10);
    if (isNaN(rate) || rate < 0 || rate > 100) {
        throw new Error('Error rate must be between 0 and 100');
    }
    return rate;
}

export function createStartCommand(): Command {
    return new Command('start')
        .argument('<spec>', 'Path to OpenAPI spec file or URL')
        .description('Start the mock API server')
        .option('-p, --port <number>', 'Port number', '3001')
        .option('--stateful', 'Enable stateful mode (persist changes)')
        .option('--deterministic', 'Use deterministic data generation')
        .option('--delay <range>', 'Simulate latency (e.g., 200-500)')
        .option('--error-rate <percent>', 'Simulate random errors (0-100)')
        .option('--require-auth', 'Require Bearer token for requests')
        .action(async (specPath: string, options: StartOptions) => {
            displayBanner();

            try {
                // Build config
                const config: Config = {
                    ...DEFAULT_CONFIG,
                    specPath,
                    port: options.port ? parsePort(options.port) : DEFAULT_CONFIG.port,
                    stateful: options.stateful ?? false,
                    deterministic: options.deterministic ?? false,
                    delay: options.delay ? parseDelay(options.delay) : null,
                    errorRate: options.errorRate ? parseErrorRate(options.errorRate) : 0,
                    requireAuth: options.requireAuth ?? false,
                };

                // Load spec
                startSpinner('Loading OpenAPI spec...');
                const spec = await loadSpec(specPath);
                succeedSpinner('Spec loaded');

                // Start server
                startSpinner('Starting mock server...');
                const { app, endpointCount } = await createServer(spec, config);

                const server = app.listen(config.port, config.host, () => {
                    succeedSpinner('Server started');
                    displayServerStarted(config, endpointCount);
                });

                // Handle shutdown
                process.on('SIGINT', () => {
                    console.log();
                    server.close(() => {
                        console.log('Server stopped');
                        process.exit(0);
                    });
                });

            } catch (error) {
                failSpinner();

                if (error instanceof ContourError) {
                    displayError(error.name, error.message);
                } else if (error instanceof Error) {
                    displayError('Error', error.message);
                } else {
                    displayError('Unknown Error', String(error));
                }
                process.exit(1);
            }
        });
}
