/**
 * Test script to verify that existing songs are not updated
 * This script simulates finding a song by title only and checks that artist_ids are not updated
 */

// Set environment variable to prevent main function from running
process.env.VITEST = 'true';

import { findOrCreateSong } from './updateVideoData.js';
import * as fs from 'fs';
import * as path from 'path';

// Create a test song array
const testSongs = [
  {
    song_id: 'test-song-1',
    title: 'テスト曲',
    artist_ids: ['artist-1', 'artist-2']
  }
];

console.log('Original song:');
console.log(JSON.stringify(testSongs[0], null, 2));

// Test finding a song by title only with different artist IDs
console.log('\nFinding song by title with different artist IDs:');
const result = findOrCreateSong('テスト曲', ['artist-3'], testSongs);

console.log('Result:', result);
console.log('\nSong after findOrCreateSong:');
console.log(JSON.stringify(testSongs[0], null, 2));

// Verify that artist_ids were not updated
const artistIdsUnchanged = 
  JSON.stringify(testSongs[0].artist_ids) === JSON.stringify(['artist-1', 'artist-2']);

console.log('\nArtist IDs unchanged:', artistIdsUnchanged);
console.log('Test result:', artistIdsUnchanged ? 'PASSED' : 'FAILED');
