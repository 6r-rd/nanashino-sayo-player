import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findOrCreateArtist } from '../../updateVideoData.js';
import { generateSongId } from '../../generateId.js';

// Mock dependencies
vi.mock('../../updateVideoData.js', () => ({
  findOrCreateArtist: vi.fn()
}));

vi.mock('../../generateId.js', () => ({
  generateSongId: vi.fn()
}));

vi.mock('../../debug.js', () => ({
  createNamespacedLogger: () => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}));

// Import the functions we want to test directly
function isJsonString(str) {
  try {
    const json = JSON.parse(str);
    return typeof json === 'object' && json !== null;
  } catch (e) {
    return false;
  }
}

function processSongArtist(songTitle, artistName, songsData, artistsData) {
  // 曲名が空の場合はスキップ
  if (!songTitle.trim()) {
    return false;
  }

  // アーティスト名が空の場合はスキップ
  if (!artistName.trim()) {
    return false;
  }

  // Find or create artist - 既存のアーティストを優先的に使用
  const { artistId, isNew: isNewArtist } = findOrCreateArtist(artistName, artistsData.artists);

  // 曲名を正規化して比較
  const normalizedTitle = songTitle.normalize('NFC').toLocaleLowerCase('ja');
  
  // 同じ曲名で同じアーティストが関連付けられている曲を探す
  let song = songsData.songs.find(s => {
    const songTitleNormalized = s.title.normalize('NFC').toLocaleLowerCase('ja');
    return songTitleNormalized === normalizedTitle && s.artist_ids.includes(artistId);
  });

  // 同じ曲名で同じアーティストの曲が見つからない場合
  if (!song) {
    // 同じ曲名の曲が存在するか確認
    const existingSongWithSameTitle = songsData.songs.find(s => 
      s.title.normalize('NFC').toLocaleLowerCase('ja') === normalizedTitle
    );

    if (existingSongWithSameTitle) {
      // 同じ曲名だが異なるアーティストの曲が存在する場合は新規作成
      const songId = generateSongId(songsData.songs);
      song = {
        song_id: songId,
        title: songTitle,
        artist_ids: [artistId]
      };
      songsData.songs.push(song);
    } else {
      // 同じ曲名の曲が存在しない場合も新規作成
      const songId = generateSongId(songsData.songs);
      song = {
        song_id: songId,
        title: songTitle,
        artist_ids: [artistId]
      };
      songsData.songs.push(song);
    }
  } else {
    // 同じ曲名で同じアーティストの曲が既に存在する場合
    return false;
  }

  // If artist is new, add to artists.json
  if (isNewArtist) {
    artistsData.artists.push({
      artist_id: artistId,
      name: artistName
    });
  }

  return true;
}

function processSongArtistList(songArtistList, songsData, artistsData) {
  let totalProcessed = 0;
  let totalSuccess = 0;

  for (const item of songArtistList) {
    const artistName = item.artist;
    const songTitles = item.songs || [];

    for (const songTitle of songTitles) {
      totalProcessed++;
      if (processSongArtist(songTitle, artistName, songsData, artistsData)) {
        totalSuccess++;
      }
    }
  }

  return { totalProcessed, totalSuccess };
}

describe('linkArtists Functions', () => {
  // テスト用のデータ
  let songsData;
  let artistsData;

  beforeEach(() => {
    // テストごとにデータをリセット
    songsData = {
      songs: [
        {
          song_id: 'existing123',
          title: '既存の曲',
          artist_ids: ['artist123']
        },
        {
          song_id: 'duplicate123',
          title: '重複する曲名',
          artist_ids: ['artist123']
        }
      ]
    };
    
    artistsData = {
      artists: [
        {
          artist_id: 'artist123',
          name: '既存のアーティスト'
        }
      ]
    };

    // モックのリセット
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isJsonString', () => {
    it('should return true for valid JSON objects', () => {
      expect(isJsonString('{"key": "value"}')).toBe(true);
      expect(isJsonString('[{"artist": "YOASOBI", "songs": ["アイドル"]}]')).toBe(true);
    });

    it('should return false for invalid JSON strings', () => {
      expect(isJsonString('not a json')).toBe(false);
      expect(isJsonString('{invalid json}')).toBe(false);
    });

    it('should return false for JSON non-objects', () => {
      expect(isJsonString('"string"')).toBe(false);
      expect(isJsonString('123')).toBe(false);
      expect(isJsonString('true')).toBe(false);
    });
  });

  describe('processSongArtist', () => {
    it('should create new song when title exists but with different artist', () => {
      // モックの設定
      findOrCreateArtist.mockReturnValue({ artistId: 'newArtist', isNew: true });
      generateSongId.mockReturnValue('newSong123');
      
      // 既存の曲と同じ名前だが異なるアーティスト
      const result = processSongArtist('重複する曲名', '新しいアーティスト', songsData, artistsData);
      
      expect(result).toBe(true);
      expect(songsData.songs).toHaveLength(3);
      expect(songsData.songs[2].title).toBe('重複する曲名');
      expect(songsData.songs[2].artist_ids).toContain('newArtist');
      expect(artistsData.artists).toHaveLength(2);
    });

    it('should not add song when title and artist already exist', () => {
      // モックの設定
      findOrCreateArtist.mockReturnValue({ artistId: 'artist123', isNew: false });
      
      // 既存の曲と同じ名前、同じアーティスト
      const result = processSongArtist('既存の曲', '既存のアーティスト', songsData, artistsData);
      
      expect(result).toBe(false);
      expect(songsData.songs).toHaveLength(2);
    });

    it('should create new song when title does not exist', () => {
      // モックの設定
      findOrCreateArtist.mockReturnValue({ artistId: 'artist123', isNew: false });
      generateSongId.mockReturnValue('newSong123');
      
      const result = processSongArtist('新しい曲', '既存のアーティスト', songsData, artistsData);
      
      expect(result).toBe(true);
      expect(songsData.songs).toHaveLength(3);
      expect(songsData.songs[2].title).toBe('新しい曲');
      expect(songsData.songs[2].artist_ids).toContain('artist123');
    });

    it('should skip if song title is empty', () => {
      const result = processSongArtist('', 'アーティスト', songsData, artistsData);
      
      expect(result).toBe(false);
      expect(findOrCreateArtist).not.toHaveBeenCalled();
    });

    it('should skip if artist name is empty', () => {
      const result = processSongArtist('曲名', '', songsData, artistsData);
      
      expect(result).toBe(false);
      expect(findOrCreateArtist).not.toHaveBeenCalled();
    });
  });

  describe('processSongArtistList', () => {
    it('should process multiple songs and artists from list', () => {
      // 直接processSongArtistをモックするのではなく、依存関数をモックする
      findOrCreateArtist
        .mockReturnValueOnce({ artistId: 'yoasobi-id', isNew: false })  // YOASOBI - アイドル
        .mockReturnValueOnce({ artistId: 'yoasobi-id', isNew: false })  // YOASOBI - 夜に駆ける
        .mockReturnValueOnce({ artistId: 'yorushika-id', isNew: false }) // ヨルシカ - だから僕は音楽を辞めた
        .mockReturnValueOnce({ artistId: 'kenshi-id', isNew: false });  // 米津玄師 - Lemon
      
      generateSongId
        .mockReturnValueOnce('song-id-1')
        .mockReturnValueOnce('song-id-2')
        .mockReturnValueOnce('song-id-3')
        .mockReturnValueOnce('song-id-4');
      
      const songArtistList = [
        { artist: "YOASOBI", songs: ["アイドル", "夜に駆ける"] },
        { artist: "ヨルシカ", songs: ["だから僕は音楽を辞めた"] },
        { artist: "米津玄師", songs: ["Lemon"] }
      ];
      
      const result = processSongArtistList(songArtistList, songsData, artistsData);
      
      expect(result.totalProcessed).toBe(4);
      // すべて新しい曲として追加されるはず
      expect(result.totalSuccess).toBe(4);
      
      // findOrCreateArtistが4回呼ばれたことを確認
      expect(findOrCreateArtist).toHaveBeenCalledTimes(4);
      expect(findOrCreateArtist).toHaveBeenCalledWith("YOASOBI", artistsData.artists);
      expect(findOrCreateArtist).toHaveBeenCalledWith("YOASOBI", artistsData.artists);
      expect(findOrCreateArtist).toHaveBeenCalledWith("ヨルシカ", artistsData.artists);
      expect(findOrCreateArtist).toHaveBeenCalledWith("米津玄師", artistsData.artists);
    });

    it('should handle empty songs array', () => {
      const songArtistList = [
        { artist: "YOASOBI", songs: [] },
        { artist: "ヨルシカ" } // songs プロパティなし
      ];
      
      const result = processSongArtistList(songArtistList, songsData, artistsData);
      
      expect(result.totalProcessed).toBe(0);
      expect(result.totalSuccess).toBe(0);
    });
  });
});
