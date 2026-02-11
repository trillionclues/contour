// for request body validator

import { describe, it, expect } from 'vitest';
import { validateRequestBody } from '../../../src/routes/validator';
import type { Operation, OpenAPISpec } from '../../../src/types/index';

const mockSpec: OpenAPISpec = {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    components: {
        schemas: {
            CreateUser: {
                type: 'object',
                required: ['email', 'name'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string', minLength: 2 },
                    age: { type: 'integer', minimum: 0 },
                },
            },
        },
    },
};

const operationWithBody: Operation = {
    responses: { '201': { description: 'Created' } },
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/CreateUser' },
            },
        },
    },
};

const operationWithoutBody: Operation = {
    responses: { '200': { description: 'OK' } },
};

describe('validateRequestBody', () => {
    it('passes for valid body with all required fields', () => {
        const result = validateRequestBody(
            { email: 'test@example.com', name: 'John' },
            operationWithBody,
            mockSpec
        );
        expect(result.valid).toBe(true);
    });

    it('fails when required field is missing', () => {
        const result = validateRequestBody(
            { name: 'John' },
            operationWithBody,
            mockSpec
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('passes when operation has no requestBody', () => {
        const result = validateRequestBody(
            { anything: 'goes' },
            operationWithoutBody,
            mockSpec
        );
        expect(result.valid).toBe(true);
    });

    it('fails for wrong type (string where integer expected)', () => {
        const result = validateRequestBody(
            { email: 'test@example.com', name: 'John', age: 'not-a-number' },
            operationWithBody,
            mockSpec
        );
        expect(result.valid).toBe(false);
    });

    it('passes with extra fields (additionalProperties not restricted)', () => {
        const result = validateRequestBody(
            { email: 'test@example.com', name: 'John', extraField: true },
            operationWithBody,
            mockSpec
        );
        expect(result.valid).toBe(true);
    });
});
