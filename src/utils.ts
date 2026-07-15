import { LibraryTitle, MediaKind, ReadingStatus } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function briefDescription(value?: string, maximum = 480): string | undefined {
  const clean = value
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return undefined;
  if (clean.length <= maximum) return clean;

  const excerpt = clean.slice(0, maximum + 1);
  const sentenceEnd = Math.max(
    excerpt.lastIndexOf('. '),
    excerpt.lastIndexOf('! '),
    excerpt.lastIndexOf('? '),
  );
  if (sentenceEnd >= Math.floor(maximum * 0.55)) {
    return excerpt.slice(0, sentenceEnd + 1).trim();
  }

  const wordEnd = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, wordEnd > 0 ? wordEnd : maximum).trim()}…`;
}

export function rangeThrough(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => index + 1);
}

export function parseVolumeSelection(value: string, maximum: number): number[] {
  const max = Math.max(0, Math.floor(maximum));
  const selected = new Set<number>();
  const tokens = value.replace(/\s*[-–]\s*/g, '-').split(/[,\s]+/).filter(Boolean);

  tokens.forEach((token) => {
    const rangeMatch = token.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const first = Number(rangeMatch[1]);
      const second = Number(rangeMatch[2]);
      const start = Math.max(1, Math.min(first, second));
      const end = Math.min(max, Math.max(first, second));
      for (let volume = start; volume <= end; volume += 1) selected.add(volume);
      return;
    }

    const volume = Number(token);
    if (Number.isInteger(volume) && volume >= 1 && volume <= max) selected.add(volume);
  });

  return [...selected].sort((a, b) => a - b);
}

export function formatVolumeSelection(volumes: number[]): string {
  const sorted = [...new Set(volumes)].sort((a, b) => a - b);
  const ranges: string[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const start = sorted[index];
    if (start === undefined) continue;
    let end = start;
    while (sorted[index + 1] === end + 1) {
      index += 1;
      end = sorted[index] ?? end;
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`);
  }

  return ranges.join(', ');
}

export function ownedVolumeNumbersOf(title: LibraryTitle): number[] {
  if (Array.isArray(title.ownedVolumeNumbers)) {
    return [...new Set(title.ownedVolumeNumbers)]
      .filter((volume) => Number.isInteger(volume) && volume >= 1 && volume <= title.totalVolumes)
      .sort((a, b) => a - b);
  }
  return rangeThrough(title.ownedVolumes);
}

export function ownedVolumeCount(title: LibraryTitle): number {
  return ownedVolumeNumbersOf(title).length;
}

export function onlineReadVolumesOf(title: LibraryTitle): number[] {
  return [...new Set(title.onlineReadVolumes ?? [])]
    .filter((volume) => Number.isInteger(volume) && volume >= 1 && volume <= title.totalVolumes)
    .sort((a, b) => a - b);
}

export function allReadVolumeNumbersOf(title: LibraryTitle): number[] {
  return [...new Set([...title.readVolumes, ...onlineReadVolumesOf(title)])]
    .filter((volume) => Number.isInteger(volume) && volume >= 1 && volume <= title.totalVolumes)
    .sort((a, b) => a - b);
}

export function totalReadCount(title: LibraryTitle): number {
  return allReadVolumeNumbersOf(title).length;
}

export function isCompletedOnline(title: LibraryTitle): boolean {
  return onlineReadVolumesOf(title).length > 0 && totalReadCount(title) >= title.totalVolumes;
}

export function unownedReadVolumes(readVolumes: number[], ownedVolumes: number[]): number[] {
  const owned = new Set(ownedVolumes);
  return [...new Set(readVolumes)].filter((volume) => !owned.has(volume)).sort((a, b) => a - b);
}

export function ensureReadVolumesOwned(
  ownedVolumes: number[],
  readVolumes: number[],
  maximum: number,
): number[] {
  return [...new Set([...ownedVolumes, ...readVolumes])]
    .filter((volume) => Number.isInteger(volume) && volume >= 1 && volume <= maximum)
    .sort((a, b) => a - b);
}

export function progressOf(title: LibraryTitle): number {
  if (title.totalVolumes <= 0) return 0;
  return clamp(totalReadCount(title) / title.totalVolumes, 0, 1);
}

export function ownedReadCount(title: LibraryTitle): number {
  const read = new Set(title.readVolumes);
  return ownedVolumeNumbersOf(title).filter((volume) => read.has(volume)).length;
}

export function ownedProgressOf(title: LibraryTitle): number {
  const owned = ownedVolumeCount(title);
  if (owned <= 0) return 0;
  return clamp(ownedReadCount(title) / owned, 0, 1);
}

export function nextUnreadVolume(title: LibraryTitle): number | undefined {
  const read = new Set(allReadVolumeNumbersOf(title));
  return rangeThrough(title.totalVolumes).find((volume) => !read.has(volume));
}

export function nextUnreadOwnedVolume(title: LibraryTitle): number | undefined {
  const read = new Set(title.readVolumes);
  return ownedVolumeNumbersOf(title).find((volume) => !read.has(volume));
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
