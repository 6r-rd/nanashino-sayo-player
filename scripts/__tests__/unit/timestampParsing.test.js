import { describe, it, expect } from 'vitest';
import { parseTimestamps } from '../../updateVideoData.js';

describe('parseTimestamps', () => {
  it('correctly parses timestamps with song and artist information', () => {
    const text = `
      テスト動画の説明文です。
      
      00:06:25 星を編む / seiza
      00:20:38 トレモロ / RADWIMPS
      00:32:02 深海のリトルクライ / sasakure.UK
      00:52:41 春泥棒 / ヨルシカ
      01:05:00 神のまにまに / れるりり
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(5);
    
    // Check first timestamp
    expect(result[0]).toEqual({
      time: 385, // 6 minutes 25 seconds = 385 seconds
      original_time: '00:06:25',
      song_title: '星を編む',
      artist_name: 'seiza'
    });
    
    // Check last timestamp
    expect(result[4]).toEqual({
      time: 3900, // 1 hour 5 minutes = 3900 seconds
      original_time: '01:05:00',
      song_title: '神のまにまに',
      artist_name: 'れるりり'
    });
  });
  
  it('handles different delimiter formats', () => {
    const text = `
      01:15:30 君じゃなきゃダメみたい - オーイシマサヨシ
      01:25:45 踊り子 /// Vaundy
      01:35:20 サウンド / baker
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(3);
    
    expect(result[0].song_title).toBe('君じゃなきゃダメみたい');
    expect(result[0].artist_name).toBe('オーイシマサヨシ');
    
    expect(result[1].song_title).toBe('踊り子');
    expect(result[1].artist_name).toBe('Vaundy');
    
    expect(result[2].song_title).toBe('サウンド');
    expect(result[2].artist_name).toBe('baker');
  });
  
  it('handles timestamps in comments with other text', () => {
    const text = `
      素晴らしい歌声でした！
      
      01:45:10 プラネテス / seiza
      この曲大好き！
      
      02:00:15 もののけ姫 / 米良美一
      02:10:30 ドライフラワー / 優里
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(3);
    
    expect(result[0].song_title).toBe('プラネテス');
    expect(result[0].artist_name).toBe('seiza');
    
    expect(result[1].song_title).toBe('もののけ姫');
    expect(result[1].artist_name).toBe('米良美一');
    
    expect(result[2].song_title).toBe('ドライフラワー');
    expect(result[2].artist_name).toBe('優里');
  });
  
  it('returns an empty array when no timestamps are found', () => {
    const text = 'This text does not contain any timestamps.';
    const result = parseTimestamps(text);
    expect(result).toEqual([]);
  });
});
