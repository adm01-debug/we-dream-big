/**
 * Type declarations for canvas-confetti (no @types package installed).
 */
declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: Array<'square' | 'circle' | 'star'>;
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
    [key: string]: unknown;
  }

  interface CreateOptions {
    resize?: boolean;
    useWorker?: boolean;
  }

  type ConfettiFn = (options?: Options) => Promise<null> | null;

  interface Confetti extends ConfettiFn {
    create: (canvas: HTMLCanvasElement, options?: CreateOptions) => ConfettiFn;
    reset: () => void;
  }

  const confetti: Confetti;
  export default confetti;
}
