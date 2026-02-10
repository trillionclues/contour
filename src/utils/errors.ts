// Custom Error Classes

export class ContourError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500
    ) {
        super(message);
        this.name = 'ContourError';
    }

    toJSON() {
        return {
            error: this.code,
            message: this.message,
        };
    }
}

export class SpecNotFoundError extends ContourError {
    constructor(path: string) {
        super(`Spec file not found: ${path}`, 'SPEC_NOT_FOUND', 404);
        this.name = 'SpecNotFoundError';
    }
}

export class InvalidSpecError extends ContourError {
    constructor(message: string) {
        super(`Invalid OpenAPI spec: ${message}`, 'INVALID_SPEC', 400);
        this.name = 'InvalidSpecError';
    }
}

export class NetworkError extends ContourError {
    constructor(url: string, reason: string) {
        super(`Failed to fetch spec from ${url}: ${reason}`, 'NETWORK_ERROR', 502);
        this.name = 'NetworkError';
    }
}

export class ValidationError extends ContourError {
    constructor(message: string, public readonly details?: unknown[]) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}

export class PortInUseError extends ContourError {
    constructor(port: number) {
        super(
            `Port ${port} is already in use. Try --port ${port + 1}`,
            'PORT_IN_USE',
            500
        );
        this.name = 'PortInUseError';
    }
}
