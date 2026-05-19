import { useState, useCallback, useEffect, useRef } from "react";

/**
 * useDebounce - Hook para debounce de valores
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Hook para debounce de callbacks
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * useThrottle - Hook para throttle de valores
 */
export function useThrottle<T>(value: T, limit = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    // Immediate update for very short strings or empty
    if (typeof value === 'string' && value.length < 2) {
      setThrottledValue(value);
      return;
    }
    
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * useSearchAsYouType - Hook para search-as-you-type (CO-06)
 */
export function useSearchAsYouType(
  onSearch: (query: string) => void,
  options: {
    debounceMs?: number;
    minLength?: number;
  } = {}
) {
  const { debounceMs = 300, minLength = 2 } = options;
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (debouncedQuery.length >= minLength) {
      setIsSearching(true);
      onSearch(debouncedQuery);
      setIsSearching(false);
    } else if (debouncedQuery.length === 0) {
      onSearch("");
    }
  }, [debouncedQuery, minLength, onSearch]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (value.length >= minLength) {
      setIsSearching(true);
    }
  }, [minLength]);

  const clear = useCallback(() => {
    setQuery("");
    onSearch("");
  }, [onSearch]);

  return {
    query,
    setQuery: handleChange,
    clear,
    isSearching: isSearching && query.length >= minLength,
    debouncedQuery,
  };
}

export default useDebounce;
