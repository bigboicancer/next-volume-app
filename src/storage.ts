import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitiseLibraryTitles } from './libraryData';
import { LibrarySnapshot, LibraryTitle } from './types';

const STORAGE_KEY = '@next-volume/library/v1';
export const INSTALL_PROMPT_DISMISSED_KEY = '@next-volume/install-prompt-dismissed/v1';

export async function loadLibrary(): Promise<LibraryTitle[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const snapshot = JSON.parse(raw) as LibrarySnapshot;
    if (![1, 2, 3].includes(Number(snapshot.version)) || !Array.isArray(snapshot.titles)) return [];
    return sanitiseLibraryTitles(snapshot.titles);
  } catch {
    return [];
  }
}

export async function saveLibrary(titles: LibraryTitle[]): Promise<void> {
  const snapshot: LibrarySnapshot = {
    version: 3,
    titles,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export async function clearAllSavedData(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY, INSTALL_PROMPT_DISMISSED_KEY]);
}
