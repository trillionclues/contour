// for faker-adapter (data generation + property-name heuristics)

import { describe, it, expect, beforeEach } from 'vitest';
import { initGenerator, generateFromSchema } from '../../../src/generator/faker-adapter';

beforeEach(() => {
    initGenerator(12345); // deterministic seed
});

describe('generateFromSchema', () => {
    describe('string types', () => {
        it('generates a UUID for format: uuid', () => {
            const result = generateFromSchema({ type: 'string', format: 'uuid' });
            expect(result).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            );
        });

        it('generates an email for format: email', () => {
            const result = generateFromSchema({ type: 'string', format: 'email' });
            expect(result).toMatch(/@example\.com$/);
        });

        it('generates a URL for format: uri', () => {
            const result = generateFromSchema({ type: 'string', format: 'uri' });
            expect(result).toMatch(/^https?:\/\//);
        });

        it('generates ISO date-time for format: date-time', () => {
            const result = generateFromSchema({ type: 'string', format: 'date-time' });
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('generates a date for format: date', () => {
            const result = generateFromSchema({ type: 'string', format: 'date' });
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('respects minLength and maxLength', () => {
            const result = generateFromSchema({
                type: 'string',
                minLength: 5,
                maxLength: 20,
            }) as string;
            expect(result.length).toBeGreaterThanOrEqual(5);
            expect(result.length).toBeLessThanOrEqual(20);
        });
    });

    describe('number types', () => {
        it('generates an integer within range', () => {
            const result = generateFromSchema({
                type: 'integer',
                minimum: 1,
                maximum: 100,
            }) as number;
            expect(Number.isInteger(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(100);
        });

        it('generates a float for type: number', () => {
            const result = generateFromSchema({
                type: 'number',
                minimum: 0,
                maximum: 10,
            }) as number;
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(10);
        });
    });

    describe('boolean type', () => {
        it('generates a boolean', () => {
            const result = generateFromSchema({ type: 'boolean' });
            expect(typeof result).toBe('boolean');
        });
    });

    describe('enum', () => {
        it('picks a value from enum', () => {
            const options = ['admin', 'user', 'guest'];
            const result = generateFromSchema({ type: 'string', enum: options });
            expect(options).toContain(result);
        });
    });

    describe('array type', () => {
        it('generates an array with correct item types', () => {
            const result = generateFromSchema({
                type: 'array',
                items: { type: 'string', format: 'uuid' },
                minItems: 2,
                maxItems: 4,
            }) as unknown[];
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThanOrEqual(2);
            expect(result.length).toBeLessThanOrEqual(4);
        });
    });

    describe('object type', () => {
        it('generates an object with defined properties', () => {
            const result = generateFromSchema({
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    age: { type: 'integer', minimum: 0, maximum: 120 },
                },
                required: ['id', 'name'],
            }) as Record<string, unknown>;

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
        });
    });

    describe('example values', () => {
        it('returns example value when provided', () => {
            const result = generateFromSchema({
                type: 'string',
                example: 'hello@world.com',
            });
            expect(result).toBe('hello@world.com');
        });
    });

    describe('property-name heuristics', () => {
        it('generates a realistic name when propertyName is "name"', () => {
            const result = generateFromSchema(
                { type: 'string' },
                { path: [], depth: 0, propertyName: 'name' }
            ) as string;
            expect(result.length).toBeGreaterThan(2);
            // Should contain a space (first + last name)
            expect(result).toContain(' ');
        });

        it('generates a phone number when propertyName is "phone"', () => {
            const result = generateFromSchema(
                { type: 'string' },
                { path: [], depth: 0, propertyName: 'phone' }
            ) as string;
            expect(result).toMatch(/\d/);
        });

        it('generates a city when propertyName is "city"', () => {
            const result = generateFromSchema(
                { type: 'string' },
                { path: [], depth: 0, propertyName: 'city' }
            ) as string;
            expect(result.length).toBeGreaterThan(0);
        });

        it('generates a paragraph when propertyName is "bio"', () => {
            const result = generateFromSchema(
                { type: 'string' },
                { path: [], depth: 0, propertyName: 'bio' }
            ) as string;
            expect(result.length).toBeGreaterThan(20);
        });

        it('format takes priority over property name', () => {
            const result = generateFromSchema(
                { type: 'string', format: 'uuid' },
                { path: [], depth: 0, propertyName: 'name' }
            );
            expect(result).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            );
        });
    });
});
