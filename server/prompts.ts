import fs from 'fs';
import path from 'path';
import { StoryMemory, RinDynamicStats, Chapter } from '../src/types';

const PROMPT_DIR = path.join(process.cwd(), 'prompts');

function readPromptFile(filename: string): string {
  try {
    const fullPath = path.join(PROMPT_DIR, filename);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
  } catch (err) {
    console.error(`Failed to read prompt file: ${filename}`, err);
  }
  return '';
}

export interface PromptContextParams {
  memory?: StoryMemory;
  rinStats?: RinDynamicStats;
  chapters?: Chapter[];
  storyTitle?: string;
  npcContext?: string;
}

export function buildSystemPrompt(params?: StoryMemory | PromptContextParams): string {
  // Support both legacy StoryMemory passing and new PromptContextParams object
  let memory: StoryMemory | undefined;
  let rinStats: RinDynamicStats | undefined;
  let chapters: Chapter[] | undefined;
  let storyTitle: string | undefined;
  let npcContext: string | undefined;

  if (params && ('episodic' in params || 'factual' in params || 'techniques' in params)) {
    memory = params as StoryMemory;
  } else if (params && typeof params === 'object') {
    const p = params as PromptContextParams;
    memory = p.memory;
    rinStats = p.rinStats;
    chapters = p.chapters;
    storyTitle = p.storyTitle;
    npcContext = p.npcContext;
  }

  const rinBible = readPromptFile('rin_bible.md');
  const continuity = readPromptFile('continuity.md');
  const core = readPromptFile('core.md');
  const narrative = readPromptFile('narrative.md');
  const canon = readPromptFile('canon.md');
  const realism = readPromptFile('realism.md');
  const npc = readPromptFile('npc.md');
  const combat = readPromptFile('combat.md');
  const memoryDoc = readPromptFile('memory.md');
  const chaptersDoc = readPromptFile('chapters.md');
  const consequences = readPromptFile('consequences.md');
  const audioDirection = readPromptFile('audio_direction.md');
  const cozy = readPromptFile('cozy.md');

  // Build LAST_ROLLPLAY_STATE block
  const latestChapter = chapters && chapters.length > 0 ? chapters[chapters.length - 1] : undefined;
  const chapterName = latestChapter ? `Capítulo ${latestChapter.numberRoman}: ${latestChapter.title}` : 'Capítulo Activo';

  const episodicStr = memory?.episodic && memory.episodic.length > 0
    ? memory.episodic.slice(-8).map(e => `- [${new Date(e.timestamp).toLocaleTimeString()}] ${e.event}`).join('\n')
    : 'Inicio de la partida / Sin eventos previos registrados.';

  const techniquesStr = memory?.techniques && memory.techniques.length > 0
    ? memory.techniques.map(t => `- ${t.name} (${t.type}) — Dominio/Estado: ${t.mastery}${t.notes ? ` [${t.notes}]` : ''}`).join('\n')
    : '- Jutsus básicos de academia (Kawarimi, Bunshin básico, Henge).\n- Mokuton / Yūrei no Keimyaku en fase inicial según el progreso de la partida.';

  const relationsStr = memory?.relational && memory.relational.length > 0
    ? memory.relational.map(r => `- ${r.targetName}: ${r.relationship} (Actitud percibida: ${r.attitude})`).join('\n')
    : 'Sin relaciones o sospechas registradas en este momento.';

  const timelineStr = memory?.timeline && memory.timeline.length > 0
    ? memory.timeline.slice(-6).map(tl => `- ${tl.time}: ${tl.description}`).join('\n')
    : 'Línea temporal en su punto de partida.';

  const deviationsStr = memory?.world?.timelineDeviations && memory.world.timelineDeviations.length > 0
    ? memory.world.timelineDeviations.map(d => `- ${d}`).join('\n')
    : 'Canon estándar en este momento.';

  // Atmosphere & Cozy Layer context
  const atmosphereStr = memory?.atmosphere
    ? `- MOMENTO DEL DÍA: ${(memory.atmosphere.timeOfDay || '').toUpperCase()} | CLIMA: ${(memory.atmosphere.weather || '').toUpperCase()}
- UBICACIÓN Y AMBIENTE: ${memory.atmosphere.locationName} (${memory.atmosphere.moodDescription})
- PAISAJE SONORO / ACÚSTICO: ${memory.atmosphere.acousticDetails}`
    : '- ATMÓSFERA: Tarde templada en Konohagakure; ambiente cotidiano sereno tras la misión.';

  const recentMemoriesStr = memory?.journal?.memories && memory.journal.memories.length > 0
    ? memory.journal.memories.slice(-3).map(m => `- "${m.title}" (${m.location}, ${m.timeOfDay}): ${m.snippet}`).join('\n')
    : 'Sin recuerdos cotidianos previos registrados.';

  // Format Rin's Realtime Stats if present
  let rinStatsSummary = '';
  if (rinStats) {
    rinStatsSummary = `
- CHAKRA PRINCIPAL: ${rinStats.chakra?.primaryCurrent ?? 100}% / ${rinStats.chakra?.primaryMax ?? 100}% (Estado de flujo: ${rinStats.chakra?.flowState ?? 'estable'})
- SEGUNDO FLUJO (RESERVA YŪREI): ${rinStats.chakra?.secondaryCurrent ?? 0}% / ${rinStats.chakra?.secondaryMax ?? 100}%
- VITALIDAD Y FATIGA: Salud ${rinStats.vitality?.healthCurrent ?? 100}%, Nivel de Fatiga: ${rinStats.vitality?.fatigueLevel ?? 'ninguno'}
- DŌJUTSU (TERCER OJO): Modo actual "${rinStats.perception?.thirdEyeMode ?? 'reposo'}" (Activo: ${rinStats.perception?.thirdEyeActive ? 'SÍ' : 'NO'}, Rango: ${rinStats.perception?.remoteRangeMeters ?? 0}m)
- MOKUTON Y BIO-ARSENAL: Frutos explosivos: ${rinStats.mokuton?.explosiveFruits ?? 0}, Viales de esporas: ${rinStats.mokuton?.sleepSporesVials ?? 0}, Clones activos: ${rinStats.mokuton?.clonesActive ?? 0}
- AMENAZA TÁCTICA ACTIVA: ${rinStats.tacticalStatus?.currentThreat || 'Ninguna inmediata detectada'}`;
  } else {
    rinStatsSummary = `
- CHAKRA & VITALIDAD: Estado estándar de Genin / Yūrei no Keimyaku latente
- ESTADO FÍSICO: ${memory?.factual?.currentStatus || 'En buen estado físico'}`;
  }

  const lastRollplayState = `
════════════════════════════════════════════════════════════
ESTADO ACTUAL DE LA PARTIDA [LAST_ROLLPLAY_STATE]
════════════════════════════════════════════════════════════
[HISTORIA]: ${storyTitle || 'Crónicas Shinobi'}
[CAPÍTULO ACTUAL]: ${chapterName}
[UBICACIÓN EXACTA]: ${memory?.factual?.village || 'Konohagakure'} / Enclaves de misión o bosque circundante
[PERSONAJES PRESENTES]: ${memory?.factual?.companions?.join(', ') || 'Rin (jugador)'}
[ATMÓSFERA Y CLIMA ACTUAL]:
${atmosphereStr}
[ESTADO DE RIN]:${rinStatsSummary}
[EQUIPAMIENTO / INVENTARIO]: ${memory?.factual?.inventory?.join(', ') || 'Bolsa ninja estándar con kunais, shurikens y alambre de acero'}

[REGISTRO Y CONTINUIDAD DE TÉCNICAS DE RIN]:
${techniquesStr}

[NPCs Y RELACIONES]:
${relationsStr}

${npcContext ? npcContext + '\n' : ''}
[RECUERDOS COTIDIANOS Y VIVENCIAS SIGNIFICATIVAS]:
${recentMemoriesStr}

[ACONTECIMIENTOS INMEDIATAMENTE ANTERIORES]:
${episodicStr}

[DESVIACIONES DE LA LÍNEA CANON]:
${deviationsStr}

[CRONOLOGÍA RECIENTE]:
${timelineStr}

[SITUACIÓN EXACTA DE CONTINUACIÓN]:
Continúa la narración exactamente desde el último instante del último mensaje del jugador o de la escena, sin reiniciar la situación, respetando el ritmo de descompresión tras momentos intensos, sin olvidar las heridas o gastos de chakra y sin revelar información que los personajes aún no hayan descubierto.
════════════════════════════════════════════════════════════
`;

  return `
${rinBible}

---
${continuity}

---
${core}

---
${narrative}

---
${canon}

---
${realism}

---
${npc}

---
${readPromptFile('npc_agents.md')}

---
${combat}

---
${cozy}

---
${memoryDoc}

---
${chaptersDoc}

---
${consequences}

---
${audioDirection}

---
${lastRollplayState}
`.trim();
}

