import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { loadLibrary, saveLibrary } from '../storage';
import { LibraryTitle, TitleDraft } from '../types';
import { makeId, statusAfterProgress } from '../utils';

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
        const nextRead = (update.readVolumes ?? title.readVolumes)
          .filter((volume) => volume <= nextTotal)
          .sort((a, b) => a - b);
        return {
          ...title,
          ...update,
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

  const removeTitle = useCallback((id: string) => {
    setTitles((current) => current.filter((title) => title.id !== id));
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
    removeTitle,
    getTitle: (id: string) => byId.get(id),
  };
}
