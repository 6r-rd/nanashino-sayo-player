/**
 * Script to fetch all videos from a YouTube channel and process karaoke streams
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
const logger = createNamespacedLogger('script:fetchAll');

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const VIDEOS_DIR = path.join(PUBLIC_DIR, 'videos');
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.argv[2] || process.env.YOUTUBE_CHANNEL_ID;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '0', 10);
const BATCH_START = parseInt(process.env.BATCH_START || '0', 10);

// Get uploads playlist ID from channel
async function getUploadsPlaylistId() {
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }
  
  if (!CHANNEL_ID) {
    throw new Error('Channel ID must be provided as an argument or YOUTUBE_CHANNEL_ID environment variable');
  }
  
  logger.log(`Fetching channel details for: ${CHANNEL_ID}`);
  
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch channel details: ${response.statusText}`);
  }
  
  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found: ${CHANNEL_ID}`);
  }
  
  const uploadsPlaylistId = data.items[0].contentDetails.relatedPlaylists.uploads;
  logger.log(`Uploads playlist ID: ${uploadsPlaylistId}`);
  
  return uploadsPlaylistId;
}

// Fetch all videos from uploads playlist
async function fetchAllChannelVideos() {
  const uploadsPlaylistId = await getUploadsPlaylistId();
  
  logger.log(`Fetching videos from uploads playlist: ${uploadsPlaylistId}`);
  
  let allItems = [];
  let nextPageToken = undefined;
  let totalProcessed = 0;
  
  // Fetch all pages
  do {
    const pageParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}${pageParam}&key=${API_KEY}`;
    
    logger.log(`Fetching page ${Math.floor(totalProcessed / 50) + 1}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist items: ${response.statusText}`);
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    // Filter for videos with "歌枠" in the title
    const filteredItems = items.filter(item => {
      const title = item.snippet.title;
      return title.includes('歌枠');
    });
    
    allItems = [...allItems, ...filteredItems];
    totalProcessed += items.length;
    
    logger.log(`Processed ${items.length} items, found ${filteredItems.length} karaoke streams`);
    
    nextPageToken = data.nextPageToken;
    
    // Add a small delay to avoid rate limiting
    if (nextPageToken) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } while (nextPageToken);
  
  logger.log(`Total: processed ${totalProcessed} videos, found ${allItems.length} karaoke streams`);
  
  // Extract video IDs and metadata
  return allItems.map(item => ({
    id: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt
  }));
}

// Check if a video has already been processed
function isVideoProcessed(videoId) {
  return fs.existsSync(path.join(VIDEOS_DIR, `${videoId}.json`));
}

// Process a video
function processVideo(videoId) {
  logger.log(`Processing video: ${videoId}`);
  
  try {
    // Run the updateVideoData script with node
    execSync(`node scripts/updateVideoData.js ${videoId}`, {
      stdio: 'inherit',
      env: process.env
    });
    
    logger.log(`Successfully processed video: ${videoId}`);
    return true;
  } catch (error) {
    logger.error(`Error processing video ${videoId}:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    // Fetch all videos from channel
    const videos = await fetchAllChannelVideos();
    logger.log(`Found ${videos.length} karaoke streams in channel`);
    
    // Sort videos by published date (newest first)
    videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Filter out videos that have already been processed
    const newVideos = videos.filter(video => !isVideoProcessed(video.id));
    logger.log(`Found ${newVideos.length} new karaoke streams to process`);
    
    // Apply batch processing if specified
    let videosToProcess = newVideos;
    if (BATCH_SIZE > 0) {
      const startIndex = BATCH_START;
      const endIndex = Math.min(startIndex + BATCH_SIZE, newVideos.length);
      videosToProcess = newVideos.slice(startIndex, endIndex);
      logger.log(`Processing batch ${BATCH_START} to ${endIndex - 1} (${videosToProcess.length} videos)`);
    }
    
    // Process each new video
    let successCount = 0;
    let failCount = 0;
    
    for (const video of videosToProcess) {
      logger.log(`Processing ${video.title} (${video.id})`);
      const success = processVideo(video.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add a delay between processing videos to avoid rate limiting
      if (videosToProcess.indexOf(video) < videosToProcess.length - 1) {
        logger.log('Waiting 2 seconds before processing next video...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    logger.log(`Finished processing videos. Success: ${successCount}, Failed: ${failCount}`);
    
    // Generate videos list after processing videos
    if (successCount > 0) {
      logger.log('Generating videos list...');
      generateVideosList();
    }
    
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Run main function if this is the main module
if (import.meta.url.endsWith('fetchAllChannelVideos.js')) {
  logger.log('Running main function...');
  main().catch(err => {
    logger.error('Error in main function:', err);
    process.exit(1);
  });
}

// Export functions for use in other scripts
export {
  getUploadsPlaylistId,
  fetchAllChannelVideos,
  isVideoProcessed,
  processVideo,
  main
};
