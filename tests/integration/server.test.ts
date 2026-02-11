// Integration test: spec → routes → mock responses

import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../../src/server/index';
import { loadSpec } from '../../src/loader/index';
import { DEFAULT_CONFIG } from '../../src/types/index';
import type { Express } from 'express';
import path from 'path';

// using lightweight HTTP test helper (no supertest dep)
function request(app: Express) {
    const http = require('http');
    const server = http.createServer(app);

    return {
        get: (url: string) => makeRequest(server, 'GET', url),
        post: (url: string, body?: object) => makeRequest(server, 'POST', url, body),
        delete: (url: string) => makeRequest(server, 'DELETE', url),
        close: () => server.close(),
    };
}

function makeRequest(
    server: any,
    method: string,
    url: string,
    body?: object
): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
        server.listen(0, () => {
            const port = server.address().port;
            const options = {
                hostname: '127.0.0.1',
                port,
                path: url,
                method,
                headers: { 'Content-Type': 'application/json' },
            };

            const req = require('http').request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: string) => (data += chunk));
                res.on('end', () => {
                    server.close();
                    try {
                        resolve({
                            status: res.statusCode,
                            body: data ? JSON.parse(data) : null,
                        });
                    } catch {
                        resolve({ status: res.statusCode, body: data });
                    }
                });
            });

            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    });
}

const FIXTURE_PATH = path.resolve('tests/fixtures/test-api.yaml');

describe('Server Integration', () => {
    let app: Express;

    beforeAll(async () => {
        const spec = await loadSpec(FIXTURE_PATH);
        const config = { ...DEFAULT_CONFIG, specPath: FIXTURE_PATH };
        const result = await createServer(spec, config);
        app = result.app;
    });

    it('registers the correct number of endpoints', async () => {
        const spec = await loadSpec(FIXTURE_PATH);
        const config = { ...DEFAULT_CONFIG, specPath: FIXTURE_PATH };
        const result = await createServer(spec, config);
        expect(result.endpointCount).toBe(4); // GET /users, POST /users, GET /users/:id, DELETE /users/:id
    });

    it('GET /users returns an array', async () => {
        const res = await request(app).get('/users');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /users returns objects with expected fields', async () => {
        const res = await request(app).get('/users');
        const user = res.body[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('name');
    });

    it('GET /users/:id returns a single user', async () => {
        const res = await request(app).get('/users/test-id-123');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', 'test-id-123');
        expect(res.body).toHaveProperty('email');
    });

    it('POST /users with valid body returns 201', async () => {
        const res = await request(app).post('/users', {
            email: 'test@example.com',
            name: 'Test User',
        });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('email', 'test@example.com');
        expect(res.body).toHaveProperty('name', 'Test User');
    });

    it('POST /users with missing required field returns 400', async () => {
        const res = await request(app).post('/users', { name: 'No Email' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Validation failed');
        expect(res.body.details).toBeDefined();
    });

    it('DELETE /users/:id returns 204', async () => {
        const res = await request(app).delete('/users/some-id');
        expect(res.status).toBe(204);
    });

    it('GET /_contour/health returns health check', async () => {
        const res = await request(app).get('/_contour/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /nonexistent returns 404', async () => {
        const res = await request(app).get('/nonexistent');
        expect(res.status).toBe(404);
    });
});
