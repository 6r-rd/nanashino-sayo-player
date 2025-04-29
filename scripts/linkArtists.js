/**
 * Script to link artists to songs without artists
 * Usage: node linkArtists.js --song "曲名" --artist "アーティスト名"
 *    or: node linkArtists.js --song "曲名とアーティスト名の配列"
 * 
 * Example:
 * [
 *   {
 *     "artist": "YOASOBI",
 *     "songs": [
 *       "アイドル",
 *       "夜に駆ける"
 *     ]
 *   },
 *   {
 *     "artist": "ヨルシカ",
 *     "songs": [
 *       "だから僕は音楽を辞めた",
 *       "雨とカプチーノ"
 *     ]
 *   },
 *   {
 *     "artist": "米津玄師",
 *     "songs": [
 *       "Lemon"
 *     ]
 *   }
 * ]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateSongId, generateArtistId } from './generateId.js';
import { createNamespacedLogger } from './debug.js';

// スクリプト用のロガーを作成
const logger = createNamespacedLogger('script:linkArtists');

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SONGS_JSON_PATH = path.join(PUBLIC_DIR, 'songs.json');
const ARTISTS_JSON_PATH = path.join(PUBLIC_DIR, 'artists.json');

// Parse command line arguments
const args = process.argv.slice(2);
let songTitle = '';
let artistName = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--song' && i + 1 < args.length) {
    songTitle = args[i + 1];
    i++;
  } else if (args[i] === '--artist' && i + 1 < args.length) {
    artistName = args[i + 1];
    i++;
  }
}

// Load existing data
const songsData = JSON.parse(fs.readFileSync(SONGS_JSON_PATH, 'utf8'));
const artistsData = JSON.parse(fs.readFileSync(ARTISTS_JSON_PATH, 'utf8'));

/**
 * Find or create artist
 * @param {string} artistName - Artist name
 * @param {Array} artists - Existing artists
 * @returns {Object} Artist ID and whether it was newly created
 */
function findOrCreateArtist(artistName, artists) {
  // Normalize artist name for comparison
  const normalizedName = artistName.normalize('NFC').toLocaleLowerCase('ja');
  
  // Check if artist already exists
  const existingArtist = artists.find(artist => {
    const artistNameNormalized = artist.name.normalize('NFC').toLocaleLowerCase('ja');
    if (artistNameNormalized === normalizedName) {
      return true;
    }
    
    // Check aliases
    if (artist.aliases) {
      return artist.aliases.some(alias => 
        alias.normalize('NFC').toLocaleLowerCase('ja') === normalizedName
      );
    }
    
    return false;
  });
  
  if (existingArtist) {
    return { artistId: existingArtist.artist_id, isNew: false };
  }
  
  // Create new artist
  const artistId = generateArtistId(artists);
  return { artistId, isNew: true };
}

/**
 * JSON文字列かどうかを判定する
 * @param {string} str - 判定する文字列
 * @returns {boolean} JSON文字列ならtrue
 */
function isJsonString(str) {
  try {
    const json = JSON.parse(str);
    return typeof json === 'object' && json !== null;
  } catch (e) {
    return false;
  }
}

/**
 * 単一の曲とアーティストを処理する
 * @param {string} songTitle - 曲名
 * @param {string} artistName - アーティスト名
 * @param {Object} songsData - 曲データ
 * @param {Object} artistsData - アーティストデータ
 * @returns {boolean} 処理が成功したらtrue
 */
function processSongArtist(songTitle, artistName, songsData, artistsData) {
  // 曲名が空の場合はスキップ
  if (!songTitle.trim()) {
    logger.warn(`Empty song title for artist "${artistName}" - skipping`);
    return false;
  }

  // アーティスト名が空の場合はスキップ
  if (!artistName.trim()) {
    logger.warn(`Empty artist name for song "${songTitle}" - skipping`);
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
      logger.log(`Created new song "${songTitle}" (${songId}) with artist "${artistName}" (different artist for same title)`);
    } else {
      // 同じ曲名の曲が存在しない場合も新規作成
      const songId = generateSongId(songsData.songs);
      song = {
        song_id: songId,
        title: songTitle,
        artist_ids: [artistId]
      };
      songsData.songs.push(song);
      logger.log(`Created new song "${songTitle}" (${songId}) with artist "${artistName}"`);
    }
  } else {
    // 同じ曲名で同じアーティストの曲が既に存在する場合
    logger.log(`Song "${songTitle}" already linked to artist "${artistName}"`);
    return false;
  }

  // If artist is new, add to artists.json
  if (isNewArtist) {
    artistsData.artists.push({
      artist_id: artistId,
      name: artistName
    });
    logger.log(`Added new artist "${artistName}" (${artistId})`);
  }

  return true;
}

/**
 * JSONデータから曲とアーティストの関連付けを処理する
 * @param {Array} songArtistList - 曲とアーティストのリスト
 * @param {Object} songsData - 曲データ
 * @param {Object} artistsData - アーティストデータ
 */
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

  logger.log(`Processed ${totalProcessed} song-artist pairs, ${totalSuccess} were updated`);
}

// メイン処理
try {
  let changes = false;

  if (songTitle) {
    if (isJsonString(songTitle)) {
      // JSON形式の場合
      logger.log('Processing song-artist mapping from JSON');
      const songArtistData = JSON.parse(songTitle);
      
      // 配列形式かどうかを確認
      if (Array.isArray(songArtistData)) {
        processSongArtistList(songArtistData, songsData, artistsData);
      } else {
        // 旧形式のJSONの場合は変換
        const convertedList = Object.entries(songArtistData).map(([artist, songs]) => ({
          artist,
          songs: Array.isArray(songs) ? songs : [songs]
        }));
        processSongArtistList(convertedList, songsData, artistsData);
      }
      changes = true;
    } else if (artistName) {
      // 従来の形式の場合
      logger.log(`Processing single song "${songTitle}" with artist "${artistName}"`);
      changes = processSongArtist(songTitle, artistName, songsData, artistsData);
    } else {
      logger.error('When using --song with a song title, --artist is required');
      logger.error('Usage: node linkArtists.js --song "曲名" --artist "アーティスト名"');
      logger.error('   or: node linkArtists.js --song "曲名とアーティスト名のJSON"');
      process.exit(1);
    }
  } else {
    logger.error('No song specified');
    logger.error('Usage: node linkArtists.js --song "曲名" --artist "アーティスト名"');
    logger.error('   or: node linkArtists.js --song "曲名とアーティスト名のJSON"');
    process.exit(1);
  }

  // 変更があった場合のみファイルを保存
  if (changes) {
    // Save updated songs.json
    fs.writeFileSync(SONGS_JSON_PATH, JSON.stringify(songsData, null, 2));
    logger.log(`Updated songs JSON: ${SONGS_JSON_PATH}`);
    
    // Save updated artists.json
    fs.writeFileSync(ARTISTS_JSON_PATH, JSON.stringify(artistsData, null, 2));
    logger.log(`Updated artists JSON: ${ARTISTS_JSON_PATH}`);
  } else {
    logger.log('No changes were made');
  }
} catch (error) {
  logger.error('Error:', error);
  process.exit(1);
}

// Export functions for testing
export {
  isJsonString,
  findOrCreateArtist,
  processSongArtist,
  processSongArtistList
};
