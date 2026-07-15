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

async function expectSearchFallback() {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.includes('api.jikan.moe')) {
      return new Response(JSON.stringify({ message: 'Gateway timeout' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
    expectEqual(requestedUrls.length, 2, 'fallback request count');
    expectEqual(results[0]?.sourceId, 'kitsu:42', 'fallback source id');
    expectEqual(results[0]?.kind, 'light-novel', 'fallback media kind');
    expectEqual(results[0]?.originalVolumes, 24, 'fallback volume count');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

expectSearchFallback()
  .then(() => console.log('Catalog parser and provider-fallback smoke tests passed.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
