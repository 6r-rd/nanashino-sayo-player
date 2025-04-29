/**
 * Script to generate a list of all video IDs from the public/videos directory
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createNamespacedLogger } from './debug.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// スクリプト用のロガーを作成
const logger = createNamespacedLogger('script:generateList');

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const VIDEOS_DIR = path.join(PUBLIC_DIR, 'videos');
const API_DIR = path.join(PUBLIC_DIR, 'api');
const VIDEOS_LIST_PATH = path.join(API_DIR, 'videos-list.json');

// Ensure directories exist
if (!fs.existsSync(API_DIR)) {
  fs.mkdirSync(API_DIR, { recursive: true });
}

/**
 * Generate a list of all video IDs from the public/videos directory
 */
function generateVideosList() {
  try {
    // Get all JSON files in the videos directory
    const files = fs.readdirSync(VIDEOS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // Extract video IDs from filenames
    const videoIds = jsonFiles.map(file => file.replace('.json', ''));
    
    logger.log(`Found ${videoIds.length} videos`);
    
    // Create videos-list.json with channel_id
    const videosListData = {
      videos: videoIds,
      generated_at: new Date().toISOString(),
      channel_id: process.env.YOUTUBE_CHANNEL_ID || 'unknown'
    };
    
    fs.writeFileSync(VIDEOS_LIST_PATH, JSON.stringify(videosListData, null, 2));
    
    logger.log(`Generated videos-list.json with ${videoIds.length} videos`);
  } catch (error) {
    logger.error('Error generating videos list:', error);
    // Only exit the process if not in a test environment
    if (!process.env.VITEST) {
      process.exit(1);
    }
  }
}

// Run the function if this is the main module and not in a test environment
if (import.meta.url.endsWith('generateVideosList.js') && !process.env.VITEST) {
  generateVideosList();
}

// Export the function for use in other scripts
export { generateVideosList };
