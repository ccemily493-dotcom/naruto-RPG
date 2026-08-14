import { matchSemanticAudio, MatchResult } from './semanticMatcher';

export interface StructuredAudioEvent {
  event: string;
  layer: 'world' | 'atmosphere' | 'music' | 'action' | 'impact';
  material?: string;
  intensity?: number;
  source?: string;
  technique?: string;
  timingOffset?: number;
}

export interface AudioDirectorIntent {
  world: {
    environment: string;
    weather?: string;
    time?: string;
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
  events: StructuredAudioEvent[];
}

export interface AudioDirectorEvaluation {
  intent: AudioDirectorIntent;
  worldMatch: MatchResult;
  atmosphereMatch: MatchResult;
  musicMatch: MatchResult;
  sfxMatches: Array<{ event: StructuredAudioEvent; match: MatchResult }>;
  debug: {
    narrativeTextLength: number;
    isCombat: boolean;
    strategyRequired: boolean;
    rinTechniqueDetected: string | null;
  };
}

/**
 * Audio Director V2:
 * Evaluates narrative text and tactical state to produce structured semantic intents.
 * Maps signature sound flows for Rin's techniques (Mokuton, Kālī, Shiva, Tercer Ojo).
 * Protects Glued State and eliminates random sound assignments.
 */
export function evaluateAudioDirector(
  sceneText: string,
  tacticalContext?: { location?: string; currentThreat?: string; intensity?: 'low' | 'medium' | 'high' }
): AudioDirectorEvaluation {
  const lowerText = sceneText.toLowerCase();

  // 1. Detect Explicit HTML Comment Directives if present: <!-- AUDIO_DIRECTION: {...} -->
  const commentMatch = sceneText.match(/<!--\s*AUDIO_DIRECTION:\s*(\{[\s\S]*?\})\s*-->/i);
  let explicitJSON: any = null;
  if (commentMatch) {
    try {
      explicitJSON = JSON.parse(commentMatch[1]);
    } catch {}
  }

  // 2. Context Analysis
  const isCombat = Boolean(
    tacticalContext?.currentThreat ||
      /combate|enemigo|ataque|herida|sangre|shuriken|duelo|golpe/i.test(lowerText)
  );

  const isStrategyRequired = Boolean(
    /estrategia|plan|trampa|tenketsu|posicionamiento|análisis|análisis táctico|mokuton|sellos/i.test(lowerText)
  );

  // Detect Rin's Iconic Signature Techniques
  let rinTechniqueDetected: string | null = null;
  if (/mokuton|raíz|raíces|brote|madera|ataúd de la muerte|corteza/i.test(lowerText)) {
    rinTechniqueDetected = 'Mokuton';
  } else if (/kālī|kali|susanoo|manos espectrales|manifestación divina/i.test(lowerText)) {
    rinTechniqueDetected = 'Kālī';
  } else if (/tercer ojo|dōjutsu|dojutsu|inton|percepción|keimyaku/i.test(lowerText)) {
    rinTechniqueDetected = 'Tercer Ojo';
  } else if (/shiva|destrucción pura|respiración de ceniza/i.test(lowerText)) {
    rinTechniqueDetected = 'Shiva';
  }

  // 3. Determine World Environment (Layer 1) & Atmosphere (Layer 2)
  let environment = 'forest';
  let weather = 'clear';
  let time = 'day';

  if (/lluvia|tormenta|gotas|trueno/i.test(lowerText)) {
    environment = 'rain';
    weather = 'rain';
  } else if (/cueva|subterráneo|gruta|túnel|guarida/i.test(lowerText)) {
    environment = 'cave';
  } else if (/aldea|konoha|calle|ichiraku/i.test(lowerText)) {
    environment = 'village';
  } else if (/ruinas|templo|escombros/i.test(lowerText)) {
    environment = 'ruins';
  }

  if (/noche|luna|oscuridad|sombras/i.test(lowerText)) {
    time = 'night';
  }

  // 4. Determine Structured SFX Events (Layers 4 & 5)
  const events: StructuredAudioEvent[] = [];

  if (rinTechniqueDetected === 'Mokuton') {
    events.push({
      event: 'wood_growth',
      layer: 'action',
      material: 'wood',
      intensity: 0.8,
      source: 'Rin',
      technique: 'Mokuton',
      timingOffset: 100,
    });
    events.push({
      event: 'wood_impact',
      layer: 'impact',
      material: 'wood',
      intensity: 0.9,
      source: 'Rin',
      technique: 'Mokuton',
      timingOffset: 600,
    });
  } else if (rinTechniqueDetected === 'Kālī') {
    events.push({
      event: 'kali_manifestation',
      layer: 'action',
      material: 'energy',
      intensity: 0.95,
      source: 'Rin',
      technique: 'Kālī',
      timingOffset: 150,
    });
  } else if (rinTechniqueDetected === 'Tercer Ojo') {
    events.push({
      event: 'perception_activation',
      layer: 'action',
      material: 'chakra',
      intensity: 0.7,
      source: 'Rin',
      technique: 'Tercer Ojo',
      timingOffset: 100,
    });
  }

  // Physical Weapons & Actions
  if (/kunai|shuriken|arma|acero|hoja/i.test(lowerText)) {
    events.push({
      event: 'kunai_throw',
      layer: 'action',
      material: 'metal',
      intensity: 0.85,
      source: 'Rin',
      timingOffset: 200,
    });
  }

  if (/impacto|golpe|estruendo|fractura|colisión/i.test(lowerText)) {
    events.push({
      event: 'impact_heavy',
      layer: 'impact',
      material: 'physical',
      intensity: 0.9,
      timingOffset: 450,
    });
  }

  // 5. Determine Music Intent (Layer 3) with Strict Glued State Protection
  let musicTrackKey = 'rin_theme_ambient';
  if (isCombat && isStrategyRequired) {
    musicTrackKey = 'glued_state';
  } else if (isCombat) {
    musicTrackKey = 'confrontment';
  } else if (/tensión|peligro|acecho/i.test(lowerText)) {
    musicTrackKey = 'nervous';
  }

  const intent: AudioDirectorIntent = explicitJSON || {
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
  };

  // 6. Perform Semantic Matching across all 5 Layers
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

  const sfxMatches = intent.events.map((ev) => ({
    event: ev,
    match: matchSemanticAudio({
      event: ev.event,
      layer: ev.layer,
      material: ev.material,
      intensity: ev.intensity,
      combat: isCombat,
    }),
  }));

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
