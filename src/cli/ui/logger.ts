// CLI Display Logger

import chalk from 'chalk';
import type { Config } from '../../types/index.js';

export function displayBanner(): void {
    console.log();
    console.log(chalk.bold.cyan('  ⬡ Contour'));
    console.log(chalk.gray('  Shape your API mocks from OpenAPI specs'));
    console.log();
}

export function displayServerStarted(config: Config, endpoints: number): void {
    console.log();
    console.log(chalk.green('✓'), chalk.bold('Mock server running'));
    console.log();
    console.log(`  ${chalk.gray('→')} Local:    ${chalk.cyan(`http://${config.host}:${config.port}`)}`);
    console.log(`  ${chalk.gray('→')} Endpoints: ${chalk.yellow(endpoints.toString())}`);

    if (config.stateful) {
        console.log(`  ${chalk.gray('→')} Mode:     ${chalk.magenta('Stateful')}`);
    }
    if (config.deterministic) {
        console.log(`  ${chalk.gray('→')} Seed:     ${chalk.magenta('Deterministic')}`);
    }
    if (config.delay) {
        console.log(`  ${chalk.gray('→')} Delay:    ${chalk.yellow(`${config.delay[0]}-${config.delay[1]}ms`)}`);
    }
    if (config.errorRate > 0) {
        console.log(`  ${chalk.gray('→')} Errors:   ${chalk.red(`${config.errorRate}%`)}`);
    }
    if (config.requireAuth) {
        console.log(`  ${chalk.gray('→')} Auth:     ${chalk.yellow('Required')}`);
    }
    console.log();
    console.log(chalk.gray('  Press Ctrl+C to stop'));
    console.log();
}

export function displayError(title: string, message: string, suggestions?: string[]): void {
    console.log();
    console.log(chalk.red('✗'), chalk.bold(title));
    console.log();
    console.log(`  ${message}`);

    if (suggestions && suggestions.length > 0) {
        console.log();
        console.log(chalk.gray('  Suggestions:'));
        suggestions.forEach((s) => {
            console.log(`    ${chalk.gray('•')} ${s}`);
        });
    }
    console.log();
}

export function displayCacheList(items: Array<{ key: string; url: string; age: string }>): void {
    if (items.length === 0) {
        console.log(chalk.gray('  No cached specs'));
        return;
    }

    console.log(chalk.bold('  Cached Specs:'));
    console.log();
    items.forEach((item) => {
        console.log(`    ${chalk.cyan(item.key)}`);
        console.log(`      URL: ${chalk.gray(item.url)}`);
        console.log(`      Age: ${chalk.gray(item.age)}`);
        console.log();
    });
}

export function displayCacheCleared(): void {
    console.log(chalk.green('✓'), 'Cache cleared');
}
