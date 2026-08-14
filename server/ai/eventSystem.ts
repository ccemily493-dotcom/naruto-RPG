import { NPCWorldState, WorldEvent } from '../../src/types';

/**
 * Event AI
 * Generates and resolves world events compatible with current village state
 * and NPC actions.
 */

export function generateEmergentWorldEvent(worldState: NPCWorldState): WorldEvent | null {
  const eventsCount = worldState.activeEvents ? worldState.activeEvents.length : 0;
  if (eventsCount >= 5) return null; // Cap active events

  const now = Date.now();
  const sampleEvents: Array<{ title: string; desc: string; loc: string; importance: WorldEvent['importance']; participants: string[] }> = [
    {
      title: 'Movimiento sospechoso cerca de los límites del Bosque de la Muerte',
      desc: 'Rastreadores ANBU informan de fluctuaciones anómalas de chakra y serpientes invocadas.',
      loc: 'Bosque de la Muerte',
      importance: 'major',
      participants: ['orochimaru'],
    },
    {
      title: 'Preparativos para la fase final del Examen Chunin',
      desc: 'Genins de diversas aldeas entrenan intensamente en los campos de entrenamiento de Konoha.',
      loc: 'Aldea Oculta de la Hoja',
      importance: 'minor',
      participants: ['naruto', 'sasuke', 'sakura'],
    },
    {
      title: 'Patrulla reforzada en las puertas de Konoha',
      desc: 'Kakashi Hatake y la guardia especial patrullan los accesos principales tras los últimos informes de inteligencia.',
      loc: 'Puertas de Konoha',
      importance: 'minor',
      participants: ['kakashi'],
    },
  ];

  // Pick an event randomly if probability hits
  if (Math.random() > 0.6) {
    const picked = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
    return {
      id: `event_${now}_${Math.random().toString(36).substring(2, 6)}`,
      title: picked.title,
      description: picked.desc,
      location: picked.loc,
      importance: picked.importance,
      participants: picked.participants,
      timestamp: now,
      resolved: false,
    };
  }

  return null;
}
