// Centralized Logger Utility

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
    currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const prefix = chalk.gray(`[${timestamp}]`);

    let levelTag: string;
    switch (level) {
        case 'debug':
            levelTag = chalk.gray('DEBUG');
            break;
        case 'info':
            levelTag = chalk.blue('INFO');
            break;
        case 'warn':
            levelTag = chalk.yellow('WARN');
            break;
        case 'error':
            levelTag = chalk.red('ERROR');
            break;
    }

    const main = `${prefix} ${levelTag} ${message}`;
    if (data !== undefined) {
        return `${main} ${chalk.gray(JSON.stringify(data))}`;
    }
    return main;
}

export const logger = {
    debug(message: string, data?: unknown): void {
        if (shouldLog('debug')) {
            console.log(formatMessage('debug', message, data));
        }
    },

    info(message: string, data?: unknown): void {
        if (shouldLog('info')) {
            console.log(formatMessage('info', message, data));
        }
    },

    warn(message: string, data?: unknown): void {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message, data));
        }
    },

    error(message: string, data?: unknown): void {
        if (shouldLog('error')) {
            console.error(formatMessage('error', message, data));
        }
    },

    plain(message: string): void {
        console.log(message);
    },

    success(message: string): void {
        console.log(chalk.green('✓'), message);
    },

    box(title: string, lines: string[]): void {
        console.log();
        console.log(chalk.bold(title));
        lines.forEach((line) => console.log(`  ${line}`));
        console.log();
    },
};
