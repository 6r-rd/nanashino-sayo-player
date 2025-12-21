import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVideo } from '../../updateVideoData.js';
import * as fs from 'fs';

// Mock dependencies
vi.mock('../../generateId.js', () => ({
  generateArtistId: vi.fn().mockReturnValue('mock-artist-id'),
  generateSongId: vi.fn().mockReturnValue('mock-song-id')
}));

vi.mock('../../generateVideosList.js', () => ({
  generateVideosList: vi.fn()
}));

// Mock fs functions
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn()
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn()
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Timestamp Prioritization Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    process.env.YOUTUBE_API_KEY = 'mock-api-key';
    
    // Mock fetch responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('videos?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [{
              snippet: {
                title: 'Test Video',
                description: '', // Will be set in individual tests
                publishedAt: '2023-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: 'https://example.com/thumbnail.jpg' }
                }
              }
            }]
          })
        });
      } else if (url.includes('commentThreads?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [] // Will be set in individual tests
          })
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });
  
  it('prioritizes description timestamps when they include a 0:00 timestamp', async () => {
    // Setup description with 0:00 timestamp
    const description = `
      00:00 イントロ
      00:06:25 星を編む / seiza
      00:20:38 トレモロ / RADWIMPS
    `;
    
    // Setup comments with different timestamps
    const comments = [{
      snippet: {
        topLevelComment: {
          snippet: {
            textDisplay: '00:05:00 別の曲 / 別のアーティスト',
            publishedAt: '2023-01-01T00:00:00Z',
            likeCount: 10
          }
        }
      }
    }];
    
    // Mock fetch to return our test data
    global.fetch.mockImplementation((url) => {
      if (url.includes('videos?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [{
              snippet: {
                title: 'Test Video',
                description: description,
                publishedAt: '2023-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: 'https://example.com/thumbnail.jpg' }
                }
              }
            }]
          })
        });
      } else if (url.includes('commentThreads?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: comments
          })
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
    
    // Mock fs.writeFileSync to capture the written data
    let capturedVideoData = null;
    fs.writeFileSync.mockImplementation((path, data) => {
      if (path.includes('test-video-id.json')) {
        capturedVideoData = JSON.parse(data);
      }
    });
    
    // Process the video
    await processVideo('test-video-id');
    
    // Verify that description timestamps were used
    expect(capturedVideoData).not.toBeNull();
    expect(capturedVideoData.timestamps).toHaveLength(2);
    expect(capturedVideoData.timestamps.every(ts => ts.comment_source === 'description')).toBe(true);
    expect(capturedVideoData.timestamps[0].original_time).toBe('00:06:25');
    expect(capturedVideoData.timestamps[1].original_time).toBe('00:20:38');
    expect(capturedVideoData.timestamps.map(ts => ts.original_time)).not.toContain('00:00');
  });

  it('uses comment timestamps when user comment option is enabled', async () => {
    const description = `
      00:00 イントロ
      00:03:15 説明用の時間
      00:10:00 タイトル / アーティスト
    `;

    const comments = [{
      snippet: {
        topLevelComment: {
          snippet: {
            textDisplay: '00:06:25 星を編む / seiza\n00:20:38 トレモロ / RADWIMPS',
            publishedAt: '2023-01-01T00:00:00Z',
            likeCount: 10
          }
        }
      }
    }];

    global.fetch.mockImplementation((url) => {
      if (url.includes('videos?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [{
              snippet: {
                title: 'Test Video',
                description: description,
                publishedAt: '2023-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: 'https://example.com/thumbnail.jpg' }
                }
              }
            }]
          })
        });
      } else if (url.includes('commentThreads?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: comments
          })
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    let capturedVideoData = null;
    fs.writeFileSync.mockImplementation((path, data) => {
      if (path.includes('test-video-id.json')) {
        capturedVideoData = JSON.parse(data);
      }
    });

    await processVideo('test-video-id', { useUserComment: true });

    expect(capturedVideoData).not.toBeNull();
    expect(capturedVideoData.timestamps).toHaveLength(2);
    expect(capturedVideoData.timestamps.every(ts => ts.comment_source === 'comment')).toBe(true);
    expect(capturedVideoData.timestamps[0].original_time).toBe('00:06:25');
    expect(capturedVideoData.timestamps[1].original_time).toBe('00:20:38');
  });
  
  it('prioritizes comment timestamps when description has timestamps but no 0:00 timestamp', async () => {
    // Setup description with timestamps but no 0:00
    const description = `
      20:00 から新曲のプレミア公開があります
      30:00 に生配信を開始します
    `;
    
    // Setup comments with song timestamps
    const comments = [{
      snippet: {
        topLevelComment: {
          snippet: {
            textDisplay: '00:06:25 星を編む / seiza\n00:20:38 トレモロ / RADWIMPS',
            publishedAt: '2023-01-01T00:00:00Z',
            likeCount: 10
          }
        }
      }
    }];
    
    // Mock fetch to return our test data
    global.fetch.mockImplementation((url) => {
      if (url.includes('videos?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [{
              snippet: {
                title: 'Test Video',
                description: description,
                publishedAt: '2023-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: 'https://example.com/thumbnail.jpg' }
                }
              }
            }]
          })
        });
      } else if (url.includes('commentThreads?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: comments
          })
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
    
    // Mock fs.writeFileSync to capture the written data
    let capturedVideoData = null;
    fs.writeFileSync.mockImplementation((path, data) => {
      if (path.includes('test-video-id.json')) {
        capturedVideoData = JSON.parse(data);
      }
    });
    
    // Process the video
    await processVideo('test-video-id');
    
    // Verify that comment timestamps were used
    expect(capturedVideoData).not.toBeNull();
    expect(capturedVideoData.timestamps.length).toBeGreaterThan(0);
    expect(capturedVideoData.timestamps[0].comment_source).toBe('comment');
    expect(capturedVideoData.timestamps[0].original_time).toBe('00:06:25');
  });
  
  it('falls back to description timestamps when no comments have timestamps', async () => {
    // Setup description with timestamps but no 0:00
    const description = `
      00:06:25 星を編む / seiza
      00:20:38 トレモロ / RADWIMPS
    `;
    
    // Setup comments with no timestamps
    const comments = [{
      snippet: {
        topLevelComment: {
          snippet: {
            textDisplay: 'Great video!',
            publishedAt: '2023-01-01T00:00:00Z',
            likeCount: 10
          }
        }
      }
    }];
    
    // Mock fetch to return our test data
    global.fetch.mockImplementation((url) => {
      if (url.includes('videos?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [{
              snippet: {
                title: 'Test Video',
                description: description,
                publishedAt: '2023-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: 'https://example.com/thumbnail.jpg' }
                }
              }
            }]
          })
        });
      } else if (url.includes('commentThreads?part=snippet')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: comments
          })
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
    
    // Mock fs.writeFileSync to capture the written data
    let capturedVideoData = null;
    fs.writeFileSync.mockImplementation((path, data) => {
      if (path.includes('test-video-id.json')) {
        capturedVideoData = JSON.parse(data);
      }
    });
    
    // Process the video
    await processVideo('test-video-id');
    
    // Verify that description timestamps were used as fallback
    expect(capturedVideoData).not.toBeNull();
    expect(capturedVideoData.timestamps.length).toBeGreaterThan(0);
    expect(capturedVideoData.timestamps[0].comment_source).toBe('comment');
    expect(capturedVideoData.timestamps[0].original_time).toBe('00:06:25');
  });
});
