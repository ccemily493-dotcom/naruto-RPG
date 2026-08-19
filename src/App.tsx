import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Story,
  Message,
  Chapter,
  OpenAIConfig,
  RinDynamicStats,
  GMProviderStatus,
  PersonalJournal,
} from './types';
import {
  loadStories,
  saveStories,
  getActiveStoryId,
  setActiveStoryId,
  createNewStory,
  loadOpenAIConfig,
  saveOpenAIConfig,
  saveActiveDraft,
  loadActiveDraft,
  getLastSavedTimestamp,
  forceFlushState,
  DEFAULT_RIN_STATS,
  INITIAL_DEFAULT_MEMORY,
} from './storage';
import { parseMessageForChapters } from './utils/chapterParser';
import { Sidebar } from './components/Sidebar';
import { ChatContainer } from './components/ChatContainer';
import { SettingsModal } from './components/SettingsModal';
import { RinStatsPanel } from './components/RinStatsPanel';
import { AudioEngineBar } from './components/AudioEngineBar';
import { AudioLibraryModal } from './components/AudioLibraryModal';
import { AudioLibrarySetupModal } from './components/AudioLibrarySetupModal';
import { PersonalJournalModal } from './components/PersonalJournalModal';
import { AudioTestLab } from './components/AudioTestLab';
import { globalAudioEngine } from './utils/audioEngine';

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/audio-test') {
    return <AudioTestLab />;
  }

  const [stories, setStories] = useState<Story[]>(() => loadStories());
  const [activeStoryId, setActiveStoryIdState] = useState<string>(() => {
    const savedId = getActiveStoryId();
    const existing = stories.find((s) => s.id === savedId);
    return existing ? existing.id : stories[0]?.id || '';
  });

  const [input, setInput] = useState<string>(() => loadActiveDraft());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<OpenAIConfig>(() => loadOpenAIConfig());
  const [hasServerKey, setHasServerKey] = useState(false);
  const [gmStatus, setGmStatus] = useState<GMProviderStatus>({
    activeProviderId: 'gemini-pro',
    activeProviderName: 'Gemini Pro',
    isFallback: false,
    displayText: 'GM: Gemini Pro',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRinStatsOpen, setIsRinStatsOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isAudioLibraryOpen, setIsAudioLibraryOpen] = useState(false);
  const [isAudioSetupOpen, setIsAudioSetupOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number>(() =>
    getLastSavedTimestamp(),
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  // Active Story helper
  const activeStory = stories.find((s) => s.id === activeStoryId) || stories[0];

  useEffect(() => {
    if (activeStory?.activeChapterId) {
      setActiveChapterId(activeStory.activeChapterId);
    }
  }, [activeStory?.id, activeStory?.activeChapterId]);

  // Up-to-date mutable ref for synchronous save-on-exit and background operations
  const stateRef = useRef({
    stories,
    activeStoryId,
    input,
    config,
  });

  useEffect(() => {
    stateRef.current = {
      stories,
      activeStoryId,
      input,
      config,
    };
  }, [stories, activeStoryId, input, config]);

  // Robust Auto-Save & Debounce Engine
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      if (stories.length > 0) {
        saveStories(stories);
        if (activeStoryId) setActiveStoryId(activeStoryId);
        saveActiveDraft(input);
        const now = Date.now();
        setLastSavedTimestamp(now);
        setSaveStatus('saved');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [stories, activeStoryId, input]);

  // Periodic interval auto-save (every 12 seconds) as an extra durability safeguard
  useEffect(() => {
    const interval = setInterval(() => {
      const { stories: currStories, activeStoryId: currId, input: currDraft } = stateRef.current;
      if (currStories && currStories.length > 0) {
        forceFlushState(currStories, currId, currDraft);
        setLastSavedTimestamp(Date.now());
        setSaveStatus('saved');
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // Save-On-Exit Mechanism (beforeunload, pagehide, visibilitychange, freeze)
  useEffect(() => {
    const handleExit = () => {
      const { stories: currStories, activeStoryId: currId, input: currDraft } = stateRef.current;
      if (currStories && currStories.length > 0) {
        forceFlushState(currStories, currId, currDraft);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExit();
      }
    };

    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('freeze', handleExit);

    return () => {
      window.removeEventListener('beforeunload', handleExit);
      window.removeEventListener('pagehide', handleExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('freeze', handleExit);
    };
  }, []);

  // Check server configuration for GM Router and Keys
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasServerKey) {
          setHasServerKey(true);
        }
        if (data.defaultModel && !config.model) {
          setConfig((prev) => ({ ...prev, model: data.defaultModel }));
        }
        if (data.gmStatus) {
          setGmStatus(data.gmStatus);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch server config:', err);
      });
  }, []);

  // Trigger initial audio evaluation for current story text on startup
  useEffect(() => {
    if (activeStory?.messages && activeStory.messages.length > 0) {
      const lastMsg = activeStory.messages[activeStory.messages.length - 1];
      if (lastMsg?.content) {
        globalAudioEngine.evaluateSceneContext(lastMsg.content, {
          location: activeStory.rinStats?.tacticalStatus?.location,
          currentThreat: activeStory.rinStats?.tacticalStatus?.currentThreat,
        });
      }
    }
  }, [activeStory?.id]);

  // Update story helper
  const updateStoryById = useCallback((storyId: string, updater: (prev: Story) => Story) => {
    setStories((prevStories) => prevStories.map((st) => (st.id === storyId ? updater(st) : st)));
  }, []);

  const updateActiveStory = useCallback(
    (updater: (prev: Story) => Story) => {
      if (activeStory?.id) {
        updateStoryById(activeStory.id, updater);
      }
    },
    [activeStory?.id, updateStoryById],
  );

  // Background memory synchronization
  const triggerBackgroundMemorySync = async (messages: Message[], currentStory: Story) => {
    try {
      const res = await fetch('/api/memory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          currentMemory: currentStory.memory,
          model: config.model,
          apiKey: config.apiKey,
        }),
      });
      const data = await res.json();
      if (data.success && data.memory) {
        updateStoryById(currentStory.id, (st) => ({
          ...st,
          memory: data.memory,
        }));
      }
    } catch (err) {
      console.warn('Background memory sync failed (silent recovery):', err);
    }
  };

  // Send message to Game Master
  const handleSendMessage = async (customUserContent?: string, messagesToUse?: Message[]) => {
    const textToSend = customUserContent !== undefined ? customUserContent : input.trim();
    const isHistoryOverride = messagesToUse !== undefined && customUserContent === undefined;

    if (!textToSend && !isHistoryOverride) return;

    setErrorMessage(null);
    setInput('');
    setIsLoading(true);

    const currentStoryId = activeStory?.id;
    if (!currentStoryId) return;

    const now = Date.now();
    let baseMessages: Message[];

    if (isHistoryOverride && messagesToUse) {
      baseMessages = messagesToUse;
    } else {
      const newUserMessage: Message = {
        id: 'msg_user_' + now,
        role: 'user',
        content: textToSend,
        timestamp: now,
      };
      const currentMessages = messagesToUse || activeStory.messages;
      baseMessages = [...currentMessages, newUserMessage];
    }

    const assistantMsgId = 'msg_asst_' + (now + 1);
    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: now + 1,
    };

    // Prepare updated message list
    const messagesWithStreaming = [...baseMessages, initialAssistantMessage];

    updateStoryById(currentStoryId, (st) => ({
      ...st,
      updatedAt: now,
      messages: messagesWithStreaming,
    }));

    abortControllerRef.current = new AbortController();

    try {
      // Fetch NPC context before generating response
      let npcContext = '';
      if (activeStory.memory?.npcWorld) {
        try {
          const npcRes = await fetch('/api/npc/context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              npcWorld: activeStory.memory.npcWorld,
              atmosphere: activeStory.memory.atmosphere,
              companions: activeStory.memory.factual?.companions || [],
              locationName: activeStory.memory.atmosphere?.locationName,
              recentEvents: activeStory.memory.episodic || [],
              currentChapter: activeStory.activeChapterId,
            }),
            signal: abortControllerRef.current.signal,
          });
          if (npcRes.ok) {
            const npcData = await npcRes.json();
            npcContext = npcData.npcContext || '';
          }
        } catch (e) {
          console.warn('Failed to fetch NPC context', e);
        }
      }

      // Send conversation context to backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: baseMessages.map((m) => ({ role: m.role, content: m.content })),
          memory: activeStory.memory,
          rinStats: activeStory.rinStats,
          chapters: activeStory.chapters,
          storyTitle: activeStory.title,
          model: config.model,
          apiKey: config.apiKey,
          npcContext: npcContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === 'OPENAI_KEY_REQUIRED') {
          setErrorMessage(
            'Se requiere una clave de API válida para el Game Master. Haz clic abajo para configurarla.',
          );
          setIsSettingsOpen(true);
        } else {
          setErrorMessage(errorData.message || `Error del servidor (${response.status})`);
        }
        // Remove empty assistant message on failure
        updateStoryById(currentStoryId, (st) => ({
          ...st,
          messages: baseMessages,
        }));
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream available');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sseBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;

        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.providerInfo) {
                setGmStatus(parsed.providerInfo);
              }
              if (parsed.error) {
                setErrorMessage(parsed.error);
              }
              if (parsed.text) {
                accumulatedText += parsed.text;

                // Check for new chapter tag in real time
                const { chaptersFound } = parseMessageForChapters(accumulatedText);

                updateStoryById(currentStoryId, (st) => {
                  const updatedChapters = [...st.chapters];
                  let activeChap = st.activeChapterId;

                  chaptersFound.forEach((cf) => {
                    const existing = updatedChapters.find(
                      (c) => c.numberRoman === cf.roman || c.title === cf.title,
                    );
                    if (!existing) {
                      const newChapter: Chapter = {
                        id: 'chap_' + Date.now() + '_' + cf.roman,
                        numberRoman: cf.roman,
                        title: cf.title,
                        synopsis: cf.synopsis,
                        messageIdStart: assistantMsgId,
                        createdAt: Date.now(),
                      };
                      updatedChapters.push(newChapter);
                      activeChap = newChapter.id;
                    }
                  });

                  return {
                    ...st,
                    chapters: updatedChapters,
                    activeChapterId: activeChap,
                    messages: st.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: accumulatedText } : m,
                    ),
                  };
                });
              }
            } catch {
              // Non-critical JSON chunk error
            }
          }
        }
      }

      // Finalize message and trigger silent memory update
      const finalMessages = [
        ...baseMessages,
        { ...initialAssistantMessage, content: accumulatedText },
      ];

      updateStoryById(currentStoryId, (st) => ({
        ...st,
        messages: finalMessages,
      }));

      // Background silent memory sync
      triggerBackgroundMemorySync(finalMessages, activeStory);

      // Decoupled Audio Engine scene evaluation
      if (accumulatedText) {
        globalAudioEngine.evaluateSceneContext(accumulatedText, {
          location: activeStory.rinStats?.tacticalStatus?.location,
          currentThreat: activeStory.rinStats?.tacticalStatus?.currentThreat,
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generación detenida por el usuario.');
      } else {
        console.error('Error al generar respuesta:', err);
        setErrorMessage(err?.message || 'Error de conexión con el Game Master.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = () => {
    if (isLoading || activeStory.messages.length === 0) return;
    const lastMessage = activeStory.messages[activeStory.messages.length - 1];
    if (lastMessage.role === 'assistant') {
      const messagesWithoutLast = activeStory.messages.slice(0, -1);
      updateActiveStory((st) => ({
        ...st,
        messages: messagesWithoutLast,
      }));
      handleSendMessage(undefined, messagesWithoutLast);
    }
  };

  // Edit message
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (isLoading) return;
    const msgIndex = activeStory.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Keep messages up to the edited one, updated with new content
    const messagesBefore = activeStory.messages.slice(0, msgIndex);
    const editedMsg: Message = {
      ...activeStory.messages[msgIndex],
      content: newContent,
      timestamp: Date.now(),
    };

    const newHistory = [...messagesBefore, editedMsg];
    handleSendMessage(undefined, newHistory);
  };

  // Create new story
  const handleNewStory = () => {
    if (isLoading) handleStopStreaming();
    const newSt = createNewStory();
    setStories((prev) => [newSt, ...prev]);
    setActiveStoryIdState(newSt.id);
    setActiveChapterId('chap_1');
    setErrorMessage(null);
  };

  // Rename story
  const handleRenameStory = (id: string, newTitle: string) => {
    setStories((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
  };

  // Delete story
  const handleDeleteStory = (id: string) => {
    setStories((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh = createNewStory();
        setActiveStoryIdState(fresh.id);
        return [fresh];
      }
      if (activeStoryId === id) {
        setActiveStoryIdState(filtered[0].id);
      }
      return filtered;
    });
  };

  // Scroll to chapter in conversation
  const handleScrollToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    const chapter = activeStory.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    // Search by marker or message
    const markerEl = document.getElementById(`chapter-marker-${chapter.numberRoman}`);
    const messageEl = document.getElementById(`message-${chapter.messageIdStart}`);

    const targetEl = markerEl || messageEl;
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Save settings
  const handleSaveSettings = (newConfig: OpenAIConfig) => {
    setConfig(newConfig);
    saveOpenAIConfig(newConfig);
    setErrorMessage(null);
  };

  // Update Rin's Stats
  const handleUpdateRinStats = (newStats: RinDynamicStats) => {
    setStories((prev) =>
      prev.map((s) =>
        s.id === activeStory.id ? { ...s, rinStats: newStats, updatedAt: Date.now() } : s,
      ),
    );
  };

  // Reset Rin's Stats to chronicle defaults
  const handleResetRinStats = () => {
    handleUpdateRinStats(JSON.parse(JSON.stringify(DEFAULT_RIN_STATS)));
  };

  // Default empty journal structure
  const DEFAULT_EMPTY_JOURNAL: PersonalJournal = {
    memories: [],
    people: [],
    discoveredPlaces: [],
    room: {
      deskItems: [],
      herbsAndPlants: [],
      souvenirs: [],
      windowView: '',
      roomAtmosphere: '',
      notes: [],
    },
    customEntries: [],
  };

  // Update Rin's Personal Journal
  const handleUpdateJournal = (updater: (prev: PersonalJournal) => PersonalJournal) => {
    updateActiveStory((st) => {
      const currentMemory = st.memory || INITIAL_DEFAULT_MEMORY;
      const currentJournal = currentMemory.journal || DEFAULT_EMPTY_JOURNAL;
      const updatedJournal = updater(currentJournal);
      return {
        ...st,
        memory: {
          ...currentMemory,
          journal: updatedJournal,
        },
      };
    });
  };

  if (!activeStory) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff] text-[#37352f]">
      {/* Panel Izquierdo: Navegador de la Historia */}
      <Sidebar
        stories={stories}
        activeStory={activeStory}
        onSelectStory={(id) => {
          if (isLoading) handleStopStreaming();
          setActiveStoryIdState(id);
          setErrorMessage(null);
        }}
        onNewStory={handleNewStory}
        onRenameStory={handleRenameStory}
        onDeleteStory={handleDeleteStory}
        onScrollToChapter={handleScrollToChapter}
        activeChapterId={activeChapterId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        config={config}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenRinStats={() => setIsRinStatsOpen(true)}
        onOpenAudioLibrary={() => setIsAudioLibraryOpen(true)}
        onOpenJournal={() => setIsJournalOpen(true)}
        gmStatus={gmStatus}
      />

      {/* Panel Derecho: Conversación Permanente y Barra de Audio */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatContainer
          story={activeStory}
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          isLoading={isLoading}
          onStop={handleStopStreaming}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          errorMessage={errorMessage}
          onOpenSettings={() => setIsSettingsOpen(true)}
          saveStatus={saveStatus}
          lastSavedTimestamp={lastSavedTimestamp}
          onOpenRinStatsModal={() => setIsRinStatsOpen(true)}
          onOpenJournal={() => setIsJournalOpen(true)}
          gmStatus={gmStatus}
        />

        {/* Barra de Audio Engine Docked */}
        <AudioEngineBar onOpenLibrary={() => setIsAudioLibraryOpen(true)} />
      </div>

      {/* Panel de Estadísticas y Continuidad de Rin */}
      <RinStatsPanel
        stats={activeStory.rinStats || DEFAULT_RIN_STATS}
        memory={activeStory.memory}
        isOpen={isRinStatsOpen}
        onClose={() => setIsRinStatsOpen(false)}
        onUpdateStats={handleUpdateRinStats}
        onResetToDefaults={handleResetRinStats}
      />

      {/* Modal del Cuaderno Personal de Rin (Cozy Layer Journal) */}
      <PersonalJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        journal={activeStory.memory?.journal}
        onUpdateJournal={handleUpdateJournal}
        onSelectActionPrompt={(promptText) => {
          setInput(promptText);
        }}
      />

      {/* Modal de la Biblioteca de Audio e Importador yt-dlp */}
      <AudioLibraryModal isOpen={isAudioLibraryOpen} onClose={() => setIsAudioLibraryOpen(false)} />

      {/* Audio Library Setup Wizard Direct Modal */}
      <AudioLibrarySetupModal
        isOpen={isAudioSetupOpen}
        onClose={() => setIsAudioSetupOpen(false)}
      />

      {/* Configuración Mínima */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveSettings}
        hasServerKey={hasServerKey}
      />
    </div>
  );
}
