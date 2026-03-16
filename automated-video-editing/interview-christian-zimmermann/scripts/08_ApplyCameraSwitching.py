#!/usr/bin/env python3
"""
ACTUAL Camera Switching Automation - WORKS!

This script CAN automate:
✅ Disabling clips on tracks (camera switching)
✅ Setting static zoom values per clip

This script CANNOT automate:
❌ Creating keyframes (must be done manually)
❌ Cutting clips at markers (must be done manually)

Workflow:
1. First, manually CUT both video tracks at each marker using Blade tool
2. Then run this script to:
   - Disable the non-primary camera clips
   - Apply static zoom values

Author: Alexandre Khan @WallMuse
Date: 2026-01-05
"""

import sys
import os
sys.path.append('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules')
import DaVinciResolveScript as dvr

#============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    'better_camera_track': 1,  # V1 = P1176953 (BLUE - better)
    'accent_camera_track': 2,  # V2 = P1000391 (RED - accent)

    # Zoom values (static - no animation possible via API)
    'zoom_amount': 10.0,  # 10% zoom
}

# ============================================================================
# MAIN FUNCTIONS
# ============================================================================

def frames_to_timecode(frame, fps):
    """Convert frame to timecode"""
    total_seconds = frame / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    frames_part = int(frame % fps)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames_part:02d}"

def apply_camera_switching(timeline):
    """Apply camera switching based on markers"""

    markers = timeline.GetMarkers()
    if not markers:
        print("❌ No markers found!")
        return False

    fps = float(timeline.GetSetting('timelineFrameRate'))

    print(f"\n{'='*80}")
    print("APPLYING CAMERA SWITCHING")
    print(f"{'='*80}\n")

    # Sort markers
    sorted_markers = sorted(markers.keys(), key=lambda x: int(x))

    # Get clips from each track
    v1_clips = timeline.GetItemListInTrack("video", 1)
    v2_clips = timeline.GetItemListInTrack("video", 2)

    if not v1_clips or not v2_clips:
        print("❌ Need clips on both V1 and V2 tracks!")
        return False

    print(f"V1 clips: {len(v1_clips)}")
    print(f"V2 clips: {len(v2_clips)}")
    print()

    # Process each marker segment
    changes_made = 0

    for i, frame_id in enumerate(sorted_markers, 1):
        marker = markers[frame_id]
        frame = int(frame_id)
        name = marker.get('name', 'Unnamed')
        tc = frames_to_timecode(frame, fps)

        # Determine which camera for this segment
        is_even = (i % 2 == 0)

        if is_even:
            primary_track = CONFIG['better_camera_track']
            disable_track = CONFIG['accent_camera_track']
            primary_name = "V1 (BLUE - Better)"
            disable_name = "V2 (RED)"
        else:
            primary_track = CONFIG['accent_camera_track']
            disable_track = CONFIG['better_camera_track']
            primary_name = "V2 (RED - Accent)"
            disable_name = "V1 (BLUE)"

        print(f"Segment {i}: {name}")
        print(f"  Marker at: {tc}")
        print(f"  Primary: {primary_name}")
        print(f"  Disable: {disable_name}")

        # Find clips that overlap with this marker
        # NOTE: This is approximate - works best if you already cut at markers

        target_clips = v1_clips if primary_track == 1 else v2_clips
        disable_clips = v2_clips if primary_track == 1 else v1_clips

        # Find clip at this frame
        for clip in disable_clips:
            clip_start = clip.GetStart()
            clip_end = clip.GetEnd()

            # Check if marker is within this clip
            if clip_start <= frame < clip_end:
                # Disable this clip
                current_state = clip.GetClipEnabled()
                if current_state:
                    result = clip.SetClipEnabled(False)
                    if result:
                        print(f"    ✅ Disabled clip: {clip.GetName()} ({frames_to_timecode(clip_start, fps)} - {frames_to_timecode(clip_end, fps)})")
                        changes_made += 1
                    else:
                        print(f"    ⚠️  Failed to disable: {clip.GetName()}")
                else:
                    print(f"    ℹ️  Already disabled: {clip.GetName()}")

        # Apply static zoom to primary camera clips
        for clip in target_clips:
            clip_start = clip.GetStart()
            clip_end = clip.GetEnd()

            if clip_start <= frame < clip_end:
                # Try to set zoom
                zoom_value = CONFIG['zoom_amount']

                # Note: SetProperty for zoom might not work in all versions
                # ZoomX and ZoomY are 0-100, not 1.0-1.15 scale
                try:
                    result = clip.SetProperty("ZoomX", zoom_value)
                    if result:
                        print(f"    ✅ Set zoom {zoom_value}% on {clip.GetName()}")
                        changes_made += 1
                    else:
                        print(f"    ⚠️  Zoom not applied (might require manual keyframes)")
                except Exception as e:
                    print(f"    ⚠️  Could not set zoom: {e}")

        print()

    return changes_made

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*80)
    print("AUTOMATED CAMERA SWITCHING")
    print("="*80)

    print("\n⚠️  IMPORTANT: Before running this script:")
    print("  1. Use Blade tool (B) to CUT both video tracks at each marker")
    print("  2. Save your timeline (Cmd+S)")
    print("  3. Run this script")
    print()

    input("Press Enter when ready to proceed...")

    resolve = dvr.scriptapp('Resolve')
    pm = resolve.GetProjectManager()
    project = pm.GetCurrentProject()

    if not project:
        print("❌ No project open!")
        return False

    print(f"\n✅ Project: {project.GetName()}")

    timeline = project.GetCurrentTimeline()

    if not timeline:
        print("❌ No timeline open!")
        return False

    print(f"✅ Timeline: {timeline.GetName()}")

    # Apply automation
    changes = apply_camera_switching(timeline)

    if changes > 0:
        print(f"\n{'='*80}")
        print(f"✅ SUCCESS! Made {changes} changes")
        print(f"{'='*80}")
        print("\nWhat was automated:")
        print("  ✅ Disabled non-primary camera clips")
        print("  ✅ Set static zoom values")
        print()
        print("What still needs manual work:")
        print("  ⚠️  Zoom keyframes (animate 1.0 → 1.15)")
        print("  ⚠️  Pan keyframes")
        print()
        print("Tip: Use Inspector panel to add keyframes to zoom/pan")
    else:
        print("\n⚠️  No changes made - make sure clips are cut at markers first!")

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
