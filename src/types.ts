export type Role = 'user' | 'assistant' | 'system';

export type TechniqueMastery = 'MENTIONED' | 'EXPERIMENTAL' | 'USED' | 'LEARNED' | 'CONFIRMED';

export interface TechniqueRecord {
  name: string;
  type: string;
  mastery: TechniqueMastery;
  notes?: string;
}

export interface RelationalRecord {
  targetName: string;
  relationship: string;
  attitude: string;
}

export interface EpisodicEvent {
  id: string;
  event: string;
  timestamp: number;
  importance: 'low' | 'medium' | 'high';
}

export interface FactualRecord {
  character: string;
  village: string;
  clan?: string;
  rank?: string;
  companions?: string[];
  inventory?: string[];
  currentStatus?: string;
}

export type TimeOfDay =
  'amanecer' | 'mañana' | 'mediodía' | 'tarde' | 'atardecer' | 'noche' | 'madrugada';

export type WeatherType =
  | 'despejado'
  | 'lluvia_suave'
  | 'lluvia_torrencial'
  | 'nublado'
  | 'viento_calido'
  | 'nieve'
  | 'niebla'
  | 'tormenta';

export interface CozyAtmosphere {
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  locationName: string;
  moodDescription: string;
  acousticDetails: string;
}

export interface CozyMemory {
  id: string;
  title: string;
  snippet: string;
  location: string;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  emotionalTone: string;
  charactersInvolved: string[];
  userReflection?: string;
  timestamp: number;
}

export interface JournalPerson {
  name: string;
  relationship: string;
  attitude: string;
  memorableQuote?: string;
  sharedMoments: string[];
  lastInteraction?: string;
}

export interface DiscoveredPlace {
  id: string;
  name: string;
  type:
    | 'banco'
    | 'tienda'
    | 'bosque'
    | 'mirador'
    | 'casa_de_te'
    | 'santuario'
    | 'orilla_rio'
    | 'rincon';
  locationArea: string;
  description: string;
  sensoryAtmosphere: string;
  peaceRating: number; // 1-5
  discoveredAt: number;
}

export interface PersonalRoomState {
  deskItems: string[];
  herbsAndPlants: string[];
  souvenirs: string[];
  windowView: string;
  roomAtmosphere: string;
  notes: string[];
}

export interface JournalCustomEntry {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  tags?: string[];
}

export interface PersonalJournal {
  memories: CozyMemory[];
  people: JournalPerson[];
  discoveredPlaces: DiscoveredPlace[];
  room: PersonalRoomState;
  customEntries: JournalCustomEntry[];
}

export interface StoryMemory {
  episodic: EpisodicEvent[];
  factual: FactualRecord;
  techniques: TechniqueRecord[];
  relational: RelationalRecord[];
  knowledge: {
    secrets: string[];
    publicKnowledge: string[];
    falseBeliefs?: string[];
  };
  world: {
    currentVillageState: string;
    activeAlliances: string[];
    timelineDeviations: string[];
  };
  timeline: Array<{ time: string; description: string }>;
  atmosphere?: CozyAtmosphere;
  journal?: PersonalJournal;
  npcWorld?: NPCWorldState; // Added NPC World State
}

// ============ NPC AGENT SYSTEM TYPES ============

export type RelationshipStage =
  'stranger' | 'acquaintance' | 'companion' | 'trusted' | 'strong_bond' | 'deep_relationship';

export type NPCScheduleSlot = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

export type NPCMemoryType = 'episodic' | 'factual' | 'social' | 'private';

export interface NPCRelationshipVector {
  trust: number; // -1.0 to 1.0
  familiarity: number; // 0.0 to 1.0
  respect: number; // -1.0 to 1.0
  affinity: number; // -1.0 to 1.0
  concern: number; // 0.0 to 1.0
  admiration: number; // 0.0 to 1.0
  resentment: number; // 0.0 to 1.0
  emotionalSignificance: number; // 0.0 to 1.0
  stage: RelationshipStage;
  sharedExperiences: string[];
  conflicts: string[];
  secrets: string[]; // secrets known about the target
  lastSignificantEvent?: string;
  lastInteractionChapter?: string;
}

export interface NPCMemoryEntry {
  id: string;
  type?: NPCMemoryType;
  event: string;
  participants: string[];
  location: string;
  chapter: string;
  emotionalSignificance: number; // 0.0 to 1.0
  informationLearned: string[];
  consequences: string[];
  importance: 'minor' | 'moderate' | 'significant' | 'critical';
  decayFactor?: number; // 0.0 (forgotten) to 1.0 (fresh)
  lastRecalled?: number;
  timestamp: number;
}

export interface NPCEmotionState {
  valence: number; // -1.0 (negative/distressed) to 1.0 (positive/joyful)
  arousal: number; // 0.0 (calm/lethargic) to 1.0 (excited/terrified/furious)
  dominance: number; // 0.0 (submissive/helpless) to 1.0 (confident/dominant)
  primaryMood: string; // e.g. "Sereno", "Furiose", "Melancólico", "Alerta"
}

export interface NPCGoalItem {
  id: string;
  description: string;
  category: 'survival' | 'mastery' | 'relationship' | 'revenge' | 'duty';
  priority: number; // 1 (lowest) to 10 (critical)
  preconditions?: string[];
  subgoals?: string[];
  completed?: boolean;
}

export interface NPCPerceptionState {
  visibleEntities: string[];
  heardEvents: string[];
  chakraSensings: string[];
  learnedRumors: string[];
}

export interface NPCCombatState {
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  fatigue: number; // 0 to 100
  stance: 'aggressive' | 'defensive' | 'support' | 'flee';
  activeJutsu?: string;
}

export interface NPCScheduleEntry {
  slot: NPCScheduleSlot;
  activity: string;
  location: string;
  flexible: boolean; // can be interrupted
}

export interface NPCIntention {
  action: string;
  target?: string;
  motivation: string;
  urgency: 'low' | 'medium' | 'high';
  blockedBy?: string; // what prevents execution
  createdAt: number;
}

export interface NPCProfile {
  id: string;
  name: string;

  // Core identity
  personality: string; // concise personality description
  goals: string[]; // active goals (simple strings or goal items)
  goalStack?: NPCGoalItem[]; // structured goal items for GOAP
  fears: string[];
  values: string[];
  beliefs: string[];
  behaviorPatterns: string[];

  // Knowledge & memory
  knowledge: string[]; // things this NPC knows
  forbiddenKnowledge: string[]; // things this NPC explicitly does NOT know
  memories: NPCMemoryEntry[];

  // Relationships (asymmetric: this NPC's view of others)
  relationships: Record<string, NPCRelationshipVector>;

  // Emotion & Perception
  emotionState?: NPCEmotionState;
  perceptionState?: NPCPerceptionState;
  combatState?: NPCCombatState;

  // Current state
  currentLocation: string;
  currentActivity: string;
  currentMood: string;
  physicalState: string; // injuries, fatigue, etc.
  schedule: NPCScheduleEntry[];
  intentions: NPCIntention[];
  longTermObjectives: string[];

  // Internal thought (never shown to player directly)
  lastInternalThought?: string;

  // Meta
  isPresent: boolean; // currently in the scene
  isActive: boolean; // has active objectives requiring evaluation
  lastUpdatedChapter?: string;
  lastUpdatedTimestamp: number;
}

export interface RelationshipEvent {
  id: string;
  npc: string;
  target: string;
  event: string;
  significance: number; // 0.0 to 1.0
  change: string; // description of what changed
  memoryCreated: boolean;
  timestamp: number;
  chapter?: string;
}

export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  importance: 'minor' | 'major' | 'critical';
  participants: string[];
  timestamp: number;
  resolved: boolean;
}

export interface QuestItem {
  id: string;
  title: string;
  description: string;
  issuedBy: string; // NPC ID
  targetTarget?: string;
  reward?: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: number;
}

export interface NPCWorldState {
  profiles: Record<string, NPCProfile>;
  relationshipEvents: RelationshipEvent[];
  globalScheduleOverrides: string[]; // events that disrupt all routines
  activeEvents?: WorldEvent[];
  activeQuests?: QuestItem[];
  villageTension?: number; // 0 to 100
  lastEvaluatedTimestamp: number;
}

export interface RinDynamicStats {
  chakra: {
    primaryCurrent: number;
    primaryMax: number;
    secondaryCurrent: number;
    secondaryMax: number;
    flowState: 'balanced' | 'draining' | 'absorbing' | 'overcharged';
  };
  vitality: {
    healthCurrent: number;
    healthMax: number;
    fatigueLevel: 'none' | 'light' | 'moderate' | 'exhausted';
    regenArmorActive: boolean;
  };
  perception: {
    thirdEyeActive: boolean;
    thirdEyeMode: 'reposo' | 'analisis_flujo' | 'vista_remota' | 'sobrecarga';
    remoteRangeMeters: number;
    phantomNodesCount: number;
    spatialAnchorActive: boolean;
  };
  mokuton: {
    activeRootsDensity: number;
    putrefactionCycleActive: boolean;
    storedBioEnergy: number;
    explosiveFruits: number;
    sleepSporesVials: number;
    clonesActive: number;
  };
  spiritAllies: {
    kaliSummoned: boolean;
    kaliSpiritualAbsorption: boolean;
    kaliAccumulatedInton: number;
    shivaConditionalSealLocked: boolean;
  };
  tacticalStatus: {
    location: string;
    currentThreat: string;
    ecosystemHealth: number;
  };
}

export interface Chapter {
  id: string;
  numberRoman: string;
  title: string;
  synopsis: string;
  messageIdStart: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  chapterId?: string;
}

export interface Story {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  chapters: Chapter[];
  memory: StoryMemory;
  rinStats?: RinDynamicStats;
  activeChapterId?: string;
}

export type GMProviderId = 'gemini-pro' | 'gemini-flash' | 'qwen-local' | 'mock-quota' | 'offline';

export interface GMProviderStatus {
  activeProviderId: GMProviderId;
  activeProviderName: string;
  isFallback: boolean;
  fallbackReason?: string;
  displayText:
    | 'GM: Gemini Pro'
    | 'GM: Gemini Flash — Fallback'
    | 'GM: Qwen Local — Fallback'
    | 'GM: Offline — No provider'
    | string;
  availableProviders?: GMProviderId[];
}

export interface OpenAIConfig {
  apiKey?: string;
  model: string;
  temperature?: number;
}

export type AudioCategory =
  | 'combat'
  | 'tension'
  | 'emotional'
  | 'mystery'
  | 'ambient'
  | 'climax'
  | 'sorrow'
  | 'village'
  | 'jutsu'
  | 'stealth';

export type AudioIntensity = 'low' | 'medium' | 'high' | 'epic';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  filename: string;
  url: string;
  fileSize: number; // in bytes
  format: string; // 'mp3' | 'opus' | 'wav' | 'm4a' | 'aac'
  category: AudioCategory;
  intensity: AudioIntensity;
  emotionalState: string; // e.g. 'melancholy', 'fury', 'calm', 'epic dread', 'heroic resolve'
  associatedCharacters: string[]; // e.g. ['Rin', 'Itachi', 'Kālī', 'Orochimaru', 'Sasuke']
  situations: string[]; // e.g. ['Susanoo Awakening', 'Mokuton Deployment', 'Post-battle silence', 'Stealth']
  priority: number; // 1-10
  licenseOrigin: string; // e.g. 'Local User Asset', 'Creative Commons', 'Fair Use / Private Study'
  storageLocation: string; // 'default' or subfolder
  volumeModifier: number; // 0.1 to 1.5
  loop: boolean;
  thumbnailUrl?: string;
  sourceUrl?: string;
  createdAt: number;
}

export interface AudioInspectionResult {
  title: string;
  artist: string;
  duration: number;
  thumbnailUrl?: string;
  webpageUrl: string;
  suggestedCategory: AudioCategory;
  suggestedIntensity: AudioIntensity;
  suggestedEmotionalState: string;
  suggestedCharacters: string[];
  formats: string[];
}

export interface AudioImportRequest {
  url: string;
  title: string;
  artist: string;
  category: AudioCategory;
  intensity: AudioIntensity;
  emotionalState: string;
  associatedCharacters: string[];
  situations: string[];
  priority: number;
  licenseOrigin: string;
  storageSubdir?: string;
  normalizeAudio?: boolean;
  outputFormat?: 'mp3' | 'opus' | 'wav' | 'm4a';
  cookiesContent?: string;
}

export interface AudioMusicIntent {
  track: string; // e.g. 'glued_state' | 'nervous' | 'confrontment' | 'bad_situation' | 'survival_examination' | 'avenger' | 'avenger_2' | 'orochimaru_theme' | 'sasuke_theme' | 'sasuke_destiny' | 'nine_tail_demon_fox' | 'evil' | 'ambient_theme' | 'none'
  intensity: number; // 0.0 to 1.0
  transition: 'continue' | 'crossfade' | 'fade_in' | 'fade_out';
}

export interface AudioAmbienceIntent {
  environment:
    'forest' | 'forest_night' | 'village' | 'cave' | 'rain' | 'ruins' | 'silence' | string;
  intensity: number; // 0.0 to 1.0
}

export interface AudioSFXIntent {
  event:
    | 'mokuton_grow'
    | 'chakra_surge'
    | 'raiton_spark'
    | 'kunai_throw'
    | 'branch_crack'
    | 'impact_heavy'
    | 'body_collapse'
    | 'wind_gust'
    | 'susanoo_hum'
    | string;
  intensity: number; // 0.0 to 1.0
}

export interface AudioDirectorIntent {
  music: AudioMusicIntent;
  ambience: AudioAmbienceIntent;
  sfx?: AudioSFXIntent[];
}

export interface AudioEngineMatchResult {
  matchedTrack: AudioTrack | null;
  score: number;
  reason: string;
  detectedMood?: string;
  detectedCategory?: AudioCategory;
  detectedCharacters?: string[];
  detectedEnvironment?: string;
  alternatives?: AudioTrack[];
  intent?: AudioDirectorIntent;
}
