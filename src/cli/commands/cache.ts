// Cache Command

import { Command } from 'commander';
import { displayCacheList, displayCacheCleared } from '../ui/index.js';
import { listCache, clearCache } from '../../loader/cache.js';

export function createCacheCommand(): Command {
    const cache = new Command('cache').description('Manage cached OpenAPI specs');

    cache
        .command('list')
        .description('List all cached specs')
        .action(async () => {
            const items = await listCache();
            displayCacheList(items);
        });

    cache
        .command('clear')
        .description('Clear all cached specs')
        .action(async () => {
            await clearCache();
            displayCacheCleared();
        });

    return cache;
}
