import AsyncStorage from '@react-native-async-storage/async-storage';

import { LibrarySnapshot, LibraryTitle } from './types';
import {
  briefDescription,
  clamp,
  ensureReadVolumesOwned,
  rangeThrough,
  statusAfterProgress,
} from './utils';

const STORAGE_KEY = '@next-volume/library/v1';
export const INSTALL_PROMPT_DISMISSED_KEY = '@next-volume/install-prompt-dismissed/v1';

function sanitiseTitle(value: LibraryTitle): LibraryTitle {
  const previousTotal = Math.max(1, Math.floor(Number(value.totalVolumes) || 1));
  const onlineEditionTotal =
    value.edition === 'original'
      ? Number(value.onlineOriginalVolumes) || 0
      : Number(value.onlineEnglishVolumes) || Number(value.onlineOriginalVolumes) || 0;
  const hasSavedOwnership = Number.isFinite(Number(value.ownedVolumes));
  const totalVolumes = Math.max(
    previousTotal,
    hasSavedOwnership ? 0 : Math.floor(onlineEditionTotal),
  );
  const migratedOwnedCount = clamp(
    Math.floor(hasSavedOwnership ? Number(value.ownedVolumes) : previousTotal),
    0,
    totalVolumes,
  );
  const savedOwnedVolumeNumbers = [
    ...new Set(
      Array.isArray(value.ownedVolumeNumbers)
        ? value.ownedVolumeNumbers.map(Number)
        : rangeThrough(migratedOwnedCount),
    ),
  ]
    .filter((volume) => Number.isInteger(volume) && volume >= 1 && volume <= totalVolumes)
    .sort((a, b) => a - b);
  const readVolumes = [...new Set(value.readVolumes ?? [])]
    .map(Number)
    .filter((volume) => Number.isInteger(volume) && volume > 0 && volume <= totalVolumes)
    .sort((a, b) => a - b);
  const ownedVolumeNumbers = ensureReadVolumesOwned(
    savedOwnedVolumeNumbers,
    readVolumes,
    totalVolumes,
  );

  return {
    ...value,
    description: briefDescription(value.description, 600),
    ownedVolumes: ownedVolumeNumbers.length,
    ownedVolumeNumbers,
    totalVolumes,
    readVolumes,
    readDates: value.readDates ?? {},
    status: statusAfterProgress(
      readVolumes.length,
      totalVolumes,
      value.status ?? (readVolumes.length ? 'reading' : 'planned'),
    ),
  };
}

export async function loadLibrary(): Promise<LibraryTitle[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const snapshot = JSON.parse(raw) as LibrarySnapshot;
    if (![1, 2, 3].includes(Number(snapshot.version)) || !Array.isArray(snapshot.titles)) return [];
    return snapshot.titles.map(sanitiseTitle);
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
