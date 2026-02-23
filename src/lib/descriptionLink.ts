const URL_REGEX = /(https?:\/\/[^\s]+)/;
const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export interface DescriptionPreview {
  url: string | null;
  textWithoutUrl: string;
  youtubeVideoId: string | null;
  thumbnailUrl: string | null;
}

export function extractFirstUrl(text: string): string | null {
  if (!text) {
    return null;
  }

  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (!YOUTUBE_HOSTS.has(parsedUrl.hostname)) {
    return null;
  }

  if (parsedUrl.pathname === "/watch") {
    const watchId = parsedUrl.searchParams.get("v");
    return watchId && YOUTUBE_VIDEO_ID_REGEX.test(watchId) ? watchId : null;
  }

  if (parsedUrl.pathname.startsWith("/shorts/")) {
    const shortsId = parsedUrl.pathname.split("/")[2] || "";
    return YOUTUBE_VIDEO_ID_REGEX.test(shortsId) ? shortsId : null;
  }

  return null;
}

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function removeFirstUrl(text: string, url: string | null): string {
  if (!text) {
    return "";
  }

  if (!url) {
    return text.trim();
  }

  return text
    .replace(url, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildDescriptionPreview(description: string): DescriptionPreview {
  const url = extractFirstUrl(description);
  const youtubeVideoId = url ? extractYouTubeVideoId(url) : null;

  return {
    url,
    textWithoutUrl: removeFirstUrl(description, url),
    youtubeVideoId,
    thumbnailUrl: youtubeVideoId ? buildYouTubeThumbnailUrl(youtubeVideoId) : null,
  };
}
