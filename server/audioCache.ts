import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface CachedSFXEntry {
  hash: string;
  provider: string;
  model: string;
  event: string;
  prompt: string;
  fileUrl: string;
  filePath: string;
  duration: number;
  createdAt: string;
  status?: 'keep' | 'rejected' | 'ready';
  rejectionReason?: string;
}

export function updateCachedSFXStatus(hash: string, status: 'keep' | 'rejected', reason?: string): boolean {
  ensureCacheDir();
  if (cacheIndex[hash]) {
    cacheIndex[hash].status = status;
    if (reason) cacheIndex[hash].rejectionReason = reason;
    fs.writeFileSync(CACHE_INDEX_FILE, JSON.stringify(cacheIndex, null, 2), 'utf-8');
    return true;
  }
  return false;
}

const GENERATED_AUDIO_DIR = path.join(process.cwd(), 'data', 'audio', 'generated');
const CACHE_INDEX_FILE = path.join(GENERATED_AUDIO_DIR, 'cache_index.json');

let cacheIndex: Record<string, CachedSFXEntry> = {};

function ensureCacheDir() {
  if (!fs.existsSync(GENERATED_AUDIO_DIR)) {
    fs.mkdirSync(GENERATED_AUDIO_DIR, { recursive: true });
  }
  if (fs.existsSync(CACHE_INDEX_FILE)) {
    try {
      cacheIndex = JSON.parse(fs.readFileSync(CACHE_INDEX_FILE, 'utf-8'));
    } catch (e) {
      cacheIndex = {};
    }
  } else {
    fs.writeFileSync(CACHE_INDEX_FILE, JSON.stringify({}), 'utf-8');
  }
}

/**
 * Calculates SHA-256 Hash including provider and model
 * to prevent cross-provider asset reuse.
 */
export function generateSFXHash(
  type: string,
  event: string,
  material = 'neutral',
  intensity = 0.5,
  description = '',
  context = '',
  provider = 'woosh',
  model = 'Woosh-Flow'
): string {
  const payload = `${type.toLowerCase()}_${event.toLowerCase()}_${material.toLowerCase()}_${intensity.toFixed(2)}_${description.toLowerCase()}_${context.toLowerCase()}_${provider.toLowerCase()}_${model.toLowerCase()}`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 20);
}

export function getCachedSFX(hash: string): CachedSFXEntry | null {
  ensureCacheDir();
  const entry = cacheIndex[hash];
  if (entry && fs.existsSync(entry.filePath)) {
    return entry;
  }
  return null;
}

export function saveCachedSFX(
  hash: string,
  provider: string,
  model: string,
  event: string,
  prompt: string,
  buffer: Buffer,
  format = 'wav',
  duration = 1.5
): CachedSFXEntry {
  ensureCacheDir();
  const filename = `${hash}_${event}.${format}`;
  const filePath = path.join(GENERATED_AUDIO_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  const fileUrl = `/audio/generated/${filename}`;
  const entry: CachedSFXEntry = {
    hash,
    provider,
    model,
    event,
    prompt,
    fileUrl,
    filePath,
    duration,
    createdAt: new Date().toISOString(),
  };

  cacheIndex[hash] = entry;
  fs.writeFileSync(CACHE_INDEX_FILE, JSON.stringify(cacheIndex, null, 2), 'utf-8');
  return entry;
}
