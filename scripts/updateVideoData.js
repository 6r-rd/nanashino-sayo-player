/**
 * Script to fetch data from YouTube Data API and update JSON files
 * Used by GitHub Actions to update video, song, and artist data
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Node.js imports
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateArtistId, generateSongId } from './generateId.js';
import { generateVideosList } from './generateVideosList.js';
import { createNamespacedLogger, createChildLogger } from './debug.js';

// スクリプト用のロガーを作成
const logger = createNamespacedLogger('script:updateVideo');
const timestampLogger = createChildLogger(logger, 'timestamps');
const commentLogger = createChildLogger(logger, 'comments');

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const VIDEOS_DIR = path.join(PUBLIC_DIR, 'videos');
const SONGS_JSON_PATH = path.join(PUBLIC_DIR, 'songs.json');
const ARTISTS_JSON_PATH = path.join(PUBLIC_DIR, 'artists.json');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

/**
 * Fetch video details from YouTube API
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Promise with video details
 */
async function fetchVideoDetails(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video details: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Fetch video comments from YouTube API
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Array>} Promise with comments
 */
async function fetchVideoComments(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  let allComments = [];
  let nextPageToken = undefined;
  
  // Fetch up to 5 pages of comments (500 comments)
  for (let i = 0; i < 5; i++) {
    const pageParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance${pageParam}&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video comments: ${response.statusText}`);
    }
    
    const data = await response.json();
    allComments = [...allComments, ...data.items];
    
    if (!data.nextPageToken) {
      break;
    }
    
    nextPageToken = data.nextPageToken;
  }
  
  // Sort comments by like count (descending)
  return allComments.sort((a, b) => 
    b.snippet.topLevelComment.snippet.likeCount - a.snippet.topLevelComment.snippet.likeCount
  );
}

/**
 * Convert time string to seconds
 * @param {string} timeStr - Time string in format HH:MM:SS, H:MM:SS, MM:SS, or M:SS
 * @returns {number} Time in seconds
 */
function convertTimeToSeconds(timeStr) {
  // Split the time string by colons
  const parts = timeStr.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 3) {
    // Format: HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // Format: MM:SS
    return parts[0] * 60 + parts[1];
  } else {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
}

/**
 * Parse timestamps from text
 * @param {string} text - Text containing timestamps
 * @param {string} source - Source of the text ('description' or 'comment')
 * @returns {Array} Array of parsed timestamps
 * 
 * 【タイムスタンプ処理の仕様】
 * 1. 摘要欄（description）のタイムスタンプ:
 *    - 0秒のタイムスタンプ（0:00, 00:00など）はスキップしない
 *    - 0秒のタイムスタンプの存在を使って、摘要欄のタイムスタンプがYouTubeのチャプターマーカーであるかを判定する
 *    - チャプターマーカーと判定された場合のみ、摘要欄のタイムスタンプを優先する
 * 
 * 2. コメント（comment）のタイムスタンプ:
 *    - 0秒のタイムスタンプはスキップする（通常、実際の曲ではなくイントロや説明を示すため）
 *    - 摘要欄にチャプターマーカーがない場合や、摘要欄にタイムスタンプがない場合に使用する
 */
function parseTimestamps(text, source = 'unknown') {
  // Process line by line
  const lines = text.split('\n');
  const timestamps = [];
  
  // Debug: Log all lines for inspection
  timestampLogger.debug(`Processing ${lines.length} lines of text`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Detect timestamp - only process lines with timestamps
    const timeRegex = /(\d{1,2}:)?(\d{1,2}):(\d{1,2})/;
    const timeMatch = line.match(timeRegex);
    
      if (timeMatch) {
      // Extract the timestamp part
      const timeStartIndex = timeMatch.index;
      const timeEndIndex = timeMatch.index + timeMatch[0].length;
      const originalTime = timeMatch[0].trim();
      const time = convertTimeToSeconds(originalTime);
      
      timestampLogger.debug(`Line ${i+1} with timestamp ${originalTime}: "${line}"`);
      
      // Get the text after the timestamp
      let remainingText = line.substring(timeEndIndex).trim();
      let nextLineUsed = false;
      
      // If there's no text after the timestamp, check the next line
      if (!remainingText && i + 1 < lines.length) {
        remainingText = lines[i + 1].trim();
        nextLineUsed = true;
        timestampLogger.debug(`  Using next line for content: "${remainingText}"`);
      }
      
      // Skip timestamps that contain "告知:" (announcement)
      if (remainingText.includes('告知:')) {
        timestampLogger.debug(`Skipping timestamp: ${originalTime} (announcement)`);
        continue;
      }
      
      // Skip timestamps that are just "声入り" (with voice)
      if (remainingText.trim() === '声入り') {
        timestampLogger.debug(`Skipping timestamp: ${originalTime} (声入り - with voice)`);
        continue;
      }
      
      // Skip 0-second timestamps only for comments
      if (time === 0 && source === 'comment') {
        timestampLogger.debug(`Skipping timestamp: ${originalTime} (zero seconds in comment)`);
        continue;
      }
      
      // Note: We keep 0-second timestamps for descriptions to identify chapter markers
      
      // Try to find a delimiter (/ or -) in the text
      // Look for specific delimiter patterns with proper whitespace to avoid matching hyphens within words
      let delimiterMatch = remainingText.match(/\s+(\/+|\-+|\/\/+|\-\-+)\s+/);
      
      if (delimiterMatch) {
        // Extract song title and artist name
        const songTitle = remainingText.substring(0, delimiterMatch.index).trim();
        const artistName = remainingText.substring(delimiterMatch.index + delimiterMatch[0].length).trim();
        
        timestampLogger.debug(`  Found delimiter: "${delimiterMatch[0]}", Song: "${songTitle}", Artist: "${artistName}"`);
        
        if (songTitle && artistName) {
          timestamps.push({
            time,
            original_time: originalTime,
            song_title: songTitle,
            artist_name: artistName
          });
          timestampLogger.debug(`  Added timestamp: ${originalTime} - ${songTitle} / ${artistName}`);
          
          // Skip the next line if we used it
          if (nextLineUsed) {
            i++;
          }
        }
      } else if (remainingText) {
        // No delimiter found - treat everything as song title
        const songTitle = remainingText;
        
        timestampLogger.debug(`  No delimiter found. Song title: "${songTitle}"`);
        
        timestamps.push({
          time,
          original_time: originalTime,
          song_title: songTitle,
          artist_name: "" // Empty artist name when no delimiter is found
        });
        timestampLogger.debug(`  Added timestamp with no artist: ${originalTime} - ${songTitle}`);
        
        // Skip the next line if we used it
        if (nextLineUsed) {
          i++;
        }
      }
    }
  }
  
  timestampLogger.log(`Found ${timestamps.length} timestamps in total`);
  return timestamps;
}

/**
 * Load existing songs from songs.json
 * @returns {Object} Songs data
 */
function loadSongs() {
  if (fs.existsSync(SONGS_JSON_PATH)) {
    return JSON.parse(fs.readFileSync(SONGS_JSON_PATH, 'utf8'));
  }
  return { songs: [] };
}

/**
 * Load existing artists from artists.json
 * @returns {Object} Artists data
 */
function loadArtists() {
  if (fs.existsSync(ARTISTS_JSON_PATH)) {
    return JSON.parse(fs.readFileSync(ARTISTS_JSON_PATH, 'utf8'));
  }
  return { artists: [] };
}

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
 * Find or create song
 * @param {string} songTitle - Song title
 * @param {Array} artistIds - Artist IDs
 * @param {Array} songs - Existing songs
 * @returns {Object} Song ID and whether it was newly created
 */
function findOrCreateSong(songTitle, artistIds, songs) {
  // Normalize song title for comparison
  const normalizedTitle = songTitle.normalize('NFC').toLocaleLowerCase('ja');
  
  // Check if song already exists
  const existingSong = songs.find(song => {
    // Check primary title
    const songTitleNormalized = song.title.normalize('NFC').toLocaleLowerCase('ja');
    if (songTitleNormalized === normalizedTitle) {
      // If either artistIds or song.artist_ids is empty, match by title only
      if (artistIds.length === 0 || song.artist_ids.length === 0) {
        return true;
      }
      
      // Check if any of the artist IDs match
      const artistMatch = song.artist_ids.some(id => artistIds.includes(id)) ||
                         artistIds.some(id => song.artist_ids.includes(id));
      if (artistMatch) {
        return true;
      }
    }
    
    // Check alternate titles
    if (song.alternate_titles) {
      return song.alternate_titles.some(title => {
        const altTitleNormalized = title.normalize('NFC').toLocaleLowerCase('ja');
        if (altTitleNormalized === normalizedTitle) {
          // If either artistIds or song.artist_ids is empty, match by title only
          if (artistIds.length === 0 || song.artist_ids.length === 0) {
            return true;
          }
          
          return (song.artist_ids.some(id => artistIds.includes(id)) ||
                  artistIds.some(id => song.artist_ids.includes(id)));
        }
        return false;
      });
    }
    
    return false;
  });
  
  if (existingSong) {
    // If the song exists but doesn't have all the artists, add the missing ones
    const updatedArtistIds = [...new Set([...existingSong.artist_ids, ...artistIds])];
    existingSong.artist_ids = updatedArtistIds;
    return { songId: existingSong.song_id, isNew: false };
  }
  
  // Create new song
  const songId = generateSongId(songs);
  return { songId, isNew: true };
}

/**
 * Update video JSON file
 * @param {Object} videoData - Video data
 */
function updateVideoJson(videoData) {
  const filePath = path.join(VIDEOS_DIR, `${videoData.video_id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(videoData, null, 2));
  logger.log(`Updated video JSON: ${filePath}`);
}

/**
 * Update songs.json file
 * @param {Object} songsData - Songs data
 */
function updateSongsJson(songsData) {
  fs.writeFileSync(SONGS_JSON_PATH, JSON.stringify(songsData, null, 2));
  logger.log(`Updated songs JSON: ${SONGS_JSON_PATH}`);
}

/**
 * Update artists.json file
 * @param {Object} artistsData - Artists data
 */
function updateArtistsJson(artistsData) {
  fs.writeFileSync(ARTISTS_JSON_PATH, JSON.stringify(artistsData, null, 2));
  logger.log(`Updated artists JSON: ${ARTISTS_JSON_PATH}`);
}

/**
 * Check if timestamps include a zero timestamp (0:00, 00:00, etc.)
 * 
 * 【機能の目的】
 * 摘要欄のタイムスタンプがYouTubeのチャプターマーカーであるかを判定するために使用する。
 * チャプターマーカーは必ず0秒から始まるため、0秒のタイムスタンプの存在を確認することで
 * 摘要欄のタイムスタンプが信頼できるものかどうかを判断できる。
 * 
 * @param {Array} timestamps - Array of timestamp objects
 * @returns {boolean} True if a zero timestamp is found
 */
function hasZeroTimestamp(timestamps) {
  return timestamps.some(ts => 
    ts.time === 0 || 
    ts.original_time.match(/^(0:00|00:00|0:00:00|00:00:00)$/)
  );
}

/**
 * Parse CLI arguments for the update script
 * @param {string[]} argv - process.argv array
 * @returns {{ videoId: string | undefined, forceUserComments: boolean }}
 */
function parseCliArgs(argv) {
  const args = argv.slice(2);
  let videoId;
  let forceUserComments = false;

  for (const arg of args) {
    if (arg === '--user-comment') {
      forceUserComments = true;
    } else if (!arg.startsWith('--') && !videoId) {
      videoId = arg;
    }
  }

  return { videoId, forceUserComments };
}

/**
 * Process video data and update JSON files
 * @param {string} videoId - YouTube video ID
 * @param {Object} [options]
 * @param {boolean} [options.forceUserComments=false] - If true, ignore description timestamps
 */
async function processVideo(videoId, options = {}) {
  try {
    const { forceUserComments = false } = options;
    logger.log(`Processing video: ${videoId}`);

    if (forceUserComments) {
      timestampLogger.log('Skipping description timestamps due to --user-comment option');
    }
    
    // Fetch video details
    const videoResponse = await fetchVideoDetails(videoId);
    if (videoResponse.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    const videoItem = videoResponse.items[0];
    const { title, description, publishedAt, thumbnails } = videoItem.snippet;
    
    // Get best available thumbnail
    const thumbnailUrl = thumbnails.maxres?.url || 
                         thumbnails.high?.url || 
                         thumbnails.standard?.url || 
                         thumbnails.default.url;
    
    // Parse timestamps from description unless forced to use comments
    const descriptionTimestamps = forceUserComments ? [] : parseTimestamps(description, 'description');
    if (!forceUserComments) {
      timestampLogger.log(`Found ${descriptionTimestamps.length} timestamps in description`);
    }
    
    // Check if description has a timestamp at 0:00 (indicating chapter markers)
    const hasZeroTime = !forceUserComments && hasZeroTimestamp(descriptionTimestamps);
    if (!forceUserComments) {
      timestampLogger.log(`Description has zero timestamp: ${hasZeroTime}`);
    }
    
    // Fetch comments if description doesn't have valid timestamps with 0:00 marker
    let commentTimestamps = [];
    if (forceUserComments || descriptionTimestamps.length === 0 || !hasZeroTime) {
      const comments = await fetchVideoComments(videoId);
      commentLogger.log(`Fetched ${comments.length} comments`);
      
      // Add HTML decoding function
      function stripHtml(html) {
        return html.replace(/<[^>]*>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      }
      
      // Debug: Show raw comment data
      if (comments.length > 0) {
        commentLogger.debug('Raw comment text:', comments[0].snippet.topLevelComment.snippet.textDisplay);
        const decodedText = stripHtml(comments[0].snippet.topLevelComment.snippet.textDisplay);
        commentLogger.debug('Decoded comment text:', decodedText);
        
        // Test regex directly
        const timestampRegex = /(\d{1,2}:)?(\d{1,2}):(\d{1,2})\s+([^/\-]+)(?:[/\-]+|\/\/\/)\s*([^/\-\n]+)/g;
        commentLogger.debug('Regex test result:', Array.from(decodedText.matchAll(timestampRegex)));
      }
      
      // Parse timestamps from comments
      for (const comment of comments) {
        const rawCommentText = comment.snippet.topLevelComment.snippet.textDisplay;
        const commentText = stripHtml(rawCommentText);
        commentLogger.debug('Processing comment:', commentText.substring(0, 100) + (commentText.length > 100 ? '...' : ''));
        
        const timestamps = parseTimestamps(commentText, 'comment');
        if (timestamps.length > 0) {
          commentLogger.log('Found timestamps in comment:', timestamps);
          commentTimestamps = [
            ...commentTimestamps,
            ...timestamps.map(ts => ({
              ...ts,
              comment_date: comment.snippet.topLevelComment.snippet.publishedAt
            }))
          ];
        } else {
          commentLogger.debug('No timestamps found in this comment');
        }
      }
      commentLogger.log(`Found ${commentTimestamps.length} timestamps in comments`);
    }
    
    // タイムスタンプの優先順位決定
    // 1. 摘要欄に0秒のタイムスタンプがある場合（チャプターマーカーと判断）→ 摘要欄のタイムスタンプを使用
    // 2. 摘要欄に0秒のタイムスタンプがない場合 → コメントのタイムスタンプを使用（あれば）
    // 3. コメントにタイムスタンプがない場合 → 摘要欄のタイムスタンプを使用（フォールバック）
    const timestampSource = forceUserComments
      ? 'comments (forced)'
      : (descriptionTimestamps.length > 0 && hasZeroTime)
        ? 'description'
        : (commentTimestamps.length > 0 ? 'comments' : 'description (fallback)');

    const allTimestamps = forceUserComments
      ? commentTimestamps
      : (descriptionTimestamps.length > 0 && hasZeroTime)
        ? descriptionTimestamps 
        : (commentTimestamps.length > 0 ? commentTimestamps : descriptionTimestamps);
    
    timestampLogger.log(`Using ${allTimestamps.length} timestamps from ${timestampSource}`);
    
    // Load existing data
    const songsData = loadSongs();
    const artistsData = loadArtists();
    
    // Process timestamps and update songs/artists
    const videoTimestamps = [];
    const newArtists = [];
    const newSongs = [];
    
    for (const timestamp of allTimestamps) {
      // Check if artist name contains commas for multiple artists
      const artistNames = timestamp.artist_name.includes(', ') || timestamp.artist_name.includes(',')
        ? timestamp.artist_name.split(/,\s*/).map(name => name.trim())
        : [timestamp.artist_name];
      
      // Find or create each artist and collect their IDs
      const artistIds = [];
      
      for (const artistName of artistNames) {
        const { artistId, isNew: isNewArtist } = findOrCreateArtist(
          artistName, 
          [...artistsData.artists, ...newArtists]
        );
        
        artistIds.push(artistId);
        
        if (isNewArtist) {
          newArtists.push({
            artist_id: artistId,
            name: artistName
          });
        }
      }
      
      // Find or create song
      const { songId, isNew: isNewSong } = findOrCreateSong(
        timestamp.song_title,
        artistIds,
        [...songsData.songs, ...newSongs]
      );
      
      if (isNewSong) {
        newSongs.push({
          song_id: songId,
          title: timestamp.song_title,
          artist_ids: artistIds
        });
      }
      
      // Add to video timestamps
      videoTimestamps.push({
        time: timestamp.time,
        original_time: timestamp.original_time,
        song_id: songId,
        comment_source: timestampSource.startsWith('description') ? 'description' : 'comment',
        comment_date: timestamp.comment_date
      });
    }
    
    // Create video data
    const videoData = {
      video_id: videoId,
      title,
      start_datetime: publishedAt,
      thumbnail_url: thumbnailUrl,
      timestamps: videoTimestamps
    };
    
    // Update JSON files
    updateVideoJson(videoData);
    
    // Update artists.json if there are new artists
    if (newArtists.length > 0) {
      artistsData.artists = [...artistsData.artists, ...newArtists];
      updateArtistsJson(artistsData);
    }
    
    // Update songs.json if there are new songs
    if (newSongs.length > 0) {
      songsData.songs = [...songsData.songs, ...newSongs];
      updateSongsJson(songsData);
    }
    
    logger.log(`Successfully processed video: ${videoId}`);
    logger.log(`Added ${newArtists.length} new artists and ${newSongs.length} new songs`);
    
  } catch (error) {
    logger.error('Error processing video:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    const { videoId, forceUserComments } = parseCliArgs(process.argv);
    if (!videoId) {
      throw new Error('Video ID is required as a command line argument');
    }
    
    await processVideo(videoId, { forceUserComments });
    
    // Generate videos list after processing the video
    logger.log('Generating videos list...');
    generateVideosList();
    
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Add debug logging
logger.log('Starting updateVideoData.js script...');
logger.log('API Key exists:', !!process.env.YOUTUBE_API_KEY);
// Removed sensitive debug information about API key length and environment variables

// Add more detailed error handling for API key
if (!process.env.YOUTUBE_API_KEY) {
  logger.error('ERROR: YOUTUBE_API_KEY environment variable is not set or is empty');
  logger.error('Please check your repository secrets or environment variables configuration');
}

// Run main function if this is the main module and not being imported for tests
if (import.meta.url.endsWith('updateVideoData.js') && !process.env.VITEST) {
  logger.log('Running main function...');
  main().catch(err => {
    logger.error('Error in main function:', err);
    process.exit(1);
  });
}

// Export functions for use in other scripts
export {
  convertTimeToSeconds,
  parseTimestamps,
  findOrCreateArtist,
  findOrCreateSong,
  hasZeroTimestamp,
  processVideo,
  main
};
