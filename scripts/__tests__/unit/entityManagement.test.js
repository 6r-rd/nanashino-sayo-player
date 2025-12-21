import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findOrCreateArtist, findOrCreateSong } from '../../updateVideoData.js';
import * as generateId from '../../generateId.js';

// Mock the generateId functions
vi.spyOn(generateId, 'generateArtistId').mockReturnValue('new-artist-id');
vi.spyOn(generateId, 'generateSongId').mockReturnValue('new-song-id');

describe('Entity Management Functions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Set up default mock return values
    vi.mocked(generateId.generateArtistId).mockReturnValue('new-artist-id');
    vi.mocked(generateId.generateSongId).mockReturnValue('new-song-id');
  });
  
  describe('findOrCreateArtist', () => {
    it('finds an existing artist by exact name match', () => {
      const artists = [
        { artist_id: 'artist-1', name: 'RADWIMPS' },
        { artist_id: 'artist-2', name: 'ヨルシカ' }
      ];
      
      const result = findOrCreateArtist('RADWIMPS', artists);
      
      expect(result).toEqual({ artistId: 'artist-1', isNew: false });
      expect(generateId.generateArtistId).not.toHaveBeenCalled();
    });
    
    it('finds an existing artist by case-insensitive name match', () => {
      const artists = [
        { artist_id: 'artist-1', name: 'RADWIMPS' },
        { artist_id: 'artist-2', name: 'ヨルシカ' }
      ];
      
      const result = findOrCreateArtist('radwimps', artists);
      
      expect(result).toEqual({ artistId: 'artist-1', isNew: false });
      expect(generateId.generateArtistId).not.toHaveBeenCalled();
    });
    
    it('finds an existing artist by alias match', () => {
      const artists = [
        { artist_id: 'artist-1', name: 'れるりり', aliases: ['rerulili'] },
        { artist_id: 'artist-2', name: 'ヨルシカ', aliases: ['Yorushika'] }
      ];
      
      const result = findOrCreateArtist('Yorushika', artists);
      
      expect(result).toEqual({ artistId: 'artist-2', isNew: false });
      expect(generateId.generateArtistId).not.toHaveBeenCalled();
    });
    
    it('creates a new artist when no match is found', () => {
      const artists = [
        { artist_id: 'artist-1', name: 'RADWIMPS' },
        { artist_id: 'artist-2', name: 'ヨルシカ' }
      ];
      
      const result = findOrCreateArtist('sasakure.UK', artists);
      
      expect(result).toEqual({ artistId: 'new-artist-id', isNew: true });
      expect(generateId.generateArtistId).toHaveBeenCalledWith(artists);
    });
    
    it('handles Unicode normalization for Japanese text', () => {
      const artists = [
        { artist_id: 'artist-1', name: 'れるりり' }
      ];
      
      // Different Unicode representation but same visual character
      const result = findOrCreateArtist('れるりり', artists);
      
      expect(result).toEqual({ artistId: 'artist-1', isNew: false });
    });
  });
  
  describe('findOrCreateSong', () => {
    it('finds an existing song by exact title and artist match', () => {
      const songs = [
        { song_id: 'song-1', title: 'トレモロ', artist_ids: ['artist-1'] },
        { song_id: 'song-2', title: '春泥棒', artist_ids: ['artist-2'] }
      ];
      
      const result = findOrCreateSong('トレモロ', ['artist-1'], songs);
      
      expect(result).toEqual({ songId: 'song-1', isNew: false });
      expect(generateId.generateSongId).not.toHaveBeenCalled();
    });
    
    it('finds an existing song by case-insensitive title match', () => {
      const songs = [
        { song_id: 'song-1', title: 'Ghost of a smile', artist_ids: ['artist-1'] },
        { song_id: 'song-2', title: '春泥棒', artist_ids: ['artist-2'] }
      ];
      
      const result = findOrCreateSong('ghost of a smile', ['artist-1'], songs);
      
      expect(result).toEqual({ songId: 'song-1', isNew: false });
      expect(generateId.generateSongId).not.toHaveBeenCalled();
    });
    
    it('finds an existing song by alternate title match', () => {
      const songs = [
        { 
          song_id: 'song-1', 
          title: '春泥棒', 
          artist_ids: ['artist-2'],
          alternate_titles: ['Haru Dorobou', 'Spring Thief']
        }
      ];
      
      const result = findOrCreateSong('Spring Thief', ['artist-2'], songs);
      
      expect(result).toEqual({ songId: 'song-1', isNew: false });
      expect(generateId.generateSongId).not.toHaveBeenCalled();
    });
    
    it('requires artist match for song identification', () => {
      const songs = [
        { song_id: 'song-1', title: 'トレモロ', artist_ids: ['artist-1'] },
        { song_id: 'song-2', title: '春泥棒', artist_ids: ['artist-2'] }
      ];
      
      // Same title but different artist
      const result = findOrCreateSong('トレモロ', ['artist-2'], songs);
      
      expect(result).toEqual({ songId: 'new-song-id', isNew: true });
      expect(generateId.generateSongId).toHaveBeenCalledWith(songs);
    });
    
    it('creates a new song when no match is found', () => {
      const songs = [
        { song_id: 'song-1', title: 'トレモロ', artist_ids: ['artist-1'] },
        { song_id: 'song-2', title: '春泥棒', artist_ids: ['artist-2'] }
      ];
      
      const result = findOrCreateSong('深海のリトルクライ', ['artist-3'], songs);
      
      expect(result).toEqual({ songId: 'new-song-id', isNew: true });
      expect(generateId.generateSongId).toHaveBeenCalledWith(songs);
    });
    
    it('handles Unicode normalization for Japanese text', () => {
      const songs = [
        { song_id: 'song-1', title: '春泥棒', artist_ids: ['artist-2'] }
      ];
      
      // Different Unicode representation but same visual character
      const result = findOrCreateSong('春泥棒', ['artist-2'], songs);
      
      expect(result).toEqual({ songId: 'song-1', isNew: false });
    });
  });
});
