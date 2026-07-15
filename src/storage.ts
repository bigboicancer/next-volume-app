import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitiseLibraryTitles } from './libraryData';
import { LibrarySnapshot, LibraryTitle, ShelfPreferences } from './types';

const STORAGE_KEY = '@next-volume/library/v1';
const SHELF_PREFERENCES_KEY = '@next-volume/shelf-preferences/v1';
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

export async function loadShelfPreferences(): Promise<ShelfPreferences> {
  const fallback: ShelfPreferences = { filter: 'all', sort: 'recent' };
  const raw = await AsyncStorage.getItem(SHELF_PREFERENCES_KEY);
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as Partial<ShelfPreferences>;
    const filter = ['all', 'manga', 'light-novel'].includes(String(value.filter))
      ? value.filter as ShelfPreferences['filter']
      : fallback.filter;
    const sort = ['recent', 'title', 'progress'].includes(String(value.sort))
      ? value.sort as ShelfPreferences['sort']
      : fallback.sort;
    return { filter, sort };
  } catch {
    return fallback;
  }
}

export async function saveShelfPreferences(preferences: ShelfPreferences): Promise<void> {
  await AsyncStorage.setItem(SHELF_PREFERENCES_KEY, JSON.stringify(preferences));
}

export async function clearAllSavedData(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEY,
    SHELF_PREFERENCES_KEY,
    INSTALL_PROMPT_DISMISSED_KEY,
  ]);
}
