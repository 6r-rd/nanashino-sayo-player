/**
 * Script to delete data files for channel switching
 * 
 * This script deletes:
 * - public/api/videos-list.json
 * - public/videos/*.json
 * - public/artists.json
 * - public/songs.json
 * 
 * It checks if the current channel ID in .env matches the one in videos-list.json
 * and only deletes files if they don't match (unless forced with --force flag)
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createNamespacedLogger } from './debug.js';

// スクリプト用のロガーを作成
const logger = createNamespacedLogger('script:destroy');

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const VIDEOS_DIR = path.join(PUBLIC_DIR, 'videos');
const API_DIR = path.join(PUBLIC_DIR, 'api');
const VIDEOS_LIST_PATH = path.join(API_DIR, 'videos-list.json');
const SONGS_JSON_PATH = path.join(PUBLIC_DIR, 'songs.json');
const ARTISTS_JSON_PATH = path.join(PUBLIC_DIR, 'artists.json');

// Check if --force flag is provided
const forceDelete = process.argv.includes('--force');

/**
 * Delete a file if it exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file was deleted, false if it didn't exist
 */
function deleteFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logger.log(`Deleted: ${filePath}`);
    return true;
  }
  return false;
}

/**
 * Delete all JSON files in a directory
 * @param {string} dirPath - Path to the directory
 * @returns {number} Number of files deleted
 */
function deleteAllJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  const files = fs.readdirSync(dirPath);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  let deletedCount = 0;
  for (const file of jsonFiles) {
    const filePath = path.join(dirPath, file);
    fs.unlinkSync(filePath);
    deletedCount++;
  }
  
  logger.log(`Deleted ${deletedCount} JSON files from ${dirPath}`);
  return deletedCount;
}

/**
 * Main function to delete data files
 */
function destroyData() {
  try {
    // Get current channel ID from .env
    const currentChannelId = process.env.YOUTUBE_CHANNEL_ID;
    if (!currentChannelId) {
      logger.error('YOUTUBE_CHANNEL_ID is not set in .env file');
      process.exit(1);
    }
    
    // Check if videos-list.json exists
    if (fs.existsSync(VIDEOS_LIST_PATH)) {
      // Read channel ID from videos-list.json
      const videosListData = JSON.parse(fs.readFileSync(VIDEOS_LIST_PATH, 'utf8'));
      const storedChannelId = videosListData.channel_id;
      
      // If channel IDs match and not forced, don't delete
      if (storedChannelId === currentChannelId && !forceDelete) {
        logger.log('Current channel ID matches stored channel ID. No files will be deleted.');
        logger.log('Use --force flag to delete files anyway.');
        return;
      }
      
      // Log channel ID mismatch
      if (storedChannelId !== currentChannelId) {
        logger.log(`Channel ID mismatch: stored=${storedChannelId}, current=${currentChannelId}`);
      } else if (forceDelete) {
        logger.log('Force delete enabled. Deleting files even though channel IDs match.');
      }
    }
    
    // Delete files
    let deletedCount = 0;
    
    // Delete videos-list.json
    if (deleteFileIfExists(VIDEOS_LIST_PATH)) {
      deletedCount++;
    }
    
    // Delete all JSON files in videos directory
    deletedCount += deleteAllJsonFiles(VIDEOS_DIR);
    
    // Delete songs.json and artists.json
    if (deleteFileIfExists(SONGS_JSON_PATH)) {
      deletedCount++;
    }
    if (deleteFileIfExists(ARTISTS_JSON_PATH)) {
      deletedCount++;
    }
    
    logger.log(`Successfully deleted ${deletedCount} files`);
    logger.log('You can now run "npm run backfill" to fetch data for a new channel');
    
  } catch (error) {
    logger.error('Error deleting files:', error);
    process.exit(1);
  }
}

// Run the function if this is the main module
if (import.meta.url.endsWith('destroy.js')) {
  destroyData();
}

// Export the function for use in other scripts
export { destroyData };
