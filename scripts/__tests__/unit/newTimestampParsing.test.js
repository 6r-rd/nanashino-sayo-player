import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { parseTimestamps } from '../../updateVideoData.js';
import * as generateVideosList from '../../generateVideosList.js';

// Mock the generateVideosList function to prevent it from being called during tests
beforeAll(() => {
  vi.spyOn(generateVideosList, 'generateVideosList').mockImplementation(() => {
    console.log('Mocked generateVideosList called');
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Enhanced parseTimestamps', () => {
  it('handles various delimiter formats with spaces', () => {
    const text = `
      00:13:07 ブラック★ロックシューター / ryo
      00:53:40 One more time, One more chance / 山崎まさよし
      00:05:23 ＃1 春泥棒 / ヨルシカ
      30:51 生きる - 水野あつ
      00:07:51 アイデア (IDEA) /// 星野源
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(5);
    
    expect(result[0].song_title).toBe('ブラック★ロックシューター');
    expect(result[0].artist_name).toBe('ryo');
    
    expect(result[1].song_title).toBe('One more time, One more chance');
    expect(result[1].artist_name).toBe('山崎まさよし');
    
    expect(result[2].song_title).toBe('＃1 春泥棒');
    expect(result[2].artist_name).toBe('ヨルシカ');
    
    expect(result[3].song_title).toBe('生きる');
    expect(result[3].artist_name).toBe('水野あつ');
    
    expect(result[4].song_title).toBe('アイデア (IDEA)');
    expect(result[4].artist_name).toBe('星野源');
  });
  
  it('correctly handles "rain stops, good-bye" without special case', () => {
    const text = `
      01:15:30 rain stops, good-bye / におP
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].song_title).toBe('rain stops, good-bye');
    expect(result[0].artist_name).toBe('におP');
  });
  
  it('handles artist names with hyphens', () => {
    const text = `
      01:25:45 ハルジオン / YOASOBI
      01:35:20 アンサー / n-buna
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(2);
    
    expect(result[0].song_title).toBe('ハルジオン');
    expect(result[0].artist_name).toBe('YOASOBI');
    
    expect(result[1].song_title).toBe('アンサー');
    expect(result[1].artist_name).toBe('n-buna');
  });
  
  it('handles timestamps with no artist name', () => {
    const text = `
      1:26:46 オンリーワンダー
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].song_title).toBe('オンリーワンダー');
    expect(result[0].artist_name).toBe('');
  });
  
  it('handles timestamps with emoji and other characters', () => {
    const text = `
      🎹 00:13:07 ブラック★ロックシューター / ryo
      🎵 00:53:40 One more time, One more chance / 山崎まさよし
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(2);
    
    expect(result[0].song_title).toBe('ブラック★ロックシューター');
    expect(result[0].artist_name).toBe('ryo');
    
    expect(result[1].song_title).toBe('One more time, One more chance');
    expect(result[1].artist_name).toBe('山崎まさよし');
  });
  
  it('handles multiple delimiter characters', () => {
    const text = `
      00:13:07 Song A // Artist A
      00:53:40 Song B --- Artist B
      00:05:23 Song C //// Artist C
      30:51 Song D ---- Artist D
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(4);
    
    expect(result[0].song_title).toBe('Song A');
    expect(result[0].artist_name).toBe('Artist A');
    
    expect(result[1].song_title).toBe('Song B');
    expect(result[1].artist_name).toBe('Artist B');
    
    expect(result[2].song_title).toBe('Song C');
    expect(result[2].artist_name).toBe('Artist C');
    
    expect(result[3].song_title).toBe('Song D');
    expect(result[3].artist_name).toBe('Artist D');
  });
});
