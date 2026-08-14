import { NPCMemoryEntry, NPCMemoryType, NPCProfile } from '../../src/types';

/**
 * NPC Memory AI
 * Manages tiered memory storage (Episodic, Factual, Social, Private),
 * emotional weighting, decay over time, and context-relevant recall.
 */

export function createNPCMemory(
  event: string,
  type: NPCMemoryType,
  location: string,
  participants: string[],
  chapter: string,
  emotionalSignificance: number,
  importance: 'minor' | 'moderate' | 'significant' | 'critical',
  informationLearned: string[] = [],
  consequences: string[] = []
): NPCMemoryEntry {
  return {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    event,
    participants,
    location,
    chapter,
    emotionalSignificance: Math.max(0, Math.min(1, emotionalSignificance)),
    informationLearned,
    consequences,
    importance,
    decayFactor: 1.0,
    timestamp: Date.now(),
  };
}

export function recallRelevantMemories(
  npc: NPCProfile,
  queryContext: string,
  maxResults = 4
): NPCMemoryEntry[] {
  if (!npc.memories || npc.memories.length === 0) return [];

  const queryLower = queryContext.toLowerCase();

  // Score memories based on relevance, emotional significance, and freshness
  const scored = npc.memories.map((mem) => {
    let relevance = 0;
    const text = `${mem.event} ${mem.location} ${mem.participants.join(' ')} ${mem.informationLearned.join(' ')}`.toLowerCase();

    // Check keyword overlap
    const keywords = queryLower.split(/\s+/).filter((w) => w.length > 3);
    for (const kw of keywords) {
      if (text.includes(kw)) relevance += 2;
    }

    const decay = mem.decayFactor ?? 1.0;
    const score = (relevance + mem.emotionalSignificance * 3) * decay;

    return { mem, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((item) => item.score > 0.5)
    .slice(0, maxResults)
    .map((item) => item.mem);
}

export function applyMemoryDecay(memories: NPCMemoryEntry[], timePassedDays = 1): NPCMemoryEntry[] {
  return memories
    .map((mem) => {
      // Critical memories decay much slower
      const decayRate = mem.importance === 'critical' ? 0.01 : mem.importance === 'significant' ? 0.05 : 0.15;
      const newDecay = Math.max(0, (mem.decayFactor ?? 1.0) - decayRate * timePassedDays);
      return { ...mem, decayFactor: Math.round(newDecay * 100) / 100 };
    })
    .filter((mem) => (mem.decayFactor ?? 1.0) > 0.1); // Forget completely faded minor memories
}
