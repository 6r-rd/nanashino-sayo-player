import { describe, it, expect } from 'vitest';
import { hasZeroTimestamp } from '../../updateVideoData.js';

describe('hasZeroTimestamp', () => {
  it('returns false when no zero timestamp is present even if a legacy flag exists', () => {
    const timestamps = [
      { time: 385, original_time: '00:06:25' },
      { time: 1238, original_time: '00:20:38' }
    ];
    timestamps.hasZeroTimestamp = true;
    expect(hasZeroTimestamp(timestamps)).toBe(false);
  });
  
  it('returns true when timestamps include 0:00', () => {
    const timestamps = [
      { time: 0, original_time: '0:00' },
      { time: 385, original_time: '00:06:25' }
    ];
    expect(hasZeroTimestamp(timestamps)).toBe(true);
  });
  
  it('returns true when timestamps include 00:00', () => {
    const timestamps = [
      { time: 0, original_time: '00:00' },
      { time: 385, original_time: '00:06:25' }
    ];
    expect(hasZeroTimestamp(timestamps)).toBe(true);
  });
  
  it('returns true when timestamps include 0:00:00', () => {
    const timestamps = [
      { time: 0, original_time: '0:00:00' },
      { time: 385, original_time: '00:06:25' }
    ];
    expect(hasZeroTimestamp(timestamps)).toBe(true);
  });
  
  it('returns true when timestamps include 00:00:00', () => {
    const timestamps = [
      { time: 0, original_time: '00:00:00' },
      { time: 385, original_time: '00:06:25' }
    ];
    expect(hasZeroTimestamp(timestamps)).toBe(true);
  });
  
  it('returns false when no zero timestamp is present', () => {
    const timestamps = [
      { time: 385, original_time: '00:06:25' },
      { time: 1238, original_time: '00:20:38' }
    ];
    expect(hasZeroTimestamp(timestamps)).toBe(false);
  });
  
  it('returns false for empty timestamp array', () => {
    const timestamps = [];
    expect(hasZeroTimestamp(timestamps)).toBe(false);
  });
  
  it('returns true when a timestamp has time=0 but different format', () => {
    const timestamps = [
      { time: 0, original_time: '0' }, // Not a standard format but time is 0
      { time: 385, original_time: '00:06:25' }
    ];
    expect(hasZeroTimestamp(timestamps)).toBe(true);
  });
});
