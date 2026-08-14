import React, { useState } from 'react';
import { Sliders, Volume2, Move, Layers, Sparkles, RefreshCw } from 'lucide-react';
import { ReverbEnvironment, AudioTestLabDSP } from '../utils/audioTestLabDSP';

interface DSPRackControlsProps {
  dsp: AudioTestLabDSP | null;
  onExportWav: () => void;
  isExporting: boolean;
}

export const DSPRackControls: React.FC<DSPRackControlsProps> = ({
  dsp,
  onExportWav,
  isExporting,
}) => {
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0]);
  const [reverbEnv, setReverbEnv] = useState<ReverbEnvironment>('none');
  const [reverbMix, setReverbMix] = useState<number>(0.35);
  const [pannerPos, setPannerPos] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 1,
  });
  const [masterVol, setMasterVol] = useState<number>(1.0);

  const eqLabels = [
    { name: 'Sub (60Hz)', key: 0 },
    { name: 'Low (250Hz)', key: 1 },
    { name: 'Mid (1.2kHz)', key: 2 },
    { name: 'High-Mid (4kHz)', key: 3 },
    { name: 'High (12kHz)', key: 4 },
  ];

  const handleEqChange = (index: number, value: number) => {
    const next = [...eqGains];
    next[index] = value;
    setEqGains(next);
    dsp?.setEQBand(index, value);
  };

  const handleReverbChange = (env: ReverbEnvironment, mix = reverbMix) => {
    setReverbEnv(env);
    setReverbMix(mix);
    dsp?.setReverbEnvironment(env, mix);
  };

  const handlePannerChange = (x: number, y: number, z: number) => {
    setPannerPos({ x, y, z });
    dsp?.setPannerPosition(x, y, z);
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    dsp?.setMasterVolume(val);
  };

  const handleSimulateKunaiFlight = () => {
    if (!dsp) return;
    let step = 0;
    const totalSteps = 40;
    const interval = setInterval(() => {
      step++;
      const factor = (step / totalSteps) * 2 - 1; // -1 to +1
      const posX = factor * 4.0; // -4m to +4m
      const posZ = 1.0 - Math.abs(factor) * 0.5;
      handlePannerChange(posX, 0, posZ);

      if (step >= totalSteps) {
        clearInterval(interval);
        handlePannerChange(0, 0, 1);
      }
    }, 30);
  };

  return (
    <div className="bg-[#121216] border border-neutral-800 rounded-xl p-5 space-y-6 shadow-xl text-neutral-200 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-100">
            DSP Signal Processor & Audio Effects Rack V6.0
          </h2>
        </div>

        <button
          onClick={onExportWav}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 text-xs font-semibold shadow transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" /> Renderizando WAV...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Exportar WAV Procesado
            </>
          )}
        </button>
      </div>

      {/* Grid Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. 5-Band Parametric EQ */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-cyan-400">
              Ecualizador de 5 Bandas
            </span>
            <button
              onClick={() => {
                setEqGains([0, 0, 0, 0, 0]);
                [0, 1, 2, 3, 4].forEach((i) => dsp?.setEQBand(i, 0));
              }}
              className="text-[10px] text-neutral-400 hover:text-neutral-200 underline"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center pt-2">
            {eqLabels.map((band) => (
              <div key={band.key} className="flex flex-col items-center space-y-2">
                <span className="text-[10px] font-mono text-cyan-300">
                  {eqGains[band.key] > 0 ? `+${eqGains[band.key]}` : eqGains[band.key]}dB
                </span>
                <input
                  type="range"
                  min={-18}
                  max={18}
                  step={1}
                  value={eqGains[band.key]}
                  onChange={(e) => handleEqChange(band.key, parseFloat(e.target.value))}
                  className="h-28 accent-cyan-400 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <span className="text-[9px] text-neutral-400 font-mono leading-tight">
                  {band.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Reverb Convolver Engine */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-400">Reverb Convolutiva</span>
            <span className="text-[10px] font-mono text-neutral-400">
              Wet: {Math.round(reverbMix * 100)}%
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="block text-[11px] text-neutral-400">Entorno Acústico Naruto:</label>
            <select
              value={reverbEnv}
              onChange={(e) => handleReverbChange(e.target.value as ReverbEnvironment)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 font-semibold focus:border-emerald-500 focus:outline-none"
            >
              <option value="none">Seco / Sin Reverb (Dry)</option>
              <option value="ryuchi_cave">🏰 Cueva Subterránea Ryūchi (Decay 3.8s)</option>
              <option value="leaf_forest">🌲 Bosque Profundo de la Hoja (Decay 1.2s)</option>
              <option value="valley_end">🏞️ Valle del Fin (Decay 2.8s)</option>
              <option value="rain_village">🌧️ Aldea Oculta de la Lluvia (Decay 2.0s)</option>
              <option value="anbu_vault">🗝️ Cámara de Sellado Anbu (Decay 0.6s)</option>
            </select>

            <div className="pt-2">
              <span className="block text-[11px] text-neutral-400 mb-1">Mezcla Dry / Wet:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={reverbMix}
                onChange={(e) => handleReverbChange(reverbEnv, parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. 3D Spatial HRTF Stage Panner */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-400">
              Espacialización 3D HRTF
            </span>
            <button
              onClick={handleSimulateKunaiFlight}
              className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 hover:bg-amber-900 text-[10px] font-semibold transition-colors flex items-center gap-1"
            >
              <Move className="w-3 h-3" /> Flight Sim
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>Eje X (Izquierda / Derecha):</span>
                <span className="font-mono text-amber-300">{pannerPos.x.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.2}
                value={pannerPos.x}
                onChange={(e) =>
                  handlePannerChange(parseFloat(e.target.value), pannerPos.y, pannerPos.z)
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>Eje Z (Cerca / Distante):</span>
                <span className="font-mono text-amber-300">{pannerPos.z.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={10}
                step={0.2}
                value={pannerPos.z}
                onChange={(e) =>
                  handlePannerChange(pannerPos.x, pannerPos.y, parseFloat(e.target.value))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>Volumen Máster:</span>
                <span className="font-mono text-emerald-400">{Math.round(masterVol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={masterVol}
                onChange={(e) => handleMasterVolChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
