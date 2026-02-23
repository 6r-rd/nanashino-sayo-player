import { describe, expect, it } from "vitest";
import {
  buildDescriptionPreview,
  buildYouTubeThumbnailUrl,
  extractFirstUrl,
  extractYouTubeVideoId,
  removeFirstUrl,
} from "../descriptionLink";

describe("descriptionLink", () => {
  it("extracts first URL from description", () => {
    const text = "歌ってみたあります https://www.youtube.com/watch?v=_tV_yrHcJ2A";
    expect(extractFirstUrl(text)).toBe("https://www.youtube.com/watch?v=_tV_yrHcJ2A");
  });

  it("extracts video id from youtube watch URL", () => {
    const url = "https://www.youtube.com/watch?v=_tV_yrHcJ2A";
    expect(extractYouTubeVideoId(url)).toBe("_tV_yrHcJ2A");
  });

  it("extracts video id from youtube shorts URL", () => {
    const url = "https://www.youtube.com/shorts/_tV_yrHcJ2A";
    expect(extractYouTubeVideoId(url)).toBe("_tV_yrHcJ2A");
  });

  it("returns null for non-youtube URL", () => {
    const url = "https://example.com/watch?v=_tV_yrHcJ2A";
    expect(extractYouTubeVideoId(url)).toBeNull();
  });

  it("removes URL from description text", () => {
    const text = "MV https://www.youtube.com/watch?v=Zg4P7LHt-p0";
    const url = "https://www.youtube.com/watch?v=Zg4P7LHt-p0";
    expect(removeFirstUrl(text, url)).toBe("MV");
  });

  it("builds youtube thumbnail URL", () => {
    expect(buildYouTubeThumbnailUrl("_tV_yrHcJ2A")).toBe("https://i.ytimg.com/vi/_tV_yrHcJ2A/hqdefault.jpg");
  });

  it("builds preview with text and thumbnail", () => {
    const preview = buildDescriptionPreview("歌ってみたあります https://www.youtube.com/watch?v=_tV_yrHcJ2A");
    expect(preview.url).toBe("https://www.youtube.com/watch?v=_tV_yrHcJ2A");
    expect(preview.textWithoutUrl).toBe("歌ってみたあります");
    expect(preview.youtubeVideoId).toBe("_tV_yrHcJ2A");
    expect(preview.thumbnailUrl).toBe("https://i.ytimg.com/vi/_tV_yrHcJ2A/hqdefault.jpg");
  });
});
