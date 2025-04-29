import { vi } from 'vitest';
import videoResponseData from '../fixtures/videoResponse.json';
import commentsResponseData from '../fixtures/commentsResponse.json';
import songsData from '../fixtures/songs.json';
import artistsData from '../fixtures/artists.json';

/**
 * Mock for the fetch function to simulate YouTube API responses
 */
export const mockFetch = vi.fn().mockImplementation((url) => {
  if (url.includes('/videos?')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(videoResponseData)
    });
  }
  if (url.includes('/commentThreads?')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(commentsResponseData)
    });
  }
  return Promise.reject(new Error(`Unexpected URL: ${url}`));
});

/**
 * Mock for the fs module
 */
export const mockFs = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
};

/**
 * Setup fs mocks with default behavior
 */
export function setupFsMocks() {
  // Default behavior for existsSync
  mockFs.existsSync.mockImplementation((path) => {
    if (path.includes('songs.json')) return true;
    if (path.includes('artists.json')) return true;
    if (path.includes('public')) return true;
    if (path.includes('videos')) return true;
    return false;
  });
  
  // Default behavior for readFileSync
  mockFs.readFileSync.mockImplementation((path) => {
    if (path.includes('songs.json')) return JSON.stringify(songsData);
    if (path.includes('artists.json')) return JSON.stringify(artistsData);
    return '';
  });
  
  // Default behavior for writeFileSync and mkdirSync
  mockFs.writeFileSync.mockImplementation(() => undefined);
  mockFs.mkdirSync.mockImplementation(() => undefined);
}

/**
 * Mock for the ID generation functions
 */
export const mockGenerateIds = {
  generateArtistId: vi.fn().mockReturnValue('new-artist-id'),
  generateSongId: vi.fn().mockReturnValue('new-song-id')
};

// Set up the mock implementation for the generateId module
vi.mock('../../generateId.js', () => ({
  generateArtistId: mockGenerateIds.generateArtistId,
  generateSongId: mockGenerateIds.generateSongId
}));

/**
 * Setup environment variables for tests
 */
export function setupEnv() {
  const originalEnv = { ...process.env };
  
  // Set test environment variables
  process.env.YOUTUBE_API_KEY = 'test-api-key';
  
  return {
    // Function to restore original environment
    restore: () => {
      process.env = originalEnv;
    }
  };
}

/**
 * Mock console methods to prevent noise in test output
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error
  };
  
  console.log = vi.fn();
  console.error = vi.fn();
  
  return {
    // Function to restore original console methods
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
    }
  };
}
