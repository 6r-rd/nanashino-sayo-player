/**
 * Test script to verify the song matching logic
 * This script tests the findOrCreateSong function with various scenarios
 */

// Set environment variable to prevent main function from running
process.env.VITEST = 'true';

import { findOrCreateSong, normalizeSongTitle } from './updateVideoData.js';
import * as fs from 'fs';
import * as path from 'path';

// Load songs data
const SONGS_JSON_PATH = path.join(process.cwd(), 'public', 'songs.json');
const songsData = JSON.parse(fs.readFileSync(SONGS_JSON_PATH, 'utf8'));

console.log(`Loaded ${songsData.songs.length} songs from songs.json`);

// Test cases
const testCases = [
  {
    title: "Exact match with artist",
    songTitle: "Supernova",
    artistIds: ["irSwKLQP04X"], // 七篠さよ
    expectedResult: "Should find existing song"
  },
  {
    title: "Match with (オリ曲) suffix",
    songTitle: "Supernova (オリ曲)",
    artistIds: [],
    expectedResult: "Should find existing song by removing (オリ曲)"
  },
  {
    title: "Match with （オリ曲） suffix (full-width)",
    songTitle: "Supernova （オリ曲）",
    artistIds: [],
    expectedResult: "Should find existing song by removing （オリ曲）"
  },
  {
    title: "Match with no artist",
    songTitle: "Supernova",
    artistIds: [],
    expectedResult: "Should find existing song by title only"
  },
  {
    title: "Non-existent song",
    songTitle: "This Song Does Not Exist",
    artistIds: [],
    expectedResult: "Should create a new song"
  }
];

// Test normalizeSongTitle function
console.log("\nTesting normalizeSongTitle function...\n");

const normalizationTests = [
  { input: "Supernova (オリ曲)", expected: "Supernova" },
  { input: "Supernova （オリ曲）", expected: "Supernova" },
  { input: "Supernova(オリ曲)", expected: "Supernova" },
  { input: "Supernova（オリ曲）", expected: "Supernova" },
  { input: "春風に乗せて。 (オリ曲)", expected: "春風に乗せて。" },
  { input: "BrokenDaybreak (オリ曲)", expected: "BrokenDaybreak" },
  { input: "Supernova", expected: "Supernova" } // No change expected
];

for (const test of normalizationTests) {
  const result = normalizeSongTitle(test.input);
  console.log(`Input: "${test.input}"`);
  console.log(`Result: "${result}"`);
  console.log(`Expected: "${test.expected}"`);
  console.log(`Test ${result === test.expected ? 'PASSED' : 'FAILED'}`);
  console.log("-----------------------------------");
}

// Run song matching tests
console.log("\nRunning song matching test cases...\n");

for (const testCase of testCases) {
  console.log(`Test: ${testCase.title}`);
  console.log(`Song Title: "${testCase.songTitle}"`);
  console.log(`Artist IDs: ${testCase.artistIds.length > 0 ? testCase.artistIds.join(', ') : 'None'}`);
  
  const result = findOrCreateSong(testCase.songTitle, testCase.artistIds, songsData.songs);
  
  console.log(`Result: ${result.isNew ? 'Created new song' : 'Found existing song'}`);
  
  if (!result.isNew) {
    // Find the matched song to display details
    const matchedSong = songsData.songs.find(song => song.song_id === result.songId);
    console.log(`Matched to: "${matchedSong.title}" (ID: ${matchedSong.song_id})`);
    console.log(`Song artists: ${matchedSong.artist_ids.join(', ')}`);
  } else {
    console.log(`New song ID: ${result.songId}`);
  }
  
  console.log(`Expected: ${testCase.expectedResult}`);
  console.log("-----------------------------------");
}

console.log("\nTest completed.");
