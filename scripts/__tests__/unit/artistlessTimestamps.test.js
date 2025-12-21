import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { parseTimestamps, findOrCreateSong } from '../../updateVideoData.js';
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

describe('Artistless Timestamps', () => {
  it('correctly parses timestamps without artist names', () => {
    const text = `
      🎋┈┈セットリスト┈┈✨
      0:15:36 ループ
      0:21:41 Clear
      0:31:30 プラチナ
      0:41:26 クスシキ
      0:45:58 ソワレ
      0:53:39 夢であるように
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(6);
    
    // Check first timestamp
    expect(result[0]).toEqual({
      time: 936, // 15 minutes 36 seconds = 936 seconds
      original_time: '0:15:36',
      song_title: 'ループ',
      artist_name: ''
    });
    
    // Check last timestamp
    expect(result[5]).toEqual({
      time: 3219, // 53 minutes 39 seconds = 3219 seconds
      original_time: '0:53:39',
      song_title: '夢であるように',
      artist_name: ''
    });
  });
  
  it('handles findOrCreateSong with empty artist arrays', () => {
    const existingSongs = [
      {
        song_id: 'test1',
        title: 'ループ',
        artist_ids: []
      },
      {
        song_id: 'test2',
        title: 'Clear',
        artist_ids: ['artist1']
      }
    ];
    
    // Test finding a song with empty artist array
    const result1 = findOrCreateSong('ループ', [], existingSongs);
    expect(result1.songId).toBe('test1');
    expect(result1.isNew).toBe(false);
    
    // Test finding a song with artist when the song has no artists
    const result2 = findOrCreateSong('ループ', ['artist2'], existingSongs);
    expect(result2.songId).toBe('test1');
    expect(result2.isNew).toBe(false);
    expect(existingSongs[0].artist_ids).toContain('artist2');
    
    // Test finding a song without artist when the song has artists
    const result3 = findOrCreateSong('Clear', [], existingSongs);
    expect(result3.songId).toBe('test2');
    expect(result3.isNew).toBe(false);
    
    // Test creating a new song with empty artist array
    const result4 = findOrCreateSong('NewSong', [], existingSongs);
    expect(result4.isNew).toBe(true);
  });
  
  it('handles mixed timestamps with and without artists', () => {
    const text = `
      00:06:25 星を編む / seiza
      00:20:38 トレモロ / RADWIMPS
      00:32:02 ループ
      00:52:41 Clear
      01:05:00 神のまにまに / れるりり
    `;
    
    const result = parseTimestamps(text);
    
    expect(result).toHaveLength(5);
    
    // Check timestamps with artists
    expect(result[0].song_title).toBe('星を編む');
    expect(result[0].artist_name).toBe('seiza');
    
    expect(result[1].song_title).toBe('トレモロ');
    expect(result[1].artist_name).toBe('RADWIMPS');
    
    // Check timestamps without artists
    expect(result[2].song_title).toBe('ループ');
    expect(result[2].artist_name).toBe('');
    
    expect(result[3].song_title).toBe('Clear');
    expect(result[3].artist_name).toBe('');
    
    // Check last timestamp with artist
    expect(result[4].song_title).toBe('神のまにまに');
    expect(result[4].artist_name).toBe('れるりり');
  });

  it('matches artistless timestamps to existing songs by title order', () => {
    const songs = [
      {
        song_id: 'song-1',
        title: 'Clear',
        artist_ids: ['artist-a']
      },
      {
        song_id: 'song-2',
        title: 'Clear',
        artist_ids: ['artist-b']
      },
      {
        song_id: 'song-3',
        title: 'プラチナ',
        artist_ids: [],
        alternate_titles: ['Platina']
      }
    ];

    const exactMatch = findOrCreateSong('Clear', [], songs);
    expect(exactMatch.isNew).toBe(false);
    expect(exactMatch.songId).toBe('song-1');

    const altMatch = findOrCreateSong('Platina', [], songs);
    expect(altMatch.isNew).toBe(false);
    expect(altMatch.songId).toBe('song-3');
  });
});
