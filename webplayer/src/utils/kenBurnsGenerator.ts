/**
 * Ken Burns Effect Auto-Generation
 * Generates random zoom and pan parameters for images
 */

import { ZoomAndPanParams, ZoomAndPanPosition, ZoomAndPanAnimationType } from '../dao/ZoomAndPan';

/**
 * Seeded random number generator for synchronized multi-screen animations
 * Uses a simple LCG (Linear Congruential Generator) algorithm
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters (Numerical Recipes)
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Pick random element from array using optional seeded RNG
 */
function randomChoice<T>(array: T[], rng: () => number = Math.random): T {
  return array[Math.floor(rng() * array.length)];
}

/**
 * Generate random number in range using optional seeded RNG
 */
function randomRange(min: number, max: number, rng: () => number = Math.random): number {
  return min + rng() * (max - min);
}

/**
 * Generate random zoom and pan parameters for Ken Burns effect
 *
 * @param randomSeed - Optional seed for synchronized animations across screens
 *                     Same seed = identical animation pattern
 * @returns ZoomAndPanParams object with random start/end positions and scales
 */
export function generateRandomKenBurns(randomSeed?: number): ZoomAndPanParams {
  const rng = randomSeed !== undefined ? seededRandom(randomSeed) : Math.random;

  // All possible position anchors
  const positions: ZoomAndPanPosition[] = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'centre',
  ];

  // All possible animation types
  const animationTypes: ZoomAndPanAnimationType[] = [
    'constant',
    'ease-in',
    'ease-out',
    'ease-both',
    'accelerate',
    'decelerate',
  ];

  // Pick random positions (ensure start !== end for actual movement)
  let startPos = randomChoice(positions, rng);
  let endPos = randomChoice(positions, rng);

  // Ensure we have different positions (retry once if same)
  if (startPos === endPos) {
    endPos = randomChoice(
      positions.filter(p => p !== startPos),
      rng
    );
  }

  // Generate random scales within validated range (80-130%)
  // Start with lower scale, end with higher for zoom-in effect
  const startScale = Math.round(randomRange(100, 110, rng));
  const endScale = Math.round(randomRange(110, 130, rng));

  // Random scale direction
  const scaleDirections: ('height' | 'width')[] = ['height', 'width'];
  const startScaleDirection = randomChoice(scaleDirections, rng);
  const endScaleDirection = randomChoice(scaleDirections, rng);

  // Random animation type (weighted towards ease-both for smoother feel)
  const type = randomChoice(animationTypes, rng);

  return {
    enabled: true,
    start: {
      from: startPos,
      scale: startScale,
      scaleDirection: startScaleDirection,
    },
    end: {
      to: endPos,
      scale: endScale,
      scaleDirection: endScaleDirection,
    },
    type,
    randomSeed,
  };
}

/**
 * Calculate CSS translate values based on position anchor
 * These values work with objectFit: 'cover' to create pan effect
 *
 * IMPORTANT: Translate is applied AFTER scale in CSS transforms,
 * so translate percentages are relative to the scaled size.
 * We need to compensate for this to avoid excessive cropping.
 *
 * @param position - The anchor position
 * @param scale - The scale percentage (100-130)
 * @returns CSS translate string (e.g., "-3%, -2%")
 */
export function calculateTranslateForPosition(position: ZoomAndPanPosition, scale: number): string {
  // Calculate available pan range
  // Since translate is applied to scaled image, we need to divide by scale
  // to get the actual viewport movement
  // For a 120% scale, we have 20% extra content, but only ~10% safe pan range
  const panRange = ((scale - 100) / scale) * 50; // Conservative pan (50% of available space)

  switch (position) {
    case 'top-left':
      return `${panRange}%, ${panRange}%`;
    case 'top-right':
      return `${-panRange}%, ${panRange}%`;
    case 'bottom-left':
      return `${panRange}%, ${-panRange}%`;
    case 'bottom-right':
      return `${-panRange}%, ${-panRange}%`;
    case 'centre':
      return '0%, 0%';
    default:
      return '0%, 0%';
  }
}

/**
 * Map animation type to CSS animation timing function
 *
 * @param type - The animation type from ZoomAndPanParams
 * @returns CSS timing function string
 */
export function mapAnimationType(type: ZoomAndPanAnimationType): string {
  switch (type) {
    case 'constant':
      return 'linear';
    case 'ease-in':
      return 'ease-in';
    case 'ease-out':
      return 'ease-out';
    case 'ease-both':
      return 'ease-in-out';
    case 'accelerate':
      return 'cubic-bezier(0.4, 0.0, 1.0, 1.0)'; // Accelerating curve
    case 'decelerate':
      return 'cubic-bezier(0.0, 0.0, 0.6, 1.0)'; // Decelerating curve
    default:
      return 'ease-in-out';
  }
}

/**
 * Generate unique hash for zoomAndPan parameters
 * Used for caching/reusing CSS keyframes
 *
 * @param params - The zoomAndPan parameters
 * @returns Hash string
 */
export function hashZoomAndPanParams(params: ZoomAndPanParams): string {
  const str = JSON.stringify({
    start: params.start,
    end: params.end,
    type: params.type,
  });

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `kb${Math.abs(hash)}`;
}
