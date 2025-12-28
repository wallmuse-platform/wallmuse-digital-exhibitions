/**
 * ZoomAndPan parameters for Ken Burns effect on images
 * Based on CreateMontage ZoomAndPanDialog specifications
 */

export type ZoomAndPanPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'centre';
export type ZoomAndPanScaleDirection = 'height' | 'width';
export type ZoomAndPanAnimationType =
  | 'constant'
  | 'ease-in'
  | 'ease-out'
  | 'ease-both'
  | 'accelerate'
  | 'decelerate';

export interface ZoomAndPanParams {
  enabled: boolean;

  start: {
    from: ZoomAndPanPosition;
    scale: number; // 80-130% (validated in CreateMontage)
    scaleDirection: ZoomAndPanScaleDirection;
  };

  end: {
    to: ZoomAndPanPosition;
    scale: number; // 80-130% (validated in CreateMontage)
    scaleDirection: ZoomAndPanScaleDirection;
  };

  type: ZoomAndPanAnimationType; // Mutually exclusive - only ONE type per animation

  // FUTURE: For synchronized multi-screen animations
  // When multiple screens show the same image with same randomSeed,
  // they will have identical zoom/pan patterns
  randomSeed?: number;
}

// FUTURE: Image metadata for copyright and display modes
export interface ImageMetadata {
  // FUTURE: Copyright flag - when true, may require different display mode
  copyright?: boolean;

  // FUTURE: If false, image must use 'contain' mode (fit) instead of 'cover' (fill)
  // This prevents cropping of copyrighted content
  croppable?: boolean;

  // FUTURE: For multi-screen spanning - image can be split across screens
  // E.g., a high-resolution panorama shown across 3 screens in a "global" way
  splittable?: boolean;

  // FUTURE: For extracting specific shapes/elements from images
  // E.g., using only the 3 Adidas stripes as viewing content
  deconstructable?: boolean;
}
