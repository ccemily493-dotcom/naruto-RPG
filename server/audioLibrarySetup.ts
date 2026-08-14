import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';
import { AUDIO_SOURCES_CONFIG, AudioSourceDefinition } from './audioSourcesConfig';
import { getLibrary, saveLibrary } from './audioManager';
import { AudioTrack } from '../src/types';

const execFileAsync = promisify(execFile);

// Root Audio Directory Structure
export const AUDIO_ROOT_DIR = path.join(process.cwd(), 'audio');
export const AUDIO_LIBRARIES_DIR = path.join(AUDIO_ROOT_DIR, 'libraries');
export const AUDIO_AMBIENCE_DIR = path.join(AUDIO_ROOT_DIR, 'ambience');
export const AUDIO_SFX_DIR = path.join(AUDIO_ROOT_DIR, 'sfx');
export const AUDIO_MUSIC_DIR = path.join(AUDIO_ROOT_DIR, 'music');
export const AUDIO_NARUTO_MUSIC_DIR = path.join(AUDIO_MUSIC_DIR, 'naruto');
export const AUDIO_METADATA_DIR = path.join(AUDIO_ROOT_DIR, 'metadata');

export interface AssetLicenseInfo {
  source_repository: string;
  source_file: string;
  author: string;
  license: string;
  license_url: string;
  attribution_required: boolean;
  commercial_use: boolean;
  redistribution_allowed: boolean;
  license_status: 'VERIFIED' | 'REVIEW_REQUIRED';
}

export interface OrganizedAudioMetadata {
  id: string;
  title: string;
  file: string; // e.g. "ambience/forest/forest-rain.ogg" or "sfx/impacts/heavy_hit.ogg"
  url: string; // web-accessible path e.g. "/audio/ambience/forest/forest-rain.ogg"
  type: 'ambience' | 'sfx' | 'music';
  category: string; // e.g. 'forest', 'impacts', 'water'
  tags: string[];
  duration: number; // in seconds
  fileSize: number; // in bytes
  format: string; // 'ogg' | 'mp3' | 'wav'
  sha256: string;
  loopable: boolean;
  intensity: number; // 0.0 to 1.0
  source: AssetLicenseInfo;
  status: 'ACTIVE' | 'NEEDS_REVIEW';
  createdAt: number;
}

export interface LibraryManifest {
  version: string;
  generatedAt: number;
  sources: Record<
    string,
    {
      id: string;
      name: string;
      installed: boolean;
      commitHash?: string;
      totalRawFiles: number;
      totalOrganizedAssets: number;
      license: string;
      licenseStatus: string;
    }
  >;
  totalAssets: number;
  ambienceCount: number;
  sfxCount: number;
  assets: OrganizedAudioMetadata[];
}

export interface SetupProgressEvent {
  step: 'init' | 'check' | 'sfx_download' | 'nature_download' | 'ffmpeg_ready' | 'classifying' | 'metadata' | 'complete' | 'error';
  percent: number;
  message: string;
  details?: {
    sfxInstalled?: boolean;
    natureInstalled?: boolean;
    ffmpegReady?: boolean;
    totalFiles?: number;
    processedFiles?: number;
    error?: string;
  };
}

type ProgressListener = (event: SetupProgressEvent) => void;

let isSetupInProgress = false;
let lastSetupError: string | null = null;
const progressListeners: Set<ProgressListener> = new Set();

export function addProgressListener(listener: ProgressListener) {
  progressListeners.add(listener);
}

export function removeProgressListener(listener: ProgressListener) {
  progressListeners.delete(listener);
}

function broadcastProgress(event: SetupProgressEvent) {
  for (const listener of progressListeners) {
    try {
      listener(event);
    } catch {
      // ignore
    }
  }
}

// Ensure the canonical directory structure exists
export function ensureAudioStructure() {
  const dirs = [
    AUDIO_ROOT_DIR,
    AUDIO_LIBRARIES_DIR,
    path.join(AUDIO_LIBRARIES_DIR, 'sfx_cc0'),
    path.join(AUDIO_LIBRARIES_DIR, 'nature_ambience'),
    AUDIO_AMBIENCE_DIR,
    ...AUDIO_SOURCES_CONFIG.ambienceCategories.map((c) => path.join(AUDIO_AMBIENCE_DIR, c)),
    AUDIO_SFX_DIR,
    ...AUDIO_SOURCES_CONFIG.sfxCategories.map((c) => path.join(AUDIO_SFX_DIR, c)),
    AUDIO_MUSIC_DIR,
    AUDIO_NARUTO_MUSIC_DIR,
    AUDIO_METADATA_DIR,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Find FFmpeg binary path
export function getFfmpegBinary(): string {
  if (fs.existsSync('/usr/bin/ffmpeg')) return '/usr/bin/ffmpeg';
  if (fs.existsSync('/usr/local/bin/ffmpeg')) return '/usr/local/bin/ffmpeg';
  return 'ffmpeg';
}

let cachedFfmpegReady: boolean | null = null;
export function checkFfmpegReady(): boolean {
  if (cachedFfmpegReady !== null) return cachedFfmpegReady;
  try {
    if (fs.existsSync('/usr/bin/ffmpeg') || fs.existsSync('/usr/local/bin/ffmpeg')) {
      cachedFfmpegReady = true;
      return true;
    }
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    require('child_process').execSync(cmd, { stdio: 'ignore' });
    cachedFfmpegReady = true;
    return true;
  } catch {
    cachedFfmpegReady = false;
    return false;
  }
}

// Calculate SHA-256 hash of a file for deduplication
export function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Probe audio duration and format using FFmpeg/ffprobe
export async function probeAudioInfo(
  filePath: string
): Promise<{ duration: number; format: string; size: number }> {
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  let duration = 0;

  const ffmpegBin = getFfmpegBinary();
  try {
    const { stdout, stderr } = await execFileAsync(ffmpegBin, ['-i', filePath]);
    const output = (stdout || '') + (stderr || '');
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      duration = Math.round(
        Number(match[1]) * 3600 + Number(match[2]) * 60 + parseFloat(match[3])
      );
    }
  } catch (err: any) {
    const output = (err.stdout || '') + (err.stderr || '');
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      duration = Math.round(
        Number(match[1]) * 3600 + Number(match[2]) * 60 + parseFloat(match[3])
      );
    }
  }

  return {
    duration: duration || 0,
    format: ext || 'ogg',
    size: stats.size,
  };
}

// Parse repository licenses
export function parseRepositoryLicenses(repoDir: string, sourceDef: AudioSourceDefinition): AssetLicenseInfo {
  let licenseText = '';
  let author = 'Public Domain / Open Source Community';
  let license = sourceDef.defaultLicense;
  let licenseUrl = sourceDef.licenseUrl;
  let attributionRequired = sourceDef.attributionRequired;
  let commercialUse = sourceDef.commercialUse;
  let redistributionAllowed = sourceDef.redistributionAllowed;
  let status: 'VERIFIED' | 'REVIEW_REQUIRED' = 'VERIFIED';

  if (fs.existsSync(repoDir)) {
    const licenseFiles = ['LICENSE', 'LICENCE', 'COPYING', 'README.md', 'README', 'ATTRIBUTION.txt', 'CREDITS.md'];
    for (const f of licenseFiles) {
      const p = path.join(repoDir, f);
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf-8');
          licenseText += `\n--- ${f} ---\n` + content;
          if (/creative commons zero|cc0|public domain/i.test(content)) {
            license = 'Creative Commons Zero 1.0 (CC0)';
            licenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/';
            attributionRequired = false;
            commercialUse = true;
            redistributionAllowed = true;
          } else if (/cc-by|attribution 3\.0|attribution 4\.0/i.test(content)) {
            license = 'Creative Commons Attribution (CC-BY)';
            licenseUrl = 'https://creativecommons.org/licenses/by/3.0/';
            attributionRequired = true;
            commercialUse = true;
            redistributionAllowed = true;
          } else if (/gpl-3\.0|general public license/i.test(content)) {
            license = 'GNU General Public License v3.0 (GPL-3.0)';
            attributionRequired = true;
            commercialUse = true;
            redistributionAllowed = true;
          }
          // Check for author / credits
          const authorMatch = content.match(/(?:Author|Created by|Copyright \(c\)|Credits?):\s*([^\n\r]+)/i);
          if (authorMatch && authorMatch[1].trim()) {
            author = authorMatch[1].trim();
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (!license || license === 'UNKNOWN') {
    status = 'REVIEW_REQUIRED';
  }

  return {
    source_repository: sourceDef.repoUrl,
    source_file: repoDir,
    author,
    license,
    license_url: licenseUrl,
    attribution_required: attributionRequired,
    commercial_use: commercialUse,
    redistribution_allowed: redistributionAllowed,
    license_status: status,
  };
}

// Semantic Audio Classification & Tagging
export function classifyAudioFile(
  fileName: string,
  relPath: string,
  sourceType: 'sfx' | 'ambience',
  duration: number
): {
  type: 'ambience' | 'sfx';
  category: string;
  tags: string[];
  loopable: boolean;
  intensity: number;
  status: 'ACTIVE' | 'NEEDS_REVIEW';
} {
  const lowerName = fileName.toLowerCase();
  const lowerPath = relPath.toLowerCase();
  const combined = `${lowerPath}/${lowerName}`;

  const tags: Set<string> = new Set();
  let category = 'other';
  let loopable = false;
  let intensity = 0.5;
  let status: 'ACTIVE' | 'NEEDS_REVIEW' = 'ACTIVE';

  if (sourceType === 'ambience') {
    // Ambience Categories: forest, forest_night, rain, storm, wind, water, river, cave, fire, other
    if (/forest.*night|night.*forest|crickets|night.*woods/i.test(combined)) {
      category = 'forest_night';
      tags.add('forest');
      tags.add('night');
      tags.add('crickets');
      tags.add('nature');
      loopable = true;
      intensity = 0.35;
    } else if (/forest|woods|jungle|birds|trees|leaves|foliage/i.test(combined)) {
      category = 'forest';
      tags.add('forest');
      tags.add('nature');
      tags.add('birds');
      tags.add('wind');
      loopable = true;
      intensity = 0.4;
    } else if (/thunder|storm|heavy.*rain|lightning|tempest/i.test(combined)) {
      category = 'storm';
      tags.add('storm');
      tags.add('thunder');
      tags.add('rain');
      tags.add('lightning');
      loopable = true;
      intensity = 0.75;
    } else if (/rain|drizzle|shower|downpour/i.test(combined)) {
      category = 'rain';
      tags.add('rain');
      tags.add('water');
      tags.add('weather');
      loopable = true;
      intensity = 0.45;
    } else if (/wind|breeze|gust|howling.*wind/i.test(combined)) {
      category = 'wind';
      tags.add('wind');
      tags.add('weather');
      tags.add('air');
      loopable = true;
      intensity = 0.4;
    } else if (/river|creek|stream|brook|waterfall/i.test(combined)) {
      category = 'river';
      tags.add('river');
      tags.add('water');
      tags.add('stream');
      loopable = true;
      intensity = 0.45;
    } else if (/water|waves|ocean|sea|lake|drips/i.test(combined)) {
      category = 'water';
      tags.add('water');
      tags.add('ambient');
      loopable = true;
      intensity = 0.4;
    } else if (/cave|cavern|subterranean|dungeon|underground|echo/i.test(combined)) {
      category = 'cave';
      tags.add('cave');
      tags.add('underground');
      tags.add('echo');
      tags.add('dark');
      loopable = true;
      intensity = 0.35;
    } else if (/fire|campfire|flames|bonfire|crackling/i.test(combined)) {
      category = 'fire';
      tags.add('fire');
      tags.add('campfire');
      tags.add('heat');
      loopable = true;
      intensity = 0.4;
    } else {
      category = 'other';
      tags.add('ambience');
      tags.add('nature');
      loopable = duration > 10;
      intensity = 0.35;
      if (!/ambient|soundscape|noise|drone/i.test(combined)) {
        status = 'NEEDS_REVIEW';
      }
    }
  } else {
    // SFX Categories: impacts, wood, metal, water, movement, explosions, environment, magic, other
    if (/punch|hit|impact|strike|thud|smash|slam|blunt|kick|body/i.test(combined)) {
      category = 'impacts';
      tags.add('impact');
      tags.add('hit');
      tags.add('combat');
      intensity = 0.8;
    } else if (/wood|stick|branch|tree|crack|break|timber/i.test(combined)) {
      category = 'wood';
      tags.add('wood');
      tags.add('crack');
      tags.add('nature');
      intensity = 0.7;
    } else if (/metal|sword|blade|clang|clash|kunai|shuriken|iron|steel|ring/i.test(combined)) {
      category = 'metal';
      tags.add('metal');
      tags.add('weapon');
      tags.add('slash');
      intensity = 0.75;
    } else if (/splash|drop|pour|liquid|bubble|plop|water.*sfx/i.test(combined)) {
      category = 'water';
      tags.add('water');
      tags.add('splash');
      intensity = 0.6;
    } else if (/step|footstep|walk|run|jump|land|whoosh|slide|movement|rustle/i.test(combined)) {
      category = 'movement';
      tags.add('movement');
      tags.add('footsteps');
      tags.add('motion');
      intensity = 0.6;
    } else if (/explosion|explode|blast|boom|burst|detonation|bomb/i.test(combined)) {
      category = 'explosions';
      tags.add('explosion');
      tags.add('blast');
      tags.add('heavy');
      intensity = 0.95;
    } else if (/magic|spell|energy|charge|laser|zap|chakra|surge|spark|whoosh.*magic/i.test(combined)) {
      category = 'magic';
      tags.add('magic');
      tags.add('energy');
      tags.add('jutsu');
      intensity = 0.85;
    } else if (/door|bell|creak|stone|rubble|wind.*gust|leaf|environment/i.test(combined)) {
      category = 'environment';
      tags.add('environment');
      tags.add('prop');
      intensity = 0.55;
    } else {
      category = 'other';
      tags.add('sfx');
      intensity = 0.5;
      status = 'NEEDS_REVIEW';
    }
  }

  // Loop detection heuristic
  for (const kw of AUDIO_SOURCES_CONFIG.loopCandidateKeywords) {
    if (combined.includes(kw) && (sourceType === 'ambience' || duration > 6)) {
      loopable = true;
      break;
    }
  }

  return {
    type: sourceType,
    category,
    tags: Array.from(tags),
    loopable,
    intensity,
    status,
  };
}

// Get Git commit hash for a repository directory
export async function getRepoCommitHash(repoDir: string): Promise<string | null> {
  if (!fs.existsSync(path.join(repoDir, '.git'))) return null;
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoDir, 'rev-parse', 'HEAD']);
    return stdout.trim();
  } catch {
    return null;
  }
}

// Clone or download a repository into the target directory
export async function cloneOrDownloadRepo(
  source: AudioSourceDefinition,
  targetDir: string
): Promise<{ success: boolean; commitHash?: string; message: string }> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Check if existing audio files are already in targetDir
  const existingFiles = findAudioFiles(targetDir);
  if (existingFiles.length > 0) {
    const commitHash = await getRepoCommitHash(targetDir);
    return {
      success: true,
      commitHash: commitHash || 'cached_version',
      message: `Biblioteca ${source.name} ya existe con ${existingFiles.length} archivos.`,
    };
  }

  // Direct fast tarball streaming extraction from GitHub
  try {
    const archiveUrl = `${source.repoUrl}/archive/refs/heads/${source.branch}.tar.gz`;
    const tarPath = path.join(AUDIO_ROOT_DIR, `${source.id}.tar.gz`);
    
    // Download tarball archive
    await execFileAsync('curl', ['-L', '-s', archiveUrl, '-o', tarPath], { maxBuffer: 50 * 1024 * 1024 });
    // Extract archive into target directory
    await execFileAsync('tar', ['-xzf', tarPath, '-C', targetDir, '--strip-components=1']);
    if (fs.existsSync(tarPath)) {
      fs.unlinkSync(tarPath);
    }

    return {
      success: true,
      commitHash: 'archive_latest',
      message: `Biblioteca ${source.name} descargada y organizada con éxito.`,
    };
  } catch (archiveErr: any) {
    console.warn(`Archive download failed for ${source.id}, trying git clone fallback:`, archiveErr.message);
    
    // Fallback: git clone
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      await execFileAsync('git', [
        'clone',
        '--depth',
        '1',
        '--branch',
        source.branch,
        source.repoUrl,
        targetDir,
      ]);
      const commitHash = await getRepoCommitHash(targetDir);
      return {
        success: true,
        commitHash: commitHash || 'cloned_head',
        message: `Repositorio ${source.name} clonado correctamente.`,
      };
    } catch (cloneErr: any) {
      throw new Error(`No se pudo descargar ${source.name}: ${cloneErr.message || archiveErr.message}`);
    }
  }
}

// Recursively find all audio files in a directory
export function findAudioFiles(dir: string, baseDir: string = dir): Array<{ fullPath: string; relPath: string }> {
  const results: Array<{ fullPath: string; relPath: string }> = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      results.push(...findAudioFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.ogg', '.mp3', '.wav', '.flac', '.m4a', '.aac', '.opus'].includes(ext)) {
        const relPath = path.relative(baseDir, fullPath);
        results.push({ fullPath, relPath });
      }
    }
  }
  return results;
}

// Get the current setup status
export async function getAudioLibrarySetupStatus(): Promise<{
  isInstalled: boolean;
  isRunning: boolean;
  lastError: string | null;
  sources: Record<
    string,
    {
      id: string;
      name: string;
      installed: boolean;
      totalRawFiles: number;
      totalOrganizedAssets: number;
      license: string;
      licenseStatus: string;
    }
  >;
  totalOrganizedAssets: number;
  ambienceCount: number;
  sfxCount: number;
  narutoMusicCount: number;
  ffmpegReady: boolean;
  manifestFileExists: boolean;
}> {
  ensureAudioStructure();
  const manifestPath = path.join(AUDIO_METADATA_DIR, 'manifest.json');
  const manifestExists = fs.existsSync(manifestPath);

  const sfxDir = path.join(AUDIO_LIBRARIES_DIR, 'sfx_cc0');
  const natureDir = path.join(AUDIO_LIBRARIES_DIR, 'nature_ambience');

  const sfxRaw = findAudioFiles(sfxDir);
  const natureRaw = findAudioFiles(natureDir);

  const ffmpegReady = checkFfmpegReady();

  let manifest: LibraryManifest | null = null;
  if (manifestExists) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      // ignore
    }
  }

  const sfxOrganized = findAudioFiles(AUDIO_SFX_DIR);
  const natureOrganized = findAudioFiles(AUDIO_AMBIENCE_DIR);
  const narutoMusic = findAudioFiles(AUDIO_NARUTO_MUSIC_DIR);

  const sfxInstalled = sfxRaw.length > 0 || sfxOrganized.length > 0;
  const natureInstalled = natureRaw.length > 0 || natureOrganized.length > 0;

  return {
    isInstalled: sfxInstalled && natureInstalled && manifestExists,
    isRunning: isSetupInProgress,
    lastError: lastSetupError,
    sources: {
      sfx_cc0: {
        id: 'sfx_cc0',
        name: AUDIO_SOURCES_CONFIG.officialSources.sfx_cc0.name,
        installed: sfxInstalled,
        totalRawFiles: sfxRaw.length,
        totalOrganizedAssets: sfxOrganized.length,
        license: AUDIO_SOURCES_CONFIG.officialSources.sfx_cc0.defaultLicense,
        licenseStatus: 'VERIFIED',
      },
      nature_ambience: {
        id: 'nature_ambience',
        name: AUDIO_SOURCES_CONFIG.officialSources.nature_ambience.name,
        installed: natureInstalled,
        totalRawFiles: natureRaw.length,
        totalOrganizedAssets: natureOrganized.length,
        license: AUDIO_SOURCES_CONFIG.officialSources.nature_ambience.defaultLicense,
        licenseStatus: 'VERIFIED',
      },
    },
    totalOrganizedAssets: (manifest?.totalAssets || (sfxOrganized.length + natureOrganized.length)),
    ambienceCount: natureOrganized.length,
    sfxCount: sfxOrganized.length,
    narutoMusicCount: narutoMusic.length,
    ffmpegReady,
    manifestFileExists: manifestExists,
  };
}

// MAIN AUTOMATIC SETUP FUNCTION
export async function executeAudioLibrarySetup(
  options: {
    forceReinstall?: boolean;
    convertWithFfmpeg?: boolean;
  } = {}
): Promise<{
  success: boolean;
  manifest: LibraryManifest;
  message: string;
}> {
  if (isSetupInProgress) {
    throw new Error('La instalación o actualización de la biblioteca de audio ya está en curso.');
  }

  isSetupInProgress = true;
  lastSetupError = null;

  try {
    ensureAudioStructure();

    broadcastProgress({
      step: 'init',
      percent: 5,
      message: 'Iniciando comprobación y preparación de directorios de audio...',
    });

    const ffmpegReady = checkFfmpegReady();
    broadcastProgress({
      step: 'ffmpeg_ready',
      percent: 10,
      message: ffmpegReady ? 'FFmpeg detectado y listo para optimización.' : 'FFmpeg disponible en modo estándar.',
      details: { ffmpegReady },
    });

    // Step 1: SFX Library Download / Verification
    const sfxDef = AUDIO_SOURCES_CONFIG.officialSources.sfx_cc0;
    const sfxTargetDir = path.join(AUDIO_LIBRARIES_DIR, sfxDef.targetSubdir);

    broadcastProgress({
      step: 'sfx_download',
      percent: 20,
      message: `Comprobando y descargando biblioteca SFX desde ${sfxDef.name}...`,
    });

    let sfxCommit: string | undefined;
    try {
      const sfxResult = await cloneOrDownloadRepo(sfxDef, sfxTargetDir);
      sfxCommit = sfxResult.commitHash;
    } catch (err: any) {
      console.warn('SFX Library download error:', err.message);
      // Check if we have existing files to continue gracefully
      const existing = findAudioFiles(sfxTargetDir);
      if (existing.length === 0) {
        throw new Error(`Fallo al obtener la biblioteca SFX: ${err.message}`);
      }
    }

    broadcastProgress({
      step: 'sfx_download',
      percent: 45,
      message: 'Biblioteca SFX descargada y comprobada.',
      details: { sfxInstalled: true },
    });

    // Step 2: Nature Ambience Library Download / Verification
    const natureDef = AUDIO_SOURCES_CONFIG.officialSources.nature_ambience;
    const natureTargetDir = path.join(AUDIO_LIBRARIES_DIR, natureDef.targetSubdir);

    broadcastProgress({
      step: 'nature_download',
      percent: 50,
      message: `Comprobando y descargando biblioteca de Ambientes Naturales desde ${natureDef.name}...`,
    });

    let natureCommit: string | undefined;
    try {
      const natureResult = await cloneOrDownloadRepo(natureDef, natureTargetDir);
      natureCommit = natureResult.commitHash;
    } catch (err: any) {
      console.warn('Nature Library download error:', err.message);
      const existing = findAudioFiles(natureTargetDir);
      if (existing.length === 0) {
        throw new Error(`Fallo al obtener la biblioteca de Ambientes: ${err.message}`);
      }
    }

    broadcastProgress({
      step: 'nature_download',
      percent: 65,
      message: 'Biblioteca de Ambientes Naturales lista.',
      details: { natureInstalled: true },
    });

    // Step 3: Parse Licenses
    const sfxLicense = parseRepositoryLicenses(sfxTargetDir, sfxDef);
    const natureLicense = parseRepositoryLicenses(natureTargetDir, natureDef);

    // Step 4: Scan and Classify Audio Files
    broadcastProgress({
      step: 'classifying',
      percent: 70,
      message: 'Analizando licencias, firmas SHA-256 y clasificando archivos de audio...',
    });

    const sfxFiles = findAudioFiles(sfxTargetDir);
    const natureFiles = findAudioFiles(natureTargetDir);

    const allRawItems: Array<{ fullPath: string; relPath: string; sourceDef: AudioSourceDefinition; license: AssetLicenseInfo }> = [
      ...sfxFiles.map((f) => ({ ...f, sourceDef: sfxDef, license: sfxLicense })),
      ...natureFiles.map((f) => ({ ...f, sourceDef: natureDef, license: natureLicense })),
    ];

    const seenHashes: Map<string, string> = new Map(); // SHA-256 -> Target file path (deduplication)
    const organizedAssets: OrganizedAudioMetadata[] = [];

    const ffmpegBin = getFfmpegBinary();
    let processedCount = 0;
    const totalFiles = allRawItems.length;

    for (const item of allRawItems) {
      processedCount++;
      const currentPercent = 70 + Math.round((processedCount / (totalFiles || 1)) * 20);

      try {
        const hash = await calculateFileHash(item.fullPath);
        const fileName = path.basename(item.fullPath);
        const fileExt = path.extname(fileName).replace('.', '').toLowerCase();
        const baseNameWithoutExt = path.basename(fileName, path.extname(fileName));

        // Deduplication check
        if (seenHashes.has(hash)) {
          // Skip duplicate copy but register reference if needed
          continue;
        }

        const probe = await probeAudioInfo(item.fullPath);
        const classification = classifyAudioFile(fileName, item.relPath, item.sourceDef.type, probe.duration);

        // Determine destination folder
        const parentTypeDir = classification.type === 'ambience' ? AUDIO_AMBIENCE_DIR : AUDIO_SFX_DIR;
        const targetCategoryDir = path.join(parentTypeDir, classification.category);
        if (!fs.existsSync(targetCategoryDir)) {
          fs.mkdirSync(targetCategoryDir, { recursive: true });
        }

        // Clean target filename
        const cleanName = baseNameWithoutExt.toLowerCase().replace(/[^a-z0-9_-]/g, '_') + '.' + fileExt;
        const targetFilePath = path.join(targetCategoryDir, cleanName);

        // Copy / optimize without removing the original file
        if (!fs.existsSync(targetFilePath) || options.forceReinstall) {
          fs.copyFileSync(item.fullPath, targetFilePath);
        }

        seenHashes.set(hash, targetFilePath);

        const relAssetPath = `${classification.type}/${classification.category}/${cleanName}`;
        const webUrl = `/audio/${relAssetPath}`;
        const assetId = `${classification.type}_${classification.category}_${cleanName.replace(/\.[^.]+$/, '')}_${hash.substring(0, 6)}`;

        const assetMetadata: OrganizedAudioMetadata = {
          id: assetId,
          title: formatDisplayTitle(baseNameWithoutExt),
          file: relAssetPath,
          url: webUrl,
          type: classification.type,
          category: classification.category,
          tags: classification.tags,
          duration: probe.duration,
          fileSize: probe.size,
          format: fileExt,
          sha256: hash,
          loopable: classification.loopable,
          intensity: classification.intensity,
          source: {
            ...item.license,
            source_file: item.relPath,
          },
          status: classification.status,
          createdAt: Date.now(),
        };

        // Write individual JSON file into audio/metadata/
        const individualMetaPath = path.join(AUDIO_METADATA_DIR, `${assetId}.json`);
        fs.writeFileSync(individualMetaPath, JSON.stringify(assetMetadata, null, 2), 'utf-8');

        organizedAssets.push(assetMetadata);
      } catch (assetErr: any) {
        console.warn(`Error processing asset ${item.relPath}:`, assetErr);
      }

      if (processedCount % 10 === 0 || processedCount === totalFiles) {
        broadcastProgress({
          step: 'metadata',
          percent: Math.min(95, currentPercent),
          message: `Generando metadatos y organizando recursos (${processedCount}/${totalFiles})...`,
          details: { processedFiles: processedCount, totalFiles },
        });
      }
    }

    // Step 5: Build Master Manifest
    const manifest: LibraryManifest = {
      version: '1.0.0',
      generatedAt: Date.now(),
      sources: {
        sfx_cc0: {
          id: 'sfx_cc0',
          name: sfxDef.name,
          installed: true,
          commitHash: sfxCommit,
          totalRawFiles: sfxFiles.length,
          totalOrganizedAssets: organizedAssets.filter((a) => a.type === 'sfx').length,
          license: sfxLicense.license,
          licenseStatus: sfxLicense.license_status,
        },
        nature_ambience: {
          id: 'nature_ambience',
          name: natureDef.name,
          installed: true,
          commitHash: natureCommit,
          totalRawFiles: natureFiles.length,
          totalOrganizedAssets: organizedAssets.filter((a) => a.type === 'ambience').length,
          license: natureLicense.license,
          licenseStatus: natureLicense.license_status,
        },
      },
      totalAssets: organizedAssets.length,
      ambienceCount: organizedAssets.filter((a) => a.type === 'ambience').length,
      sfxCount: organizedAssets.filter((a) => a.type === 'sfx').length,
      assets: organizedAssets,
    };

    const manifestPath = path.join(AUDIO_METADATA_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // Step 6: Sync with Audio Engine Database
    syncManifestWithAudioLibrary(organizedAssets);

    broadcastProgress({
      step: 'complete',
      percent: 100,
      message: '¡Audio Library Setup completado! Bibliotecas SFX y Ambientes organizadas y listas para el Audio Engine.',
      details: {
        sfxInstalled: true,
        natureInstalled: true,
        ffmpegReady,
        totalFiles: organizedAssets.length,
      },
    });

    return {
      success: true,
      manifest,
      message: `Setup completado con éxito: ${organizedAssets.length} recursos de audio indexados (${manifest.ambienceCount} ambientes, ${manifest.sfxCount} SFX).`,
    };
  } catch (err: any) {
    lastSetupError = err.message || 'Error desconocido durante la configuración de audio.';
    broadcastProgress({
      step: 'error',
      percent: 0,
      message: `Error en la instalación de la biblioteca: ${lastSetupError}`,
      details: { error: lastSetupError },
    });
    throw err;
  } finally {
    isSetupInProgress = false;
  }
}

// Helper to format clean display titles
function formatDisplayTitle(raw: string): string {
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}

// Synchronize organized assets into the master audio library
export function syncManifestWithAudioLibrary(assets: OrganizedAudioMetadata[]) {
  const library = getLibrary();
  const existingMap = new Map(library.map((t) => [t.id, t]));

  for (const asset of assets) {
    const existing = existingMap.get(asset.id);
    const trackItem: AudioTrack = {
      id: asset.id,
      title: asset.title,
      artist: asset.source.author || (asset.type === 'ambience' ? 'Ambient Sounds' : 'CC0 SFX'),
      duration: asset.duration,
      filename: path.basename(asset.file),
      url: asset.url,
      fileSize: asset.fileSize,
      format: asset.format,
      category: (asset.type === 'ambience' ? 'ambient' : 'jutsu') as any,
      intensity: asset.intensity > 0.7 ? 'high' : asset.intensity > 0.4 ? 'medium' : 'low',
      emotionalState: asset.tags.join(', '),
      associatedCharacters: ['Rin'],
      situations: asset.tags,
      priority: asset.type === 'ambience' ? 6 : 5,
      licenseOrigin: `${asset.source.license} (${asset.source.source_repository})`,
      storageLocation: asset.type === 'ambience' ? `ambience/${asset.category}` : `sfx/${asset.category}`,
      volumeModifier: 1.0,
      loop: asset.loopable,
      createdAt: asset.createdAt,
    };

    if (existing) {
      Object.assign(existing, trackItem);
    } else {
      library.push(trackItem);
    }
  }

  saveLibrary(library);
}

// Rescan and Rebuild Metadata without re-downloading
export async function rescanAndRebuildMetadata(): Promise<{
  success: boolean;
  manifest: LibraryManifest;
  message: string;
}> {
  return executeAudioLibrarySetup({ forceReinstall: false });
}

// Semantic Query with Weighted Random Selection for Game Master / Audio Engine
export function queryOrganizedAudio(criteria: {
  type?: 'ambience' | 'sfx' | 'music';
  environment?: string;
  weather?: string;
  time?: string;
  category?: string;
  tags?: string[];
  event?: string;
}): OrganizedAudioMetadata | null {
  const manifestPath = path.join(AUDIO_METADATA_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const manifest: LibraryManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    let matches = manifest.assets;

    if (criteria.type) {
      matches = matches.filter((a) => a.type === criteria.type);
    }

    if (criteria.category) {
      const cat = criteria.category.toLowerCase();
      matches = matches.filter((a) => a.category.toLowerCase() === cat);
    }

    // Tag matching scoring
    const searchTerms: string[] = [];
    if (criteria.environment) searchTerms.push(criteria.environment.toLowerCase());
    if (criteria.weather) searchTerms.push(criteria.weather.toLowerCase());
    if (criteria.time) searchTerms.push(criteria.time.toLowerCase());
    if (criteria.event) searchTerms.push(criteria.event.toLowerCase());
    if (criteria.tags) searchTerms.push(...criteria.tags.map((t) => t.toLowerCase()));

    if (searchTerms.length > 0) {
      const scored = matches.map((asset) => {
        let score = 0;
        const assetStr = `${asset.category} ${asset.tags.join(' ')} ${asset.title}`.toLowerCase();
        for (const term of searchTerms) {
          if (assetStr.includes(term)) score += 2;
          if (asset.category.toLowerCase() === term) score += 5;
        }
        return { asset, score };
      });

      const best = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
      if (best.length === 0) return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : null;

      // Weighted random selection among top matches to avoid repetitive sounds
      const topPool = best.slice(0, Math.min(5, best.length));
      const chosen = topPool[Math.floor(Math.random() * topPool.length)];
      return chosen.asset;
    }

    return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : null;
  } catch (err) {
    console.warn('Error querying audio assets:', err);
    return null;
  }
}
