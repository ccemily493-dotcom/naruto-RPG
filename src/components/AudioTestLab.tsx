import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, CheckCircle, XCircle, Activity, Sparkles, Sliders, AlertTriangle, Terminal, HardDrive } from 'lucide-react';

export interface AudioTestPreset {
  id: string;
  name: string;
  type: 'action' | 'impact';
  event: string;
  material: string;
  prompt: string;
}

const PRESETS: AudioTestPreset[] = [
  { id: 'chakra', name: 'CHAKRA', type: 'action', event: 'chakra_charge', material: 'energy', prompt: 'Supernatural energy charging. Low resonant chakra hum gradually increasing, subtle vibrating energy pulse.' },
  { id: 'kunai_throw', name: 'KUNAI THROW', type: 'action', event: 'kunai_throw', material: 'metal', prompt: 'Short cinematic game foley. Sharp steel projectile rapidly slicing through air.' },
  { id: 'metal_wood_impact', name: 'METAL-WOOD IMPACT', type: 'impact', event: 'metal_wood_impact', material: 'metal_wood', prompt: 'Heavy cinematic game impact foley. Sharp steel kunai blade violently slamming into wooden tree trunk.' },
  { id: 'wood_root_growth', name: 'WOOD ROOT GROWTH', type: 'action', event: 'wood_root_growth', material: 'wood', prompt: 'Organic supernatural wood growth. Thick roots rapidly emerging from soil, fibrous wood cracking.' },
  { id: 'wood_impact', name: 'WOOD IMPACT', type: 'impact', event: 'wood_impact', material: 'wood', prompt: 'Heavy massive wooden root slamming violently into target with deep organic thud.' },
  { id: 'mokuton_activation', name: 'MOKUTON ACTIVATION', type: 'action', event: 'mokuton_activation', material: 'wood', prompt: 'Mokuton wood release secret technique activation. Deep wooden vibration and root expansion.' },
  { id: 'inton', name: 'INTON', type: 'action', event: 'inton_activation', material: 'chakra', prompt: 'Yin release Inton spiritual activation. Ethereal perception distortion and subtle mind pulse.' },
  { id: 'third_eye', name: 'THIRD EYE', type: 'action', event: 'third_eye_activation', material: 'chakra', prompt: 'Tenketsu third eye dōjutsu sensory pulse. Subtle high-frequency perception resonance.' },
  { id: 'kali_manifestation', name: 'KALI MANIFESTATION', type: 'action', event: 'kali_manifestation', material: 'energy', prompt: 'Imposing spectral multi-armed entity manifestation with deep ethereal resonance and layered energy.' },
  { id: 'shiva_manifestation', name: 'SHIVA MANIFESTATION', type: 'action', event: 'shiva_manifestation', material: 'energy', prompt: 'Divine destruction aura manifestation. Deep spiritual pressure pulse and massive energy aura.' },
];

export const AudioTestLab: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<AudioTestPreset>(PRESETS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [wooshResult, setWooshResult] = useState<any>(null);
  const [assetResult, setAssetResult] = useState<any>(null);
  const [activeMode, setActiveMode] = useState<'woosh' | 'asset'>('woosh');
  const [analysis, setAnalysis] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    handleGenerateWoosh(selectedPreset);
  }, [selectedPreset]);

  /**
   * DIRECT WOOSH GENERATION MODE (NO FALLBACKS ALLOWED)
   */
  const handleGenerateWoosh = async (preset: AudioTestPreset) => {
    setIsLoading(true);
    setActiveMode('woosh');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/audio/generate-woosh-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: preset.prompt,
          event: preset.event,
          material: preset.material,
          intensity: 0.85,
          bypassCache: true,
        }),
      });
      const data = await res.json();
      setWooshResult(data);
      if (data.aiGenerationConfirmed && data.generatedFile) {
        await runAnalysis(data.generatedFile);
      } else {
        setAnalysis(null);
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * EXISTING ASSET CATALOG MODE
   */
  const handleUseExistingAsset = async (preset: AudioTestPreset) => {
    setIsLoading(true);
    setActiveMode('asset');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/audio/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneText: preset.prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        const sMatch = data.sfxMatches?.[0];
        const matchItem = sMatch?.match?.matchedItem;
        const resObj = {
          audioUrl: matchItem?.file || '',
          confidence: sMatch?.match?.confidence || 0,
          matchedName: matchItem?.name || 'No catalog match',
          layer: matchItem?.layer || preset.type,
        };
        setAssetResult(resObj);
        if (resObj.audioUrl) {
          await runAnalysis(resObj.audioUrl);
        } else {
          setAnalysis(null);
        }
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async (url: string) => {
    try {
      const res = await fetch('/api/audio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: url }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        drawWaveform(url);
      }
    } catch (e) {}
  };

  const drawWaveform = (url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((ab) => {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        return audioCtx.decodeAudioData(ab);
      })
      .then((audioBuffer) => {
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum = sum + Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = activeMode === 'woosh' ? '#10b981' : '#3b82f6';
        const width = canvas.width / filteredData.length;
        for (let i = 0; i < filteredData.length; i++) {
          const x = i * width;
          const height = filteredData[i] * canvas.height * 2.5;
          ctx.fillRect(x, (canvas.height - height) / 2, width - 1, height);
        }
      })
      .catch(() => {});
  };

  const handlePlay = () => {
    const activeUrl = activeMode === 'woosh' ? wooshResult?.generatedFile : assetResult?.audioUrl;
    if (activeUrl) {
      if (activeAudioRef.current) activeAudioRef.current.pause();
      const a = new Audio(activeUrl);
      activeAudioRef.current = a;
      a.play().catch(() => {});
    }
  };

  const handleStop = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 font-sans p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-100">AI AUDIO PROVIDER AUDIT LAB V5.0</h1>
            <p className="text-xs text-neutral-400">Verificación Física de Inferencia SonyResearch/Woosh & Aislamiento de Respaldo</p>
          </div>
        </div>

        <a
          href="/"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
        >
          Volver al Juego
        </a>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Presets Selection List */}
        <div className="bg-[#121216] border border-neutral-800 rounded-xl p-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <span>Escenarios Icónicos</span>
          </h2>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex justify-between items-center ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500/40 shadow-lg'
                      : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span className="font-semibold">{preset.name}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {preset.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center & Right: Audio Inspector & CLI Diagnostics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Bar & Mode Switching */}
          <div className="bg-[#121216] border border-neutral-800 rounded-xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {selectedPreset.type} • {selectedPreset.event}
                  </span>

                  {/* VISUAL BADGES (UNAMBIGUOUS) */}
                  {activeMode === 'woosh' ? (
                    isLoading ? (
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1 animate-pulse">
                        🟡 GENERATING WITH WOOSH (CPU INFERENCE IN PROGRESS...)
                      </span>
                    ) : wooshResult?.aiGenerationConfirmed ? (
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                        🟢 AI GENERATED (Woosh Physical File)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 flex items-center gap-1">
                        🔴 AI GENERATION FAILED (WOOSH UNAVAILABLE)
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 flex items-center gap-1">
                      🔵 EXISTING ASSETS CATALOG
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-neutral-100 mt-1">{selectedPreset.name}</h3>
              </div>

              {/* SEPARATE BUTTONS FOR ISOLATED TESTING */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleGenerateWoosh(selectedPreset)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-950 border border-emerald-600 text-emerald-200 hover:bg-emerald-900 font-semibold text-xs transition-colors shadow disabled:opacity-50"
                  title="Ejecuta inferencia directa en SonyResearch/Woosh. Si falla, NO usa fallbacks."
                >
                  {isLoading && activeMode === 'woosh' ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" /> [GENERATING...]
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" /> [GENERATE WITH WOOSH]
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleUseExistingAsset(selectedPreset)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-950 border border-blue-600 text-blue-200 hover:bg-blue-900 font-semibold text-xs transition-colors shadow"
                  title="Busca en el catálogo de recursos existentes pre-grabados."
                >
                  <HardDrive className="w-4 h-4 text-blue-400" /> [USE EXISTING ASSET]
                </button>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3 pt-2 border-t border-neutral-800">
              <button
                onClick={handlePlay}
                disabled={activeMode === 'woosh' && !wooshResult?.aiGenerationConfirmed}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs shadow-md transition-colors ${
                  activeMode === 'woosh' && !wooshResult?.aiGenerationConfirmed
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Play className="w-4 h-4" /> PLAY
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs border border-neutral-700 transition-colors"
              >
                <Square className="w-4 h-4" /> STOP
              </button>
            </div>

            {/* Acoustic Prompt Display */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-300">
              <span className="text-neutral-500 font-sans block mb-1">Prompt Acústico para Woosh:</span>
              <p className="text-cyan-300 leading-relaxed">"{wooshResult?.acousticPrompt || selectedPreset.prompt}"</p>
            </div>

            {/* Waveform Visualizer */}
            <div className="bg-black/60 border border-neutral-800 rounded-lg p-3">
              <canvas ref={canvasRef} width={600} height={80} className="w-full h-20 bg-black/40 rounded" />
            </div>

            {/* DIRECT CLI DIAGNOSTICS DISPLAY */}
            {activeMode === 'woosh' && wooshResult && (
              <div className="bg-black/80 border border-purple-900/60 rounded-lg p-4 font-mono text-[11px] space-y-3 text-purple-200 shadow-inner">
                <div className="flex items-center gap-2 border-b border-purple-900/40 pb-2 font-semibold text-purple-300">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>SonyResearch/Woosh Physical Inference CLI Diagnostics</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-neutral-500 block">PROVIDER:</span>
                    <span className="text-cyan-300 truncate block">SonyResearch/Woosh</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">MODEL CHECKPOINT:</span>
                    <span className="text-emerald-300 block">{wooshResult.model}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">PHYSICAL WAV PATH:</span>
                    <span className="text-amber-300 block truncate">{wooshResult.generatedFile || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">AI GENERATION CONFIRMED:</span>
                    <span className={wooshResult.aiGenerationConfirmed ? 'text-emerald-400 font-bold block' : 'text-red-400 font-bold block'}>
                      {wooshResult.aiGenerationConfirmed ? 'TRUE ✅ (Brand-New WAV Created)' : 'FALSE ❌ (No WAV Created)'}
                    </span>
                  </div>
                </div>

                <div className="bg-purple-950/40 p-2.5 rounded border border-purple-900/40 space-y-1.5">
                  <span className="text-neutral-400 text-[10px] block">COMMAND EXECUTED:</span>
                  <div className="text-amber-200 text-[10px] font-mono break-all">{wooshResult.command}</div>
                  <div className="flex flex-wrap gap-4 text-[10px] text-purple-300 pt-1">
                    <span>Exit Code: <strong className={wooshResult.exitCode === 0 ? 'text-emerald-400' : 'text-red-400'}>{wooshResult.exitCode}</strong></span>
                    <span>Generation Time: <strong>{wooshResult.generationTimeMs} ms</strong></span>
                    <span>File Size: <strong>{(wooshResult.fileSize / 1024).toFixed(2)} KB</strong></span>
                    <span>GPU/CUDA Status: <strong className="text-cyan-300">CPU (WOOSH_GPU_STATUS = UNAVAILABLE)</strong></span>
                  </div>
                </div>

                {wooshResult.errorReason && (
                  <div className="bg-red-950/60 border border-red-800 text-red-200 p-2.5 rounded text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>WOOSH FAILED:</strong>
                      <p className="mt-0.5 font-mono">{wooshResult.errorReason}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
