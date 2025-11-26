/**
 * Script to fetch new videos from a YouTube channel
 */
// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { generateVideosList } from './generateVideosList.js';
import { createNamespacedLogger } from './debug.js';

// スクリプト用のロガーを作成
const logger = createNamespacedLogger('script:fetchVideos');

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const VIDEOS_DIR = path.join(PUBLIC_DIR, 'videos');
const CHANNEL_ID = process.argv[2] || process.env.YOUTUBE_CHANNEL_ID;
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  throw new Error('YOUTUBE_API_KEY environment variable is not set');
}

if (!CHANNEL_ID) {
  throw new Error('Channel ID must be provided as an argument or YOUTUBE_CHANNEL_ID environment variable');
}

/**
 * Fetch videos from a YouTube channel
 * @returns {Promise<string[]>} Array of video IDs
 */
async function fetchChannelVideos() {
  logger.log(`Fetching videos for channel: ${CHANNEL_ID}`);
  
  // Updated URL parameters based on the curl command
  const url = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${CHANNEL_ID}&type=video&eventType=completed&order=date&maxResults=50&key=${API_KEY}`;
  
  logger.log(`API URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch channel videos: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Debug: Log a sample of the response
  if (data.items && data.items.length > 0) {
    logger.log(`Sample video data: ${JSON.stringify(data.items[0], null, 2)}`);
  } else {
    logger.log('No videos found in response');
    logger.log(`Response data: ${JSON.stringify(data, null, 2)}`);
  }
  
  // Filter videos to only include those with "歌枠" in the title
  const filteredVideos = data.items.filter(item => {
    const title = item.snippet.title;
    return title.includes('歌枠');
  });
  
  logger.log(`Found ${data.items.length} total videos, ${filteredVideos.length} with "歌枠" in the title`);
  
  return filteredVideos.map(item => item.id.videoId);
}

/**
 * Check if a video has already been processed
 * @param {string} videoId - YouTube video ID
 * @returns {boolean} Whether the video has been processed
 */
function isVideoProcessed(videoId) {
  return fs.existsSync(path.join(VIDEOS_DIR, `${videoId}.json`));
}

/**
 * Process a video
 * @param {string} videoId - YouTube video ID
 */
function processVideo(videoId) {
  logger.log(`Processing video: ${videoId}`);
  
  try {
    // Run the updateVideoData script with node
    execSync(`node scripts/updateVideoData.js ${videoId}`, {
      stdio: 'inherit',
      env: process.env
    });
    
    logger.log(`Successfully processed video: ${videoId}`);
  } catch (error) {
    logger.error(`Error processing video ${videoId}:`, error);
    throw error;
  }
}

/**
 * Check if a video is still available (public or unlisted)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<boolean>} Whether the video can be fetched via the API
 */
async function isVideoAvailable(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  // If the video is deleted or private, the API returns an empty items array.
  const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video details: ${response.statusText}`);
  }
  
  const data = await response.json();
  if (data.items.length === 0) {
    return false;
  }

  const status = data.items[0].status;
  if (!status) {
    return true;
  }

  const privacyStatus = status.privacyStatus;
  return privacyStatus === 'public' || privacyStatus === 'unlisted';
}

/**
 * Delete video JSON file
 * @param {string} videoId - YouTube video ID
 */
function deleteVideoJson(videoId) {
  const filePath = path.join(VIDEOS_DIR, `${videoId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logger.log(`Deleted video JSON: ${filePath}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Fetch videos from channel
    const videoIds = await fetchChannelVideos();
    logger.log(`Found ${videoIds.length} videos with "歌枠" in the title`);
    
    // Filter out videos that have already been processed
    const newVideoIds = videoIds.filter(id => !isVideoProcessed(id));
    logger.log(`Found ${newVideoIds.length} new videos with "歌枠" in the title`);
    
    // Process each new video
    for (const videoId of newVideoIds) {
      processVideo(videoId);
    }
    
    // Delete JSON files for videos that don't have "歌枠" in the title
    if (fs.existsSync(VIDEOS_DIR)) {
      const files = fs.readdirSync(VIDEOS_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      logger.log(`Checking ${jsonFiles.length} existing JSON files for unavailable videos...`);
      
      for (const jsonFile of jsonFiles) {
        const videoId = jsonFile.replace('.json', '');
        
        // Skip videos that are in our list of valid karaoke videos
        if (videoIds.includes(videoId)) {
          continue;
        }
        
        // Remove entries for videos that are no longer accessible
        const available = await isVideoAvailable(videoId);
        if (!available) {
          deleteVideoJson(videoId);
        }
      }
    }
    
    logger.log('Finished processing videos');
    
    // Generate videos list after processing videos
    logger.log('Generating videos list...');
    generateVideosList();
    
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Add debug logging
logger.log('Starting fetchNewVideos.js script...');
logger.log('API Key exists:', !!process.env.YOUTUBE_API_KEY);
// Removed sensitive debug information about API key length and environment variables

// Run main function if this is the main module and not being imported for tests
if (import.meta.url.endsWith('fetchNewVideos.js') && !process.env.VITEST) {
  logger.log('Running main function...');
  main().catch(err => {
    logger.error('Error in main function:', err);
    process.exit(1);
  });
}

// Export functions for use in other scripts
export {
  fetchChannelVideos,
  isVideoProcessed,
  processVideo,
  main
};
