// Central Configuration for Official Audio Library Sources & Classification Rules
// Any source repository or branch can be customized here without modifying the core pipeline.

export interface AudioSourceDefinition {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  type: 'sfx' | 'ambience';
  targetSubdir: string;
  defaultLicense: string;
  licenseUrl: string;
  attributionRequired: boolean;
  commercialUse: boolean;
  redistributionAllowed: boolean;
  description: string;
}

export interface AudioSourcesConfig {
  version: string;
  officialSources: Record<string, AudioSourceDefinition>;
  ambienceCategories: string[];
  sfxCategories: string[];
  loopCandidateKeywords: string[];
}

export const AUDIO_SOURCES_CONFIG: AudioSourcesConfig = {
  version: '1.0.0',
  officialSources: {
    sfx_cc0: {
      id: 'sfx_cc0',
      name: 'Generic RPG Sound Effects (CC0)',
      repoUrl: 'https://github.com/rse/soundfx',
      branch: 'master',
      type: 'sfx',
      targetSubdir: 'sfx_cc0',
      defaultLicense: 'Creative Commons Zero v1.0 Universal (CC0 1.0)',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      commercialUse: true,
      redistributionAllowed: true,
      description: 'Colección de efectos de sonido RPG genéricos CC0 (impactos, pasos, magia, etc.).',
    },
    nature_ambience: {
      id: 'nature_ambience',
      name: 'Ambient Sounds Nature Library',
      repoUrl: 'https://github.com/Muges/ambientsounds',
      branch: 'master',
      type: 'ambience',
      targetSubdir: 'nature_ambience',
      defaultLicense: 'Creative Commons Attribution 3.0 (CC-BY 3.0) / GPL-3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
      attributionRequired: true,
      commercialUse: true,
      redistributionAllowed: true,
      description: 'Paisajes sonoros de naturaleza continuos y ambientes inmersivos (bosque, lluvia, tormenta, viento, río, cueva, fuego, etc.).',
    },
  },
  ambienceCategories: [
    'forest',
    'forest_night',
    'rain',
    'storm',
    'wind',
    'water',
    'river',
    'cave',
    'fire',
    'other',
  ],
  sfxCategories: [
    'impacts',
    'wood',
    'metal',
    'water',
    'movement',
    'explosions',
    'environment',
    'magic',
    'other',
  ],
  loopCandidateKeywords: [
    'wind',
    'rain',
    'forest',
    'water',
    'river',
    'stream',
    'fire',
    'storm',
    'thunderstorm',
    'cave',
    'drone',
    'loop',
    'ambience',
    'ambient',
    'night',
    'crickets',
  ],
};
