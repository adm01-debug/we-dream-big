import { useEffect } from "react";

/**
 * Scroll-lock fix v9 — Minimal observer, no layout thrashing.
 * 
 * Only listens for `data-state` attribute changes (not childList)
 * to detect overlay close transitions. Avoids getComputedStyle to
 * prevent forced reflows.
 */

function hasActiveOverlay(): boolean {
  const selectors = [
    '[data-state="open"][role="dialog"]',
    '[data-state="open"][role="alertdialog"]',
    '[vaul-drawer][data-state="open"]',
  ];

  for (const sel of selectors) {
    if (document.querySelector(sel)) return true;
  }

  return false;
}

function cleanupScrollLock() {
  if (hasActiveOverlay()) return;

  for (const el of [document.documentElement, document.body]) {
    el.removeAttribute('data-scroll-locked');

    const s = el.style;
    if (s.overflow === 'hidden') s.overflow = '';
    if (s.overflowY === 'hidden') s.overflowY = '';
    if (s.position === 'fixed') s.position = '';
    if (s.marginRight) s.marginRight = '';
    if (s.paddingRight) s.paddingRight = '';
    if (s.touchAction === 'none') s.touchAction = '';
    if (s.pointerEvents === 'none') s.pointerEvents = '';
    if (s.top && s.position !== 'fixed') s.top = '';
    if (s.width === '100%' && el === document.body) s.width = '';
  }

  document.body.classList.forEach(cls => {
    if (cls.startsWith('block-interactivity-')) {
      document.body.classList.remove(cls);
    }
  });
}

export function useScrollLockFix() {
  useEffect(() => {
    let scheduled = false;

    const scheduleCleanup = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        cleanupScrollLock();
        scheduled = false;
      });
    };

    // Only watch data-state attribute changes — no childList to reduce noise
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-state') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('data-state') === 'closed') {
            scheduleCleanup();
            break;
          }
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    // One-time initial cleanup
    cleanupScrollLock();

    return () => observer.disconnect();
  }, []);
}
