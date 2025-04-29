// Artist data structure
export interface ArtistData {
  artist_id: string;
  name: string;
  aliases?: string[];
}

// Song data structure
export interface SongData {
  song_id: string;
  title: string;
  artist_ids: string[];
  alternate_titles?: string[];
  description?: string;
}

// Video timestamp structure
export interface VideoTimestamp {
  time: number;
  original_time: string;
  song_id: string;
  comment_source?: string;
  comment_date?: string;
  description?: string;
}

// Video data structure
export interface VideoData {
  video_id: string;
  title: string;
  start_datetime: string;
  thumbnail_url: string;
  timestamps: VideoTimestamp[];
}

// UI state types
export type UiState = 
  | { view: "player"; videoId: string; startTime?: number }
  | { view: "detail"; songId: string };

// Enriched song data with artist names and play count
export interface EnrichedSongData extends SongData {
  artist_names: string[];
  artist_name: string; // For backward compatibility, joined string of artist names
  count: number;
}

// Enriched timestamp with song and artist information
export interface EnrichedTimestamp extends VideoTimestamp {
  song_title: string;
  artist_name: string;
}

// Video with a specific timestamp for a song
export interface VideoWithTimestamp extends VideoData {
  timestamp: VideoTimestamp;
}
