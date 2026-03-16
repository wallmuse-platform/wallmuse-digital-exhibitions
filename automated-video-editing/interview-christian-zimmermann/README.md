# Automated Video Editing — Interview: Christian Zimmermann

Scripts developed by **WallMuse** for the digital exhibition *Calligraphy Art* documentation of artist Christian Zimmermann.

## Context

This set of open-source Python scripts for **DaVinci Resolve Studio** implements WallMuse's methodology for automating the post-production of artistic interview footage. The source material consisted of two synchronised full-frame cameras (Panasonic Lumix S5IIX, V-Log) and an external audio recorder (Zoom). Scripts interface with DaVinci Resolve's Python scripting API to reduce repetitive operations while preserving editorial control where it matters.

**What is automated:**
- Media import and master timeline creation
- Segment boundary detection from timeline markers
- Duplicate take identification and handling
- Filler word detection from transcription
- Marker alignment to exact second boundaries
- Batch creation of per-segment timelines
- Camera track switching between the two angles
- Batch audio transcription to SRT (French)
- SRT splitting by segment and translation to English

**What remains manual by design:**
- Camera angle selection per take (editorial judgement)
- Audio sync by waveform (one-click in DaVinci)
- V-Log LUT application and exposure matching
- Final review of transcription accuracy

## Requirements

- DaVinci Resolve Studio 20 (Studio version required for scripting API)
- Python 3.8+
- DaVinci Resolve scripting enabled: *Preferences → System → General → External scripting: Local*
- Optional: `requests` (DeepL translation), `googletrans` (Google Translate)

## Installation

Place scripts in DaVinci Resolve's Comp scripts folder:

```
~/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/
```

They will then appear under **Workspace → Scripts → Comp** inside DaVinci Resolve.

## Workflow

### Phase 1 — Setup

**`01_CheckSetup.py`**
Verifies that DaVinci Resolve is running, a project is open, and the scripting API is reachable. Run this first to confirm the environment is ready.

**`02_CreateMasterTimeline.py`**
Imports the two video files and the external audio recording into the current project, creates a timestamped master timeline, and adds all three clips. Prints step-by-step instructions for the subsequent manual operations: waveform-based audio sync, V-Log LUT application, and exposure matching between cameras.

> Edit the `CONFIG` block at the top of the script to set your media file paths.

---

### Phase 2 — Segmentation and cleanup

**`03_CreateSegmentsFromMarkers.py`**
Reads all timeline markers (placed manually at segment boundaries), calculates the duration and timecode of each segment, and outputs exact In/Out instructions for duplicating each segment into its own named timeline (`1.2_Intro`, `2.2_Background`, etc.).

**`04_MarkDuplicateTakes.py`**
For segments containing retakes, guides the editor through marking preferred and rejected takes using coloured markers (blue = keep, red = remove). Reads existing markers and prints frame-accurate instructions for disabling or deleting the unwanted takes.

**`05_RemoveFillerWords.py`**
Detects French filler words and vocal hesitations (`euh`, `heu`, `en fait`, `du coup`, `uggg`, etc.) in either an exported SRT file or by inspecting the timeline's subtitle track. Outputs timecodes with surrounding text, ready for precise ripple-delete editing. Also accepts an SRT path as a command-line argument for standalone analysis.

**`06_RoundMarkersToSeconds.py`**
Snaps all timeline markers to their nearest exact second boundary (at 25 fps). This ensures segment boundaries align cleanly for export and image synchronisation. Deletes each original marker and recreates it at the rounded position, preserving name and colour.

---

### Phase 3 — Timeline and camera automation

**`07_CreateSegmentTimelines.py`**
Reads timeline markers and programmatically creates one named timeline per segment, extracting the relevant clip ranges from the source timeline. Handles multi-clip segments and reports which timelines were successfully created.

**`08_ApplyCameraSwitching.py`**
After the editor has manually cut both video tracks at each marker using the Blade tool, this script reads the markers and alternates which camera track is active per segment: it calls `SetClipEnabled(False)` on the non-primary track clips and attempts to apply a static zoom value via `SetProperty`. Keyframed zoom animations remain a manual step (DaVinci's scripting API does not support keyframe creation).

---

### Phase 4 — Transcription and subtitles

**`09_TranscribeAllSegments.py`**
Iterates over all timeline markers, creates a temporary per-segment timeline, calls DaVinci's built-in `CreateSubtitlesFromAudio` with French language settings, exports the resulting SRT, then removes the temporary timeline. Designed for batch processing of multi-segment interviews.

**`10_SplitSRTByMarkers.py`**
Takes a full-timeline SRT file exported from DaVinci and splits it into per-segment files using marker positions read live from the current timeline. Adjusts timecodes to be relative to each segment's start. Outputs files named `1.2_Intro_FR.srt`, `2.2_Background_FR.srt`, etc.

**`11_AnalyzeCaptionsForSegments.py`**
Reads the subtitle track on the active timeline and detects natural speech break points: long pauses between captions, sentence starts (capital letter detection), French transition words, and question patterns. Suggests adjusted marker positions and exports a full break-point report as a text file.

**`12_TranslateSRT.py`**
Translates a French SRT file to English. Supports Google Translate (no key required, via `googletrans`) and the DeepL API (recommended for accuracy, free API key required). Also generates a plain-text manual translation template as a fallback.

```bash
python3 12_TranslateSRT.py segment_FR.srt segment_EN.srt deepl
```

---

## Naming convention

Timelines follow the format `X.T_Title`:

| Field | Meaning |
|-------|---------|
| `X` | Segment number |
| `T` | Track type: `2` = interview (2 cameras), `0` = final delivery, `1` = French version |
| `Title` | Descriptive segment name |

---

## Notes on the DaVinci Resolve scripting API

The scripting API (Python and Lua) exposes timeline, media pool, and project management. Several operations are **not available** through the API and require manual action in the UI: setting In/Out points on an open timeline, creating keyframes, and certain subtitle export calls. Scripts in this collection are explicit about these boundaries and print precise UI instructions where automation is not possible.

---

## License

[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

You are free to use, share, and adapt these scripts, provided you give appropriate credit to WallMuse.
