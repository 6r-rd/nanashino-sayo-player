#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as glob from 'glob';
import { createNamespacedLogger } from './debug.js';

// スクリプト用のロガーを作成
const logger = createNamespacedLogger('script:validate');

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const schemaDir = path.join(rootDir, 'schema');
const publicDir = path.join(rootDir, 'public');

// Initialize Ajv
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load schemas
const videoSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'video.schema.json'), 'utf8'));
const songSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'song.schema.json'), 'utf8'));
const artistSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'artist.schema.json'), 'utf8'));

// Compile validators
const validateVideo = ajv.compile(videoSchema);
const validateSong = ajv.compile(songSchema);
const validateArtist = ajv.compile(artistSchema);

// Validation results
const results = {
  valid: [],
  invalid: [],
  errors: {}
};

/**
 * Validate a single video file
 * @param {string} filePath - Path to the video JSON file
 * @returns {boolean} - Whether the file is valid
 */
function validateVideoFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const valid = validateVideo(data);
    
    if (valid) {
      results.valid.push(filePath);
      return true;
    } else {
      results.invalid.push(filePath);
      results.errors[filePath] = validateVideo.errors;
      return false;
    }
  } catch (error) {
    results.invalid.push(filePath);
    results.errors[filePath] = [{ message: `Error parsing JSON: ${error.message}` }];
    return false;
  }
}

/**
 * Validate songs.json file
 * @param {string} filePath - Path to songs.json
 * @returns {boolean} - Whether the file is valid
 */
function validateSongsFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.songs || !Array.isArray(data.songs)) {
      results.invalid.push(filePath);
      results.errors[filePath] = [{ message: 'songs.json must contain a "songs" array' }];
      return false;
    }
    
    let allValid = true;
    const songErrors = {};
    
    data.songs.forEach((song, index) => {
      const valid = validateSong(song);
      if (!valid) {
        allValid = false;
        songErrors[`songs[${index}]`] = validateSong.errors;
      }
    });
    
    if (allValid) {
      results.valid.push(filePath);
      return true;
    } else {
      results.invalid.push(filePath);
      results.errors[filePath] = songErrors;
      return false;
    }
  } catch (error) {
    results.invalid.push(filePath);
    results.errors[filePath] = [{ message: `Error parsing JSON: ${error.message}` }];
    return false;
  }
}

/**
 * Validate artists.json file
 * @param {string} filePath - Path to artists.json
 * @returns {boolean} - Whether the file is valid
 */
function validateArtistsFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.artists || !Array.isArray(data.artists)) {
      results.invalid.push(filePath);
      results.errors[filePath] = [{ message: 'artists.json must contain an "artists" array' }];
      return false;
    }
    
    let allValid = true;
    const artistErrors = {};
    
    data.artists.forEach((artist, index) => {
      const valid = validateArtist(artist);
      if (!valid) {
        allValid = false;
        artistErrors[`artists[${index}]`] = validateArtist.errors;
      }
    });
    
    if (allValid) {
      results.valid.push(filePath);
      return true;
    } else {
      results.invalid.push(filePath);
      results.errors[filePath] = artistErrors;
      return false;
    }
  } catch (error) {
    results.invalid.push(filePath);
    results.errors[filePath] = [{ message: `Error parsing JSON: ${error.message}` }];
    return false;
  }
}

/**
 * Validate a file based on its path
 * @param {string} filePath - Path to the file to validate
 * @returns {boolean} - Whether the file is valid
 */
function validateFile(filePath) {
  const normalizedPath = path.normalize(filePath);
  
  if (normalizedPath.includes(path.join('public', 'videos')) && normalizedPath.endsWith('.json')) {
    return validateVideoFile(normalizedPath);
  } else if (normalizedPath.endsWith('songs.json')) {
    return validateSongsFile(normalizedPath);
  } else if (normalizedPath.endsWith('artists.json')) {
    return validateArtistsFile(normalizedPath);
  } else {
    logger.warn(`Skipping ${normalizedPath} - not a recognized JSON file type`);
    return true;
  }
}

/**
 * Validate all JSON files in the project
 * @returns {boolean} - Whether all files are valid
 */
function validateAllFiles() {
  let allValid = true;
  
  // Validate all video files
  const videoFiles = glob.sync(path.join(publicDir, 'videos', '*.json'));
  videoFiles.forEach(file => {
    if (!validateVideoFile(file)) {
      allValid = false;
    }
  });
  
  // Validate songs.json
  const songsFile = path.join(publicDir, 'songs.json');
  if (fs.existsSync(songsFile) && !validateSongsFile(songsFile)) {
    allValid = false;
  }
  
  // Validate artists.json
  const artistsFile = path.join(publicDir, 'artists.json');
  if (fs.existsSync(artistsFile) && !validateArtistsFile(artistsFile)) {
    allValid = false;
  }
  
  return allValid;
}

/**
 * Print validation results
 */
function printResults() {
  logger.log('\n=== JSON Schema Validation Results ===\n');
  
  if (results.valid.length > 0) {
    logger.log(`✓ ${results.valid.length} valid files:`);
    results.valid.forEach(file => {
      logger.log(`  ✓ ${path.relative(rootDir, file)}`);
    });
    logger.log('');
  }
  
  if (results.invalid.length > 0) {
    logger.log(`✗ ${results.invalid.length} invalid files:`);
    results.invalid.forEach(file => {
      logger.log(`  ✗ ${path.relative(rootDir, file)}`);
      const errors = results.errors[file];
      
      if (typeof errors === 'object' && !Array.isArray(errors)) {
        // Handle nested errors (for songs.json and artists.json)
        Object.keys(errors).forEach(key => {
          logger.log(`    ${key}:`);
          errors[key].forEach(err => {
            logger.log(`      - ${err.instancePath || ''} ${err.message}`);
          });
        });
      } else if (Array.isArray(errors)) {
        // Handle direct errors (for video files)
        errors.forEach(err => {
          logger.log(`    - ${err.instancePath || ''} ${err.message}`);
        });
      }
    });
    logger.log('');
  }
  
  if (results.invalid.length === 0) {
    logger.log('All files are valid! 🎉');
  } else {
    logger.log(`Found ${results.invalid.length} invalid files. Please fix the errors and try again.`);
  }
}

/**
 * Generate GitHub Actions compatible output
 */
function generateGitHubOutput() {
  if (process.env.GITHUB_ACTIONS === 'true') {
    results.invalid.forEach(file => {
      const relativePath = path.relative(rootDir, file);
      const errors = results.errors[file];
      
      if (typeof errors === 'object' && !Array.isArray(errors)) {
        // Handle nested errors (for songs.json and artists.json)
        Object.keys(errors).forEach(key => {
          errors[key].forEach(err => {
            const message = `${key} ${err.instancePath || ''} ${err.message}`;
            logger.error(`::error file=${relativePath}::${message}`);
          });
        });
      } else if (Array.isArray(errors)) {
        // Handle direct errors (for video files)
        errors.forEach(err => {
          const message = `${err.instancePath || ''} ${err.message}`;
          logger.error(`::error file=${relativePath}::${message}`);
        });
      }
    });
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  let allValid = true;
  
  if (args.length === 0) {
    // No arguments, validate all files
    allValid = validateAllFiles();
  } else {
    // Validate specific files
    args.forEach(filePath => {
      if (!validateFile(filePath)) {
        allValid = false;
      }
    });
  }
  
  printResults();
  generateGitHubOutput();
  
  return allValid;
}

// Run the script if it's called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = main() ? 0 : 1;
  process.exit(exitCode);
}

// Export for testing
export default main;
