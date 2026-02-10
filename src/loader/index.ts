// Spec Loader entry point

import { promises as fs } from 'fs';
import path from 'path';
import type { OpenAPISpec } from '../types/index.js';
import { SpecNotFoundError, InvalidSpecError } from '../utils/errors.js';
import { fetchFromURL } from './fetcher.js';
import { parseSpec } from './parser.js';

function isURL(input: string): boolean {
    return input.startsWith('http://') || input.startsWith('https://');
}

function isFilePath(input: string): boolean {
    const ext = path.extname(input).toLowerCase();
    return ['.yaml', '.yml', '.json'].includes(ext);
}


export async function loadSpec(input: string): Promise<OpenAPISpec> {
    if (isURL(input)) {
        return await fetchFromURL(input);
    }

    if (isFilePath(input)) {
        return await loadFromFile(input);
    }

    throw new InvalidSpecError(
        `Invalid spec path: ${input}. Must be a .yaml, .yml, or .json file, or a URL.`
    );
}

async function loadFromFile(filePath: string): Promise<OpenAPISpec> {
    const absolutePath = path.resolve(filePath);

    try {
        const content = await fs.readFile(absolutePath, 'utf-8');
        return await parseSpec(content, absolutePath);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            throw new SpecNotFoundError(absolutePath);
        }
        throw error;
    }
}

export { fetchFromURL } from './fetcher.js';
export { parseSpec } from './parser.js';
export { validateSpec } from './validator.js';
export * from './cache.js';
