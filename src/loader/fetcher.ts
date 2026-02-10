// Remote Spec Fetcher

import axios from 'axios';
import type { OpenAPISpec } from '../types/index.js';
import { NetworkError } from '../utils/errors.js';
import { generateCacheKey, getCachedSpec, cacheSpec } from './cache.js';
import { parseSpec } from './parser.js';
import { logger } from '../utils/logger.js';

const MAX_SPEC_SIZE = 10 * 1024 * 1024; // 10MB
const TIMEOUT = 10000; // 10 seconds

export async function fetchFromURL(url: string): Promise<OpenAPISpec> {
    // Detect if Swagger UI
    if (isSwaggerUIPage(url)) {
        logger.info('> Detected Swagger UI page, extracting spec URL...');
        url = await extractSpecFromSwaggerUI(url);
        logger.info(`✓ Found spec URL: ${url}`);
    }

    const cacheKey = generateCacheKey(url);

    // Check cache
    const cached = await getCachedSpec(cacheKey);
    if (cached) {
        logger.debug('Using cached spec', { url, age: cached.age });
        return cached.data;
    }

    logger.debug('Fetching spec from URL', { url });

    try {
        const response = await axios.get(url, {
            timeout: TIMEOUT,
            maxContentLength: MAX_SPEC_SIZE,
            headers: {
                'User-Agent': 'Contour/1.0.0',
                Accept: 'application/json, application/yaml, text/yaml, */*',
            },
            responseType: 'text',
        });

        const spec = await parseSpec(response.data, url);

        await cacheSpec(cacheKey, url, spec);

        return spec;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                throw new NetworkError(url, 'Request timeout');
            }
            if (error.response) {
                throw new NetworkError(url, `HTTP ${error.response.status}`);
            }
            throw new NetworkError(url, error.message);
        }
        throw error;
    }
}


function isSwaggerUIPage(url: string): boolean {
    const normalizedUrl = url.toLowerCase();
    return (
        normalizedUrl.includes('/swagger-ui') ||
        normalizedUrl.includes('swagger-ui.html') ||
        normalizedUrl.includes('/swagger-ui/') ||
        normalizedUrl.endsWith('/swagger-ui')
    );
}

// Extract actual OpenAPI spec URL from Swagger UI page
async function extractSpecFromSwaggerUI(swaggerUIUrl: string): Promise<string> {
    const baseUrl = getBaseUrl(swaggerUIUrl);

    const specUrl = await tryCommonSpecLocations(baseUrl);
    if (specUrl) {
        return specUrl;
    }

    const parsedUrl = await parseSpecUrlFromSwaggerUI(swaggerUIUrl, baseUrl);
    if (parsedUrl) {
        return parsedUrl;
    }

    // If all else fails, throw error
    throw new NetworkError(
        swaggerUIUrl,
        'Could not locate OpenAPI spec.\n\n' +
        'Tried common locations:\n' +
        '  • /v3/api-docs\n' +
        '  • /v2/api-docs\n' +
        '  • /swagger.json\n' +
        '  • /openapi.json\n\n' +
        'Suggestion:\n' +
        `  Try accessing the spec directly:\n` +
        `  • ${baseUrl}/v3/api-docs\n` +
        `  • ${baseUrl}/v2/api-docs\n\n` +
        '  Or check your Swagger UI page for the spec URL.'
    );
}

// Get base URL from Swagger UI URL
function getBaseUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        const match = url.match(/^(https?:\/\/[^/]+)/);
        return match ? match[1] : url;
    }
}

async function tryCommonSpecLocations(baseUrl: string): Promise<string | null> {
    const commonPaths = [
        '/v3/api-docs', // Spring Boot 3.x (OpenAPI 3.x)
        '/v2/api-docs', // Spring Boot 2.x (Swagger 2.0)
        '/swagger.json', // Common generic location
        '/openapi.json', // OpenAPI 3.x
        '/api-docs', // Generic fallback
        '/swagger/v1/swagger.json', // .NET/Swashbuckle
        '/swagger/v2/swagger.json', // .NET/Swashbuckle v2
        '/api/swagger.json', // Alternative common location
        '/docs/swagger.json', // Alternative docs location
    ];

    for (const path of commonPaths) {
        const specUrl = `${baseUrl}${path}`;

        try {
            logger.debug(`  Trying: ${specUrl}`);

            const response = await axios.head(specUrl, {
                timeout: 5000,
                validateStatus: (status) => status === 200,
            });

            if (response.status === 200) {
                logger.debug(`  ✓ Found spec at: ${specUrl}`);
                return specUrl;
            }
        } catch (error) {
            logger.debug(`  ✗ Not found: ${specUrl}`);
            continue;
        }
    }

    return null;
}

async function parseSpecUrlFromSwaggerUI(
    swaggerUIUrl: string,
    baseUrl: string
): Promise<string | null> {
    try {
        logger.debug('Parsing Swagger UI HTML for spec URL...');

        const response = await axios.get(swaggerUIUrl, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Contour/1.0.0',
            },
        });

        const html = response.data;

        const patterns = [
            // Pattern 1: url: "..." in JavaScript
            /url\s*:\s*["']([^"']+)["']/i,

            // Pattern 2: "url":"..." in JSON config
            /"url"\s*:\s*["']([^"']+)["']/i,

            // Pattern 3: configUrl or spec-url parameter
            /(?:configUrl|spec-url)\s*[:=]\s*["']([^"']+)["']/i,

            // Pattern 4: SwaggerUIBundle url parameter
            /SwaggerUIBundle\s*\(\s*\{[^}]*url\s*:\s*["']([^"']+)["']/i,

            // Pattern 5: Query parameter ?url=...
            /\?url=([^&"']+)/i,
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);

            if (match && match[1]) {
                const specPath = match[1];
                const absoluteUrl = makeAbsoluteUrl(specPath, baseUrl);

                logger.debug(`  Found spec URL in HTML: ${absoluteUrl}`);
                return absoluteUrl;
            }
        }

        logger.debug('  No spec URL found in HTML');
        return null;
    } catch (error) {
        logger.debug('Failed to parse Swagger UI HTML', { error });
        return null;
    }
}


function makeAbsoluteUrl(specPath: string, baseUrl: string): string {
    if (specPath.startsWith('http://') || specPath.startsWith('https://')) {
        return specPath;
    }

    if (specPath.startsWith('/')) {
        return `${baseUrl}${specPath}`;
    }

    return `${baseUrl}/${specPath}`;
}