import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import OpenAI from 'openai';
import { buildSystemPrompt } from './server/prompts';
import { StoryMemory, AudioImportRequest } from './src/types';
import {
  getSystemAudioStatus,
  inspectUrl,
  executeYtDlpAndNormalize,
  processBatchAudioUrls,
  syncCanonicalOstCollection,
  processUploadedAudio,
  getLibrary,
  updateTrack,
  deleteTrack,
  matchTrackForScene,
  getYouTubeCookiesInfo,
  saveYouTubeCookies,
  deleteYouTubeCookies,
} from './server/audioManager';
import {
  AUDIO_ROOT_DIR,
  ensureAudioStructure,
  getAudioLibrarySetupStatus,
  executeAudioLibrarySetup,
  rescanAndRebuildMetadata,
  addProgressListener,
  removeProgressListener,
  queryOrganizedAudio,
} from './server/audioLibrarySetup';
import { evaluateAIAudioDirector } from './server/aiAudioDirector';
import { getSFXProvider } from './server/sfxProvider';
import { analyzeWavFile } from './server/audioAnalyzer';
import { updateCachedSFXStatus } from './server/audioCache';
import { GMProviderRouter } from './server/providers/GMProviderRouter';
import { setMockScenario, getActiveMockScenario } from './server/providers/MockQuotaProvider';
import { persistentShinobiState } from './server/simulation/persistentStateManager';
import { extractActionProposalFromText } from './server/ai/intentExtractor';
import { processActionProposalPipeline } from './server/simulation/actionProposalPipeline';

dotenv.config();

const app = express();
const PORT = 3000;

let gmRouter = new GMProviderRouter(process.env.MOCK_MODE === 'true');

app.use(express.json({ limit: '10mb' }));

// Ensure audio directory structure exists at startup
ensureAudioStructure();

// Static audio files serving
const AUDIO_DIR = path.join(process.cwd(), 'storage', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}
app.use('/audio-files', express.static(AUDIO_DIR));
app.use('/audio', express.static(AUDIO_ROOT_DIR));
app.use('/data/audio', express.static(path.join(process.cwd(), 'data', 'audio')));

// Multer upload config
const upload = multer({
  dest: path.join(process.cwd(), 'storage', 'temp'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Helper to get OpenAI client
function getOpenAIClient(clientKey?: string): OpenAI | null {
  const apiKey = clientKey || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_OPENAI_API_KEY') {
    return null;
  }
  return new OpenAI({ apiKey: apiKey.trim() });
}

// Config endpoint
app.get('/api/config', async (_req: Request, res: Response) => {
  const envKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  const hasServerKey = Boolean(envKey && envKey.trim() !== '' && envKey !== 'MY_GEMINI_API_KEY' && envKey !== 'MY_OPENAI_API_KEY');
  const defaultModel = process.env.GEMINI_PRO_MODEL || process.env.OPENAI_MODEL || 'gemini-1.5-pro';
  const status = await gmRouter.getStatus();
  res.json({
    hasServerKey,
    defaultModel,
    freeOnlyMode: gmRouter.isFreeOnlyMode(),
    gmStatus: status,
  });
});

// GM Status endpoint
app.get('/api/gm/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await gmRouter.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener estado del GM Router' });
  }
});

// GM Mock Config endpoint for testing & simulation
app.post('/api/gm/mock-config', (req: Request, res: Response): void => {
  const { scenario, config, useMock } = req.body as {
    scenario?: any;
    config?: any;
    useMock?: boolean;
  };
  if (useMock !== undefined) {
    gmRouter = new GMProviderRouter(Boolean(useMock));
  }
  if (scenario) {
    setMockScenario(scenario);
  } else if (config) {
    setMockScenario(config);
  }
  res.json({ success: true, scenario: getActiveMockScenario() });
});

// Audio System Status endpoint
app.get('/api/audio/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await getSystemAudioStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener estado del subsistema de audio' });
  }
});

// Inspect audio source via yt-dlp
app.post('/api/audio/inspect', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as { url: string };
  if (!url || typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'Se requiere una URL válida.' });
    return;
  }

  try {
    const inspection = await inspectUrl(url.trim());
    res.json(inspection);
  } catch (err: any) {
    console.error('Inspection error:', err);
    res.status(500).json({
      error: `Error al inspeccionar la fuente con yt-dlp: ${err.message || 'URL no compatible o inaccesible.'}`,
    });
  }
});

// Import and convert audio via yt-dlp & ffmpeg
app.post('/api/audio/import', async (req: Request, res: Response): Promise<void> => {
  const request = req.body as AudioImportRequest;
  if (!request.url || !request.url.trim()) {
    res.status(400).json({ error: 'Se requiere una URL para la importación.' });
    return;
  }

  try {
    const track = await executeYtDlpAndNormalize(request);
    res.json({ success: true, track });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({
      error: `Error en la descarga/conversión: ${err.message || 'Fallo durante el procesamiento con yt-dlp/ffmpeg.'}`,
    });
  }
});

// Single URL download, FFmpeg normalization & metadata updater endpoint
app.post('/api/audio/ytdlp-download', async (req: Request, res: Response): Promise<void> => {
  const { url, normalizeAudio, outputFormat, targetSubdir, metadata } = req.body as {
    url: string;
    normalizeAudio?: boolean;
    outputFormat?: string;
    targetSubdir?: string;
    metadata?: Partial<AudioImportRequest>;
  };

  if (!url || !url.trim()) {
    res.status(400).json({ error: 'Se requiere el parámetro "url".' });
    return;
  }

  try {
    const track = await executeYtDlpAndNormalize(url, {
      normalize: normalizeAudio,
      outputFormat,
      targetSubdir,
      customMetadata: metadata,
    });
    res.json({ success: true, track });
  } catch (err: any) {
    console.error('yt-dlp processing error:', err);
    res.status(500).json({
      error: `Error al procesar URL con yt-dlp y FFmpeg: ${err.message || 'Fallo en la descarga/conversión.'}`,
    });
  }
});

// Batch processor endpoint: executes yt-dlp on array of URLs, normalizes with FFmpeg & updates metadata
app.post('/api/audio/process-urls', async (req: Request, res: Response): Promise<void> => {
  const { urls, normalizeAudio, outputFormat, targetSubdir } = req.body as {
    urls: Array<string | { url: string; metadata?: Partial<AudioImportRequest> }>;
    normalizeAudio?: boolean;
    outputFormat?: string;
    targetSubdir?: string;
  };

  if (!Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: 'Se requiere un arreglo de URLs en el campo "urls".' });
    return;
  }

  try {
    const result = await processBatchAudioUrls(urls, {
      normalize: normalizeAudio,
      outputFormat,
      targetSubdir,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Batch audio processing error:', err);
    res.status(500).json({
      error: `Error en el procesamiento por lotes: ${err.message || 'Fallo general en la ejecución de yt-dlp/FFmpeg.'}`,
    });
  }
});

// Sync canonical Naruto OST collection according to audio module
app.post('/api/audio/sync-canonical-batch', async (req: Request, res: Response): Promise<void> => {
  const { normalizeAudio } = req.body as { normalizeAudio?: boolean };
  try {
    const result = await syncCanonicalOstCollection({ normalize: normalizeAudio });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Canonical sync error:', err);
    res.status(500).json({
      error: `Error al sincronizar colección canónica: ${err.message || 'Fallo en la descarga.'}`,
    });
  }
});

// Upload local audio file
app.post('/api/audio/upload', upload.single('audioFile'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No se ha adjuntado ningún archivo de audio.' });
    return;
  }

  try {
    let metadata: any = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch {
        metadata = req.body;
      }
    } else {
      metadata = req.body;
    }

    const track = await processUploadedAudio(req.file, metadata);
    res.json({ success: true, track });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Error al procesar el archivo local de audio' });
  }
});

// Get all library tracks
app.get('/api/audio/library', (_req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const tracks = getLibrary();
    res.json({ tracks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener biblioteca de audio' });
  }
});

// YouTube Cookies endpoints
app.get('/api/audio/cookies', (_req: Request, res: Response) => {
  const info = getYouTubeCookiesInfo();
  res.json(info);
});

app.post('/api/audio/cookies', (req: Request, res: Response): void => {
  const { cookiesContent } = req.body as { cookiesContent: string };
  if (!cookiesContent || typeof cookiesContent !== 'string') {
    res.status(400).json({ error: 'Se requiere el contenido del archivo de cookies.' });
    return;
  }
  try {
    saveYouTubeCookies(cookiesContent);
    res.json({ success: true, info: getYouTubeCookiesInfo() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al guardar cookies' });
  }
});

app.delete('/api/audio/cookies', (_req: Request, res: Response) => {
  try {
    deleteYouTubeCookies();
    res.json({ success: true, info: getYouTubeCookiesInfo() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar cookies' });
  }
});

// Assetize Audio Endpoint: Promotes a generated/auditioned sound into the permanent asset catalog
app.post('/api/audio/assetize', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as AssetizeRequest;
    if (!body.fileUrl || !body.event) {
      res.status(400).json({ error: 'Se requieren "fileUrl" y "event" para assetear el sonido.' });
      return;
    }
    const result = await assetizeAudioFile(body);
    res.json(result);
  } catch (err: any) {
    console.error('Assetize error:', err);
    res.status(500).json({ error: err.message || 'Error al assetear el sonido' });
  }
});

// Update audio track metadata
app.put('/api/audio/track/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = updateTrack(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Pista de audio no encontrada.' });
      return;
    }
    res.json({ success: true, track: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar pista' });
  }
});

// Delete audio track and physical file
app.delete('/api/audio/track/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const deleted = deleteTrack(id);
    if (!deleted) {
      res.status(404).json({ error: 'Pista de audio no encontrada.' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar pista' });
  }
});

// ==========================================
// AUDIO LIBRARY SETUP & MANAGEMENT ENDPOINTS
// ==========================================

// Get Setup & Library Health Status
app.get('/api/audio/setup/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await getAudioLibrarySetupStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener estado de instalación' });
  }
});

// Trigger Automatic Setup / Install
app.post('/api/audio/setup/install', async (req: Request, res: Response): Promise<void> => {
  const { forceReinstall, convertWithFfmpeg } = req.body || {};
  try {
    const result = await executeAudioLibrarySetup({
      forceReinstall: Boolean(forceReinstall),
      convertWithFfmpeg: Boolean(convertWithFfmpeg),
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al ejecutar Audio Library Setup' });
  }
});

// SSE Progress Stream for real-time progress bar
app.get('/api/audio/setup/stream', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: any) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // client disconnected
    }
  };

  addProgressListener(sendEvent);

  // Send initial ping
  sendEvent({ step: 'init', percent: 0, message: 'Conectado al canal de instalación de audio...' });

  req.on('close', () => {
    removeProgressListener(sendEvent);
  });
});

// Rescan & Rebuild Metadata
app.post('/api/audio/setup/rescan', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await rescanAndRebuildMetadata();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al reescanear biblioteca' });
  }
});

// Get Central Sources Config
app.get('/api/audio/setup/sources-config', (_req: Request, res: Response) => {
  res.json(AUDIO_SOURCES_CONFIG);
});

// Semantic Audio Query for Game Master / Audio Engine
app.post('/api/audio/query', (req: Request, res: Response) => {
  try {
    const criteria = req.body || {};
    const matched = queryOrganizedAudio(criteria);
    res.json({ success: true, matched });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al consultar audio' });
  }
});


// Match track for scene (Smart Audio Engine)
app.use('/audio/generated', express.static(path.join(process.cwd(), 'data', 'audio', 'generated')));

app.post('/api/audio/match', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sceneText, tacticalContext } = req.body as {
      sceneText: string;
      tacticalContext?: any;
    };
    const evaluation = await evaluateAIAudioDirector(sceneText || '', tacticalContext);
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al evaluar AI Audio Director V3' });
  }
});

app.post('/api/audio/analyze', (req: Request, res: Response): void => {
  try {
    const { fileUrl, filePath } = req.body;
    let targetPath = filePath;
    if (!targetPath && fileUrl) {
      targetPath = path.join(process.cwd(), 'data', fileUrl.replace('/audio/', 'audio/'));
    }
    const analysis = analyzeWavFile(targetPath || '');
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al analizar archivo de audio' });
  }
});

app.post('/api/audio/generate-woosh-direct', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, event, material, intensity, bypassCache } = req.body;
    const woosh = new WooshSFXProvider();
    const result = await woosh.generateWooshDirect(prompt || 'short cinematic game foley', {
      event: event || 'manual_test',
      material: material || 'neutral',
      intensity: intensity || 0.8,
      bypassCache: bypassCache ?? true,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      aiGenerationConfirmed: false,
      errorReason: err.message || 'Error al ejecutar generación directa de Woosh',
    });
  }
});


// Chat stream endpoint using GM Provider Router
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { messages, memory, rinStats, chapters, storyTitle, model, apiKey } = req.body as {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    memory?: StoryMemory;
    rinStats?: any;
    chapters?: any[];
    storyTitle?: string;
    model?: string;
    apiKey?: string;
    npcContext?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'invalid_request', message: 'messages is required and must be an array' });
    return;
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // Extract ActionProposal from last user message or playerAction
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const actionInput = req.body.playerAction || (lastUserMessage ? lastUserMessage.content : '');

    const proposal = extractActionProposalFromText(actionInput);
    const pipelineResult = processActionProposalPipeline(proposal);
    const lastSimResult = pipelineResult.simulationResults.length > 0
      ? pipelineResult.simulationResults[pipelineResult.simulationResults.length - 1]
      : undefined;

    const systemPrompt = buildSystemPrompt({
      memory,
      rinStats,
      chapters,
      storyTitle,
      npcContext: req.body.npcContext,
      simulationResult: lastSimResult,
    });

    await gmRouter.generateStream(
      {
        messages,
        systemPrompt,
        temperature: 0.85,
        apiKey,
        model,
      },
      (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      },
      (meta) => {
        res.write(`data: ${JSON.stringify({ providerInfo: meta })}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('[GM Router] Stream error:', error);
    const errorMessage = error?.message || 'Error al comunicarse con el Game Master.';
    const offlineMeta = {
      providerId: 'offline',
      providerName: 'Offline',
      isFallback: true,
      displayText: 'GM: Offline — No provider',
    };
    res.write(`data: ${JSON.stringify({ error: errorMessage, providerInfo: offlineMeta })}\n\n`);
    res.end();
  }
});

// Memory analysis and background synchronization
app.post('/api/memory/sync', async (req: Request, res: Response): Promise<void> => {
  const { messages, currentMemory, model, apiKey } = req.body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    currentMemory: StoryMemory;
    model?: string;
    apiKey?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'invalid_request', message: 'messages is required and must be an array' });
    return;
  }

  const openai = getOpenAIClient(apiKey);
  if (!openai) {
    res.status(400).json({ error: 'No OpenAI client available' });
    return;
  }

  try {
    const lastExchanges = messages.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    
    const extractionPrompt = `
Eres el subsistema de memoria silenciosa del RPG de Naruto.
Analiza los últimos intercambios de la historia y actualiza la estructura de memoria.
Devuelve EXCLUSIVAMENTE un JSON válido con la estructura solicitada.

ESTADO PREVIO DE MEMORIA:
${JSON.stringify(currentMemory, null, 2)}

ÚLTIMOS INTERCAMBIOS:
${lastExchanges}

INSTRUCCIONES DE ACTUALIZACIÓN:
1. factual: Actualiza el estado físico si hubo heridas/fatiga, inventario gastado/obtenido, rango o acompañantes.
2. episodic: Si ocurrió un hecho relevante, agrega un nuevo evento (id único, timestamp actual, resumen conciso, importance: low|medium|high). Mantén máximo 15 eventos recientes.
3. techniques: Si el jugador usó o entrenó un jutsu, añade o actualiza su registro (mastery: MENTIONED | EXPERIMENTAL | USED | LEARNED | CONFIRMED).
4. relational: Si interactuó con un NPC, actualiza la actitud o vínculo.
5. timeline: Añade una entrada si hubo avance temporal significativo.
6. world: Añade a timelineDeviations si los eventos se alejaron del canon original.
7. atmosphere: Actualiza timeOfDay ('amanecer'|'mañana'|'mediodía'|'tarde'|'atardecer'|'noche'|'madrugada'), weather ('despejado'|'lluvia_suave'|'lluvia_torrencial'|'nublado'|'viento_calido'|'nieve'|'niebla'|'tormenta'), locationName, moodDescription y acousticDetails según el fluir de la narración.
8. journal: Conserva y enriquece las memorias cotidianas, las personas registradas con frases memorables, lugares descubiertos y estado de la habitación si se interactuó con ellos.
9. npcUpdates: Si un NPC estuvo presente o fue mencionado, actualiza su estado.

Para npcUpdates, extrae:
- profileUpdates: Diccionario por ID de NPC (ej. "naruto", "sasuke", "sakura", "kakashi", "orochimaru")
  - Para cada uno, actualiza "currentMood", "physicalState", "currentActivity" si cambiaron.
  - "knowledgeGained": lista de secretos o información nueva que aprendió.
  - "intentionsUpdate": lista de objetos { action, target, motivation, urgency }.
  - "relationshipChanges": Diccionario por targetId de cambios en las métricas (ej. { "rin": { "trust": 0.1, "respect": -0.1 } })
  - "newMemory": { event, emotionalSignificance (0.0 a 1.0) } si hubo una experiencia significativa.
- relationshipEvents: Lista de eventos si hubo un cambio profundo en una relación (npc, target, event, significance (0.0-1.0), change).

FORMATO DE SALIDA (SOLO JSON):
{
  "factual": { "character": "...", "village": "...", "clan": "...", "rank": "...", "companions": [], "inventory": [], "currentStatus": "..." },
  "episodic": [ ... ],
  "techniques": [ { "name": "...", "type": "...", "mastery": "...", "notes": "..." } ],
  "relational": [ { "targetName": "...", "relationship": "...", "attitude": "..." } ],
  "knowledge": { "secrets": [], "publicKnowledge": [], "falseBeliefs": [] },
  "world": { "currentVillageState": "...", "activeAlliances": [], "timelineDeviations": [] },
  "timeline": [ { "time": "...", "description": "..." } ],
  "atmosphere": { "timeOfDay": "...", "weather": "...", "locationName": "...", "moodDescription": "...", "acousticDetails": "..." },
  "journal": {
    "memories": [ { "id": "...", "title": "...", "snippet": "...", "location": "...", "timeOfDay": "...", "weather": "...", "emotionalTone": "...", "charactersInvolved": [], "userReflection": "...", "timestamp": 0 } ],
    "people": [ { "name": "...", "relationship": "...", "attitude": "...", "memorableQuote": "...", "sharedMoments": [], "lastInteraction": "..." } ],
    "discoveredPlaces": [ { "id": "...", "name": "...", "type": "...", "locationArea": "...", "description": "...", "sensoryAtmosphere": "...", "peaceRating": 5, "discoveredAt": 0 } ],
    "room": { "deskItems": [], "herbsAndPlants": [], "souvenirs": [], "windowView": "...", "roomAtmosphere": "...", "notes": [] },
    "customEntries": [ { "id": "...", "title": "...", "content": "...", "timestamp": 0, "tags": [] } ]
  },
  "npcUpdates": {
    "profileUpdates": {
      "npcId_ejemplo": {
        "currentMood": "...",
        "physicalState": "...",
        "currentActivity": "...",
        "knowledgeGained": ["..."],
        "intentionsUpdate": [{"action": "...", "target": "...", "motivation": "...", "urgency": "low|medium|high"}],
        "relationshipChanges": { "targetId": { "trust": 0.05 } },
        "newMemory": { "event": "...", "emotionalSignificance": 0.8 }
      }
    },
    "relationshipEvents": [ { "npc": "...", "target": "...", "event": "...", "significance": 0.8, "change": "..." } ]
  }
}
`;

    const completion = await openai.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: extractionPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      
      // Update memory structure safely preserving npcWorld
      const updatedMemory = { ...currentMemory, ...parsed };
      
      if (parsed.npcUpdates) {
        updatedMemory.npcUpdates = parsed.npcUpdates;
      }
      
      res.json({ success: true, memory: updatedMemory });
      return;
    }

    res.json({ success: false, memory: currentMemory });
  } catch (err: any) {
    console.error('Memory sync error:', err);
    res.json({ success: false, memory: currentMemory });
  }
});

import {
  getRelevantNPCs,
  evaluateNPCInitiative,
  buildNPCPromptContext,
  runWorldSimulationStep,
} from './server/npcEngine';
import { CozyAtmosphere, EpisodicEvent, NPCWorldState } from './src/types';

// World Simulation Endpoint (Off-Screen Simulation Tick)
app.post('/api/world/simulate', (req: Request, res: Response): void => {
  try {
    const { npcWorld, atmosphere, companions, recentEvents } = req.body as {
      npcWorld?: NPCWorldState;
      atmosphere?: CozyAtmosphere;
      companions?: string[];
      recentEvents?: EpisodicEvent[];
    };

    if (!npcWorld) {
      res.status(400).json({ error: 'npcWorld is required' });
      return;
    }

    const defaultAtmosphere: CozyAtmosphere = atmosphere || {
      timeOfDay: 'mediodía',
      weather: 'despejado',
      locationName: 'Aldea Oculta de la Hoja',
      moodDescription: 'Tranquilo',
      acousticDetails: '',
    };

    const simulatedWorld = runWorldSimulationStep(
      npcWorld,
      defaultAtmosphere,
      companions || [],
      recentEvents || []
    );

    res.json({ success: true, npcWorld: simulatedWorld });
  } catch (err: any) {
    console.error('World simulation error:', err);
    res.status(500).json({ error: err.message || 'Error al ejecutar simulación del mundo' });
  }
});

// NPC Evaluation Endpoint
app.post('/api/npc/context', (req: Request, res: Response) => {
  try {
    const { npcWorld, atmosphere, companions, locationName, recentEvents, currentChapter } = req.body as {
      npcWorld?: NPCWorldState;
      atmosphere?: CozyAtmosphere;
      companions?: string[];
      locationName?: string;
      recentEvents?: EpisodicEvent[];
      currentChapter?: string;
    };
    
    if (!npcWorld) {
      res.json({ npcContext: '', npcWorld: null });
      return;
    }
    
    const defaultAtmosphere: CozyAtmosphere = atmosphere || {
      timeOfDay: 'mediodía',
      weather: 'despejado',
      locationName: locationName || 'Aldea Oculta de la Hoja',
      moodDescription: '',
      acousticDetails: '',
    };

    // Run deterministic world simulation tick first
    const simulatedWorld = runWorldSimulationStep(
      npcWorld,
      defaultAtmosphere,
      companions || [],
      recentEvents || []
    );

    const relevantNPCs = getRelevantNPCs(
      simulatedWorld, 
      companions || [], 
      locationName || ''
    );
    
    const initiatives = evaluateNPCInitiative(
      simulatedWorld,
      defaultAtmosphere,
      recentEvents || [],
      currentChapter
    );
    
    const timeOfDay = defaultAtmosphere.timeOfDay;
    const npcContext = buildNPCPromptContext(simulatedWorld, relevantNPCs, initiatives, timeOfDay);
    
    res.json({ npcContext, npcWorld: simulatedWorld });
  } catch (err: any) {
    console.error('NPC context error:', err);
    res.status(500).json({ error: 'Failed to build NPC context' });
  }
});

// SIMULATION ENGINE ENDPOINTS
import { RIN_MASTER_TECHNIQUES, getTechniqueByIdOrName, getTechniquesByCategory } from './server/simulation/techniqueRegistry';
import { executeTechniqueSimulation } from './server/simulation/shinobiSimulationEngine';
import { INITIAL_RIN_CHAKRA_STATE } from './server/simulation/chakraEngine';
import { ActionQueueManager } from './server/simulation/actionQueue';

const globalActionQueue = new ActionQueueManager();

// GET /api/jutsus
app.get('/api/jutsus', (req: Request, res: Response): void => {
  try {
    const category = req.query.category as string | undefined;
    const type = req.query.type as string | undefined;
    const filter = req.query.filter as string | undefined;

    let list = RIN_MASTER_TECHNIQUES;
    if (category) {
      list = getTechniquesByCategory(category);
    }

    if (type === 'capacidades' || filter === 'capacidades') {
      list = list.filter((t) => t.isExecutableJutsu === false);
    } else {
      // Default: Executable combat jutsus only
      list = list.filter((t) => t.isExecutableJutsu !== false);
    }

    const formattedList = list.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      mastery: t.mastery,
      chakraCost: t.chakraCostBase === undefined ? 'UNSET (No cuantificado)' : t.chakraCostBase,
      basePower: t.basePower === undefined ? 'UNSET (No cuantificado)' : t.basePower,
      rangeMeters: t.effectiveRangeMeters !== undefined ? `${t.effectiveRangeMeters}m (Max: ${t.maxRangeMeters || t.effectiveRangeMeters}m)` : '0m / Personal',
      executionTimeSeconds: `${t.executionTimeSeconds}s`,
      valueSource: t.valueSource || (t.basePower === undefined ? 'UNSET' : 'CANON_DOCUMENTED'),
    }));

    res.json({ success: true, count: formattedList.length, jutsus: formattedList, rawJutsus: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener jutsus' });
  }
});

// GET /api/jutsus/:id
app.get('/api/jutsus/:id', (req: Request, res: Response): void => {
  try {
    const jutsu = getTechniqueByIdOrName(req.params.id);
    if (!jutsu) {
      res.status(404).json({ error: 'Técnica no encontrada o no registrada' });
      return;
    }

    const formattedJutsu = {
      ...jutsu,
      valueSource: jutsu.valueSource || (jutsu.basePower === undefined ? 'UNSET' : 'CANON_DOCUMENTED'),
      chakraCostFormatted: jutsu.chakraCostBase === undefined ? 'UNSET (No cuantificado)' : jutsu.chakraCostBase,
      basePowerFormatted: jutsu.basePower === undefined ? 'UNSET (No cuantificado)' : jutsu.basePower,
      maxSafePowerFormatted: jutsu.maxSafePower === undefined ? 'UNSET (No cuantificado)' : jutsu.maxSafePower,
      maintenanceFormatted: jutsu.maintenanceCostPerTurn === undefined ? 'UNSET (No requiere mantenimiento)' : `${jutsu.maintenanceCostPerTurn} chakra/turno`,
      fatigueFormatted: jutsu.fatigueCoefficient ? `Coeficiente ${jutsu.fatigueCoefficient}x` : 'Estándar (1.0x)',
      rangeFormatted: jutsu.effectiveRangeMeters !== undefined ? `Efectivo: ${jutsu.effectiveRangeMeters}m, Máx: ${jutsu.maxRangeMeters}m` : 'Personal / Rango 0m',
      requirementsFormatted: jutsu.requirements.length > 0 ? jutsu.requirements.join(', ') : 'Ninguno',
      balanceNotes: jutsu.balanceNotes || 'Sin observaciones específicas.',
    };

    res.json({ success: true, jutsu: formattedJutsu, initialChakraState: INITIAL_RIN_CHAKRA_STATE });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener información del jutsu' });
  }
});

// GET /api/simulation/state
app.get('/api/simulation/state', (_req: Request, res: Response): void => {
  res.json({ success: true, persistentState: persistentShinobiState.getState() });
});

// POST /api/simulation/turn
app.post('/api/simulation/turn', (_req: Request, res: Response): void => {
  const maintenanceResult = persistentShinobiState.processTurnMaintenance();
  res.json({ success: true, ...maintenanceResult });
});

// POST /api/simulation/rest
app.post('/api/simulation/rest', (req: Request, res: Response): void => {
  const { minutes } = req.body || {};
  const updatedState = persistentShinobiState.rest(minutes || 15);
  res.json({ success: true, persistentState: updatedState });
});

// POST /api/simulation/reset
app.post('/api/simulation/reset', (_req: Request, res: Response): void => {
  const resetState = persistentShinobiState.resetToDefault();
  res.json({ success: true, persistentState: resetState });
});

// POST /api/simulation/resolve
app.post('/api/simulation/resolve', (req: Request, res: Response): void => {
  try {
    const { techniqueQuery, intensity, targetEnemy, chakraState, physicalState, combatState, seed } = req.body;
    const currentState = persistentShinobiState.getState();

    const activeChakra = chakraState || currentState.chakraState;
    const activePhysical = physicalState || currentState.physicalState;
    const activeCombat = combatState || currentState.combatState;

    const result = executeTechniqueSimulation({
      techniqueQuery,
      intensity,
      targetEnemy,
      chakraState: activeChakra,
      physicalState: activePhysical,
      combatState: activeCombat,
      seed,
    });

    const tech = getTechniqueByIdOrName(techniqueQuery);
    const updatedPersistentState = persistentShinobiState.applySimulationResult(result, tech);

    res.json({
      success: true,
      simulationResult: result,
      persistentState: updatedPersistentState,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al ejecutar simulación determinista' });
  }
});

// POST /api/simulation/queue
app.post('/api/simulation/queue', (req: Request, res: Response): void => {
  try {
    const { action, techniqueId, target, intensity, chakraState, physicalState, combatState, seed } = req.body;
    const currentState = persistentShinobiState.getState();

    const activeChakra = chakraState || currentState.chakraState;
    const activePhysical = physicalState || currentState.physicalState;
    const activeCombat = combatState || currentState.combatState;

    if (action === 'enqueue') {
      const item = globalActionQueue.enqueueAction(techniqueId, target, intensity);
      res.json({ success: true, item, queue: globalActionQueue.getQueue() });
      return;
    }

    if (action === 'clear') {
      globalActionQueue.clearQueue();
      res.json({ success: true, queue: [] });
      return;
    }

    if (action === 'resolveNext') {
      const { resolvedItem, simulationResult, remainingQueue } = globalActionQueue.resolveNextAction(
        activeChakra,
        activePhysical,
        activeCombat,
        target,
        seed
      );

      let updatedPersistentState = currentState;
      if (simulationResult && resolvedItem) {
        const tech = getTechniqueByIdOrName(resolvedItem.techniqueId);
        updatedPersistentState = persistentShinobiState.applySimulationResult(simulationResult, tech);
      }

      res.json({
        success: true,
        resolvedItem,
        simulationResult,
        remainingQueue,
        persistentState: updatedPersistentState,
      });
      return;
    }

    res.json({ success: true, queue: globalActionQueue.getQueue() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error en la cola de acciones' });
  }
});

// Serve frontend: In dev mode use Vite middleware, in prod serve dist
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Could not load Vite middleware, falling back to static files', e);
      serveStatic();
    }
  } else {
    serveStatic();
  }
}

function serveStatic() {
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupFrontend().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Naruto RPG server running on http://0.0.0.0:${PORT}`);
    gmRouter.logStartupStatus().catch(() => {});
  });
});

