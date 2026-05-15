/**
 * PresentationMode — Fullscreen slideshow for quotes/collections.
 * Shows products one per slide with clean, client-facing visuals.
 * Hides prices, internal data, menus.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Maximize, Minimize, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PresentationSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  description?: string | null;
  details?: { label: string; value: string }[];
  badge?: string | null;
}

interface PresentationModeProps {
  slides: PresentationSlide[];
  title: string;
  subtitle?: string;
  brandName?: string;
  onClose: () => void;
}

export function PresentationMode({ slides, title, subtitle, brandName, onClose }: PresentationModeProps) {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>();

  const totalSlides = slides.length + 1; // +1 for title slide

  const goNext = useCallback(() => {
    setCurrent(prev => Math.min(prev + 1, totalSlides - 1));
    setShowGrid(false);
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrent(prev => Math.max(prev - 1, 0));
    setShowGrid(false);
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setShowGrid(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          e.preventDefault();
          if (showGrid) setShowGrid(false);
          else if (isFullscreen) exitFullscreen();
          else onClose();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "g":
        case "G":
          e.preventDefault();
          setShowGrid(prev => !prev);
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(totalSlides - 1);
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, goTo, totalSlides, onClose, showGrid, isFullscreen]);

  // Hide cursor after inactivity
  useEffect(() => {
    function handleMouseMove() {
      setCursorHidden(false);
      clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(cursorTimer.current);
    };
  }, []);

  // Fullscreen API
  function toggleFullscreen() {
    if (document.fullscreenElement) exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  }

  function exitFullscreen() {
    document.exitFullscreen?.();
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const slide = current === 0 ? null : slides[current - 1];

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[9999] bg-black flex flex-col select-none",
        cursorHidden && "cursor-none"
      )}
    >
      {/* Top bar — fades */}
      <div className={cn(
        "absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 transition-opacity duration-500",
        "bg-gradient-to-b from-black/60 to-transparent",
        cursorHidden ? "opacity-0" : "opacity-100"
      )}>
        <div className="text-white/80 text-sm font-medium">
          {brandName || title}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Grade de slides (G)"
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Tela cheia (F)"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar (Esc)"
           aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {showGrid ? (
        <div className="flex-1 overflow-auto p-8 pt-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {/* Title slide thumbnail */}
            <button
              onClick={() => goTo(0)}
              className={cn(
                "aspect-video rounded-lg border-2 overflow-hidden transition-all hover:scale-105",
                current === 0 ? "border-primary ring-2 ring-primary/50" : "border-white/20"
              )}
            >
              <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
                <span className="text-white text-xs font-bold text-center line-clamp-2">{title}</span>
                {subtitle && <span className="text-white/60 text-[10px] mt-1 text-center line-clamp-1">{subtitle}</span>}
              </div>
            </button>
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i + 1)}
                className={cn(
                  "aspect-video rounded-lg border-2 overflow-hidden transition-all hover:scale-105 relative",
                  current === i + 1 ? "border-primary ring-2 ring-primary/50" : "border-white/20"
                )}
              >
                {s.imageUrl ? (
                  
<img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover"  loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                    <span className="text-white/40 text-xs">Sem imagem</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <span className="text-white text-[10px] font-medium line-clamp-1">{s.title}</span>
                </div>
                <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                  {i + 2}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Slide content */
        <div className="flex-1 flex items-center justify-center relative">
          {/* Navigation arrows */}
          {current > 0 && (
            <button
              onClick={goPrev}
              className={cn(
                "absolute left-4 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all",
                cursorHidden ? "opacity-0" : "opacity-100"
              )}
             aria-label="Voltar">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {current < totalSlides - 1 && (
            <button
              onClick={goNext}
              className={cn(
                "absolute right-4 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all",
                cursorHidden ? "opacity-0" : "opacity-100"
              )}
             aria-label="Avançar">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Title Slide */}
          {current === 0 && (
            <div className="text-center max-w-3xl px-8 animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-bold text-white font-display tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xl md:text-2xl text-white/60 mt-6">{subtitle}</p>
              )}
              <div className="mt-12 flex items-center justify-center gap-3 text-white/40">
                <span className="text-sm">{slides.length} {slides.length === 1 ? "produto" : "produtos"}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="text-sm">Use ← → para navegar</span>
              </div>
              {brandName && (
                <p className="text-white/30 text-sm mt-8">{brandName}</p>
              )}
            </div>
          )}

          {/* Product Slide */}
          {slide && (
            <div className="w-full h-full flex items-center justify-center px-8 md:px-16 animate-fade-in">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 max-w-6xl w-full">
                {/* Image */}
                <div className="flex-shrink-0 w-full md:w-1/2 max-h-[70vh] flex items-center justify-center">
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl" loading="lazy" />
                  ) : (
                    <div className="w-80 h-80 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-white/20 text-lg">Sem imagem</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left space-y-4 max-w-lg">
                  {slide.badge && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                      {slide.badge}
                    </span>
                  )}
                  <h2 className="text-3xl md:text-4xl font-bold text-white font-display leading-tight">
                    {slide.title}
                  </h2>
                  {slide.subtitle && (
                    <p className="text-lg text-white/50">{slide.subtitle}</p>
                  )}
                  {slide.description && (
                    <p className="text-base text-white/60 leading-relaxed line-clamp-4">
                      {slide.description}
                    </p>
                  )}
                  {slide.details && slide.details.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      {slide.details.map((d, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-white/40 text-sm">{d.label}</span>
                          <span className="text-white/80 text-sm font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom progress bar */}
      <div className={cn(
        "absolute bottom-0 inset-x-0 z-50 transition-opacity duration-500",
        cursorHidden && !showGrid ? "opacity-0" : "opacity-100"
      )}>
        <div className="flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
          <span className="text-white/50 text-sm tabular-nums">
            {current + 1} / {totalSlides}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current
                    ? "w-8 bg-primary"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
