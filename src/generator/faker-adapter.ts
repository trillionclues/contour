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
    context: GenerationContext = { path: [], depth: 0, propertyName: '' }
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

    // allOf - merge all schemas
    if (schema.allOf) {
        let merged: Record<string, unknown> = {};
        for (const subSchema of schema.allOf) {
            const result = generateFromSchema(subSchema, context);
            if (result && typeof result === 'object' && !Array.isArray(result)) {
                merged = { ...merged, ...(result as Record<string, unknown>) };
            }
        }

        if (Object.keys(merged).length > 0) {
            return merged;
        }

        // Fallback
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
            return generateString(schema, context.propertyName);
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

function generateString(schema: Schema, propertyName: string = ''): string {
    // format takes priority
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
        return faker.lorem.word();
    }

    // property-name heuristics: infer realistic data from the key name
    const key = propertyName.toLowerCase();
    const heuristic = getHeuristicForProperty(key);
    if (heuristic) {
        return heuristic();
    }

    const minLength = schema.minLength ?? 1;
    const maxLength = schema.maxLength ?? 50;

    let value = faker.lorem.words({ min: 1, max: 5 });

    if (value.length > maxLength) {
        value = value.substring(0, maxLength);
    }
    while (value.length < minLength) {
        value += ' ' + faker.lorem.word();
    }

    return value.trim();
}

function getHeuristicForProperty(key: string): (() => string) | null {
    // exact matches first
    const exactMap: Record<string, () => string> = {
        firstname: () => faker.person.firstName(),
        first_name: () => faker.person.firstName(),
        lastname: () => faker.person.lastName(),
        last_name: () => faker.person.lastName(),
        fullname: () => faker.person.fullName(),
        full_name: () => faker.person.fullName(),
        username: () => faker.internet.userName(),
        email: () => faker.internet.email({ provider: 'example.com' }),
        phone: () => faker.phone.number(),
        phonenumber: () => faker.phone.number(),
        phone_number: () => faker.phone.number(),
        avatar: () => faker.image.avatar(),
        image: () => faker.image.url(),
        photo: () => faker.image.url(),
        picture: () => faker.image.url(),
        city: () => faker.location.city(),
        state: () => faker.location.state(),
        country: () => faker.location.country(),
        zipcode: () => faker.location.zipCode(),
        zip_code: () => faker.location.zipCode(),
        zip: () => faker.location.zipCode(),
        street: () => faker.location.street(),
        company: () => faker.company.name(),
        companyname: () => faker.company.name(),
        company_name: () => faker.company.name(),
        title: () => faker.person.jobTitle(),
        jobtitle: () => faker.person.jobTitle(),
        job_title: () => faker.person.jobTitle(),
        bio: () => faker.lorem.paragraph(),
        description: () => faker.lorem.paragraph(),
        summary: () => faker.lorem.sentence(),
        content: () => faker.lorem.paragraphs(2),
        website: () => faker.internet.url(),
        url: () => faker.internet.url(),
        color: () => faker.color.human(),
        currency: () => faker.finance.currencyCode(),
        iban: () => faker.finance.iban(),
        status: () => faker.helpers.arrayElement(['active', 'inactive', 'pending']),
    };

    if (exactMap[key]) return exactMap[key];

    // partial / suffix matches
    if (key === 'name' || key.endsWith('name') || key.endsWith('_name')) return () => faker.person.fullName();
    if (key.includes('phone')) return () => faker.phone.number();
    if (key.includes('email')) return () => faker.internet.email({ provider: 'example.com' });
    if (key.includes('address') || key.includes('street')) return () => faker.location.streetAddress();
    if (key.includes('city')) return () => faker.location.city();
    if (key.includes('country')) return () => faker.location.country();
    if (key.includes('avatar') || key.includes('image') || key.includes('photo')) return () => faker.image.url();
    if (key.includes('url') || key.includes('website') || key.includes('link')) return () => faker.internet.url();
    if (key.includes('description') || key.includes('bio') || key.includes('about')) return () => faker.lorem.paragraph();
    if (key.includes('title')) return () => faker.person.jobTitle();
    if (key.includes('company')) return () => faker.company.name();

    return null;
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
                propertyName: key,
            });
        }
    }

    return obj;
}
