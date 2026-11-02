# Alpha Channel Workflow

The alpha channel tool allows a video subject to float over a background in a montage — for example, a dancer or performer composited over an artwork. The workflow spans three stages: capture, post-production, and WallMuse assembly.

The first production using this workflow was the *Calligraphy Art* exhibition featuring artist Christian Zimmermann. The DaVinci Resolve scripts developed for that production are available in [`automated-video-editing/interview-christian-zimmermann/`](../../automated-video-editing/interview-christian-zimmermann/) and illustrate the full pipeline from dual-camera capture through segmentation, transcription, and subtitle translation. That exhibition also introduced the **four-track interview format** described below.

---

## 1. Capture

Shoot the subject against a solid-colour background (chroma key) or in an environment that allows clean rotoscoping. A dedicated lighting setup for the background minimises spill and makes removal easier in post.

For live performances, a clean greenscreen pass is the most reliable approach. For pre-recorded material, a controlled studio setting with a well-lit flat background works well.

---

## 2. DaVinci Resolve — Background Removal and Export

1. Import the footage into DaVinci Resolve
2. In the **Color** panel, apply a **Qualifier** or **Delta Keyer** to select and remove the background
3. Refine the matte with garbage mattes, edge softening, and spill suppression as needed
4. In the **Deliver** panel, export as one of the following formats that preserves the alpha channel:
   - **ProRes 4444** (`.mov`) — lossless alpha, best quality
   - **WebM VP9** with alpha — smaller file, good browser compatibility
5. Verify the export: the background should be transparent (checkerboard) in a player that shows alpha

DaVinci Resolve scripts for batch export live in `automated-video-editing/` in this repository.

---

## 3. WallMuse Assembly

1. Upload the alpha video as a standalone artwork in WallMuse (it appears in the artwork library like any other video)
2. In CreateMontage, open the target montage
3. Add the alpha video as an item on a track — typically on the same track as the background item, or on an additional track if the montage has multiple screens
4. Set the item duration to match or overlap the background item's duration
5. Enable the **Alpha Channel** tool on the item — WallMuse will composite it as an overlay during playback

The webplayer renders the alpha channel item on top of the background track using CSS `mix-blend-mode` or a canvas compositing pass, depending on the item type.

---

## Four-Track Interview Format

The *Calligraphy Art* production established a reusable multi-track structure for artist interview exhibitions. Each sequence (location or series of works) offers four simultaneous viewing experiences on four tracks:

| Track | Content |
|---|---|
| 1 | Artworks with artist interview audio |
| 2 | Filmed interview, subtitled in French |
| 3 | Filmed interview, subtitled in English |
| 4 | Artworks alone with music (e.g. a piece associated with the artist) |

The four tracks are authored as a single montage in CreateMontage and synchronized server-side. A visitor or venue operator selects the track that suits the context — gallery immersion, interview mode, or bilingual public screening. This format scales to other artist exhibitions with no changes to the production pipeline.

---

## Timing Notes

- The alpha item and the background item do not need to start at exactly the same offset; the author controls each independently
- If the alpha video is shorter than the background, the overlay simply ends while the background continues
- For synchronised live-performance captures, use the server `seekOffset` broadcast to keep multiple displays in drift-free sync
