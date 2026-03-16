#!/usr/bin/env python3
"""
Create Individual Timeline for Each Segment

Since DaVinci's "Export Using Markers" doesn't work with point markers,
this script creates 18 separate timelines (one per segment).

Then you can export each timeline individually, or batch export all.

Author: Alexandre Khan @WallMuse
Date: 2026-01-05
"""

import sys
sys.path.append('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules')
import DaVinciResolveScript as dvr

def frames_to_timecode(frame, fps):
    """Convert frame to timecode"""
    total_seconds = frame / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    frames_part = int(frame % fps)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames_part:02d}"

def main():
    print("\n" + "="*80)
    print("CREATE INDIVIDUAL SEGMENT TIMELINES")
    print("="*80)

    print("""
This will create 18 separate timelines from your markers:
- 1.2_Intro
- 2.2_Phrase_1_v2
- 3.2_Phrase_2_chantée
... etc.

Each timeline will contain just that segment's content.
Then you can export each timeline individually.
""")

    # Connect
    resolve = dvr.scriptapp('Resolve')
    pm = resolve.GetProjectManager()
    project = pm.GetCurrentProject()

    if not project:
        print("❌ No project open!")
        return False

    source_timeline = project.GetCurrentTimeline()
    if not source_timeline:
        print("❌ No timeline open!")
        return False

    print(f"\n✅ Source: {source_timeline.GetName()}")

    # Get markers
    markers = source_timeline.GetMarkers()
    if not markers:
        print("❌ No markers found!")
        return False

    fps = float(source_timeline.GetSetting('timelineFrameRate'))
    sorted_markers = sorted(markers.keys(), key=lambda x: int(x))

    print(f"✅ Found {len(sorted_markers)} markers\n")

    # Get media pool
    media_pool = project.GetMediaPool()

    print("="*80)
    print("CREATING SEGMENT TIMELINES")
    print("="*80 + "\n")

    created_timelines = []

    for i, frame_id in enumerate(sorted_markers, 1):
        marker = markers[frame_id]
        start_frame = int(frame_id)
        name = marker.get('name', f'Segment{i}')

        # Find end frame
        if i < len(sorted_markers):
            end_frame = int(sorted_markers[i])
        else:
            end_frame = source_timeline.GetEndFrame()

        duration_sec = (end_frame - start_frame) / fps

        # Create timeline name
        safe_name = name.replace(' ', '_').replace('/', '_')
        timeline_name = f"{i}.2_{safe_name}"

        print(f"{i:2d}. {name}")
        print(f"    Frames: {start_frame} → {end_frame}")
        print(f"    Duration: {duration_sec:.1f}s")
        print(f"    Timeline: {timeline_name}")

        # Get all clips from source timeline that overlap this segment
        v1_clips = source_timeline.GetItemListInTrack("video", 1)
        v2_clips = source_timeline.GetItemListInTrack("video", 2)
        a1_clips = source_timeline.GetItemListInTrack("audio", 1)

        # Find clips that overlap with this segment
        clips_to_add = []

        # Check V1 clips
        if v1_clips:
            for clip in v1_clips:
                clip_start = clip.GetStart()
                clip_end = clip.GetEnd()

                if clip_start < end_frame and clip_end > start_frame:
                    media_item = clip.GetMediaPoolItem()
                    if media_item:
                        # Calculate source in/out relative to clip
                        segment_clip_start = max(0, start_frame - clip_start)
                        segment_clip_end = min(clip_end - clip_start, end_frame - clip_start)

                        clips_to_add.append({
                            'mediaPoolItem': media_item,
                            'startFrame': int(segment_clip_start),
                            'endFrame': int(segment_clip_end),
                            'trackIndex': 1,
                            'recordFrame': max(0, clip_start - start_frame)
                        })

        if not clips_to_add:
            print(f"    ⚠️  No clips found for this segment")
            print()
            continue

        # Create empty timeline
        new_timeline = media_pool.CreateEmptyTimeline(timeline_name)

        if not new_timeline:
            print(f"    ❌ Could not create timeline")
            print()
            continue

        # Switch to new timeline
        project.SetCurrentTimeline(new_timeline)

        # Add clips
        result = media_pool.AppendToTimeline(clips_to_add)

        if result:
            print(f"    ✅ Created timeline with {len(clips_to_add)} clip(s)")
            created_timelines.append(timeline_name)
        else:
            print(f"    ⚠️  Timeline created but clips not added")

        print()

    # Switch back to source
    project.SetCurrentTimeline(source_timeline)

    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\n✅ Created {len(created_timelines)}/{len(sorted_markers)} segment timelines")

    if created_timelines:
        print("\n📋 Created timelines:")
        for tl_name in created_timelines:
            print(f"   - {tl_name}")

        print("\n" + "="*80)
        print("NEXT STEPS")
        print("="*80)
        print("""
1. Review each segment timeline in Media Pool

2. Export segments:

   METHOD A - Individual Export:
   - Switch to each timeline
   - File > Deliver
   - Export as needed

   METHOD B - Batch Export:
   - Create a Batch Render preset
   - Add all segment timelines to render queue
   - Render all at once

3. For each timeline, you can:
   - Import segment-specific SRT file
   - Adjust per-segment settings
   - Export with proper subtitles
""")

    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
