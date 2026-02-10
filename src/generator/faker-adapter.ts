// Faker.js Adapter - Generate realistic data from schemas

import { faker } from '@faker-js/faker';
import type { Schema, GenerationContext } from '../types/index.js';

const MAX_ARRAY_SIZE = 100;
const MAX_OBJECT_DEPTH = 10;
const DEFAULT_ARRAY_SIZE = 5;

export function initGenerator(seed?: number): void {
    if (seed !== undefined) {
        faker.seed(seed);
    } else {
        faker.seed(Date.now());
    }
}

export function generateFromSchema(
    schema: Schema,
    context: GenerationContext = { path: [], depth: 0 }
): unknown {
    if (schema.example !== undefined) {
        return schema.example;
    }

    // $ref (should resolve before this point)
    if (schema.$ref) {
        return { $ref: schema.$ref };
    }

    // nullable
    if (schema.nullable && Math.random() < 0.1) {
        return null;
    }

    // enum
    if (schema.enum && schema.enum.length > 0) {
        return faker.helpers.arrayElement(schema.enum);
    }

    // allOf/oneOf/anyOf
    if (schema.allOf) {
        return generateFromSchema(schema.allOf[0], context);
    }
    if (schema.oneOf) {
        return generateFromSchema(faker.helpers.arrayElement(schema.oneOf), context);
    }
    if (schema.anyOf) {
        return generateFromSchema(faker.helpers.arrayElement(schema.anyOf), context);
    }

    switch (schema.type) {
        case 'string':
            return generateString(schema);
        case 'number':
        case 'integer':
            return generateNumber(schema);
        case 'boolean':
            return faker.datatype.boolean();
        case 'array':
            return generateArray(schema, context);
        case 'object':
            return generateObject(schema, context);
        default:
            // Fallback for unknown types
            return faker.lorem.word();
    }
}

function generateString(schema: Schema): string {
    switch (schema.format) {
        case 'uuid':
            return faker.string.uuid();
        case 'email':
            return faker.internet.email({ provider: 'example.com' });
        case 'uri':
        case 'url':
            return faker.internet.url();
        case 'hostname':
            return faker.internet.domainName();
        case 'ipv4':
            return faker.internet.ipv4();
        case 'ipv6':
            return faker.internet.ipv6();
        case 'date-time':
            return faker.date.recent().toISOString();
        case 'date':
            return faker.date.recent().toISOString().split('T')[0];
        case 'time':
            return faker.date.recent().toISOString().split('T')[1].slice(0, 8);
        case 'password':
            return faker.internet.password({ length: 12 });
        case 'byte':
            return Buffer.from(faker.lorem.word()).toString('base64');
        case 'binary':
            return faker.lorem.word();
        default:
            break;
    }

    if (schema.pattern) {
        // Simple pattern handling - for complex patterns, use randexp
        return faker.lorem.word();
    }

    const minLength = schema.minLength ?? 1;
    const maxLength = schema.maxLength ?? 50;

    // Heuristic: use common field names
    const fieldName = schema.example?.toString() ?? '';
    if (fieldName.toLowerCase().includes('name')) {
        return faker.person.fullName();
    }
    if (fieldName.toLowerCase().includes('phone')) {
        return faker.phone.number();
    }
    if (fieldName.toLowerCase().includes('address')) {
        return faker.location.streetAddress();
    }

    let value = faker.lorem.words({ min: 1, max: 5 });

    if (value.length > maxLength) {
        value = value.substring(0, maxLength);
    }
    while (value.length < minLength) {
        value += ' ' + faker.lorem.word();
    }

    return value.trim();
}

function generateNumber(schema: Schema): number {
    const min = schema.minimum ?? 0;
    const max = schema.maximum ?? 1000;

    if (schema.type === 'integer') {
        return faker.number.int({ min, max });
    }

    return faker.number.float({ min, max, fractionDigits: 2 });
}

function generateArray(schema: Schema, context: GenerationContext): unknown[] {
    const minItems = schema.minItems ?? 1;
    const maxItems = Math.min(schema.maxItems ?? DEFAULT_ARRAY_SIZE, MAX_ARRAY_SIZE);
    const count = faker.number.int({ min: minItems, max: maxItems });

    if (!schema.items) {
        return [];
    }

    const items: unknown[] = [];
    for (let i = 0; i < count; i++) {
        items.push(
            generateFromSchema(schema.items, {
                ...context,
                path: [...context.path, String(i)],
                index: i,
            })
        );
    }

    return items;
}

function generateObject(
    schema: Schema,
    context: GenerationContext
): Record<string, unknown> {
    if (context.depth > MAX_OBJECT_DEPTH) {
        return { id: faker.string.uuid() };
    }

    const obj: Record<string, unknown> = {};

    if (!schema.properties) {
        return obj;
    }

    for (const [key, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(key);
        const shouldGenerate = isRequired || Math.random() > 0.2;

        if (shouldGenerate) {
            obj[key] = generateFromSchema(propSchema, {
                ...context,
                path: [...context.path, key],
                depth: context.depth + 1,
            });
        }
    }

    return obj;
}
