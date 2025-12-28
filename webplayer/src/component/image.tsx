import { ImageMediaFile } from '../media/ImageMediaFile';
import React from 'react';
import { ZoomAndPanParams } from '../dao/ZoomAndPan';
import {
  calculateTranslateForPosition,
  mapAnimationType,
  hashZoomAndPanParams,
} from '../utils/kenBurnsGenerator';

// Track injected keyframes to avoid duplicates
const injectedKeyframes = new Set<string>();

/**
 * Inject CSS keyframe for Ken Burns animation
 * Returns the keyframe name to use in animation property
 */
function injectKenBurnsKeyframe(params: ZoomAndPanParams): string {
  const keyframeName = hashZoomAndPanParams(params);

  // Skip if already injected
  if (injectedKeyframes.has(keyframeName)) {
    return keyframeName;
  }

  // Calculate transform values
  const startTranslate = calculateTranslateForPosition(params.start.from, params.start.scale);
  const endTranslate = calculateTranslateForPosition(params.end.to, params.end.scale);

  // Generate keyframe CSS
  const keyframeCSS = `
    @keyframes ${keyframeName} {
      from {
        transform: scale(${params.start.scale / 100}) translate(${startTranslate});
      }
      to {
        transform: scale(${params.end.scale / 100}) translate(${endTranslate});
      }
    }
  `;

  // Inject into document
  const styleElement = document.createElement('style');
  styleElement.textContent = keyframeCSS;
  document.head.appendChild(styleElement);

  // Mark as injected
  injectedKeyframes.add(keyframeName);

  console.log(`[Ken Burns] Injected keyframe: ${keyframeName}`, {
    start: { scale: params.start.scale, translate: startTranslate },
    end: { scale: params.end.scale, translate: endTranslate },
  });

  return keyframeName;
}

export interface ImageProps {
  media?: ImageMediaFile; // Made optional to handle undefined media during initialization
  hidden: boolean;
  index: number;
  shouldLoad?: boolean; // <-- Added

  // Ken Burns effect parameters
  zoomAndPan?: ZoomAndPanParams;

  // FUTURE: Display mode based on copyright/croppable flags
  // objectFit?: 'cover' | 'contain';  // 'cover' = fill (default), 'contain' = fit (for non-croppable)
}

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ media, hidden, index, shouldLoad, zoomAndPan }, ref) => {
    // ===== ALL HOOKS MUST BE AT THE TOP (React Hooks rules) =====

    // Generate animation CSS if Ken Burns is enabled
    const animationStyle = React.useMemo(() => {
      if (!zoomAndPan || !zoomAndPan.enabled || !media) {
        return {};
      }

      const keyframeName = hashZoomAndPanParams(zoomAndPan);
      const timingFunction = mapAnimationType(zoomAndPan.type);
      const duration = media.duration || 30; // Use media duration or default to 30s

      return {
        animation: `${keyframeName} ${duration}s ${timingFunction} forwards`,
        animationPlayState: hidden ? 'paused' : 'running',
      };
    }, [zoomAndPan, media, hidden]);

    // Generate and inject CSS keyframes for Ken Burns animation
    React.useEffect(() => {
      if (zoomAndPan && zoomAndPan.enabled && media) {
        const keyframeName = injectKenBurnsKeyframe(zoomAndPan);
        console.log(`[Image #${index}] Ken Burns keyframe injected: ${keyframeName}`, zoomAndPan);
      }
    }, [zoomAndPan, media, index]);

    // Track visibility changes for cross-fade transitions
    React.useEffect(() => {
      if (media) {
        console.log(
          `[Image #${index}] 🎭 TRANSITION: ${hidden ? 'HIDING (fade out)' : 'SHOWING (fade in)'} - ${media.filename}`
        );
      }
    }, [hidden, media, index]);

    // Check if image element exists in DOM after render
    React.useEffect(() => {
      // Only run DOM checks if we have media
      if (!media) return;

      const checkImageInDOM = () => {
        const imgElement = document.getElementById(`image-${index}`) as HTMLImageElement | null;

        // CRITICAL DEBUG: Check all image elements in DOM
        const allImages = document.querySelectorAll('img');
        // console.log(`[Image Component #${index}] CRITICAL DEBUG - All images in DOM:`, Array.from(allImages).map(img => ({
        //     id: img.id,
        //     className: img.className,
        //     src: img.src,
        //     style: {
        //         display: img.style.display,
        //         visibility: img.style.visibility
        //     }
        // })));

        // CRITICAL DEBUG: Show first 10 images to understand what they are
        const first10Images = Array.from(allImages)
          .slice(0, 10)
          .map((img, i) => ({
            index: i,
            id: img.id,
            className: img.className,
            src: img.src ? img.src.substring(0, 50) + '...' : 'no src',
            hasId: !!img.id,
            hasClass: !!img.className,
            tagName: img.tagName,
            parentElement: img.parentElement?.tagName,
            parentId: img.parentElement?.id,
            parentClass: img.parentElement?.className,
          }));
        // console.log(`[Image Component #${index}] FIRST 10 IMAGES IN DOM:`, first10Images);

        // CRITICAL DEBUG: Check if any of the 4 images have our expected ID pattern
        const imagesWithIds = Array.from(allImages).filter(img => img.id);
        // console.log(`[Image Component #${index}] IMAGES WITH IDs:`, imagesWithIds.map(img => ({
        //     id: img.id,
        //     className: img.className,
        //     src: img.src ? img.src.substring(0, 30) + '...' : 'no src'
        // })));

        // CRITICAL DEBUG: Check if any image has our expected ID
        const ourImage = Array.from(allImages).find(img => img.id === `image-${index}`);
        if (ourImage) {
          // console.log(`[Image Component #${index}] FOUND OUR IMAGE WITH CORRECT ID:`, {
          //     id: ourImage.id,
          //     className: ourImage.className,
          //     src: ourImage.src
          // });
        } else {
          // console.log(`[Image Component #${index}] NO IMAGE FOUND WITH ID 'image-${index}'`);
        }

        // CRITICAL DEBUG: Check if our specific element exists with any ID
        const ourElement = Array.from(allImages).find(img => img.src === media.url);
        if (ourElement) {
          // console.log(`[Image Component #${index}] FOUND OUR ELEMENT:`, {
          //     id: ourElement.id,
          //     className: ourElement.className,
          //     src: ourElement.src,
          //     expectedId: `image-${index}`,
          //     hasExpectedId: ourElement.id === `image-${index}`
          // });
        } else {
          // console.log(`[Image Component #${index}] OUR ELEMENT NOT FOUND - checking all images with similar src`);
          Array.from(allImages).forEach((img, i) => {
            if (img.src && media.filename && img.src.includes(media.filename)) {
              // console.log(`[Image Component #${index}] SIMILAR IMAGE ${i}:`, {
              //     id: img.id,
              //     className: img.className,
              //     src: img.src,
              //     filename: media.filename
              // });
            }
          });
        }

        // console.log(`[Image Component #${index}] DOM check:`, {
        //     elementExists: !!imgElement,
        //     elementId: `image-${index}`,
        //     elementSrc: imgElement?.src,
        //     elementHidden: imgElement?.classList.contains('hidden'),
        //     allImagesInDOM: allImages.length,
        //     elementStyle: imgElement ? {
        //         display: imgElement.style.display,
        //         visibility: imgElement.style.visibility,
        //         opacity: imgElement.style.opacity,
        //         position: imgElement.style.position,
        //         zIndex: imgElement.style.zIndex
        //     } : null
        // });
      };

      // Check immediately and after delays
      checkImageInDOM();
      setTimeout(checkImageInDOM, 100);
      setTimeout(checkImageInDOM, 500); // Add longer delay
    }, [index, media?.filename]);

    // CRITICAL DEBUG: Add useEffect to track component lifecycle
    React.useEffect(() => {
      // console.log(`[Image Component #${index}] COMPONENT MOUNTED:`, {
      //     filename: media?.filename,
      //     url: media?.url,
      //     hidden: hidden,
      //     shouldLoad: shouldLoad
      // });

      // Check if element exists after mount
      setTimeout(() => {
        const elementAfterMount = document.getElementById(
          `image-${index}`
        ) as HTMLImageElement | null;
        // console.log(`[Image Component #${index}] ELEMENT CHECK AFTER MOUNT:`, {
        //     elementExists: !!elementAfterMount,
        //     elementId: `image-${index}`,
        //     elementSrc: elementAfterMount?.src,
        //     elementHidden: elementAfterMount?.hidden
        // });
      }, 100);

      return () => {
        // console.log(`[Image Component #${index}] COMPONENT UNMOUNTING:`, {
        //     filename: media?.filename
        // });
      };
    }, [index, media?.filename]); // Reduced dependencies to prevent excessive re-runs

    // CRITICAL FIX: Always render image element like Video component does
    // Don't return null based on shouldLoad - let CSS handle visibility
    // This ensures both image-1 and image-2 slots always exist in DOM

    console.log(`[Image Component #${index}] Rendering:`, {
      filename: media?.filename || 'no media',
      hidden: hidden,
      shouldLoad: shouldLoad,
      url: media?.url || 'no url',
      hasMedia: !!media,
    });

    // FUTURE: Object-fit mode based on croppable flag
    // const objectFitMode = objectFit || 'cover';
    // When copyright images come: objectFit={media.croppable !== false ? 'cover' : 'contain'}

    // CRITICAL FIX: Always render img element, handle undefined media like Video component
    const imgElement = (
      <img
        ref={ref}
        src={media?.url || ''} // Empty src when no media (like Video component)
        className={hidden ? 'image hidden' : 'image'}
        id={`image-${index}`}
        alt="" // Add alt attribute to fix ESLint warning
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover', // FUTURE: Use objectFitMode when croppable flag available
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: hidden ? 0 : 2, // Ensure visible images appear above videos
          ...animationStyle, // Apply Ken Burns animation if enabled
        }}
        onLoad={() =>
          console.log(
            `[Image Component #${index}] Image loaded successfully:`,
            media?.filename || 'no filename'
          )
        }
        onError={e => {
          // Only log errors for images with actual media (ignore empty src errors)
          if (media?.url) {
            console.warn(`[Image Component #${index}] Image failed to load:`, media.filename, e);
          }
        }}
      />
    );

    // CRITICAL DEBUG: Check if the ID is being set correctly in the React element
    // console.log(`[Image Component #${index}] REACT ELEMENT DEBUG:`, {
    //     elementType: imgElement.type,
    //     elementProps: imgElement.props,
    //     elementId: imgElement.props.id,
    //     elementKey: imgElement.key
    // });
    // console.log(`[Image Component #${index}] Returning img element:`, imgElement);

    // Additional debugging: check all images in DOM after render (reduced frequency)
    setTimeout(() => {
      const allImages = document.querySelectorAll('img');
      // console.log(`[Image Component #${index}] All images in DOM (200ms):`, Array.from(allImages).map(img => ({
      //     id: img.id,
      //     src: img.src,
      //     className: img.className,
      //     style: {
      //         display: img.style.display,
      //         visibility: img.style.visibility,
      //         position: img.style.position
      //     }
      // })));

      // CRITICAL DEBUG: Check if our React ref is working
      const refElement = ref && 'current' in ref ? ref.current : null;
      if (refElement) {
        const computedStyle = window.getComputedStyle(refElement);
        // console.log(`[Image Component #${index}] REACT REF CHECK (200ms):`, {
        //     refExists: !!refElement,
        //     refId: refElement?.id,
        //     refSrc: refElement?.src,
        //     refStyle: {
        //         display: refElement.style.display,
        //         visibility: refElement.style.visibility,
        //         position: refElement.style.position,
        //         zIndex: refElement.style.zIndex
        //     },
        //     computedStyle: {
        //         display: computedStyle.display,
        //         visibility: computedStyle.visibility,
        //         position: computedStyle.position,
        //         zIndex: computedStyle.zIndex,
        //         width: computedStyle.width,
        //         height: computedStyle.height,
        //         opacity: computedStyle.opacity
        //     },
        //     refParent: refElement?.parentElement?.id || refElement?.parentElement?.className,
        //     isVisible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0',
        //     imageState: {
        //         complete: refElement.complete,
        //         naturalWidth: refElement.naturalWidth,
        //         naturalHeight: refElement.naturalHeight,
        //         currentSrc: refElement.currentSrc
        //     },
        //     parentContainer: {
        //         parentId: refElement?.parentElement?.id,
        //         parentClass: refElement?.parentElement?.className,
        //         parentStyle: refElement?.parentElement ? {
        //             display: window.getComputedStyle(refElement.parentElement).display,
        //             visibility: window.getComputedStyle(refElement.parentElement).visibility,
        //             width: window.getComputedStyle(refElement.parentElement).width,
        //             height: window.getComputedStyle(refElement.parentElement).height
        //         } : null
        //     },
        //     rootContainer: {
        //         rootId: document.getElementById('root-wm-player')?.id,
        //         rootChildren: document.getElementById('root-wm-player')?.children?.length,
        //         rootStyle: document.getElementById('root-wm-player') ? {
        //             display: window.getComputedStyle(document.getElementById('root-wm-player')!).display,
        //             visibility: window.getComputedStyle(document.getElementById('root-wm-player')!).visibility,
        //             width: window.getComputedStyle(document.getElementById('root-wm-player')!).width,
        //             height: window.getComputedStyle(document.getElementById('root-wm-player')!).height
        //         } : null
        //     }
        // });
      } else {
        // console.log(`[Image Component #${index}] REACT REF CHECK (200ms):`, {
        //     refExists: false
        // });
      }
    }, 200);

    return imgElement;
  }
);
