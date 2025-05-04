/**
 * Test script to verify that songs by 七篠さよ (artist_id: irSwKLQP04X) are prioritized
 * when there are multiple songs with the same title.
 */

// Set environment variable to prevent main function from running
process.env.VITEST = 'true';

import { findOrCreateSong } from './updateVideoData.js';

// Create a test song array with multiple songs having the same title
const testSongs = [
  {
    song_id: 'song-1',
    title: 'テスト曲',
    artist_ids: ['artist-1']
  },
  {
    song_id: 'song-2',
    title: 'テスト曲',
    artist_ids: ['irSwKLQP04X'] // 七篠さよのID
  },
  {
    song_id: 'song-3',
    title: 'テスト曲',
    artist_ids: ['artist-3']
  },
  {
    song_id: 'song-4',
    title: '別の曲',
    artist_ids: ['artist-4']
  }
];

console.log('Test songs:');
testSongs.forEach(song => {
  console.log(`- ${song.song_id}: "${song.title}" by ${song.artist_ids.join(', ')}`);
});

// Test 1: Finding a song by title only (should prioritize 七篠さよ's version)
console.log('\nTest 1: Finding a song by title only');
const result1 = findOrCreateSong('テスト曲', [], testSongs);
console.log('Result:', result1);
console.log('Expected song_id:', 'song-2');
console.log('Test passed:', result1.songId === 'song-2');

// Test 2: Finding a song by title with a different artist
console.log('\nTest 2: Finding a song by title with a different artist');
const result2 = findOrCreateSong('テスト曲', ['new-artist'], testSongs);
console.log('Result:', result2);
console.log('Expected song_id:', 'song-2');
console.log('Test passed:', result2.songId === 'song-2');

// Test 3: Finding a song by title and matching artist
console.log('\nTest 3: Finding a song by title and matching artist');
const result3 = findOrCreateSong('テスト曲', ['artist-1'], testSongs);
console.log('Result:', result3);
console.log('Expected song_id:', 'song-1');
console.log('Test passed:', result3.songId === 'song-1');

// Test 4: Finding a song by title and 七篠さよ's ID
console.log('\nTest 4: Finding a song by title and 七篠さよ\'s ID');
const result4 = findOrCreateSong('テスト曲', ['irSwKLQP04X'], testSongs);
console.log('Result:', result4);
console.log('Expected song_id:', 'song-2');
console.log('Test passed:', result4.songId === 'song-2');

// Test 5: Finding a song that doesn't exist
console.log('\nTest 5: Finding a song that doesn\'t exist');
const result5 = findOrCreateSong('存在しない曲', [], testSongs);
console.log('Result:', result5);
console.log('Expected isNew:', true);
console.log('Test passed:', result5.isNew === true);

// Summary
console.log('\nSummary:');
console.log('Test 1 passed:', result1.songId === 'song-2');
console.log('Test 2 passed:', result2.songId === 'song-2');
console.log('Test 3 passed:', result3.songId === 'song-1');
console.log('Test 4 passed:', result4.songId === 'song-2');
console.log('Test 5 passed:', result5.isNew === true);
