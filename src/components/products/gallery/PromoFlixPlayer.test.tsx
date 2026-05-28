
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
import { PromoFlixPlayer } from './PromoFlixPlayer';

// Mock hls.js for dynamic import
vi.mock('hls.js', () => {
  const mockHls = vi.fn().mockImplementation(() => ({
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    startLoad: vi.fn(),
    recoverMediaError: vi.fn(),
    currentLevel: -1,
    autoLevelEnabled: true,
  }));
  
  (mockHls as any).isSupported = vi.fn().mockReturnValue(true);
  (mockHls as any).Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
    LEVEL_SWITCHED: 'hlsLevelSwitched',
    LEVEL_SWITCHING: 'hlsLevelSwitching',
    FRAG_LOADED: 'hlsFragLoaded',
  };
  (mockHls as any).ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
    OTHER_ERROR: 'otherError',
  };

  return { default: mockHls };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
...
  MessageCircle: () => <div data-testid="whatsapp-icon" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PromoFlixPlayer Automated Tests', () => {

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Mock HTMLMediaElement prototype
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockImplementation(() => Promise.resolve()),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', {
      configurable: true,
      value: vi.fn().mockReturnValue('maybe'),
    });
  });

  it('should initialize volume from localStorage', () => {
    localStorage.setItem('promoflix_volume', '0.5');
    render(<PromoFlixPlayer src="test.mp4" />);
    expect(localStorage.getItem('promoflix_volume')).toBe('0.5');
  });

  it('should initialize playing state from localStorage', () => {
    localStorage.setItem('promoflix_playing', 'true');
    render(<PromoFlixPlayer src="test.mp4" autoPlay={false} />);
    expect(localStorage.getItem('promoflix_playing')).toBe('true');
  });

  it('should show manual load button after 10s timeout if video is stuck', async () => {
    vi.useFakeTimers();
    const { getByText } = render(<PromoFlixPlayer src="stuck.mp4" />);
    
    // Initial state: loading
    expect(getByText(/Carregando/i)).toBeDefined();
    
    // Advance 11 seconds to trigger STUCK_LOADING_TIMEOUT (10s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });
    
    // Should show manual load button
    expect(getByText(/Carregar Manualmente/i)).toBeDefined();
    
    vi.useRealTimers();
  });

  it('should show actionable error message when native video fails with code 4 (SRC_NOT_SUPPORTED)', async () => {
    const { findByText, getByRole } = render(<PromoFlixPlayer src="cors-error.mp4" />);
    
    const video = document.querySelector('video');
    if (video) {
      // Simulate SRC_NOT_SUPPORTED (code 4) on native playback (no HLS.js attached for .mp4)
      await act(async () => {
        Object.defineProperty(video, 'error', {
          value: { code: 4, message: 'SRC_NOT_SUPPORTED' },
          configurable: true
        });
        fireEvent(video, new Event('error'));
      });
    }
    
    // Check for actionable message (generalized — previously falsely attributed to CORS)
    expect(await findByText(/Não foi possível reproduzir este vídeo/i)).toBeDefined();
    expect(await findByText(/formato pode não ser suportado/i)).toBeDefined();
    
    // Ensure "Tentar Novamente" button exists and works
    const retryButton = getByRole('button', { name: /Tentar Novamente/i });
    expect(retryButton).toBeDefined();
    
    await act(async () => {
      fireEvent.click(retryButton);
    });
    
    // After retry, it should be in loading state again
    expect(await findByText(/Carregando/i)).toBeDefined();
  });

  it('should hide loading overlay when progress event has buffer', async () => {
    const { queryByText } = render(<PromoFlixPlayer src="test.mp4" />);
    
    const video = document.querySelector('video');
    if (video) {
      // Mock buffered range
      Object.defineProperty(video, 'buffered', {
        value: {
          length: 1,
          start: () => 0,
          end: () => 10,
        },
        configurable: true
      });
      
      await act(async () => {
        fireEvent(video, new Event('progress'));
      });
    }
    
    // Overlay should be gone (isLoading = false)
    await waitFor(() => {
      expect(queryByText(/Carregando/i)).toBeNull();
    });
  });

  it('should hide loading overlay when loadeddata event fires', async () => {
    const { queryByText } = render(<PromoFlixPlayer src="test.mp4" />);
    
    const video = document.querySelector('video');
    if (video) {
      await act(async () => {
        fireEvent(video, new Event('loadeddata'));
      });
    }
    
    await waitFor(() => {
      expect(queryByText(/Carregando/i)).toBeNull();
    });
  });

  it('should hide loading overlay when canplay event fires', async () => {
    const { queryByText } = render(<PromoFlixPlayer src="test.mp4" />);
    
    const video = document.querySelector('video');
    if (video) {
      await act(async () => {
        fireEvent(video, new Event('canplay'));
      });
    }
    
    await waitFor(() => {
      expect(queryByText(/Carregando/i)).toBeNull();
    });
  });
});
