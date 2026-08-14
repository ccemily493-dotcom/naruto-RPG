import { soundManager } from './soundGenerators';
import { AudioTrack } from '../types';

export interface DebugEntry {
  id: string;
  timestamp: string;
  layer: 'world' | 'atmosphere' | 'music' | 'action' | 'impact';
  event: string;
  matchedFile: string | null;
  confidence: number;
  reason: string;
  fallbackUsed: boolean;
}

export interface AudioEngine5LayersState {
  world: { environment: string; file: string | null; volume: number };
  atmosphere: { detail: string; file: string | null; volume: number };
  music: { trackTitle: string | null; category: string | null; volume: number };
  action: { currentEvent: string | null; volume: number };
  impact: { currentEvent: string | null; volume: number };
}

export interface AudioEngineStateV2 {
  isPlaying: boolean;
  currentTrack: AudioTrack | null;
  currentTime: number;
  duration: number;
  musicVolume: number;
  ambienceVolume: number;
  sfxVolume: number;
  isMusicMuted: boolean;
  isAmbienceMuted: boolean;
  isSfxMuted: boolean;
  activeAmbience: string;
  autoMatchEnabled: boolean;
  isDucking: boolean;
  lastError: string | null;
  debugMode: boolean;
  debugLogs: DebugEntry[];
  layersState: AudioEngine5LayersState;
}

export type AudioPlaybackListenerV2 = (state: AudioEngineStateV2) => void;

class AudioEngineV2 {
  // Layer 1: World (Weather / Environment)
  private worldAudio: HTMLAudioElement;
  // Layer 2: Atmosphere (Detail / Nature)
  private atmosphereAudio: HTMLAudioElement;
  // Layer 3: Music (OST / Emotional)
  private musicAudioA: HTMLAudioElement;
  private musicAudioB: HTMLAudioElement;
  private activeMusicChannel: 'A' | 'B' = 'A';
  // Layer 4 & 5 Pool: Action & Impact SFX
  private sfxAudioPool: HTMLAudioElement[] = [];

  // State Properties
  private currentTrack: AudioTrack | null = null;
  private isPlaying = false;
  private musicVolume = 0.7;
  private ambienceVolume = 0.4;
  private sfxVolume = 0.75;
  private isMusicMuted = false;
  private isAmbienceMuted = false;
  private isSfxMuted = false;
  private activeAmbience = 'forest';
  private autoMatchEnabled = true;
  private isDucking = false;
  private duckTimeout: any = null;
  private lastError: string | null = null;
  private debugMode = true;
  private debugLogs: DebugEntry[] = [];
  private listeners: Set<AudioPlaybackListenerV2> = new Set();
  private hasUserInteracted = false;

  private layersState: AudioEngine5LayersState = {
    world: { environment: 'forest', file: '/audio/ambience/forest/forest-rain.ogg', volume: 0.4 },
    atmosphere: { detail: 'leaves', file: '/audio/ambience/wind/wind.ogg', volume: 0.3 },
    music: { trackTitle: null, category: null, volume: 0.7 },
    action: { currentEvent: null, volume: 0.75 },
    impact: { currentEvent: null, volume: 0.75 },
  };

  constructor() {
    this.worldAudio = new Audio();
    this.atmosphereAudio = new Audio();
    this.musicAudioA = new Audio();
    this.musicAudioB = new Audio();

    this.worldAudio.loop = true;
    this.atmosphereAudio.loop = true;

    this.setupAudioListeners(this.musicAudioA);
    this.setupAudioListeners(this.musicAudioB);

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (!this.hasUserInteracted) {
          this.hasUserInteracted = true;
          soundManager.init();
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
        }
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }
  }

  private setupAudioListeners(audio: HTMLAudioElement) {
    audio.preload = 'auto';
    audio.addEventListener('timeupdate', () => {
      if (this.getMusicAudio() === audio) this.notify();
    });
    audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notify();
    });
    audio.addEventListener('pause', () => {
      if (this.musicAudioA.paused && this.musicAudioB.paused) {
        this.isPlaying = false;
        this.notify();
      }
    });
    audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notify();
    });
  }

  private getMusicAudio(): HTMLAudioElement {
    return this.activeMusicChannel === 'A' ? this.musicAudioA : this.musicAudioB;
  }

  public subscribe(listener: AudioPlaybackListenerV2): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public getState(): AudioEngineStateV2 {
    const active = this.getMusicAudio();
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      currentTime: active.currentTime || 0,
      duration: active.duration || 0,
      musicVolume: this.musicVolume,
      ambienceVolume: this.ambienceVolume,
      sfxVolume: this.sfxVolume,
      isMusicMuted: this.isMusicMuted,
      isAmbienceMuted: this.isAmbienceMuted,
      isSfxMuted: this.isSfxMuted,
      activeAmbience: this.activeAmbience,
      autoMatchEnabled: this.autoMatchEnabled,
      isDucking: this.isDucking,
      lastError: this.lastError,
      debugMode: this.debugMode,
      debugLogs: this.debugLogs.slice(-15), // Keep last 15 debug logs
      layersState: this.layersState,
    };
  }

  public logDebug(
    layer: 'world' | 'atmosphere' | 'music' | 'action' | 'impact',
    event: string,
    matchedFile: string | null,
    confidence: number,
    reason: string,
    fallbackUsed: boolean,
  ) {
    const timeStr = new Date().toLocaleTimeString();
    const entry: DebugEntry = {
      id: Math.random().toString(36).substr(2, 6),
      timestamp: timeStr,
      layer,
      event,
      matchedFile,
      confidence,
      reason,
      fallbackUsed,
    };
    this.debugLogs.push(entry);
    this.notify();
  }

  // --- LAYER 1 & 2: WORLD & ATMOSPHERE ---

  public setWorldLayer(environment: string, url: string | null, volume = 0.4) {
    this.activeAmbience = environment;
    this.layersState.world = { environment, file: url, volume };

    if (!url) {
      if (!this.worldAudio.paused) this.worldAudio.pause();
      this.notify();
      return;
    }

    try {
      if (!this.worldAudio.src.includes(url) || this.worldAudio.paused) {
        this.worldAudio.src = url;
        this.worldAudio.loop = true;
        this.worldAudio.volume = this.isAmbienceMuted ? 0 : Math.min(1, volume);
        this.worldAudio.play().catch((e) => console.warn('[AudioEngineV2] World play note:', e));
      } else {
        this.worldAudio.volume = this.isAmbienceMuted ? 0 : Math.min(1, volume);
      }
    } catch (err: any) {
      this.lastError = `World Layer Error: ${err.message}`;
    }
    this.notify();
  }

  // --- LAYER 3: MUSIC ---

  public async playTrack(
    track: AudioTrack,
    transition: 'continue' | 'crossfade' | 'fade_in' = 'crossfade',
    intensity = 0.7,
  ) {
    soundManager.init();
    const incoming = this.activeMusicChannel === 'A' ? this.musicAudioB : this.musicAudioA;
    const currentAudio = this.getMusicAudio();

    if (this.currentTrack?.id === track.id && !currentAudio.paused) {
      this.setMusicVolume(intensity);
      return;
    }

    this.currentTrack = track;
    this.layersState.music.trackTitle = track.title;
    this.layersState.music.category = track.category;

    incoming.src = track.url;
    incoming.loop = true;

    const targetVol = this.isMusicMuted ? 0 : Math.min(1, this.musicVolume * intensity);

    if (transition === 'crossfade' && !currentAudio.paused) {
      incoming.volume = 0;
      await incoming.play().catch(() => {});
      this.activeMusicChannel = this.activeMusicChannel === 'A' ? 'B' : 'A';

      const fadeTime = 1500;
      const steps = 15;
      const interval = fadeTime / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const factor = step / steps;
        incoming.volume = targetVol * factor;
        currentAudio.volume = Math.max(0, currentAudio.volume * (1 - factor));
        if (step >= steps) {
          clearInterval(timer);
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }, interval);
    } else {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      incoming.volume = targetVol;
      await incoming.play().catch(() => {});
      this.activeMusicChannel = this.activeMusicChannel === 'A' ? 'B' : 'A';
    }
    this.notify();
  }

  // --- LAYER 4 & 5: ACTION & IMPACT SFX ---

  public triggerSFX(
    layer: 'action' | 'impact',
    event: string,
    url: string | null,
    intensity = 0.8,
    offsetMs = 0,
  ) {
    if (this.isSfxMuted || !url) return;

    soundManager.init();

    setTimeout(() => {
      try {
        const sfx = new Audio(url);
        sfx.volume = Math.max(0, Math.min(1, this.sfxVolume * intensity));
        sfx.play().catch((e) => console.warn('[AudioEngineV2] SFX note:', e));

        if (layer === 'action') this.layersState.action.currentEvent = event;
        if (layer === 'impact') this.layersState.impact.currentEvent = event;

        this.sfxAudioPool.push(sfx);
        sfx.addEventListener('ended', () => {
          this.sfxAudioPool = this.sfxAudioPool.filter((a) => a !== sfx);
          if (this.layersState[layer].currentEvent === event) {
            this.layersState[layer].currentEvent = null;
          }
          this.notify();
        });

        this.triggerDucking();
        this.notify();
      } catch (err: any) {
        this.lastError = `SFX Trigger Error: ${err.message}`;
      }
    }, offsetMs);
  }

  // --- AUDIO DUCKING ---

  private triggerDucking() {
    if (this.isDucking) return;
    this.isDucking = true;
    const currentAudio = this.getMusicAudio();
    const origVol = currentAudio.volume;
    currentAudio.volume = origVol * 0.45;

    if (this.duckTimeout) clearTimeout(this.duckTimeout);
    this.duckTimeout = setTimeout(() => {
      currentAudio.volume = origVol;
      this.isDucking = false;
      this.notify();
    }, 1200);
    this.notify();
  }

  // --- CONTROLS & TOGGLES ---

  public togglePlay() {
    const active = this.getMusicAudio();
    if (this.isPlaying) {
      active.pause();
      this.isPlaying = false;
    } else {
      active.play().catch(() => {});
      this.isPlaying = true;
    }
    this.notify();
  }

  public pause() {
    this.togglePlay();
  }

  public stop() {
    this.stopAll();
  }

  public stopMusic() {
    const active = this.getMusicAudio();
    active.pause();
    active.currentTime = 0;
    this.isPlaying = false;
    this.currentTrack = null;
    this.notify();
  }

  public stopAll() {
    this.stopMusic();
    this.worldAudio.pause();
    this.worldAudio.currentTime = 0;
    this.atmosphereAudio.pause();
    this.atmosphereAudio.currentTime = 0;
    this.notify();
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.getMusicAudio().volume = this.isMusicMuted ? 0 : this.musicVolume;
    this.notify();
  }

  public setAmbienceVolume(val: number) {
    this.ambienceVolume = Math.max(0, Math.min(1, val));
    this.worldAudio.volume = this.isAmbienceMuted ? 0 : this.ambienceVolume;
    this.notify();
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.notify();
  }

  public setAutoMatch(enabled: boolean) {
    this.autoMatchEnabled = enabled;
    this.notify();
  }

  public setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    this.notify();
  }

  // --- EVALUATE NARRATIVE SCENE (AUDIO DIRECTOR V2 INTEGRATION) ---

  public async evaluateSceneContext(text: string, tacticalContext?: any) {
    if (!this.autoMatchEnabled) return;

    try {
      const res = await fetch('/api/audio/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneText: text, tacticalContext }),
      });

      if (res.ok) {
        const evaluation = await res.json();

        // 1. World Layer (L1)
        if (evaluation.worldMatch?.matchedItem) {
          const wItem = evaluation.worldMatch.matchedItem;
          this.setWorldLayer(
            evaluation.intent.world.environment,
            wItem.file,
            evaluation.intent.world.intensity,
          );
          this.logDebug(
            'world',
            evaluation.intent.world.environment,
            wItem.file,
            evaluation.worldMatch.confidence,
            evaluation.worldMatch.reason,
            false,
          );
        } else {
          this.logDebug(
            'world',
            evaluation.intent.world.environment,
            null,
            0,
            evaluation.worldMatch?.reason || 'NO_RESOURCE',
            true,
          );
        }

        // 2. Music Layer (L3)
        if (evaluation.musicMatch?.matchedItem) {
          const mItem = evaluation.musicMatch.matchedItem;
          this.playTrack(
            mItem as any,
            evaluation.intent.music.transition,
            evaluation.intent.music.intensity,
          );
          this.logDebug(
            'music',
            evaluation.intent.music.trackKey,
            mItem.file,
            evaluation.musicMatch.confidence,
            evaluation.musicMatch.reason,
            false,
          );
        } else {
          this.logDebug(
            'music',
            evaluation.intent.music.trackKey,
            null,
            0,
            evaluation.musicMatch?.reason || 'NO_RESOURCE',
            true,
          );
        }

        // 3. Action (L4) & Impact (L5) SFX Layers (AI SFX & Timing Offset Slicing)
        if (Array.isArray(evaluation.sfxMatches)) {
          evaluation.sfxMatches.forEach((sMatch: any) => {
            const ev = sMatch.event;
            const match = sMatch.match;
            const gen = sMatch.generatedResult;

            const targetUrl = gen ? gen.audioUrl : match?.matchedItem?.file;
            const offsetMs = ev.timing?.offsetMs || 0;

            if (targetUrl) {
              const providerInfo = gen ? `AI SFX (${gen.provider})` : 'Catalog';
              this.triggerSFX(
                ev.type || ev.layer,
                ev.event,
                targetUrl,
                ev.intensity || 0.8,
                offsetMs,
              );
              this.logDebug(
                ev.type || ev.layer || 'action',
                ev.event,
                targetUrl,
                gen ? 100 : match.confidence,
                `${providerInfo}: ${ev.description || match.reason}`,
                false,
              );
            } else {
              // NO_COMPATIBLE_RESOURCE: Maintain clean acoustic silence
              this.logDebug(
                ev.type || ev.layer || 'action',
                ev.event,
                null,
                0,
                match?.reason || 'NO_COMPATIBLE_RESOURCE: Pure silence maintained',
                true,
              );
            }
          });
        }
      }
    } catch (err: any) {
      this.lastError = `Evaluate V3 Error: ${err.message}`;
      console.warn('Evaluate scene error:', err);
    }
  }

  public fadeOut(durationMs = 1500) {
    const active = this.getMusicAudio();
    if (active.paused) return;
    const startVol = active.volume;
    const steps = 15;
    const interval = durationMs / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      active.volume = Math.max(0, startVol * (1 - step / steps));
      this.worldAudio.volume = Math.max(0, this.ambienceVolume * (1 - step / steps));
      if (step >= steps) {
        clearInterval(timer);
        active.pause();
        this.worldAudio.pause();
        this.notify();
      }
    }, interval);
  }
}

export const globalAudioEngine = new AudioEngineV2();
