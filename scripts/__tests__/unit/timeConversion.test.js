import { describe, it, expect } from 'vitest';
import { convertTimeToSeconds } from '../../updateVideoData.js';

describe('convertTimeToSeconds', () => {
  it('correctly converts HH:MM:SS format to seconds', () => {
    expect(convertTimeToSeconds('01:30:45')).toBe(5445); // 1 hour 30 minutes 45 seconds = 5445 seconds
    expect(convertTimeToSeconds('00:30:15')).toBe(1815); // 30 minutes 15 seconds = 1815 seconds
    expect(convertTimeToSeconds('02:00:00')).toBe(7200); // 2 hours = 7200 seconds
  });

  it('correctly converts MM:SS format to seconds', () => {
    expect(convertTimeToSeconds('05:25')).toBe(325); // 5 minutes 25 seconds = 325 seconds
    expect(convertTimeToSeconds('10:00')).toBe(600); // 10 minutes = 600 seconds
    expect(convertTimeToSeconds('00:45')).toBe(45); // 45 seconds = 45 seconds
  });

  it('handles single-digit minutes in MM:SS format', () => {
    expect(convertTimeToSeconds('5:25')).toBe(325); // 5 minutes 25 seconds = 325 seconds
    expect(convertTimeToSeconds('3:07')).toBe(187); // 3 minutes 7 seconds = 187 seconds
  });

  it('handles single-digit hours in HH:MM:SS format', () => {
    expect(convertTimeToSeconds('1:30:45')).toBe(5445); // 1 hour 30 minutes 45 seconds = 5445 seconds
    expect(convertTimeToSeconds('2:05:10')).toBe(7510); // 2 hours 5 minutes 10 seconds = 7510 seconds
  });

  it('throws an error for invalid time formats', () => {
    expect(() => convertTimeToSeconds('5')).toThrow('Invalid time format');
    expect(() => convertTimeToSeconds('5:5:5:5')).toThrow('Invalid time format');
    expect(() => convertTimeToSeconds('')).toThrow('Invalid time format');
  });
});
