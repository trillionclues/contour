// Data Generator - Main entry point

import type { OpenAPISpec, Schema, GenerationContext } from '../types/index.js';
import { initGenerator, generateFromSchema } from './faker-adapter.js';
import { resolveSchema, clearSchemaCache } from './schema-parser.js';

export interface GeneratorOptions {
    deterministic?: boolean;
    seed?: number;
}

let currentSpec: OpenAPISpec | null = null;

export function initDataGenerator(spec: OpenAPISpec, options: GeneratorOptions = {}): void {
    currentSpec = spec;
    clearSchemaCache();

    if (options.deterministic) {
        initGenerator(options.seed ?? 12345);
    } else {
        initGenerator();
    }
}

export function generateData(schema: Schema, context?: GenerationContext): unknown {
    if (!currentSpec) {
        throw new Error('Generator not initialized. Call initDataGenerator first.');
    }

    const resolvedSchema = resolveSchema(schema, currentSpec);
    return generateFromSchema(resolvedSchema, context ?? { path: [], depth: 0 });
}

export function generateForEndpoint(
    path: string,
    method: string,
    statusCode: string = '200'
): unknown {
    if (!currentSpec) {
        throw new Error('Generator not initialized. Call initDataGenerator first.');
    }

    const pathItem = currentSpec.paths[path];
    if (!pathItem) {
        return null;
    }

    const operation = pathItem[method.toLowerCase() as keyof typeof pathItem];
    if (!operation || typeof operation !== 'object') {
        return null;
    }

    const response = (operation as { responses?: Record<string, unknown> }).responses?.[statusCode];
    if (!response || typeof response !== 'object') {
        return null;
    }

    const content = (response as { content?: Record<string, unknown> }).content;
    if (!content) {
        return {};
    }

    // Try application/json first, then * / *, then take the first available
    const contentType =
        content['application/json'] ? 'application/json' :
            content['*/*'] ? '*/*' :
                Object.keys(content)[0];

    const schemaContent = content[contentType] as { schema?: Schema } | undefined;
    if (!schemaContent?.schema) {
        return {};
    }

    return generateData(schemaContent.schema);
}

export { generateFromSchema } from './faker-adapter.js';
export { resolveSchema, resolveRef } from './schema-parser.js';
