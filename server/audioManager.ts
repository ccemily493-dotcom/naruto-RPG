import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import {
  AudioTrack,
  AudioCategory,
  AudioIntensity,
  AudioInspectionResult,
  AudioImportRequest,
  AudioEngineMatchResult,
} from '../src/types';

const execFileAsync = promisify(execFile);

const STORAGE_AUDIO_DIR = path.join(process.cwd(), 'storage', 'audio');
const DATA_DIR = path.join(process.cwd(), 'data');
const LIBRARY_FILE = path.join(DATA_DIR, 'audio_library.json');
const COOKIES_FILE = path.join(DATA_DIR, 'youtube_cookies.txt');

// Ensure directories exist
if (!fs.existsSync(STORAGE_AUDIO_DIR)) {
  fs.mkdirSync(STORAGE_AUDIO_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Cookies Management
export function getYouTubeCookiesPath(): string | null {
  if (fs.existsSync(COOKIES_FILE)) {
    try {
      const content = fs.readFileSync(COOKIES_FILE, 'utf-8').trim();
      if (content.length > 10) {
        return COOKIES_FILE;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function getYouTubeCookiesInfo(): { hasCookies: boolean; length: number; preview: string } {
  const p = getYouTubeCookiesPath();
  if (p && fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf-8');
    return {
      hasCookies: true,
      length: content.length,
      preview: content.substring(0, 100) + '...',
    };
  }
  return { hasCookies: false, length: 0, preview: '' };
}

export function saveYouTubeCookies(content: string): void {
  fs.writeFileSync(COOKIES_FILE, content.trim(), 'utf-8');
}

export function deleteYouTubeCookies(): void {
  if (fs.existsSync(COOKIES_FILE)) {
    fs.unlinkSync(COOKIES_FILE);
  }
}

// Find yt-dlp binary path
export function getYtDlpPath(): string {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  const localBin = path.join(process.cwd(), 'bin', binName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  const rootBin = path.join(process.cwd(), binName);
  if (fs.existsSync(rootBin)) {
    return rootBin;
  }
  return binName;
}

// Helper to build standardized yt-dlp arguments
function buildYtDlpArgs(extraArgs: string[] = []): string[] {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    '--extractor-args',
    'youtube:player_client=ios,web,android',
    ...extraArgs,
  ];

  const cookiesPath = getYouTubeCookiesPath();
  if (cookiesPath) {
    args.push('--cookies', cookiesPath);
  }

  return args;
}

// Helper to format YouTube anti-bot errors
function formatYtDlpError(err: any): Error {
  const errOutput = `${err?.message || ''} ${err?.stderr || ''} ${err?.stdout || ''}`;
  if (
    /confirm you’re not a bot|confirm you're not a bot|Sign in to confirm|bot protection|HTTP Error 429/i.test(
      errOutput
    )
  ) {
    return new Error(
      'YouTube ha solicitado verificación anti-bot en la red del servidor Cloud. Puedes subir el archivo de audio directamente en la pestaña "Subir Archivo Local" (100% fiable y sin restricciones de YouTube), usar un enlace directo .mp3/Soundcloud, o configurar tus cookies de YouTube en la Biblioteca.'
    );
  }
  return new Error(err?.message || 'Error durante el procesamiento con yt-dlp');
}

// Find ffmpeg binary path
export function getFfmpegPath(): string {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
  const localBin = path.join(process.cwd(), 'bin', binName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  if (fs.existsSync('/usr/bin/ffmpeg')) {
    return '/usr/bin/ffmpeg';
  }
  return binName;
}

// Load audio library database
export function getLibrary(): AudioTrack[] {
  try {
    if (fs.existsSync(LIBRARY_FILE)) {
      const raw = fs.readFileSync(LIBRARY_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading audio library:', err);
  }
  return [];
}

// Save audio library database
export function saveLibrary(tracks: AudioTrack[]): void {
  try {
    fs.writeFileSync(LIBRARY_FILE, JSON.stringify(tracks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving audio library:', err);
  }
}

// Check system tools availability
export async function getSystemAudioStatus(): Promise<{
  ytDlpAvailable: boolean;
  ytDlpVersion?: string;
  ffmpegAvailable: boolean;
  ffmpegVersion?: string;
  storageDir: string;
  totalTracks: number;
}> {
  let ytDlpAvailable = false;
  let ytDlpVersion: string | undefined;
  let ffmpegAvailable = false;
  let ffmpegVersion: string | undefined;

  try {
    const ytDlpBin = getYtDlpPath();
    const { stdout } = await execFileAsync(ytDlpBin, ['--version']);
    ytDlpAvailable = true;
    ytDlpVersion = stdout.trim();
  } catch {
    ytDlpAvailable = false;
  }

  try {
    const ffmpegBin = getFfmpegPath();
    const { stdout } = await execFileAsync(ffmpegBin, ['-version']);
    ffmpegAvailable = true;
    ffmpegVersion = stdout.split('\n')[0]?.trim();
  } catch {
    ffmpegAvailable = false;
  }

  const tracks = getLibrary();

  return {
    ytDlpAvailable,
    ytDlpVersion,
    ffmpegAvailable,
    ffmpegVersion,
    storageDir: STORAGE_AUDIO_DIR,
    totalTracks: tracks.length,
  };
}

// Inspect URL metadata with yt-dlp
export async function inspectUrl(url: string): Promise<AudioInspectionResult> {
  const ytDlpBin = getYtDlpPath();

  const args = buildYtDlpArgs([
    '-J', // dump single JSON
    '--skip-download',
    url.trim(),
  ]);

  try {
    const { stdout } = await execFileAsync(ytDlpBin, args, { maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(stdout);

    const title = data.title || 'Pista de Audio';
    const artist = data.artist || data.uploader || data.channel || 'Desconocido';
    const duration = Math.round(Number(data.duration) || 0);
    const thumbnailUrl = data.thumbnail || undefined;
    const webpageUrl = data.webpage_url || url;

    // Heuristic tag suggestions based on title & description
    const combinedText = `${title} ${data.description || ''}`.toLowerCase();

    let suggestedCategory: AudioCategory = 'ambient';
    let suggestedIntensity: AudioIntensity = 'medium';
    let suggestedEmotionalState = 'calm';
    const suggestedCharacters: string[] = [];

    if (/combat|battle|fight|clash|shippuden|action|surge|duel|war|fury/i.test(combinedText)) {
      suggestedCategory = 'combat';
      suggestedIntensity = 'high';
      suggestedEmotionalState = 'fury & adrenaline';
    } else if (/susanoo|climax|god|awakening|epic|final|apocalypse/i.test(combinedText)) {
      suggestedCategory = 'climax';
      suggestedIntensity = 'epic';
      suggestedEmotionalState = 'heroic resolve & power';
    } else if (/sad|sadness|sorrow|grief|tragedy|requiem|tears|loneliness/i.test(combinedText)) {
      suggestedCategory = 'sorrow';
      suggestedIntensity = 'low';
      suggestedEmotionalState = 'melancholy & loss';
    } else if (/tension|danger|threat|darkness|creepy|evil|shadow|dread/i.test(combinedText)) {
      suggestedCategory = 'tension';
      suggestedIntensity = 'high';
      suggestedEmotionalState = 'dread & danger';
    } else if (/stealth|infiltrat|shadow|covert|secret/i.test(combinedText)) {
      suggestedCategory = 'stealth';
      suggestedIntensity = 'low';
      suggestedEmotionalState = 'stealth & vigilance';
    } else if (/mystery|ancient|prophecy|ghost|spirit|yūrei|secret/i.test(combinedText)) {
      suggestedCategory = 'mystery';
      suggestedIntensity = 'medium';
      suggestedEmotionalState = 'mystic & unknown';
    } else if (/village|konoha|daily|peace|morning|friend/i.test(combinedText)) {
      suggestedCategory = 'village';
      suggestedIntensity = 'low';
      suggestedEmotionalState = 'peace & camaraderie';
    }

    // Character detection
    if (/itachi/i.test(combinedText)) suggestedCharacters.push('Itachi');
    if (/rin|yūrei/i.test(combinedText)) suggestedCharacters.push('Rin');
    if (/kālī|kali/i.test(combinedText)) suggestedCharacters.push('Kālī');
    if (/orochimaru/i.test(combinedText)) suggestedCharacters.push('Orochimaru');
    if (/sasuke/i.test(combinedText)) suggestedCharacters.push('Sasuke');
    if (/naruto/i.test(combinedText)) suggestedCharacters.push('Naruto');
    if (/kakashi/i.test(combinedText)) suggestedCharacters.push('Kakashi');
    if (/madara/i.test(combinedText)) suggestedCharacters.push('Madara');

    const formats: string[] = ['mp3', 'opus', 'wav', 'm4a'];

    return {
      title,
      artist,
      duration,
      thumbnailUrl,
      webpageUrl,
      suggestedCategory,
      suggestedIntensity,
      suggestedEmotionalState,
      suggestedCharacters,
      formats,
    };
  } catch (err: any) {
    throw formatYtDlpError(err);
  }
}

// Canonical Naruto OST metadata definitions matching prompts/audio_direction.md
export const CANONICAL_OST_CONFIG: Record<
  string,
  {
    id: string;
    title: string;
    artist: string;
    category: AudioCategory;
    intensity: AudioIntensity;
    emotionalState: string;
    associatedCharacters: string[];
    situations: string[];
    priority: number;
    volumeModifier: number;
    licenseOrigin: string;
    defaultUrl: string;
    preferredFilename: string;
  }
> = {
  glued_state: {
    id: 'track_naruto_glued_state',
    title: 'Glued State',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'combat',
    intensity: 'high',
    emotionalState: 'estrategia, trampas y análisis táctico',
    associatedCharacters: ['Rin', 'Itachi', 'Orochimaru', 'Sasuke', 'Kakashi'],
    situations: [
      'Enfrentamiento estratégico y táctico',
      'Análisis de recursos y red de tenketsu',
      'Trampas de Mokuton y sellos',
      'Posicionamiento táctico y sustitución (Kawarimi)',
      'Combate planificado y emboscadas',
    ],
    priority: 10,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Combate Estratégico)',
    defaultUrl: 'https://youtu.be/B9ZStkW2LBw?si=Y-2pbHUdvXB0EVX5',
    preferredFilename: 'glued_state.mp3',
  },
  nervous: {
    id: 'track_naruto_nervous',
    title: 'Nervous',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'tension',
    intensity: 'medium',
    emotionalState: 'tensión previa al combate y peligro inminente',
    associatedCharacters: ['Rin', 'Orochimaru', 'Itachi', 'Sasuke'],
    situations: [
      'Tensión previa a un enfrentamiento',
      'Detección de presencia enemiga',
      'Peligro inminente',
      'Silencio antes del ataque',
      'Acecho en las sombras',
    ],
    priority: 9,
    volumeModifier: 0.95,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Tensión Pre-Combate)',
    defaultUrl: 'https://youtu.be/iRyohGCjdVU?si=wBOUN5e3Jq467Z-x',
    preferredFilename: 'nervous.mp3',
  },
  confrontment: {
    id: 'track_naruto_confrontment',
    title: 'Confrontment',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'combat',
    intensity: 'high',
    emotionalState: 'confrontación directa y choque de voluntades',
    associatedCharacters: ['Rin', 'Itachi', 'Orochimaru', 'Sasuke', 'Madara'],
    situations: [
      'Confrontación directa entre personajes importantes',
      'Aparición del enemigo frente a frente',
      'Duelo directo',
      'Inicio del combate frontal',
      'Percusión de batalla shinobi',
    ],
    priority: 9,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Confrontación)',
    defaultUrl: 'https://youtu.be/hBeTadeecU0?si=yn_ePaoW6dtLxJ0b',
    preferredFilename: 'confrontment.mp3',
  },
  bad_situation: {
    id: 'track_naruto_bad_situation',
    title: 'Bad Situation',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'tension',
    intensity: 'high',
    emotionalState: 'situación crítica, desventaja y peligro severo',
    associatedCharacters: ['Rin', 'Itachi', 'Sasuke', 'Kakashi'],
    situations: [
      'Deterioro grave de la situación',
      'Posición desfavorable o acorralamiento',
      'Rin herida o con chakra drenado',
      'Superioridad aplastante del rival',
      'Quiebre defensivo',
    ],
    priority: 9,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Desventaja Crítica)',
    defaultUrl: 'https://youtu.be/HIe3IDCWdpc?si=e5y8jQyy_Hnwf6mb',
    preferredFilename: 'bad_situation.mp3',
  },
  survival_examination: {
    id: 'track_naruto_survival_examination',
    title: 'Survival Examination',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'combat',
    intensity: 'high',
    emotionalState: 'supervivencia, persecución y entorno hostil',
    associatedCharacters: ['Rin', 'Sasuke', 'Naruto', 'Sakura', 'Orochimaru'],
    situations: [
      'Supervivencia en el Bosque de la Muerte',
      'Persecución prolongada entre ramas',
      'Entorno hostil activo',
      'Huida táctica y emboscadas continuas',
    ],
    priority: 8,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Supervivencia)',
    defaultUrl: 'https://youtu.be/_eWVC6Ihtmc?si=ReOvBVF7__3bpDxx',
    preferredFilename: 'survival_examination.mp3',
  },
  avenger: {
    id: 'track_naruto_avenger',
    title: 'Avenger',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'combat',
    intensity: 'high',
    emotionalState: 'rivalidad shinobi, camino del vengador y determinación',
    associatedCharacters: ['Sasuke', 'Itachi', 'Rin'],
    situations: [
      'Rivalidad shinobi y choque de ideales',
      'Camino del vengador y determinación férrea',
      'Duelo personal por convicciones',
      'Conflicto del clan Uchiha',
    ],
    priority: 8,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Rivalidad y Venganza)',
    defaultUrl: 'https://youtu.be/N1OafvtOixQ?si=seYv9obyrQ4foGjx',
    preferredFilename: 'avenger.mp3',
  },
  avenger_2: {
    id: 'track_naruto_avenger_2',
    title: 'Avenger 2 (Clash of Hatred)',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'climax',
    intensity: 'epic',
    emotionalState: 'furia de combate, dolor y conflicto de odio desatado',
    associatedCharacters: ['Sasuke', 'Itachi', 'Kālī', 'Rin'],
    situations: [
      'Clímax de combate y choque violento a muerte',
      'Liberación de odio y rencor desbordado',
      'Agresividad máxima y desesperación',
      'Enfrentamiento fratricida o de alto poder',
    ],
    priority: 9,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Clímax de Odio)',
    defaultUrl: 'https://youtu.be/GX8QNJJR1z0?si=eF29uJ365l_5w99j',
    preferredFilename: 'avenger_2.mp3',
  },
  orochimaru_theme: {
    id: 'track_naruto_orochimaru_theme',
    title: "Orochimaru's Theme / Hokage Duel",
    artist: 'Naruto OST — Toshio Masuda',
    category: 'tension',
    intensity: 'high',
    emotionalState: 'presencia siniestra de Sannin, sello maldito y duelo de Kages',
    associatedCharacters: ['Orochimaru', 'Rin', 'Sasuke', 'Sarutobi'],
    situations: [
      'Presencia activa y amenazante de Orochimaru',
      'Invocación de serpientes gigantes y técnicas prohibidas',
      'Sello Maldito activándose o corrompiendo el chakra',
      'Duelo cumbre de nivel Kage y barrera de cuatro llamas violetas',
    ],
    priority: 10,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Presencia de Orochimaru)',
    defaultUrl: 'https://youtu.be/Q0th4ais3cw?si=iQ7-p7x45yXUomqP',
    preferredFilename: 'orochimaru_theme.mp3',
  },
  sasuke_theme: {
    id: 'track_naruto_sasuke_theme',
    title: "Sasuke's Theme",
    artist: 'Naruto OST — Toshio Masuda',
    category: 'tension',
    intensity: 'medium',
    emotionalState: 'presencia narrativa destacada y activación del Sharingan',
    associatedCharacters: ['Sasuke', 'Rin', 'Itachi'],
    situations: [
      'Sasuke tomando protagonismo en la escena',
      'Activación y lectura táctica con Sharingan',
      'Tensión y orgullo del clan Uchiha',
      'Decisión táctica individual',
    ],
    priority: 8,
    volumeModifier: 0.95,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Tema de Sasuke)',
    defaultUrl: 'https://youtu.be/ltkeXnFT5ZE?si=XbI1P_7m-O5m61sV',
    preferredFilename: 'sasuke_theme.mp3',
  },
  sasuke_destiny: {
    id: 'track_naruto_sasuke_destiny',
    title: 'Sasuke - Destiny',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'emotional',
    intensity: 'high',
    emotionalState: 'destino shinobi, revelaciones familiares y soledad Uchiha',
    associatedCharacters: ['Sasuke', 'Itachi', 'Rin'],
    situations: [
      'Decisión trascendental de Sasuke',
      'Revelación de verdades del clan y lazos rotos',
      'Soledad, pesadumbre y destino ineludible',
      'Despedidas cruciales y encrucijadas morales',
    ],
    priority: 9,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Destino de Sasuke)',
    defaultUrl: 'https://youtu.be/ltkeXnFT5ZE?si=XbI1P_7m-O5m61sV',
    preferredFilename: 'sasuke_destiny.mp3',
  },
  nine_tail_demon_fox: {
    id: 'track_naruto_nine_tail_demon_fox',
    title: 'Nine Tail Demon Fox (Kyūbi no Yōko)',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'climax',
    intensity: 'epic',
    emotionalState: 'poder demoníaco colosal, chakra rojo desbordado y rugido del Kyūbi',
    associatedCharacters: ['Naruto', 'Rin', 'Kālī'],
    situations: [
      'Manifestación del chakra rojo del Kyūbi',
      'Rugido colosal y liberación de manto de chakra',
      'Pérdida de control y peligro inminente de destrucción masiva',
      'Clímax de poder de un Jinchūriki',
    ],
    priority: 10,
    volumeModifier: 1.0,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Poder del Kyūbi)',
    defaultUrl: 'https://youtu.be/HwoQWO1dpmM?si=e5-nN5c-yR2VpPzC',
    preferredFilename: 'nine_tail_demon_fox.mp3',
  },
  evil: {
    id: 'track_naruto_evil',
    title: 'Evil / Dark Omen',
    artist: 'Naruto OST — Toshio Masuda',
    category: 'tension',
    intensity: 'high',
    emotionalState: 'amenazas oscuras, sellos malditos y presencias siniestras',
    associatedCharacters: ['Orochimaru', 'Kālī', 'Rin'],
    situations: [
      'Amenazas oscuras y perturbadoras',
      'Efectos de sellos malditos y experimentos siniestros',
      'Presencia de sombras hostiles desconocidas',
    ],
    priority: 9,
    volumeModifier: 0.95,
    licenseOrigin: 'OST de Naruto (Uso Reservado: Presencia Siniestra)',
    defaultUrl: 'https://youtu.be/Q0th4ais3cw?si=iQ7-p7x45yXUomqP',
    preferredFilename: 'evil.mp3',
  },
};

// Download, normalize with FFmpeg, and update audio library with metadata
export async function executeYtDlpAndNormalize(
  urlOrRequest: string | AudioImportRequest,
  options: {
    normalize?: boolean;
    outputFormat?: string;
    targetSubdir?: string;
    customMetadata?: Partial<AudioImportRequest>;
  } = {}
): Promise<AudioTrack> {
  const ytDlpBin = getYtDlpPath();
  const ffmpegBin = getFfmpegPath();

  const url = typeof urlOrRequest === 'string' ? urlOrRequest.trim() : (urlOrRequest?.url || '').trim();
  const requestMeta = typeof urlOrRequest === 'object' ? urlOrRequest : options.customMetadata || {};

  if (requestMeta.cookiesContent && requestMeta.cookiesContent.trim()) {
    saveYouTubeCookies(requestMeta.cookiesContent);
  }

  // Check if URL matches a canonical OST entry
  let matchedCanonicalKey: string | null = null;
  for (const [key, config] of Object.entries(CANONICAL_OST_CONFIG)) {
    if (
      url.includes(config.defaultUrl) ||
      (config.defaultUrl.includes('youtu.be/') && url.includes(config.defaultUrl.split('youtu.be/')[1].split('?')[0])) ||
      (requestMeta.title && requestMeta.title.toLowerCase().includes(config.title.toLowerCase()))
    ) {
      matchedCanonicalKey = key;
      break;
    }
  }

  const canonicalConfig = matchedCanonicalKey ? CANONICAL_OST_CONFIG[matchedCanonicalKey] : null;

  const id = canonicalConfig?.id || (requestMeta as any).id || `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanSubdir = options.targetSubdir || requestMeta.storageSubdir ? (options.targetSubdir || requestMeta.storageSubdir)!.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  const targetDir = cleanSubdir ? path.join(STORAGE_AUDIO_DIR, cleanSubdir) : STORAGE_AUDIO_DIR;

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const format = options.outputFormat || requestMeta.outputFormat || 'mp3';
  const targetBaseName = canonicalConfig?.preferredFilename
    ? path.basename(canonicalConfig.preferredFilename, path.extname(canonicalConfig.preferredFilename))
    : id;
  const rawFileName = `${targetBaseName}_raw.${format}`;
  const finalFileName = `${targetBaseName}.${format}`;
  const rawFilePath = path.join(targetDir, rawFileName);
  const finalFilePath = path.join(targetDir, finalFileName);

  // 1. Run yt-dlp to download and extract audio
  const ytDlpArgs = buildYtDlpArgs([
    '-x',
    '--audio-format',
    format,
    '--audio-quality',
    '0',
    '-o',
    rawFilePath,
    url,
  ]);

  try {
    await execFileAsync(ytDlpBin, ytDlpArgs, { maxBuffer: 20 * 1024 * 1024 });
  } catch (err: any) {
    throw formatYtDlpError(err);
  }

  // 2. Locate downloaded file
  let downloadedPath = rawFilePath;
  if (!fs.existsSync(downloadedPath)) {
    const files = fs.readdirSync(targetDir);
    const matched = files.find((f) => f.startsWith(`${targetBaseName}_raw`));
    if (matched) {
      downloadedPath = path.join(targetDir, matched);
    } else {
      throw new Error('No se pudo encontrar el archivo descargado por yt-dlp.');
    }
  }

  // 3. Audio Normalization with FFmpeg (EBU R128 standard loudness filter: -16 LUFS, 192k audio)
  const shouldNormalize = options.normalize !== false && requestMeta.normalizeAudio !== false;
  if (shouldNormalize && ffmpegBin) {
    try {
      const ffmpegArgs = [
        '-y',
        '-i',
        downloadedPath,
        '-af',
        'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-b:a',
        '192k',
        finalFilePath,
      ];
      await execFileAsync(ffmpegBin, ffmpegArgs);
      if (fs.existsSync(downloadedPath) && downloadedPath !== finalFilePath) {
        fs.unlinkSync(downloadedPath);
      }
    } catch (normErr) {
      console.warn('Audio normalization warning, keeping original:', normErr);
      if (downloadedPath !== finalFilePath) {
        fs.renameSync(downloadedPath, finalFilePath);
      }
    }
  } else {
    if (downloadedPath !== finalFilePath) {
      fs.renameSync(downloadedPath, finalFilePath);
    }
  }

  // 4. Probe exact duration and file stats
  const stats = fs.statSync(finalFilePath);
  let duration = 0;

  try {
    const { stdout, stderr } = await execFileAsync(ffmpegBin, ['-i', finalFilePath]);
    const output = (stdout || '') + (stderr || '');
    const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (durMatch) {
      duration = Math.round(
        Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + parseFloat(durMatch[3])
      );
    }
  } catch (durErr: any) {
    const output = (durErr.stdout || '') + (durErr.stderr || '');
    const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (durMatch) {
      duration = Math.round(
        Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + parseFloat(durMatch[3])
      );
    }
  }

  const relativeUrl = cleanSubdir
    ? `/audio-files/${cleanSubdir}/${finalFileName}`
    : `/audio-files/${finalFileName}`;

  // 5. Build rich metadata based on canonical config or inspected properties
  const title = requestMeta.title?.trim() || canonicalConfig?.title || 'Pista de Audio Importada';
  const artist = requestMeta.artist?.trim() || canonicalConfig?.artist || 'Naruto OST — Toshio Masuda';
  const category: AudioCategory = requestMeta.category || canonicalConfig?.category || 'combat';
  const intensity: AudioIntensity = requestMeta.intensity || canonicalConfig?.intensity || 'high';
  const emotionalState = requestMeta.emotionalState || canonicalConfig?.emotionalState || 'tensión y combate';
  const associatedCharacters = requestMeta.associatedCharacters?.length
    ? requestMeta.associatedCharacters
    : canonicalConfig?.associatedCharacters || ['Rin'];
  const situations = requestMeta.situations?.length
    ? requestMeta.situations
    : canonicalConfig?.situations || ['Combate y tensión'];
  const priority = Number(requestMeta.priority) || canonicalConfig?.priority || 8;
  const licenseOrigin =
    requestMeta.licenseOrigin ||
    canonicalConfig?.licenseOrigin ||
    'Recurso Local del Usuario (yt-dlp + FFmpeg Normalizado)';
  const volumeModifier = canonicalConfig?.volumeModifier || 1.0;

  const newTrack: AudioTrack = {
    id,
    title,
    artist,
    duration: duration || canonicalConfig?.defaultUrl ? duration || 160 : 0,
    filename: finalFileName,
    url: relativeUrl,
    fileSize: stats.size,
    format,
    category,
    intensity,
    emotionalState,
    associatedCharacters,
    situations,
    priority,
    licenseOrigin,
    storageLocation: cleanSubdir || 'default',
    volumeModifier,
    loop: true,
    sourceUrl: url,
    createdAt: Date.now(),
  };

  // 6. Update local audio library database atomically
  const library = getLibrary();
  const existingIdx = library.findIndex((t) => t.id === id || t.filename === finalFileName);
  if (existingIdx >= 0) {
    library[existingIdx] = {
      ...library[existingIdx],
      ...newTrack,
    };
  } else {
    library.push(newTrack);
  }
  saveLibrary(library);

  return newTrack;
}

// Batch processor for multiple URLs with yt-dlp and FFmpeg normalization
export async function processBatchAudioUrls(
  items: Array<string | { url: string; metadata?: Partial<AudioImportRequest> }>,
  options: {
    normalize?: boolean;
    outputFormat?: string;
    targetSubdir?: string;
  } = {}
): Promise<{
  total: number;
  successful: number;
  failed: number;
  tracks: AudioTrack[];
  errors: Array<{ url: string; error: string }>;
}> {
  const tracks: AudioTrack[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  for (const item of items) {
    try {
      const url = typeof item === 'string' ? item.trim() : (item?.url || '').trim();
      if (!url) continue;

      const metadata = typeof item === 'object' ? item.metadata : undefined;

      const track = await executeYtDlpAndNormalize(url, {
        normalize: options.normalize,
        outputFormat: options.outputFormat,
        targetSubdir: options.targetSubdir,
        customMetadata: metadata,
      });
      tracks.push(track);
    } catch (err: any) {
      const errorUrl = typeof item === 'string' ? item : item?.url || 'URL desconocida';
      console.error(`Error processing URL ${errorUrl}:`, err);
      errors.push({
        url: errorUrl,
        error: err?.message || 'Error desconocido durante la ejecución de yt-dlp y FFmpeg',
      });
    }
  }

  return {
    total: items.length,
    successful: tracks.length,
    failed: errors.length,
    tracks,
    errors,
  };
}

// Synchronize all canonical OST tracks using yt-dlp & FFmpeg
export async function syncCanonicalOstCollection(options: { normalize?: boolean } = {}): Promise<{
  total: number;
  successful: number;
  failed: number;
  tracks: AudioTrack[];
  errors: Array<{ url: string; error: string }>;
}> {
  const entries = Object.values(CANONICAL_OST_CONFIG).map((cfg) => ({
    url: cfg.defaultUrl,
    metadata: {
      id: cfg.id,
      title: cfg.title,
      artist: cfg.artist,
      category: cfg.category,
      intensity: cfg.intensity,
      emotionalState: cfg.emotionalState,
      associatedCharacters: cfg.associatedCharacters,
      situations: cfg.situations,
      priority: cfg.priority,
      licenseOrigin: cfg.licenseOrigin,
    },
  }));

  return processBatchAudioUrls(entries, options);
}

// Download and convert audio using yt-dlp & ffmpeg (legacy wrapper)
export async function downloadAndProcessAudio(request: AudioImportRequest): Promise<AudioTrack> {
  return executeYtDlpAndNormalize(request);
}

// Process direct local file upload
export async function processUploadedAudio(
  file: Express.Multer.File,
  metadata: Partial<AudioImportRequest>
): Promise<AudioTrack> {
  const ffmpegBin = getFfmpegPath();
  const id = `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase() || 'mp3';
  const cleanSubdir = metadata.storageSubdir ? metadata.storageSubdir.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  const targetDir = cleanSubdir ? path.join(STORAGE_AUDIO_DIR, cleanSubdir) : STORAGE_AUDIO_DIR;

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const finalFileName = `${id}.${ext}`;
  const finalFilePath = path.join(targetDir, finalFileName);

  fs.copyFileSync(file.path, finalFilePath);
  fs.unlinkSync(file.path); // remove temp upload

  const stats = fs.statSync(finalFilePath);
  let duration = 0;

  try {
    const { stdout } = await execFileAsync(ffmpegBin, ['-i', finalFilePath]);
    const durMatch = stdout.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (durMatch) {
      duration = Math.round(
        Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + parseFloat(durMatch[3])
      );
    }
  } catch (durErr: any) {
    const output = (durErr.stdout || '') + (durErr.stderr || '');
    const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (durMatch) {
      duration = Math.round(
        Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + parseFloat(durMatch[3])
      );
    }
  }

  const relativeUrl = cleanSubdir
    ? `/audio-files/${cleanSubdir}/${finalFileName}`
    : `/audio-files/${finalFileName}`;

  const newTrack: AudioTrack = {
    id,
    title: metadata.title || path.basename(file.originalname, path.extname(file.originalname)),
    artist: metadata.artist || 'Archivo Local',
    duration: duration || 0,
    filename: finalFileName,
    url: relativeUrl,
    fileSize: stats.size,
    format: ext,
    category: metadata.category || 'ambient',
    intensity: metadata.intensity || 'medium',
    emotionalState: metadata.emotionalState || 'calm',
    associatedCharacters: metadata.associatedCharacters || [],
    situations: metadata.situations || [],
    priority: Number(metadata.priority) || 5,
    licenseOrigin: metadata.licenseOrigin || 'Archivo Local Subido por el Usuario',
    storageLocation: cleanSubdir || 'default',
    volumeModifier: 1.0,
    loop: true,
    createdAt: Date.now(),
  };

  const library = getLibrary();
  library.push(newTrack);
  saveLibrary(library);

  return newTrack;
}

// Update existing track metadata
export function updateTrack(id: string, updates: Partial<AudioTrack>): AudioTrack | null {
  const library = getLibrary();
  const index = library.findIndex((t) => t.id === id);
  if (index === -1) return null;

  library[index] = {
    ...library[index],
    ...updates,
  };
  saveLibrary(library);
  return library[index];
}

// Delete track and its local file
export function deleteTrack(id: string): boolean {
  const library = getLibrary();
  const track = library.find((t) => t.id === id);
  if (!track) return false;

  let filePath = '';
  if (track.url && track.url.startsWith('/audio/')) {
    const AUDIO_ROOT_DIR = path.join(process.cwd(), 'audio');
    filePath = path.join(AUDIO_ROOT_DIR, track.url.substring('/audio/'.length));
  } else {
    const targetDir = track.storageLocation && track.storageLocation !== 'default'
      ? path.join(STORAGE_AUDIO_DIR, track.storageLocation)
      : STORAGE_AUDIO_DIR;
    filePath = path.join(targetDir, track.filename);
  }

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn('Could not delete physical audio file:', err);
    }
  }

  const updated = library.filter((t) => t.id !== id);
  saveLibrary(updated);
  return true;
}

// Smart Audio Engine Matcher
// Evaluates scene context (audio direction comments, GPT narrative, combat state, characters, mood)
// and returns the 3-layer sound design matching result (Music, Ambience, SFX)
export function matchTrackForScene(
  sceneText: string,
  tacticalContext?: {
    currentThreat?: string;
    location?: string;
    presentCharacters?: string[];
    rinFatigue?: string;
  }
): AudioEngineMatchResult {
  const library = getLibrary();
  const lowerText = (sceneText || '').toLowerCase();
  const threatText = (tacticalContext?.currentThreat || '').toLowerCase();
  const locationText = (tacticalContext?.location || '').toLowerCase();

  // 1. Try to extract explicit audio direction comment from narrative text
  // e.g. <!-- AUDIO_DIRECTION: { ... } -->
  const commentMatch = sceneText.match(/<!--\s*AUDIO_DIRECTION:\s*(\{[\s\S]*?\})\s*-->/i);
  let explicitIntent: any = null;
  if (commentMatch) {
    try {
      explicitIntent = JSON.parse(commentMatch[1]);
    } catch (e) {
      console.warn('Failed to parse explicit AUDIO_DIRECTION json:', e);
    }
  }

  // Detect environment
  let detectedEnvironment = 'forest';
  if (/lluvia|tormenta|gotas|trueno|relam|relám/i.test(lowerText) || /lluvia/i.test(locationText)) {
    detectedEnvironment = 'rain';
  } else if (/cueva|subterr|gruta|raiz|raíz|tunel|túnel|guarida/i.test(lowerText) || /cueva|guarida/i.test(locationText)) {
    detectedEnvironment = 'cave';
  } else if (/aldea|konoha|calle|ichiraku|tienda|mercado|academia/i.test(lowerText) || /aldea|konoha/i.test(locationText)) {
    detectedEnvironment = 'village';
  } else if (/ruinas|templo|ataud|ataúd|tumba|altar|escombros/i.test(lowerText)) {
    detectedEnvironment = 'ruins';
  } else if (/noche|luna|oscuridad|sombras/i.test(lowerText)) {
    detectedEnvironment = 'forest_night';
  }

  // Detect SFX events in narrative text
  const detectedSfx: Array<{ event: string; intensity: number }> = [];
  if (/mokuton|madera|raiz|raíz|raices|raíces|brote|ataud|ataúd|corteza/i.test(lowerText)) {
    detectedSfx.push({ event: 'mokuton_grow', intensity: 0.85 });
  }
  if (/raiton|chispas|electricidad|chidori|descarga|arco voltaico/i.test(lowerText)) {
    detectedSfx.push({ event: 'raiton_spark', intensity: 0.9 });
  }
  if (/chakra|dojutsu|dōjutsu|tercer ojo|keimyaku|flujo|liberacion|liberación/i.test(lowerText)) {
    detectedSfx.push({ event: 'chakra_surge', intensity: 0.75 });
  }
  if (/kunai|shuriken|arrojadiza|metalico|metálico|corta el aire/i.test(lowerText)) {
    detectedSfx.push({ event: 'kunai_throw', intensity: 0.7 });
  }
  if (/crac|crujido|rama|astilla|quiebra|pisada/i.test(lowerText)) {
    detectedSfx.push({ event: 'branch_crack', intensity: 0.8 });
  }
  if (/impacto|golpe|estruendo|explosion|explosión|crater|cráter|colision|colisión|fractura/i.test(lowerText)) {
    detectedSfx.push({ event: 'impact_heavy', intensity: 0.95 });
  }
  if (/cae|desploma|incapacitado|inmovil|inmóvil|inerte/i.test(lowerText)) {
    detectedSfx.push({ event: 'body_collapse', intensity: 0.7 });
  }
  if (/viento|rafaga|ráfaga|vendaval|hojas|torbellino/i.test(lowerText)) {
    detectedSfx.push({ event: 'wind_gust', intensity: 0.6 });
  }
  if (/susanoo|kali|kālī|presencia divina|espiritual/i.test(lowerText)) {
    detectedSfx.push({ event: 'susanoo_hum', intensity: 0.9 });
  }

  // If explicit intent exists, locate track by explicit track key
  if (explicitIntent?.music?.track) {
    const trackKey = String(explicitIntent.music.track).toLowerCase().trim();
    if (trackKey === 'none' || trackKey === 'silence') {
      return {
        matchedTrack: null,
        score: 0,
        reason: 'Silencio intencional',
        detectedMood: 'silence',
        detectedCategory: 'ambient',
        detectedCharacters: [],
        detectedEnvironment: explicitIntent.ambience?.environment || detectedEnvironment,
        alternatives: [],
        intent: {
          music: {
            track: 'none',
            intensity: 0,
            transition: explicitIntent.music.transition || 'crossfade',
          },
          ambience: {
            environment: explicitIntent.ambience?.environment || detectedEnvironment,
            intensity: Number(explicitIntent.ambience?.intensity) || 0.4,
          },
          sfx: explicitIntent.sfx || detectedSfx,
        },
      } as any;
    }
    const matched = library.find((t) => {
      const tId = t.id.toLowerCase();
      const tTitle = t.title.toLowerCase();
      const tFile = t.filename.toLowerCase();
      return (
        tId.includes(trackKey) ||
        tTitle.includes(trackKey) ||
        tFile.includes(trackKey) ||
        (trackKey === 'glued_state' && tId.includes('glued_state')) ||
        (trackKey === 'nervous' && tId.includes('nervous')) ||
        (trackKey === 'confrontment' && tId.includes('confrontment')) ||
        (trackKey === 'bad_situation' && tId.includes('bad_situation')) ||
        (trackKey === 'survival_examination' && tId.includes('survival_examination')) ||
        (trackKey === 'avenger' && tId === 'track_naruto_avenger') ||
        (trackKey === 'avenger_2' && tId.includes('avenger_2')) ||
        (trackKey === 'orochimaru_theme' && tId.includes('orochimaru')) ||
        (trackKey === 'sasuke_theme' && tId.includes('sasuke_theme')) ||
        (trackKey === 'sasuke_destiny' && tId.includes('sasuke_destiny')) ||
        (trackKey === 'nine_tail_demon_fox' && tId.includes('nine_tail')) ||
        (trackKey === 'evil' && tId.includes('evil'))
      );
    });

    return {
      matchedTrack: matched || library[0] || null,
      score: 100,
      reason: `Directiva explícita del Game Master: Pista [${explicitIntent.music.track}], Transición [${explicitIntent.music.transition || 'crossfade'}].`,
      detectedMood: explicitIntent.ambience?.environment || detectedEnvironment,
      detectedCategory: matched?.category || 'combat',
      detectedCharacters: matched?.associatedCharacters || [],
      detectedEnvironment: explicitIntent.ambience?.environment || detectedEnvironment,
      alternatives: library.filter((t) => t.id !== matched?.id).slice(0, 3),
      intent: {
        music: {
          track: explicitIntent.music.track,
          intensity: Number(explicitIntent.music.intensity) || 0.7,
          transition: explicitIntent.music.transition || 'crossfade',
        },
        ambience: {
          environment: explicitIntent.ambience?.environment || detectedEnvironment,
          intensity: Number(explicitIntent.ambience?.intensity) || 0.4,
        },
        sfx: explicitIntent.sfx || detectedSfx,
      },
    };
  }

  // 2. Fallback Narrative Analysis according to Canonical Rules
  // Character detection
  const detectedCharacters: string[] = [];
  if (/itachi/i.test(lowerText) || /itachi/i.test(threatText)) detectedCharacters.push('Itachi');
  if (/kali|kālī/i.test(lowerText)) detectedCharacters.push('Kali');
  if (/rin|yurei|yūrei/i.test(lowerText)) detectedCharacters.push('Rin');
  if (/orochimaru/i.test(lowerText) || /orochimaru/i.test(threatText)) detectedCharacters.push('Orochimaru');
  if (/sasuke/i.test(lowerText)) detectedCharacters.push('Sasuke');
  if (/naruto/i.test(lowerText)) detectedCharacters.push('Naruto');
  if (/kakashi/i.test(lowerText)) detectedCharacters.push('Kakashi');

  // Rule Check: Peaceful scene? (OST de Naruto ESTRICTAMENTE PROHIBIDA)
  const isPeacefulOrExploration =
    /tranquil|reposo|descanso|paseo|meditacion|meditación|estudio|conversacion|conversación|ichiraku|manana|mañana|respiracion|respiración|silencio/i.test(
      lowerText
    ) && !/combate|amenaza|peligro|ataque|sello|orochimaru|itachi|enemigo/i.test(lowerText);

  let targetTrackKey = '';
  let transitionType: 'continue' | 'crossfade' | 'fade_in' | 'fade_out' = 'continue';
  let targetIntensity = 0.7;

  if (isPeacefulOrExploration) {
    targetTrackKey = detectedEnvironment === 'village' ? 'village_peace' : 'rin_theme_ambient';
    targetIntensity = 0.4;
  } else if (/kyubi|kyūbi|zorro|zorro de nueve colas|demon|demoníaco/i.test(lowerText)) {
    targetTrackKey = 'nine_tail_demon_fox';
    targetIntensity = 0.95;
    transitionType = 'crossfade';
  } else if (/orochimaru/i.test(threatText) || (detectedCharacters.includes('Orochimaru') && /presencia|sannin|serpiente|sello/i.test(lowerText))) {
    targetTrackKey = 'orochimaru_theme';
    targetIntensity = 0.85;
    transitionType = 'crossfade';
  } else if (detectedCharacters.includes('Sasuke') && /destino|lazos|hermano|venganza|decision|decisión/i.test(lowerText)) {
    targetTrackKey = 'sasuke_destiny';
    targetIntensity = 0.85;
    transitionType = 'crossfade';
  } else if (detectedCharacters.includes('Sasuke') && /sharingan|chidori|sasuke/i.test(lowerText)) {
    targetTrackKey = 'sasuke_theme';
    targetIntensity = 0.75;
  } else if (/desventaja|grave|critico|crítico|desfavorable|herida|drenado|acorralado|superado/i.test(lowerText)) {
    targetTrackKey = 'bad_situation';
    targetIntensity = 0.9;
    transitionType = 'crossfade';
  } else if (/odio|furia|agresividad|choque/i.test(lowerText)) {
    targetTrackKey = 'avenger_2';
    targetIntensity = 0.95;
    transitionType = 'crossfade';
  } else if (/rivalidad|enfrentamiento|duelo/i.test(lowerText)) {
    targetTrackKey = 'avenger';
    targetIntensity = 0.85;
  } else if (/frente a frente|aparicion|aparición|confrontacion|confrontación|desafio|desafío/i.test(lowerText) && /itachi|orochimaru|enemigo/i.test(lowerText)) {
    targetTrackKey = 'confrontment';
    targetIntensity = 0.85;
  } else if (/bosque de la muerte|supervivencia|persecucion|persecución|hostil|emboscada/i.test(lowerText)) {
    targetTrackKey = 'survival_examination';
    targetIntensity = 0.85;
  } else if (/siniestro|ritual|maldicion|maldición|terror|amenaza/i.test(lowerText)) {
    targetTrackKey = 'evil';
    targetIntensity = 0.85;
  } else if (/estrategia|plan|trampa|posicionamiento|analisis|análisis|tenketsu|mokuton|calculo|cálculo|recursos/i.test(lowerText)) {
    targetTrackKey = 'glued_state';
    targetIntensity = 0.75;
  } else if (/tension|tensión|peligro|alerta|acecho|sospecha|silencio/i.test(lowerText)) {
    targetTrackKey = 'nervous';
    targetIntensity = 0.65;
  } else {
    // Default strategic or ambient based on presence of threat
    targetTrackKey = tacticalContext?.currentThreat ? 'glued_state' : 'rin_theme_ambient';
    targetIntensity = tacticalContext?.currentThreat ? 0.7 : 0.4;
  }

  // Find track in library
  let matchedTrack: any = library.find((t) => t.id.toLowerCase().includes(targetTrackKey.toLowerCase()) || t.filename.toLowerCase().includes(targetTrackKey.toLowerCase()));
  
  if (!matchedTrack && isPeacefulOrExploration) {
    matchedTrack = library.find((t) => t.intensity === 'low' && (t.category === 'ambient' || t.category === 'village' || t.category === 'emotional'));
  }

  if (!matchedTrack) {
    matchedTrack = isPeacefulOrExploration ? null : (library[0] || null);
  }

  return {
    matchedTrack,
    score: 90,
    reason: `Evaluación de escena: [${targetTrackKey}] en entorno [${detectedEnvironment}]. Reglas de dirección musical aplicadas.`,
    detectedMood: targetTrackKey,
    detectedCategory: matchedTrack?.category || 'ambient',
    detectedCharacters,
    detectedEnvironment,
    alternatives: library.filter((t) => t.id !== matchedTrack?.id).slice(0, 3),
    intent: {
      music: {
        track: targetTrackKey,
        intensity: targetIntensity,
        transition: transitionType,
      },
      ambience: {
        environment: detectedEnvironment,
        intensity: 0.4,
      },
      sfx: detectedSfx,
    },
  };
}
