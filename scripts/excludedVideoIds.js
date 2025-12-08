import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createNamespacedLogger } from './debug.js';

const moduleLogger = createNamespacedLogger('script:exclude');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCLUDED_VIDEO_IDS_PATH = path.join(__dirname, 'config', 'excludedVideoIds.json');

/**
 * Load excluded video IDs from config file.
 * Returns an empty set when the file is missing or empty.
 * @param {ReturnType<typeof createNamespacedLogger>} logger
 * @returns {Set<string>}
 */
function loadExcludedVideoIds(logger = moduleLogger) {
  try {
    if (!fs.existsSync(EXCLUDED_VIDEO_IDS_PATH)) {
      return new Set();
    }

    const raw = fs.readFileSync(EXCLUDED_VIDEO_IDS_PATH, 'utf-8').trim();
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn('excludedVideoIds.json should contain an array of strings. Ignoring its contents.');
      return new Set();
    }

    const normalizedIds = parsed
      .filter(id => typeof id === 'string')
      .map(id => id.trim())
      .filter(Boolean);

    return new Set(normalizedIds);
  } catch (error) {
    logger.warn('Failed to read excludedVideoIds.json. Continuing without exclusions.', error);
    return new Set();
  }
}

export {
  EXCLUDED_VIDEO_IDS_PATH,
  loadExcludedVideoIds
};
