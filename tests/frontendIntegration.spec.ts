// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadStories, saveStories, createNewStory, DEFAULT_RIN_STATS } from '../src/storage';
import { parseMessageForChapters } from '../src/utils/chapterParser';

describe('Frontend Integration & Storage Validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. DEFAULT_RIN_STATS reflects canon reserves 1000 primary max and 300 secondary max', () => {
    expect(DEFAULT_RIN_STATS.chakra.primaryMax).toBe(1000);
    expect(DEFAULT_RIN_STATS.chakra.primaryCurrent).toBe(1000);
    expect(DEFAULT_RIN_STATS.chakra.secondaryMax).toBe(300);
    expect(DEFAULT_RIN_STATS.chakra.secondaryCurrent).toBe(300);
  });

  it('2. createNewStory initializes story with canon 1000/300 chakra reserves', () => {
    const story = createNewStory('Nueva Misión de Rin');
    expect(story.title).toBe('Nueva Misión de Rin');
    expect(story.rinStats.chakra.primaryMax).toBe(1000);
    expect(story.rinStats.chakra.secondaryMax).toBe(300);
    expect(story.messages.length).toBeGreaterThan(0);
  });

  it('3. localStorage saves and restores stories cleanly without data loss', () => {
    const story = createNewStory('Historia de Prueba');
    story.rinStats.chakra.primaryCurrent = 850;
    story.rinStats.vitality.fatigueLevel = 'moderate';

    saveStories([story]);
    const restored = loadStories();

    expect(restored.length).toBe(1);
    expect(restored[0].title).toBe('Historia de Prueba');
    expect(restored[0].rinStats.chakra.primaryCurrent).toBe(850);
    expect(restored[0].rinStats.chakra.primaryMax).toBe(1000);
  });

  it('4. parseMessageForChapters detects chapter headers correctly in GM responses', () => {
    const messageContent = `
[[CAPÍTULO: II | El Despertar del Mokuton | Rin despierta su habilidad vegetal]]

Rin siente la vibración de la tierra bajo sus pies mientras el chakra fluye.
    `;

    const parsed = parseMessageForChapters(messageContent);

    expect(parsed.chaptersFound.length).toBe(1);
    expect(parsed.chaptersFound[0].title).toBe('El Despertar del Mokuton');
  });
});
