import { describe, it, expect, beforeEach } from 'vitest';
import { createNewStory, saveStories, loadStories } from '../src/storage';

beforeEach(() => {
  // reset localStorage
  localStorage.clear();
});

describe('storage basic behavior', () => {
  it('saves and loads stories', () => {
    const s = createNewStory('Test');
    const ok = saveStories([s]);
    expect(ok).toBe(true);
    const loaded = loadStories();
    expect(loaded.length).toBeGreaterThan(0);
    expect(loaded[0].title).toBeTruthy();
  });

  it('recovers from backup when main key missing', () => {
    const s = createNewStory('BackupTest');
    // Simulate valid backup and missing primary
    localStorage.removeItem('naruto_rpg_stories_v1');
    localStorage.setItem('naruto_rpg_backup_v1', JSON.stringify([s]));
    const loaded = loadStories();
    expect(loaded.length).toBeGreaterThan(0);
    expect(loaded[0].title).toContain('BackupTest');
  });
});
