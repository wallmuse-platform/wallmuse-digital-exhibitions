#!/usr/bin/env python3
"""
Round All Markers to Exact Seconds

At 25 fps:
- 00:00:24 (24 frames) → rounds to 00:01:00 (25 frames = 1 second)
- 00:00:12 (12 frames) → rounds to 00:00:00 (0 frames)
- 00:00:54:24 → rounds to 00:00:55:00

This ensures all segment boundaries are at exact second marks,
making it easier to sync with images and export.

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

def round_to_nearest_second(frame, fps):
    """Round frame number to nearest exact second"""
    frames_per_second = int(fps)

    # Get remainder when dividing by fps
    remainder = frame % frames_per_second

    # Round to nearest second
    if remainder >= frames_per_second / 2:
        # Round up
        rounded_frame = frame + (frames_per_second - remainder)
    else:
        # Round down
        rounded_frame = frame - remainder

    return int(rounded_frame)

def main():
    print("\n" + "="*80)
    print("ROUND MARKERS TO EXACT SECONDS")
    print("="*80)

    print("""
This script will:
1. Find all markers on your timeline
2. Round each marker to the nearest exact second
3. Update marker positions
4. Show you what changed

This makes segments align perfectly with second boundaries,
ideal for syncing with images and simplifying exports.
""")

    # Connect
    resolve = dvr.scriptapp('Resolve')
    pm = resolve.GetProjectManager()
    project = pm.GetCurrentProject()

    if not project:
        print("❌ No project open!")
        return False

    timeline = project.GetCurrentTimeline()
    if not timeline:
        print("❌ No timeline open!")
        return False

    print(f"\n✅ Timeline: {timeline.GetName()}")

    # Get markers
    markers = timeline.GetMarkers()
    if not markers:
        print("❌ No markers found!")
        return False

    fps = float(timeline.GetSetting('timelineFrameRate'))
    print(f"✅ Frame Rate: {fps} fps")
    print(f"✅ Found {len(markers)} markers\n")

    print("="*80)
    print("ANALYZING MARKERS")
    print("="*80 + "\n")

    changes = []
    no_change = []

    for frame_id in sorted(markers.keys(), key=lambda x: int(x)):
        marker = markers[frame_id]
        original_frame = int(frame_id)
        rounded_frame = round_to_nearest_second(original_frame, fps)

        name = marker.get('name', 'Unnamed')
        color = marker.get('color', 'Blue')

        original_tc = frames_to_timecode(original_frame, fps)
        rounded_tc = frames_to_timecode(rounded_frame, fps)

        frame_diff = rounded_frame - original_frame

        if frame_diff != 0:
            changes.append({
                'name': name,
                'color': color,
                'original_frame': original_frame,
                'rounded_frame': rounded_frame,
                'original_tc': original_tc,
                'rounded_tc': rounded_tc,
                'diff': frame_diff
            })

            direction = "→" if frame_diff > 0 else "←"
            print(f"📍 {name}")
            print(f"   {original_tc} {direction} {rounded_tc} ({frame_diff:+d} frames)")
        else:
            no_change.append(name)

    if no_change:
        print(f"\n✅ Already at exact seconds ({len(no_change)} markers):")
        for name in no_change:
            print(f"   - {name}")

    if not changes:
        print("\n✅ All markers are already at exact second boundaries!")
        print("   No changes needed.")
        return True

    print(f"\n📊 Summary:")
    print(f"   Markers to adjust: {len(changes)}")
    print(f"   Already aligned: {len(no_change)}")

    # Confirm changes
    print("\n" + "="*80)
    print("APPLYING CHANGES")
    print("="*80 + "\n")

    updated = 0
    failed = 0

    for change in changes:
        # Delete old marker
        delete_success = timeline.DeleteMarkerAtFrame(change['original_frame'])

        if delete_success:
            # Add new marker at rounded position
            add_success = timeline.AddMarker(
                change['rounded_frame'],
                change['color'],
                change['name'],
                '',  # note
                1    # duration
            )

            if add_success:
                print(f"✅ {change['name']}: {change['original_tc']} → {change['rounded_tc']}")
                updated += 1
            else:
                print(f"❌ {change['name']}: Could not add marker at new position")
                failed += 1
        else:
            print(f"❌ {change['name']}: Could not delete original marker")
            failed += 1

    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    print(f"\n✅ Successfully updated: {updated}/{len(changes)}")

    if failed > 0:
        print(f"❌ Failed: {failed}/{len(changes)}")
        print("\n⚠️  Some markers could not be updated.")
        print("   You may need to adjust them manually.")
    else:
        print("\n🎉 All markers now aligned to exact seconds!")
        print("\nNext steps:")
        print("  1. Review marker positions")
        print("  2. Cut timeline at markers")
        print("  3. Create segment timelines")
        print("  4. Export segments")

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
