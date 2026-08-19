import React, { useState, useEffect } from 'react';
import { Story, Chapter, OpenAIConfig, GMProviderStatus } from '../types';
import { DEFAULT_RIN_STATS } from '../storage';
import {
  Plus,
  BookOpen,
  Settings,
  ChevronRight,
  Edit3,
  Trash2,
  Check,
  Sparkles,
  Eye,
  Zap,
  Layers,
  Music,
  Feather,
  Bot,
} from 'lucide-react';

interface SidebarProps {
  stories: Story[];
  activeStory: Story;
  onSelectStory: (id: string) => void;
  onNewStory: () => void;
  onRenameStory: (id: string, newTitle: string) => void;
  onDeleteStory: (id: string) => void;
  onScrollToChapter: (chapterId: string) => void;
  activeChapterId?: string;
  onOpenSettings: () => void;
  config: OpenAIConfig;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenRinStats?: () => void;
  onOpenAudioLibrary?: () => void;
  onOpenJournal?: () => void;
  gmStatus?: GMProviderStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  stories,
  activeStory,
  onSelectStory,
  onNewStory,
  onRenameStory,
  onDeleteStory,
  onScrollToChapter,
  activeChapterId,
  onOpenSettings,
  config,
  isOpenMobile,
  onCloseMobile,
  onOpenRinStats,
  onOpenAudioLibrary,
  onOpenJournal,
  gmStatus,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(activeStory?.title || '');
  const [showStorySelector, setShowStorySelector] = useState(false);

  const rinStats = activeStory?.rinStats || DEFAULT_RIN_STATS;

  useEffect(() => {
    if (activeStory?.title) {
      setEditingTitleValue(activeStory.title);
    }
  }, [activeStory?.id, activeStory?.title]);

  const handleSaveTitle = () => {
    if (editingTitleValue.trim() && activeStory?.id) {
      onRenameStory(activeStory.id, editingTitleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleKeyDownTitle = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditingTitleValue(activeStory?.title || '');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/20 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        id="story-navigation-panel"
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 flex flex-col bg-[#fbfbfa] border-r border-[#eeedea] transition-transform duration-200 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top App Title & New Story Action */}
        <div className="p-3.5 border-b border-[#eeedea] space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#37352f]" />
              <span className="text-xs font-semibold tracking-wider uppercase text-[#5a5955] font-title">
                Naruto RPG
              </span>
            </div>
            <span className="text-[10px] text-[#9b9a97] tracking-tight">Motor Narrativo</span>
          </div>

          <button
            id="new-story-btn"
            onClick={() => {
              onNewStory();
              if (isOpenMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#ffffff] hover:bg-[#f1f1ef] active:bg-[#e9e9e7] border border-[#dcdad6] hover:border-[#c5c3be] text-[#37352f] rounded-lg text-xs font-medium transition-all shadow-2xs group"
          >
            <Plus className="w-3.5 h-3.5 text-[#5a5955] group-hover:text-[#1f1f1e] transition-colors" />
            <span>Nueva historia</span>
          </button>
        </div>

        {/* Current Story Header & Selector Toggle */}
        <div className="px-3.5 py-3 border-b border-[#eeedea] bg-[#f7f6f3]/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">
              Relato Activo
            </span>
            <div className="flex items-center gap-1">
              <button
                id="toggle-story-list-btn"
                onClick={() => setShowStorySelector(!showStorySelector)}
                title="Historial de relatos"
                className="text-[11px] text-[#787774] hover:text-[#1f1f1e] px-1.5 py-0.5 rounded hover:bg-[#eeedea] transition-colors"
              >
                {stories.length} {stories.length === 1 ? 'relato' : 'relatos'}
              </button>
            </div>
          </div>

          {isEditingTitle ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="text"
                value={editingTitleValue}
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onKeyDown={handleKeyDownTitle}
                autoFocus
                className="flex-1 px-2 py-1 bg-white border border-[#37352f] rounded text-xs text-[#1f1f1e] outline-none"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-[#37352f] hover:bg-[#e9e9e7] rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="group flex items-center justify-between mt-0.5">
              <h1
                onDoubleClick={() => {
                  setEditingTitleValue(activeStory?.title || '');
                  setIsEditingTitle(true);
                }}
                className="text-xs font-semibold text-[#1f1f1e] truncate cursor-pointer hover:text-[#000000] font-serif"
                title={activeStory?.title}
              >
                {activeStory?.title}
              </h1>
              <button
                onClick={() => {
                  setEditingTitleValue(activeStory?.title || '');
                  setIsEditingTitle(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#787774] hover:text-[#1f1f1e] transition-opacity"
                title="Renombrar historia"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Stories Dropdown / Drawer if open */}
        {showStorySelector && (
          <div className="px-3.5 py-2 border-b border-[#eeedea] bg-[#f1f1ef]/80 max-h-40 overflow-y-auto space-y-1">
            <div className="text-[10px] text-[#787774] font-medium uppercase tracking-wider mb-1">
              Tus Historias Guardadas
            </div>
            {stories.map((st) => (
              <div
                key={st.id}
                onClick={() => {
                  onSelectStory(st.id);
                  setShowStorySelector(false);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer group transition-colors ${
                  st.id === activeStory?.id
                    ? 'bg-[#ffffff] text-[#1f1f1e] font-medium shadow-2xs border border-[#e3e2e0]'
                    : 'text-[#5a5955] hover:bg-[#ffffff]/60'
                }`}
              >
                <span className="truncate flex-1">{st.title}</span>
                {stories.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar la historia "${st.title}"?`)) {
                        onDeleteStory(st.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[#9b9a97] hover:text-red-600 transition-opacity ml-1"
                    title="Eliminar relato"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rin Stats Card in Sidebar */}
        <div className="px-3.5 py-2.5 border-b border-[#eeedea] bg-[#ffffff]">
          <button
            id="open-rin-stats-from-sidebar-btn"
            onClick={() => {
              if (onOpenRinStats) onOpenRinStats();
              if (isOpenMobile) onCloseMobile();
            }}
            className="w-full text-left p-2.5 bg-[#f7f6f3] hover:bg-[#eeedea] rounded-lg border border-[#e3e2de] transition-all group"
            title="Abrir panel de stats de Rin"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1f1f1e]">
                <Eye className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Estado de Rin</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded font-bold">
                EN VIVO
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-[#5a5955]">
              <div className="flex justify-between items-center">
                <span>Chakra Principal:</span>
                <span className="font-mono font-bold text-[#1f1f1e]">
                  {rinStats.chakra.primaryCurrent}%
                </span>
              </div>
              <div className="w-full bg-[#e3e2de] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${rinStats.chakra.primaryCurrent}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-0.5">
                <span>Segundo Flujo:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {rinStats.chakra.secondaryCurrent}%
                </span>
              </div>
              <div className="w-full bg-[#e3e2de] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${rinStats.chakra.secondaryCurrent}%` }}
                />
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#e3e2de]/60 flex items-center justify-between text-[10px] text-[#787774]">
              <span>Tercer Ojo: {rinStats.perception.thirdEyeMode}</span>
              <span className="text-[#37352f] group-hover:translate-x-0.5 transition-transform">
                Ver ficha →
              </span>
            </div>
          </button>
        </div>

        {/* Chapter Index Section */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3">
          <div className="flex items-center gap-1.5 px-1 mb-2 text-[#787774]">
            <BookOpen className="w-3.5 h-3.5 text-[#787774]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Índice de Capítulos
            </span>
          </div>

          <div className="space-y-1.5" id="chapter-list">
            {activeStory?.chapters && activeStory.chapters.length > 0 ? (
              activeStory.chapters.map((chapter, index) => {
                const isActive =
                  chapter.id === activeChapterId ||
                  (!activeChapterId && index === activeStory.chapters.length - 1);
                return (
                  <button
                    key={chapter.id}
                    id={`chapter-item-${chapter.id}`}
                    onClick={() => {
                      onScrollToChapter(chapter.id);
                      if (isOpenMobile) onCloseMobile();
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-all group border ${
                      isActive
                        ? 'bg-[#ffffff] border-[#d3d2ce] shadow-2xs text-[#1f1f1e]'
                        : 'border-transparent hover:border-[#eeedea] hover:bg-[#ffffff]/70 text-[#5a5955]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] font-semibold tracking-wider text-[#787774] font-serif">
                          CAP. {chapter.numberRoman}
                        </span>
                        <span className="text-xs font-medium text-[#1f1f1e] group-hover:text-black">
                          {chapter.title}
                        </span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[#9b9a97] group-hover:text-[#37352f] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {chapter.synopsis && (
                      <p className="text-[11px] text-[#787774] mt-1 line-clamp-2 leading-relaxed">
                        {chapter.synopsis}
                      </p>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-[#9b9a97]">
                Sin capítulos definidos aún.
              </div>
            )}
          </div>
        </div>

        {/* Minimal Footer Settings, Journal & Audio Library */}
        <div className="p-3 border-t border-[#eeedea] bg-[#fbfbfa] space-y-1">
          {onOpenJournal && (
            <button
              id="open-journal-sidebar-btn"
              onClick={() => {
                onOpenJournal();
                if (isOpenMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-[#5a5955] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Feather className="w-3.5 h-3.5 text-amber-700 group-hover:rotate-12 transition-transform" />
                <span>Cuaderno de Rin</span>
              </div>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Diario
              </span>
            </button>
          )}

          {onOpenAudioLibrary && (
            <button
              id="open-audio-sidebar-btn"
              onClick={() => {
                onOpenAudioLibrary();
                if (isOpenMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-[#5a5955] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audio & yt-dlp</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Engine
              </span>
            </button>
          )}

          {/* GM PROVIDER ROUTER SIDEBAR INDICATOR */}
          <div
            id="sidebar-gm-provider-indicator"
            className="w-full flex items-center justify-between p-2 rounded-lg text-xs bg-[#f7f6f3] border border-[#e5dfd2] text-[#37352f]"
            title={
              gmStatus?.fallbackReason
                ? `GM Provider: ${gmStatus.displayText} (${gmStatus.fallbackReason})`
                : `GM Provider: ${gmStatus?.displayText || 'GM: Gemini Pro'}`
            }
          >
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-medium text-[11px] truncate">
                {gmStatus?.displayText || 'GM: Gemini Pro'}
              </span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                gmStatus?.isFallback
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {gmStatus?.isFallback ? 'FALLBACK' : 'PRIMARY'}
            </span>
          </div>

          <button
            id="open-settings-footer-btn"
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-[#5a5955] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-[#787774]" />
              <span>Configuración</span>
            </div>
            <span className="text-[10px] font-mono text-[#787774] bg-[#eeedea] px-1.5 py-0.5 rounded">
              {config.model}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
