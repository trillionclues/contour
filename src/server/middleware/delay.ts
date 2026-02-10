// Simulate network latency

import type { Request, Response, NextFunction } from 'express';

export function createDelayMiddleware(minDelay: number, maxDelay: number) {
    return (_req: Request, _res: Response, next: NextFunction) => {
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        setTimeout(next, delay);
    };
}
