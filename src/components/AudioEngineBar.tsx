import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Wind,
  Zap,
  Layers,
  Flame,
  Droplets,
  Trees,
  Home,
  Mountain,
  Sword,
  Shield,
  Activity,
  Sliders,
  X,
  AlertTriangle,
  Feather,
  Sparkles,
  Bug,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { globalAudioEngine } from '../utils/audioEngine';

interface AudioEngineBarProps {
  onOpenLibrary: () => void;
}

const ENVIRONMENTS = [
  {
    id: 'forest',
    label: 'Bosque',
    icon: Trees,
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
  },
  {
    id: 'forest_night',
    label: 'Bosque Nocturno',
    icon: Wind,
    color: 'text-blue-400 border-blue-500/40 bg-blue-950/40',
  },
  {
    id: 'village',
    label: 'Aldea',
    icon: Home,
    color: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
  },
  {
    id: 'cave',
    label: 'Cueva / Gruta',
    icon: Mountain,
    color: 'text-stone-400 border-stone-500/40 bg-stone-900/60',
  },
  {
    id: 'rain',
    label: 'Lluvia',
    icon: Droplets,
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
  },
  {
    id: 'ruins',
    label: 'Ruinas',
    icon: Flame,
    color: 'text-orange-400 border-orange-500/40 bg-orange-950/40',
  },
  {
    id: 'silence',
    label: 'Silencio',
    icon: VolumeX,
    color: 'text-neutral-400 border-neutral-700 bg-neutral-900/40',
  },
];

export const AudioEngineBar: React.FC<AudioEngineBarProps> = ({ onOpenLibrary }) => {
  const [engineState, setEngineState] = useState(globalAudioEngine.getState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    const unsubscribe = globalAudioEngine.subscribe((state) => {
      setEngineState({ ...state });
    });
    return unsubscribe;
  }, []);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const current = engineState.currentTrack;
  const layers = engineState.layersState;

  return (
    <div className="w-full bg-[#0b0b0b]/95 border-t border-neutral-800/90 backdrop-blur-md shadow-2xl z-40 transition-all font-sans text-xs">
      {/* Error Banner */}
      {engineState.lastError && (
        <div className="bg-red-950/90 text-red-200 text-xs px-4 py-2 font-mono border-b border-red-800 flex justify-between items-center animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate">Audio Engine V2 Error: {engineState.lastError}</span>
          </div>
          <button
            onClick={() => {
              (globalAudioEngine as any).lastError = null;
              (globalAudioEngine as any).notify();
            }}
            className="ml-4 hover:text-white px-2 py-0.5 rounded bg-red-900/60 hover:bg-red-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Bar (Always Visible) */}
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Left: Play & Current Music */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => globalAudioEngine.togglePlay()}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${
              engineState.isPlaying
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
            }`}
          >
            {engineState.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-100 truncate text-xs sm:text-sm">
                {current
                  ? current.title
                  : 'Audio Engine V2 — 5 Capas Activas (World, Atmosphere, Music, Action, Impact)'}
              </span>
              {current && (
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border bg-neutral-800 text-emerald-400 border-emerald-800/60 shrink-0">
                  {current.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="truncate">
                {current ? current.artist : 'Sin reproducción de música activa'}
              </span>
              {current && (
                <>
                  <span className="text-neutral-600">•</span>
                  <span className="font-mono text-[10px] text-neutral-300">
                    {formatTime(engineState.currentTime)} / {formatTime(engineState.duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: The 5 Layers Summary Chips */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 rounded-full border border-neutral-800 text-[10px]">
          <div className="flex items-center gap-1 text-emerald-400 font-medium mr-1">
            <Layers className="w-3.5 h-3.5" />
            <span>5 Capas:</span>
          </div>

          <span className="text-cyan-400 font-mono" title="Layer 1: World">
            L1:{layers.world.environment}
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-blue-400 font-mono" title="Layer 2: Atmosphere">
            L2:{layers.atmosphere.detail}
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-emerald-400 font-mono" title="Layer 3: Music">
            L3:{current ? 'OST' : 'Amb'}
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-amber-400 font-mono" title="Layer 4: Action">
            L4:{layers.action.currentEvent || 'idle'}
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-red-400 font-mono" title="Layer 5: Impact">
            L5:{layers.impact.currentEvent || 'idle'}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/audio-test"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-medium transition-all"
            title="Abrir Laboratorio de Validación Acústica & Muestras Reales"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Test Lab</span>
          </a>

          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              showDebug
                ? 'bg-purple-950/80 border-purple-600/80 text-purple-200'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
            }`}
            title="Mostrar / Ocultar panel de Audio Debug Mode"
          >
            <Bug className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Audio Debug</span>
          </button>

          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-all"
          >
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Mezclador</span>
          </button>
        </div>
      </div>

      {/* AUDIO DEBUG MODE PANEL V5 (Unsimulated Woosh & Physical Verification Inspector) */}
      {showDebug && (
        <div className="bg-[#121016] border-t border-purple-900/40 p-3.5 font-mono text-[11px] text-purple-200 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-2">
            <div className="flex items-center gap-2 font-semibold text-purple-300">
              <Bug className="w-4 h-4 text-purple-400" />
              <span>AI AUDIO DEBUG MODE V5 — SonyResearch/Woosh Physical Inspector</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-purple-400">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/audio/generate-woosh-direct', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        prompt: 'razor-sharp kunai blade slicing rapidly through air',
                        event: 'kunai_throw',
                        material: 'metal',
                        intensity: 0.85,
                        bypassCache: true,
                      }),
                    });
                    const gen = await res.json();
                    if (gen.aiGenerationConfirmed && gen.generatedFile) {
                      globalAudioEngine.triggerSFX(
                        'action',
                        'kunai_throw',
                        gen.generatedFile,
                        0.85,
                        0,
                      );
                      globalAudioEngine.logDebug(
                        'action',
                        'kunai_throw',
                        gen.generatedFile,
                        100,
                        `🟢 [AI GENERATED - Woosh] File: ${gen.generatedFile} (${(gen.fileSize / 1024).toFixed(1)} KB) | ${gen.generationTimeMs}ms`,
                        false,
                      );
                    } else {
                      globalAudioEngine.logDebug(
                        'action',
                        'kunai_throw',
                        '',
                        0,
                        `🔴 [AI GENERATION FAILED] ${gen.errorReason || 'Woosh Unavailable'} | ExitCode: ${gen.exitCode}`,
                        false,
                      );
                    }
                  } catch (e: any) {
                    console.error('Direct Woosh error:', e);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-purple-900/90 hover:bg-purple-800 text-purple-100 border border-purple-500 transition-colors cursor-pointer shadow font-semibold"
                title="Ejecutar inferencia directa en SonyResearch/Woosh sin fallbacks a biblioteca"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>[GENERATE WITH WOOSH]</span>
              </button>
              <span>
                Provider: <strong className="text-cyan-300">SonyResearch/Woosh</strong>
              </span>
              <span>
                Glued State:{' '}
                <strong className="text-amber-400">
                  {engineState.currentTrack?.id === 'track_naruto_glued_state'
                    ? 'ACTIVE (Combat Strategy)'
                    : 'PROTECTED'}
                </strong>
              </span>
            </div>
          </div>

          {/* Real-Time Debug Logs List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {engineState.debugLogs.length === 0 ? (
              <div className="text-neutral-500 italic text-[10px]">
                Esperando evaluación de escena narrativa por AI Audio Director...
              </div>
            ) : (
              engineState.debugLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 bg-purple-950/30 p-2 rounded border border-purple-900/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 shrink-0">{log.timestamp}</span>
                    <span
                      className={`px-1 rounded text-[9px] uppercase font-bold shrink-0 ${
                        log.layer === 'world'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                          : log.layer === 'music'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : log.layer === 'action'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {log.layer}
                    </span>
                    <span className="font-semibold text-purple-200 shrink-0">[{log.event}]</span>
                    <span className="text-neutral-300 flex-1 truncate">{log.reason}</span>
                    <div className="flex items-center gap-1 shrink-0 font-bold">
                      {log.confidence >= 50 ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> {log.confidence}%
                        </span>
                      ) : (
                        <span
                          className="text-red-400 flex items-center gap-0.5"
                          title="Score < 0.85 -> Silencio mantenido. NINGÚN sonido incorrecto ni aleatorio."
                        >
                          <XCircle className="w-3 h-3" /> SILENCE (Score &lt; 0.85)
                        </span>
                      )}
                    </div>
                  </div>
                  {log.matchedFile && (
                    <div className="text-[10px] text-cyan-300 font-mono flex items-center justify-between gap-2 pl-4">
                      <span className="truncate">Resource: {log.matchedFile}</span>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/audio/assetize', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                fileUrl: log.matchedFile,
                                title: `Asset IA: ${log.event}`,
                                event: log.event,
                                layer: log.layer,
                                tags: [log.event, log.layer, 'user_liked'],
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert(`⭐ ${data.message}: ${data.title}`);
                            }
                          } catch (e: any) {
                            console.error('Assetize error:', e);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-700 text-[9px] font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Promover sonido a Asset Permanente de la Biblioteca"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" /> ❤️ Assetear
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Expanded Mixer Panel */}
      {isExpanded && (
        <div className="border-t border-neutral-800 bg-[#0f0f0f] p-4 text-xs text-neutral-300 space-y-4 animate-in fade-in duration-200">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="font-semibold text-neutral-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Controles de Canales Directos</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {ENVIRONMENTS.map((env) => {
                const Icon = env.icon;
                const isActive = engineState.activeAmbience === env.id;
                return (
                  <button
                    key={env.id}
                    onClick={() =>
                      globalAudioEngine.setWorldLayer(
                        env.id,
                        env.id === 'silence' ? null : `/audio/ambience/${env.id}/${env.id}.ogg`,
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                      isActive
                        ? `${env.color} ring-1 ring-emerald-500/50 shadow-md`
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{env.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
