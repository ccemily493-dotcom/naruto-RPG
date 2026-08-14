import { matchSemanticAudio, MatchResult } from './semanticMatcher';
import { executeSFXOrchestration, SFXGenerateResult } from './sfxProvider';

export interface AISFXEvent {
  id: string;
  type: 'action' | 'impact';
  event: string;
  description: string;
  subject?: string;
  object?: string;
  material?: string;
  technique?: string;
  intensity: number; // 0.0 to 1.0
  priority: 'low' | 'medium' | 'high' | 'critical';
  timing: {
    paragraph: number;
    offsetMs: number;
    position: 'before_action' | 'during_action' | 'after_action' | 'on_impact';
  };
}

export interface AIAudioDirectorIntent {
  sceneType: 'peaceful' | 'exploration' | 'training' | 'mystery' | 'tension' | 'combat' | 'strategic_combat' | 'boss_combat';
  world: {
    environment: string;
    weather: string;
    time: string;
    intensity: number;
  };
  atmosphere: {
    detail: string;
    intensity: number;
  };
  music: {
    trackKey: string;
    intensity: number;
    combat: boolean;
    strategyRequired: boolean;
    transition: 'continue' | 'crossfade' | 'fade_in' | 'fade_out';
  };
  events: AISFXEvent[];
  reason?: string;
}

export interface AIAudioDirectorEvaluation {
  intent: AIAudioDirectorIntent;
  worldMatch: MatchResult;
  atmosphereMatch: MatchResult;
  musicMatch: MatchResult;
  sfxMatches: Array<{
    event: AISFXEvent;
    match: MatchResult;
    generatedResult?: SFXGenerateResult;
  }>;
  debug: {
    narrativeTextLength: number;
    isCombat: boolean;
    strategyRequired: boolean;
    rinTechniqueDetected: string | null;
  };
}

/**
 * AI Audio Director V4:
 * Interprets full narrative context before making sound decisions.
 * Distinguishes passive looks ("Rin mira el kunai") from real physical actions ("Rin lanza un kunai").
 * Enforces NO SFX for passive mentions and strict Glued State protection for strategic combat.
 */
export async function evaluateAIAudioDirector(
  sceneText: string,
  tacticalContext?: { location?: string; currentThreat?: string; intensity?: 'low' | 'medium' | 'high' }
): Promise<AIAudioDirectorEvaluation> {
  const lowerText = sceneText.toLowerCase();

  // 1. Detect Explicit HTML comment directive if LLM inserted one
  const commentMatch = sceneText.match(/<!--\s*AUDIO_DIRECTION:\s*(\{[\s\S]*?\})\s*-->/i);
  let explicitJSON: any = null;
  if (commentMatch) {
    try {
      explicitJSON = JSON.parse(commentMatch[1]);
    } catch {}
  }

  // 2. Semantic Context Analysis
  const isCombat = Boolean(
    tacticalContext?.currentThreat ||
      /combate|enfrentamiento|ataque hostil|herida sangrienta|batalla mortal/i.test(lowerText)
  );

  const isStrategyRequired = Boolean(
    /análisis táctico|red de tenketsu|trampas de sellos|posicionamiento estratégico|plan de contingencia/i.test(lowerText)
  );

  // Scene Type Classification (9 Types)
  let sceneType: AIAudioDirectorIntent['sceneType'] = 'peaceful';
  if (isCombat && isStrategyRequired) {
    sceneType = 'strategic_combat';
  } else if (isCombat) {
    sceneType = 'combat';
  } else if (/peligro inminente|amenaza en las sombras|acecho/i.test(lowerText)) {
    sceneType = 'tension';
  } else if (/entrenamiento|práctica|ejercicio/i.test(lowerText)) {
    sceneType = 'training';
  } else if (/misterio|revelación|secreto/i.test(lowerText)) {
    sceneType = 'mystery';
  } else if (/exploración|recorrido|camino/i.test(lowerText)) {
    sceneType = 'exploration';
  }

  // Detect Rin's Iconic Signature Techniques
  let rinTechniqueDetected: string | null = null;
  if (/espora somnífera|nube de esporas/i.test(lowerText)) {
    rinTechniqueDetected = 'Espora Somnífera';
  } else if (/fruto explosivo|detonación vegetal/i.test(lowerText)) {
    rinTechniqueDetected = 'Fruto Explosivo';
  } else if (/tercer ojo|percepción sensorial/i.test(lowerText)) {
    rinTechniqueDetected = 'Tercer Ojo';
  } else if (/inton|resonancia espiritual/i.test(lowerText)) {
    rinTechniqueDetected = 'Inton';
  } else if (/kālī|kali|manos espectrales/i.test(lowerText)) {
    rinTechniqueDetected = 'Kālī';
  } else if (/shiva|destrucción pura/i.test(lowerText)) {
    rinTechniqueDetected = 'Shiva';
  } else if (/ataúd de la muerte|cercado de madera/i.test(lowerText)) {
    rinTechniqueDetected = 'Ataúd de la Muerte';
  } else if (/ataúd divino|reconstrucción biológica/i.test(lowerText)) {
    rinTechniqueDetected = 'Ataúd Divino';
  } else if (/mokuton|raíces|madera emergiendo/i.test(lowerText)) {
    rinTechniqueDetected = 'Mokuton';
  }

  // 3. Determine World Environment & Atmosphere
  let environment = 'forest';
  let weather = 'clear';
  let time = 'day';

  if (/lluvia|tormenta|llueve|trueno/i.test(lowerText)) {
    environment = 'rain';
    weather = 'rain';
  } else if (/cueva|subterráneo|gruta/i.test(lowerText)) {
    environment = 'cave';
  } else if (/aldea|konoha|calle/i.test(lowerText)) {
    environment = 'village';
  } else if (/ruinas|escombros/i.test(lowerText)) {
    environment = 'ruins';
  }

  if (/noche|luna|oscuridad/i.test(lowerText)) {
    time = 'night';
  }

  // 4. Semantic Action Extraction (PASSIVITY CHECK - Mandatory Test Requirement)
  const events: AISFXEvent[] = [];
  let reason = 'semantic_action_evaluation_complete';

  // PASSIVITY RULE: "Rin mira un kunai" / "Rin sostiene un kunai" -> NO SFX GENERATED!
  const isPassiveLookOnly =
    /mira|observa|sostiene|sosteniendo|evalúa|examina|revisa/i.test(lowerText) &&
    !/lanza|arroja|ataca|clava|golpea|dispara|impacta|emergen|brotan|choca/i.test(lowerText);

  if (isPassiveLookOnly) {
    reason = 'object_mentioned_but_no_audio_action';
  } else {
    // Active Throwing / Weapon Usage
    if (/lanza|arroja|ataca con kunai|clava kunai|dispara kunai/i.test(lowerText)) {
      events.push({
        id: 'sfx_kunai_throw',
        type: 'action',
        event: 'kunai_throw',
        description: 'Short cinematic game foley. Sharp steel projectile rapidly slicing through air. Clean transient, fast movement, dry recording, no music, no ambience, no voice.',
        subject: 'Rin',
        object: 'kunai',
        material: 'metal',
        intensity: 0.85,
        priority: 'high',
        timing: { paragraph: 1, offsetMs: 200, position: 'during_action' },
      });
    }

    // Impact
    if (/impacta|golpea|clava en el tronco|golpea madera|choca contra|estruendo/i.test(lowerText)) {
      events.push({
        id: 'sfx_metal_wood_impact',
        type: 'impact',
        event: 'metal_wood_impact',
        description: 'Heavy cinematic game impact foley. Sharp steel kunai blade violently slamming and embedding into hard wooden tree trunk, solid wood resonance, dry recording, no music.',
        subject: 'kunai',
        object: 'wood_trunk',
        material: 'metal_wood',
        intensity: 0.9,
        priority: 'critical',
        timing: { paragraph: 1, offsetMs: 800, position: 'on_impact' },
      });
    }

    // Rin Signature Techniques
    if (rinTechniqueDetected === 'Mokuton') {
      if (/emergen|brotan|crecen|brote/i.test(lowerText)) {
        events.push({
          id: 'sfx_wood_root_growth',
          type: 'action',
          event: 'wood_root_growth',
          description: 'Organic supernatural wood growth. Thick roots rapidly emerging from soil, fibrous wood cracking and stretching, deep organic creaks, short cinematic game SFX, no music, no voice.',
          subject: 'Rin',
          material: 'wood',
          technique: 'Mokuton',
          intensity: 0.85,
          priority: 'high',
          timing: { paragraph: 1, offsetMs: 300, position: 'during_action' },
        });
      }

      if (/aprisionan|atrapan|rodean/i.test(lowerText)) {
        events.push({
          id: 'sfx_wood_bind',
          type: 'action',
          event: 'wood_bind',
          description: 'supernatural wooden roots tightly constricting and binding target body',
          subject: 'Rin',
          material: 'wood',
          technique: 'Mokuton',
          intensity: 0.8,
          priority: 'high',
          timing: { paragraph: 1, offsetMs: 1200, position: 'after_action' },
        });
      }

      if (/golpean|impactan|destrozan/i.test(lowerText)) {
        events.push({
          id: 'sfx_wood_impact',
          type: 'impact',
          event: 'wood_impact',
          description: 'heavy massive wooden root slamming violently into target',
          subject: 'Rin',
          material: 'wood',
          technique: 'Mokuton',
          intensity: 0.95,
          priority: 'critical',
          timing: { paragraph: 1, offsetMs: 2200, position: 'on_impact' },
        });
      }
    } else if (/concentra chakra|acumula chakra|chakra azul/i.test(lowerText) && !rinTechniqueDetected) {
      events.push({
        id: 'sfx_chakra_charge',
        type: 'action',
        event: 'chakra_charge',
        description: 'Supernatural energy charging. Low resonant chakra hum gradually increasing, subtle vibrating energy pulse, short cinematic game SFX, no voice, no music.',
        subject: 'Rin',
        material: 'energy',
        intensity: 0.6,
        priority: 'medium',
        timing: { paragraph: 1, offsetMs: 100, position: 'during_action' },
      });
    }
  }

  // 5. Music Intent with Strict Glued State Protection
  let musicTrackKey = 'rin_theme_ambient';
  if (sceneType === 'strategic_combat') {
    musicTrackKey = 'glued_state';
  } else if (sceneType === 'combat' || (sceneType as string) === 'boss_combat') {
    musicTrackKey = 'confrontment';
  } else if (sceneType === 'tension') {
    musicTrackKey = 'nervous';
  }

  const intent: AIAudioDirectorIntent = explicitJSON || {
    sceneType,
    world: { environment, weather, time, intensity: 0.4 },
    atmosphere: { detail: time === 'night' ? 'insects' : 'leaves', intensity: 0.3 },
    music: {
      trackKey: musicTrackKey,
      intensity: isCombat ? 0.8 : 0.4,
      combat: isCombat,
      strategyRequired: isStrategyRequired,
      transition: 'crossfade',
    },
    events,
    reason,
  };

  // 6. Execute Provider Chain for all Events
  const worldMatch = matchSemanticAudio({
    event: intent.world.environment,
    layer: 'world',
    material: 'nature',
    combat: isCombat,
  });

  const atmosphereMatch = matchSemanticAudio({
    event: intent.atmosphere.detail,
    layer: 'atmosphere',
    material: 'nature',
  });

  const musicMatch = matchSemanticAudio({
    event: intent.music.trackKey,
    layer: 'music',
    combat: intent.music.combat,
    strategyRequired: intent.music.strategyRequired,
  });

  const sfxMatches: Array<{ event: AISFXEvent; match: MatchResult; generatedResult?: SFXGenerateResult }> = [];

  for (const ev of intent.events) {
    const match = matchSemanticAudio({
      event: ev.event,
      layer: ev.type,
      material: ev.material,
      intensity: ev.intensity,
      combat: isCombat,
    });

    const generatedResult = await executeSFXOrchestration(ev.description, {
      type: ev.type,
      event: ev.event,
      material: ev.material,
      intensity: ev.intensity,
      context: sceneText,
    });

    sfxMatches.push({ event: ev, match, generatedResult });
  }

  return {
    intent,
    worldMatch,
    atmosphereMatch,
    musicMatch,
    sfxMatches,
    debug: {
      narrativeTextLength: sceneText.length,
      isCombat,
      strategyRequired: isStrategyRequired,
      rinTechniqueDetected,
    },
  };
}
