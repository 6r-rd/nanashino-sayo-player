import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DescriptionPopoverContent } from "../DescriptionPopoverContent";

describe("DescriptionPopoverContent", () => {
  it("renders text and youtube thumbnail for youtube URL", () => {
    const html = renderToStaticMarkup(
      <DescriptionPopoverContent description="歌ってみたあります https://www.youtube.com/watch?v=_tV_yrHcJ2A" />
    );

    expect(html).toContain("歌ってみたあります");
    expect(html).toContain("https://i.ytimg.com/vi/_tV_yrHcJ2A/hqdefault.jpg");
    expect(html).not.toContain("https://www.youtube.com/watch?v=_tV_yrHcJ2A");
  });

  it("renders text only for non-youtube URL", () => {
    const html = renderToStaticMarkup(
      <DescriptionPopoverContent description="詳細 https://example.com/page" />
    );

    expect(html).toContain("詳細");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("https://example.com/page");
  });
});
