export type ThemePresetId = 'amber' | 'ocean' | 'plum' | 'forest';

const amberColors = {
  background: '#0B0E14',
  backgroundRaised: '#10151F',
  surface: '#171D28',
  surfaceRaised: '#202837',
  surfaceSoft: '#262F40',
  border: '#303A4D',
  text: '#F8F5EE',
  textMuted: '#9AA5B8',
  textDim: '#6F7A8D',
  accent: '#FFB454',
  accentDeep: '#EC8F2B',
  purple: '#8B7CFF',
  purpleSoft: '#332E60',
  green: '#55D6A1',
  greenSoft: '#163C31',
  blue: '#62B8FF',
  blueSoft: '#193750',
  danger: '#FF7272',
  dangerSoft: '#4A2228',
  white: '#FFFFFF',
  black: '#000000',
};

type ThemeColors = typeof amberColors;

interface ThemePreset {
  id: ThemePresetId;
  label: string;
  description: string;
  colors: ThemeColors;
}

export const themePresets: ThemePreset[] = [
  {
    id: 'amber',
    label: 'Amber',
    description: 'The original warm orange theme.',
    colors: amberColors,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep navy with bright blue accents.',
    colors: {
      ...amberColors,
      background: '#06121B',
      backgroundRaised: '#0A1A26',
      surface: '#102433',
      surfaceRaised: '#173247',
      surfaceSoft: '#1C3C52',
      border: '#294A61',
      text: '#F1F9FC',
      textMuted: '#9EB6C5',
      textDim: '#6F8B9C',
      accent: '#62C8FF',
      accentDeep: '#2797D1',
      purple: '#9C91FF',
      purpleSoft: '#302F62',
      blue: '#72DDF7',
      blueSoft: '#153E50',
    },
  },
  {
    id: 'plum',
    label: 'Plum',
    description: 'Dark aubergine with lilac accents.',
    colors: {
      ...amberColors,
      background: '#120D18',
      backgroundRaised: '#1A1222',
      surface: '#251A30',
      surfaceRaised: '#332340',
      surfaceSoft: '#402C50',
      border: '#533C62',
      text: '#FCF5FF',
      textMuted: '#B7A3C0',
      textDim: '#86738F',
      accent: '#D9A5FF',
      accentDeep: '#A969D2',
      purple: '#C18CFF',
      purpleSoft: '#472B61',
      blue: '#8EC5FF',
      blueSoft: '#273853',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Deep green with soft leaf accents.',
    colors: {
      ...amberColors,
      background: '#07130D',
      backgroundRaised: '#0C1B13',
      surface: '#13261B',
      surfaceRaised: '#1C3527',
      surfaceSoft: '#244431',
      border: '#355A43',
      text: '#F3FAF4',
      textMuted: '#A2B9A8',
      textDim: '#718B78',
      accent: '#9DDB83',
      accentDeep: '#62A94B',
      purple: '#AE9CFF',
      purpleSoft: '#37345E',
      green: '#67D69D',
      greenSoft: '#17442E',
      blue: '#72CBE2',
      blueSoft: '#1A3E48',
    },
  },
];

export const THEME_STORAGE_KEY = '@next-volume/theme/v1';

function savedThemeId(): ThemePresetId {
  if (typeof window === 'undefined') return 'amber';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return themePresets.some((preset) => preset.id === stored) ? stored as ThemePresetId : 'amber';
}

export const activeThemeId = savedThemeId();
export const colors = themePresets.find((preset) => preset.id === activeThemeId)?.colors ?? amberColors;

export function applyDocumentTheme(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.backgroundColor = colors.background;
  document.body.style.backgroundColor = colors.background;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.background);
}

export function selectThemePreset(id: ThemePresetId): void {
  if (typeof window === 'undefined' || id === activeThemeId) return;
  window.localStorage.setItem(THEME_STORAGE_KEY, id);
  window.location.reload();
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  round: 999,
};

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
};
