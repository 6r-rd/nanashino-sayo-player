/**
 * Script to find collaboration live streams where 七篠さよ appears on other channels
 * 
 * Usage: npm run find-collab-live [count]
 * 
 * This script searches for videos with keywords "歌枠" AND "七篠さよ" in the title and
 * filters out videos from the channel specified in .env YOUTUBE_CHANNEL_ID.
 * Results are output to standard output.
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { createNamespacedLogger } from './debug.js';

// スクリプト用のロガーを作成
const logger = createNamespacedLogger('script:find-collab-live');

// Constants
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const DEFAULT_RESULT_COUNT = 500;

// Parse command-line arguments
const requestedCount = parseInt(process.argv[2], 10) || DEFAULT_RESULT_COUNT;

if (!API_KEY) {
  throw new Error('YOUTUBE_API_KEY environment variable is not set');
}

if (!CHANNEL_ID) {
  throw new Error('YOUTUBE_CHANNEL_ID environment variable is not set');
}

/**
 * Search YouTube for videos with specific keywords
 * @param {string} keywords - Keywords to search for
 * @param {number} maxResults - Maximum number of results per page (max 50)
 * @param {string} pageToken - Token for pagination
 * @returns {Promise<Object>} Search results
 */
async function searchYouTube(keywords, maxResults = 50, pageToken = null) {
  const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keywords)}&type=video&maxResults=${maxResults}${pageParam}&key=${API_KEY}`;
  
  logger.log(`API URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch search results: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Get video details for a list of video IDs
 * @param {string[]} videoIds - Array of video IDs
 * @returns {Promise<Object>} Video details
 */
async function getVideoDetails(videoIds) {
  if (videoIds.length === 0) return { items: [] };
  
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`;
  
  logger.log(`Getting details for ${videoIds.length} videos`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video details: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Format date string to a more readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Search for collaboration live streams
 * @param {number} count - Number of results to return
 * @returns {Promise<Array>} Array of video data
 */
async function searchCollabLives(count) {
  logger.log(`Searching for up to ${count} collaboration live streams...`);
  
  const keywords = 'intitle:歌枠 intitle:七篠さよ'; // This will perform an AND search in titles only
  let collabVideos = [];
  let nextPageToken = null;
  let totalProcessed = 0;
  
  // Continue fetching pages until we have enough results or no more pages
  while (collabVideos.length < count && (nextPageToken !== undefined || totalProcessed === 0)) {
    const maxResults = Math.min(50, count - collabVideos.length);
    const searchResults = await searchYouTube(keywords, maxResults, nextPageToken);
    
    // Extract video IDs and filter out videos from the specified channel
    const filteredItems = searchResults.items.filter(item => 
      item.snippet.channelId !== CHANNEL_ID
    );
    
    totalProcessed += searchResults.items.length;
    logger.log(`Found ${filteredItems.length} videos from other channels (filtered from ${searchResults.items.length} total)`);
    
    // Get detailed information for the filtered videos
    if (filteredItems.length > 0) {
      const videoIds = filteredItems.map(item => item.id.videoId);
      const videoDetails = await getVideoDetails(videoIds);
      
      // Add detailed information to our results
      const detailedVideos = videoDetails.items.map(item => ({
        video_id: item.id,
        title: item.snippet.title,
        channel_id: item.snippet.channelId,
        channel_title: item.snippet.channelTitle,
        published_at: item.snippet.publishedAt,
        thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        view_count: item.statistics.viewCount,
        duration: item.contentDetails.duration
      }));
      
      collabVideos = [...collabVideos, ...detailedVideos];
    }
    
    nextPageToken = searchResults.nextPageToken;
    
    // If we've processed all available results, break the loop
    if (!nextPageToken) {
      logger.log('No more pages available');
      break;
    }
  }
  
  logger.log(`Found ${collabVideos.length} collaboration live streams in total`);
  return collabVideos;
}

/**
 * Output results to standard output
 * @param {Array} videos - Array of video data
 */
function outputResults(videos) {
  console.log(`\n=== Found ${videos.length} collaboration live streams ===\n`);
  
  videos.forEach((video, index) => {
    console.log(`[${index + 1}] ${video.title}`);
    console.log(`    Video ID: ${video.video_id}`);
    console.log(`    Channel: ${video.channel_title} (${video.channel_id})`);
    console.log(`    Published: ${formatDate(video.published_at)}`);
    console.log(`    Views: ${video.view_count}`);
    console.log(`    URL: https://www.youtube.com/watch?v=${video.video_id}`);
    console.log('');
  });
}

/**
 * Main function
 */
async function main() {
  try {
    logger.log(`Starting search for collaboration live streams (max: ${requestedCount})`);
    logger.log(`Filtering out videos from channel: ${CHANNEL_ID}`);
    
    const videos = await searchCollabLives(requestedCount);
    outputResults(videos);
    
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Run main function
if (import.meta.url.endsWith('find-collab-live.js') && !process.env.VITEST) {
  logger.log('Running main function...');
  main().catch(err => {
    logger.error('Error in main function:', err);
    process.exit(1);
  });
}

// Export functions for testing
export {
  searchCollabLives,
  outputResults,
  main
};
