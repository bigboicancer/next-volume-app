import { LibraryTitle, MediaKind, ReadingStatus } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function rangeThrough(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => index + 1);
}

export function progressOf(title: LibraryTitle): number {
  if (title.totalVolumes <= 0) return 0;
  return clamp(title.readVolumes.length / title.totalVolumes, 0, 1);
}

export function nextUnreadVolume(title: LibraryTitle): number | undefined {
  const read = new Set(title.readVolumes);
  return rangeThrough(title.totalVolumes).find((volume) => !read.has(volume));
}

export function statusAfterProgress(
  readCount: number,
  totalVolumes: number,
  previous: ReadingStatus,
): ReadingStatus {
  if (totalVolumes > 0 && readCount >= totalVolumes) return 'completed';
  if (previous === 'completed') return readCount > 0 ? 'reading' : 'planned';
  if (previous === 'planned' && readCount > 0) return 'reading';
  return previous;
}

export function kindLabel(kind: MediaKind, plural = false): string {
  if (kind === 'light-novel') return plural ? 'Light novels' : 'Light novel';
  return 'Manga';
}

export function statusLabel(status: ReadingStatus): string {
  switch (status) {
    case 'reading':
      return 'Reading';
    case 'planned':
      return 'Plan to read';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
  }
}

export function formatShortDate(timestamp?: number): string {
  if (!timestamp) return 'Never';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
}

export function daysAgo(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / 86_400_000);
}

export function lastActivity(title: LibraryTitle): number {
  const dates = Object.values(title.readDates);
  return dates.length ? Math.max(...dates) : title.updatedAt;
}
