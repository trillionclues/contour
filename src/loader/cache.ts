// Spec Cache Manager

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import type { OpenAPISpec, CacheMetadata } from '../types/index.js';

const CACHE_DIR = path.join(os.homedir(), '.contour', 'cache');
const METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function ensureCacheDir(): Promise<void> {
    await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function getMetadata(): Promise<CacheMetadata> {
    try {
        const content = await fs.readFile(METADATA_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return {};
    }
}

async function saveMetadata(metadata: CacheMetadata): Promise<void> {
    await ensureCacheDir();
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

export function generateCacheKey(url: string): string {
    return createHash('md5').update(url).digest('hex');
}

export async function getCachedSpec(
    key: string
): Promise<{ data: OpenAPISpec; age: number } | null> {
    const metadata = await getMetadata();
    const entry = metadata[key];

    if (!entry) {
        return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
        return null; // Stale
    }

    try {
        const specPath = path.join(CACHE_DIR, `${key}.json`);
        const content = await fs.readFile(specPath, 'utf-8');
        return {
            data: JSON.parse(content) as OpenAPISpec,
            age,
        };
    } catch {
        return null;
    }
}

export async function cacheSpec(
    key: string,
    url: string,
    spec: OpenAPISpec
): Promise<void> {
    await ensureCacheDir();

    // Save spec
    const specPath = path.join(CACHE_DIR, `${key}.json`);
    await fs.writeFile(specPath, JSON.stringify(spec, null, 2));

    // Update metadata
    const metadata = await getMetadata();
    metadata[key] = {
        url,
        timestamp: Date.now(),
        specVersion: spec.openapi || '3.0.0',
    };
    await saveMetadata(metadata);
}

export async function listCache(): Promise<
    Array<{ key: string; url: string; age: string }>
> {
    const metadata = await getMetadata();
    const items: Array<{ key: string; url: string; age: string }> = [];

    for (const [key, entry] of Object.entries(metadata)) {
        const ageMs = Date.now() - entry.timestamp;
        const hours = Math.floor(ageMs / (60 * 60 * 1000));
        const age = hours < 1 ? 'Less than 1 hour' : `${hours} hours`;

        items.push({
            key,
            url: entry.url,
            age,
        });
    }

    return items;
}

export async function clearCache(): Promise<void> {
    try {
        await fs.rm(CACHE_DIR, { recursive: true, force: true });
    } catch {
        // Ignore if doesn't exist
    }
}
