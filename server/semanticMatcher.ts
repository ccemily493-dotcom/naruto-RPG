import fs from 'fs';
import path from 'path';

export interface ManifestItem {
  id: string;
  file: string;
  title: string;
  artist: string;
  category: string;
  layer: 'world' | 'atmosphere' | 'music' | 'action' | 'impact' | 'ui';
  events: string[];
  materials: string[];
  intensity: 'low' | 'medium' | 'high' | string;
  duration: number;
  combat: boolean;
  tags: string[];
}

export interface MatchQuery {
  event: string;
  layer: 'world' | 'atmosphere' | 'music' | 'action' | 'impact';
  material?: string;
  intensity?: number;
  combat?: boolean;
  strategyRequired?: boolean;
}

export interface MatchResult {
  matchedItem: ManifestItem | null;
  confidence: number; // 0 to 100
  reason: string;
  query: MatchQuery;
}

let cachedManifest: ManifestItem[] | null = null;

export function getAudioManifest(): ManifestItem[] {
  if (cachedManifest) return cachedManifest;
  const manifestPath = path.join(process.cwd(), 'data', 'audio_manifest.json');
  try {
    if (fs.existsSync(manifestPath)) {
      cachedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return cachedManifest!;
    }
  } catch (err) {
    console.error('[SemanticMatcher] Error reading audio_manifest.json:', err);
  }
  return [];
}

/**
 * Semantic Matcher V2:
 * Evaluates event + material + intensity + combat context.
 * Strict Confidence Threshold (>= 50 pts).
 * NO library[0] FALLBACK EVER. Returns null if no compatible resource exists.
 */
export function matchSemanticAudio(query: MatchQuery): MatchResult {
  const manifest = getAudioManifest();

  // Strict Rule for Glued State: ONLY if combat = true AND strategyRequired = true
  if (query.event === 'glued_state' || query.event === 'strategic_combat') {
    if (!query.combat || !query.strategyRequired) {
      const alternativeAmbient = manifest.find(
        (m) => m.layer === 'music' && !m.combat && (m.category === 'ambient' || m.id.includes('rin_meditation'))
      );
      return {
        matchedItem: alternativeAmbient || null,
        confidence: alternativeAmbient ? 75 : 0,
        reason: 'Glued State protegido: Escena pacífica sin combate estratégico. Se aplica música ambiental.',
        query,
      };
    }
  }

  let bestCandidate: ManifestItem | null = null;
  let highestScore = 0;
  let matchReason = '';

  for (const item of manifest) {
    // Ignore UI sounds for narrative action/music/environment layers
    if (item.layer === 'ui' && query.layer !== 'impact') continue;

    let score = 0;

    // 1. Layer Match (15 pts)
    if (item.layer === query.layer) {
      score += 15;
    }

    // 2. Direct Event Match (45 pts)
    const eventMatch = item.events.some(
      (e) => e.toLowerCase() === query.event.toLowerCase() || e.toLowerCase().includes(query.event.toLowerCase())
    );
    const idMatch = item.id.toLowerCase().includes(query.event.toLowerCase());
    if (eventMatch || idMatch) {
      score += 45;
    }

    // 3. Material Compatibility (25 pts)
    if (query.material && item.materials.some((m) => m.toLowerCase() === query.material!.toLowerCase())) {
      score += 25;
    }

    // 4. Combat Context Alignment (15 pts)
    if (query.combat !== undefined && item.combat === query.combat) {
      score += 15;
    }

    if (score > highestScore) {
      highestScore = score;
      bestCandidate = item;
      matchReason = `Coincidencia semántica: Evento [${query.event}], Capa [${query.layer}], Material [${query.material || 'N/A'}]. Puntuación: ${score} pts.`;
    }
  }

  // Strict Confidence Threshold: Minimum 50 pts required.
  // NEVER RETURN library[0] RANDOM FALLBACK.
  if (highestScore < 50 || !bestCandidate) {
    return {
      matchedItem: null,
      confidence: highestScore,
      reason: `NO_COMPATIBLE_RESOURCE: Sin recurso que cumpla con los requisitos semánticos para '${query.event}'. Se prefiere silencio acústico en esta capa.`,
      query,
    };
  }

  return {
    matchedItem: bestCandidate,
    confidence: Math.min(100, highestScore),
    reason: matchReason,
    query,
  };
}
