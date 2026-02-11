// Request Body Validator
// Validate POST/PUT/PATCH request bodies against OpenAPI schemas

import { createRequire } from 'module';
import type { Operation, OpenAPISpec, Schema } from '../types/index.js';
import { resolveSchema } from '../generator/schema-parser.js';
import { logger } from '../utils/logger.js';

// createRequire for CJS-only packages
const require = createRequire(import.meta.url);
const Ajv = require('ajv').default ?? require('ajv');
const addFormats = require('ajv-formats').default ?? require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

interface ValidationResult {
    valid: boolean;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}

export function validateRequestBody(
    body: unknown,
    operation: Operation,
    spec: OpenAPISpec
): ValidationResult {
    const requestBody = operation.requestBody;
    if (!requestBody) {
        return { valid: true };
    }

    const jsonContent = requestBody.content?.['application/json'];
    if (!jsonContent?.schema) {
        return { valid: true };
    }

    // Resolve $ref in schema
    const schema = resolveSchema(jsonContent.schema, spec);

    // Strip fields ajv doesn't understand (like example)
    const cleanSchema = cleanForValidation(schema);

    try {
        const validate = ajv.compile(cleanSchema);
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
    } catch (_error: unknown) {
        // If schema compilation fails, log and allow through
        logger.debug('Schema validation compilation failed, allowing request through');
        return { valid: true };
    }
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
