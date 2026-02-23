import { useMemo, useState } from "react";
import { buildDescriptionPreview } from "../lib/descriptionLink";

interface DescriptionPopoverContentProps {
  description: string;
  fallbackText?: string;
}

export function DescriptionPopoverContent({
  description,
  fallbackText = "リンクを開く",
}: DescriptionPopoverContentProps) {
  const [hideThumbnail, setHideThumbnail] = useState(false);
  const preview = useMemo(() => buildDescriptionPreview(description), [description]);
  const showThumbnail = Boolean(preview.thumbnailUrl) && !hideThumbnail;

  return (
    <div className="flex flex-col">
      {preview.textWithoutUrl && (
        <p className="px-3 py-2 text-sm whitespace-pre-wrap break-words">
          {preview.textWithoutUrl}
        </p>
      )}

      {showThumbnail && (
        <img
          src={preview.thumbnailUrl || ""}
          alt="YouTube cover thumbnail"
          className="w-full aspect-video object-cover"
          loading="lazy"
          onError={() => setHideThumbnail(true)}
        />
      )}

      {!preview.textWithoutUrl && !showThumbnail && (
        <p className="px-3 py-2 text-sm">{fallbackText}</p>
      )}
    </div>
  );
}
