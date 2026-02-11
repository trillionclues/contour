// Route Generator to convert OpenAPI paths to Express routes

import type { Router, Request, Response } from 'express';
import { Router as createRouter } from 'express';
import type { OpenAPISpec, Operation, Config } from '../types/index.js';
import { generateData, initDataGenerator } from '../generator/index.js';
import { resolveSchema } from '../generator/schema-parser.js';
import { initGenerator } from '../generator/faker-adapter.js';
import { validateRequestBody } from './validator.js';
import { stateManager } from '../state/index.js';
import { logger } from '../utils/logger.js';
import { faker } from '@faker-js/faker';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

interface RouteInfo {
    method: string;
    path: string;
    operationId?: string;
}

export function generateRoutes(spec: OpenAPISpec, config: Config): { router: Router; routes: RouteInfo[] } {
    const router = createRouter();
    const routes: RouteInfo[] = [];

    // Initialize data gen
    initDataGenerator(spec, {
        deterministic: config.deterministic,
    });

    // Convert each path
    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
        const expressPath = convertPathToExpress(path);

        for (const method of HTTP_METHODS) {
            const operation = pathItem[method] as Operation | undefined;
            if (!operation) continue;

            routes.push({
                method: method.toUpperCase(),
                path: expressPath,
                operationId: operation.operationId,
            });

            router[method](expressPath, createHandler(spec, path, method, operation, config));
            logger.debug(`Registered route: ${method.toUpperCase()} ${expressPath}`);
        }
    }

    return { router, routes };
}

function convertPathToExpress(openApiPath: string): string {
    // Convert {param} to :param
    return openApiPath.replace(/\{(\w+)\}/g, ':$1');
}

function createHandler(
    spec: OpenAPISpec,
    path: string,
    method: HttpMethod,
    operation: Operation,
    config: Config
) {
    return (req: Request, res: Response) => {
        try {
            // x-contour-deterministic: seed faker for this endpoint
            if (operation['x-contour-deterministic']) {
                const seedStr = `${path}:${method}`;
                const seed = Array.from(seedStr).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                initGenerator(seed);
            }

            const successCode = method === 'post' ? '201' : '200';
            const response = operation.responses[successCode] || operation.responses['200'] || operation.responses['default'];

            if (!response) {
                return res.status(204).send();
            }

            const content = response.content?.['application/json'];

            // resolve schema
            const schema = content?.schema ? resolveSchema(content.schema, spec) : null;

            // request body validation for write methods
            if ((method === 'post' || method === 'put' || method === 'patch') && req.body && Object.keys(req.body).length > 0) {
                const validation = validateRequestBody(req.body, operation, spec);
                if (!validation.valid) {
                    return res.status(400).json({
                        error: 'Validation failed',
                        details: validation.errors,
                    });
                }
            }

            // stateful mode
            if (config.stateful) {
                const hasParams = path.includes('{');

                if (method === 'get') {
                    if (hasParams) {
                        // get Item by ID
                        // simple heuristic: check 'id' param or last param
                        const idParam = Object.keys(req.params).find(k => k.toLowerCase().includes('id')) || Object.keys(req.params).pop();
                        const id = idParam ? req.params[idParam] : null;

                        if (id) {
                            const item = stateManager.getById(path, id);
                            if (item) return res.json(item);
                            // not found? maybe generate if not strictly stateful? 
                            // for stateful, 404 is correct.
                            return res.status(404).json({ error: 'Not Found' });
                        }
                    } else {
                        // list collection
                        let items = stateManager.getAll(path);

                        // seed if empty
                        if (items.length === 0 && schema) {
                            const generated = generateData(schema);
                            if (Array.isArray(generated)) {
                                const seeded = generated.map((item: any) => ({
                                    id: faker.string.uuid(),
                                    ...item
                                }));
                                stateManager.seed(path, seeded);
                                items = seeded;
                            }
                        }
                        return res.json(items);
                    }
                }

                // post - create
                if (method === 'post') {
                    const newItem = stateManager.create(path, req.body);
                    return res.status(201).json(newItem);
                }

                // put/ patch - update
                if (method === 'put' || method === 'patch') {
                    const idParam = Object.keys(req.params).find(k => k.toLowerCase().includes('id')) || Object.keys(req.params).pop();
                    const id = idParam ? req.params[idParam] : null;

                    if (id) {
                        const updated = stateManager.update(path, id, req.body);
                        if (updated) return res.json(updated);
                        return res.status(404).json({ error: 'Not Found' });
                    }
                }

                // DELETE
                if (method === 'delete') {
                    const idParam = Object.keys(req.params).find(k => k.toLowerCase().includes('id')) || Object.keys(req.params).pop();
                    const id = idParam ? req.params[idParam] : null;

                    if (id) {
                        const deleted = stateManager.delete(path, id);
                        if (deleted) return res.status(204).send();
                        return res.status(404).json({ error: 'Not Found' });
                    }
                }
            }

            // STATELESS MODE (Default)
            if (!schema) {
                if (method === 'delete') {
                    return res.status(204).send();
                }
                return res.json({});
            }

            const sendResponse = (statusCode: number, body: unknown) => {
                const perEndpointDelay = operation['x-contour-delay'];
                if (perEndpointDelay && perEndpointDelay > 0) {
                    setTimeout(() => res.status(statusCode).json(body), perEndpointDelay);
                } else {
                    res.status(statusCode).json(body);
                }
            };

            // apply x-contour-count to override array size
            let data = generateData(schema) as Record<string, unknown>;
            if (Array.isArray(data) && operation['x-contour-count']) {
                const targetCount = operation['x-contour-count'];
                while (data.length < targetCount) {
                    data.push(generateData(schema.items ?? schema) as Record<string, unknown>);
                }
                data = data.slice(0, targetCount) as unknown as Record<string, unknown>;
            }

            // handle path parameters - inject into response
            if (req.params && typeof data === 'object' && data !== null && !Array.isArray(data)) {
                for (const [key, value] of Object.entries(req.params)) {
                    if (key === 'id' || key.endsWith('Id')) {
                        data.id = value;
                    }
                }
            }

            // for POST, in stateless mode, just mirror the body + generated data
            if (method === 'post' && req.body && typeof data === 'object' && !Array.isArray(data)) {
                Object.assign(data, req.body);
                return sendResponse(201, data);
            }

            // for PUT/PATCH, merge request body
            if ((method === 'put' || method === 'patch') && req.body && typeof data === 'object' && !Array.isArray(data)) {
                Object.assign(data, req.body);
            }

            return sendResponse(200, data);
        } catch (error) {
            logger.error('Error generating response', error);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to generate mock response',
            });
        }
    };
}

export function countEndpoints(spec: OpenAPISpec): number {
    let count = 0;
    for (const pathItem of Object.values(spec.paths)) {
        for (const method of HTTP_METHODS) {
            if (pathItem[method]) {
                count++;
            }
        }
    }
    return count;
}
