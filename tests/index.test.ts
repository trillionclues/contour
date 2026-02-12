import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

describe('Contour', () => {
    it('should have a version matching package.json', () => {
        expect(VERSION).toBe(pkg.version);
    });
});
