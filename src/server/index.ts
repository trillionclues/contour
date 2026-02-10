
import express, { type Express } from 'express';
import type { OpenAPISpec, Config } from '../types/index.js';
import { generateRoutes, countEndpoints } from '../routes/index.js';
import {
    createCorsMiddleware,
    createDelayMiddleware,
    createErrorRateMiddleware,
    createAuthMiddleware,
    createRequestLogger,
    errorHandler,
    notFoundHandler,
} from './middleware/index.js';

interface ServerResult {
    app: Express;
    endpointCount: number;
}

export async function createServer(spec: OpenAPISpec, config: Config): Promise<ServerResult> {
    const app = express();

    app.use(express.json());

    // cors
    if (config.cors) {
        app.use(createCorsMiddleware());
    }

    // auth
    if (config.requireAuth) {
        app.use(createAuthMiddleware());
    }

    // delay sim
    if (config.delay) {
        app.use(createDelayMiddleware(config.delay[0], config.delay[1]));
    }

    // error rate
    if (config.errorRate > 0) {
        app.use(createErrorRateMiddleware(config.errorRate));
    }

    // request logger
    app.use(createRequestLogger());

    // health check endpoint
    app.get('/_contour/health', (_req, res) => {
        res.json({
            status: 'ok',
            spec: spec.info.title,
            version: spec.info.version,
        });
    });

    // generate and mount API routes
    const { router } = generateRoutes(spec, config);
    app.use(router);

    // 404 handler
    app.use(notFoundHandler);

    // error handler
    app.use(errorHandler);

    return {
        app,
        endpointCount: countEndpoints(spec),
    };
}
