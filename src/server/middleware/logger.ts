import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';

export function createRequestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            const method = req.method;
            const url = req.originalUrl || req.url;

            let statusColor = chalk.green;
            if (status >= 500) statusColor = chalk.red;
            else if (status >= 400) statusColor = chalk.yellow;
            else if (status >= 300) statusColor = chalk.cyan;

            const methodColor = getMethodColor(method);

            // [Time] METHOD URL STATUS DURATION
            const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);

            console.log(
                chalk.gray(`[${timestamp}]`),
                methodColor(method),
                url,
                statusColor(status),
                chalk.gray(`${duration}ms`)
            );
        });

        next();
    };
}

function getMethodColor(method: string) {
    switch (method.toUpperCase()) {
        case 'GET': return chalk.green;
        case 'POST': return chalk.yellow;
        case 'PUT': return chalk.blue;
        case 'DELETE': return chalk.red;
        case 'PATCH': return chalk.magenta;
        default: return chalk.white;
    }
}
