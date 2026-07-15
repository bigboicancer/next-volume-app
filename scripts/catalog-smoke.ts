import {
  extractVolumeNumbersFromTitle,
  isLikelySameSeries,
  normaliseSeriesTitle,
  searchCatalog,
} from '../src/services/catalog';

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
