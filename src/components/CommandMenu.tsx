import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { normalizeText } from "../lib/data";
import type { VideoData, SongData } from "../lib/types";

interface CommandMenuProps {
  videos: VideoData[];
  songs: Array<SongData & { artist_name: string }>;
}

export function CommandMenu({ videos, songs }: CommandMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Filter function for search
  const filterItems = (items: any[], query: string, keys: string[]) => {
    if (!query) return items;
    
    const normalizedQuery = normalizeText(query);
    
    return items.filter((item) => {
      return keys.some((key) => {
        const value = item[key];
        if (!value) return false;
        return normalizeText(value).includes(normalizedQuery);
      });
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="検索..." />
      <CommandList>
        <CommandEmpty>結果が見つかりませんでした</CommandEmpty>
        
        <CommandGroup heading="動画">
          {videos.slice(0, 5).map((video) => (
            <CommandItem
              key={video.video_id}
              value={`video-${video.video_id}`}
              onSelect={() => {
                window.location.href = `/video/${video.video_id}`;
                setOpen(false);
              }}
            >
              <span>{video.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandGroup heading="曲">
          {songs.slice(0, 5).map((song) => (
            <CommandItem
              key={song.song_id}
              value={`song-${song.song_id}`}
              onSelect={() => {
                window.location.href = `/song/${song.song_id}`;
                setOpen(false);
              }}
            >
              <span>{song.title}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {song.artist_name}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
