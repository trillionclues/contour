// OpenAPI Spec Types
export interface OpenAPISpec {
    openapi: string;
    info: OpenAPIInfo;
    paths: Record<string, PathItem>;
    components?: {
        schemas?: Record<string, Schema>;
        securitySchemes?: Record<string, SecurityScheme>;
    };
    servers?: Server[];
    security?: SecurityRequirement[];
}

export interface OpenAPIInfo {
    title: string;
    version: string;
    description?: string;
}

export interface Server {
    url: string;
    description?: string;
}

export interface PathItem {
    get?: Operation;
    post?: Operation;
    put?: Operation;
    patch?: Operation;
    delete?: Operation;
    options?: Operation;
    head?: Operation;
    parameters?: Parameter[];
}

export interface Operation {
    operationId?: string;
    summary?: string;
    description?: string;
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses: Record<string, Response>;
    security?: SecurityRequirement[];
    tags?: string[];
    // contour extensions
    'x-contour-count'?: number;
    'x-contour-delay'?: number;
    'x-contour-deterministic'?: boolean;
}

export interface Parameter {
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    schema?: Schema;
    description?: string;
}

export interface RequestBody {
    required?: boolean;
    content: Record<string, MediaType>;
    description?: string;
}

export interface Response {
    description: string;
    content?: Record<string, MediaType>;
    headers?: Record<string, Header>;
}

export interface MediaType {
    schema?: Schema;
    example?: unknown;
    examples?: Record<string, Example>;
}

export interface Header {
    schema?: Schema;
    description?: string;
}

export interface Example {
    value: unknown;
    summary?: string;
}

// JSON Schema Types
export interface Schema {
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
    format?: string;
    $ref?: string;
    properties?: Record<string, Schema>;
    items?: Schema;
    required?: string[];
    enum?: unknown[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
    pattern?: string;
    default?: unknown;
    example?: unknown;
    nullable?: boolean;
    allOf?: Schema[];
    oneOf?: Schema[];
    anyOf?: Schema[];
}

export interface SecurityScheme {
    type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
    scheme?: string;
    bearerFormat?: string;
    name?: string;
    in?: 'header' | 'query' | 'cookie';
}

export type SecurityRequirement = Record<string, string[]>;

// config types
export interface Config {
    port: number;
    host: string;
    cors: boolean;
    stateful: boolean;
    deterministic: boolean;
    requireAuth: boolean;
    delay: [number, number] | null;
    errorRate: number;
    specPath: string;
}

export const DEFAULT_CONFIG: Config = {
    port: 3001,
    host: '127.0.0.1',
    cors: true,
    stateful: false,
    deterministic: false,
    requireAuth: false,
    delay: null,
    errorRate: 0,
    specPath: '',
};

// cache types
export interface CacheMetadata {
    [key: string]: {
        url: string;
        timestamp: number;
        etag?: string;
        specVersion: string;
    };
}

// generation context
export interface GenerationContext {
    path: string[];
    depth: number;
    index?: number;
    seed?: number;
}
