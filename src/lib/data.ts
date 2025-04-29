import type { ArtistData, SongData, VideoData, VideoTimestamp } from './types';
import { createNamespacedLogger } from './debug';

// データ処理用のロガーを作成
const logger = createNamespacedLogger('data');

// Load all videos from the public directory
export async function getAllVideos(): Promise<VideoData[]> {
  try {
    // First, fetch the list of all video files
    const res = await fetch('/api/videos-list.json');
    
    if (!res.ok) {
      logger.error(`Failed to fetch videos list: ${res.status} ${res.statusText}`);
      return [];
    }
    
    const videosList = await res.json();
    const videoIds = videosList.videos || [];
    
    logger.log(`Found ${videoIds.length} videos in the list`);
    
    // If no videos list is available, try to fetch all videos from the public directory
    if (videoIds.length === 0) {
      logger.log("No videos list found, trying to fetch all videos from the public directory");
      
      // In a client-side context, we can't list directory contents directly
      // So we'll use a fallback approach to fetch known videos
      const fallbackVideoIds = [
        "AZ6KhfbTPDk", "ucwLUtGvltY", "V7cvjjTJp9M", "fjOu8eJD5jA",
        "hWuoRpMuKtw", "pxQDMfL6ckc", "s46rfCM_INE", "fyhd7BTxwJQ",
        "QYIbgN8clIo", "t2PUxKyyLDA", "t08xkND1VGk", "wrqcnT6cBkE",
        "Mvgjsw9UH9M", "oI7XvYKMW2Q", "-myXVfPWTGs", "x_UsqrYrqhk"
      ];
      
      logger.log(`Using fallback list with ${fallbackVideoIds.length} videos`);
      
      const videoPromises = fallbackVideoIds.map(async (videoId: string) => {
        try {
          const res = await fetch(`/videos/${videoId}.json`);
          
          if (!res.ok) {
            logger.error(`Failed to fetch video ${videoId}: ${res.status} ${res.statusText}`);
            return null;
          }
          
          const video = await res.json();
          return {
            video_id: video.video_id,
            title: video.title,
            start_datetime: video.start_datetime,
            thumbnail_url: video.thumbnail_url,
            timestamps: video.timestamps || []
          };
        } catch (error) {
          logger.error(`Error fetching video ${videoId}:`, error);
          return null;
        }
      });
      
      const videos = (await Promise.all(videoPromises)).filter(video => video !== null) as VideoData[];
      
      return videos.sort((a, b) => 
        new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
      );
    }
    
    // Fetch each video's data
    const videoPromises = videoIds.map(async (videoId: string) => {
      try {
        const res = await fetch(`/videos/${videoId}.json`);
        
        if (!res.ok) {
          logger.error(`Failed to fetch video ${videoId}: ${res.status} ${res.statusText}`);
          return null;
        }
        
        const video = await res.json();
        return {
          video_id: video.video_id,
          title: video.title,
          start_datetime: video.start_datetime,
          thumbnail_url: video.thumbnail_url,
          timestamps: video.timestamps || []
        };
      } catch (error) {
        logger.error(`Error fetching video ${videoId}:`, error);
        return null;
      }
    });
    
    const videos = (await Promise.all(videoPromises)).filter(video => video !== null) as VideoData[];
    
    return videos.sort((a, b) => 
      new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
    );
  } catch (error) {
    logger.error("Error fetching videos:", error);
    return [];
  }
}

// Load all songs from songs.json
export async function getAllSongs(): Promise<SongData[]> {
  try {
    // In development, use a direct path to the public directory
    const res = await fetch(`/songs.json`);
    
    if (!res.ok) {
      logger.error(`Failed to fetch songs: ${res.status} ${res.statusText}`);
      return [];
    }
    
    const data = await res.json();
    return data.songs || [];
  } catch (error) {
    logger.error("Error fetching songs:", error);
    return [];
  }
}

// Load all artists from artists.json
export async function getAllArtists(): Promise<ArtistData[]> {
  try {
    // In development, use a direct path to the public directory
    const res = await fetch(`/artists.json`);
    
    if (!res.ok) {
      logger.error(`Failed to fetch artists: ${res.status} ${res.statusText}`);
      return [];
    }
    
    const data = await res.json();
    return data.artists || [];
  } catch (error) {
    logger.error("Error fetching artists:", error);
    return [];
  }
}

// Get artist name by ID
export function getArtistNameById(artists: ArtistData[] | Record<string, string>, artistId: string | string[]): string {
  if (Array.isArray(artistId)) {
    // If it's an array of artist IDs, get all names and join them
    const artistNames = artistId.map(id => {
      if (Array.isArray(artists)) {
        const artist = artists.find(a => a.artist_id === id);
        return artist ? artist.name : '';
      } else {
        return artists[id] || '';
      }
    }).filter(Boolean); // Remove empty strings
    
    return artistNames.length > 0 ? artistNames.join(', ') : '-';
  } else {
    // Single artist ID
    if (Array.isArray(artists)) {
      const artist = artists.find(a => a.artist_id === artistId);
      return artist ? artist.name : '-';
    } else {
      return artists[artistId] || '-';
    }
  }
}

// Get artist names by IDs as an array
export function getArtistNamesByIds(artists: ArtistData[] | Record<string, string>, artistIds: string[]): string[] {
  return artistIds.map(id => {
    if (Array.isArray(artists)) {
      const artist = artists.find(a => a.artist_id === id);
      return artist ? artist.name : '';
    } else {
      return artists[id] || '';
    }
  }).filter(Boolean); // Remove empty strings
}

// Get song by ID
export function getSongById(songs: SongData[], songId: string): SongData | undefined {
  return songs.find(s => s.song_id === songId);
}

// Get video by ID
export function getVideoById(videos: VideoData[], videoId: string): VideoData | undefined {
  return videos.find(v => v.video_id === videoId);
}

// Get all videos containing a specific song
export function getVideosBySongId(videos: VideoData[], songId: string): Array<VideoData & { timestamp: VideoTimestamp }> {
  const result: Array<VideoData & { timestamp: VideoTimestamp }> = [];
  
  videos.forEach(video => {
    video.timestamps.forEach((timestamp: VideoTimestamp) => {
      if (timestamp.song_id === songId) {
        result.push({
          ...video,
          timestamp
        });
      }
    });
  });
  
  return result;
}

// Normalize text for search (Unicode NFC + toLowerCase)
export function normalizeText(text: string): string {
  if (!text) return "";
  return text.normalize('NFC').toLocaleLowerCase('ja');
}

// Search videos by query
export function searchVideos(videos: VideoData[], query: string): VideoData[] {
  if (!query) return videos;
  
  const normalizedQuery = normalizeText(query);
  
  return videos.filter(video => 
    normalizeText(video.title).includes(normalizedQuery)
  );
}

// Search songs by query
export function searchSongs(
  songs: SongData[], 
  artists: ArtistData[] | Record<string, string>, 
  query: string
): SongData[] {
  if (!query) return songs;
  
  const normalizedQuery = normalizeText(query);
  
  // Debug log for search query
  logger.log("Search query:", query);
  logger.log("Normalized query:", normalizedQuery);
  
  return songs.filter(song => {
    // Get all artist names for this song
    const artistNames = getArtistNamesByIds(artists, song.artist_ids);
    const artistNamesString = artistNames.join(', ');
    
    
    return (
      normalizeText(song.title).includes(normalizedQuery) ||
      normalizeText(artistNamesString).includes(normalizedQuery)
    );
  });
}

// Calculate song play count
export function calculateSongPlayCounts(videos: VideoData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  videos.forEach(video => {
    video.timestamps.forEach((timestamp: VideoTimestamp) => {
      const songId = timestamp.song_id;
      counts[songId] = (counts[songId] || 0) + 1;
    });
  });
  
  return counts;
}

// Enrich song data with artist names and play counts
export function enrichSongData(
  songs: SongData[], 
  artists: ArtistData[] | Record<string, string>, 
  playCounts: Record<string, number>
): Array<SongData & { artist_names: string[]; artist_name: string; count: number }> {
  return songs.map(song => {
    // Get artist names based on the type of artists parameter
    let artistNames: string[] = [];
    
    if (Array.isArray(artists)) {
      // If artists is an array of ArtistData
      artistNames = song.artist_ids.map(id => {
        const artist = artists.find(a => a.artist_id === id);
        return artist ? artist.name : '';
      }).filter(Boolean);
    } else {
      // If artists is a Record<string, string>
      artistNames = song.artist_ids.map(id => artists[id] || '').filter(Boolean);
    }
    
    
    return {
      ...song,
      artist_names: artistNames,
      artist_name: artistNames.join(', ') || '-',
      count: playCounts[song.song_id] || 0
    };
  });
}

// Enrich video timestamps with song and artist information
export function enrichVideoTimestamps(
  video: VideoData,
  songs: SongData[],
  artists: ArtistData[] | Record<string, string>
): VideoData & { enriched_timestamps: Array<VideoTimestamp & { song_title: string; artist_name: string }> } {
  const enrichedTimestamps = video.timestamps.map((timestamp: VideoTimestamp) => {
    const song = getSongById(songs, timestamp.song_id);
    const artistName = song ? getArtistNameById(artists, song.artist_ids) : '-';
    
    return {
      ...timestamp,
      song_title: song ? song.title : '-',
      artist_name: artistName
    };
  });
  
  return {
    ...video,
    enriched_timestamps: enrichedTimestamps
  };
}
