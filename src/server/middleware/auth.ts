/**
 * Auth Middleware - Optional Bearer token check
 */

import type { Request, Response, NextFunction } from 'express';

export function createAuthMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid Bearer token',
            });
        }

        // Token exists - that's enough for mock purposes
        // don't validate the token itself
        next();
    };
}
