jest.mock('../../i18n', () => ({
  __esModule: true,
  default: {
    t: (key, params = {}) => {
      if (key === 'autoComplete.nextDay') return `${params.time} next-day`;
      if (key === 'duration.min') return `${params.min}m`;
      if (key === 'duration.h') return `${params.h}h`;
      if (key === 'duration.hMin') return `${params.h}h ${params.m}m`;
      return key;
    },
  },
}));

const {
  AUTO_COMPLETE_DEFAULTS,
  estimateDurationMin,
  autoCompleteOffsetMin,
  previewAutoCompleteTime,
  formatEta,
  isEtaSoon,
  formatDuration,
} = require('../autoComplete');

describe('autoComplete formula', () => {
  const user = {
    auto_complete_start_delay_min: 10,
    auto_complete_margin_min: 5,
    auto_complete_margin_pct: 10,
    auto_complete_default_duration_min: 60,
  };

  test('estimateDurationMin prefers duration, then km, then default', () => {
    expect(estimateDurationMin({ estimated_duration_min: 16 }, user)).toBe(16);
    expect(estimateDurationMin({ estimated_distance_km: 50 }, user)).toBe(60); // 50 km / 50 kmh * 60
    expect(estimateDurationMin({}, user)).toBe(60);
  });

  test('autoCompleteOffsetMin matches start + d + pct + margin', () => {
    // 10 + 16 + ceil(1.6) + 5 = 10 + 16 + 2 + 5 = 33
    expect(autoCompleteOffsetMin({ estimated_duration_min: 16 }, user)).toBe(33);
    expect(autoCompleteOffsetMin({ estimated_duration_min: 16 }, user)).toBe(
      AUTO_COMPLETE_DEFAULTS.start_delay_min
        + 16
        + Math.ceil((16 * AUTO_COMPLETE_DEFAULTS.margin_pct) / 100)
        + AUTO_COMPLETE_DEFAULTS.margin_min
    );
  });

  test('previewAutoCompleteTime wraps to the next day', () => {
    expect(previewAutoCompleteTime({ trip_time: '10:00', estimated_duration_min: 16 }, user)).toBe('10:33');
    expect(previewAutoCompleteTime({ trip_time: '23:50', estimated_duration_min: 16 }, user)).toBe('00:23 next-day');
  });

  test('formatEta and isEtaSoon', () => {
    expect(formatEta('2026-10-06T10:33', '2026-10-06')).toBe('10:33');
    expect(formatEta('2026-10-07T01:10', '2026-10-06')).toBe('01:10 (07/10)');
    expect(isEtaSoon(null)).toBe(false);
  });

  test('formatDuration', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(75)).toBe('1h 15m');
  });
});
