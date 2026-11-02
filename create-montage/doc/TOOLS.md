# CreateMontage Tools

CreateMontage provides four production tools that authors apply to items on the montage timeline. Each tool is configured per item and its parameters are stored in the backend, then delivered to the webplayer via the montage payload.

---

## Title

**Status:** Published

Overlays a text block on the item. Authors configure font, size, colour, position, and display timing relative to the item's start. Used for artwork labels, section headings, and caption overlays.

---

## ZoomAndPan (Ken Burns)

**Status:** Published

Authors an animated camera path on a still image or video: a start frame (position + zoom) and an end frame, with a transition duration. The webplayer interpolates the path using a seeded RNG so the motion is identical across all screens sharing the same montage, regardless of screen resolution.

The full chain (CreateMontage → backend → webplayer) is implemented. Parameters are stored as `effect_type`/`effect_data` on the item and parsed by `Item.ts` in the webplayer.

See [Ken Burns Implementation](../../webplayer/docs/features/KEN_BURNS_IMPLEMENTATION.md) for the webplayer-side rendering detail.

---

## Alpha Channel

**Status:** Experimental

Composites a video with a transparent (alpha) channel over a background item or artwork. The first production using this tool was the *Calligraphy Art* artist interview exhibition — the DaVinci Resolve automation scripts for that production are in [`automated-video-editing/interview-christian-zimmermann/`](../../automated-video-editing/interview-christian-zimmermann/).

The intended workflow is:

1. Record or capture the subject against a background
2. Remove the background in DaVinci Resolve and export as a ProRes 4444 or WebM with alpha
3. Upload the alpha video as a separate artwork in WallMuse
4. Add it as an overlay item on a montage track alongside the background item

See [ALPHA_CHANNEL_WORKFLOW.md](./ALPHA_CHANNEL_WORKFLOW.md) for the full end-to-end production steps.

---

## SpaceImage

**Status:** In development

Positions a still image precisely within the frame — controlling crop, offset, and scale independently of the track's default layout. Most useful in multi-screen compositions where an artwork needs exact spatial alignment relative to content on adjacent tracks (diptychs, triptychs, video walls). Authoring interface and backend storage are in progress; the feature is not yet available in production.
