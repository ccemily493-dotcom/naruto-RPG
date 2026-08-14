import { Story, StoryMemory, OpenAIConfig, RinDynamicStats } from './types';
import { createDefaultNPCWorld } from '../server/npcEngine';

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
    primaryCurrent: 64,
    primaryMax: 100,
    secondaryCurrent: 85,
    secondaryMax: 100,
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
    currentThreat: 'Itachi Uchiha (Incapacitado / Fuera de combate tras el choque con el Susanoo de Kālī)',
    ecosystemHealth: 75,
  },
};

export const INITIAL_DEFAULT_MEMORY: StoryMemory = {
  factual: {
    character: 'Rin',
    village: 'Konohagakure no Sato (Aldea Oculta de la Hoja)',
    clan: 'Investigadora de Chakra / Kekkei Genkai Yūrei no Keimyaku',
    rank: 'Genin (Equipo 7)',
    companions: ['Rin (Activa)', 'Kālī (En reposo tras completar el Susanoo)', 'Itachi Uchiha (Incapacitado en el suelo)'],
    inventory: [
      'Bolsa táctica con instrumental médico, kunais, shurikens y vendas selladas',
      'Viales de esporas somníferas y semillas de cultivo instantáneo',
      'Pergamino con notas y planos del Ataúd de la Muerte y Ataúd Divino',
      'Residuo de chakra y fragmentos de información física extraídos durante el combate',
    ],
    currentStatus: 'Combate contra Itachi Uchiha finalizado. Kālī replegó su presencia tras completar el Susanoo e incapacitar a Itachi. Rin permanece en control total del terreno.',
  },
  episodic: [
    {
      id: 'ep-itachi-0',
      event: 'Enfrentamiento crítico contra Itachi Uchiha: despliegue de percepción Yūrei no Keimyaku y Mokuton avanzado.',
      timestamp: Date.now() - 3600000,
      importance: 'high',
    },
    {
      id: 'ep-itachi-1',
      event: 'Kālī completó la manifestación del Susanoo espectral, quebrando la ofensiva de Itachi y dejándolo completamente incapacitado.',
      timestamp: Date.now() - 1800000,
      importance: 'high',
    },
    {
      id: 'ep-itachi-2',
      event: 'Rin ordenó formalmente a Kālī que descansara; Kālī obedeció y replegó su presencia y conexión espiritual, dejando de intervenir activamente.',
      timestamp: Date.now() - 600000,
      importance: 'high',
    },
    {
      id: 'ep-itachi-3',
      event: 'Confirmación del estado: Itachi yace incapacitado en el terreno. Rin mantiene activo su conocimiento y el desarrollo del Ataúd Divino para generar copias físicas semivivas con capacidades originales pero sin cerebro ni conciencia propia.',
      timestamp: Date.now() - 60000,
      importance: 'high',
    },
  ],
  techniques: [
    {
      name: 'Ataúd Divino (Mokuton / Intōn)',
      type: 'Bio-ingeniería Espiritual / Creación Semiviva',
      mastery: 'CONFIRMED',
      notes: 'Desarrollado y disponible. Crea copias físicas a partir de la información del Ataúd de la Muerte; conservan capacidades y técnicas originales pero carecen de cerebro y conciencia propia.',
    },
    {
      name: 'Ataúd de la Muerte (Mokuton / Intōn)',
      type: 'Ninjutsu / Extracción & Coma',
      mastery: 'CONFIRMED',
      notes: 'Fase I (El Velo), Fase II (El Último Dios) y Fase III (Luto). Extrae registros físicos, energéticos y sume en coma.',
    },
    {
      name: 'Kālī: Susanoo Espiritual Completo',
      type: 'Manifestación Espiritual Intōn/Mokuton',
      mastery: 'USED',
      notes: 'Completado durante el combate contra Itachi. Actualmente Kālī se encuentra en reposo tras la orden de Rin.',
    },
    {
      name: 'Yūrei no Keimyaku & Tercer Ojo',
      type: 'Kekkei Genkai Perceptiva / Análisis',
      mastery: 'CONFIRMED',
      notes: 'Lectura de tenketsu, distorsión perceptiva, anclaje espacial y análisis de flujo de chakra.',
    },
    {
      name: 'Segundo Flujo de Chakra',
      type: 'Regulación Energética Avanzada',
      mastery: 'CONFIRMED',
      notes: 'Circulación secundaria estabilizada para canalización de altos volúmenes de Intōn y Mokuton.',
    },
    {
      name: 'Mokuton: Raíces, Frutos Explosivos y Esporas',
      type: 'Bio-Mokuton Ofensivo/Táctico',
      mastery: 'USED',
      notes: 'Control territorial, bio-arsenal vegetal e infiltración.',
    },
  ],
  relational: [
    {
      targetName: 'Itachi Uchiha',
      relationship: 'Adversario / Uchiha de élite',
      attitude: 'Incapacitado tras el impacto del Susanoo de Kālī; a merced de las decisiones de Rin.',
    },
    {
      targetName: 'Kālī',
      relationship: 'Alianza Espiritual / Entidad Asociada',
      attitude: 'Obediente a la orden de Rin; en estado de descanso y repliegue espiritual.',
    },
    {
      targetName: 'Equipo 7 (Sasuke, Naruto, Sakura, Kakashi)',
      relationship: 'Vínculos de aldea y equipo',
      attitude: 'Antecedentes activos de la trayectoria de Rin en Konoha.',
    },
  ],
  knowledge: {
    secrets: [
      'Desarrollo operativo del Ataúd Divino para crear copias físicas semivivas desprovistas de mente.',
      'Extracción y análisis de patrones de chakra Uchiha tras el combate con Itachi.',
      'Control y mando sobre Kālī mediante órdenes directas de repliegue y activación.',
    ],
    publicKnowledge: [
      'Itachi Uchiha es un ninja renegado de rango S perteneciente a Akatsuki.',
    ],
    falseBeliefs: [],
  },
  world: {
    currentVillageState: 'Tensión en el mundo shinobi; movimientos de Akatsuki y facciones encubiertas.',
    activeAlliances: ['Pacto espiritual con Kālī'],
    timelineDeviations: [
      'Kālī manifestó y completó el Susanoo para incapacitar a Itachi Uchiha.',
      'Rin desarrolló el sistema del Ataúd Divino para la réplica semiviva de cuerpos sin conciencia.',
    ],
  },
  timeline: [
    {
      time: 'Inmediatamente posterior al combate contra Itachi Uchiha',
      description: 'Itachi yace incapacitado. Kālī se repliega a descansar. Rin evalúa el estado del terreno y sus siguientes pasos.',
    },
  ],
  atmosphere: {
    timeOfDay: 'atardecer',
    weather: 'lluvia_suave',
    locationName: 'Claro del Bosque & Linderos de Konoha',
    moodDescription: 'Calma tensa tras el combate; gotas suaves comienzan a humedecer las hojas de los cedros.',
    acousticDetails: 'Chisporroteo de chakra disipándose, primeras gotas sobre la corteza húmeda y viento fresco entre las copas de los árboles.',
  },
  npcWorld: createDefaultNPCWorld(),
  journal: {
    memories: [
      {
        id: 'mem_1',
        title: 'Tarde de té y lluvia bajo el alero de Ichiraku',
        snippet: 'El vapor del caldo caliente empañaba los pequeños carteles de madera mientras afuera llovía sin prisa. Naruto reía con la boca llena y Sakura explicaba pacientemente un ejercicio de botánica medicinal.',
        location: 'Calle de Ichiraku, Konohagakure',
        timeOfDay: 'tarde',
        weather: 'lluvia_suave',
        emotionalTone: 'Cálido y nostálgico',
        charactersInvolved: ['Naruto Uzumaki', 'Sakura Haruno', 'Teuchi'],
        userReflection: 'Es curioso cómo el sabor de un caldo caliente puede borrar horas de cansancio en la academia.',
        timestamp: Date.now() - 86400000 * 3,
      },
      {
        id: 'mem_2',
        title: 'El gato atigrado de las escaleras del Santuario Nakano',
        snippet: 'Un felino de pelaje atigrado y oreja mellada me siguió durante casi tres cuadras antes de echarse a dormir sobre una roca templada por el sol.',
        location: 'Escaleras del Santuario Nakano',
        timeOfDay: 'atardecer',
        weather: 'despejado',
        emotionalTone: 'Sereno y contemplativo',
        charactersInvolved: ['Gato de la aldea'],
        userReflection: 'Los animales sienten la tranquilidad de la madera viva antes que las personas.',
        timestamp: Date.now() - 86400000 * 5,
      },
      {
        id: 'mem_3',
        title: 'El rumor del río Naka al amanecer',
        snippet: 'Sasuke practicaba lanzamientos de shuriken al otro lado de la orilla sin decir palabra. Solo se escuchaba el choque seco del metal contra la madera y el fluir constante del agua.',
        location: 'Orilla del Río Naka',
        timeOfDay: 'amanecer',
        weather: 'niebla',
        emotionalTone: 'Silencio compartido y respeto mutuo',
        charactersInvolved: ['Sasuke Uchiha'],
        userReflection: 'No hizo falta hablar. La niebla matutina cubría el río y el entrenamiento continuó en calma.',
        timestamp: Date.now() - 86400000 * 8,
      },
    ],
    people: [
      {
        name: 'Sakura Haruno',
        relationship: 'Compañera de generación / Amiga',
        attitude: 'Cercana y atenta; comparte notas sobre hierbas medicinales y control de chakra.',
        memorableQuote: '«Si necesitas ayuda con las raíces medicinales del hospital, avísame después del entrenamiento.»',
        sharedMoments: [
          'Merienda de dango en la terraza de té tras las prácticas.',
          'Intercambio de pergaminos sobre conservación de plantas medicinales.',
        ],
        lastInteraction: 'Paseo tranquilo por la calle comercial antes de la partida.',
      },
      {
        name: 'Naruto Uzumaki',
        relationship: 'Compañero impredecible / Amigo leal',
        attitude: 'Enérgico pero genuino; siempre dispuesto a compartir cupones de ramen o mostrar sus nuevas ideas.',
        memorableQuote: '«¡Oye Rin! ¡La próxima vez que vayamos por ramen yo invito... si encuentro mis cupones!»',
        sharedMoments: [
          'Carreras por los tejados de la aldea al atardecer.',
          'Almuerzo compartido en los bancos del parque.',
        ],
        lastInteraction: 'Despedida ruidosa cerca de la entrada principal de la aldea.',
      },
      {
        name: 'Sasuke Uchiha',
        relationship: 'Compañero reservado / Vínculo silencioso',
        attitude: 'Distante pero observador; respeta la calma y la disciplina en los entrenamientos.',
        memorableQuote: '«...Tu control del chakra vegetal es más preciso de lo que aparentas.»',
        sharedMoments: [
          'Entrenamientos en silencio junto al río Naka.',
          'Guardia nocturna en el muelle de madera.',
        ],
        lastInteraction: 'Cruce de miradas en el campo de entrenamiento número 7.',
      },
      {
        name: 'Kakashi Hatake',
        relationship: 'Sensei / Guía experimentado',
        attitude: 'Relajado, puntual a su peculiar manera; atento a la fatiga psicológica de sus alumnos.',
        memorableQuote: '«Un buen ninja sabe cuándo blandir un kunai... y cuándo sentarse a escuchar el viento.»',
        sharedMoments: [
          'Explicaciones sobre regulación del flujo respiratorio bajo la sombra del roble.',
        ],
        lastInteraction: 'Reunión en el puente al anochecer.',
      },
    ],
    discoveredPlaces: [
      {
        id: 'place_1',
        name: 'El Banco bajo el Cerezo Viejo',
        type: 'mirador',
        locationArea: 'Sendero superior de la colina de los Hokage',
        description: 'Un banco de madera envejecida donde el viento mece las ramas de un cerezo centenario. Desde aquí se contempla toda la aldea y los rostros de piedra teñidos de ámbar.',
        sensoryAtmosphere: 'Brisa tibia, aroma a flores silvestres y rumor lejano de las campanas de viento.',
        peaceRating: 5,
        discoveredAt: Date.now() - 86400000 * 10,
      },
      {
        id: 'place_2',
        name: 'La Casa de Té del Callejón de Bambú',
        type: 'casa_de_te',
        locationArea: 'Sector este de Konoha, tras el mercado de alfarería',
        description: 'Un pequeño establecimiento familiar con tres mesas bajas de madera de ciprés, cortinas noren de lino azul y dango recién preparado sobre brasas aromáticas.',
        sensoryAtmosphere: 'Aroma a té tostado (hojicha), brasas de carbón vegetal y suaves pisadas de sandalias.',
        peaceRating: 5,
        discoveredAt: Date.now() - 86400000 * 14,
      },
      {
        id: 'place_3',
        name: 'La Roca Musgosa del Remanso de Naka',
        type: 'orilla_rio',
        locationArea: 'Tramo bajo del río Naka, borde del bosque de cedros',
        description: 'Una gran roca plana cubierta de musgo aterciopelado donde el agua del río forma un remanso cristalino con pequeños peces plateados.',
        sensoryAtmosphere: 'Murmullo continuo del agua corriente, frescor húmedo y sombra protectora.',
        peaceRating: 4,
        discoveredAt: Date.now() - 86400000 * 20,
      },
      {
        id: 'place_4',
        name: 'El Invernadero del Boticario Retirado',
        type: 'tienda',
        locationArea: 'Borde norte del barrio residencial',
        description: 'Una tienda y pequeño jardín botánico donde un anciano cultiva brotes raros de flores de montaña e intercambia semillas por historias.',
        sensoryAtmosphere: 'Tierra fértil húmeda, olor a menta silvestre y goteo de canalones de bambú.',
        peaceRating: 4,
        discoveredAt: Date.now() - 86400000 * 25,
      },
    ],
    room: {
      deskItems: [
        'Frasco de vidrio con tinta de nogal y pinceles de pelo de zorro',
        'Cuaderno de notas encuadernado en tela verde con bocetos de hojas y tenketsu',
        'Taza de cerámica agrietada (técnica kintsugi) con restos de hojas de té verde',
        'Piedra de río lisa utilizada como pisapapeles',
      ],
      herbsAndPlants: [
        'Brote de Mokuton enraizado en un cuenco de arcilla húmeda',
        'Ramillete de lavanda silvestre secándose colgado de una viga de madera',
        'Vial con semillas de crecimiento acelerado protegidas de la luz',
      ],
      souvenirs: [
        'Campanilla de viento de hierro forjado (fūrin) regalada por el boticario',
        'Pequeña figura de madera tallada a mano encontrada en el río',
      ],
      windowView: 'Vista hacia los tejados de teja roja de Konoha y la silueta lejana del monte Hokage envuelto en bruma.',
      roomAtmosphere: 'Tranquila, iluminada por la luz tamizada de las persianas de madera y el susurro suave del exterior.',
      notes: [
        '«El segundo flujo de chakra responde mejor cuando la respiración coincide con el murmullo de la lluvia.»',
        '«Recordar comprar miel fresca y jengibre en el puesto de la esquina.»',
      ],
    },
    customEntries: [
      {
        id: 'entry_1',
        title: 'Sobre el peso del regreso',
        content: 'Cuando uno regresa de una misión donde el chakra se ha tensado al límite, los ruidos más comunes de la aldea —el chirrido de una carreta, el vapor de una cocina, la risa de unos niños corriendo— no suenan normales. Suenan como un regalo que hay que proteger en silencio.',
        timestamp: Date.now() - 86400000 * 2,
        tags: ['Reflexión', 'Aldea', 'Regreso'],
      },
    ],
  },
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
        content: `[[CAPÍTULO: IX | El Silencio tras la Tormenta de Chakra | El Susanoo de Kālī ha caído sobre Itachi Uchiha, dejándolo incapacitado en el suelo. Kālī se repliega en reposo por orden de Rin, quien permanece con el control absoluto del escenario y el Ataúd Divino preparado.]]

El eco ensordecedor del choque se extingue entre los restos pulverizados del terreno. El aire aún vibra con una densidad casi eléctrica, saturado de ceniza fría y briznas de chakra disipándose en espirales de humo tenue.

En el centro del claro destrozado, **Itachi Uchiha yace en el suelo, completamente incapacitado**. Su respiración es débil, entrecortada; sus ojos están cerrados y su cuerpo, vencido por la contundencia terminal con la que Kālī completó la estructura del Susanoo, permanece inmóvil sobre la tierra quebrada.

A un costado, la inmensa silueta de **Kālī** —los seis brazos entrelazados y el halo de rostros espirituales que aún flotaba en el aire— se desvanece suavemente como niebla negra al acatar la orden de Rin. La entidad ha replegado su presencia por completo hacia el plano interior, entrando en estado de reposo absoluto. Ningún susurro espectral perturba ya el ambiente.

Rin permanece de pie, sola en el centro del claro. 

El flujo de su **Yūrei no Keimyaku** pulsa con un ritmo sereno y constante a través de su circulación secundaria. En su mente y en su arsenal, la estructura teórica y práctica del **Ataúd Divino** y del **Ataúd de la Muerte** está fijada con absoluta claridad: la capacidad de emplear el molde físico y la información energética de un objetivo para concebir réplicas semivivas, fieles en técnica y biología, pero desprovistas de mente, voluntad o conciencia propia.

El silencio vuelve a apoderarse de la espesura. Frente a ella se encuentra el cuerpo inerte de Itachi.

**Turno de Rin.**`,
        timestamp: now,
        chapterId: 'chap_1',
      },
    ],
    chapters: [
      {
        id: 'chap_1',
        numberRoman: 'IX',
        title: 'El Silencio tras la Tormenta de Chakra',
        synopsis: 'Itachi Uchiha queda incapacitado tras el choque con el Susanoo de Kālī. Kālī se repliega a descansar y Rin queda al mando de la situación con el Ataúd Divino disponible.',
        messageIdStart: 'msg_init_' + now,
        createdAt: now,
      },
    ],
    memory: JSON.parse(JSON.stringify(INITIAL_DEFAULT_MEMORY)),
    rinStats: JSON.parse(JSON.stringify(DEFAULT_RIN_STATS)),
    activeChapterId: 'chap_1',
  };

  return initialStory;
}

function ensureStoryRinStats(stories: Story[]): Story[] {
  return stories.map((s) => ({
    ...s,
    rinStats: s.rinStats || JSON.parse(JSON.stringify(DEFAULT_RIN_STATS)),
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
    
    // Attempt recovery from backup if primary key was missing or empty
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
    
    // Save to primary key
    localStorage.setItem(STORAGE_KEY_STORIES, serialized);
    
    // Update timestamp
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_LAST_SAVED, String(now));

    // Periodically update backup snapshot (if valid JSON)
    try {
      localStorage.setItem(STORAGE_KEY_BACKUP, serialized);
    } catch {
      // Storage quota or secondary failure shouldn't block primary save
    }

    return true;
  } catch (e: any) {
    console.error('Error saving stories to localStorage:', e);
    // If quota exceeded, try to save without backups or log warning
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
