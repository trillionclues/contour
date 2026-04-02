// Tests for request body validator and parameter validator

import { describe, it, expect } from 'vitest';
import { validateRequestBody, validateParameters } from '../../../src/routes/validator';
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

// validateRequestBody
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

    it('fails when required body is empty object', () => {
        const result = validateRequestBody(
            {},
            operationWithBody,
            mockSpec
        );
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toContain('required');
    });

    it('fails when required body is undefined', () => {
        const result = validateRequestBody(
            undefined,
            operationWithBody,
            mockSpec
        );
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toContain('required');
    });

    it('fails when required body is null', () => {
        const result = validateRequestBody(
            null,
            operationWithBody,
            mockSpec
        );
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toContain('required');
    });

    it('passes when body is optional and empty', () => {
        const optionalBodyOp: Operation = {
            responses: { '200': { description: 'OK' } },
            requestBody: {
                required: false,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreateUser' },
                    },
                },
            },
        };
        const result = validateRequestBody({}, optionalBodyOp, mockSpec);
        // Not required — should pass even when empty
        expect(result.valid).toBe(true);
    });
});

// ---------- validateParameters ----------
describe('validateParameters', () => {
    const operationWithParams: Operation = {
        responses: { '200': { description: 'OK' } },
        parameters: [
            { name: 'page', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
            { name: 'sort', in: 'query', required: false, schema: { type: 'string', enum: ['asc', 'desc'] } },
            { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' } },
        ],
    };

    // Helper to build a minimal Express-like Request
    function fakeReq(overrides: {
        query?: Record<string, string>;
        headers?: Record<string, string>;
        params?: Record<string, string>;
    }): any {
        return {
            query: overrides.query ?? {},
            headers: overrides.headers ?? {},
            params: overrides.params ?? {},
            cookies: {},
        };
    }

    it('passes when all required params are present and valid', () => {
        const req = fakeReq({
            query: { page: '1' },
            headers: { 'x-api-key': 'abc123' },
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(true);
    });

    it('fails when required query param is missing', () => {
        const req = fakeReq({
            query: {},
            headers: { 'x-api-key': 'abc123' },
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(false);
        expect(result.errors!.some(e => e.field === 'query.page')).toBe(true);
    });

    it('fails when required header is missing', () => {
        const req = fakeReq({
            query: { page: '1' },
            headers: {},
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(false);
        expect(result.errors!.some(e => e.field === 'header.x-api-key')).toBe(true);
    });

    it('fails when integer param receives non-integer value', () => {
        const req = fakeReq({
            query: { page: 'abc' },
            headers: { 'x-api-key': 'abc123' },
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(false);
        expect(result.errors!.some(e => e.message.includes('integer'))).toBe(true);
    });

    it('fails when integer param violates minimum constraint', () => {
        const req = fakeReq({
            query: { page: '0' },
            headers: { 'x-api-key': 'abc123' },
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(false);
        expect(result.errors!.some(e => e.message.includes('>= 1'))).toBe(true);
    });

    it('fails when enum param receives invalid value', () => {
        const req = fakeReq({
            query: { page: '1', sort: 'invalid' },
            headers: { 'x-api-key': 'abc123' },
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(false);
        expect(result.errors!.some(e => e.message.includes('one of'))).toBe(true);
    });

    it('passes when optional params are omitted', () => {
        const req = fakeReq({
            query: { page: '5' },
            headers: { 'x-api-key': 'abc123' },
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(true);
    });

    it('passes when operation has no parameters', () => {
        const req = fakeReq({});
        const result = validateParameters(req, operationWithoutBody, mockSpec);
        expect(result.valid).toBe(true);
    });

    it('collects multiple errors at once', () => {
        const req = fakeReq({
            query: {},
            headers: {},
        });
        const result = validateParameters(req, operationWithParams, mockSpec);
        expect(result.valid).toBe(false);
        // Should have errors for both required params: page and x-api-key
        expect(result.errors!.length).toBe(2);
    });
});
