import { useEffect, useState, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverPopover } from "@/components/ui/hover-popover";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";
import { createNamespacedLogger } from "@/lib/debug";

// YouTubePlayer コンポーネント用のロガーを作成
const logger = createNamespacedLogger('ui:player');

interface Timestamp {
  time: number;
  original_time: string;
  song_id: string;
  song_title?: string;
  artist_name?: string;
  description?: string;
}

interface YouTubePlayerProps {
  videoId: string;
  timestamps: Timestamp[];
  startTime?: number;
}

export function YouTubePlayer({ videoId, timestamps, startTime: propStartTime }: YouTubePlayerProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [startTime, setStartTime] = useState<number | undefined>(propStartTime);
  
  // Check URL for timestamp parameter on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tParam = urlParams.get('t');
      if (tParam) {
        const timeValue = parseInt(tParam, 10);
        logger.log("Found timestamp in URL:", timeValue);
        setStartTime(timeValue);
      } else {
        logger.log("No timestamp in URL, using prop value:", propStartTime);
      }
    }
  }, [propStartTime]);
  
  // デバッグ用：startTimeの値をログに出力
  logger.log("startTime =", startTime, typeof startTime);
  
  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Find the current song index based on startTime
  useEffect(() => {
    if (startTime !== undefined) {
      const index = timestamps.findIndex((ts, idx) => {
        const nextTs = timestamps[idx + 1];
        return startTime >= ts.time && (!nextTs || startTime < nextTs.time);
      });
      
      setCurrentSongIndex(index >= 0 ? index : null);
    }
  }, [startTime, timestamps]);
  
  // Effect to ensure video plays after seeking is complete
  useEffect(() => {
    // Only run in browser environment and when seeking state changes to false
    if (typeof window === 'undefined' || isSeeking) return;
    
    // When seeking is complete, ensure the video is playing
    if (iframeRef.current && iframeRef.current.contentWindow) {
      logger.log("Seeking complete, ensuring video is playing");
      
      // Send play command with a short delay to ensure it happens after seeking is complete
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({
            'event': 'command',
            'func': 'playVideo'
          }), '*');
        }
      }, 300);
    }
  }, [isSeeking]);

  // Jump to timestamp using seekTo method for seamless seeking
  const jumpToTimestamp = (time: number) => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        logger.log(`Seeking to ${formatTime(time)}`);
        
        // Set seeking state to true
        setIsSeeking(true);
        
        // Set a timeout to reset seeking state if it doesn't get reset by player state change
        // This ensures the video continues to play even if we don't receive the expected state change events
        setTimeout(() => {
          setIsSeeking(false);
        }, 2000);
        
        // Use seekTo method for seamless seeking within the current video
        // The second parameter (true) makes it seek immediately rather than smoothly
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          'event': 'command',
          'func': 'seekTo',
          'args': [time, true]
        }), '*');
        
        // Also try the object format for better compatibility
        iframeRef.current.contentWindow.postMessage({
          'event': 'command',
          'func': 'seekTo',
          'args': [time, true]
        }, '*');
        
        // Ensure the video is playing after seeking
        // Use a short delay to allow the seek operation to complete
        setTimeout(() => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            logger.log("Ensuring video is playing after seek");
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
              'event': 'command',
              'func': 'playVideo'
            }), '*');
          }
        }, 300);
        
        // Update the current song index
        const index = timestamps.findIndex((ts, idx) => {
          const nextTs = timestamps[idx + 1];
          return time >= ts.time && (!nextTs || time < nextTs.time);
        });
        
        setCurrentSongIndex(index >= 0 ? index : null);
      } catch (error) {
        logger.error("Error seeking to timestamp:", error);
      }
    }
  };

  // Handle iframe load and initialize YouTube API
  const handleIframeLoad = () => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    logger.log("YouTube iframe loaded");
    
    // Initialize the YouTube iframe API
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Send a message to initialize the API
      iframeRef.current.contentWindow.postMessage('{"event":"listening"}', '*');
    }
  };
  
  // Reference to track if we've already performed the initial seek
  const initialSeekPerformedRef = useRef(false);
  
  // Set up YouTube API event listener - only run on client side
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Set up event listener for YouTube iframe API messages
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        // Parse the event data if it's a string
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Check if this is a YouTube player event
        if (data && data.event === 'onReady') {
          logger.log("YouTube player is ready");
          setIsLoading(false);
          
          // If startTime is provided and we haven't performed the initial seek yet,
          // seek to the specified time when the player is ready
          if (startTime !== undefined && !initialSeekPerformedRef.current) {
            logger.log(`Performing initial seek to ${formatTime(startTime)}`);
            initialSeekPerformedRef.current = true;
            
            // Use a short delay to ensure the player is fully initialized
            setTimeout(() => {
              jumpToTimestamp(startTime);
            }, 500);
          } else {
            logger.log("No startTime provided or initial seek already performed");
          }
        }
        
        // Handle state change events
        if (data && data.event === 'onStateChange') {
          logger.log("YouTube player state changed:", data.info);
          
          // YouTube player states:
          // -1 (unstarted)
          // 0 (ended)
          // 1 (playing)
          // 2 (paused)
          // 3 (buffering)
          // 5 (video cued)
          
          // If the video is paused (2) and we're seeking, try to play it
          if (data.info === 2 && isSeeking) {
            logger.log("Video paused during seeking, attempting to resume playback");
            
            // Send play command after a short delay
            setTimeout(() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage(JSON.stringify({
                  'event': 'command',
                  'func': 'playVideo'
                }), '*');
              }
            }, 200);
          }
          
          // If the video is playing, reset the seeking state
          if (data.info === 1) {
            logger.log("Video is now playing");
            setIsSeeking(false);
          }
        }
      } catch (error) {
        // Ignore parsing errors for non-YouTube messages
      }
    };
    
    // Add the event listener
    window.addEventListener('message', handleYouTubeMessage);
    
    // Set a timeout to hide the loading indicator if the onReady event doesn't fire
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('message', handleYouTubeMessage);
      clearTimeout(timeoutId);
    };
  }, [startTime, jumpToTimestamp]);


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

  return (
    <div className="flex flex-col space-y-4">
      {/* YouTube Player */}
      <div className="aspect-video w-full bg-black relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="w-full max-w-xs mx-auto">
                <Progress value={50} className="h-2" />
              </div>
              <p className="text-white mt-2">動画を読み込み中...</p>
              <p className="text-white text-sm mt-1 opacity-70">
                {startTime ? `${formatTime(startTime)} から再生します` : ''}
              </p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}&controls=1&rel=0&autoplay=1&modestbranding=1${startTime ? `&start=${startTime}` : ''}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
          onLoad={handleIframeLoad}
        ></iframe>
      </div>

      {/* Timestamps table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">タイムスタンプ</TableHead>
              <TableHead>曲名</TableHead>
              <TableHead className="hidden md:table-cell">アーティスト名</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timestamps.map((timestamp, index) => (
              timestamp.description ? (
                <TableRow 
                  key={index}
                  className={`cursor-pointer relative group hover:bg-muted/50 ${currentSongIndex === index ? 'bg-primary/10' : ''}`}
                  onClick={() => jumpToTimestamp(timestamp.time)}
                >
                  <TableCell className="font-mono relative">
                    {timestamp.original_time}
                    
                    <HoverPopover
                      side="left"
                      align="start"
                      contentClassName="max-w-[350px] p-4 break-words"
                      onContentClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        const firstUrl = extractFirstUrl(timestamp.description || '');
                        if (firstUrl) {
                          window.open(firstUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      content={
                        <p className="text-sm whitespace-normal">
                          {formatDescription(timestamp.description || '')}
                        </p>
                      }
                    >
                      <span className="inline-block ml-2 cursor-pointer">
                        <Info className="h-4 w-4 text-blue-500" />
                      </span>
                    </HoverPopover>
                  </TableCell>
                  <TableCell>{timestamp.song_title || `Song ${index + 1}`}</TableCell>
                  <TableCell className="hidden md:table-cell">{timestamp.artist_name || ''}</TableCell>
                </TableRow>
              ) : (
                <TableRow 
                  key={index}
                  className={`cursor-pointer hover:bg-muted/50 ${currentSongIndex === index ? 'bg-primary/10' : ''}`}
                  onClick={() => jumpToTimestamp(timestamp.time)}
                >
                  <TableCell className="font-mono">{timestamp.original_time}</TableCell>
                  <TableCell>{timestamp.song_title || `Song ${index + 1}`}</TableCell>
                  <TableCell className="hidden md:table-cell">{timestamp.artist_name || ''}</TableCell>
                </TableRow>
              )
            ))}
            {timestamps.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  タイムスタンプがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
