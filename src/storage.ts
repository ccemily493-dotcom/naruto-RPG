import { Story, StoryMemory, OpenAIConfig, RinDynamicStats } from './types';
import { createDefaultNPCWorld } from './shared/defaults';

const STORAGE_KEY_STORIES = 'naruto_rpg_stories_v1';
const STORAGE_KEY_BACKUP = 'naruto_rpg_backup_v1';
const STORAGE_KEY_ACTIVE_ID = 'naruto_rpg_active_story_id_v1';
const STORAGE_KEY_CONFIG = 'naruto_rpg_config_v1';
const STORAGE_KEY_DRAFT = 'naruto_rpg_draft_v1';
const STORAGE_KEY_LAST_SAVED = 'naruto_rpg_last_saved_timestamp_v1';

export const DEFAULT_OPENAI_CONFIG: OpenAIConfig = {
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.85,
};

export const DEFAULT_RIN_STATS: RinDynamicStats = {
  chakra: {
    primaryCurrent: 1000,
    primaryMax: 1000,
    secondaryCurrent: 300,
    secondaryMax: 300,
    flowState: 'balanced',
  },
  vitality: {
    healthCurrent: 92,
    healthMax: 100,
    fatigueLevel: 'moderate',
    regenArmorActive: false,
  },
  perception: {
    thirdEyeActive: true,
    thirdEyeMode: 'analisis_flujo',
    remoteRangeMeters: 450,
    phantomNodesCount: 4,
    spatialAnchorActive: true,
  },
  mokuton: {
    activeRootsDensity: 60,
    putrefactionCycleActive: false,
    storedBioEnergy: 80,
    explosiveFruits: 4,
    sleepSporesVials: 3,
    clonesActive: 0,
  },
  spiritAllies: {
    kaliSummoned: false,
    kaliSpiritualAbsorption: false,
    kaliAccumulatedInton: 45,
    shivaConditionalSealLocked: true,
  },
  tacticalStatus: {
    location: 'Enclave del Enfrentamiento (Zona de Combate contra Itachi Uchiha)',
    currentThreat:
      'Itachi Uchiha (Incapacitado / Fuera de combate tras el choque con el Susanoo de Kālī)',
    ecosystemHealth: 75,
  },
};

export const INITIAL_DEFAULT_MEMORY: StoryMemory = {
  factual: {
    character: 'Rin',
    village: 'Konohagakure no Sato (Aldea Oculta de la Hoja)',
    clan: 'Investigadora de Chakra / Kekkei Genkai Yūrei no Keimyaku',
    rank: 'Genin (Equipo 7)',
    companions: [
      'Rin (Activa)',
      'Kālī (En reposo tras completar el Susanoo)',
      'Itachi Uchiha (Incapacitado en el suelo)',
    ],
    inventory: [
      'Bolsa táctica con instrumental médico, kunais, shurikens y vendas selladas',
      'Viales de esporas somníferas y semillas de cultivo instantáneo',
      'Pergamino con notas y planos del Ataúd de la Muerte y Ataúd Divino',
      'Residuo de chakra y fragmentos de información física extraídos durante el combate',
    ],
    currentStatus:
      'Combate contra Itachi Uchiha finalizado. Kālī replegó su presencia tras completar el Susanoo e incapacitar a Itachi. Rin permanece en control total del terreno.',
  },
  episodic: [],
  techniques: [],
  relational: [],
  knowledge: { secrets: [], publicKnowledge: [], falseBeliefs: [] },
  world: { currentVillageState: '', activeAlliances: [], timelineDeviations: [] },
  timeline: [],
  atmosphere: undefined,
  npcWorld: createDefaultNPCWorld(),
  journal: undefined,
};

export function createNewStory(title?: string): Story {
  const storyId = 'story_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  const initialStory: Story = {
    id: storyId,
    title: title || 'Capítulo: Conclusión del Encuentro con Itachi',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: 'msg_init_' + now,
        role: 'assistant',
        content: `Turno de Rin.`,
        timestamp: now,
        chapterId: 'chap_1',
      },
    ],
    chapters: [
      {
        id: 'chap_1',
        numberRoman: 'IX',
        title: 'El Silencio tras la Tormenta de Chakra',
        synopsis: 'Itachi Uchiha queda incapacitado tras el choque con el Susanoo de Kālī.',
        messageIdStart: 'msg_init_' + now,
        createdAt: now,
      },
    ],
    memory: structuredClone(INITIAL_DEFAULT_MEMORY),
    rinStats: structuredClone(DEFAULT_RIN_STATS),
    activeChapterId: 'chap_1',
  };

  return initialStory;
}

function ensureStoryRinStats(stories: Story[]): Story[] {
  return stories.map((s) => ({
    ...s,
    rinStats: s.rinStats || structuredClone(DEFAULT_RIN_STATS),
  }));
}

export function loadStories(): Story[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return ensureStoryRinStats(parsed);
      }
    }
    const backupRaw = localStorage.getItem(STORAGE_KEY_BACKUP);
    if (backupRaw) {
      const backupParsed = JSON.parse(backupRaw);
      if (Array.isArray(backupParsed) && backupParsed.length > 0) {
        console.info('Restored stories from automatic backup snapshot');
        const enriched = ensureStoryRinStats(backupParsed);
        saveStories(enriched);
        return enriched;
      }
    }

    const initial = createNewStory();
    saveStories([initial]);
    setActiveStoryId(initial.id);
    return [initial];
  } catch (e) {
    console.error('Error loading stories from localStorage, attempting backup recovery:', e);
    try {
      const backupRaw = localStorage.getItem(STORAGE_KEY_BACKUP);
      if (backupRaw) {
        const backupParsed = JSON.parse(backupRaw);
        if (Array.isArray(backupParsed) && backupParsed.length > 0) {
          return ensureStoryRinStats(backupParsed);
        }
      }
    } catch {
      // ignore
    }
    const fallback = createNewStory();
    return [fallback];
  }
}

export function saveStories(stories: Story[]): boolean {
  if (!stories || !Array.isArray(stories) || stories.length === 0) {
    return false;
  }

  try {
    const serialized = JSON.stringify(stories);
    localStorage.setItem(STORAGE_KEY_STORIES, serialized);
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_LAST_SAVED, String(now));
    try {
      localStorage.setItem(STORAGE_KEY_BACKUP, serialized);
    } catch {
      // ignore backup failure
    }
    return true;
  } catch (e: any) {
    console.error('Error saving stories to localStorage:', e);
    try {
      localStorage.removeItem(STORAGE_KEY_BACKUP);
      localStorage.setItem(STORAGE_KEY_STORIES, JSON.stringify(stories));
      return true;
    } catch {
      return false;
    }
  }
}

export function getLastSavedTimestamp(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SAVED);
    if (raw) {
      const val = parseInt(raw, 10);
      return isNaN(val) ? Date.now() : val;
    }
    return Date.now();
  } catch {
    return Date.now();
  }
}

export function saveActiveDraft(draft: string): void {
  try {
    if (draft.trim()) {
      localStorage.setItem(STORAGE_KEY_DRAFT, draft);
    } else {
      localStorage.removeItem(STORAGE_KEY_DRAFT);
    }
  } catch (e) {
    console.error('Error saving composer draft:', e);
  }
}

export function loadActiveDraft(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_DRAFT) || '';
  } catch {
    return '';
  }
}

export function forceFlushState(stories: Story[], activeStoryId: string, draft?: string): boolean {
  try {
    setActiveStoryId(activeStoryId);
    if (draft !== undefined) {
      saveActiveDraft(draft);
    }
    return saveStories(stories);
  } catch (e) {
    console.error('Error in forceFlushState:', e);
    return false;
  }
}

export function getActiveStoryId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  } catch {
    return null;
  }
}

export function setActiveStoryId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } catch (e) {
    console.error('Error setting active story ID:', e);
  }
}

export function loadOpenAIConfig(): OpenAIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      return { ...DEFAULT_OPENAI_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading OpenAI config:', e);
  }
  return DEFAULT_OPENAI_CONFIG;
}

export function saveOpenAIConfig(config: OpenAIConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving OpenAI config:', e);
  }
}
