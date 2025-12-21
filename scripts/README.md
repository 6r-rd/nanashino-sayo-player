# Scripts

This directory contains scripts for managing video data for the Astro Player.

## Setup

Before running any scripts, make sure you have set up your environment variables:

1. Copy `.env.example` to `.env` in the root directory
2. Add your YouTube API key to the `.env` file:
   ```
   YOUTUBE_API_KEY=your_api_key_here
   YOUTUBE_CHANNEL_ID=your_channel_id_here
   ```

## Scripts

### updateVideoData.js

This script fetches data for a specific YouTube video and updates the corresponding JSON files.

```bash
node scripts/updateVideoData.js VIDEO_ID

# Force timestamps to be taken from user comments instead of the description
npm run update-video VIDEO_ID -- --user-comment
```

Where `VIDEO_ID` is the YouTube video ID to update.

The script will:

1. Fetch video details from the YouTube API
2. Fetch video comments from the YouTube API
3. Parse timestamps from the description or comments
4. Update the video JSON file in `public/videos/`
5. Update the songs and artists JSON files if new songs or artists are found

Pass `--user-comment` to ignore the video description and extract timestamps only from viewer comments when needed.

### fetchNewVideos.js

This script fetches new videos from a YouTube channel and updates the corresponding JSON files.

```bash
node scripts/fetchNewVideos.js CHANNEL_ID
```

Where `CHANNEL_ID` is the YouTube channel ID to fetch videos from. If not provided, the script will use the `YOUTUBE_CHANNEL_ID` from the `.env` file.

The script will:

1. Fetch videos from the specified channel
2. Filter videos to only include those with "歌枠" in the title
3. Process each new video using `updateVideoData.js`
4. Delete JSON files for videos that don't have "歌枠" in the title
5. Skip any video IDs listed in `scripts/config/excludedVideoIds.json` (keep it as an empty array when there are no exclusions)

### generateVideosList.js

This script generates a list of all video IDs from the `public/videos/` directory and saves it to `public/api/videos-list.json`.

```bash
# Direct execution
node scripts/generateVideosList.js

# Using npm script
npm run generate-videos-list
```

The script will:

1. Scan the `public/videos/` directory for JSON files
2. Extract video IDs from the filenames
3. Create a `videos-list.json` file in the `public/api/` directory

This file is used by the frontend to fetch all available videos without having to hardcode the video IDs.

## GitHub Actions

These scripts are also used by GitHub Actions workflows:

- `update-video-data.yml`: Manually update data for a specific video
- `fetch-new-videos.yml`: Automatically fetch new videos from a channel

You can trigger these workflows from the GitHub Actions tab in the repository.
