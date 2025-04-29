# JSON Schema Validation

This directory contains scripts for validating JSON files against their respective schemas.

## Overview

The `validateJsonSchemas.js` script validates the following JSON files:

- Video files in `public/videos/*.json` against `schema/video.schema.json`
- `public/songs.json` against `schema/song.schema.json`
- `public/artists.json` against `schema/artist.schema.json`

## Usage

### Command Line

To validate all JSON files:

```bash
node scripts/validateJsonSchemas.js
```

To validate specific files:

```bash
node scripts/validateJsonSchemas.js public/videos/example.json public/songs.json
```

### GitHub Actions

The validation script is automatically run as part of the GitHub Actions workflow when pull requests are created that modify any of the following files:

- Any JSON file in `public/videos/`
- `public/songs.json`
- `public/artists.json`
- Any JSON schema file in `schema/`

This ensures that all JSON files adhere to their respective schemas before being merged.

## Exit Codes

- `0`: All files are valid
- `1`: One or more files are invalid

## Schema Definitions

### Video Schema

The video schema (`schema/video.schema.json`) defines the structure for video files in `public/videos/`. Each video file must include:

- `id`: The video ID
- `title`: The video title
- `publishedAt`: The publication date
- `thumbnail`: The thumbnail URL
- `songs`: An array of songs in the video

### Song Schema

The song schema (`schema/song.schema.json`) defines the structure for song entries in `public/songs.json`. Each song must include:

- `id`: The song ID
- `title`: The song title
- `artist`: The artist name
- `count`: The number of times the song has been performed

### Artist Schema

The artist schema (`schema/artist.schema.json`) defines the structure for artist entries in `public/artists.json`. Each artist must include:

- `id`: The artist ID
- `name`: The artist name

## Development

### Adding New Schemas

To add a new schema:

1. Create a new schema file in the `schema/` directory
2. Update the `validateJsonSchemas.js` script to load and use the new schema
3. Add tests for the new schema validation

### Testing

Tests for the validation script are located in `scripts/__tests__/unit/jsonValidation.test.js`.

To run the tests:

```bash
npm test -- scripts/__tests__/unit/jsonValidation.test.js
```
