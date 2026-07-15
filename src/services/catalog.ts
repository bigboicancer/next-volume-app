import { CatalogResult, MediaKind, VolumeLookup } from '../types';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const KITSU_BASE = 'https://kitsu.io/api/edge';
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

interface KitsuManga {
  id: string;
  attributes?: {
    canonicalTitle?: string | null;
    titles?: {
      en?: string | null;
      en_jp?: string | null;
      en_us?: string | null;
      ja_jp?: string | null;
    };
    subtype?: string | null;
    volumeCount?: number | null;
    status?: string | null;
    averageRating?: string | null;
    synopsis?: string | null;
    posterImage?: {
      original?: string | null;
      large?: string | null;
      medium?: string | null;
      small?: string | null;
    };
  };
}

interface KitsuSearchResponse {
  data?: KitsuManga[];
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

function wasUserAbort(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 7_000,
): Promise<Response> {
  const controller = new AbortController();
  const sourceSignal = init.signal;
  const forwardAbort = () => controller.abort();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (sourceSignal?.aborted) {
    controller.abort();
  } else {
    sourceSignal?.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    sourceSignal?.removeEventListener('abort', forwardAbort);
  }
}

function jikanResults(payload: JikanSearchResponse): CatalogResult[] {
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

function kitsuStatus(status?: string | null): string {
  switch (status) {
    case 'current':
      return 'Publishing';
    case 'finished':
      return 'Finished';
    case 'upcoming':
    case 'unreleased':
      return 'Not yet published';
    case 'tba':
      return 'To be announced';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }
}

function kitsuSourceType(subtype?: string | null): string {
  if (subtype === 'novel') return 'Light Novel';
  if (!subtype) return 'Manga';
  return subtype.charAt(0).toUpperCase() + subtype.slice(1);
}

function kitsuResult(item: KitsuManga): CatalogResult | undefined {
  const attributes = item.attributes;
  if (!attributes) return undefined;

  const titles = attributes.titles;
  const title =
    titles?.en_us ||
    titles?.en ||
    attributes.canonicalTitle ||
    titles?.en_jp ||
    titles?.ja_jp;
  if (!title) return undefined;

  const alternativeTitle = [titles?.en_jp, titles?.ja_jp, attributes.canonicalTitle].find(
    (candidate) => candidate && candidate !== title,
  );
  const rating = Number(attributes.averageRating);

  return {
    sourceId: `kitsu:${item.id}`,
    title,
    alternativeTitle: alternativeTitle || undefined,
    coverUrl:
      attributes.posterImage?.large ||
      attributes.posterImage?.original ||
      attributes.posterImage?.medium ||
      attributes.posterImage?.small ||
      undefined,
    kind: attributes.subtype === 'novel' ? 'light-novel' : 'manga',
    sourceType: kitsuSourceType(attributes.subtype),
    originalVolumes: attributes.volumeCount || undefined,
    publishing: attributes.status === 'current',
    statusLabel: kitsuStatus(attributes.status),
    score: Number.isFinite(rating) ? rating / 10 : undefined,
    synopsis: attributes.synopsis || undefined,
    sourceUrl: `https://kitsu.app/manga/${item.id}`,
  };
}

async function searchKitsu(
  query: string,
  filter: 'all' | MediaKind,
  signal?: AbortSignal,
): Promise<CatalogResult[]> {
  const subtype =
    filter === 'light-novel'
      ? '&filter%5Bsubtype%5D=novel'
      : filter === 'manga'
        ? '&filter%5Bsubtype%5D=manga'
        : '';
  const url = `${KITSU_BASE}/manga?filter%5Btext%5D=${encodeURIComponent(query)}${subtype}&page%5Blimit%5D=14`;
  const response = await fetchWithTimeout(
    url,
    { headers: { Accept: 'application/vnd.api+json' }, signal },
    8_000,
  );
  if (!response.ok) throw new Error(`Kitsu search returned ${response.status}.`);

  const payload = (await response.json()) as KitsuSearchResponse;
  return (payload.data ?? [])
    .map(kitsuResult)
    .filter((item): item is CatalogResult => Boolean(item));
}

export async function searchCatalog(
  query: string,
  filter: 'all' | MediaKind = 'all',
  signal?: AbortSignal,
): Promise<CatalogResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const url = `${JIKAN_BASE}/manga?q=${encodeURIComponent(cleanQuery)}&limit=14&order_by=popularity&sort=asc${requestType(filter)}`;
  let primaryResults: CatalogResult[] | undefined;
  let primaryWasBusy = false;

  try {
    const response = await fetchWithTimeout(url, { signal });
    if (response.ok) {
      primaryResults = jikanResults((await response.json()) as JikanSearchResponse);
      if (primaryResults.length) return primaryResults;
    } else {
      primaryWasBusy = response.status === 429;
    }
  } catch (error) {
    if (wasUserAbort(signal)) throw error;
  }

  try {
    const fallbackResults = await searchKitsu(cleanQuery, filter, signal);
    return fallbackResults.length ? fallbackResults : primaryResults ?? [];
  } catch (error) {
    if (wasUserAbort(signal)) throw error;
    if (primaryResults) return primaryResults;
    if (primaryWasBusy) {
      throw new Error('The book catalogues are busy. Wait a few seconds and try again.');
    }
    throw new Error('Online search is unavailable right now. Check your connection and try again.');
  }
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
  } else if (title.sourceId?.startsWith('kitsu:')) {
    try {
      const id = title.sourceId.slice('kitsu:'.length);
      const response = await fetchWithTimeout(`${KITSU_BASE}/manga/${encodeURIComponent(id)}`);
      if (response.ok) {
        const payload = (await response.json()) as { data?: KitsuManga };
        originalVolumes = payload.data?.attributes?.volumeCount || originalVolumes;
      }
    } catch {
      // The book-index lookup below can still provide a useful result.
    }
  }

  return lookupVolumeCounts({ title: title.title, originalVolumes });
}
