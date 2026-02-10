// Schema Parser - Resolve $refs and prepare schemas for generation

import type { OpenAPISpec, Schema } from '../types/index.js';

const resolvedCache = new Map<string, Schema>();

export function resolveRef(ref: string, spec: OpenAPISpec): Schema {
    if (resolvedCache.has(ref)) {
        return resolvedCache.get(ref)!;
    }

    // Parse reference: #/components/schemas/User
    const parts = ref.replace('#/', '').split('/');

    let current: unknown = spec;
    for (const part of parts) {
        if (current && typeof current === 'object') {
            current = (current as Record<string, unknown>)[part];
        } else {
            throw new Error(`Cannot resolve reference: ${ref}`);
        }
    }

    const schema = current as Schema;
    resolvedCache.set(ref, schema);
    return schema;
}

export function resolveSchema(schema: Schema, spec: OpenAPISpec): Schema {
    if (schema.$ref) {
        const resolved = resolveRef(schema.$ref, spec);
        return resolveSchema(resolved, spec);
    }

    // Resolve nested $refs
    const result = { ...schema };

    if (result.properties) {
        const resolvedProps: Record<string, Schema> = {};
        for (const [key, prop] of Object.entries(result.properties)) {
            resolvedProps[key] = resolveSchema(prop, spec);
        }
        result.properties = resolvedProps;
    }

    if (result.items) {
        result.items = resolveSchema(result.items, spec);
    }

    if (result.allOf) {
        result.allOf = result.allOf.map((s) => resolveSchema(s, spec));
    }

    if (result.oneOf) {
        result.oneOf = result.oneOf.map((s) => resolveSchema(s, spec));
    }

    if (result.anyOf) {
        result.anyOf = result.anyOf.map((s) => resolveSchema(s, spec));
    }

    return result;
}

export function clearSchemaCache(): void {
    resolvedCache.clear();
}
