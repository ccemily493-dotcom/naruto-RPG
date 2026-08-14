import React, { useState } from 'react';
import {
  PersonalJournal,
  CozyMemory,
  JournalPerson,
  DiscoveredPlace,
  PersonalRoomState,
  JournalCustomEntry,
  TimeOfDay,
  WeatherType,
} from '../types';
import {
  BookOpen,
  X,
  Feather,
  Heart,
  Compass,
  Home,
  CloudRain,
  Sun,
  Moon,
  Wind,
  Coffee,
  Sparkles,
  Plus,
  Trash2,
  MapPin,
  Clock,
  User,
  Quote,
  Send,
  Leaf,
} from 'lucide-react';

interface PersonalJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal?: PersonalJournal;
  onUpdateJournal: (updater: (prev: PersonalJournal) => PersonalJournal) => void;
  onSelectActionPrompt?: (promptText: string) => void;
}

type JournalTab = 'memories' | 'people' | 'places' | 'room' | 'write';

const weatherIcons: Record<string, React.ReactNode> = {
  despejado: <Sun className="w-3.5 h-3.5 text-amber-500" />,
  lluvia_suave: <CloudRain className="w-3.5 h-3.5 text-sky-500" />,
  lluvia_torrencial: <CloudRain className="w-3.5 h-3.5 text-blue-600" />,
  nublado: <Wind className="w-3.5 h-3.5 text-stone-400" />,
  viento_calido: <Wind className="w-3.5 h-3.5 text-orange-400" />,
  nieve: <Sparkles className="w-3.5 h-3.5 text-indigo-300" />,
  niebla: <Wind className="w-3.5 h-3.5 text-slate-400" />,
  tormenta: <CloudRain className="w-3.5 h-3.5 text-purple-500" />,
};

const timeLabels: Record<TimeOfDay, string> = {
  amanecer: 'Amanecer',
  mañana: 'Mañana',
  mediodía: 'Mediodía',
  tarde: 'Tarde',
  atardecer: 'Atardecer',
  noche: 'Noche',
  madrugada: 'Madrugada',
};

export const PersonalJournalModal: React.FC<PersonalJournalModalProps> = ({
  isOpen,
  onClose,
  journal,
  onUpdateJournal,
  onSelectActionPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<JournalTab>('memories');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryTag, setNewEntryTag] = useState('Reflexión');
  const [activeMemoryFilter, setActiveMemoryFilter] = useState<string>('all');
  const [editingReflectionId, setEditingReflectionId] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState('');

  if (!isOpen) return null;

  const currentJournal: PersonalJournal = {
    memories: journal?.memories || [],
    people: journal?.people || [],
    discoveredPlaces: journal?.discoveredPlaces || [],
    room: {
      deskItems: journal?.room?.deskItems || [],
      herbsAndPlants: journal?.room?.herbsAndPlants || [],
      souvenirs: journal?.room?.souvenirs || [],
      windowView: journal?.room?.windowView || 'Vista abierta a los tejados de Konoha.',
      roomAtmosphere: journal?.room?.roomAtmosphere || 'Serena y tranquila.',
      notes: journal?.room?.notes || [],
    },
    customEntries: journal?.customEntries || [],
  };

  const handleSaveCustomEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryTitle.trim() || !newEntryContent.trim()) return;

    const newEntry: JournalCustomEntry = {
      id: 'entry_' + Date.now(),
      title: newEntryTitle.trim(),
      content: newEntryContent.trim(),
      timestamp: Date.now(),
      tags: [newEntryTag.trim()],
    };

    onUpdateJournal((prev) => ({
      ...prev,
      customEntries: [newEntry, ...(prev.customEntries || [])],
    }));

    setNewEntryTitle('');
    setNewEntryContent('');
  };

  const handleDeleteCustomEntry = (id: string) => {
    onUpdateJournal((prev) => ({
      ...prev,
      customEntries: (prev.customEntries || []).filter((e) => e.id !== id),
    }));
  };

  const handleSaveReflection = (memoryId: string) => {
    onUpdateJournal((prev) => ({
      ...prev,
      memories: (prev.memories || []).map((m) =>
        m.id === memoryId ? { ...m, userReflection: reflectionText.trim() } : m
      ),
    }));
    setEditingReflectionId(null);
    setReflectionText('');
  };

  const filteredMemories = (currentJournal.memories || []).filter((m) => {
    if (activeMemoryFilter === 'all') return true;
    return (
      m.charactersInvolved?.includes(activeMemoryFilter) ||
      (m.location?.toLowerCase() || '').includes(activeMemoryFilter.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="personal-journal-dialog"
        className="bg-[#fcfbf9] text-[#2c2b29] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-[#e3ded4] shadow-2xl flex flex-col overflow-hidden font-sans"
        style={{
          backgroundImage: 'radial-gradient(#ebe7dd 0.75px, transparent 0.75px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Notebook Header */}
        <header className="px-5 py-4 bg-[#f7f4ed] border-b border-[#e5e0d5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3d3830] text-[#f7f4ed] flex items-center justify-center shadow-xs">
              <Feather className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-serif tracking-wide text-[#23211e]">
                  Cuaderno de Rin
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#ece6d8] text-[#6d6659] border border-[#ded6c4]">
                  Vivencias & Calma
                </span>
              </div>
              <p className="text-xs text-[#7d7567] mt-0.5">
                Memorias cotidianas, lazos sinceros y rincones descubiertos en Konohagakure
              </p>
            </div>
          </div>
          <button
            id="close-journal-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-[#7d7567] hover:text-[#23211e] hover:bg-[#eae4d5] transition-colors"
            title="Cerrar diario"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Notebook Navigation Tabs */}
        <nav className="flex items-center gap-1 px-5 py-2 bg-[#f4efe5] border-b border-[#e5e0d5] overflow-x-auto text-xs">
          <button
            id="journal-tab-memories"
            onClick={() => setActiveTab('memories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'memories'
                ? 'bg-[#ffffff] text-[#23211e] shadow-2xs border border-[#ded6c4]'
                : 'text-[#6d6659] hover:text-[#23211e] hover:bg-[#ece6d8]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Memorias & Momentos</span>
            <span className="text-[10px] opacity-70">({currentJournal.memories?.length || 0})</span>
          </button>

          <button
            id="journal-tab-people"
            onClick={() => setActiveTab('people')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'people'
                ? 'bg-[#ffffff] text-[#23211e] shadow-2xs border border-[#ded6c4]'
                : 'text-[#6d6659] hover:text-[#23211e] hover:bg-[#ece6d8]'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-600" />
            <span>Lazos & Personas</span>
            <span className="text-[10px] opacity-70">({currentJournal.people?.length || 0})</span>
          </button>

          <button
            id="journal-tab-places"
            onClick={() => setActiveTab('places')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'places'
                ? 'bg-[#ffffff] text-[#23211e] shadow-2xs border border-[#ded6c4]'
                : 'text-[#6d6659] hover:text-[#23211e] hover:bg-[#ece6d8]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-700" />
            <span>Rincones de la Aldea</span>
            <span className="text-[10px] opacity-70">({currentJournal.discoveredPlaces?.length || 0})</span>
          </button>

          <button
            id="journal-tab-room"
            onClick={() => setActiveTab('room')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'room'
                ? 'bg-[#ffffff] text-[#23211e] shadow-2xs border border-[#ded6c4]'
                : 'text-[#6d6659] hover:text-[#23211e] hover:bg-[#ece6d8]'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-amber-800" />
            <span>Mi Habitación</span>
          </button>

          <button
            id="journal-tab-write"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ml-auto ${
              activeTab === 'write'
                ? 'bg-[#3d3830] text-[#f7f4ed] shadow-2xs'
                : 'text-[#3d3830] hover:bg-[#ece6d8]'
            }`}
          >
            <Feather className="w-3.5 h-3.5 text-amber-400" />
            <span>Escribir Reflexión</span>
          </button>
        </nav>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: MEMORIAS COTIDIANAS */}
          {activeTab === 'memories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#7d7567] border-b border-[#e8e3d8] pb-2">
                <span className="font-medium">
                  Momentos donde no hubo batalla, sino vida, lluvia y compañía
                </span>
                {currentJournal.memories && currentJournal.memories.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span>Filtrar:</span>
                    <select
                      value={activeMemoryFilter}
                      onChange={(e) => setActiveMemoryFilter(e.target.value)}
                      className="bg-[#ffffff] border border-[#dcd4c3] rounded px-2 py-0.5 text-xs text-[#2c2b29] outline-none"
                    >
                      <option value="all">Todas las memorias</option>
                      <option value="Sakura Haruno">Sakura</option>
                      <option value="Naruto Uzumaki">Naruto</option>
                      <option value="Sasuke Uchiha">Sasuke</option>
                      <option value="Ichiraku">Ichiraku</option>
                    </select>
                  </div>
                )}
              </div>

              {filteredMemories.length === 0 ? (
                <div className="p-8 text-center bg-[#ffffff]/60 rounded-xl border border-[#ebe5d8] space-y-2">
                  <Feather className="w-6 h-6 text-[#a89f8f] mx-auto" />
                  <p className="text-sm font-serif text-[#5d564a]">
                    Aún no se han asentado recuerdos cotidianos en este filtro.
                  </p>
                  <p className="text-xs text-[#8d8576]">
                    A medida que Rin regrese a la aldea, comparta té o camine bajo la lluvia, se irán escribiendo aquí.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMemories.map((memory) => (
                    <article
                      key={memory.id}
                      className="bg-[#ffffff] rounded-xl p-4 border border-[#e5dfd2] shadow-2xs hover:border-[#cfc7b7] transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Top Meta */}
                        <div className="flex items-center justify-between text-[11px] text-[#7d7567] border-b border-[#f3ede1] pb-1.5">
                          <div className="flex items-center gap-1.5">
                            {weatherIcons[memory.weather] || <Sun className="w-3.5 h-3.5" />}
                            <span>{timeLabels[memory.timeOfDay] || memory.timeOfDay}</span>
                            <span>·</span>
                            <span className="truncate max-w-[140px]">{memory.location}</span>
                          </div>
                          <span className="font-serif italic text-amber-800 text-[10px]">
                            {memory.emotionalTone}
                          </span>
                        </div>

                        {/* Title & Snippet */}
                        <h3 className="text-sm font-bold font-serif text-[#23211e] leading-snug">
                          {memory.title}
                        </h3>
                        <p className="text-xs text-[#524c43] leading-relaxed font-serif">
                          «{memory.snippet}»
                        </p>

                        {/* Involved Characters */}
                        {memory.charactersInvolved && memory.charactersInvolved.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {memory.charactersInvolved.map((char) => (
                              <span
                                key={char}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4efe5] text-[#5d5547] border border-[#e3dcd0]"
                              >
                                {char}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* User Reflection Note */}
                        {memory.userReflection ? (
                          <div className="p-2.5 rounded-lg bg-[#f9f7f2] border-l-2 border-amber-600 text-xs text-[#4a443b] italic font-serif">
                            {memory.userReflection}
                          </div>
                        ) : null}
                      </div>

                      {/* Reflection Editor or Action */}
                      <div className="pt-2 border-t border-[#f4eee3] flex items-center justify-between text-[11px]">
                        {editingReflectionId === memory.id ? (
                          <div className="w-full space-y-2">
                            <input
                              type="text"
                              value={reflectionText}
                              onChange={(e) => setReflectionText(e.target.value)}
                              placeholder="Escribe una pequeña reflexión de Rin..."
                              className="w-full bg-[#fcfbf9] border border-[#ded6c4] rounded-md px-2.5 py-1 text-xs text-[#2c2b29] outline-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingReflectionId(null)}
                                className="px-2 py-0.5 text-xs text-[#7d7567] hover:text-[#23211e]"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveReflection(memory.id)}
                                className="px-2.5 py-0.5 bg-[#3d3830] text-white rounded text-xs"
                              >
                                Guardar nota
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingReflectionId(memory.id);
                                setReflectionText(memory.userReflection || '');
                              }}
                              className="text-[#7d7567] hover:text-amber-800 transition-colors flex items-center gap-1"
                            >
                              <Feather className="w-3 h-3" />
                              <span>{memory.userReflection ? 'Editar nota' : 'Añadir reflexión'}</span>
                            </button>

                            {onSelectActionPrompt && (
                              <button
                                onClick={() => {
                                  onSelectActionPrompt(
                                    `Rin recuerda el momento de "${memory.title}" mientras contempla el entorno...`
                                  );
                                  onClose();
                                }}
                                className="text-amber-900 hover:text-amber-950 font-medium flex items-center gap-1"
                              >
                                <span>Rememorar en la escena →</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LAZOS & PERSONAS */}
          {activeTab === 'people' && (
            <div className="space-y-4">
              <div className="text-xs text-[#7d7567] border-b border-[#e8e3d8] pb-2">
                <span>
                  Vínculos que maduran con conversaciones pausadas, favores sencillos y complicidad
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentJournal.people || []).map((person) => (
                  <div
                    key={person.name}
                    className="bg-[#ffffff] rounded-xl p-4 border border-[#e5dfd2] shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold font-serif text-[#23211e]">
                            {person.name}
                          </h3>
                          <span className="text-[11px] text-amber-800 font-medium">
                            {person.relationship}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4efe5] text-[#5d5547] border border-[#ded6c4]">
                          Vínculo natural
                        </span>
                      </div>

                      <p className="text-xs text-[#524c43] leading-relaxed">
                        {person.attitude}
                      </p>

                      {person.memorableQuote && (
                        <div className="p-2.5 rounded-lg bg-[#fbf9f4] border-l-2 border-[#b59d74] text-xs text-[#4a443b] font-serif italic">
                          <Quote className="w-3 h-3 text-[#b59d74] inline-block mr-1 -mt-1" />
                          {person.memorableQuote}
                        </div>
                      )}

                      {person.sharedMoments && person.sharedMoments.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-semibold uppercase text-[#8d8576] tracking-wider">
                            Vivencias compartidas:
                          </span>
                          <ul className="text-xs text-[#5d564a] space-y-0.5 list-disc list-inside">
                            {person.sharedMoments.map((moment, idx) => (
                              <li key={idx} className="leading-snug">{moment}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {onSelectActionPrompt && (
                      <div className="pt-2 border-t border-[#f4eee3] flex justify-end">
                        <button
                          onClick={() => {
                            onSelectActionPrompt(
                              `Rin busca a ${person.name} para compartir un momento tranquilo o una conversación sin misiones...`
                            );
                            onClose();
                          }}
                          className="text-xs text-amber-900 hover:text-black font-medium flex items-center gap-1"
                        >
                          <span>Buscar a {person.name} →</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RINCONES DESCUBIERTOS (COZY DISCOVERY) */}
          {activeTab === 'places' && (
            <div className="space-y-4">
              <div className="text-xs text-[#7d7567] border-b border-[#e8e3d8] pb-2">
                <span>
                  Lugares pacíficos descubiertos sin necesidad de misiones ni recompensas numéricas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentJournal.discoveredPlaces || []).map((place) => (
                  <div
                    key={place.id}
                    className="bg-[#ffffff] rounded-xl p-4 border border-[#e5dfd2] shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold font-serif text-[#23211e]">
                            {place.name}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] text-[#7d7567]">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>{place.locationArea}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500 text-xs" title="Nivel de calma">
                          {'★'.repeat(place.peaceRating || 5)}
                        </div>
                      </div>

                      <p className="text-xs text-[#524c43] leading-relaxed">
                        {place.description}
                      </p>

                      <div className="p-2 rounded-lg bg-[#f5f8f5] border border-[#d6e3d6] text-xs text-[#355235]">
                        <span className="font-semibold text-[10px] uppercase block text-[#264226]">
                          Atmósfera sensorial:
                        </span>
                        {place.sensoryAtmosphere}
                      </div>
                    </div>

                    {onSelectActionPrompt && (
                      <div className="pt-2 border-t border-[#f4eee3] flex justify-end">
                        <button
                          onClick={() => {
                            onSelectActionPrompt(
                              `Rin camina con paso pausado hacia ${place.name} para sentarse y descansar un rato...`
                            );
                            onClose();
                          }}
                          className="text-xs text-emerald-800 hover:text-emerald-950 font-medium flex items-center gap-1"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Visitar este rincón →</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MI HABITACIÓN (SANTUARIO PERSONAL) */}
          {activeTab === 'room' && (
            <div className="space-y-4">
              <div className="text-xs text-[#7d7567] border-b border-[#e8e3d8] pb-2">
                <span>
                  El espacio privado de Rin: donde se guardan los objetos, las semillas y el silencio
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Desk & Atmosphere Card */}
                <div className="bg-[#ffffff] rounded-xl p-4 border border-[#e5dfd2] shadow-2xs space-y-3">
                  <h3 className="text-sm font-bold font-serif text-[#23211e] flex items-center gap-1.5">
                    <Feather className="w-4 h-4 text-amber-700" />
                    Sobre el Escritorio de Madera
                  </h3>

                  <ul className="text-xs text-[#524c43] space-y-1.5 list-disc list-inside">
                    {currentJournal.room?.deskItems?.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-[#f4eee3]">
                    <h4 className="text-xs font-semibold text-[#23211e] flex items-center gap-1.5 mb-1">
                      <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                      Plantas y Brotes de Mokuton
                    </h4>
                    <ul className="text-xs text-[#524c43] space-y-1 list-disc list-inside">
                      {currentJournal.room?.herbsAndPlants?.map((plant, idx) => (
                        <li key={idx} className="leading-relaxed">{plant}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Window View & Souvenirs */}
                <div className="bg-[#ffffff] rounded-xl p-4 border border-[#e5dfd2] shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold font-serif text-[#23211e] flex items-center gap-1.5">
                        <Sun className="w-4 h-4 text-amber-600" />
                        Vista desde la Ventana
                      </h3>
                      <p className="text-xs text-[#524c43] mt-1 italic font-serif leading-relaxed">
                        {currentJournal.room?.windowView}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#faf8f3] border border-[#e8e2d4] text-xs text-[#5a5347] space-y-1">
                      <span className="font-semibold text-[10px] uppercase block text-[#8d8576]">
                        Ambiente del santuario:
                      </span>
                      <p>{currentJournal.room?.roomAtmosphere}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold uppercase text-[#8d8576] tracking-wider block mb-1">
                        Recuerdos guardados en la repisa:
                      </span>
                      <ul className="text-xs text-[#524c43] space-y-1 list-disc list-inside">
                        {currentJournal.room?.souvenirs?.map((souvenir, idx) => (
                          <li key={idx}>{souvenir}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {onSelectActionPrompt && (
                    <div className="pt-3 border-t border-[#f4eee3] flex justify-end">
                      <button
                        onClick={() => {
                          onSelectActionPrompt(
                            'Rin regresa a su habitación, cierra la puerta con calma, enciende una taza de té y se sienta junto a la ventana...'
                          );
                          onClose();
                        }}
                        className="text-xs bg-[#3d3830] text-[#f7f4ed] hover:bg-[#23211e] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 shadow-2xs"
                      >
                        <Home className="w-3.5 h-3.5 text-amber-300" />
                        <span>Regresar a la habitación</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ESCRIBIR REFLEXIÓN PERSONAL */}
          {activeTab === 'write' && (
            <div className="space-y-6">
              {/* Write Form */}
              <form onSubmit={handleSaveCustomEntry} className="bg-[#ffffff] rounded-xl p-4 border border-[#e5dfd2] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#f4eee3] pb-2">
                  <h3 className="text-sm font-bold font-serif text-[#23211e] flex items-center gap-1.5">
                    <Feather className="w-4 h-4 text-amber-700" />
                    Nueva Reflexión en el Cuaderno
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7d7567]">Categoría:</span>
                    <select
                      value={newEntryTag}
                      onChange={(e) => setNewEntryTag(e.target.value)}
                      className="bg-[#fcfbf9] border border-[#ded6c4] rounded px-2 py-1 text-xs text-[#2c2b29] outline-none"
                    >
                      <option value="Reflexión">Reflexión</option>
                      <option value="Comida & Té">Comida & Té</option>
                      <option value="Entrenamiento">Entrenamiento</option>
                      <option value="Lluvia & Clima">Lluvia & Clima</option>
                      <option value="Aldea & Paseo">Aldea & Paseo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={newEntryTitle}
                    onChange={(e) => setNewEntryTitle(e.target.value)}
                    placeholder="Título del momento (ej: 'El sabor del té tras la lluvia')..."
                    className="w-full bg-[#fcfbf9] border border-[#ded6c4] rounded-lg px-3 py-2 text-sm text-[#23211e] placeholder:text-[#9d9587] outline-none font-serif font-bold"
                  />
                </div>

                <div>
                  <textarea
                    rows={4}
                    value={newEntryContent}
                    onChange={(e) => setNewEntryContent(e.target.value)}
                    placeholder="Escribe lo que Rin piensa, siente u observa en este instante de calma..."
                    className="w-full bg-[#fcfbf9] border border-[#ded6c4] rounded-lg px-3 py-2 text-xs text-[#2c2b29] placeholder:text-[#9d9587] outline-none resize-none leading-relaxed font-serif"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#8d8576]">
                    Se guardará de forma permanente en la memoria de la historia.
                  </span>
                  <button
                    type="submit"
                    disabled={!newEntryTitle.trim() || !newEntryContent.trim()}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                      newEntryTitle.trim() && newEntryContent.trim()
                        ? 'bg-[#3d3830] text-[#f7f4ed] hover:bg-[#23211e] shadow-2xs'
                        : 'bg-[#ebe5d8] text-[#9d9587] cursor-not-allowed'
                    }`}
                  >
                    <Feather className="w-3.5 h-3.5 text-amber-300" />
                    <span>Guardar en el diario</span>
                  </button>
                </div>
              </form>

              {/* List of Custom Entries */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-[#7d7567] tracking-wider">
                  Entradas Escritas Anteriores ({currentJournal.customEntries?.length || 0})
                </h4>

                {(!currentJournal.customEntries || currentJournal.customEntries.length === 0) ? (
                  <p className="text-xs text-[#8d8576] italic font-serif">
                    No has escrito ninguna reflexión personalizada todavía.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentJournal.customEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-[#ffffff] rounded-xl p-4 border border-[#e5dfd2] shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold font-serif text-[#23211e]">
                              {entry.title}
                            </h5>
                            {entry.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4efe5] text-[#5d5547] border border-[#ded6c4]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8d8576]">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleDeleteCustomEntry(entry.id)}
                              className="p-1 text-[#a89f8f] hover:text-rose-600 rounded transition-colors"
                              title="Eliminar entrada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#524c43] font-serif leading-relaxed whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
