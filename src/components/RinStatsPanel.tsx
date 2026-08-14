import React, { useState } from 'react';
import { RinDynamicStats, StoryMemory, TechniqueRecord } from '../types';
import {
  Activity,
  Eye,
  TreePine,
  Flame,
  Shield,
  Zap,
  Sparkles,
  RefreshCw,
  X,
  AlertTriangle,
  Layers,
  Users,
  Compass,
  Scroll,
  Info,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Skull,
  Lock,
} from 'lucide-react';

interface RinStatsPanelProps {
  stats: RinDynamicStats;
  memory: StoryMemory;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStats: (newStats: RinDynamicStats) => void;
  onResetToDefaults: () => void;
}

type TabType = 'chakra' | 'perception' | 'mokuton' | 'spirits' | 'techniques' | 'team';

export const RinStatsPanel: React.FC<RinStatsPanelProps> = ({
  stats,
  memory,
  isOpen,
  onClose,
  onUpdateStats,
  onResetToDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('chakra');
  const [techFilter, setTechFilter] = useState<'all' | 'past' | 'present' | 'future'>('all');

  if (!isOpen) return null;

  if (!stats) return null;
  const safeChakra = stats.chakra || { primaryCurrent: 100, primaryMax: 100, secondaryCurrent: 100, secondaryMax: 100, flowState: 'balanced' as const };
  const safeVitality = stats.vitality || { healthCurrent: 100, healthMax: 100, fatigueLevel: 'none' as const, regenArmorActive: false };
  const safePerception = stats.perception || { thirdEyeActive: false, thirdEyeMode: 'reposo' as const, remoteRangeMeters: 100, phantomNodesCount: 0, spatialAnchorActive: false };
  const safeMokuton = stats.mokuton || { activeRootsDensity: 0, putrefactionCycleActive: false, storedBioEnergy: 0, explosiveFruits: 0, sleepSporesVials: 0, clonesActive: 0 };
  const safeSpiritAllies = stats.spiritAllies || { kaliSummoned: false, kaliSpiritualAbsorption: false, kaliAccumulatedInton: 0, shivaConditionalSealLocked: true };
  const safeTacticalStatus = stats.tacticalStatus || { location: 'Desconocido', currentThreat: 'Ninguna', ecosystemHealth: 100 };

  const updateChakra = (fields: Partial<RinDynamicStats['chakra']>) => {
    onUpdateStats({
      ...stats,
      chakra: { ...safeChakra, ...fields },
    });
  };

  const updateVitality = (fields: Partial<RinDynamicStats['vitality']>) => {
    onUpdateStats({
      ...stats,
      vitality: { ...safeVitality, ...fields },
    });
  };

  const updatePerception = (fields: Partial<RinDynamicStats['perception']>) => {
    onUpdateStats({
      ...stats,
      perception: { ...safePerception, ...fields },
    });
  };

  const updateMokuton = (fields: Partial<RinDynamicStats['mokuton']>) => {
    onUpdateStats({
      ...stats,
      mokuton: { ...safeMokuton, ...fields },
    });
  };

  const updateSpirits = (fields: Partial<RinDynamicStats['spiritAllies']>) => {
    onUpdateStats({
      ...stats,
      spiritAllies: { ...safeSpiritAllies, ...fields },
    });
  };

  // Categorize techniques based on Rin Master Bible
  const categorizedTechniques = (memory?.techniques || []).map((t) => {
    const nameLower = t.name.toLowerCase();
    let era: 'past' | 'present' | 'future' = 'present';

    if (
      nameLower.includes('kawarimi') ||
      nameLower.includes('bunshin básico') ||
      nameLower.includes('henge') ||
      nameLower.includes('academi')
    ) {
      era = 'past';
    } else if (
      nameLower.includes('ataúd divino') ||
      nameLower.includes('shiva') ||
      nameLower.includes('modificador vital') ||
      nameLower.includes('putrefacción de roca') ||
      nameLower.includes('luto')
    ) {
      era = 'future';
    } else {
      era = 'present';
    }

    return { ...t, era };
  });

  const filteredTechs = categorizedTechniques.filter((t) => {
    if (techFilter === 'all') return true;
    return t.era === techFilter;
  });

  return (
    <div
      id="rin-stats-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="rin-stats-modal"
        className="bg-[#ffffff] text-[#1f1f1e] w-full max-w-4xl max-h-[92vh] rounded-xl shadow-2xl border border-[#e3e2de] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#191918] text-[#f7f6f3] px-5 py-4 flex items-center justify-between border-b border-[#2d2d2b]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2b2a28] border border-[#3e3d39] flex items-center justify-center text-[#e3e2de]">
              <Eye className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-wide font-serif">
                  ESTADO Y CONTINUIDAD DE RIN
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  TIEMPO REAL
                </span>
              </div>
              <p className="text-[11px] text-[#9b9a97]">
                Kekkei Genkai Yūrei no Keimyaku · Mokuton Biológico · Intōn · Equipo 7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="reset-rin-stats-btn"
              onClick={onResetToDefaults}
              className="px-2.5 py-1 text-[11px] rounded text-[#9b9a97] hover:text-[#f7f6f3] hover:bg-[#2b2a28] border border-[#3e3d39] transition-colors flex items-center gap-1.5"
              title="Restablecer valores predeterminados de la crónica"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
            <button
              id="close-rin-stats-btn"
              onClick={onClose}
              className="p-1 rounded-md text-[#9b9a97] hover:text-[#ffffff] hover:bg-[#2b2a28] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Tactical Ribbon */}
        <div className="bg-[#f7f6f3] border-b border-[#eeedea] px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a5955]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-[#37352f]">
              <Compass className="w-3.5 h-3.5 text-[#787774]" />
              {safeTacticalStatus.location}
            </span>
            <span className="hidden sm:inline text-[#d3d1cb]">|</span>
            <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              {safeTacticalStatus.currentThreat}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#787774]">Chakra Principal:</span>
              <span className="font-mono font-semibold text-[#1f1f1e]">
                {safeChakra.primaryCurrent}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#787774]">II Flujo:</span>
              <span className="font-mono font-semibold text-emerald-700">
                {safeChakra.secondaryCurrent}%
              </span>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-[#eeedea] bg-[#ffffff] px-4 overflow-x-auto select-none no-scrollbar">
          <button
            onClick={() => setActiveTab('chakra')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'chakra'
                ? 'border-[#1f1f1e] text-[#1f1f1e]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Chakra y Vitalidad
          </button>
          <button
            onClick={() => setActiveTab('perception')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'perception'
                ? 'border-[#1f1f1e] text-[#1f1f1e]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-500" />
            Yūrei no Keimyaku
          </button>
          <button
            onClick={() => setActiveTab('mokuton')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'mokuton'
                ? 'border-[#1f1f1e] text-[#1f1f1e]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <TreePine className="w-3.5 h-3.5 text-emerald-600" />
            Mokuton e Intōn
          </button>
          <button
            onClick={() => setActiveTab('spirits')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'spirits'
                ? 'border-[#1f1f1e] text-[#1f1f1e]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-purple-500" />
            Kālī y Shiva
          </button>
          <button
            onClick={() => setActiveTab('techniques')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'techniques'
                ? 'border-[#1f1f1e] text-[#1f1f1e]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Scroll className="w-3.5 h-3.5 text-orange-600" />
            Biblia de Jutsus ({memory.techniques.length})
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'team'
                ? 'border-[#1f1f1e] text-[#1f1f1e]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-600" />
            Equipo 7 y Mundo
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#faf9f6]">
          {/* TAB 1: CHAKRA Y VITALIDAD */}
          {activeTab === 'chakra' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Circulación Principal */}
                <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e3e2de] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                        Chakra Principal (Tenketsu)
                      </h3>
                    </div>
                    <span className="text-sm font-mono font-bold text-[#1f1f1e]">
                      {safeChakra.primaryCurrent}%
                    </span>
                  </div>

                  <div className="w-full bg-[#f1f1ef] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-linear-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${safeChakra.primaryCurrent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-[#787774]">Ajuste manual:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={safeChakra.primaryCurrent}
                      onChange={(e) => updateChakra({ primaryCurrent: Number(e.target.value) })}
                      className="w-36 accent-[#37352f]"
                    />
                  </div>
                  <p className="text-[11px] text-[#787774] leading-relaxed">
                    Circulación convencional. Sujeto a fatiga si cae por debajo del 25%.
                  </p>
                </div>

                {/* Segundo Flujo de Chakra */}
                <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e3e2de] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                        Segundo Flujo (Reserva Intōn / Red)
                      </h3>
                    </div>
                    <span className="text-sm font-mono font-bold text-emerald-700">
                      {safeChakra.secondaryCurrent}%
                    </span>
                  </div>

                  <div className="w-full bg-[#f1f1ef] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-linear-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${safeChakra.secondaryCurrent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-[#787774]">Ajuste reserva:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={safeChakra.secondaryCurrent}
                      onChange={(e) => updateChakra({ secondaryCurrent: Number(e.target.value) })}
                      className="w-36 accent-emerald-700"
                    />
                  </div>
                  <p className="text-[11px] text-[#787774] leading-relaxed">
                    <strong className="text-[#37352f]">Regla de la Biblia:</strong> Circulación
                    separada que amortigua grandes transferencias sin sobrecargar los tenketsu
                    principales.
                  </p>
                </div>
              </div>

              {/* Vitalidad, Fatiga y Armadura Regenerativa */}
              <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e3e2de] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#eeedea] pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                      Condición Biológica y Regeneración
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#787774]">Nivel de Fatiga:</span>
                    <select
                      value={safeVitality.fatigueLevel}
                      onChange={(e) =>
                        updateVitality({
                          fatigueLevel: e.target.value as RinDynamicStats['vitality']['fatigueLevel'],
                        })
                      }
                      className="text-xs bg-[#f7f6f3] border border-[#d3d1cb] rounded px-2 py-1 text-[#37352f] focus:outline-none"
                    >
                      <option value="none">Óptima (Sin fatiga)</option>
                      <option value="light">Ligera</option>
                      <option value="moderate">Moderada</option>
                      <option value="exhausted">Exhausta</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#787774]">Salud Física:</span>
                      <span className="font-mono font-semibold text-[#1f1f1e]">
                        {safeVitality.healthCurrent}%
                      </span>
                    </div>
                    <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${safeVitality.healthCurrent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-[#f7f6f3] rounded-md border border-[#eeedea]">
                    <div>
                      <div className="text-xs font-medium text-[#37352f]">
                        Regeneración Extrema (Mokuton Skin)
                      </div>
                      <div className="text-[10px] text-[#787774]">
                        Segunda capa celular vegetal protectora
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        updateVitality({ regenArmorActive: !safeVitality.regenArmorActive })
                      }
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        safeVitality.regenArmorActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#e3e2de] text-[#787774] hover:bg-[#d3d1cb]'
                      }`}
                    >
                      {safeVitality.regenArmorActive ? 'ACTIVA' : 'INACTIVA'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: YŪREI NO KEIMYAKU & PERCEPCIÓN */}
          {activeTab === 'perception' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e3e2de] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#eeedea] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                        Tercer Ojo (Órgano Perceptivo Incipiente)
                      </h3>
                      <p className="text-[11px] text-[#787774]">
                        Base de datos mental, análisis de patrones y proyección remota
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      updatePerception({ thirdEyeActive: !safePerception.thirdEyeActive })
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      safePerception.thirdEyeActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[#eeedea] text-[#787774]'
                    }`}
                  >
                    {safePerception.thirdEyeActive ? 'ABIERTO' : 'CERRADO'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#37352f]">Modo de Percepción:</label>
                    <select
                      value={safePerception.thirdEyeMode}
                      onChange={(e) =>
                        updatePerception({
                          thirdEyeMode: e.target.value as RinDynamicStats['perception']['thirdEyeMode'],
                        })
                      }
                      className="w-full text-xs bg-[#f7f6f3] border border-[#d3d1cb] rounded px-3 py-1.5 text-[#37352f] focus:outline-none"
                    >
                      <option value="reposo">Reposo / Vigilancia Pasiva</option>
                      <option value="analisis_flujo">Análisis de Flujo de Chakra & Jutsu</option>
                      <option value="vista_remota">Vista Remota / Proyección Exponencial</option>
                      <option value="sobrecarga">Saturación Perceptiva / Sobrecarga</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#37352f] font-medium">Radio de Detección:</span>
                      <span className="font-mono text-blue-600 font-bold">
                        {safePerception.remoteRangeMeters} metros
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="1200"
                      step="25"
                      value={safePerception.remoteRangeMeters}
                      onChange={(e) =>
                        updatePerception({ remoteRangeMeters: Number(e.target.value) })
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#37352f]">Nodos de Red Fantasma</div>
                      <div className="text-[10px] text-[#787774]">Puntos de resonancia para infiltración</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updatePerception({
                            phantomNodesCount: Math.max(0, safePerception.phantomNodesCount - 1),
                          })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold hover:bg-[#f1f1ef]"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold px-1">
                        {safePerception.phantomNodesCount}
                      </span>
                      <button
                        onClick={() =>
                          updatePerception({
                            phantomNodesCount: safePerception.phantomNodesCount + 1,
                          })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold hover:bg-[#f1f1ef]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#37352f]">Anclaje Perceptivo</div>
                      <div className="text-[10px] text-[#787774]">Distorsión espacial en el entorno</div>
                    </div>
                    <button
                      onClick={() =>
                        updatePerception({
                          spatialAnchorActive: !safePerception.spatialAnchorActive,
                        })
                      }
                      className={`px-2.5 py-1 text-xs rounded font-medium ${
                        safePerception.spatialAnchorActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#e3e2de] text-[#787774]'
                      }`}
                    >
                      {safePerception.spatialAnchorActive ? 'FIJADO' : 'INACTIVO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MOKUTON & ALQUIMIA BIOLÓGICA */}
          {activeTab === 'mokuton' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ciclo Putrefacción - Vitalidad */}
                <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e3e2de] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                        Ciclo Putrefacción ↔ Vitalidad
                      </h3>
                    </div>
                    <button
                      onClick={() =>
                        updateMokuton({
                          putrefactionCycleActive: !safeMokuton.putrefactionCycleActive,
                        })
                      }
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium ${
                        safeMokuton.putrefactionCycleActive
                          ? 'bg-emerald-700 text-white'
                          : 'bg-[#eeedea] text-[#787774]'
                      }`}
                    >
                      {safeMokuton.putrefactionCycleActive ? 'CANALIZANDO' : 'EN ESPERA'}
                    </button>
                  </div>

                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] text-[11px] text-[#5a5955] space-y-1 font-mono">
                    <div className="text-[#37352f] font-semibold">Circuito Energético:</div>
                    <div className="text-emerald-800">
                      Materia Orgánica → Putrefacción → Vitalidad → Raíces → Transferencia
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#787774]">Bio-Energía Almacenada:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {safeMokuton.storedBioEnergy}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={safeMokuton.storedBioEnergy}
                      onChange={(e) => updateMokuton({ storedBioEnergy: Number(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>

                {/* Control Territorial & Ecosistema */}
                <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e3e2de] shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <TreePine className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                      Territorio & Ecosistema
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#787774]">Densidad de Raíces de Control:</span>
                      <span className="font-mono font-bold text-[#1f1f1e]">
                        {safeMokuton.activeRootsDensity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={safeMokuton.activeRootsDensity}
                      onChange={(e) => updateMokuton({ activeRootsDensity: Number(e.target.value) })}
                      className="w-full accent-[#37352f]"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#787774]">Salud del Ecosistema Circundante:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {safeTacticalStatus.ecosystemHealth}%
                      </span>
                    </div>
                    <p className="text-[10px] text-[#787774]">
                      La extracción repetida marchita la vegetación y alerta a rastreadores.
                    </p>
                  </div>
                </div>
              </div>

              {/* Arsenal Botánico Rápido */}
              <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e3e2de] shadow-2xs">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#37352f] mb-3">
                  Arsenal Biológico Activo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#37352f]">Frutos Explosivos</div>
                      <div className="text-[10px] text-[#787774]">Proyectiles Mokuton</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          updateMokuton({
                            explosiveFruits: Math.max(0, safeMokuton.explosiveFruits - 1),
                          })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold px-1">
                        {safeMokuton.explosiveFruits}
                      </span>
                      <button
                        onClick={() =>
                          updateMokuton({ explosiveFruits: safeMokuton.explosiveFruits + 1 })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#37352f]">Esporas Somníferas</div>
                      <div className="text-[10px] text-[#787774]">Viales Suiton/Mokuton</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          updateMokuton({
                            sleepSporesVials: Math.max(0, safeMokuton.sleepSporesVials - 1),
                          })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold px-1">
                        {safeMokuton.sleepSporesVials}
                      </span>
                      <button
                        onClick={() =>
                          updateMokuton({ sleepSporesVials: safeMokuton.sleepSporesVials + 1 })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#37352f]">Mokubunshin Activos</div>
                      <div className="text-[10px] text-[#787774]">Clones de Madera</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          updateMokuton({
                            clonesActive: Math.max(0, safeMokuton.clonesActive - 1),
                          })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold px-1">
                        {safeMokuton.clonesActive}
                      </span>
                      <button
                        onClick={() =>
                          updateMokuton({ clonesActive: safeMokuton.clonesActive + 1 })
                        }
                        className="w-6 h-6 rounded bg-[#ffffff] border border-[#d3d1cb] text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVOCACIONES ESPIRITUALES (KĀLĪ Y SHIVA) */}
          {activeTab === 'spirits' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Kālī */}
              <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e3e2de] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#eeedea] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                        Kālī (Intōn / Mokuton)
                      </h3>
                      <p className="text-[11px] text-[#787774]">
                        Cuerpo de Mokuton · 6 Brazos · Miles de voces · Vínculo espiritual voluntario
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      updateSpirits({ kaliSummoned: !safeSpiritAllies.kaliSummoned })
                    }
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      safeSpiritAllies.kaliSummoned
                        ? 'bg-purple-700 text-white'
                        : 'bg-[#eeedea] text-[#787774]'
                    }`}
                  >
                    {safeSpiritAllies.kaliSummoned ? 'INVOCADA' : 'EN PLANO ESPIRITUAL'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#37352f]">Alimentación Pasiva (500m):</span>
                      <button
                        onClick={() =>
                          updateSpirits({
                            kaliSpiritualAbsorption: !safeSpiritAllies.kaliSpiritualAbsorption,
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          safeSpiritAllies.kaliSpiritualAbsorption
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#d3d1cb] text-[#5a5955]'
                        }`}
                      >
                        {safeSpiritAllies.kaliSpiritualAbsorption ? 'ACTIVA' : 'OFF'}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#787774]">
                      Absorbe progresivamente energía espiritual ambiental para mantener sus técnicas.
                    </p>
                  </div>

                  <div className="p-3 bg-[#f7f6f3] rounded border border-[#eeedea] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#37352f] font-medium">Intōn Acumulado:</span>
                      <span className="font-mono text-purple-700 font-bold">
                        {safeSpiritAllies.kaliAccumulatedInton}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={safeSpiritAllies.kaliAccumulatedInton}
                      onChange={(e) =>
                        updateSpirits({ kaliAccumulatedInton: Number(e.target.value) })
                      }
                      className="w-full accent-purple-700"
                    />
                  </div>
                </div>
              </div>

              {/* Shiva */}
              <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e3e2de] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                        Shiva, Creador Vital (Sello Condicional)
                      </h3>
                      <p className="text-[11px] text-[#787774]">
                        Invocación creadora de legiones con sello activado solo ante amenaza crítica
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    SELLO BLOQUEADO
                  </span>
                </div>
                <div className="text-[11px] text-[#5a5955] bg-[#fcfbf9] p-3 rounded border border-[#eeedea] leading-relaxed">
                  <strong className="text-[#37352f]">Directriz Canónica:</strong> Rin todavía no
                  domina completamente el uso de Shiva. El Game Master no debe activarlo
                  arbitrariamente hasta que se desarrolle en la historia.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BIBLIA DE JUTSUS Y CONTINUIDAD */}
          {activeTab === 'techniques' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeedea] pb-3">
                <div className="flex items-center gap-2">
                  <Scroll className="w-4 h-4 text-[#787774]" />
                  <span className="text-xs font-medium text-[#37352f]">
                    Filtro Temporal de la Biblia:
                  </span>
                </div>
                <div className="flex gap-1.5 text-xs">
                  <button
                    onClick={() => setTechFilter('all')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      techFilter === 'all'
                        ? 'bg-[#1f1f1e] text-white'
                        : 'bg-[#eeedea] text-[#787774] hover:bg-[#e3e2de]'
                    }`}
                  >
                    Todas ({categorizedTechniques.length})
                  </button>
                  <button
                    onClick={() => setTechFilter('past')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      techFilter === 'past'
                        ? 'bg-[#1f1f1e] text-white'
                        : 'bg-[#eeedea] text-[#787774] hover:bg-[#e3e2de]'
                    }`}
                  >
                    Pasado
                  </button>
                  <button
                    onClick={() => setTechFilter('present')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      techFilter === 'present'
                        ? 'bg-[#1f1f1e] text-white'
                        : 'bg-[#eeedea] text-[#787774] hover:bg-[#e3e2de]'
                    }`}
                  >
                    Presente (Bosque)
                  </button>
                  <button
                    onClick={() => setTechFilter('future')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      techFilter === 'future'
                        ? 'bg-[#1f1f1e] text-white'
                        : 'bg-[#eeedea] text-[#787774] hover:bg-[#e3e2de]'
                    }`}
                  >
                    Futuro (Investigación)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTechs.map((tech, idx) => (
                  <div
                    key={`${tech.name}_${idx}`}
                    className="p-3.5 bg-[#ffffff] rounded-lg border border-[#e3e2de] shadow-2xs space-y-1.5 hover:border-[#d3d1cb] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-[#1f1f1e]">{tech.name}</h4>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          tech.era === 'past'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : tech.era === 'present'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {tech.era === 'past'
                          ? 'PASADO'
                          : tech.era === 'present'
                          ? 'PRESENTE'
                          : 'FUTURO'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#787774] flex items-center gap-2">
                      <span>{tech.type}</span>
                      <span>·</span>
                      <span className="font-medium text-[#5a5955]">
                        Estado: {tech.mastery}
                      </span>
                    </div>
                    {tech.notes && (
                      <p className="text-[11px] text-[#37352f] bg-[#f7f6f3] p-2 rounded border border-[#eeedea] leading-relaxed">
                        {tech.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: EQUIPO 7 Y CONTINUIDAD */}
          {activeTab === 'team' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(memory?.relational || []).map((rel, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#ffffff] rounded-lg border border-[#e3e2de] shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#1f1f1e]">{rel.targetName}</h4>
                      <span className="text-[10px] text-[#787774] bg-[#f7f6f3] px-2 py-0.5 rounded border border-[#eeedea]">
                        {rel.relationship}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5a5955] leading-relaxed pt-1">
                      {rel.attitude}
                    </p>
                  </div>
                ))}
              </div>

              {/* Inventario & Pergaminos */}
              <div className="bg-[#ffffff] p-4 rounded-lg border border-[#e3e2de] shadow-2xs space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#37352f]">
                  Inventario Táctico y Pergaminos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#37352f]">
                  {memory.factual.inventory?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[#f7f6f3] rounded border border-[#eeedea] flex items-center gap-2"
                    >
                      <Scroll className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="text-[11px] truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#f7f6f3] border-t border-[#eeedea] px-5 py-3 flex items-center justify-between text-xs text-[#787774]">
          <span>
            Continuidad canónica de Rin activa · Auto-sincronizado con memoria persistente
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1f1f1e] text-white rounded-md hover:bg-[#37352f] transition-colors text-xs font-medium"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
};
