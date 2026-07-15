export type MediaKind = 'manga' | 'light-novel';
export type Edition = 'english' | 'original';
export type ReadingStatus = 'reading' | 'planned' | 'paused' | 'completed';
export type ShelfFilter = 'all' | MediaKind;
export type ShelfSort = 'recent' | 'title' | 'progress';

export interface ShelfPreferences {
  filter: ShelfFilter;
  sort: ShelfSort;
}

export interface CatalogResult {
  sourceId: string;
  title: string;
  alternativeTitle?: string;
  coverUrl?: string;
  kind: MediaKind;
  sourceType: string;
  originalVolumes?: number;
  publishing: boolean;
  statusLabel: string;
  score?: number;
  synopsis?: string;
  sourceUrl?: string;
}

export interface VolumeLookup {
  originalVolumes?: number;
  englishEstimate?: number;
  englishVolumeNumbers: number[];
  checkedAt: number;
}

export interface LibraryTitle {
  id: string;
  sourceId?: string;
  sourceUrl?: string;
  title: string;
  alternativeTitle?: string;
  description?: string;
  coverUrl?: string;
  kind: MediaKind;
  edition: Edition;
  ownedVolumes: number;
  ownedVolumeNumbers: number[];
  totalVolumes: number;
  onlineOriginalVolumes?: number;
  onlineEnglishVolumes?: number;
  publishing?: boolean;
  readVolumes: number[];
  onlineReadVolumes: number[];
  readDates: Record<string, number>;
  status: ReadingStatus;
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;
}

export interface LibrarySnapshot {
  version: 3;
  titles: LibraryTitle[];
}

export type TitleDraft = Omit<LibraryTitle, 'id' | 'createdAt' | 'updatedAt'>;
