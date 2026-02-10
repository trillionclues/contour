import type { Request, Response, NextFunction } from 'express';
import { ContourError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    logger.error('Request error', err.message);

    if (err instanceof ContourError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    return res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    });
}

export function notFoundHandler(_req: Request, res: Response) {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist in the mock spec',
    });
}
