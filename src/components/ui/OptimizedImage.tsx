import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
  containerClassName?: string;
  priority?: boolean;
  blurAmount?: number;
  zoomAmount?: number;
  duration?: number;
  lqip?: string;
}

/**
 * OptimizedImage component that handles:
 * 1. Lazy loading via native loading="lazy" and IntersectionObserver fallback
 * 2. Smooth fade-in transition when loaded
 * 3. Skeleton placeholder while loading
 * 4. Error state handling with fallback icon
 */
export function OptimizedImage({
  src,
  alt,
  className,
  fallbackClassName,
  containerClassName,
  priority = false,
  blurAmount = 20,
  zoomAmount = 1.1,
  duration = 700,
  lqip,
  onLoad: onLoadProp,
  onError: onErrorProp,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, priority]);

  return (
    <div 
      className={cn('relative overflow-hidden bg-white', containerClassName)}
      style={{ 
        aspectRatio: props.width && props.height ? `${props.width}/${props.height}` : 'auto'
      } as React.CSSProperties}
    >
      {error ? (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-muted/30 text-muted-foreground transition-opacity duration-300',
            fallbackClassName,
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <ImageOff className="h-8 w-8 opacity-20" />
            <span className="text-xs font-medium opacity-40">Erro ao carregar</span>
          </div>
        </div>
      ) : (
        <>
          {/* Low Quality Image Preview (LQIP) */}
          {lqip && !isLoaded && !error && (
            <img
              src={lqip}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover scale-105"
              style={{ 
                filter: `blur(${blurAmount}px)`,
                transform: `scale(${zoomAmount})`,
              }}
            />
          )}

          {/* Loading Shimmer - only if no LQIP */}
          {!isLoaded && !lqip && (
            <div
              aria-hidden
              className="absolute inset-0 z-10 h-full w-full bg-white/20 image-shimmer backdrop-blur-sm"
            />
          )}

          <img
            ref={imgRef}
            src={isInView ? src : undefined}
            alt={alt}
            className={cn(
              'h-full w-full object-cover transition-all',
              isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0',
              className,
            )}
            style={{ 
              transitionDuration: `${duration}ms`,
              filter: isLoaded ? 'none' : `blur(${blurAmount}px)`,
              transform: isLoaded ? 'scale(1)' : `scale(${zoomAmount})`,
            }}
            onLoad={(e) => {
              setIsLoaded(true);
              onLoadProp?.(e);
            }}
            onError={(e) => {
              setError(true);
              onErrorProp?.(e);
            }}
            loading={priority ? 'eager' : 'lazy'}
            {...(priority ? { fetchpriority: 'high' } : {})}
            {...props}
          />
        </>
      )}
    </div>
  );
}
