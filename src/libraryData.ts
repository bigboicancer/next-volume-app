import { LibraryTitle } from './types';
import {
  briefDescription,
  clamp,
  ensureReadVolumesOwned,
  rangeThrough,
  statusAfterProgress,
} from './utils';

const kinds = new Set(['manga', 'light-novel']);
const editions = new Set(['english', 'original']);
const statuses = new Set(['reading', 'planned', 'paused', 'completed']);

export function sanitiseLibraryTitle(input: unknown): LibraryTitle {
  if (!input || typeof input !== 'object') throw new Error('A title entry is not valid.');
  const value = input as LibraryTitle;
  if (typeof value.id !== 'string' || !value.id.trim()) throw new Error('A title is missing its ID.');
  if (typeof value.title !== 'string' || !value.title.trim()) throw new Error('A title is missing its name.');
  if (!kinds.has(value.kind)) throw new Error(`${value.title} has an unsupported type.`);
  if (!editions.has(value.edition)) throw new Error(`${value.title} has an unsupported edition.`);

  const previousTotal = Math.max(1, Math.floor(Number(value.totalVolumes) || 1));
  const onlineEditionTotal =
    value.edition === 'original'
      ? Number(value.onlineOriginalVolumes) || 0
      : Number(value.onlineEnglishVolumes) || Number(value.onlineOriginalVolumes) || 0;
  const hasSavedOwnership = Number.isFinite(Number(value.ownedVolumes));
  const totalVolumes = Math.max(previousTotal, hasSavedOwnership ? 0 : Math.floor(onlineEditionTotal));
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
  const savedReadVolumes = [...new Set(Array.isArray(value.readVolumes) ? value.readVolumes : [])]
    .map(Number)
    .filter((volume) => Number.isInteger(volume) && volume > 0 && volume <= totalVolumes)
    .sort((a, b) => a - b);
  const savedOnlineReadVolumes = [
    ...new Set(Array.isArray(value.onlineReadVolumes) ? value.onlineReadVolumes : []),
  ]
    .map(Number)
    .filter((volume) => Number.isInteger(volume) && volume > 0 && volume <= totalVolumes)
    .sort((a, b) => a - b);
  const initiallyOwned = ensureReadVolumesOwned(
    savedOwnedVolumeNumbers,
    savedReadVolumes,
    totalVolumes,
  );
  const initiallyOwnedSet = new Set(initiallyOwned);
  const movedOnlineReads = savedOnlineReadVolumes.filter((volume) => initiallyOwnedSet.has(volume));
  const readVolumes = [...new Set([...savedReadVolumes, ...movedOnlineReads])].sort((a, b) => a - b);
  const ownedVolumeNumbers = ensureReadVolumesOwned(initiallyOwned, readVolumes, totalVolumes);
  const ownedSet = new Set(ownedVolumeNumbers);
  const onlineReadVolumes = savedOnlineReadVolumes.filter((volume) => !ownedSet.has(volume));
  const readDates = Object.fromEntries(
    Object.entries(value.readDates && typeof value.readDates === 'object' ? value.readDates : {})
      .filter(([volume, timestamp]) => /^\d+$/.test(volume) && Number.isFinite(Number(timestamp)))
      .map(([volume, timestamp]) => [volume, Number(timestamp)]),
  );
  const previousStatus = statuses.has(value.status)
    ? value.status
    : readVolumes.length + onlineReadVolumes.length
      ? 'reading'
      : 'planned';

  return {
    ...value,
    title: value.title.trim(),
    description: briefDescription(value.description, 600),
    ownedVolumes: ownedVolumeNumbers.length,
    ownedVolumeNumbers,
    totalVolumes,
    readVolumes,
    onlineReadVolumes,
    readDates,
    status: statusAfterProgress(
      new Set([...readVolumes, ...onlineReadVolumes]).size,
      totalVolumes,
      previousStatus,
    ),
    createdAt: Number.isFinite(Number(value.createdAt)) ? Number(value.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : Date.now(),
  };
}

export function sanitiseLibraryTitles(values: unknown[]): LibraryTitle[] {
  return values.map(sanitiseLibraryTitle);
}
