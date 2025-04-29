import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const artistId = args.includes('--artist-id') 
  ? args[args.indexOf('--artist-id') + 1] 
  : 'q3Me7gAkmpt'; // デフォルトは q3Me7gAkmpt

// Read songs.json
const songsPath = path.join(__dirname, '..', 'public', 'songs.json');
const songsData = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
const songs = songsData.songs;

// Create a map of titles to song records
const titleMap = new Map();
const duplicates = [];

// Find duplicates
songs.forEach(song => {
  if (titleMap.has(song.title)) {
    // Found a duplicate
    const existingSong = titleMap.get(song.title);
    duplicates.push({
      title: song.title,
      songs: [existingSong, song]
    });
  } else {
    titleMap.set(song.title, song);
  }
});

// Check for duplicates where one has specified artist_id and the other doesn't
const validMergePairs = duplicates.filter(dup => {
  const hasArtist1 = dup.songs[0].artist_ids.includes(artistId);
  const hasArtist2 = dup.songs[1].artist_ids.includes(artistId);
  return (hasArtist1 && !hasArtist2) || (!hasArtist1 && hasArtist2);
});

console.log('Found ' + duplicates.length + ' duplicate titles:');
duplicates.forEach(dup => {
  console.log('\nTitle: ' + dup.title);
  dup.songs.forEach((song, i) => {
    console.log('Song ' + (i+1) + ':');
    console.log('  song_id: ' + song.song_id);
    console.log('  artist_ids: ' + JSON.stringify(song.artist_ids));
  });
});

console.log('\n' + validMergePairs.length + ' valid merge pairs found:');
validMergePairs.forEach(pair => {
  console.log('\nTitle: ' + pair.title);
  pair.songs.forEach((song, i) => {
    const hasArtist = song.artist_ids.includes(artistId);
    console.log('Song ' + (i+1) + ' (' + (hasArtist ? 'Record A' : 'Record B') + '):');
    console.log('  song_id: ' + song.song_id);
    console.log('  artist_ids: ' + JSON.stringify(song.artist_ids));
  });
});

// Create a map of song_ids to be replaced
const songIdMap = new Map();
validMergePairs.forEach(pair => {
  const recordA = pair.songs.find(song => song.artist_ids.includes(artistId));
  const recordB = pair.songs.find(song => !song.artist_ids.includes(artistId));
  if (recordA && recordB) {
    songIdMap.set(recordA.song_id, recordB.song_id);
  }
});

console.log('\nSong IDs to be replaced:');
songIdMap.forEach((newId, oldId) => {
  console.log(`${oldId} -> ${newId}`);
});

// Check video files for references to the song_ids to be replaced
const videosDir = path.join(__dirname, '..', 'public', 'videos');
const videoFiles = fs.readdirSync(videosDir);
const affectedVideos = [];

videoFiles.forEach(file => {
  if (file.endsWith('.json')) {
    const videoPath = path.join(videosDir, file);
    const videoData = JSON.parse(fs.readFileSync(videoPath, 'utf8'));
    
    if (videoData.timestamps) {
      const hasReferences = videoData.timestamps.some(timestamp => 
        songIdMap.has(timestamp.song_id)
      );
      
      if (hasReferences) {
        affectedVideos.push({
          video_id: videoData.video_id,
          file: file,
          path: videoPath,
          data: videoData,
          references: videoData.timestamps
            .filter(timestamp => songIdMap.has(timestamp.song_id))
            .map(timestamp => ({
              time: timestamp.time,
              old_song_id: timestamp.song_id,
              new_song_id: songIdMap.get(timestamp.song_id)
            }))
        });
      }
    }
  }
});

console.log('\nAffected video files: ' + affectedVideos.length);
affectedVideos.forEach(video => {
  console.log(`\nVideo: ${video.video_id} (${video.file})`);
  video.references.forEach(ref => {
    console.log(`  Time: ${ref.time}, Replace: ${ref.old_song_id} -> ${ref.new_song_id}`);
  });
});

// Perform the updates if not in dry run mode
if (validMergePairs.length > 0) {
  if (dryRun) {
    console.log('\n[DRY RUN] No changes were made. Summary of what would happen:');
    console.log(`- Would remove ${songIdMap.size} duplicate records from songs.json`);
    console.log(`- Would update ${affectedVideos.length} video files`);
    console.log(`- Total references that would be updated: ${affectedVideos.reduce((sum, video) => sum + video.references.length, 0)}`);
  } else {
    // 1. Update songs.json - remove records with specified artist_id
    const songIdsToRemove = Array.from(songIdMap.keys());
    songsData.songs = songsData.songs.filter(song => !songIdsToRemove.includes(song.song_id));
    
    // Write updated songs.json
    fs.writeFileSync(songsPath, JSON.stringify(songsData, null, 2));
    
    // 2. Update video files
    let updatedVideoCount = 0;
    let totalReferencesUpdated = 0;
    
    affectedVideos.forEach(video => {
      let updated = false;
      let referencesUpdated = 0;
      
      // Update timestamps
      video.data.timestamps.forEach(timestamp => {
        if (songIdMap.has(timestamp.song_id)) {
          timestamp.song_id = songIdMap.get(timestamp.song_id);
          updated = true;
          referencesUpdated++;
        }
      });
      
      if (updated) {
        // Write updated video file
        fs.writeFileSync(video.path, JSON.stringify(video.data, null, 2));
        updatedVideoCount++;
        totalReferencesUpdated += referencesUpdated;
      }
    });
    
    console.log('\n===== SUMMARY =====');
    console.log(`- Removed ${songIdsToRemove.length} duplicate records from songs.json`);
    console.log(`- Updated ${updatedVideoCount} video files`);
    console.log(`- Total references updated: ${totalReferencesUpdated}`);
    console.log('===================');
    console.log('\nTask completed successfully!');
  }
} else {
  console.log('\nNo valid merge pairs found. No updates performed.');
}
