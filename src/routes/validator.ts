// Request Validator
// Validates request bodies and parameters against OpenAPI schemas
// Supports strict validation mode for Contour mock engine

import { createRequire } from 'module';
import type { Request } from 'express';
import type { Operation, OpenAPISpec, Schema, Parameter } from '../types/index.js';
import { resolveSchema } from '../generator/schema-parser.js';
import { logger } from '../utils/logger.js';
import { resolveJsonContent } from '../utils/content-type.js';

// createRequire for CJS-only packages
const require = createRequire(import.meta.url);
const Ajv = require('ajv').default ?? require('ajv');
const addFormats = require('ajv-formats').default ?? require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// ---------- Schema compilation cache ----------
// Cache compiled validators keyed by a stable JSON hash of the cleaned schema.
// This avoids re-compiling on every request and is critical for CPU perf
// when strict mode is enabled across hundreds of concurrent sandboxes.
const validatorCache = new Map<string, ReturnType<typeof ajv.compile>>();

function getCachedValidator(schema: Schema, spec: OpenAPISpec): ReturnType<typeof ajv.compile> | null {
    const resolved = resolveSchema(schema, spec);
    const cleaned = cleanForValidation(resolved);
    const cacheKey = JSON.stringify(cleaned);

    const cached = validatorCache.get(cacheKey);
    if (cached) return cached;

    try {
        const compiled = ajv.compile(cleaned);
        validatorCache.set(cacheKey, compiled);
        return compiled;
    } catch (_error: unknown) {
        logger.debug('Schema validation compilation failed, skipping validation');
        return null;
    }
}

// Public types
export interface ValidationResult {
    valid: boolean;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}

// Request body validation
export function validateRequestBody(
    body: unknown,
    operation: Operation,
    spec: OpenAPISpec
): ValidationResult {
    const requestBody = operation.requestBody;
    if (!requestBody) {
        return { valid: true };
    }

    // If body is required but missing/empty, fail immediately
    if (requestBody.required) {
        if (body === undefined || body === null || (typeof body === 'object' && Object.keys(body as object).length === 0)) {
            return {
                valid: false,
                errors: [{ field: '/', message: 'Request body is required but was empty or missing' }],
            };
        }
    } else {
        // Body is optional — if it's empty or missing, skip validation
        if (body === undefined || body === null || (typeof body === 'object' && Object.keys(body as object).length === 0)) {
            return { valid: true };
        }
    }

    const jsonContent = resolveJsonContent(requestBody.content);
    if (!jsonContent?.schema) {
        return { valid: true };
    }

    const validate = getCachedValidator(jsonContent.schema, spec);
    if (!validate) {
        return { valid: true };
    }

    const valid = validate(body);

    if (!valid && validate.errors) {
        return {
            valid: false,
            errors: validate.errors.map((err: { instancePath?: string; message?: string }) => ({
                field: err.instancePath || '/',
                message: err.message || 'Validation error',
            })),
        };
    }

    return { valid: true };
}

// Parameter validation
export function validateParameters(
    req: Request,
    operation: Operation,
    spec: OpenAPISpec
): ValidationResult {
    const params = operation.parameters;
    if (!params || params.length === 0) {
        return { valid: true };
    }

    const errors: ValidationResult['errors'] = [];

    for (const param of params) {
        const value = getParameterValue(req, param);

        // Check required parameters are present
        if (param.required && (value === undefined || value === '')) {
            errors.push({
                field: `${param.in}.${param.name}`,
                message: `Required ${param.in} parameter '${param.name}' is missing`,
            });
            continue;
        }

        // Skip optional params that are absent
        if (value === undefined) continue;

        // Validate type if schema is provided
        if (param.schema) {
            const typeError = validateParameterType(value, param);
            if (typeError) {
                errors.push(typeError);
            }
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return { valid: true };
}

// Helpers
function getParameterValue(req: Request, param: Parameter): string | undefined {
    switch (param.in) {
        case 'query':
            return req.query[param.name] as string | undefined;
        case 'header':
            return req.headers[param.name.toLowerCase()] as string | undefined;
        case 'path':
            return req.params[param.name];
        case 'cookie':
            return req.cookies?.[param.name] as string | undefined;
        default:
            return undefined;
    }
}

function validateParameterType(
    value: string,
    param: Parameter
): { field: string; message: string } | null {
    const schema = param.schema;
    if (!schema?.type) return null;

    switch (schema.type) {
        case 'integer': {
            const num = Number(value);
            if (!Number.isInteger(num)) {
                return {
                    field: `${param.in}.${param.name}`,
                    message: `Parameter '${param.name}' must be an integer`,
                };
            }
            if (schema.minimum !== undefined && num < schema.minimum) {
                return {
                    field: `${param.in}.${param.name}`,
                    message: `Parameter '${param.name}' must be >= ${schema.minimum}`,
                };
            }
            if (schema.maximum !== undefined && num > schema.maximum) {
                return {
                    field: `${param.in}.${param.name}`,
                    message: `Parameter '${param.name}' must be <= ${schema.maximum}`,
                };
            }
            break;
        }
        case 'number': {
            const num = Number(value);
            if (isNaN(num)) {
                return {
                    field: `${param.in}.${param.name}`,
                    message: `Parameter '${param.name}' must be a number`,
                };
            }
            break;
        }
        case 'boolean': {
            if (value !== 'true' && value !== 'false') {
                return {
                    field: `${param.in}.${param.name}`,
                    message: `Parameter '${param.name}' must be a boolean (true/false)`,
                };
            }
            break;
        }
        case 'string': {
            if (schema.enum && !schema.enum.includes(value)) {
                return {
                    field: `${param.in}.${param.name}`,
                    message: `Parameter '${param.name}' must be one of: ${schema.enum.join(', ')}`,
                };
            }
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                return {
                    field: `${param.in}.${param.name}`,
                    message: `Parameter '${param.name}' must have at least ${schema.minLength} characters`,
                };
            }
            break;
        }
    }

    return null;
}

function cleanForValidation(schema: Schema): Record<string, unknown> {
    const clean: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema)) {
        if (key === 'example' || key === 'examples' || key === 'nullable') continue;

        if (key === 'properties' && typeof value === 'object' && value !== null) {
            const cleanProps: Record<string, unknown> = {};
            for (const [propKey, propSchema] of Object.entries(value as Record<string, Schema>)) {
                cleanProps[propKey] = cleanForValidation(propSchema);
            }
            clean[key] = cleanProps;
        } else if (key === 'items' && typeof value === 'object' && value !== null) {
            clean[key] = cleanForValidation(value as Schema);
        } else {
            clean[key] = value;
        }
    }

    return clean;
}
