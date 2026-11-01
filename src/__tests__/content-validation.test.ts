import { validateAllContent } from '../domain/content-validator';
import path from 'node:path';

describe('Content Validation Suite (doc 09 §2)', () => {
  it('validates all bundled content files against schema and rules', () => {
    const contentDir = path.resolve(__dirname, '../db/seed/content');
    const result = validateAllContent(contentDir);

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
    expect(result.filesCount).toBe(6);
    expect(result.totalItemsCount).toBe(257);

    // Verify all 6 required libraries
    expect(result.countsByType['lesson']).toBe(30);
    expect(result.countsByType['article']).toBe(20);
    expect(result.countsByType['exercise']).toBe(12);
    expect(result.countsByType['slip_message']).toBe(15);
    expect(result.countsByType['tip']).toBe(60);
    expect(result.countsByType['quote']).toBe(120);
  });
});
