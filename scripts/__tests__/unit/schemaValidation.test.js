import { describe, it, expect, beforeEach } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to schema files
const schemaDir = path.join(__dirname, '../../../schema');
const videoSchemaPath = path.join(schemaDir, 'video.schema.json');

describe('Schema Validation', () => {
  let ajv;
  let validateVideo;
  
  beforeEach(() => {
    // Setup Ajv
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    
    // Load schema
    const videoSchema = JSON.parse(fs.readFileSync(videoSchemaPath, 'utf8'));
    validateVideo = ajv.compile(videoSchema);
  });
  
  describe('Video Schema', () => {
    it('validates a video with standard HH:MM:SS timestamps', () => {
      const videoData = {
        video_id: 'test1234567',
        title: 'Test Video',
        start_datetime: '2023-01-01T00:00:00Z',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        timestamps: [
          {
            time: 3600,
            original_time: '01:00:00',
            song_id: 'song1234567',
            comment_source: 'description'
          }
        ]
      };
      
      const valid = validateVideo(videoData);
      expect(valid).toBe(true);
    });
    
    it('validates a video with H:MM:SS timestamps', () => {
      const videoData = {
        video_id: 'test1234567',
        title: 'Test Video',
        start_datetime: '2023-01-01T00:00:00Z',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        timestamps: [
          {
            time: 3600,
            original_time: '1:00:00',
            song_id: 'song1234567',
            comment_source: 'description'
          }
        ]
      };
      
      const valid = validateVideo(videoData);
      expect(valid).toBe(true);
    });
    
    it('validates a video with MM:SS timestamps', () => {
      const videoData = {
        video_id: 'test1234567',
        title: 'Test Video',
        start_datetime: '2023-01-01T00:00:00Z',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        timestamps: [
          {
            time: 65,
            original_time: '01:05',
            song_id: 'song1234567',
            comment_source: 'description'
          }
        ]
      };
      
      const valid = validateVideo(videoData);
      expect(valid).toBe(true);
    });
    
    it('validates a video with M:SS timestamps', () => {
      const videoData = {
        video_id: 'test1234567',
        title: 'Test Video',
        start_datetime: '2023-01-01T00:00:00Z',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        timestamps: [
          {
            time: 65,
            original_time: '1:05',
            song_id: 'song1234567',
            comment_source: 'description'
          }
        ]
      };
      
      const valid = validateVideo(videoData);
      expect(valid).toBe(true);
    });
    
    it('rejects invalid timestamp formats', () => {
      const videoData = {
        video_id: 'test1234567',
        title: 'Test Video',
        start_datetime: '2023-01-01T00:00:00Z',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        timestamps: [
          {
            time: 65,
            original_time: '1:5', // Invalid format (missing leading zero in seconds)
            song_id: 'song1234567',
            comment_source: 'description'
          }
        ]
      };
      
      const valid = validateVideo(videoData);
      expect(valid).toBe(false);
    });
    
    it('rejects timestamps with invalid seconds (> 59)', () => {
      const videoData = {
        video_id: 'test1234567',
        title: 'Test Video',
        start_datetime: '2023-01-01T00:00:00Z',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        timestamps: [
          {
            time: 65,
            original_time: '1:65', // Invalid seconds
            song_id: 'song1234567',
            comment_source: 'description'
          }
        ]
      };
      
      const valid = validateVideo(videoData);
      expect(valid).toBe(false);
    });
    
    it('rejects timestamps with invalid minutes (> 59) in HH:MM:SS format', () => {
      const videoData = {
        video_id: 'test1234567',
        title: 'Test Video',
        start_datetime: '2023-01-01T00:00:00Z',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        timestamps: [
          {
            time: 65,
            original_time: '01:65:00', // Invalid minutes
            song_id: 'song1234567',
            comment_source: 'description'
          }
        ]
      };
      
      const valid = validateVideo(videoData);
      expect(valid).toBe(false);
    });
  });
});
