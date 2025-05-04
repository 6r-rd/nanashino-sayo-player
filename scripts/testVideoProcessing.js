/**
 * Test script to verify video processing with a real example
 * This script processes a video with the issue described in the original problem
 */

// Set environment variable to prevent main function from running
process.env.VITEST = 'true';

import { processVideo } from './updateVideoData.js';
import * as fs from 'fs';
import * as path from 'path';

// Video ID to test
const VIDEO_ID = 'NFocpAOUfSs'; // This is one of the videos mentioned in the problem

// Function to compare song counts before and after processing
async function testVideoProcessing() {
  console.log(`Testing video processing for video ID: ${VIDEO_ID}`);
  
  // Load songs data before processing
  const SONGS_JSON_PATH = path.join(process.cwd(), 'public', 'songs.json');
  const songsDataBefore = JSON.parse(fs.readFileSync(SONGS_JSON_PATH, 'utf8'));
  console.log(`Songs count before processing: ${songsDataBefore.songs.length}`);
  
  // Process the video
  try {
    await processVideo(VIDEO_ID);
    
    // Load songs data after processing
    const songsDataAfter = JSON.parse(fs.readFileSync(SONGS_JSON_PATH, 'utf8'));
    console.log(`Songs count after processing: ${songsDataAfter.songs.length}`);
    
    // Check if any new songs were added
    const newSongsCount = songsDataAfter.songs.length - songsDataBefore.songs.length;
    console.log(`New songs added: ${newSongsCount}`);
    
    if (newSongsCount > 0) {
      console.log("New songs:");
      const newSongs = songsDataAfter.songs.slice(-newSongsCount);
      for (const song of newSongs) {
        console.log(`- "${song.title}" (ID: ${song.song_id})`);
      }
    } else {
      console.log("No new songs were added, which is good if all songs already existed!");
    }
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error processing video:", error);
  }
}

// Run the test
testVideoProcessing();
