import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Info, PanelLeft, ChevronsRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverPopover } from "@/components/ui/hover-popover";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { createNamespacedLogger, createChildLogger } from "@/lib/debug";

// Sidebar コンポーネント用のロガーを作成
const logger = createNamespacedLogger('ui:sidebar');
const searchLogger = createChildLogger(logger, 'search');
const sortLogger = createChildLogger(logger, 'sort');

interface SongItem {
  song_id: string;
  title: string;
  artist_ids: string[];
  artist_name?: string; // For backward compatibility
  artist_names?: string[];
  count?: number;
  description?: string;
}

interface VideoItem {
  video_id: string;
  title: string;
  start_datetime: string;
  thumbnail_url: string;
  timestamps?: Array<{
    song_id: string;
    time: number;
    original_time: string;
  }>;
}

interface SidebarProps {
  songs: SongItem[];
  videos: VideoItem[];
  artists: Record<string, string>;
  onSelectVideo?: (videoId: string) => void;
  onSelectSong?: (songId: string) => void;
  defaultTab?: "archives" | "songs";
}

import { registerSwipeCallback } from "@/lib/swipeDetection";

export function Sidebar({ songs, videos, artists, onSelectVideo, onSelectSong, defaultTab = "archives" }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [archivesSortOption, setArchivesSortOption] = useState<string>("newest");
  const [songsSortOption, setSongsSortOption] = useState<string>("most-played");
  const [isOpen, setIsOpen] = useState(false);
  
  // Prevent keyboard from appearing when sidebar is opened
  const handleSheetOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    // If opening the sidebar, ensure any active element is blurred
    if (open) {
      // Use a small timeout to ensure this happens after the sidebar is opened
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 100);
    }
  };
  
  // Register the swipe callback when the component mounts
  useEffect(() => {
    // Only register the callback for mobile view
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const unregister = registerSwipeCallback(() => handleSheetOpenChange(true));
      
      // Unregister the callback when the component unmounts
      return unregister;
    }
  }, []);

  // 最初の URL を抽出する関数
  const extractFirstUrl = (text: string): string | null => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };
  
  // URL を短く表示する関数
  const formatDescription = (text: string): string => {
    if (!text) return '';
    
    return text.replace(/(https?:\/\/[^\s]+)/g, (url) => {
      try {
        // URL を短く表示（例：https://example.com/...）
        const urlObj = new URL(url);
        return `${urlObj.origin}/...`;
      } catch (e) {
        // 無効な URL の場合は元のテキストを返す
        return url;
      }
    });
  };

  // Normalize text for search (as per spec: Unicode NFC + toLowerCase)
  const normalizeText = (text: string) => {
    if (!text) return "";
    return text.normalize("NFC").toLocaleLowerCase("ja");
  };

  // Filter videos based on search query and date range
  const filteredVideos = videos.filter((video) => {
    // Search query filter
    if (searchQuery) {
      const normalizedQuery = normalizeText(searchQuery);
      if (!normalizeText(video.title).includes(normalizedQuery)) {
        return false;
      }
    }
    
    // Date range filter
    if (fromDate || toDate) {
      const videoDate = new Date(video.start_datetime);
      
      if (fromDate && videoDate < fromDate) {
        return false;
      }
      
      if (toDate) {
        // Set time to end of day for "to" date
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        if (videoDate > endOfDay) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Filter songs based on search query and date range
  const filteredSongs = songs.filter((song) => {
    // Search query filter
    if (searchQuery) {
      const normalizedQuery = normalizeText(searchQuery);
      
      // Check if any of the artists match the search query
      const artistNames = song.artist_ids?.map(id => artists[id] || "").filter(Boolean) || [];
      const artistNamesString = artistNames.join(", ");
      
      if (!normalizeText(song.title).includes(normalizedQuery) && 
          !normalizeText(artistNamesString).includes(normalizedQuery)) {
        return false;
      }
    }
    
    // Date range filter for songs
    if (fromDate || toDate) {
      // Find videos where this song was played
      const songVideos = videos.filter(video => 
        video.timestamps?.some(timestamp => timestamp.song_id === song.song_id) || false
      );
      
      // Check if any of those videos are within the date range
      const inDateRange = songVideos.some(video => {
        const videoDate = new Date(video.start_datetime);
        
        if (fromDate && videoDate < fromDate) {
          return false;
        }
        
        if (toDate) {
          // Set time to end of day for "to" date
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          
          if (videoDate > endOfDay) {
            return false;
          }
        }
        
        return true;
      });
      
      if (!inDateRange) {
        return false;
      }
    }
    
    return true;
  });

  // Debug: Log songs with descriptions
  useEffect(() => {
    // Log all songs with descriptions
    const songsWithDesc = songs.filter(song => song.description);
    logger.log("Songs with descriptions:", songsWithDesc);
    
    // Log all filtered songs after search
    if (searchQuery) {
      searchLogger.log("Search query:", searchQuery);
      searchLogger.log("Filtered songs:", filteredSongs);
    }
  }, [songs, searchQuery, filteredSongs]);

  // Calculate song play counts based on filtered videos
  const calculateFilteredSongCounts = (videos: VideoItem[], fromDate?: Date, toDate?: Date) => {
    const counts: Record<string, number> = {};
    
    videos.forEach(video => {
      // Check if video is within date range
      if (fromDate || toDate) {
        const videoDate = new Date(video.start_datetime);
        
        if (fromDate && videoDate < fromDate) {
          return;
        }
        
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          
          if (videoDate > endOfDay) {
            return;
          }
        }
      }
      
      // Count songs in this video
      video.timestamps?.forEach(timestamp => {
        const songId = timestamp.song_id;
        counts[songId] = (counts[songId] || 0) + 1;
      });
    });
    
    return counts;
  };
  
  // Calculate filtered song counts whenever date range changes
  const filteredSongCounts = useMemo(() => {
    return calculateFilteredSongCounts(videos, fromDate, toDate);
  }, [videos, fromDate, toDate]);
  
  // Sort songs based on selected option, using filtered counts
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    const aCount = filteredSongCounts[a.song_id] || 0;
    const bCount = filteredSongCounts[b.song_id] || 0;
    
    if (songsSortOption === "most-played") {
      return bCount - aCount;
    } else {
      return aCount - bCount;
    }
  });
  
  // Debug: Log the sorted songs and filtered song counts
  useEffect(() => {
    sortLogger.log("Sorted songs:", sortedSongs);
    sortLogger.log("Filtered song counts:", filteredSongCounts);
    
    // Log the first few songs with their counts
    if (sortedSongs.length > 0) {
      const firstFewSongs = sortedSongs.slice(0, 5);
      sortLogger.log("First few songs with counts:");
      firstFewSongs.forEach(song => {
        sortLogger.log(`Song: ${song.title}, ID: ${song.song_id}, Count: ${filteredSongCounts[song.song_id] || 0}`);
      });
    }
  }, [sortedSongs, filteredSongCounts]);

  // Sort videos based on selected option
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (archivesSortOption === "newest") {
      return new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime();
    } else {
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    }
  });

  const sidebarContent = (
    <>
      <div className="px-4 py-4 space-y-4">
        <Input
          placeholder="検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-popover dark:bg-card"
          autoFocus={false}
          tabIndex={-1}
        />
        
        <div className="flex gap-2 items-center w-full">
          <div className="flex-1">
            <SimpleDatePicker 
              date={fromDate} 
              setDate={setFromDate} 
              placeholder="From" 
              className="w-full"
            />
          </div>
          <span className="text-muted-foreground px-1">-</span>
          <div className="flex-1">
            <SimpleDatePicker 
              date={toDate} 
              setDate={setToDate} 
              placeholder="To" 
              className="w-full"
              mobileAlign="right"
            />
          </div>
        </div>
      </div>
      
      <Tabs defaultValue={defaultTab} className="w-full mt-4" onValueChange={(value) => setActiveTab(value as "archives" | "songs")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="archives">Archives</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
        </TabsList>
        <TabsContent value="archives" className="mt-2">
          <div className="px-4 py-2">
            <Select
              value={archivesSortOption}
              onValueChange={setArchivesSortOption}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">日時 - 降順</SelectItem>
                <SelectItem value="oldest">日時 - 昇順</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="space-y-2 p-2">
              {sortedVideos.map((video) => (
                <div
                  key={video.video_id}
                  onClick={() => onSelectVideo ? onSelectVideo(video.video_id) : window.location.href = `${import.meta.env.BASE_URL}/video/${video.video_id}`}
                  className="block cursor-pointer"
                >
                  <Card className="overflow-hidden transition-colors hover:bg-muted/50">
                    <div className="w-full h-auto overflow-hidden">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-3">
                      <h3 className="line-clamp-2 text-sm font-medium">
                        {video.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(video.start_datetime).toLocaleDateString("ja-JP")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
              {filteredVideos.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  動画が見つかりませんでした
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="songs" className="mt-2">
          <div className="px-4 py-2">
            <Select
              value={songsSortOption}
              onValueChange={setSongsSortOption}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most-played">歌った回数 - 降順</SelectItem>
                <SelectItem value="least-played">歌った回数 - 昇順</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="p-2">
              <div className="border-b mb-2">
                <div className="grid grid-cols-[1fr_60px] gap-2 px-4 py-2 font-medium">
                  <div>曲名</div>
                  <div className="text-right">歌った回数</div>
                </div>
              </div>
              
              {sortedSongs.map((song) => (
                <div 
                  key={song.song_id}
                  className="grid grid-cols-[1fr_60px] gap-2 px-4 py-2 hover:bg-muted/50 cursor-pointer border-b"
                  onClick={() => onSelectSong ? onSelectSong(song.song_id) : window.location.href = `${import.meta.env.BASE_URL}/song/${song.song_id}`}
                >
                  <div>
                    <div className="font-medium flex items-center">
                      {song.title}
                      {song.description && (
                        <HoverPopover
                          side="right"
                          align="start"
                          contentClassName="max-w-[350px] p-4 break-words"
                          onContentClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            const firstUrl = extractFirstUrl(song.description || '');
                            if (firstUrl) {
                              window.open(firstUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          content={
                            <p className="text-sm whitespace-normal">
                              {formatDescription(song.description || '')}
                            </p>
                          }
                        >
                          <span className="inline-block ml-2 cursor-pointer">
                            <Info className="h-4 w-4 text-blue-500" />
                          </span>
                        </HoverPopover>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        // Always look up each artist_id in the artists map
                        if (song.artist_ids && song.artist_ids.length > 0) {
                          const names = song.artist_ids.map(id => artists[id] || "").filter(Boolean);
                          return names.length > 0 ? names.join(", ") : "";
                        } 
                        // Fallback to artist_names if available
                        else if (song.artist_names && song.artist_names.length > 0) {
                          return song.artist_names.join(", ");
                        }
                        // Fallback to artist_name if available
                        else if (song.artist_name) {
                          return song.artist_name;
                        } 
                        // Final fallback
                        else {
                          return "";
                        }
                      })()}
                    </div>
                  </div>
                  <div className="text-right self-center">
                    {filteredSongCounts[song.song_id] || 0}
                  </div>
                </div>
              ))}
              
              {filteredSongs.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  曲が見つかりませんでした
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </>
  );

  // Check if we're in a mobile context by looking at the parent element's classes
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // For desktop, render the content directly
  if (!isMobile) {
    return sidebarContent;
  }
  
  // For mobile, render the drawer
  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent 
          side="left" 
          className="w-[80vw] sm:w-[350px]"
        >
          {sidebarContent}
        </SheetContent>
      </Sheet>
      
      {/* Drawer hint - icon on left edge */}
      <div 
        className="fixed left-0 top-16 bottom-0 w-10 z-10"
        onClick={() => handleSheetOpenChange(true)}
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-0 bg-primary/90 rounded-r-lg p-2 shadow-md">
          <ChevronsRight className="h-6 w-6 text-background" />
        </div>
      </div>
    </>
  );
}
