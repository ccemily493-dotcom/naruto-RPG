import React, { useState } from 'react';
import { CozyAtmosphere, TimeOfDay, WeatherType } from '../types';
import {
  Coffee,
  CloudRain,
  Sun,
  Moon,
  Wind,
  Sparkles,
  Feather,
  BookOpen,
  Home,
  Compass,
  ChevronDown,
  Info,
  Volume2,
} from 'lucide-react';

interface CozyActionsBarProps {
  atmosphere?: CozyAtmosphere;
  onSelectAction: (promptText: string) => void;
  onOpenJournal: () => void;
  isLoading: boolean;
}

const defaultAtmosphere: CozyAtmosphere = {
  timeOfDay: 'atardecer',
  weather: 'lluvia_suave',
  locationName: 'Konohagakure no Sato',
  moodDescription: 'Momento de descompresión y regreso a la aldea tras la intensidad de la misión.',
  acousticDetails:
    'Lluvia suave sobre madera, pasos lejanos en los callejones y aroma a tierra mojada.',
};

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

const cozyQuickActions = [
  {
    label: 'Tomar té caliente',
    icon: '🍵',
    prompt:
      'Rin se sienta en una mesa de madera a beber un té verde humeante y descansar el cuerpo...',
  },
  {
    label: 'Pasear bajo la lluvia',
    icon: '🌧️',
    prompt:
      'Rin camina despacio por los callejones de Konoha escuchando el repiqueteo de la lluvia en los tejados...',
  },
  {
    label: 'Comer en la aldea',
    icon: '🍜',
    prompt:
      'Rin busca un puesto de comida caliente para reponer fuerzas y conversar tranquilamente...',
  },
  {
    label: 'Sentarse en el mirador',
    icon: '🌸',
    prompt:
      'Rin sube al banco con vista a los rostros de los Hokage y se sienta a contemplar el horizonte...',
  },
  {
    label: 'Regresar a la habitación',
    icon: '🏡',
    prompt:
      'Rin regresa a su habitación privada, se quita las sandalias y ordena sus notas junto a la ventana...',
  },
  {
    label: 'Cuidar brotes Mokuton',
    icon: '🌿',
    prompt: 'Rin humedece la tierra de sus brotes y moldea un flujo mínimo y relajado de chakra...',
  },
  {
    label: 'Saludar a un conocido',
    icon: '👋',
    prompt:
      'Rin se detiene al cruzarse con un conocido de la aldea e intercambia un saludo cotidiano...',
  },
];

export const CozyActionsBar: React.FC<CozyActionsBarProps> = ({
  atmosphere = defaultAtmosphere,
  onSelectAction,
  onOpenJournal,
  isLoading,
}) => {
  const [showAtmosphereDetails, setShowAtmosphereDetails] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 pt-1 pb-2 font-sans select-none">
      {/* Atmosphere Banner & Quick Actions Strip */}
      <div className="flex flex-col gap-1.5">
        {/* Top Atmosphere Status & Journal Opener */}
        <div className="flex items-center justify-between text-xs">
          <button
            id="toggle-atmosphere-details-btn"
            onClick={() => setShowAtmosphereDetails(!showAtmosphereDetails)}
            className="flex items-center gap-2 py-1 px-2.5 rounded-full bg-[#f8f6f0] hover:bg-[#f1eee4] text-[#4a443b] border border-[#e5dfd2] transition-all group"
            title="Ver detalles del clima y ambiente actual"
          >
            <div className="flex items-center gap-1.5">
              {weatherIcons[atmosphere.weather] || (
                <CloudRain className="w-3.5 h-3.5 text-sky-500" />
              )}
              <span className="font-medium text-[#2c2a27]">
                {timeLabels[atmosphere.timeOfDay] || atmosphere.timeOfDay}
              </span>
              <span className="text-[#8c8577]">·</span>
              <span className="text-[#686154] truncate max-w-[150px] sm:max-w-xs">
                {atmosphere.locationName}
              </span>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-[#8c8577] transition-transform ${
                showAtmosphereDetails ? 'rotate-180' : ''
              }`}
            />
          </button>

          <button
            id="open-journal-action-btn"
            onClick={onOpenJournal}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#ffffff] hover:bg-[#f7f5ed] text-[#3d3830] border border-[#ded6c4] shadow-2xs text-xs font-medium transition-all group"
            title="Abrir cuaderno de recuerdos y vivencias de Rin"
          >
            <Feather className="w-3 h-3 text-amber-700 group-hover:rotate-12 transition-transform" />
            <span>Cuaderno de Rin</span>
          </button>
        </div>

        {/* Expanded Atmosphere sensory details */}
        {showAtmosphereDetails && (
          <div className="p-3 bg-[#faf8f3] rounded-xl border border-[#e5dfd2] text-xs text-[#524c43] space-y-1.5 animate-in fade-in duration-150 font-serif">
            <div className="flex items-center justify-between text-[11px] font-sans text-[#7d7567] border-b border-[#ece6d8] pb-1">
              <span className="font-semibold uppercase tracking-wider text-[#4a443b]">
                Atmósfera del Momento
              </span>
              <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Volume2 className="w-3 h-3 text-emerald-600" />
                Paisaje sonoro suave
              </span>
            </div>
            <p className="leading-relaxed">
              <strong className="font-sans font-medium text-[#2c2a27]">Ambiente: </strong>
              {atmosphere.moodDescription}
            </p>
            <p className="text-[11px] text-[#6d6659] leading-relaxed italic">
              <strong className="font-sans font-medium text-[#4a443b] not-italic">
                Acústica:{' '}
              </strong>
              {atmosphere.acousticDetails}
            </p>
          </div>
        )}

        {/* Scrollable Quick Cozy Moment Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar text-xs">
          <span className="text-[10px] uppercase font-semibold text-[#8c8577] tracking-wider shrink-0 pr-1 hidden sm:inline">
            Pausa:
          </span>
          {cozyQuickActions.map((action) => (
            <button
              key={action.label}
              disabled={isLoading}
              onClick={() => onSelectAction(action.prompt)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdfcf9] hover:bg-[#f3eee3] text-[#4a443b] hover:text-[#1f1e1c] border border-[#e8e2d4] hover:border-[#cfc6b5] transition-all whitespace-nowrap shrink-0 text-xs shadow-2xs disabled:opacity-50 group"
              title={action.prompt}
            >
              <span className="text-xs group-hover:scale-110 transition-transform">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
