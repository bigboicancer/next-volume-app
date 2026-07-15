import AsyncStorage from '@react-native-async-storage/async-storage';

import { LibrarySnapshot, LibraryTitle } from './types';

const STORAGE_KEY = '@next-volume/library/v1';
export const INSTALL_PROMPT_DISMISSED_KEY = '@next-volume/install-prompt-dismissed/v1';

function sanitiseTitle(value: LibraryTitle): LibraryTitle {
  const totalVolumes = Math.max(1, Math.floor(Number(value.totalVolumes) || 1));
  const readVolumes = [...new Set(value.readVolumes ?? [])]
    .map(Number)
    .filter((volume) => Number.isInteger(volume) && volume > 0 && volume <= totalVolumes)
    .sort((a, b) => a - b);

  return {
    ...value,
    totalVolumes,
    readVolumes,
    readDates: value.readDates ?? {},
  };
}

export async function loadLibrary(): Promise<LibraryTitle[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const snapshot = JSON.parse(raw) as LibrarySnapshot;
    if (snapshot.version !== 1 || !Array.isArray(snapshot.titles)) return [];
    return snapshot.titles.map(sanitiseTitle);
  } catch {
    return [];
  }
}

export async function saveLibrary(titles: LibraryTitle[]): Promise<void> {
  const snapshot: LibrarySnapshot = {
    version: 1,
    titles,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export async function clearAllSavedData(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY, INSTALL_PROMPT_DISMISSED_KEY]);
}
