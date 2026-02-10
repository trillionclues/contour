/**
 * Spec Parser - YAML/JSON parsing
 */

import yaml from 'js-yaml';
import path from 'path';
import type { OpenAPISpec } from '../types/index.js';
import { InvalidSpecError } from '../utils/errors.js';
import { validateSpec } from './validator.js';

export async function parseSpec(content: string, source: string): Promise<OpenAPISpec> {
    const extension = path.extname(source).toLowerCase();


    let parsed: Record<string, unknown>;

    try {
        if (extension === '.json') {
            parsed = JSON.parse(content);
        } else if (extension === '.yaml' || extension === '.yml') {
            parsed = yaml.load(content) as Record<string, unknown>;
        } else {
            // Try JSON first, then YAML
            try {
                parsed = JSON.parse(content);
            } catch {
                parsed = yaml.load(content) as Record<string, unknown>;
            }
        }

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Parsed content is not a valid object');
        }
    } catch (error) {
        throw new InvalidSpecError(
            `Failed to parse spec: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }

    return await validateSpec(parsed);
}
