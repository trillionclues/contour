// for schema-parser ($ref resolution)

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveSchema, resolveRef, clearSchemaCache } from '../../../src/generator/schema-parser';
import type { OpenAPISpec, Schema } from '../../../src/types/index';

const mockSpec: OpenAPISpec = {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    components: {
        schemas: {
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    address: { $ref: '#/components/schemas/Address' },
                },
                required: ['id', 'name'],
            },
            Address: {
                type: 'object',
                properties: {
                    city: { type: 'string' },
                    country: { type: 'string' },
                },
            },
        },
    },
};

beforeEach(() => {
    clearSchemaCache();
});

describe('resolveSchema', () => {
    it('resolves a $ref to a component schema', () => {
        const schema: Schema = { $ref: '#/components/schemas/User' };
        const resolved = resolveSchema(schema, mockSpec);

        expect(resolved.type).toBe('object');
        expect(resolved.properties).toBeDefined();
        expect(resolved.properties!.id).toBeDefined();
        expect(resolved.properties!.name).toBeDefined();
    });

    it('resolves nested $refs', () => {
        const schema: Schema = { $ref: '#/components/schemas/User' };
        const resolved = resolveSchema(schema, mockSpec);

        // The address property should be resolved from its $ref
        expect(resolved.properties!.address).toBeDefined();
        const address = resolved.properties!.address;
        expect(address.type).toBe('object');
        expect(address.properties!.city).toBeDefined();
    });

    it('returns schema as-is when no $ref', () => {
        const schema: Schema = { type: 'string', format: 'email' };
        const resolved = resolveSchema(schema, mockSpec);

        expect(resolved.type).toBe('string');
        expect(resolved.format).toBe('email');
    });

    it('resolves array items with $ref', () => {
        const schema: Schema = {
            type: 'array',
            items: { $ref: '#/components/schemas/Address' },
        };
        const resolved = resolveSchema(schema, mockSpec);

        expect(resolved.type).toBe('array');
        expect(resolved.items!.type).toBe('object');
        expect(resolved.items!.properties!.city).toBeDefined();
    });
});

describe('resolveRef', () => {
    it('resolves a valid ref path', () => {
        const result = resolveRef('#/components/schemas/User', mockSpec);
        expect(result).toBeDefined();
        expect(result.type).toBe('object');
    });

    it('returns undefined for invalid ref', () => {
        const result = resolveRef('#/components/schemas/NonExistent', mockSpec);
        expect(result).toBeUndefined();
    });
});
