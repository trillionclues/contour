// Simulate random API failures

import type { Request, Response, NextFunction } from 'express';

const ERROR_RESPONSES = [
    { status: 500, error: 'Internal Server Error', message: 'Unexpected server error' },
    { status: 502, error: 'Bad Gateway', message: 'Upstream server error' },
    { status: 503, error: 'Service Unavailable', message: 'Server is overloaded' },
    { status: 504, error: 'Gateway Timeout', message: 'Request timeout' },
    { status: 429, error: 'Too Many Requests', message: 'Rate limit exceeded' },
];

export function createErrorRateMiddleware(errorRate: number) {
    return (_req: Request, res: Response, next: NextFunction) => {
        // errorRate is 0-100 (percentage)
        if (Math.random() * 100 < errorRate) {
            const errorResponse = ERROR_RESPONSES[Math.floor(Math.random() * ERROR_RESPONSES.length)];
            return res.status(errorResponse.status).json({
                error: errorResponse.error,
                message: errorResponse.message,
            });
        }
        next();
    };
}
