import fs from 'fs';
import path from 'path';

export type EpistemicLayer = 'RIN_KNOWLEDGE' | 'NPC_KNOWLEDGE' | 'GM_SECRET';

export type Category =
  | 'YUREI_KEIMYAKU'
  | 'DOJUTSU'
  | 'GENJUTSU'
  | 'DISCURSO_MALDITO'
  | 'MOKUTON'
  | 'INTON_YIN_YANG'
  | 'TAIJUTSU'
  | 'KALI'
  | 'CHAKRA'
  | 'BIOTECNOLOGIA'
  | 'KICHOMI'
  | 'ATAUD_DIVINO'
  | 'NPCS'
  | 'AKATSUKI'
  | 'HISTORIA'
  | 'LINAJE'
  | 'COMBATE';

export type MasteryLevel =
  | 'CONOCIDO'
  | 'DESCUBIERTO'
  | 'ESTUDIADO'
  | 'EXPERIMENTAL'
  | 'UTILIZADO'
  | 'APRENDIDO'
  | 'DOMINADO'
  | 'FUTURO_NO_DISPONIBLE';

export interface SectionChunk {
  id: string;
  source: string; // File name
  category: Category;
  epistemic: EpistemicLayer;
  mastery?: MasteryLevel;
  title: string;
  content: string;
  keywords: string[];
}

export interface RetrievalInput {
  playerAction?: string;
  recentScene?: string;
  recentMessages?: Array<{ role: string; content: string }>;
  currentLocation?: string;
  mentionedCharacters?: string[];
  currentStoryState?: any;
}

export interface RetrievalResult {
  permanentCore: string;
  retrievedContext: string;
  rinKnowledge: string[];
  npcKnowledge: string[];
  gmSecrets: string[];
  sources: string[];
  epistemicLayers: Record<EpistemicLayer, number>;
  categories: Category[];
  confidence: number;
}

// Locate official documents path
function getOfficialDocPath(filename: string): string {
  const possiblePaths = [
    path.join('c:', 'Users', 'Usuario', 'Documents', 'contexto naruto rpg', filename),
    path.join(process.cwd(), '..', 'contexto naruto rpg', filename),
    path.join(process.cwd(), 'prompts', filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return '';
}

function readOfficialDoc(filename: string): string {
  const docPath = getOfficialDocPath(filename);
  if (docPath && fs.existsSync(docPath)) {
    return fs.readFileSync(docPath, 'utf-8');
  }
  console.warn(`[RinCanonRetriever] Warning: Official doc not found at ${filename}`);
  return '';
}

/**
 * Permanent Core Context (sent in every request)
 * Strictly ~1.5 - 2 KB
 */
export const PERMANENT_CORE_CONTEXT = `
[MARCO PERMANENTE RIN CANON & REGLAS DEL SISTEMA]
1. REGLA DEL JUGADOR: El jugador controla ÚNICA y EXCLUSIVAMENTE a Rin Kagehira. El Game Master controla el mundo, entorno, NPCs y consecuencias. No narrar pensamientos, decisiones o acciones de Rin.
2. ESTRUCTURA DE TURNO: Acción del jugador → Reacción del mundo → Consecuencia física/chakra → Turno del jugador.
3. PRINCIPIO DEL PERSONAJE: Ciclo de investigación (percibir → analizar → comprender → experimentar → modificar → desarrollar → perfeccionar). CONOCIMIENTO ≠ DOMINIO.
4. ESTADO TEMPORAL OFICIAL: Comienzo de Naruto Shippuden (salto temporal de 3 años completado). Misión de Sunagakure superada.
5. PERSONAJES FALLECIDOS CONFIRMADOS: Itachi Uchiha (MUERTO), Kisame Hoshigaki (MUERTO), Orochimaru (MUERTO / vinculado al Ataúd Divino). Deidara derrotado y procesado como plantilla semiviva. Sasuke entrenó con Akatsuki durante los 3 años.
6. LINAJE CANÓNICO CONFIRMADO EN KICHOMI: Kagehira + Uchiha + Uzumaki.
7. SEPARACIÓN EPISTÉMICA: Distinguir estrictamente entre RIN_KNOWLEDGE (lo que Rin sabe), NPC_KNOWLEDGE (lo que otros han visto/saben) y GM_SECRET (conocimiento de dirección omnisciente). Los secretos GM-ONLY NUNCA se usan para influir voluntariamente en la mente o decisiones de Rin.
8. JERARQUÍA ABSOLUTA DE VERDAD: 
   1º LAST_ROLLPLAY_STATE + StoryMemory (hechos ocurridos en la partida actual)
   2º Documentos canónicos oficiales de Rin
   3º Canon general de Naruto (solo si 1º y 2º no contienen la información)
   4º El futuro está indefinido (prohibido inventar arcos o técnicas futuras antes de tiempo).
`.trim();

/**
 * Semantic keyword dictionary to map indirect user language to categories
 */
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  MOKUTON: [
    'raíz',
    'raíces',
    'madera',
    'tronco',
    'árbol',
    'árboles',
    'bosque',
    'espora',
    'esporas',
    'fruto',
    'vegetación',
    'mokuton',
    'mokubunshin',
    'ramaje',
    'corteza',
    'semilla',
    'brote',
    'vegetal',
  ],
  YUREI_KEIMYAKU: [
    'percepción',
    'percibir',
    'análisis',
    'analizar',
    'yūrei',
    'yurei',
    'keimyaku',
    'kenyaku',
    'flujo',
    'red perceptiva',
    'tercer ojo',
    'ojo',
    'vista remota',
    'percepción remota',
    'anclaje',
    'ocultación',
  ],
  DOJUTSU: [
    'dōjutsu',
    'dojutsu',
    'mirada',
    'ojo',
    'paralizante',
    'aura',
    'terrorífica',
    'mandala',
    'mandalas',
    'caos',
    'visión',
  ],
  GENJUTSU: [
    'genjutsu',
    'ilusión',
    'bucle',
    'loop',
    'mareo',
    'espacial',
    'muerte súbita',
    'loto',
    'trauma',
    'identidad',
    'perceptivo',
  ],
  DISCURSO_MALDITO: [
    'discurso',
    'voz',
    'orden',
    'órdenes',
    'hablar',
    'comando',
    'desactiva',
    'ríndete',
    'sugestión',
    'resonancia',
  ],
  INTON_YIN_YANG: [
    'inton',
    'yin',
    'yang',
    'putrefacción',
    'deterioro',
    'vitalidad',
    'kuishōmoden',
    'conocimiento divino',
    'concepto',
  ],
  TAIJUTSU: [
    'taijutsu',
    'mantis',
    'garras',
    'precisión',
    'golpe',
    'cuerpo a cuerpo',
    'patada',
    'puño',
  ],
  KALI: ['kali', 'kālī', 'seis brazos', 'mudra', 'caos', 'invocación'],
  CHAKRA: [
    'chakra',
    'segundo flujo',
    'reserva',
    'energía',
    'circulación',
    'red de chakra',
    'dominio simple',
    'infernal',
  ],
  BIOTECNOLOGIA: [
    'biotecnología',
    'laboratorio',
    'cerebro',
    'cerebro artificial',
    'órganos',
    'semivivo',
    'plantilla',
    'memoria',
  ],
  KICHOMI: [
    'kichomi',
    'plano',
    'kyoju',
    'kyojuyen',
    'templo',
    'pregunta',
    'integración',
  ],
  ATAUD_DIVINO: [
    'ataúd divino',
    'ataud divino',
    'tutor',
    'tutores',
    'plantilla',
    'orochimaru',
    'itachi',
  ],
  NPCS: [
    'naruto',
    'sasuke',
    'sakura',
    'kakashi',
    'orochimaru',
    'itachi',
    'deidara',
    'tobi',
    'obito',
    'gaara',
    'chiyo',
    'kankuro',
  ],
  AKATSUKI: [
    'akatsuki',
    'deidara',
    'tobi',
    'pain',
    'konan',
    'kisame',
    'itachi',
    'organización',
  ],
  HISTORIA: [
    'sunagakure',
    'examen',
    'chūnin',
    'chunin',
    'bosque de la muerte',
    'salto temporal',
    'shippuden',
    'tres años',
  ],
  LINAJE: ['linaje', 'kagehira', 'uchiha', 'uzumaki', 'padres', 'sangre', 'clan'],
  COMBATE: [
    'chidori',
    'espiral maldita',
    'tamushaki',
    'sustitución',
    'kunai',
    'explosivo',
    'ataúd de la muerte',
    'velo',
    'último dios',
    'luto',
  ],
};

/**
 * Pre-parsed static chunks from the official documents
 */
function buildOfficialChunks(): SectionChunk[] {
  return [
    // 1. LINAGE & KICHOMI (GM_SECRET / RIN_KNOWLEDGE)
    {
      id: 'linaje_kagehira_1',
      source: 'Historia_y_Acontecimientos_Rin_Continuidad_Maestra.md',
      category: 'LINAJE',
      epistemic: 'RIN_KNOWLEDGE',
      title: 'Linaje Mixto Kagehira/Uchiha/Uzumaki',
      content:
        'Linaje confirmado en Kichomi: Kagehira + Uchiha + Uzumaki. Uzumaki aporta gran reserva de chakra; Uchiha afinidad ocular; Kagehira la base del Kekkei Genkai.',
      keywords: ['linaje', 'kagehira', 'uchiha', 'uzumaki', 'sangre', 'clan'],
    },
    {
      id: 'gm_secret_kagehira_ascension',
      source: 'Historia_y_Acontecimientos_Rin_Continuidad_Maestra.md',
      category: 'LINAJE',
      epistemic: 'GM_SECRET',
      title: 'Secreto de Dirección: Ascensión del Clan Kagehira',
      content:
        'SECRETOS GM-ONLY (PROHIBIDO REVELAR A RIN O USAR EN SUS PENSAMIENTOS): Los Kagehira ascendieron a otro plano para vivir en paz. Rin descubrirá más adelante que el clan la consideraba diferente y rechazará un futuro ritual para ser 100% Kagehira por sentirse traicionada.',
      keywords: [
        'ascensión',
        'ascendieron',
        'secreto',
        'traición',
        'ritual',
        '100%',
        'padres',
        'decisión del clan',
      ],
    },

    // 2. MOKUTON & ATAÚD DE LA MUERTE
    {
      id: 'mokuton_estilo_rin',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'MOKUTON',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'UTILIZADO',
      title: 'Mokuton Estilo de Rin',
      content:
        'Mokuton propio centrado en raíces, movilidad, anclaje, desplazamiento, control territorial, captura, absorción, Piel de madera, Mokubunshin, Serpientes Cazadoras y Fruto Explosivo.',
      keywords: [
        'mokuton',
        'raíz',
        'raíces',
        'madera',
        'árbol',
        'bosque',
        'piel de madera',
        'mokubunshin',
        'fruto explosivo',
        'serpientes cazadoras',
      ],
    },
    {
      id: 'ataud_de_la_muerte',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'MOKUTON',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'UTILIZADO',
      title: 'Ataúd de la Muerte (3 Fases)',
      content:
        'Ataúd de la Muerte: Fase I (El Velo: genjutsu + extracción), Fase II (El Último Dios: distorsión temporal perceptiva + extracción intensa), Fase III (Luto: coma profundo + absorción hacia el 2º flujo). Orochimaru consiguió escapar; no es captura automática.',
      keywords: [
        'ataúd de la muerte',
        'ataud de la muerte',
        'velo',
        'último dios',
        'luto',
        'extracción',
        'coma',
      ],
    },
    {
      id: 'estilo_vitalidad_ciclo',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'INTON_YIN_YANG',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'UTILIZADO',
      title: 'Estilo Vitalidad y Ciclo de Transferencia',
      content:
        'Ciclo: materia orgánica → putrefacción → energía/vitalidad → raíces → transferencia → regeneración. Las raíces sirven de conducto para transferir chakra y vitalidad a aliados (Sasuke/Naruto). Daña el ecosistema vegetal si se abusa.',
      keywords: [
        'vitalidad',
        'putrefacción',
        'transferencia',
        'regeneración',
        'ciclo',
        'raíces',
        'ecosistema',
      ],
    },

    // 3. YŪREI NO KEIMYAKU & DŌJUTSU
    {
      id: 'yurei_no_keimyaku_core',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'YUREI_KEIMYAKU',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'DOMINADO',
      title: 'Yūrei no Keimyaku / Kenyaku',
      content:
        'Kekkei Genkai perceptivo de Rin: red perceptiva, Tercer Ojo (base de datos técnica mental), vista remota, análisis de chakra y estructural, manipulación y anclaje perceptivo, e integración de información mediante Kuishōmoden sin sobrecarga.',
      keywords: [
        'yūrei',
        'yurei',
        'keimyaku',
        'kenyaku',
        'tercer ojo',
        'percepción',
        'vista remota',
        'kuishōmoden',
        'anclaje',
      ],
    },
    {
      id: 'dojutsu_mandalas',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'DOJUTSU',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'UTILIZADO',
      title: 'Dōjutsu Ocular: Mirada Paralizante & Aura Terrorífica',
      content:
        'Dōjutsu ocular de Rin: Mirada Paralizante, Aura Terrorífica (intimidación usada contra Sasuke proyectando la imagen de Itachi), Mandalas Infinitos y Mirada del Caos.',
      keywords: [
        'dōjutsu',
        'dojutsu',
        'mirada paralizante',
        'aura terrorífica',
        'mandalas',
        'caos',
      ],
    },

    // 4. GENJUTSU & DISCURSO MALDITO
    {
      id: 'genjutsu_loop_temporal',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'GENJUTSU',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'UTILIZADO',
      title: 'Genjutsu de Loop Temporal Simple',
      content:
        'Genjutsu de Loop Temporal Simple (bucle perceptivo que hace repetir la experiencia al enemigo). LIMITACIÓN FUNDAMENTAL: Es un bucle perceptivo mental, NO altera el tiempo real. Usado contra Tobi.',
      keywords: [
        'loop',
        'bucle',
        'temporal',
        'genjutsu',
        'tobi',
        'perceptivo',
        'tiempo real',
      ],
    },
    {
      id: 'discurso_maldito_deidara',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'DISCURSO_MALDITO',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'UTILIZADO',
      title: 'Discurso Maldito: Ordenes de Combate',
      content:
        'Discurso Maldito: Órdenes por voz («Ríndete», «Desactiva todo tu chakra» usado contra Deidara interfiriendo su control de chakra). Sugestión y estudio de resonancia.',
      keywords: [
        'discurso maldito',
        'desactiva todo tu chakra',
        'deidara',
        'voz',
        'orden',
        'sugestión',
      ],
    },

    // 5. SUNAGAKURE & DEIDARA (HISTORIA / NPCS)
    {
      id: 'mision_sunagakure_deidara',
      source: 'Historia_y_Acontecimientos_Rin_Continuidad_Maestra.md',
      category: 'HISTORIA',
      epistemic: 'RIN_KNOWLEDGE',
      title: 'Misión de Sunagakure & Procesamiento de Deidara',
      content:
        'Sunagakure: Gaara fue secuestrado y recuperado. Rin venció a Deidara (Tamushaki, Discurso Maldito, Ataúd de la Muerte), lo interrogó y lo procesó como plantilla semiviva. Mintió a Tobi diciéndole que Deidara murió. Sasuke reapareció y se retiró tras la amenaza de Rin.',
      keywords: [
        'sunagakure',
        'gaara',
        'deidara',
        'tobi',
        'sasuke',
        'plantilla semiviva',
        'akatsuki',
      ],
    },

    // 6. ATAÚD DIVINO & TUTORES MUERTOS
    {
      id: 'ataud_divino_tutores',
      source: 'Historia_y_Acontecimientos_Rin_Continuidad_Maestra.md',
      category: 'ATAUD_DIVINO',
      epistemic: 'RIN_KNOWLEDGE',
      title: 'Entrenamiento de 3 Años vía Ataúd Divino',
      content:
        'Ataúd Divino: Permite crear cuerpos semivivos sin alma original. Tutores de Rin durante el salto temporal: Orochimaru (Año 1) e Itachi Uchiha (Año 2, tras su muerte). Ambos están MUERTOS en el mundo real.',
      keywords: [
        'ataúd divino',
        'tutores',
        'orochimaru',
        'itachi',
        'muerto',
        'entrenamiento',
        'semivivo',
      ],
    },
    {
      id: 'npc_knowledge_tobi_sasuke',
      source: 'Historia_y_Acontecimientos_Rin_Continuidad_Maestra.md',
      category: 'NPCS',
      epistemic: 'NPC_KNOWLEDGE',
      title: 'Conocimiento de NPCs sobre Rin',
      content:
        'CONOCIMIENTO DE NPCs: Tobi/Obito sabe que Rin usa bucles perceptivos y la considera shinobi anómala de alto interés. Sasuke sabe que Rin proyectó la ilusión de Itachi y domina el Ataúd de la Muerte. Kakashi y Sakura conocen sus raíces y apoyo de vitalidad.',
      keywords: [
        'tobi',
        'sasuke',
        'kakashi',
        'sakura',
        'orochimaru',
        'npc',
        'conocimiento npc',
      ],
    },

    // 7. SEGUNDO FLUJO & BIOTECNOLOGÍA
    {
      id: 'segundo_flujo_biotecnologia',
      source: 'Rin_Kagehira_Registro_Maestro_Tecnicas_Completo.md',
      category: 'BIOTECNOLOGIA',
      epistemic: 'RIN_KNOWLEDGE',
      mastery: 'EXPERIMENTAL',
      title: 'Segundo Flujo de Chakra & Cerebro Artificial',
      content:
        'Segundo Flujo de Chakra: Reserva principal ↔ Segundo flujo ↔ Red de Mokuton. Biotecnología: Prototipos I y II de Cerebro Artificial de Chakra y estudios sobre memoria y cuerpos semivivos.',
      keywords: [
        'segundo flujo',
        'cerebro artificial',
        'biotecnología',
        'órganos',
        'flujo de chakra',
      ],
    },
  ];
}

/**
 * Main Retriever implementation
 */
export function retrieveRinCanonContext(input: RetrievalInput): RetrievalResult {
  const chunks = buildOfficialChunks();

  // Combine query terms from input
  const queryText = [
    input.playerAction || '',
    input.recentScene || '',
    (input.recentMessages || []).map((m) => m.content).join(' '),
    input.currentLocation || '',
    (input.mentionedCharacters || []).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  const selectedChunks: Array<{ chunk: SectionChunk; score: number }> = [];
  const matchedCategories = new Set<Category>();
  const sourcesSet = new Set<string>();

  const epistemicCounts: Record<EpistemicLayer, number> = {
    RIN_KNOWLEDGE: 0,
    NPC_KNOWLEDGE: 0,
    GM_SECRET: 0,
  };

  for (const chunk of chunks) {
    let score = 0;

    // Check category keywords match
    const categoryKeywords = CATEGORY_KEYWORDS[chunk.category] || [];
    for (const kw of categoryKeywords) {
      if (kw && kw.trim().length > 2 && queryText.includes(kw.toLowerCase().trim())) {
        score += 3;
      }
    }

    // Check specific chunk keywords match
    for (const kw of chunk.keywords) {
      if (kw && kw.trim().length > 2 && queryText.includes(kw.toLowerCase().trim())) {
        score += 5;
      }
    }

    // Direct title/content match
    if (chunk.title && chunk.title.trim().length > 3 && queryText.includes(chunk.title.toLowerCase().trim())) {
      score += 10;
    }

    // Base score for essential match or fallback
    if (score > 0) {
      selectedChunks.push({ chunk, score });
      matchedCategories.add(chunk.category);
      sourcesSet.add(chunk.source);
      epistemicCounts[chunk.epistemic]++;
    }
  }

  // Sort by relevance score descending
  selectedChunks.sort((a, b) => b.score - a.score);

  // Take top chunks (limit to max 5 for token efficiency)
  const topChunks = selectedChunks.slice(0, 5).map((sc) => sc.chunk);

  const rinKnowledge: string[] = [];
  const npcKnowledge: string[] = [];
  const gmSecrets: string[] = [];

  for (const c of topChunks) {
    const formatted = `[source: ${c.source}] [section: ${c.category}] [epistemic: ${c.epistemic}] ${c.title}:\n${c.content}`;
    if (c.epistemic === 'RIN_KNOWLEDGE') {
      rinKnowledge.push(formatted);
    } else if (c.epistemic === 'NPC_KNOWLEDGE') {
      npcKnowledge.push(formatted);
    } else if (c.epistemic === 'GM_SECRET') {
      gmSecrets.push(formatted);
    }
  }

  const retrievedContextStr = topChunks
    .map(
      (c) =>
        `[source: ${c.source}] [category: ${c.category}] [epistemic: ${c.epistemic}] ${c.title}\n${c.content}`
    )
    .join('\n\n');

  const confidence = topChunks.length > 0 ? Math.min(100, topChunks.length * 25) : 0;

  return {
    permanentCore: PERMANENT_CORE_CONTEXT,
    retrievedContext: retrievedContextStr,
    rinKnowledge,
    npcKnowledge,
    gmSecrets,
    sources: Array.from(sourcesSet),
    epistemicLayers: epistemicCounts,
    categories: Array.from(matchedCategories),
    confidence,
  };
}
