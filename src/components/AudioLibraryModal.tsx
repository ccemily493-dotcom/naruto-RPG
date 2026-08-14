import React, { useState, useEffect } from 'react';
import {
  X,
  Music,
  Download,
  Upload,
  Play,
  Pause,
  Trash2,
  Edit2,
  Check,
  Search,
  Sliders,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  FileAudio,
  Layers,
  ShieldCheck,
  Radio,
  ExternalLink,
  Cookie,
  Key,
  Info,
  FileText,
  Trees,
  FolderTree,
  Volume2,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import {
  AudioTrack,
  AudioCategory,
  AudioIntensity,
  AudioInspectionResult,
  AudioImportRequest,
  AudioEngineMatchResult,
} from '../types';
import { globalAudioEngine } from '../utils/audioEngine';
import { AudioLibrarySetupModal } from './AudioLibrarySetupModal';

interface AudioLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: AudioCategory; label: string }[] = [
  { id: 'combat', label: 'Combate' },
  { id: 'climax', label: 'Clímax' },
  { id: 'tension', label: 'Tensión' },
  { id: 'emotional', label: 'Emocional' },
  { id: 'sorrow', label: 'Pesar / Luto' },
  { id: 'mystery', label: 'Misterio' },
  { id: 'ambient', label: 'Ambiente' },
  { id: 'village', label: 'Aldea' },
  { id: 'jutsu', label: 'Jutsu' },
  { id: 'stealth', label: 'Sigilo' },
];

const INTENSITIES: { id: AudioIntensity; label: string }[] = [
  { id: 'low', label: 'Baja' },
  { id: 'medium', label: 'Media' },
  { id: 'high', label: 'Alta' },
  { id: 'epic', label: 'Épica' },
];

const COMMON_CHARACTERS = [
  'Rin',
  'Itachi',
  'Kālī',
  'Orochimaru',
  'Sasuke',
  'Naruto',
  'Kakashi',
  'Sakura',
  'Madara',
  'Jiraiya',
];

export const AudioLibraryModal: React.FC<AudioLibraryModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'import' | 'matcher' | 'setup'>('library');
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [engineState, setEngineState] = useState(globalAudioEngine.getState());

  // Setup & Organized Libraries State
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [setupFilterType, setSetupFilterType] = useState<'all' | 'ambience' | 'sfx' | 'music'>(
    'all',
  );
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewAudioPlaying, setPreviewAudioPlaying] = useState<boolean>(false);
  const audioPreviewRef = React.useRef<HTMLAudioElement | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Import State
  const [importMode, setImportMode] = useState<'url' | 'batch' | 'file'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [batchUrlsInput, setBatchUrlsInput] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<AudioInspectionResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{
    total: number;
    successful: number;
    failed: number;
  } | null>(null);

  // Form Fields for Import
  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formCategory, setFormCategory] = useState<AudioCategory>('ambient');
  const [formIntensity, setFormIntensity] = useState<AudioIntensity>('medium');
  const [formEmotionalState, setFormEmotionalState] = useState('calm');
  const [formCharacters, setFormCharacters] = useState<string[]>([]);
  const [formSituations, setFormSituations] = useState('');
  const [formPriority, setFormPriority] = useState<number>(5);
  const [formLicenseOrigin, setFormLicenseOrigin] = useState('Recurso Local del Usuario (yt-dlp)');
  const [formSubdir, setFormSubdir] = useState('default');
  const [formNormalize, setFormNormalize] = useState(true);
  const [formFormat, setFormFormat] = useState<'mp3' | 'opus' | 'wav' | 'm4a'>('mp3');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Matcher Simulation State
  const [simulationPrompt, setSimulationPrompt] = useState(
    'Itachi Uchiha yace en el suelo, completamente incapacitado por el Susanoo de Kālī. Rin se encuentra sola en el claro con el Ataúd Divino.',
  );
  const [simulationResult, setSimulationResult] = useState<AudioEngineMatchResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Edit Track State
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null);

  // YouTube Cookies State
  const [cookiesInfo, setCookiesInfo] = useState<{
    hasCookies: boolean;
    length: number;
    preview: string;
  } | null>(null);
  const [showCookiesModal, setShowCookiesModal] = useState(false);
  const [cookiesInput, setCookiesInput] = useState('');
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [cookiesStatusMsg, setCookiesStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLibrary();
      loadSystemStatus();
      loadCookiesInfo();
      loadSetupStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      setPreviewAudioPlaying(false);
      setPreviewAudioUrl(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = globalAudioEngine.subscribe((state) => {
      setEngineState({ ...state });
    });
    return unsub;
  }, []);

  const loadSetupStatus = async () => {
    try {
      const res = await fetch('/api/audio/setup/status');
      if (res.ok) {
        const data = await res.json();
        setSetupStatus(data);
      }
    } catch (err) {
      console.warn('Error fetching audio setup status:', err);
    }
  };

  const handleRescanLibraries = async () => {
    setIsRescanning(true);
    try {
      const res = await fetch('/api/audio/setup/rescan', { method: 'POST' });
      if (res.ok) {
        await loadSetupStatus();
        await loadLibrary();
      }
    } catch (err) {
      console.error('Error rescanning libraries:', err);
    } finally {
      setIsRescanning(false);
    }
  };

  const handlePlayPreview = (fileUrl: string) => {
    if (previewAudioUrl === fileUrl && previewAudioPlaying) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPreviewAudioPlaying(false);
      return;
    }

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio();
    }

    audioPreviewRef.current.src = fileUrl;
    audioPreviewRef.current.volume = 0.6;
    audioPreviewRef.current
      .play()
      .then(() => {
        setPreviewAudioUrl(fileUrl);
        setPreviewAudioPlaying(true);
      })
      .catch((err) => {
        console.warn('Preview play error:', err);
      });

    audioPreviewRef.current.onended = () => {
      setPreviewAudioPlaying(false);
      setPreviewAudioUrl(null);
    };
  };

  const loadLibrary = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/audio/library');
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      }
    } catch (err) {
      console.error('Error loading library:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const res = await fetch('/api/audio/status');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.warn('Error checking audio status:', err);
    }
  };

  const loadCookiesInfo = async () => {
    try {
      const res = await fetch('/api/audio/cookies');
      if (res.ok) {
        const data = await res.json();
        setCookiesInfo(data);
      }
    } catch (err) {
      console.warn('Error checking cookies status:', err);
    }
  };

  const handleSaveCookies = async () => {
    if (!cookiesInput.trim()) return;
    setIsSavingCookies(true);
    setCookiesStatusMsg(null);
    try {
      const res = await fetch('/api/audio/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookiesContent: cookiesInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCookiesInfo(data.info);
        setCookiesStatusMsg('Cookies guardadas con éxito. Ahora yt-dlp las usará automáticamente.');
        setCookiesInput('');
      } else {
        setCookiesStatusMsg(data.error || 'Error al guardar cookies.');
      }
    } catch (err: any) {
      setCookiesStatusMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSavingCookies(false);
    }
  };

  const handleDeleteCookies = async () => {
    try {
      const res = await fetch('/api/audio/cookies', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setCookiesInfo(data.info);
        setCookiesStatusMsg('Cookies eliminadas correctamente.');
      }
    } catch (err) {
      console.error('Error deleting cookies:', err);
    }
  };

  // Inspect URL
  const handleInspectUrl = async () => {
    if (!urlInput.trim()) return;
    setIsInspecting(true);
    setImportError(null);
    setInspectionResult(null);

    try {
      const res = await fetch('/api/audio/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo inspeccionar la URL.');
      }

      setInspectionResult(data);
      setFormTitle(data.title || '');
      setFormArtist(data.artist || '');
      setFormCategory(data.suggestedCategory || 'ambient');
      setFormIntensity(data.suggestedIntensity || 'medium');
      setFormEmotionalState(data.suggestedEmotionalState || 'calm');
      setFormCharacters(data.suggestedCharacters || []);
      setFormSituations('');
      setFormPriority(7);
    } catch (err: any) {
      setImportError(err.message || 'Error al conectar con yt-dlp');
    } finally {
      setIsInspecting(false);
    }
  };

  // Submit Import
  const handleExecuteImport = async () => {
    if (!urlInput.trim()) return;
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    const importPayload: AudioImportRequest = {
      url: urlInput.trim(),
      title: formTitle || 'Pista sin título',
      artist: formArtist || 'Desconocido',
      category: formCategory,
      intensity: formIntensity,
      emotionalState: formEmotionalState,
      associatedCharacters: formCharacters,
      situations: formSituations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      priority: formPriority,
      licenseOrigin: formLicenseOrigin,
      storageSubdir: formSubdir,
      normalizeAudio: formNormalize,
      outputFormat: formFormat,
    };

    try {
      const res = await fetch('/api/audio/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPayload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la importación');
      }

      setImportSuccess(`¡Pista "${data.track.title}" importada y registrada con éxito!`);
      setUrlInput('');
      setInspectionResult(null);
      loadLibrary();
      // Optional: switch back to library after short delay
      setTimeout(() => {
        setActiveTab('library');
        setImportSuccess(null);
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || 'Error al importar');
    } finally {
      setIsImporting(false);
    }
  };

  // Execute Batch URL Processing with yt-dlp & FFmpeg Normalization
  const handleBatchProcessUrls = async () => {
    const urls = batchUrlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && !u.startsWith('#'));

    if (urls.length === 0) {
      setImportError('Ingresa al menos una URL válida (una por línea).');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    setBatchStatus(null);

    try {
      const res = await fetch('/api/audio/process-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          normalizeAudio: formNormalize,
          outputFormat: formFormat,
          targetSubdir: formSubdir,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error durante el procesamiento por lotes');
      }

      setBatchStatus({ total: data.total, successful: data.successful, failed: data.failed });
      setImportSuccess(
        `¡Procesamiento completado! ${data.successful} pistas procesadas y normalizadas con FFmpeg con éxito.`,
      );
      loadLibrary();
    } catch (err: any) {
      setImportError(err.message || 'Error en el procesamiento por lotes');
    } finally {
      setIsImporting(false);
    }
  };

  // Execute Full Canonical Naruto OST Collection Sync
  const handleSyncCanonicalOst = async () => {
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    setBatchStatus(null);

    try {
      const res = await fetch('/api/audio/sync-canonical-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ normalizeAudio: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al sincronizar colección canónica');
      }

      setBatchStatus({ total: data.total, successful: data.successful, failed: data.failed });
      setImportSuccess(
        `¡Colección Canónica OST procesada con éxito! ${data.successful} pistas descargadas, normalizadas y registradas.`,
      );
      loadLibrary();
    } catch (err: any) {
      setImportError(err.message || 'Error al sincronizar colección canónica');
    } finally {
      setIsImporting(false);
    }
  };

  // Execute Local File Upload
  const handleUploadFile = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    const formData = new FormData();
    formData.append('audioFile', selectedFile);
    formData.append(
      'metadata',
      JSON.stringify({
        title: formTitle || selectedFile.name,
        artist: formArtist || 'Archivo Local',
        category: formCategory,
        intensity: formIntensity,
        emotionalState: formEmotionalState,
        associatedCharacters: formCharacters,
        situations: formSituations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        priority: formPriority,
        licenseOrigin: 'Recurso Local del Usuario',
        storageSubdir: formSubdir,
      }),
    );

    try {
      const res = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al subir archivo');
      }

      setImportSuccess(`¡Archivo "${data.track.title}" subido y registrado con éxito!`);
      setSelectedFile(null);
      loadLibrary();
      setTimeout(() => {
        setActiveTab('library');
        setImportSuccess(null);
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || 'Error en la subida');
    } finally {
      setIsImporting(false);
    }
  };

  // Delete Track
  const handleDeleteTrack = async (id: string, title: string) => {
    if (
      !window.confirm(`¿Eliminar la pista "${title}" de la biblioteca y del almacenamiento local?`)
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/audio/track/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTracks((prev) => prev.filter((t) => t.id !== id));
        if (engineState.currentTrack?.id === id) {
          globalAudioEngine.stopAll();
        }
      }
    } catch (err) {
      console.error('Error deleting track:', err);
    }
  };

  // Run Scene Simulation
  const handleRunSimulation = async () => {
    if (!simulationPrompt.trim()) return;
    setIsSimulating(true);
    try {
      const res = await fetch('/api/audio/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneText: simulationPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Save Track Edits
  const handleSaveTrackEdit = async () => {
    if (!editingTrack) return;
    try {
      const res = await fetch(`/api/audio/track/${editingTrack.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTrack),
      });
      if (res.ok) {
        const data = await res.json();
        setTracks((prev) => prev.map((t) => (t.id === editingTrack.id ? data.track : t)));
        setEditingTrack(null);
      }
    } catch (err) {
      console.error('Error saving edits:', err);
    }
  };

  const toggleCharacterSelection = (char: string) => {
    setFormCharacters((prev) =>
      prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char],
    );
  };

  // Filtered tracks
  const filteredTracks = tracks.filter((t) => {
    const matchesCategory =
      selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.associatedCharacters.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.situations.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#1e1e1d] text-[#e3e2de] border border-[#37352f]/40 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#37352f]/40 flex items-center justify-between bg-[#191918]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Biblioteca de Audio & Importador yt-dlp</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/40 font-mono">
                  Audio Engine v2.4
                </span>
              </h2>
              <p className="text-xs text-[#9b9a97]">
                Gestión de recursos musicales locales, conversión FFmpeg y motor de sincronización
                de escenas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {systemStatus && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#9b9a97] bg-neutral-900 px-3 py-1 rounded-md border border-neutral-800 font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${
                    systemStatus.ytDlpAvailable ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <span>
                  yt-dlp {systemStatus.ytDlpVersion ? `v${systemStatus.ytDlpVersion}` : 'Inactivo'}
                </span>
                <span>•</span>
                <span>FFmpeg: {systemStatus.ffmpegAvailable ? 'Activo' : 'No'}</span>
              </div>
            )}

            <button
              id="close-audio-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#37352f]/40 bg-[#171716] px-6">
          <button
            id="tab-audio-library-btn"
            onClick={() => setActiveTab('library')}
            className={`px-4 py-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'library'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Biblioteca de Pistas ({tracks.length})</span>
          </button>

          <button
            id="tab-audio-import-btn"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Importador yt-dlp & Subida</span>
          </button>

          <button
            id="tab-audio-matcher-btn"
            onClick={() => setActiveTab('matcher')}
            className={`px-4 py-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'matcher'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulador de Escena (GPT Audio Engine)</span>
          </button>

          <button
            id="tab-audio-setup-btn"
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'setup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Trees className="w-4 h-4" />
            <span>Audio Library Setup & Gestor</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BIBLIOTECA */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* Search & Category filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="audio-library-search-input"
                    type="text"
                    placeholder="Buscar por título, artista o personaje..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    Todas
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        selectedCategoryFilter === cat.id
                          ? 'bg-emerald-700 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracks List */}
              {isLoading ? (
                <div className="py-12 flex items-center justify-center text-neutral-500 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando catálogo de pistas...
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-neutral-800 rounded-xl space-y-2">
                  <Music className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="text-sm font-medium text-neutral-400">
                    No se encontraron pistas registradas.
                  </p>
                  <p className="text-xs text-neutral-500">
                    Utiliza la pestaña "Importador yt-dlp" para añadir temas musicales a tu
                    biblioteca local.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTracks.map((track) => {
                    const isCurrent = engineState.currentTrack?.id === track.id;
                    const isPlayingCurrent = isCurrent && engineState.isPlaying;

                    return (
                      <div
                        key={track.id}
                        className={`p-3 rounded-lg border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-emerald-950/30 border-emerald-600/50 shadow-md'
                            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Play button & Main info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            onClick={() => {
                              if (isPlayingCurrent) {
                                globalAudioEngine.stopMusic();
                              } else {
                                globalAudioEngine.playTrack(track, 'crossfade');
                              }
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 ${
                              isPlayingCurrent
                                ? 'bg-emerald-600 text-white animate-pulse'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-emerald-400'
                            }`}
                            title={isPlayingCurrent ? 'Pausar' : 'Reproducir'}
                          >
                            {isPlayingCurrent ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-xs truncate">
                                {track.title}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                                {track.category}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300/80 border border-amber-900/40">
                                {track.intensity}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5 flex-wrap">
                              <span>{track.artist}</span>
                              <span>•</span>
                              <span className="font-mono">{formatDuration(track.duration)}</span>
                              <span>•</span>
                              <span className="text-neutral-500 uppercase">{track.format}</span>
                              <span>•</span>
                              <span className="text-neutral-500">
                                {formatBytes(track.fileSize)}
                              </span>
                              {track.emotionalState && (
                                <>
                                  <span>•</span>
                                  <span className="italic text-neutral-400">
                                    «{track.emotionalState}»
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tag Chips */}
                        <div className="flex items-center gap-2 flex-wrap md:justify-end">
                          {track.associatedCharacters.map((char) => (
                            <span
                              key={char}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                            >
                              {char}
                            </span>
                          ))}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                            P: {track.priority}/10
                          </span>

                          <div className="flex items-center gap-1 ml-2">
                            {track.sourceUrl && (
                              <a
                                href={track.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-red-400/80 hover:text-red-300 hover:bg-neutral-800 rounded transition-colors"
                                title={`Ver origen en YouTube: ${track.sourceUrl}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setEditingTrack(track)}
                              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                              title="Editar metadatos y etiquetas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrack(track.id, track.title)}
                              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                              title="Eliminar pista local"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORTADOR YT-DLP & ARCHIVO LOCAL */}
          {activeTab === 'import' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Import Mode Switcher */}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                <div className="flex gap-2 p-1 bg-neutral-900 rounded-lg border border-neutral-800 w-full sm:w-auto flex-1">
                  <button
                    onClick={() => setImportMode('url')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${
                      importMode === 'url'
                        ? 'bg-emerald-700 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Importar URL Individual</span>
                  </button>
                  <button
                    onClick={() => setImportMode('batch')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${
                      importMode === 'batch'
                        ? 'bg-emerald-700 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lote de URLs / OST Canónico</span>
                  </button>
                  <button
                    onClick={() => setImportMode('file')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${
                      importMode === 'file'
                        ? 'bg-emerald-700 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Archivo Local</span>
                  </button>
                </div>

                {/* YouTube Cookies Status Indicator */}
                <button
                  onClick={() => setShowCookiesModal(true)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
                    cookiesInfo?.hasCookies
                      ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                  title="Configuración de Cookies para YouTube"
                >
                  <Cookie className="w-3.5 h-3.5" />
                  <span>
                    {cookiesInfo?.hasCookies
                      ? 'Cookies YouTube: Activas'
                      : 'Configurar Cookies YouTube'}
                  </span>
                </button>
              </div>

              {/* Feedback messages */}
              {importError && (
                <div className="p-4 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs space-y-3 shadow-lg">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-red-300">Aviso en la Importación</p>
                      <p className="text-red-200/90 leading-relaxed">{importError}</p>
                    </div>
                  </div>

                  {/* Actionable Alternatives */}
                  <div className="pt-2 border-t border-red-900/60 flex flex-wrap gap-2 items-center">
                    <span className="text-[11px] text-neutral-400">Alternativas directas:</span>
                    <button
                      onClick={() => {
                        setImportMode('file');
                        setImportError(null);
                      }}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Subir archivo local (.mp3, .wav)</span>
                    </button>
                    <button
                      onClick={() => setShowCookiesModal(true)}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-medium flex items-center gap-1 border border-neutral-700 transition-colors"
                    >
                      <Cookie className="w-3 h-3 text-amber-400" />
                      <span>Pegar Cookies de YouTube</span>
                    </button>
                  </div>
                </div>
              )}
              {importSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{importSuccess}</p>
                </div>
              )}

              {/* URL Import Mode */}
              {importMode === 'url' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Enlace de audio compatible (YouTube, SoundCloud, Bandcamp, stream directo,
                      etc.)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="yt-dlp-url-input"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        id="inspect-url-btn"
                        onClick={handleInspectUrl}
                        disabled={isInspecting || !urlInput.trim()}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                      >
                        {isInspecting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Inspeccionar</span>
                      </button>
                    </div>
                  </div>

                  {/* Inspection Preview Card */}
                  {inspectionResult && (
                    <div className="p-4 bg-neutral-900/80 border border-emerald-800/50 rounded-xl space-y-3">
                      <div className="flex items-start gap-3">
                        {inspectionResult.thumbnailUrl && (
                          <img
                            src={inspectionResult.thumbnailUrl}
                            alt="Thumbnail"
                            className="w-20 h-14 object-cover rounded-lg border border-neutral-700 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-white text-xs leading-snug">
                            {inspectionResult.title}
                          </h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Autor/Canal:{' '}
                            <span className="text-neutral-300">{inspectionResult.artist}</span> •
                            Duración:{' '}
                            <span className="font-mono text-emerald-400">
                              {formatDuration(inspectionResult.duration)}
                            </span>
                          </p>
                          <p className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> Metadatos detectados automáticamente
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Batch Import & Canonical Sync Mode */}
              {importMode === 'batch' && (
                <div className="space-y-4">
                  {/* Canonical OST One-Click Sync Banner */}
                  <div className="p-4 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-emerald-950/40 border border-amber-800/50 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Colección Canónica de Naruto OST (12 Pistas Maestras)</span>
                        </h4>
                        <p className="text-[11px] text-neutral-300 leading-relaxed">
                          Sincroniza y normaliza automáticamente con{' '}
                          <strong>FFmpeg (loudnorm EBU R128)</strong> y <strong>yt-dlp</strong>{' '}
                          todas las pistas canónicas del módulo de audio:
                          <span className="text-neutral-400 block mt-1 font-mono text-[10px]">
                            • glued_state • nervous • confrontment • bad_situation •
                            survival_examination • avenger • avenger_2 • orochimaru_theme •
                            sasuke_theme • sasuke_destiny • nine_tail_demon_fox • evil
                          </span>
                        </p>
                      </div>
                      <button
                        id="sync-canonical-ost-btn"
                        onClick={handleSyncCanonicalOst}
                        disabled={isImporting}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow-md"
                      >
                        {isImporting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Sincronizar Colección</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-URL Textarea */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                      <span>Procesar Lote de URLs personalizadas (una URL por línea)</span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        yt-dlp + FFmpeg loudnorm
                      </span>
                    </label>
                    <textarea
                      id="batch-urls-textarea"
                      rows={4}
                      value={batchUrlsInput}
                      onChange={(e) => setBatchUrlsInput(e.target.value)}
                      placeholder={`https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://soundcloud.com/...`}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <div className="flex justify-end">
                      <button
                        id="process-batch-urls-btn"
                        onClick={handleBatchProcessUrls}
                        disabled={isImporting || !batchUrlsInput.trim()}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow"
                      >
                        {isImporting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Layers className="w-3.5 h-3.5" />
                        )}
                        <span>Procesar Lote y Normalizar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Local File Upload Mode */}
              {importMode === 'file' && (
                <div className="space-y-4">
                  <div className="p-6 border-2 border-dashed border-neutral-700 hover:border-emerald-500/70 rounded-xl bg-neutral-900/40 text-center space-y-2 transition-colors">
                    <FileAudio className="w-8 h-8 mx-auto text-emerald-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Arrastra un archivo de audio o pulsa para examinar
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Soporta .mp3, .wav, .opus, .ogg, .m4a (Hasta 50MB)
                      </p>
                    </div>
                    <input
                      id="local-audio-file-input"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          setSelectedFile(file);
                          setFormTitle(file.name.replace(/\.[^/.]+$/, ''));
                          setFormArtist('Archivo Local');
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="local-audio-file-input"
                      className="inline-block px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded-lg border border-neutral-700 cursor-pointer transition-colors"
                    >
                      {selectedFile ? `Archivo: ${selectedFile.name}` : 'Seleccionar archivo local'}
                    </label>
                  </div>
                </div>
              )}

              {/* Common Metadata Form */}
              <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2 border-b border-neutral-800 pb-2">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Asignación de Metadatos para el Motor de Música</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-neutral-400">Título de la pista</label>
                    <input
                      id="form-track-title"
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ej. Despertar del Susanoo"
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400">Artista / Origen</label>
                    <input
                      id="form-track-artist"
                      type="text"
                      value={formArtist}
                      onChange={(e) => setFormArtist(e.target.value)}
                      placeholder="Ej. Naruto Shippuden OST / Local"
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400">Categoría Narrativa</label>
                    <select
                      id="form-track-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as AudioCategory)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400">Intensidad</label>
                    <select
                      id="form-track-intensity"
                      value={formIntensity}
                      onChange={(e) => setFormIntensity(e.target.value as AudioIntensity)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {INTENSITIES.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400">Estado Emocional (Atmósfera)</label>
                    <input
                      id="form-track-emotion"
                      type="text"
                      value={formEmotionalState}
                      onChange={(e) => setFormEmotionalState(e.target.value)}
                      placeholder="Ej. melancolía, furia, serenidad, peligro inminente"
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400">Prioridad Acústica (1-10)</label>
                    <input
                      id="form-track-priority"
                      type="number"
                      min="1"
                      max="10"
                      value={formPriority}
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Associated Characters Chips */}
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400">
                    Personajes Asociados (para auto-activación)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CHARACTERS.map((char) => {
                      const isSelected = formCharacters.includes(char);
                      return (
                        <button
                          key={char}
                          type="button"
                          onClick={() => toggleCharacterSelection(char)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                            isSelected
                              ? 'bg-emerald-800 text-white border border-emerald-600'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                          }`}
                        >
                          {char}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Situations */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400">
                    Situaciones / Palabras clave (separadas por comas)
                  </label>
                  <input
                    id="form-track-situations"
                    type="text"
                    value={formSituations}
                    onChange={(e) => setFormSituations(e.target.value)}
                    placeholder="Ej. Susanoo de Kālī, Ataúd de la Muerte, Incapacitación de Itachi, Infiltración"
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Processing & Conversion Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800 text-xs">
                  <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                    <input
                      id="form-track-normalize"
                      type="checkbox"
                      checked={formNormalize}
                      onChange={(e) => setFormNormalize(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Normalizar volumen con FFmpeg (Loudnorm -16 LUFS)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">Formato destino:</span>
                    <select
                      id="form-track-format"
                      value={formFormat}
                      onChange={(e) => setFormFormat(e.target.value as any)}
                      className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-white"
                    >
                      <option value="mp3">MP3 (192 kbps)</option>
                      <option value="opus">Opus (Alta eficiencia)</option>
                      <option value="wav">WAV (Sin compresión)</option>
                      <option value="m4a">M4A (AAC)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Execute Action Button */}
              <div>
                {importMode === 'url' ? (
                  <button
                    id="execute-import-btn"
                    onClick={handleExecuteImport}
                    disabled={isImporting || !urlInput.trim()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Descargando, convirtiendo y normalizando con FFmpeg...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Descargar y Registrar en la Biblioteca de Audio</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    id="execute-upload-btn"
                    onClick={handleUploadFile}
                    disabled={isImporting || !selectedFile}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Procesando y guardando archivo local...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Subir y Registrar Archivo Local</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SIMULADOR DEL MOTOR DE AUDIO (MATCHER) */}
          {activeTab === 'matcher' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-white">
                    Simulador del Motor de Mezcla y Concordancia Musical
                  </h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  El Audio Engine funciona de forma completamente independiente al motor narrativo:
                  GPT narra los hechos y el Audio Engine evalúa el texto, identificando
                  automáticamente la categoría, intensidad y personajes clave para activar la pista
                  local más idónea con transición suave.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300">
                    Introduce un fragmento narrativo para probar la concordancia acústica:
                  </label>
                  <textarea
                    id="simulation-prompt-input"
                    rows={4}
                    value={simulationPrompt}
                    onChange={(e) => setSimulationPrompt(e.target.value)}
                    className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-serif leading-relaxed"
                  />
                  <button
                    id="run-matcher-simulation-btn"
                    onClick={handleRunSimulation}
                    disabled={isSimulating || !simulationPrompt.trim()}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {isSimulating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Evaluar Selección Musical</span>
                  </button>
                </div>
              </div>

              {simulationResult && (
                <div className="p-5 bg-neutral-900/90 border border-emerald-800/60 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Resultado del Análisis Acústico
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      Puntuación de Concordancia: {simulationResult.score} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase block">
                        Categoría Detectada
                      </span>
                      <span className="font-semibold text-white capitalize">
                        {simulationResult.detectedCategory || 'General'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase block">
                        Atmósfera / Mood
                      </span>
                      <span className="font-semibold text-white capitalize">
                        {simulationResult.detectedMood || 'Equilibrado'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase block">
                        Personajes Detectados
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {simulationResult.detectedCharacters?.join(', ') || 'Ninguno'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-emerald-300">Pista Seleccionada:</span>
                    {simulationResult.matchedTrack ? (
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <p className="font-medium text-white">
                            {simulationResult.matchedTrack.title}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {simulationResult.matchedTrack.artist}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (simulationResult.matchedTrack) {
                              globalAudioEngine.playTrack(
                                simulationResult.matchedTrack,
                                'crossfade',
                              );
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Reproducir</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-neutral-400 italic">
                        No hay pistas coincidentes en la biblioteca.
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-neutral-400 italic">
                    <strong>Fundamento del Motor:</strong> {simulationResult.reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIO LIBRARY SETUP & GESTOR */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* Header Banner & Status Summary */}
              <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 border border-emerald-800/40 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-900/80 text-emerald-300 rounded border border-emerald-700/60 uppercase font-mono">
                      Sistema Automático
                    </span>
                    <span className="text-xs text-neutral-400">Sin descargas manuales</span>
                  </div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trees className="w-5 h-5 text-emerald-400" />
                    <span>AUDIO LIBRARY SETUP & GESTOR CENTRALIZADO</span>
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-2xl">
                    Descarga, verifica licencias y clasifica semánticamente las bibliotecas
                    oficiales de SFX y Ambientes de la naturaleza. Estructura y organiza los
                    recursos para el Audio Engine.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="open-audio-setup-wizard-btn"
                    onClick={() => setIsSetupWizardOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-950"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Ejecutar Audio Setup</span>
                  </button>

                  <button
                    id="rescan-audio-setup-btn"
                    onClick={handleRescanLibraries}
                    disabled={isRescanning}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin' : ''}`} />
                    <span>{isRescanning ? 'Reescaneando...' : 'Reescanear Metadata'}</span>
                  </button>
                </div>
              </div>

              {/* Status Overview Cards (3 Pillars) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* SFX CC0 Library */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span>Efectos de Sonido (SFX)</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        setupStatus?.sources?.sfx_cc0?.installed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {setupStatus?.sources?.sfx_cc0?.installed ? 'Instalada' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Archivos organizados:</span>
                      <span className="font-mono text-white font-bold">
                        {setupStatus?.sfxCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Licencia:</span>
                      <span
                        className="font-medium text-emerald-400 truncate max-w-[150px]"
                        title="CC0 1.0 Universal"
                      >
                        CC0 1.0 (Dominio Público)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Uso comercial:</span>
                      <span className="text-emerald-400 font-medium">Permitido</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Atribución:</span>
                      <span className="text-neutral-400">No requerida</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-500 font-mono truncate">
                    <span>Origen: lavenderdotpet/CC0-Public-Domain-Sounds</span>
                  </div>
                </div>

                {/* Nature Ambience Library */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs">
                      <Trees className="w-4 h-4 text-emerald-400" />
                      <span>Ambientes & Naturaleza</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        setupStatus?.sources?.nature_ambience?.installed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {setupStatus?.sources?.nature_ambience?.installed ? 'Instalada' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Archivos organizados:</span>
                      <span className="font-mono text-white font-bold">
                        {setupStatus?.ambienceCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Licencia:</span>
                      <span
                        className="font-medium text-emerald-400 truncate max-w-[150px]"
                        title="CC-BY 3.0 / GPL-3.0"
                      >
                        CC-BY 3.0 / GPL-3.0
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Uso comercial:</span>
                      <span className="text-emerald-400 font-medium">Permitido</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Atribución:</span>
                      <span className="text-amber-400 font-medium">Requerida (Muges)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-500 font-mono truncate">
                    <span>Origen: Muges/ambientsounds</span>
                  </div>
                </div>

                {/* Local Naruto OST */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs">
                      <Music className="w-4 h-4 text-amber-400" />
                      <span>OST Naruto (Música Canónica)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-amber-950 text-amber-300 border border-amber-800">
                      Local Usuario
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Pistas disponibles:</span>
                      <span className="font-mono text-white font-bold">{tracks.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Ubicación local:</span>
                      <span className="font-mono text-neutral-300">audio/music/naruto/</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Temas canónicos:</span>
                      <span className="text-amber-300 font-medium">12 Temas Clave</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Control:</span>
                      <span className="text-neutral-300">Independiente</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-500 font-mono truncate">
                    <span>audio/music/naruto/*.mp3</span>
                  </div>
                </div>
              </div>

              {/* Directory Structure Architecture Box */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Estructura de Directorios Organizada (audio/)
                    </h4>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Manifest: audio/metadata/manifest.json
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Ambience subfolders */}
                  <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-lg p-3 space-y-2">
                    <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Trees className="w-3.5 h-3.5" />
                      <span>audio/ambience/</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-neutral-400 pl-4 border-l border-neutral-800">
                      <div>├── forest/</div>
                      <div>├── forest_night/</div>
                      <div>├── rain/</div>
                      <div>├── storm/</div>
                      <div>├── wind/</div>
                      <div>├── water/</div>
                      <div>├── river/</div>
                      <div>├── cave/</div>
                      <div>├── fire/</div>
                      <div>└── other/</div>
                    </div>
                  </div>

                  {/* SFX subfolders */}
                  <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-lg p-3 space-y-2">
                    <div className="text-indigo-400 font-semibold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>audio/sfx/</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-neutral-400 pl-4 border-l border-neutral-800">
                      <div>├── impacts/</div>
                      <div>├── wood/</div>
                      <div>├── metal/</div>
                      <div>├── water/</div>
                      <div>├── movement/</div>
                      <div>├── explosions/</div>
                      <div>├── environment/</div>
                      <div>├── magic/</div>
                      <div>└── other/</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Central Audio Query & Engine Synchronization Section */}
              <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Integración de Consultas Semánticas & Reproducción Dual</span>
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  El Audio Engine consulta semánticamente por <code>type</code>,{' '}
                  <code>category</code> y <code>tags</code> con selección aleatoria ponderada
                  (weighted random). En caso de no existir pista de audio local, el sistema activa
                  automáticamente la <strong>síntesis Web Audio procedural de baja latencia</strong>{' '}
                  como fallback transparente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Legal Notice */}
        <div className="px-6 py-3 border-t border-[#37352f]/40 bg-[#171716] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>
              <strong>Aviso Legal & Recursos Locales:</strong> Los audios importados son recursos
              locales privados del usuario. Compruebe licencias y derechos correspondientes antes de
              redistribuir la aplicación o la biblioteca.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            Cerrar Panel
          </button>
        </div>
      </div>

      {/* Audio Library Setup Wizard Modal */}
      <AudioLibrarySetupModal
        isOpen={isSetupWizardOpen}
        onClose={() => {
          setIsSetupWizardOpen(false);
          loadSetupStatus();
          loadLibrary();
        }}
        onSetupComplete={() => {
          loadSetupStatus();
          loadLibrary();
        }}
      />

      {/* Edit Track Modal Drawer */}
      {editingTrack && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#1e1e1d] border border-neutral-700 rounded-xl p-5 max-w-lg w-full space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">Editar Metadatos de la Pista</h3>

            <div className="space-y-3">
              <div>
                <label className="text-neutral-400 block mb-1">Título</label>
                <input
                  type="text"
                  value={editingTrack.title}
                  onChange={(e) => setEditingTrack({ ...editingTrack, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Enlace de Origen (YouTube / URL)
                </label>
                <input
                  type="text"
                  value={editingTrack.sourceUrl || ''}
                  onChange={(e) => setEditingTrack({ ...editingTrack, sourceUrl: e.target.value })}
                  placeholder="https://youtu.be/..."
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Categoría</label>
                <select
                  value={editingTrack.category}
                  onChange={(e) =>
                    setEditingTrack({ ...editingTrack, category: e.target.value as AudioCategory })
                  }
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Prioridad (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingTrack.priority}
                  onChange={(e) =>
                    setEditingTrack({ ...editingTrack, priority: parseInt(e.target.value) || 5 })
                  }
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Modificador de Volumen (0.1 a 1.5)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={editingTrack.volumeModifier || 1.0}
                  onChange={(e) =>
                    setEditingTrack({
                      ...editingTrack,
                      volumeModifier: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <span className="text-neutral-400 font-mono">
                  {((editingTrack.volumeModifier || 1.0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTrackEdit}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 font-medium"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
      {/* YouTube Cookies Modal */}
      {showCookiesModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#1e1e1d] border border-neutral-700 rounded-xl p-5 max-w-lg w-full space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">
              Configurar Cookies de YouTube (yt-dlp)
            </h3>

            <textarea
              value={cookiesInput}
              onChange={(e) => setCookiesInput(e.target.value)}
              placeholder="Pega el contenido del archivo de cookies (formato Netscape) aquí..."
              className="w-full h-40 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white text-xs font-mono"
            />

            {cookiesStatusMsg && (
              <div className="text-emerald-400 font-medium">{cookiesStatusMsg}</div>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={handleDeleteCookies}
                className="px-3 py-1.5 bg-red-900/50 text-red-300 rounded hover:bg-red-800/60"
              >
                Eliminar Cookies
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCookiesModal(false)}
                  className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSaveCookies}
                  disabled={isSavingCookies}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 font-medium disabled:opacity-50"
                >
                  {isSavingCookies ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
