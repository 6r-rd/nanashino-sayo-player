import { vi } from 'vitest';

import { describe, it, expect, beforeEach } from 'vitest';
import { parseTimestamps, convertTimeToSeconds, findOrCreateArtist, findOrCreateSong } from '../../updateVideoData.js';
import * as generateId from '../../generateId.js';

// Mock the generateId functions
vi.spyOn(generateId, 'generateArtistId').mockReturnValue('new-artist-id');
vi.spyOn(generateId, 'generateSongId').mockReturnValue('new-song-id');

describe('Video data processing integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateId.generateArtistId).mockReturnValue('new-artist-id');
    vi.mocked(generateId.generateSongId).mockReturnValue('new-song-id');
  });

  it('correctly processes timestamps from description', () => {
    // Sample description with timestamps
    const description = `
      テスト動画の説明文です。
      
      00:06:25 星を編む / seiza
      00:20:38 トレモロ / RADWIMPS
      00:32:02 深海のリトルクライ / sasakure.UK
    `;
    
    // Parse timestamps
    const parsedTimestamps = parseTimestamps(description);
    
    // Verify parsed timestamps
    expect(parsedTimestamps).toHaveLength(3);
    expect(parsedTimestamps[0].song_title).toBe('星を編む');
    expect(parsedTimestamps[0].artist_name).toBe('seiza');
    expect(parsedTimestamps[0].time).toBe(convertTimeToSeconds('00:06:25'));
    
    // Mock existing data
    const existingArtists = [
      { artist_id: 'artist-1', name: 'RADWIMPS' }
    ];
    
    const existingSongs = [];
    
    // Process first timestamp
    const timestamp = parsedTimestamps[0];
    
    // Find or create artist
    const { artistId, isNew: isNewArtist } = findOrCreateArtist(
      timestamp.artist_name,
      existingArtists
    );
    
    // Verify artist creation
    expect(isNewArtist).toBe(true);
    expect(artistId).toBe('new-artist-id');
    expect(generateId.generateArtistId).toHaveBeenCalledWith(existingArtists);
    
    // Find or create song
    const { songId, isNew: isNewSong } = findOrCreateSong(
      timestamp.song_title,
      [artistId],
      existingSongs
    );
    
    // Verify song creation
    expect(isNewSong).toBe(true);
    expect(songId).toBe('new-song-id');
    expect(generateId.generateSongId).toHaveBeenCalledWith(existingSongs);
    
    // Create video timestamp
    const videoTimestamp = {
      time: timestamp.time,
      original_time: timestamp.original_time,
      song_id: songId,
      comment_source: 'description'
    };
    
    // Verify video timestamp
    expect(videoTimestamp).toMatchObject({
      time: 385,
      original_time: '00:06:25',
      song_id: 'new-song-id',
      comment_source: 'description'
    });
  });
  
  it('correctly processes timestamps for existing artists and songs', () => {
    // Sample timestamp
    const timestamp = {
      time: 385,
      original_time: '00:06:25',
      song_title: 'トレモロ',
      artist_name: 'RADWIMPS'
    };
    
    // Mock existing data
    const existingArtists = [
      { artist_id: 'artist-1', name: 'RADWIMPS' }
    ];
    
    const existingSongs = [
      { song_id: 'song-1', title: 'トレモロ', artist_ids: ['artist-1'] }
    ];
    
    // Find or create artist
    const { artistId, isNew: isNewArtist } = findOrCreateArtist(
      timestamp.artist_name,
      existingArtists
    );
    
    // Verify artist found
    expect(isNewArtist).toBe(false);
    expect(artistId).toBe('artist-1');
    expect(generateId.generateArtistId).not.toHaveBeenCalled();
    
    // Find or create song
    const { songId, isNew: isNewSong } = findOrCreateSong(
      timestamp.song_title,
      [artistId],
      existingSongs
    );
    
    // Verify song found
    expect(isNewSong).toBe(false);
    expect(songId).toBe('song-1');
    expect(generateId.generateSongId).not.toHaveBeenCalled();
  });
  
  it('handles case insensitivity and normalization', () => {
    // Sample timestamp with different case
    const timestamp = {
      time: 385,
      original_time: '00:06:25',
      song_title: 'トレモロ',
      artist_name: 'radwimps' // lowercase
    };
    
    // Mock existing data
    const existingArtists = [
      { artist_id: 'artist-1', name: 'RADWIMPS' } // uppercase
    ];
    
    // Find or create artist
    const { artistId, isNew: isNewArtist } = findOrCreateArtist(
      timestamp.artist_name,
      existingArtists
    );
    
    // Verify artist found despite case difference
    expect(isNewArtist).toBe(false);
    expect(artistId).toBe('artist-1');
  });
});
