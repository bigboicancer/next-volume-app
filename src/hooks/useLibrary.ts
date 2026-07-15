import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { clearAllSavedData, loadLibrary, saveLibrary } from '../storage';
import { LibraryTitle, TitleDraft } from '../types';
import { makeId, rangeThrough, statusAfterProgress } from '../utils';

export function useLibrary() {
  const [titles, setTitles] = useState<LibraryTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    loadLibrary()
      .then((stored) => {
        if (active) setTitles(stored);
      })
      .finally(() => {
        hydrated.current = true;
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void saveLibrary(titles);
  }, [titles]);

  const addTitle = useCallback((draft: TitleDraft) => {
    const now = Date.now();
    const item: LibraryTitle = {
      ...draft,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    };
    setTitles((current) => [item, ...current]);
    return item.id;
  }, []);

  const updateTitle = useCallback((id: string, update: Partial<LibraryTitle>) => {
    setTitles((current) =>
      current.map((title) => {
        if (title.id !== id) return title;
        const nextTotal = Math.max(1, Math.floor(update.totalVolumes ?? title.totalVolumes));
        const requestedOwned = update.ownedVolumeNumbers ??
          (update.ownedVolumes !== undefined
            ? rangeThrough(Math.max(0, Math.floor(update.ownedVolumes)))
            : title.ownedVolumeNumbers);
        const nextOwnedNumbers = [...new Set(requestedOwned)]
          .filter((volume) => Number.isInteger(volume) && volume >= 1 && volume <= nextTotal)
          .sort((a, b) => a - b);
        const nextRead = (update.readVolumes ?? title.readVolumes)
          .filter((volume) => volume <= nextTotal)
          .sort((a, b) => a - b);
        return {
          ...title,
          ...update,
          ownedVolumes: nextOwnedNumbers.length,
          ownedVolumeNumbers: nextOwnedNumbers,
          totalVolumes: nextTotal,
          readVolumes: nextRead,
          status: statusAfterProgress(nextRead.length, nextTotal, update.status ?? title.status),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const toggleVolume = useCallback((id: string, volume: number) => {
    setTitles((current) =>
      current.map((title) => {
        if (title.id !== id || volume < 1 || volume > title.totalVolumes) return title;
        const exists = title.readVolumes.includes(volume);
        const readVolumes = exists
          ? title.readVolumes.filter((item) => item !== volume)
          : [...title.readVolumes, volume].sort((a, b) => a - b);
        const readDates = { ...title.readDates };
        if (exists) delete readDates[String(volume)];
        else readDates[String(volume)] = Date.now();

        return {
          ...title,
          readVolumes,
          readDates,
          status: statusAfterProgress(readVolumes.length, title.totalVolumes, title.status),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const toggleOwnedVolume = useCallback((id: string, volume: number) => {
    setTitles((current) =>
      current.map((title) => {
        if (title.id !== id || volume < 1 || volume > title.totalVolumes) return title;
        const exists = title.ownedVolumeNumbers.includes(volume);
        const ownedVolumeNumbers = exists
          ? title.ownedVolumeNumbers.filter((item) => item !== volume)
          : [...title.ownedVolumeNumbers, volume].sort((a, b) => a - b);
        return {
          ...title,
          ownedVolumes: ownedVolumeNumbers.length,
          ownedVolumeNumbers,
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const removeTitle = useCallback((id: string) => {
    setTitles((current) => current.filter((title) => title.id !== id));
  }, []);

  const eraseAllData = useCallback(async () => {
    await clearAllSavedData();
    setTitles([]);
  }, []);

  const byId = useMemo(
    () => new Map(titles.map((title) => [title.id, title])),
    [titles],
  );

  return {
    titles,
    loading,
    addTitle,
    updateTitle,
    toggleVolume,
    toggleOwnedVolume,
    removeTitle,
    eraseAllData,
    getTitle: (id: string) => byId.get(id),
  };
}
