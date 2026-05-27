/**
 * PromoFlixPlayer — Reprodutor de vídeo estilo Netflix com:
 *  - Play/Pause, seek ±10s
 *  - Velocidades 0.5x / 1x / 1.25x / 1.5x / 2x
 *  - Volume + mute
 *  - Print/foto do frame atual (download PNG)
 *  - Picture-in-Picture e Fullscreen
 *  - Atalhos de teclado: Space, ←/→, J/L, K, ↑/↓, M, F, P, S, < / >
 *  - Suporte HLS via hls.js (fallback nativo no Safari)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0
    ? `${h}:${mm}:${String(sec).padStart(2, '0')}`
    : `${mm}:${String(sec).padStart(2, '0')}`;
}

interface PromoFlixPlayerProps {
  src: string;
  posterUrl?: string | null;
  title?: string;
  productName?: string;
  isHls?: boolean;
  autoPlay?: boolean;
  className?: string;
}

export function PromoFlixPlayer({
  src,
  posterUrl,
  title,
  productName,
  isHls = false,
  autoPlay = true,
  className,
}: PromoFlixPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [flashLabel, setFlashLabel] = useState<string | null>(null);

  // Setup HLS or native
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: import('hls.js').default | null = null;
    let cancelled = false;

    setIsLoading(true);

    const useNative =
      !isHls ||
      video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
      !src.endsWith('.m3u8');

    if (useNative) {
      video.src = src;
    } else {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled || !videoRef.current) return;
          if (Hls.isSupported()) {
            hls = new Hls({ maxBufferLength: 30 });
            hls.loadSource(src);
            hls.attachMedia(videoRef.current);
          } else {
            videoRef.current.src = src;
          }
        })
        .catch(() => {
          if (videoRef.current) videoRef.current.src = src;
        });
    }

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }, [src, isHls]);

  // Bind video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(video.currentTime);
    const onMeta = () => {
      setDuration(video.duration || 0);
      setIsLoading(false);
    };
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onRate = () => setPlaybackRate(video.playbackRate);
    const onVolume = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('progress', onProgress);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ratechange', onRate);
    video.addEventListener('volumechange', onVolume);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ratechange', onRate);
      video.removeEventListener('volumechange', onVolume);
    };
  }, []);

  // Fullscreen tracking
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const flash = useCallback((label: string) => {
    setFlashLabel(label);
    window.setTimeout(() => setFlashLabel(null), 700);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
      flash(delta > 0 ? `+${delta}s` : `${delta}s`);
    },
    [flash],
  );

  const setRate = useCallback(
    (rate: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.playbackRate = rate;
      flash(`${rate}x`);
    },
    [flash],
  );

  const stepRate = useCallback(
    (direction: 1 | -1) => {
      const v = videoRef.current;
      if (!v) return;
      const idx = PLAYBACK_RATES.indexOf(v.playbackRate as (typeof PLAYBACK_RATES)[number]);
      const baseIdx = idx === -1 ? PLAYBACK_RATES.indexOf(1) : idx;
      const next = PLAYBACK_RATES[
        Math.max(0, Math.min(PLAYBACK_RATES.length - 1, baseIdx + direction))
      ];
      setRate(next);
    },
    [setRate],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const setVol = useCallback((value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, value));
    if (v.volume > 0 && v.muted) v.muted = false;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      el.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if ('requestPictureInPicture' in v) {
        await v.requestPictureInPicture();
      }
    } catch {
      toast.error('Picture-in-Picture indisponível neste vídeo');
    }
  }, []);

  const takeScreenshot = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 1280;
      canvas.height = v.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Não foi possível capturar o frame');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (productName || title || 'promoflix').replace(/[^a-z0-9-_]+/gi, '-');
        a.href = url;
        a.download = `${safeName}-${Math.floor(v.currentTime)}s.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Frame salvo em PNG');
        flash('Foto');
      }, 'image/png');
    } catch {
      toast.error(
        'Captura bloqueada pelo navegador (CORS). Tente outro vídeo ou use a tecla PrintScreen.',
      );
    }
  }, [productName, title, flash]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          seekBy(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVol((videoRef.current?.volume ?? 1) + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVol((videoRef.current?.volume ?? 1) - 0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePip();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          takeScreenshot();
          break;
        case '>':
        case '.':
          e.preventDefault();
          stepRate(1);
          break;
        case '<':
        case ',':
          e.preventDefault();
          stepRate(-1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    togglePlay,
    seekBy,
    setVol,
    toggleMute,
    toggleFullscreen,
    togglePip,
    takeScreenshot,
    stepRate,
  ]);

  // Auto-hide controls
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  }, [isPlaying]);

  useEffect(() => bumpControls(), [bumpControls]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const next = (Number(e.target.value) / 100) * duration;
    v.currentTime = next;
  };

  const volumeIcon = useMemo(() => {
    if (isMuted || volume === 0) return <VolumeX className="h-5 w-5" />;
    return <Volume2 className="h-5 w-5" />;
  }, [isMuted, volume]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative w-full overflow-hidden bg-black text-white',
        'aspect-video select-none',
        className,
      )}
      onMouseMove={bumpControls}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black"
        poster={posterUrl ?? undefined}
        autoPlay={autoPlay}
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-primary" />
        </div>
      )}

      {/* Flash feedback */}
      {flashLabel && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/70 px-6 py-3 text-2xl font-bold tabular-nums backdrop-blur-md animate-fade-in">
            {flashLabel}
          </div>
        </div>
      )}

      {/* Center play overlay */}
      {!isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
          aria-label="Reproduzir"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-2xl transition-transform hover:scale-110">
            <Play className="h-10 w-10 fill-current" />
          </span>
        </button>
      )}

      {/* Top bar: brand + title */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary px-2 py-0.5 text-xs font-black uppercase tracking-widest text-primary-foreground">
            PromoFlix
          </span>
          {title && (
            <span className="text-sm font-medium text-white/90 drop-shadow">{title}</span>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        {/* Seek bar */}
        <div className="group/seek relative mb-2 flex items-center">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/seek:h-1.5">
            <div
              className="absolute inset-y-0 left-0 bg-white/40"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-primary"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPct}
            onChange={onSeek}
            aria-label="Linha do tempo"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="rounded-full p-2 transition-colors hover:bg-white/15"
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <button
            onClick={() => seekBy(-10)}
            className="rounded-full p-2 transition-colors hover:bg-white/15"
            aria-label="Voltar 10 segundos"
            title="Voltar 10s (J / ←)"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={() => seekBy(10)}
            className="rounded-full p-2 transition-colors hover:bg-white/15"
            aria-label="Avançar 10 segundos"
            title="Avançar 10s (L / →)"
          >
            <RotateCw className="h-5 w-5" />
          </button>

          {/* Volume */}
          <div className="group/vol flex items-center">
            <button
              onClick={toggleMute}
              className="rounded-full p-2 transition-colors hover:bg-white/15"
              aria-label={isMuted ? 'Ativar som' : 'Mutar'}
            >
              {volumeIcon}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              aria-label="Volume"
              className="w-0 cursor-pointer accent-primary transition-all group-hover/vol:ml-1 group-hover/vol:w-20"
            />
          </div>

          <div className="ml-1 text-sm font-medium tabular-nums text-white/90">
            {formatTime(currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
          </div>

          <div className="flex-1" />

          {/* Screenshot */}
          <button
            onClick={takeScreenshot}
            className="flex items-center gap-1 rounded-full p-2 transition-colors hover:bg-white/15"
            aria-label="Capturar frame"
            title="Foto do frame (S)"
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* Speed */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1 rounded-full px-2.5 py-2 text-sm font-medium tabular-nums transition-colors hover:bg-white/15"
                aria-label="Velocidade"
                title="Velocidade (< / >)"
              >
                <Gauge className="h-5 w-5" />
                {playbackRate}x
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuLabel>Velocidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PLAYBACK_RATES.map((rate) => (
                <DropdownMenuItem
                  key={rate}
                  onClick={() => setRate(rate)}
                  className={cn(playbackRate === rate && 'font-bold text-primary')}
                >
                  {rate === 1 ? 'Normal (1x)' : `${rate}x`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PiP */}
          <button
            onClick={togglePip}
            className="rounded-full p-2 transition-colors hover:bg-white/15"
            aria-label="Picture-in-Picture"
            title="Picture-in-Picture (P)"
          >
            <PictureInPicture2 className="h-5 w-5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="rounded-full p-2 transition-colors hover:bg-white/15"
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title="Tela cheia (F)"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
