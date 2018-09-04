import { find } from 'lodash';

export const Scales = [
  {
    key: 'towerstone',
    title: 'TowerStone Leadership Centre',
    entries: [
      { rating: 0, description: 'Not to my knowledge (have not seen this behaviour displayed).' },
      { rating: 1, description: 'Seldom (displays this behaviour every now and then)' },
      { rating: 2, description: 'Some of the time (making some effort to adopt this behaviour).' },
      { rating: 3, description: 'Inconsistently (displays this behaviour, but deviates under pressure).' },
      { rating: 4, description: 'Most of the time (displays this behaviour regularly, but not yet consistent).' },
      { rating: 5, description: 'Consistently (displays this behaviour regardless of the circumstances).' },
    ],
  },
  {
    key: 'plc',
    title: 'Purposeful Leadership Company Scale',
    entries: [
      { rating: 0, description: 'Not to my knowledge (have not seen this behaviour displayed).' },
      { rating: 1, description: 'Seldom (displays this behaviour every now and then)' },
      { rating: 2, description: 'Some of the time (making some effort to adopt this behaviour).' },
      { rating: 3, description: 'Inconsistently (displays this behaviour, but deviates under pressure).' },
      { rating: 4, description: 'Most of the time (displays this behaviour regularly, but not yet consistent).' },
      { rating: 5, description: 'Consistently (displays this behaviour regardless of the circumstances).' },
    ],
  },
];

export const clientScales = [
  { clientKey: 'towerstone', scaleKey: 'towerstone' },
  { clientKey: 'plc', scaleKey: 'plc' },
];

export const getScaleForKey = (key) => {
  return find(Scales, { key });
};

export default {
  Scales,
};
