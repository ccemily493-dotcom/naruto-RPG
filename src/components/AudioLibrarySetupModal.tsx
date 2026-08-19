import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Volume2,
  FolderTree,
  ShieldCheck,
  Music,
  Trees,
  Sliders,
  Layers,
  ArrowRight,
  Download,
} from 'lucide-react';

interface SetupProgressData {
  step:
    | 'init'
    | 'check'
    | 'sfx_download'
    | 'nature_download'
    | 'ffmpeg_ready'
    | 'classifying'
    | 'metadata'
    | 'complete'
    | 'error';
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

interface AudioSetupStatus {
  isInstalled: boolean;
  isRunning: boolean;
  lastError: string | null;
  sources: {
    sfx_cc0: {
      id: string;
      name: string;
      installed: boolean;
      totalRawFiles: number;
      totalOrganizedAssets: number;
      license: string;
      licenseStatus: string;
    };
    nature_ambience: {
      id: string;
      name: string;
      installed: boolean;
      totalRawFiles: number;
      totalOrganizedAssets: number;
      license: string;
      licenseStatus: string;
    };
  };
  totalOrganizedAssets: number;
  ambienceCount: number;
  sfxCount: number;
  narutoMusicCount: number;
  ffmpegReady: boolean;
  manifestFileExists: boolean;
}

interface AudioLibrarySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete?: () => void;
}

export const AudioLibrarySetupModal: React.FC<AudioLibrarySetupModalProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
}) => {
  const [status, setStatus] = useState<AudioSetupStatus | null>(null);
  const [progress, setProgress] = useState<SetupProgressData>({
    step: 'init',
    percent: 0,
    message: 'Comprobando estado de las bibliotecas oficiales de audio...',
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  // Load Status on mount
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/audio/setup/status');
      if (res.ok) {
        const data: AudioSetupStatus = await res.json();
        setStatus(data);
        if (data.isInstalled) {
          setIsDone(true);
          setProgress({
            step: 'complete',
            percent: 100,
            message: 'Bibliotecas instaladas y organizadas correctamente.',
          });
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  // Connect SSE progress stream when installing
  useEffect(() => {
    if (!isOpen || !isInstalling) return;

    const eventSource = new EventSource('/api/audio/setup/stream');

    eventSource.onmessage = (e) => {
      try {
        const data: SetupProgressData = JSON.parse(e.data);
        setProgress(data);

        if (data.step === 'complete') {
          setIsInstalling(false);
          setIsDone(true);
          fetchStatus();
          if (onSetupComplete) onSetupComplete();
          eventSource.close();
        } else if (data.step === 'error') {
          setIsInstalling(false);
          setErrorMsg(data.message || data.details?.error || 'Error durante la instalación.');
          eventSource.close();
        }
      } catch {
        // ignore parse error
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsInstalling(false);
      setErrorMsg('Error de conexión con la transmisión SSE. Reintentando comprobación...');
      fetchStatus();
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, isInstalling]);

  const startSetup = async (forceReinstall = false) => {
    setIsInstalling(true);
    setErrorMsg(null);
    setIsDone(false);
    setProgress({
      step: 'init',
      percent: 5,
      message: 'Iniciando conexión con repositorios oficiales...',
    });

    try {
      const res = await fetch('/api/audio/setup/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceReinstall, convertWithFfmpeg: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar la instalación');
      }

      // If finished synchronously
      if (data.success) {
        setIsDone(true);
        setIsInstalling(false);
        fetchStatus();
        if (onSetupComplete) onSetupComplete();
      }
    } catch (err: any) {
      setIsInstalling(false);
      setErrorMsg(err.message || 'No se pudo conectar con el servidor.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-full">
                Instalación Automática
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700">
                v1.0.0
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>AUDIO LIBRARY SETUP</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Configuración y organización automática de efectos de sonido (SFX) y paisajes
              naturales sin descargas manuales.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Progress Box (ASCII style matching requirements) */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-5 font-mono text-xs text-neutral-300 space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800/80 pb-2">
              <span className="font-semibold text-neutral-200">COMPONENTE</span>
              <span className="font-semibold text-neutral-200">ESTADO</span>
            </div>

            {/* SFX Library */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>SFX Library (CC0 Sounds)</span>
              </div>
              <span
                className={`text-[11px] font-bold ${
                  status?.sources?.sfx_cc0?.installed || isDone
                    ? 'text-emerald-400'
                    : isInstalling
                      ? 'text-amber-400 animate-pulse'
                      : 'text-neutral-500'
                }`}
              >
                {status?.sources?.sfx_cc0?.installed || isDone
                  ? '✓ Instalada (CC0)'
                  : isInstalling && progress.step.includes('sfx')
                    ? 'Descargando...'
                    : isInstalling
                      ? 'Listo'
                      : 'Pendiente'}
              </span>
            </div>

            {/* Nature Library */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trees className="w-4 h-4 text-emerald-400" />
                <span>Nature Library (Ambientes)</span>
              </div>
              <span
                className={`text-[11px] font-bold ${
                  status?.sources?.nature_ambience?.installed || isDone
                    ? 'text-emerald-400'
                    : isInstalling
                      ? 'text-amber-400 animate-pulse'
                      : 'text-neutral-500'
                }`}
              >
                {status?.sources?.nature_ambience?.installed || isDone
                  ? '✓ Instalada (CC-BY/GPL)'
                  : isInstalling && progress.step.includes('nature')
                    ? 'Descargando...'
                    : isInstalling
                      ? 'Listo'
                      : 'Pendiente'}
              </span>
            </div>

            {/* FFmpeg Engine */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>FFmpeg Audio Engine</span>
              </div>
              <span
                className={`text-[11px] font-bold ${status?.ffmpegReady ? 'text-emerald-400' : 'text-neutral-500'}`}
              >
                {status?.ffmpegReady ? '✓ Listo (Loudnorm & Codecs)' : 'No Disponible'}
              </span>
            </div>

            {/* Metadata & Loop Processing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-400" />
                <span>Metadata & Detección de Loops</span>
              </div>
              <span
                className={`text-[11px] font-bold ${
                  isDone || (status?.manifestFileExists && !isInstalling)
                    ? 'text-emerald-400'
                    : isInstalling &&
                        (progress.step === 'classifying' || progress.step === 'metadata')
                      ? 'Procesando...'
                      : isInstalling
                        ? 'Esperando...'
                        : 'Pendiente'
                }`}
              >
                {isDone || (status?.manifestFileExists && !isInstalling)
                  ? '✓ Generada'
                  : isInstalling &&
                      (progress.step === 'classifying' || progress.step === 'metadata')
                    ? 'Procesando...'
                    : isInstalling
                      ? 'Listo'
                      : 'Pendiente'}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span className="truncate max-w-[80%]">{progress.message}</span>
                <span className="font-bold text-white">{progress.percent}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/60">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Completion Summary Card */}
          {isDone && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Configuración de Audio Completada con Éxito</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>SFX instalados ({status?.sfxCount || 0} sonidos)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>Ambientes naturales ({status?.ambienceCount || 0} pistas)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>Metadatos y licencias verificadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>Audio Engine listo para el Game Master</span>
                </div>
              </div>
            </div>
          )}

          {/* Fallback / Error State */}
          {errorMsg && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl space-y-3 text-xs text-red-200">
              <div className="flex items-center gap-2 font-semibold text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Aviso de Conexión de Audio</span>
              </div>
              <p className="text-neutral-300 leading-relaxed">{errorMsg}</p>
              <p className="text-[11px] text-neutral-400">
                * La aplicación continuará funcionando con el{' '}
                <strong>generador procedimental local</strong> de Web Audio API sin bloquear tu
                partida. Puedes reintentar la instalación cuando tengas conexión.
              </p>
            </div>
          )}

          {/* Repository Sources & License Overview */}
          <div className="p-4 bg-neutral-950/50 border border-neutral-800 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Fuentes Oficiales & Licencias Centralizadas</span>
            </h4>
            <div className="space-y-1.5 text-[11px] text-neutral-400 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">• SFX CC0:</span>
                <span className="text-neutral-400 truncate max-w-[280px]">
                  github.com/lavenderdotpet/CC0-Public-Domain-Sounds
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">• Ambientes:</span>
                <span className="text-neutral-400 truncate max-w-[280px]">
                  github.com/Muges/ambientsounds
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300">• OST Naruto:</span>
                <span className="text-amber-300">
                  audio/music/naruto/ (Gestión Local Independiente)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={() => startSetup(true)}
            disabled={isInstalling}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isInstalling ? 'animate-spin' : ''}`} />
            <span>{isDone ? 'Reinstalar / Actualizar' : 'Reintentar'}</span>
          </button>

          <div className="flex items-center gap-2">
            {!isDone && !isInstalling && (
              <button
                id="start-audio-setup-btn"
                onClick={() => startSetup(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Bibliotecas Automáticamente</span>
              </button>
            )}

            {isDone && (
              <button
                id="continue-audio-setup-btn"
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {!isDone && isInstalling && (
              <button
                disabled
                className="px-4 py-2 bg-neutral-800 text-neutral-400 text-xs font-medium rounded-lg flex items-center gap-2 cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Instalando...</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
