/**
 * Utility functions for generating unique IDs that match the pattern ^[A-Za-z0-9_-]{11}$
 * Used by GitHub Actions to create commits and pull requests that add songs/artists data
 */

/**
 * Generates a random ID that matches the pattern ^[A-Za-z0-9_-]{11}$
 * @param {string[]} existingIds - An array of existing IDs to check for uniqueness
 * @returns {string} A unique 11-character ID
 */
function generateUniqueId(existingIds = []) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const length = 11;
  
  let id = '';
  let isUnique = false;
  
  // Keep generating IDs until we find a unique one
  while (!isUnique) {
    id = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      id += characters.charAt(randomIndex);
    }
    
    // Check if this ID already exists
    isUnique = !existingIds.includes(id);
  }
  
  return id;
}

/**
 * Generates a unique artist ID
 * @param {Array<{artist_id: string}>} artists - The existing artists array
 * @returns {string} A unique artist ID
 */
function generateArtistId(artists) {
  const existingIds = artists.map(artist => artist.artist_id);
  return generateUniqueId(existingIds);
}

/**
 * Generates a unique song ID
 * @param {Array<{song_id: string}>} songs - The existing songs array
 * @returns {string} A unique song ID
 */
function generateSongId(songs) {
  const existingIds = songs.map(song => song.song_id);
  return generateUniqueId(existingIds);
}

export {
  generateUniqueId,
  generateArtistId,
  generateSongId
};
