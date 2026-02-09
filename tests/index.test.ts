import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('Contour', () => {
    it('should have a version', () => {
        expect(VERSION).toBe('0.0.1');
    });
});
