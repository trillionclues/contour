// for spec loader (parser + validator)

import { describe, it, expect } from 'vitest';
import { loadSpec } from '../../../src/loader/index';
import path from 'path';

const FIXTURE_PATH = path.resolve('tests/fixtures/test-api.yaml');

describe('loadSpec', () => {
    it('loads a valid YAML spec from file', async () => {
        const spec = await loadSpec(FIXTURE_PATH);

        expect(spec.openapi).toBe('3.0.3');
        expect(spec.info.title).toBe('Test API');
        expect(spec.info.version).toBe('1.0.0');
    });

    it('parses paths correctly', async () => {
        const spec = await loadSpec(FIXTURE_PATH);

        expect(spec.paths).toBeDefined();
        expect(spec.paths['/users']).toBeDefined();
        expect(spec.paths['/users/{id}']).toBeDefined();
    });

    it('resolves component schemas', async () => {
        const spec = await loadSpec(FIXTURE_PATH);

        expect(spec.components?.schemas?.User).toBeDefined();
        expect(spec.components?.schemas?.CreateUser).toBeDefined();
    });

    it('has correct operations defined', async () => {
        const spec = await loadSpec(FIXTURE_PATH);

        expect(spec.paths['/users'].get).toBeDefined();
        expect(spec.paths['/users'].post).toBeDefined();
        expect(spec.paths['/users/{id}'].get).toBeDefined();
        expect(spec.paths['/users/{id}'].delete).toBeDefined();
    });

    it('throws for non-existent file', async () => {
        await expect(loadSpec('/nonexistent/spec.yaml')).rejects.toThrow();
    });

    it('throws for invalid file content', async () => {
        // Package.json is valid JSON but not a valid OpenAPI spec
        await expect(loadSpec('package.json')).rejects.toThrow();
    });
});
