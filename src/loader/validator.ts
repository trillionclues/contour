
import type { OpenAPISpec } from '../types/index.js';
import { InvalidSpecError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Dynamic import for swagger2openapi (CommonJS module)
let convertObj: any;

async function loadConverter() {
    if (!convertObj) {
        try {
            const swagger2openapi = await import('swagger2openapi');
            convertObj = swagger2openapi.convertObj;
        } catch (error) {
            throw new InvalidSpecError(
                'Failed to load Swagger 2.0 converter. ' +
                'Install it with: pnpm add swagger2openapi'
            );
        }
    }
    return convertObj;
}

export async function validateSpec(spec: Record<string, unknown>): Promise<OpenAPISpec> {
    const swagger = spec.swagger as string | undefined;

    if (swagger === '2.0') {
        logger.info('📦 Detected Swagger 2.0, converting to OpenAPI 3.x...');
        spec = await convertSwagger2ToOpenAPI3(spec);
        logger.info('✓ Conversion complete');
    }

    const version = spec.openapi as string | undefined;

    if (!version) {
        throw new InvalidSpecError('Missing "openapi" field. Is this a valid OpenAPI spec?');
    }

    if (!version.startsWith('3.')) {
        throw new InvalidSpecError(
            `Unsupported OpenAPI version: ${version}. Supported: 3.0.x, 3.1.x`
        );
    }

    if (!spec.info || typeof spec.info !== 'object') {
        throw new InvalidSpecError('Missing required "info" field');
    }

    const info = spec.info as Record<string, unknown>;
    if (!info.title) {
        throw new InvalidSpecError('Missing required "info.title" field');
    }
    if (!info.version) {
        throw new InvalidSpecError('Missing required "info.version" field');
    }

    if (!spec.paths || typeof spec.paths !== 'object') {
        throw new InvalidSpecError('Missing required "paths" field');
    }

    return spec as unknown as OpenAPISpec;
}

async function convertSwagger2ToOpenAPI3(
    swagger2Spec: Record<string, unknown>
): Promise<Record<string, unknown>> {
    try {
        const converter = await loadConverter();

        const result = await converter(swagger2Spec, {
            patch: true,
            warnOnly: true,
            anchors: true,
        });

        // swagger2openapi returns { openapi: <converted spec> }
        if (!result.openapi) {
            throw new Error('Conversion did not produce an OpenAPI spec');
        }

        logger.debug('Swagger 2.0 conversion details', {
            originalVersion: swagger2Spec.swagger,
            convertedVersion: result.openapi.openapi,
            pathCount: Object.keys(result.openapi.paths || {}).length,
        });

        return result.openapi;
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown conversion error';

        throw new InvalidSpecError(
            `Failed to convert Swagger 2.0 to OpenAPI 3.x:\n\n` +
            `  ${errorMessage}\n\n` +
            `Common issues:\n` +
            `  • Spec may have invalid Swagger 2.0 syntax\n` +
            `  • Some features may not be supported\n` +
            `  • Try validating your spec at: https://editor.swagger.io/\n\n` +
            `If the issue persists, please provide the spec URL directly:\n` +
            `  contour start <url-to-openapi-3-spec>`
        );
    }
}

export function getOpenAPIVersion(spec: OpenAPISpec): '3.0' | '3.1' {
    if (spec.openapi.startsWith('3.1')) return '3.1';
    return '3.0';
}

export function isSwagger2(spec: Record<string, unknown>): boolean {
    return spec.swagger === '2.0';
}