import React, { useRef, useEffect, useState } from 'react';
import { Story, Message, RinDynamicStats, CozyAtmosphere } from '../types';
import { DEFAULT_RIN_STATS } from '../storage';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { CozyActionsBar } from './CozyActionsBar';
import {
  Menu,
  ArrowDown,
  Sparkles,
  AlertCircle,
  Check,
  Eye,
  Zap,
  Layers,
  Activity,
  ChevronDown,
  ExternalLink,
  Feather,
  CloudRain,
  Sun,
  Moon,
} from 'lucide-react';

interface ChatContainerProps {
  story: Story;
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStop: () => void;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onToggleSidebarMobile: () => void;
  errorMessage: string | null;
  onOpenSettings: () => void;
  saveStatus?: 'saved' | 'saving';
  lastSavedTimestamp?: number;
  onOpenRinStatsModal: () => void;
  onOpenJournal?: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  story,
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  onRegenerate,
  onEditMessage,
  onToggleSidebarMobile,
  errorMessage,
  onOpenSettings,
  saveStatus = 'saved',
  lastSavedTimestamp,
  onOpenRinStatsModal,
  onOpenJournal,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [isStatsDropdownOpen, setIsStatsDropdownOpen] = useState(false);

  const rinStats = story.rinStats || DEFAULT_RIN_STATS;
  const atmosphere = story.memory?.atmosphere;

  // Subtle atmospheric background class based on weather & time
  let atmosphericBgClass = 'bg-[#ffffff]';
  if (atmosphere?.weather?.includes('lluvia') || atmosphere?.weather === 'niebla') {
    atmosphericBgClass = 'bg-[#fbfcfa]'; // Gentle cool fresh slate tint
  } else if (atmosphere?.timeOfDay === 'atardecer' || atmosphere?.timeOfDay === 'tarde') {
    atmosphericBgClass = 'bg-[#fdfcf9]'; // Gentle warm amber tint
  } else if (atmosphere?.timeOfDay === 'noche' || atmosphere?.timeOfDay === 'madrugada') {
    atmosphericBgClass = 'bg-[#fcfbf9]'; // Gentle quiet twilight tone
  }

  // Auto-scroll logic
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
      setUserHasScrolledUp(false);
      setShowScrollBottom(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStatsDropdownOpen(false);
      }
    };
    if (isStatsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatsDropdownOpen]);

  // Scroll listener to detect when user scrolled up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 120) {
      setShowScrollBottom(true);
      setUserHasScrolledUp(true);
    } else {
      setShowScrollBottom(false);
      setUserHasScrolledUp(false);
    }
  };

  // Scroll when messages change or streaming updates if not manually scrolled up
  useEffect(() => {
    if (!userHasScrolledUp) {
      scrollToBottom(isLoading ? 'auto' : 'smooth');
    }
  }, [story.messages, isLoading, userHasScrolledUp]);

  // Current active chapter
  const latestChapter = story.chapters && story.chapters.length > 0
    ? story.chapters[story.chapters.length - 1]
    : null;

  return (
    <main
      id="conversation-panel"
      className={`flex-1 flex flex-col h-full ${atmosphericBgClass} relative overflow-hidden transition-colors duration-500`}
    >
      {/* Top Bar */}
      <header className="h-12 border-b border-[#eeedea] px-3 sm:px-4 flex items-center justify-between shrink-0 bg-[#ffffff]/90 backdrop-blur-xs z-20 select-none relative">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="toggle-sidebar-mobile-btn"
            onClick={onToggleSidebarMobile}
            className="md:hidden p-1.5 rounded-md text-[#5a5955] hover:bg-[#f1f1ef] transition-colors"
            title="Abrir menú"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs font-semibold text-[#1f1f1e] font-serif truncate max-w-[110px] sm:max-w-xs md:max-w-md">
              {story.title}
            </h2>
            {latestChapter && (
              <span className="text-[11px] text-[#787774] hidden lg:inline">
                · Cap. {latestChapter.numberRoman}: {latestChapter.title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
          {/* BOTÓN CUADERNO DE RIN EN HEADER */}
          {onOpenJournal && (
            <button
              id="open-journal-header-btn"
              onClick={onOpenJournal}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#fdfcf9] hover:bg-[#f5f1e6] text-[#3d3830] border border-[#e5dfd2] transition-all shadow-2xs group"
              title="Abrir cuaderno de vivencias y recuerdos de Rin"
            >
              <Feather className="w-3.5 h-3.5 text-amber-700 group-hover:rotate-12 transition-transform" />
              <span className="font-medium hidden sm:inline">Cuaderno</span>
            </button>
          )}

          {/* STATS DESPLEGABLE EN TIEMPO REAL */}
          <div className="relative">
            <button
              id="rin-stats-dropdown-trigger"
              onClick={() => setIsStatsDropdownOpen(!isStatsDropdownOpen)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                isStatsDropdownOpen
                  ? 'bg-[#1f1f1e] text-white border-[#1f1f1e] shadow-xs'
                  : 'bg-[#f7f6f3] text-[#37352f] border-[#d3d2ce] hover:bg-[#eeedea]'
              }`}
              title="Panel desplegable en tiempo real de las stats de Rin"
            >
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold hidden sm:inline">Stats Rin</span>
              </div>
              <span className="text-[10px] font-mono opacity-80 hidden md:inline">|</span>
              <span className="font-mono text-[11px] font-bold text-amber-600">
                {rinStats.chakra.primaryCurrent}%
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-600">
                II:{rinStats.chakra.secondaryCurrent}%
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isStatsDropdownOpen ? 'rotate-180 text-white' : 'text-[#787774]'
                }`}
              />
            </button>

            {/* FLOATING DROPDOWN PANEL */}
            {isStatsDropdownOpen && (
              <div
                id="rin-stats-dropdown-menu"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#ffffff] border border-[#e3e2de] rounded-xl shadow-2xl z-50 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150 font-sans"
              >
                {/* Dropdown Header */}
                <div className="flex items-center justify-between border-b border-[#eeedea] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#1f1f1e] text-white flex items-center justify-center">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#1f1f1e] uppercase tracking-wide">
                        ESTADO DE RIN · TIEMPO REAL
                      </h3>
                      <p className="text-[10px] text-[#787774]">
                        Yūrei no Keimyaku · Mokuton · Intōn
                      </p>
                    </div>
                  </div>
                  <button
                    id="open-full-rin-modal-from-dropdown-header-btn"
                    onClick={() => {
                      setIsStatsDropdownOpen(false);
                      onOpenRinStatsModal();
                    }}
                    className="p-1 rounded text-[#787774] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors"
                    title="Abrir panel completo"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chakra Gauges */}
                <div className="space-y-2.5">
                  {/* Primary Chakra */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#5a5955] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Chakra Principal
                      </span>
                      <span className="font-mono font-bold text-[#1f1f1e]">
                        {rinStats.chakra.primaryCurrent}%
                      </span>
                    </div>
                    <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${rinStats.chakra.primaryCurrent}%` }}
                      />
                    </div>
                  </div>

                  {/* Secondary Chakra Flow */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#5a5955] flex items-center gap-1">
                        <Layers className="w-3 h-3 text-emerald-600" />
                        Segundo Flujo (Reserva)
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {rinStats.chakra.secondaryCurrent}%
                      </span>
                    </div>
                    <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${rinStats.chakra.secondaryCurrent}%` }}
                      />
                    </div>
                  </div>

                  {/* Physical Health & Fatigue */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#5a5955] flex items-center gap-1">
                        <Activity className="w-3 h-3 text-rose-500" />
                        Salud / Fatiga ({rinStats.vitality.fatigueLevel})
                      </span>
                      <span className="font-mono font-bold text-rose-600">
                        {rinStats.vitality.healthCurrent}%
                      </span>
                    </div>
                    <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${rinStats.vitality.healthCurrent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 bg-[#f7f6f3] rounded border border-[#eeedea] space-y-1">
                    <div className="text-[10px] text-[#787774] uppercase font-semibold">
                      Tercer Ojo
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-[#37352f] truncate">
                        {rinStats.perception.thirdEyeMode}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          rinStats.perception.thirdEyeActive ? 'bg-blue-500' : 'bg-[#9b9a97]'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-[#f7f6f3] rounded border border-[#eeedea] space-y-1">
                    <div className="text-[10px] text-[#787774] uppercase font-semibold">
                      Bio-Arsenal
                    </div>
                    <div className="text-xs font-mono font-medium text-[#37352f] flex gap-2">
                      <span title="Frutos Explosivos">💣 {rinStats.mokuton.explosiveFruits}</span>
                      <span title="Esporas Somníferas">🌿 {rinStats.mokuton.sleepSporesVials}</span>
                      <span title="Clones">👥 {rinStats.mokuton.clonesActive}</span>
                    </div>
                  </div>
                </div>

                {/* Current Location & Threat */}
                <div className="text-[11px] text-[#5a5955] bg-[#faf9f6] p-2.5 rounded border border-[#eeedea] flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#37352f]">Amenaza:</span>
                    <span className="text-amber-800 font-medium truncate max-w-[200px]">
                      {rinStats.tacticalStatus.currentThreat}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#787774]">
                    <span>Detección remota: {rinStats.perception.remoteRangeMeters}m</span>
                    <span>Bio-energía: {rinStats.mokuton.storedBioEnergy}%</span>
                  </div>
                </div>

                {/* Open Full Stats Modal Button */}
                <button
                  id="open-full-rin-stats-from-dropdown-btn"
                  onClick={() => {
                    setIsStatsDropdownOpen(false);
                    onOpenRinStatsModal();
                  }}
                  className="w-full py-2 px-3 bg-[#1f1f1e] hover:bg-[#37352f] text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ver Ficha Completa y Biblia de Jutsus</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </button>
              </div>
            )}
          </div>

          {/* Subtle Auto-save indicator */}
          <div
            id="autosave-status-indicator"
            className="flex items-center gap-1 text-[11px] text-[#787774] transition-all"
            title={
              lastSavedTimestamp
                ? `Guardado automáticamente a las ${new Date(lastSavedTimestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}`
                : 'Guardado automático activo'
            }
          >
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-[#787774]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9b9a97] animate-pulse" />
                <span className="hidden sm:inline">Guardando...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#787774] opacity-80 hover:opacity-100">
                <Check className="w-3 h-3 text-[#787774]" />
                <span className="hidden sm:inline">Guardado</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#5a5955] bg-[#f7f6f3] px-2.5 py-1 rounded-full border border-[#eeedea]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#37352f]" />
            <span className="font-medium hidden sm:inline">Game Master</span>
            <span className="font-medium sm:hidden">GM</span>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
        id="messages-scroll-area"
      >
        <div className="flex-1 pb-4">
          {story.messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLast={index === story.messages.length - 1}
              isStreaming={isLoading && index === story.messages.length - 1 && msg.role === 'assistant'}
              onRegenerate={onRegenerate}
              onEditMessage={onEditMessage}
            />
          ))}

          {/* Error Banner if API error occurs */}
          {errorMessage && (
            <div className="max-w-2xl mx-auto my-4 p-3 bg-[#fdfcfb] border border-[#d3d2ce] rounded-xl flex items-start gap-2.5 text-xs text-[#37352f] shadow-2xs">
              <AlertCircle className="w-4 h-4 text-[#787774] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-[#1f1f1e]">{errorMessage}</p>
                <button
                  onClick={onOpenSettings}
                  className="mt-1.5 text-[11px] underline underline-offset-2 text-[#5a5955] hover:text-[#000000] font-medium"
                >
                  Abrir configuración de API Key
                </button>
              </div>
            </div>
          )}

          <div ref={bottomAnchorRef} className="h-2" />
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          id="scroll-to-bottom-btn"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-24 right-6 z-20 p-2 bg-[#ffffff] hover:bg-[#f7f6f3] border border-[#dcdad6] shadow-md rounded-full text-[#37352f] transition-all duration-150 flex items-center gap-1.5 text-xs"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Bajar al final</span>
        </button>
      )}

      {/* Cozy Layer Actions Bar */}
      <div className="shrink-0">
        <CozyActionsBar
          atmosphere={atmosphere}
          onSelectAction={(actionText) => {
            setInput(actionText);
          }}
          onOpenJournal={onOpenJournal || (() => {})}
          isLoading={isLoading}
        />
      </div>

      {/* Composer Container */}
      <div className="shrink-0 bg-gradient-to-t from-white via-white to-transparent pt-1">
        <Composer
          input={input}
          setInput={setInput}
          onSend={onSend}
          isLoading={isLoading}
          onStop={onStop}
        />
      </div>
    </main>
  );
};
