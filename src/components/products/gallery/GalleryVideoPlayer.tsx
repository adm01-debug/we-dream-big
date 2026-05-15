/**
 * GalleryVideoPlayer — Dialog para reprodução de vídeos do produto
 */

import { useState } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCloudflareEmbedUrl, getCloudflareThumbnailUrl } from "@/utils/cloudflare-stream";

interface ProductVideo {
  id: string;
  url_stream: string | null;
  url_hls: string | null;
  url_thumbnail: string | null;
  url_original: string | null;
  source_youtube_id: string | null;
  video_type: string | null;
  display_order: number;
  is_primary: boolean;
  title: string | null;
}

interface GalleryVideoPlayerProps {
  productVideos: ProductVideo[];
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GalleryVideoPlayer({ productVideos, productName, open, onOpenChange }: GalleryVideoPlayerProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black border-none overflow-hidden [&>button.absolute]:hidden">
        <div className="relative w-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              {productVideos.length > 1 && (
                <span className="text-primary-foreground/80 text-sm font-medium">
                  Vídeo {activeVideoIndex + 1} de {productVideos.length}
                </span>
              )}
              {productVideos[activeVideoIndex]?.title && (
                <span className="text-primary-foreground/60 text-sm">
                  — {productVideos[activeVideoIndex].title}
                </span>
              )}
            </div>
            <button
              aria-label="Fechar"
              className="h-9 w-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Video player */}
          <div className="aspect-video w-full bg-black">
            {(() => {
              const v = productVideos[activeVideoIndex];
              const posterUrl =
                getCloudflareThumbnailUrl(v?.url_stream, { time: "1s", height: 720 }) ??
                v?.url_thumbnail ??
                null;
              const embedUrl = getCloudflareEmbedUrl(v?.url_stream, {
                autoplay: true,
                poster: posterUrl,
              });
              if (!embedUrl) return null;
              return (
                <iframe
                  src={embedUrl}
                  title={v?.title || `Vídeo do produto ${productName}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            })()}
          </div>

          {/* Multi-video thumbnails */}
          {productVideos.length > 1 && (
            <div className="flex gap-2 p-3 bg-black/95 overflow-x-auto">
              {productVideos.map((pv, idx) => (
                <button
                  key={pv.id}
                  onClick={() => setActiveVideoIndex(idx)}
                  className={cn(
                    "relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden transition-all duration-200",
                    activeVideoIndex === idx
                      ? "ring-2 ring-primary scale-105"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  {(() => {
                    const thumbnailUrl =
                      getCloudflareThumbnailUrl(pv.url_stream, { time: "1s", height: 270 }) ??
                      pv.url_thumbnail;
                    return thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={pv.title || `Vídeo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="h-4 w-4 text-foreground" />
                      </div>
                    );
                  })()}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-5 w-5 text-primary-foreground drop-shadow-lg fill-white/50" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
