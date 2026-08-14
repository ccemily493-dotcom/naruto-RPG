import { describe, it, expect } from 'vitest';
import { parseMessageForChapters } from '../src/utils/chapterParser';

describe('chapter parser', () => {
  it('finds chapter tags in text', () => {
    const sample = 'Some intro text\n[[CAPÍTULO: X | Title | synopsis]]\nMore text';
    const { chaptersFound } = parseMessageForChapters(sample);
    expect(Array.isArray(chaptersFound)).toBe(true);
    expect(chaptersFound.length).toBeGreaterThanOrEqual(1);
    expect(chaptersFound[0].title).toContain('Title');
  });
});
