import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../../updateVideoData.js';

describe('parseCliArgs', () => {
  it('accepts a video ID that starts with a hyphen', () => {
    expect(parseCliArgs(['-LLazRXLn0Y'])).toEqual({
      videoId: '-LLazRXLn0Y',
      useUserComment: false
    });
  });

  it('accepts --user-comment with a hyphen-starting video ID', () => {
    expect(parseCliArgs(['-LLazRXLn0Y', '--user-comment'])).toEqual({
      videoId: '-LLazRXLn0Y',
      useUserComment: true
    });
  });

  it('supports -- as an explicit positional argument separator', () => {
    expect(parseCliArgs(['--', '-LLazRXLn0Y'])).toEqual({
      videoId: '-LLazRXLn0Y',
      useUserComment: false
    });
  });

  it('rejects unknown long options', () => {
    expect(() => parseCliArgs(['--unknown', 'video-id'])).toThrow(
      'Unknown option: --unknown'
    );
  });
});
