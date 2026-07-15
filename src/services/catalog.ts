import { CatalogResult, MediaKind, VolumeLookup } from '../types';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_BASE = 'https://openlibrary.org/search.json';

interface JikanManga {
  mal_id: number;
  url?: string;
  title: string;
  title_english?: string | null;
  type?: string | null;
  volumes?: number | null;
  publishing?: boolean;
  status?: string | null;
  score?: number | null;
  synopsis?: string | null;
  images?: {
    jpg?: {
      large_image_url?: string;
      image_url?: string;
    };
  };
}

interface JikanSearchResponse {
  data?: JikanManga[];
}

interface GoogleBookItem {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    language?: string;
    seriesInfo?: {
      bookDisplayNumber?: string;
      volumeSeries?: Array<{
        orderNumber?: number;
      }>;
    };
  };
}

interface GoogleBooksResponse {
  items?: GoogleBookItem[];
}

interface OpenLibraryResponse {
  docs?: Array<{
    title?: string;
    subtitle?: string;
  }>;
}

function mediaKind(type?: string | null): MediaKind {
  return type?.toLowerCase().includes('novel') ? 'light-novel' : 'manga';
}

function requestType(filter: 'all' | MediaKind): string {
  if (filter === 'light-novel') return '&type=lightnovel';
  if (filter === 'manga') return '&type=manga';
  return '';
}

export async function searchCatalog(
  query: string,
  filter: 'all' | MediaKind = 'all',
  signal?: AbortSignal,
): Promise<CatalogResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const url = `${JIKAN_BASE}/manga?q=${encodeURIComponent(cleanQuery)}&limit=14&order_by=popularity&sort=asc${requestType(filter)}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('The book search is busy. Wait a few seconds and try again.');
    }
    throw new Error('Online search is unavailable right now.');
  }

  const payload = (await response.json()) as JikanSearchResponse;
  return (payload.data ?? []).map((item) => ({
    sourceId: String(item.mal_id),
    title: item.title_english || item.title,
    alternativeTitle:
      item.title_english && item.title_english !== item.title ? item.title : undefined,
    coverUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
    kind: mediaKind(item.type),
    sourceType: item.type || 'Manga',
    originalVolumes: item.volumes || undefined,
    publishing: Boolean(item.publishing),
    statusLabel: item.status || (item.publishing ? 'Publishing' : 'Unknown'),
    score: item.score || undefined,
    synopsis: item.synopsis || undefined,
    sourceUrl: item.url,
  }));
}

export function normaliseSeriesTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*(edition|omnibus|box set)[^)]*\)/gi, ' ')
    .replace(/\b(?:vol(?:ume)?|book|novel)\.?\s*#?\s*\d{1,3}\b/gi, ' ')
    .replace(/\b(?:manga|light novel|novel)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function extractVolumeNumbersFromTitle(value: string): number[] {
  const numbers = new Set<number>();
  const patterns = [
    /\bvol(?:ume)?\.?\s*#?\s*(\d{1,3})\b/gi,
    /\bbook\s*#?\s*(\d{1,3})\b/gi,
    /\bnovel\s*#?\s*(\d{1,3})\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const parsed = Number(match[1]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 300) numbers.add(parsed);
    }
  }

  return [...numbers];
}

export function isLikelySameSeries(query: string, candidate: string): boolean {
  const queryWords = new Set(normaliseSeriesTitle(query).split(' ').filter(Boolean));
  const candidateWords = new Set(normaliseSeriesTitle(candidate).split(' ').filter(Boolean));
  if (!queryWords.size || !candidateWords.size) return false;

  let matches = 0;
  queryWords.forEach((word) => {
    if (candidateWords.has(word)) matches += 1;
  });

  return matches / queryWords.size >= 0.72;
}

function collectCandidateVolumes(
  query: string,
  titles: Array<string | undefined>,
): number[] {
  const volumes = new Set<number>();

  titles.filter(Boolean).forEach((candidate) => {
    if (!candidate || !isLikelySameSeries(query, candidate)) return;
    extractVolumeNumbersFromTitle(candidate).forEach((volume) => volumes.add(volume));
  });

  return [...volumes].sort((a, b) => a - b);
}

async function googleBookVolumes(title: string): Promise<number[]> {
  const query = encodeURIComponent(`intitle:${title} vol`);
  const starts = [0, 40, 80];
  const responses = await Promise.allSettled(
    starts.map(async (startIndex) => {
      const response = await fetch(
        `${GOOGLE_BOOKS_BASE}?q=${query}&maxResults=40&startIndex=${startIndex}&printType=books&langRestrict=en`,
      );
      if (!response.ok) return [];
      const payload = (await response.json()) as GoogleBooksResponse;
      return payload.items ?? [];
    }),
  );

  const items = responses.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
  const displayNumbers = items.flatMap((item) => {
    const candidate = [item.volumeInfo?.title, item.volumeInfo?.subtitle]
      .filter(Boolean)
      .join(' ');
    if (!isLikelySameSeries(title, candidate)) return [];

    const seriesInfo = item.volumeInfo?.seriesInfo;
    const sequence = seriesInfo?.volumeSeries
      ?.map((series) => series.orderNumber)
      .find((number) => Number.isInteger(number) && Number(number) > 0);
    const display = seriesInfo?.bookDisplayNumber;
    const value = sequence ?? (display ? Number(display.replace(/[^0-9]/g, '')) : Number.NaN);
    return Number.isInteger(value) && value > 0 && value <= 300 ? [value] : [];
  });
  const titles = items.flatMap((item) => [
    item.volumeInfo?.title,
    item.volumeInfo?.subtitle,
    [item.volumeInfo?.title, item.volumeInfo?.subtitle].filter(Boolean).join(' '),
  ]);

  return [...new Set([...collectCandidateVolumes(title, titles), ...displayNumbers])].sort(
    (a, b) => a - b,
  );
}

async function openLibraryVolumes(title: string): Promise<number[]> {
  const fields = encodeURIComponent('title,subtitle');
  const query = encodeURIComponent(`title:"${title}" AND language:eng`);
  const response = await fetch(
    `${OPEN_LIBRARY_BASE}?q=${query}&limit=100&fields=${fields}`,
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as OpenLibraryResponse;
  const titles = (payload.docs ?? []).flatMap((item) => [
    item.title,
    item.subtitle,
    [item.title, item.subtitle].filter(Boolean).join(' '),
  ]);
  return collectCandidateVolumes(title, titles);
}

export async function lookupVolumeCounts(
  result: Pick<CatalogResult, 'title' | 'originalVolumes'>,
): Promise<VolumeLookup> {
  const lookups = await Promise.allSettled([
    googleBookVolumes(result.title),
    openLibraryVolumes(result.title),
  ]);

  const englishNumbers = new Set<number>();
  lookups.forEach((lookup) => {
    if (lookup.status === 'fulfilled') {
      lookup.value.forEach((volume) => englishNumbers.add(volume));
    }
  });

  const englishVolumeNumbers = [...englishNumbers].sort((a, b) => a - b);
  return {
    originalVolumes: result.originalVolumes,
    englishEstimate: englishVolumeNumbers.length
      ? Math.max(...englishVolumeNumbers)
      : undefined,
    englishVolumeNumbers,
    checkedAt: Date.now(),
  };
}

export async function refreshVolumeCounts(
  title: Pick<
    CatalogResult,
    'sourceId' | 'title' | 'originalVolumes' | 'kind' | 'sourceType' | 'publishing' | 'statusLabel'
  >,
): Promise<VolumeLookup> {
  let originalVolumes = title.originalVolumes;

  if (title.sourceId && /^\d+$/.test(title.sourceId)) {
    try {
      const response = await fetch(`${JIKAN_BASE}/manga/${title.sourceId}/full`);
      if (response.ok) {
        const payload = (await response.json()) as { data?: JikanManga };
        originalVolumes = payload.data?.volumes || originalVolumes;
      }
    } catch {
      // The book-index lookup below can still provide a useful result.
    }
  }

  return lookupVolumeCounts({ title: title.title, originalVolumes });
}
