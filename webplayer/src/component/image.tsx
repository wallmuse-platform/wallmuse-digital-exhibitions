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

    console.log(`[Image Component #${index}] Rendering:`, {
      filename: media?.filename || 'no media',
      hidden: hidden,
      shouldLoad: shouldLoad,
      url: media?.url || 'no url',
      hasMedia: !!media,
      isTitleOnly: media?.isTitleOnly || false,
    });

    // Title-only items: render background + text shapes instead of <img>
    if (media?.isTitleOnly) {
      const textShapes = (media.shapes || []).filter(
        (s: any) => s.tag_name === 'text'
      );
      // Server sends hex colors without #, optionally with alpha (e.g. "FFFFFF" or "000000FF")
      const parseColor = (c: string | undefined, fallback: string): string => {
        if (!c) return fallback;
        const hex = c.startsWith('#') ? c : `#${c}`;
        // Convert 8-char RGBA hex to CSS rgba
        if (hex.length === 9) {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const a = parseInt(hex.slice(7, 9), 16) / 255;
          return `rgba(${r},${g},${b},${a.toFixed(2)})`;
        }
        return hex;
      };

      return (
        <div
          id={`image-${index}`}
          className={hidden ? 'image hidden' : 'image'}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: hidden ? 0 : 2,
            backgroundColor: parseColor(media.backgroundColor, '#000000'),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '0 3%',
            boxSizing: 'border-box',
          }}
        >
          {textShapes
            .filter((s: any) => s.text)
            .map((shape: any, i: number) => (
              <div
                key={i}
                style={{
                  width: '100%',
                  color: parseColor(shape.color, '#ffffff'),
                  fontSize: shape.size ? `${shape.size}px` : '48px',
                  fontFamily: shape.font || 'SansSerif',
                  textAlign: (shape.halign as any) || 'center',
                }}
              >
                {shape.text.replace(/\s*\{[^}]*\}/g, '').trim()}
              </div>
            ))}
        </div>
      );
    }

    // Regular image rendering
    return (
      <img
        ref={ref}
        src={media?.url || ''}
        className={hidden ? 'image hidden' : 'image'}
        id={`image-${index}`}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: hidden ? 0 : 2,
          ...animationStyle,
        }}
        onLoad={() =>
          console.log(`[Image Component #${index}] Image loaded:`, media?.filename)
        }
        onError={e => {
          if (media?.url) {
            console.warn(`[Image Component #${index}] Image failed to load:`, media.filename);
          }
        }}
      />
    );
  }
);
