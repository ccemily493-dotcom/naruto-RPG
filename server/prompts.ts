import fs from 'fs';
import path from 'path';
import { StoryMemory, RinDynamicStats, Chapter, SimulationResult } from '../src/types';
import { retrieveRinCanonContext } from './rinCanonRetriever';

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
  playerAction?: string;
  recentScene?: string;
  recentMessages?: Array<{ role: string; content: string }>;
  simulationResult?: SimulationResult;
}

export function buildSystemPrompt(params?: StoryMemory | PromptContextParams): string {
  let memory: StoryMemory | undefined;
  let rinStats: RinDynamicStats | undefined;
  let chapters: Chapter[] | undefined;
  let storyTitle: string | undefined;
  let npcContext: string | undefined;
  let playerAction: string | undefined;
  let recentScene: string | undefined;
  let recentMessages: Array<{ role: string; content: string }> | undefined;
  let simulationResult: SimulationResult | undefined;

  if (params && ('episodic' in params || 'factual' in params || 'techniques' in params)) {
    memory = params as StoryMemory;
  } else if (params && typeof params === 'object') {
    const p = params as PromptContextParams;
    memory = p.memory;
    rinStats = p.rinStats;
    chapters = p.chapters;
    storyTitle = p.storyTitle;
    npcContext = p.npcContext;
    playerAction = p.playerAction;
    recentScene = p.recentScene;
    recentMessages = p.recentMessages;
    simulationResult = p.simulationResult;
  }

  // Retrieve dynamic Rin Canon Context
  const retrieval = retrieveRinCanonContext({
    playerAction: playerAction || (recentMessages && recentMessages.length > 0 ? recentMessages[recentMessages.length - 1].content : ''),
    recentScene: recentScene || '',
    recentMessages: recentMessages || [],
    currentLocation: memory?.factual?.village || 'Konohagakure',
    mentionedCharacters: memory?.factual?.companions || [],
  });

  const core = readPromptFile('core.md');
  const narrative = readPromptFile('narrative.md');
  const canon = readPromptFile('canon.md');
  const realism = readPromptFile('realism.md');
  const npc = readPromptFile('npc.md');
  const combat = readPromptFile('combat.md');
  const memoryDoc = readPromptFile('memory.md');
  const chaptersDoc = readPromptFile('chapters.md');
  const consequences = readPromptFile('consequences.md');

  // Build LAST_ROLLPLAY_STATE block (PRIORITY 1)
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

  const atmosphereStr = memory?.atmosphere
    ? `- MOMENTO DEL DÍA: ${(memory.atmosphere.timeOfDay || '').toUpperCase()} | CLIMA: ${(memory.atmosphere.weather || '').toUpperCase()}
- UBICACIÓN Y AMBIENTE: ${memory.atmosphere.locationName} (${memory.atmosphere.moodDescription})`
    : '- ATMÓSFERA: Tarde templada en Konohagakure; ambiente cotidiano sereno tras la misión.';

  let rinStatsSummary = '';
  if (rinStats) {
    rinStatsSummary = `
- CHAKRA PRINCIPAL: ${rinStats.chakra?.primaryCurrent ?? 100}% / ${rinStats.chakra?.primaryMax ?? 100}%
- SEGUNDO FLUJO: ${rinStats.chakra?.secondaryCurrent ?? 0}% / ${rinStats.chakra?.secondaryMax ?? 100}%
- DŌJUTSU: Tercer ojo modo "${rinStats.perception?.thirdEyeMode ?? 'reposo'}" (Activo: ${rinStats.perception?.thirdEyeActive ? 'SÍ' : 'NO'})`;
  } else {
    rinStatsSummary = `
- CHAKRA & VITALIDAD: Estado de Shippuden tras 3 años de entrenamiento / Yūrei no Keimyaku latente`;
  }

  const lastRollplayState = `
════════════════════════════════════════════════════════════
ESTADO ACTUAL DE LA PARTIDA [LAST_ROLLPLAY_STATE - PRIORIDAD ABSOLUTA 1]
════════════════════════════════════════════════════════════
[HISTORIA]: ${storyTitle || 'Crónicas Shinobi'}
[CAPÍTULO ACTUAL]: ${chapterName}
[UBICACIÓN EXACTA]: ${memory?.factual?.village || 'Konohagakure'} / Enclaves de misión
[PERSONAJES PRESENTES]: ${memory?.factual?.companions?.join(', ') || 'Rin (jugador)'}
[ATMÓSFERA Y CLIMA]:
${atmosphereStr}
[ESTADO DE RIN]:${rinStatsSummary}
[EQUIPAMIENTO / INVENTARIO]: ${memory?.factual?.inventory?.join(', ') || 'Bolsa ninja estándar'}

[REGISTRO Y CONTINUIDAD DE TÉCNICAS DE RIN]:
${techniquesStr}

[NPCs Y RELACIONES]:
${relationsStr}

${npcContext ? npcContext + '\n' : ''}
[ACONTECIMIENTOS INMEDIATAMENTE ANTERIORES]:
${episodicStr}

[DESVIACIONES DE LA LÍNEA CANON]:
${deviationsStr}

[CRONOLOGÍA RECIENTE]:
${timelineStr}
════════════════════════════════════════════════════════════
`.trim();

  let simBlock = '';
  if (simulationResult) {
    simBlock = `
════════════════════════════════════════════════════════════
[DETERMINISTIC SIMULATION RESULT — RESULTADO INVIOLABLE DEL MOTOR]
════════════════════════════════════════════════════════════
ÉXITO DE LA ACCIÓN: ${simulationResult.success ? 'SÍ' : 'NO'} (Grado: ${simulationResult.degree} / Calidad de ejecución: ${simulationResult.executionQuality}%)
CHAKRA CONSUMIDO: ${simulationResult.chakraSpent} (Stamina consumida: ${simulationResult.staminaSpent})
CAMBIOS DE SALUD/VITALIDAD: ${simulationResult.vitalityChange}
DESGLOSE DE PUNTUACIÓN (Score Final: ${simulationResult.calculationBreakdown.finalExecutionScore} vs Umbral: ${simulationResult.calculationBreakdown.difficultyThreshold}):
- Bonus Control Chakra: +${simulationResult.calculationBreakdown.chakraControlBonus}
- Penalización Fatiga: -${simulationResult.calculationBreakdown.fatiguePenalty}
- Penalización Heridas: -${simulationResult.calculationBreakdown.injuryPenalty}
EFECTOS ACTIVADOS: ${simulationResult.triggeredEffects.join(', ') || 'Ninguno'}
FALLOS / ALERTAS: ${simulationResult.failures.join(', ') || 'Ninguno'}
BACKLASH / RETROALIMENTACIÓN: ${simulationResult.backlash || 'Sin backlash'}
VENTANA DE REACCIÓN ENEMIGA: ${simulationResult.enemyReactionWindowMs} ms
SEMILLA DE SIMULACIÓN DETERMINISTA: "${simulationResult.seed}"

⚠️ INSTRUCCIÓN OBLIGATORIA E INVIOLABLE AL GAME MASTER:
El motor determinista Node.js ha resuelto esta acción. Debes NARRAR este resultado EXACTO. Está estrictamente PROHIBIDO cambiar el éxito/fracaso, devolver el chakra gastado, ignorar el backlash o modificar la reacción calculada.
════════════════════════════════════════════════════════════
`;
  }

  // STRUCTURED PROMPT BUILDER (A -> G ORDER)
  return `
[A. REGLAS PERMANENTES DEL GAME MASTER]
${retrieval.permanentCore}
${simBlock}

---
${core}

---
${narrative}

---
${canon}

---
${realism}

---
[B. ESTADO ACTUAL DE LA PARTIDA - PRIORIDAD 1]
${lastRollplayState}

---
[C. CONTEXTO CANÓNICO RELEVANTE DE RIN - PRIORIDAD 2]
${retrieval.retrievedContext}

---
[D. CAPA 1 — CONOCIMIENTO DE RIN (RIN_KNOWLEDGE)]
${retrieval.rinKnowledge.length > 0 ? retrieval.rinKnowledge.join('\n\n') : 'Rin opera con su conocimiento de Shippuden y técnicas investigadas.'}

---
[E. CAPA 2 — CONOCIMIENTO DE NPCS (NPC_KNOWLEDGE)]
${retrieval.npcKnowledge.length > 0 ? retrieval.npcKnowledge.join('\n\n') : 'Los NPCs reaccionan según sus observaciones directas de la escena.'}

---
[F. CAPA 3 — SECRETOS EXCLUSIVOS DEL GM (GM_SECRET - OMNISCIENCIA DE DIRECCIÓN)]
⚠️ REGLA EPISTÉMICA CRÍTICA: Los siguientes secretos son de uso EXCLUSIVO para la dirección del mundo/NPCs. NUNCA hacer que Rin piense, hable o actúe conociendo esta información:
${retrieval.gmSecrets.length > 0 ? retrieval.gmSecrets.join('\n\n') : 'Sin secretos de dirección específicos requeridos para esta escena.'}

---
[G. MENSAJES RECIENTES Y REGLAS ADICIONALES]
${npc}
${combat}
${memoryDoc}
${chaptersDoc}
${consequences}
`.trim();
}
