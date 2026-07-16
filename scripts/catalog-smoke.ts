import {
  extractVolumeNumbersFromTitle,
  isLikelySameSeries,
  normaliseSeriesTitle,
  searchCatalog,
} from '../src/services/catalog';
import { createPortableBackup, parsePortableBackup } from '../src/backup';
import { LibraryTitle } from '../src/types';
import {
  briefDescription,
  ensureReadVolumesOwned,
  formatVolumeSelection,
  ownedProgressOf,
  ownedReadCount,
  parseVolumeSelection,
  statusAfterProgress,
  unownedReadVolumes,
  isCompletedOnline,
  totalReadCount,
  nextUnreadUnownedVolume,
} from '../src/utils';

function expectEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

expectEqual(extractVolumeNumbersFromTitle('One-Punch Man, Vol. 33'), [33], 'vol parser');
expectEqual(extractVolumeNumbersFromTitle('Bleach 3-in-1 Edition, Vol. 25'), [25], 'omnibus parser');
expectEqual(
  extractVolumeNumbersFromTitle('Spice and Wolf, Volume 12 (light novel)'),
  [12],
  'light-novel parser',
);
expectEqual(isLikelySameSeries('One-Punch Man', 'One-Punch Man, Vol. 33'), true, 'same title');
expectEqual(isLikelySameSeries('Bleach', 'Black Clover, Vol. 12'), false, 'different title');
expectEqual(
  normaliseSeriesTitle('Frieren: Beyond Journey’s End, Vol. 14'),
  'frieren beyond journey s end',
  'title normalisation',
);
expectEqual(
  statusAfterProgress(6, 23, 'completed'),
  'reading',
  'owned volumes do not complete a longer series',
);
const ownedShelfFixture = {
  ownedVolumes: 3,
  ownedVolumeNumbers: [1, 3, 7],
  totalVolumes: 23,
  readVolumes: [1, 2, 3, 7],
} as LibraryTitle;
expectEqual(ownedReadCount(ownedShelfFixture), 3, 'unowned read volumes excluded from shelf stats');
expectEqual(ownedProgressOf(ownedShelfFixture), 1, 'owned shelf progress');
const randomVolumes = [1, 2, 3, 7, 12, 13, 14];
expectEqual(
  parseVolumeSelection('1-3, 7, 12-14', 23),
  randomVolumes,
  'random owned-volume ranges',
);
expectEqual(formatVolumeSelection(randomVolumes), '1-3, 7, 12-14', 'owned-volume formatting');
expectEqual(
  unownedReadVolumes([1, 2, 5], [1, 5]),
  [2],
  'unowned read-volume detection',
);
expectEqual(
  ensureReadVolumesOwned([1, 5], [1, 2, 5], 10),
  [1, 2, 5],
  'older read volumes migrate to owned',
);
expectEqual(
  briefDescription('  <p>A hero   begins.</p>\nA new journey follows.  '),
  'A hero begins. A new journey follows.',
  'description cleanup',
);
expectEqual(
  briefDescription('A complete first sentence. A much longer second sentence carries on.', 35),
  'A complete first sentence.',
  'description shortening',
);
const backupFixture: LibraryTitle = {
  id: 'backup-test',
  title: 'Backup Test',
  coverUrl: 'data:image/jpeg;base64,dGVzdA==',
  kind: 'manga',
  edition: 'english',
  ownedVolumes: 2,
  ownedVolumeNumbers: [1, 3],
  totalVolumes: 3,
  readVolumes: [1],
  onlineReadVolumes: [2],
  readDates: { '1': 1_700_000_000_000 },
  status: 'reading',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};
const restoredBackup = parsePortableBackup(
  createPortableBackup([backupFixture], new Date('2026-01-01T00:00:00.000Z')),
);
expectEqual(restoredBackup[0]?.title, 'Backup Test', 'backup title restore');
expectEqual(restoredBackup[0]?.ownedVolumeNumbers, [1, 3], 'backup ownership restore');
expectEqual(restoredBackup[0]?.readVolumes, [1], 'backup progress restore');
expectEqual(restoredBackup[0]?.onlineReadVolumes, [2], 'backup online progress restore');
expectEqual(restoredBackup[0]?.coverUrl, backupFixture.coverUrl, 'uploaded cover backup restore');
expectEqual(totalReadCount(backupFixture), 2, 'online reads count toward total progress');
expectEqual(nextUnreadUnownedVolume(backupFixture), undefined, 'owned gaps excluded from online next');
expectEqual(
  nextUnreadUnownedVolume({ ...backupFixture, totalVolumes: 5 }),
  4,
  'next unread unowned volume',
);
expectEqual(
  isCompletedOnline({ ...backupFixture, onlineReadVolumes: [2, 3] }),
  true,
  'online completion detection',
);

async function expectProviderResilience() {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    return new Response(
      JSON.stringify({
        data: [
          {
            id: '42',
            attributes: {
              canonicalTitle: 'Spice and Wolf',
              titles: { en: 'Spice and Wolf', ja_jp: '狼と香辛料' },
              subtype: 'novel',
              volumeCount: 24,
              status: 'finished',
              averageRating: '84.5',
              posterImage: { large: 'https://media.kitsu.app/example.jpeg' },
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/vnd.api+json' } },
    );
  };

  try {
    const results = await searchCatalog('Spice and Wolf', 'light-novel');
    expectEqual(requestedUrls.length, 1, 'healthy-provider request count');
    expectEqual(results[0]?.sourceId, 'kitsu:42', 'primary source id');
    expectEqual(results[0]?.kind, 'light-novel', 'primary media kind');
    expectEqual(results[0]?.originalVolumes, 24, 'primary volume count');

    requestedUrls.length = 0;
    globalThis.fetch = async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes('kitsu.io')) {
        return new Response(JSON.stringify({ errors: [{ detail: 'Unavailable' }] }), {
          status: 503,
          headers: { 'Content-Type': 'application/vnd.api+json' },
        });
      }
      return new Response(
        JSON.stringify({
          data: [
            {
              mal_id: 123,
              title: 'Ookami to Koushinryou',
              title_english: 'Spice and Wolf',
              type: 'Light Novel',
              volumes: 24,
              publishing: false,
              status: 'Finished',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const fallbackResults = await searchCatalog('Spice and Wolf', 'light-novel');
    expectEqual(requestedUrls.length, 2, 'backup-provider request count');
    expectEqual(fallbackResults[0]?.sourceId, '123', 'backup source id');
    expectEqual(fallbackResults[0]?.kind, 'light-novel', 'backup media kind');
    expectEqual(fallbackResults[0]?.originalVolumes, 24, 'backup volume count');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

expectProviderResilience()
  .then(() => console.log('Catalog parser and provider-fallback smoke tests passed.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
