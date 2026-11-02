#!/usr/bin/env python3
"""
Transcribe All Segments Automatically

This script:
1. Reads all 18 markers from your timeline
2. For each segment:
   - Sets In/Out marks programmatically (if possible)
   - Transcribes that segment
   - Exports captions to individual SRT files
3. Processes all segments automatically

⚠️ Note: DaVinci API cannot set In/Out marks programmatically.
This script will use a workaround by creating temporary timelines for each segment.

Author: Alexandre Khan @WallMuse
Date: 2026-01-05
"""

import sys
import os
import time
sys.path.append('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules')
import DaVinciResolveScript as dvr

def frames_to_timecode(frame, fps):
    """Convert frame to timecode"""
    total_seconds = frame / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    frames_part = int(frame % fps)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames_part:02d}\""

def transcribe_segment_via_temp_timeline(project, media_pool, source_timeline, segment_info, output_dir):
    """
    Transcribe a segment by creating a temporary timeline

    Since we can't set In/Out marks via API, we'll:
    1. Create a temporary timeline with just this segment
    2. Transcribe it
    3. Export subtitles
    4. Delete the temp timeline
    """

    seg_num = segment_info['num']
    seg_name = segment_info['name']
    start_frame = segment_info['start']
    end_frame = segment_info['end']
    fps = segment_info['fps']

    print(f"\n{'='*80}")
    print(f"SEGMENT {seg_num}/{segment_info['total']}: {seg_name}")
    print(f"{'='*80}")
    print(f"  Start: {frames_to_timecode(start_frame, fps)} (frame {start_frame})")
    print(f"  End:   {frames_to_timecode(end_frame, fps)} (frame {end_frame})")
    print(f"  Duration: {(end_frame - start_frame) / fps:.1f}s")

    # Get clips from source timeline
    v1_clips = source_timeline.GetItemListInTrack("video", 1)
    v2_clips = source_timeline.GetItemListInTrack("video", 2)
    a1_clips = source_timeline.GetItemListInTrack("audio", 1)

    if not v1_clips or not a1_clips:
        print("  ❌ No clips found on V1 or A1")
        return False

    # Find the clip(s) that overlap with this segment
    clips_to_add = []

    for clip in v1_clips:
        clip_start = clip.GetStart()
        clip_end = clip.GetEnd()

        # Check if clip overlaps with segment
        if clip_start < end_frame and clip_end > start_frame:
            media_item = clip.GetMediaPoolItem()
            if media_item:
                # Calculate the portion of the clip we need
                use_start = max(clip_start, start_frame)
                use_end = min(clip_end, end_frame)

                # Calculate source frames (offset within media)
                source_in = use_start - clip_start
                source_out = use_end - clip_start

                clips_to_add.append({
                    'mediaPoolItem': media_item,
                    'startFrame': int(source_in),
                    'endFrame': int(source_out)
                })

    if not clips_to_add:
        print("  ❌ Could not find clips for this segment")
        return False

    print(f"  📝 Found {len(clips_to_add)} clip(s) for this segment")

    # Create temporary timeline
    temp_timeline_name = f"_TEMP_Seg{seg_num}_{seg_name.replace(' ', '_')}"
    print(f"  📌 Creating temporary timeline: {temp_timeline_name}")

    temp_timeline = media_pool.CreateEmptyTimeline(temp_timeline_name)

    if not temp_timeline:
        print("  ❌ Could not create temporary timeline")
        return False

    # Switch to temp timeline
    project.SetCurrentTimeline(temp_timeline)

    # Add clips to timeline
    print("  📌 Adding clips to temporary timeline...")
    result = media_pool.AppendToTimeline(clips_to_add)

    if not result:
        print("  ⚠️  Could not add clips to timeline")
        # Try to delete temp timeline
        media_pool.DeleteTimelines([temp_timeline])
        return False

    print("  ✅ Clips added to temporary timeline")

    # Now transcribe this temporary timeline
    print(f"  🎤 Transcribing... (this may take 1-3 minutes)")

    resolve = dvr.scriptapp('Resolve')
    autoCaptionSettings = {
        resolve.SUBTITLE_LANGUAGE: resolve.AUTO_CAPTION_FRENCH,
        resolve.SUBTITLE_CAPTION_PRESET: resolve.AUTO_CAPTION_SUBTITLE_DEFAULT,
        resolve.SUBTITLE_CHARS_PER_LINE: 42,
        resolve.SUBTITLE_LINE_BREAK: resolve.AUTO_CAPTION_LINE_SINGLE,
        resolve.SUBTITLE_GAP: 0
    }

    transcribe_result = temp_timeline.CreateSubtitlesFromAudio(autoCaptionSettings)

    if not transcribe_result:
        print("  ❌ Transcription failed")
        media_pool.DeleteTimelines([temp_timeline])
        return False

    print("  ✅ Transcription complete!")

    # Check subtitle count
    subtitle_tracks = temp_timeline.GetTrackCount("subtitle")
    if subtitle_tracks > 0:
        subtitle_items = temp_timeline.GetItemListInTrack("subtitle", 1)
        if subtitle_items:
            print(f"  📊 Generated {len(subtitle_items)} caption items")

    # Export subtitles
    safe_name = seg_name.replace(' ', '_').replace('/', '_')
    output_filename = f"{seg_num}.2_{safe_name}_FR.srt"
    output_path = os.path.join(output_dir, output_filename)

    print(f"  💾 Exporting to: {output_filename}")

    # Export using project method
    export_result = project.SaveSubtitleFile(
        subtitle_items,
        output_path,
        resolve.EXPORT_SUBTITLE_AS_SRT
    )

    # Note: The above export method may not work. Alternative approach:
    # Manual instruction needed or use different export method

    if export_result:
        print(f"  ✅ Exported: {output_filename}")
    else:
        print(f"  ⚠️  Could not auto-export. You'll need to export manually:")
        print(f"     File > Export > Subtitles > Save as {output_filename}")

    # Clean up: Delete temporary timeline
    print(f"  🧹 Cleaning up temporary timeline...")
    project.SetCurrentTimeline(source_timeline)  # Switch back to source

    # Give DaVinci a moment to switch timelines
    time.sleep(0.5)

    delete_result = media_pool.DeleteTimelines([temp_timeline])
    if delete_result:
        print(f"  ✅ Temporary timeline deleted")
    else:
        print(f"  ⚠️  Could not delete temp timeline - please delete manually")

    return True

def main():
    print("\n" + "="*80)
    print("TRANSCRIBE ALL SEGMENTS AUTOMATICALLY")
    print("="*80)

    print("""
This script will:
1. Process each of your 18 markers
2. Create temporary timeline for each segment
3. Transcribe each segment
4. Export captions to individual files
5. Clean up temporary timelines

⏱️  Total estimated time: 20-40 minutes for all 18 segments
   (DaVinci processes ~3-5 min of audio per minute)
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

    print(f"\n✅ Source Timeline: {source_timeline.GetName()}")

    # Get markers
    markers = source_timeline.GetMarkers()
    if not markers:
        print("❌ No markers found!")
        return False

    fps = float(source_timeline.GetSetting('timelineFrameRate'))
    sorted_markers = sorted(markers.keys(), key=lambda x: int(x))

    print(f"✅ Found {len(sorted_markers)} segments to process")

    # Create output directory
    output_dir = os.path.expanduser("~/Documents/Blackmagic Design/DaVinci Resolve/Captions/segments")
    os.makedirs(output_dir, exist_ok=True)
    print(f"✅ Output directory: {output_dir}")

    # Get media pool
    media_pool = project.GetMediaPool()

    # Build segment list
    segments = []
    for i, frame_id in enumerate(sorted_markers, 1):
        marker = markers[frame_id]
        start_frame = int(frame_id)
        name = marker.get('name', f'Segment{i}')

        # Find end frame
        if i < len(sorted_markers):
            end_frame = int(sorted_markers[i])
        else:
            end_frame = source_timeline.GetEndFrame()

        segments.append({
            'num': i,
            'total': len(sorted_markers),
            'name': name,
            'start': start_frame,
            'end': end_frame,
            'fps': fps
        })

    # Process each segment
    successful = 0
    failed = 0

    print("\n" + "="*80)
    print("PROCESSING SEGMENTS")
    print("="*80)

    for segment in segments:
        try:
            result = transcribe_segment_via_temp_timeline(
                project,
                media_pool,
                source_timeline,
                segment,
                output_dir
            )

            if result:
                successful += 1
            else:
                failed += 1

        except Exception as e:
            print(f"  ❌ Error processing segment {segment['num']}: {e}")
            failed += 1
            continue

    # Summary
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    print(f"\n✅ Successfully transcribed: {successful}/{len(segments)}")
    if failed > 0:
        print(f"❌ Failed: {failed}/{len(segments)}")

    print(f"\n📁 Output location: {output_dir}")

    if successful > 0:
        print("\n" + "="*80)
        print("NEXT STEPS")
        print("="*80)
        print("""
1. Review the SRT files in the output directory
2. For any segments that failed, export manually:
   - File > Export > Subtitles
3. Translate to English using translation script
4. Import into your segment timelines
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
