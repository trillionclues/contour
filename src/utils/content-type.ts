// Content-Type Resolution Utility
// Resolves content entry from OpenAPI response/request content maps.
// Handles specs that use */* or other media types instead of application/json.

import type { MediaType } from '../types/index.js';

export function resolveJsonContent(
    content: Record<string, MediaType> | undefined
): MediaType | undefined {
    if (!content) return undefined;

    if (content['application/json']) return content['application/json'];
    if (content['*/*']) return content['*/*'];

    // Fallback: first available content type
    const firstKey = Object.keys(content)[0];
    return firstKey ? content[firstKey] : undefined;
}
