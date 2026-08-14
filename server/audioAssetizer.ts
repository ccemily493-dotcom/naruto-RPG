import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { analyzeWavFile } from './audioAnalyzer';
import { ManifestItem } from './semanticMatcher';

export interface AssetizeRequest {
  fileUrl: string;
  title: string;
  event: string;
  layer?: 'action' | 'impact' | 'world' | 'atmosphere' | 'music';
  material?: string;
  intensity?: 'low' | 'medium' | 'high';
  tags?: string[];
  notes?: string;
}

export interface AssetizeResult {
  success: boolean;
  assetId: string;
  assetUrl: string;
  title: string;
  event: string;
  message: string;
  fileSize: number;
  duration: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const ASSETS_DIR = path.join(DATA_DIR, 'audio', 'assets');
const MANIFEST_PATH = path.join(DATA_DIR, 'audio_manifest.json');
const LIBRARY_PATH = path.join(DATA_DIR, 'audio_library.json');

function getSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

export async function assetizeAudioFile(req: AssetizeRequest): Promise<AssetizeResult> {
  if (!req.fileUrl) {
    throw new Error('fileUrl es requerido para assetear un sonido');
  }

  // Resolve physical path on disk
  let localPath = req.fileUrl;
  if (req.fileUrl.startsWith('/')) {
    localPath = path.join(process.cwd(), req.fileUrl.substring(1));
  } else if (!path.isAbsolute(req.fileUrl)) {
    localPath = path.join(process.cwd(), req.fileUrl);
  }

  if (!fs.existsSync(localPath)) {
    throw new Error(`El archivo de audio no existe en el disco: ${localPath}`);
  }

  const fileBuffer = fs.readFileSync(localPath);
  const hash = getSha256(fileBuffer);
  const ext = path.extname(localPath) || '.wav';

  // Ensure assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  const destFilename = `asset_${req.event.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${hash}${ext}`;
  const destPath = path.join(ASSETS_DIR, destFilename);

  // Copy audio file to permanent assets directory
  fs.writeFileSync(destPath, fileBuffer);

  const fileSize = fileBuffer.length;
  let duration = 2.0;
  if (ext.toLowerCase() === '.wav') {
    const analysis = analyzeWavFile(destPath);
    if (analysis.duration > 0) duration = analysis.duration;
  }

  const publicAssetUrl = `/data/audio/assets/${destFilename}`;
  const assetId = `asset_${hash}`;
  const tags = Array.from(new Set(['ai_generated', 'assetized', 'user_favorite', req.event, ...(req.tags || [])]));

  // 1. Update data/audio_manifest.json for semanticMatcher
  let manifest: ManifestItem[] = [];
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    }
  } catch {}

  const newItem: ManifestItem = {
    id: assetId,
    file: publicAssetUrl,
    title: req.title || `Asset AI: ${req.event}`,
    artist: 'SonyResearch/Woosh AI (Assetized)',
    category: 'ai_assetized',
    layer: req.layer || (req.event.includes('impact') ? 'impact' : 'action'),
    events: Array.from(new Set([req.event, ...(req.tags || [])])),
    materials: [req.material || 'chakra'],
    intensity: req.intensity || 'high',
    duration,
    combat: true,
    tags,
  };

  // Replace existing asset if same ID exists, otherwise prepend
  const existingIdx = manifest.findIndex((m) => m.id === assetId);
  if (existingIdx >= 0) {
    manifest[existingIdx] = newItem;
  } else {
    manifest.unshift(newItem);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

  // 2. Update data/audio_library.json for Audio Library UI
  try {
    let library: any[] = [];
    if (fs.existsSync(LIBRARY_PATH)) {
      library = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf-8'));
    }

    const libTrack = {
      id: assetId,
      title: req.title || `Asset AI: ${req.event}`,
      artist: 'SonyResearch/Woosh AI (Favorito)',
      duration,
      url: publicAssetUrl,
      filename: destFilename,
      category: 'ai_assetized',
      fileSize,
      format: ext.substring(1),
      tags,
      isAssetized: true,
      createdAt: new Date().toISOString(),
    };

    const libIdx = library.findIndex((t) => t.id === assetId);
    if (libIdx >= 0) {
      library[libIdx] = libTrack;
    } else {
      library.unshift(libTrack);
    }

    fs.writeFileSync(LIBRARY_PATH, JSON.stringify(library, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Assetizer] Error updating audio_library.json:', err);
  }

  return {
    success: true,
    assetId,
    assetUrl: publicAssetUrl,
    title: newItem.title,
    event: req.event,
    message: 'Sonido promovido exitosamente a Asset de la Biblioteca Permanente',
    fileSize,
    duration,
  };
}
