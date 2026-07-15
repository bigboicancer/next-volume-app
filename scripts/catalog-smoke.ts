import {
  extractVolumeNumbersFromTitle,
  isLikelySameSeries,
  normaliseSeriesTitle,
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

console.log('Catalog parser smoke tests passed.');
