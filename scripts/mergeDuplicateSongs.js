import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Check for duplicates where one has artist_id q3Me7gAkmpt and the other doesn't
const validMergePairs = duplicates.filter(dup => {
  const hasQ3Me = dup.songs[0].artist_ids.includes('q3Me7gAkmpt');
  const hasQ3Me2 = dup.songs[1].artist_ids.includes('q3Me7gAkmpt');
  return (hasQ3Me && !hasQ3Me2) || (!hasQ3Me && hasQ3Me2);
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
    const hasQ3Me = song.artist_ids.includes('q3Me7gAkmpt');
    console.log('Song ' + (i+1) + ' (' + (hasQ3Me ? 'Record A' : 'Record B') + '):');
    console.log('  song_id: ' + song.song_id);
    console.log('  artist_ids: ' + JSON.stringify(song.artist_ids));
  });
});

// Create a map of song_ids to be replaced
const songIdMap = new Map();
validMergePairs.forEach(pair => {
  const recordA = pair.songs.find(song => song.artist_ids.includes('q3Me7gAkmpt'));
  const recordB = pair.songs.find(song => !song.artist_ids.includes('q3Me7gAkmpt'));
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

// Perform the updates
if (validMergePairs.length > 0) {
  // 1. Update songs.json - remove records with artist_id q3Me7gAkmpt
  const songIdsToRemove = Array.from(songIdMap.keys());
  songsData.songs = songsData.songs.filter(song => !songIdsToRemove.includes(song.song_id));
  
  // Write updated songs.json
  fs.writeFileSync(songsPath, JSON.stringify(songsData, null, 2));
  console.log('\nUpdated songs.json - removed ' + songIdsToRemove.length + ' duplicate records');
  
  // 2. Update video files
  let updatedVideoCount = 0;
  affectedVideos.forEach(video => {
    let updated = false;
    
    // Update timestamps
    video.data.timestamps.forEach(timestamp => {
      if (songIdMap.has(timestamp.song_id)) {
        timestamp.song_id = songIdMap.get(timestamp.song_id);
        updated = true;
      }
    });
    
    if (updated) {
      // Write updated video file
      fs.writeFileSync(video.path, JSON.stringify(video.data, null, 2));
      updatedVideoCount++;
    }
  });
  
  console.log(`Updated ${updatedVideoCount} video files`);
  console.log('\nTask completed successfully!');
} else {
  console.log('\nNo valid merge pairs found. No updates performed.');
}
