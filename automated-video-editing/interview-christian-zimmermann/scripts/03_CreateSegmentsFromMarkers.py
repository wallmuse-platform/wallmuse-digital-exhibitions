#!/usr/bin/env python3
"""
DaVinci Resolve - Create Segment Timelines from Markers

This script reads markers from your master timeline and creates
individual segment timelines based on marker positions.

RECOMMENDED WORKFLOW (Preserve Original):
1. Duplicate your master timeline first (Right-click > Duplicate Timeline)
2. Name it "Master_Segmented" or "Master_Working"
3. In the duplicate:
   - Add markers (M) at segment boundaries
   - Name each marker (e.g., "Intro", "Background")
   - Handle duplicate takes
   - Remove filler words
4. Run this script on the cleaned-up duplicate
5. Original master remains untouched as backup

ALTERNATIVE WORKFLOW (Track Layers):
1. Copy clips to V2/A2 track (Option+drag or Cmd+C/Cmd+V)
2. Work on upper tracks, keep V1/A1 as reference
3. Add markers on the working layer
4. Run this script

Author: Alexandre Khan @WallMuse
Date: 2026-01-04
"""

import sys
import os

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    'master_timeline_name': 'Master',  # Adjust if your timeline has different name
    'segment_track_type': '2',  # Create X.2 timelines (interview tracks)
    'starting_segment_number': 1,  # First segment will be 1.2_SegmentName
    'frame_padding': 0,  # Extra frames to add before/after each segment
}

# ============================================================================
# DAVINCI RESOLVE API CONNECTION
# ============================================================================

def get_resolve():
    """Connect to DaVinci Resolve API"""
    try:
        # Try different import methods
        try:
            import DaVinciResolveScript as dvr
            return dvr.scriptapp("Resolve")
        except ImportError:
            # Alternative method
            sys.path.append('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules')
            import DaVinciResolveScript as dvr
            return dvr.scriptapp("Resolve")
    except Exception as e:
        print(f"❌ Error connecting to DaVinci Resolve: {e}")
        print("\nMake sure:")
        print("  1. DaVinci Resolve Studio is running")
        print("  2. A project is open")
        print("  3. Scripting is enabled (Preferences > System > General)")
        return None

# ============================================================================
# MAIN FUNCTIONS
# ============================================================================

def get_master_timeline(project):
    """Find and return the master timeline"""
    timeline_count = project.GetTimelineCount()

    # Try to find timeline with 'Master' in name
    for i in range(1, timeline_count + 1):
        timeline = project.GetTimelineByIndex(i)
        name = timeline.GetName()
        if CONFIG['master_timeline_name'].lower() in name.lower():
            return timeline

    # If not found, use current timeline
    current = project.GetCurrentTimeline()
    if current:
        print(f"⚠️  Using current timeline: {current.GetName()}")
        return current

    return None

def get_markers_from_timeline(timeline):
    """Extract all markers from timeline"""
    markers = timeline.GetMarkers()

    if not markers:
        print("❌ No markers found in timeline!")
        print("\nTo add markers:")
        print("  1. Position playhead at segment start")
        print("  2. Press M")
        print("  3. Name the marker (e.g., 'Intro', 'Main Discussion')")
        print("  4. Repeat for each segment boundary")
        return None

    # Convert to sorted list
    marker_list = []
    for frame_id, marker_data in markers.items():
        marker_list.append({
            'frame': int(frame_id),
            'name': marker_data.get('name', f'Segment_{frame_id}'),
            'color': marker_data.get('color', 'Blue'),
            'duration': marker_data.get('duration', 1),
        })

    # Sort by frame number
    marker_list.sort(key=lambda x: x['frame'])

    return marker_list

def create_segment_timeline(project, source_timeline, segment_num, segment_name, start_frame, end_frame):
    """Create a duplicate timeline for a segment"""

    # Generate timeline name
    track_type = CONFIG['segment_track_type']
    timeline_name = f"{segment_num}.{track_type}_{segment_name}"

    print(f"\n📹 Creating: {timeline_name}")
    print(f"   Frames: {start_frame} → {end_frame} ({end_frame - start_frame} frames)")

    # Check if timeline already exists
    timeline_count = project.GetTimelineCount()
    for i in range(1, timeline_count + 1):
        existing = project.GetTimelineByIndex(i)
        if existing.GetName() == timeline_name:
            print(f"   ⚠️  Timeline '{timeline_name}' already exists - skipping")
            return False

    # Set the source timeline as current
    project.SetCurrentTimeline(source_timeline)

    # Set in/out points for the segment
    source_timeline.SetCurrentTimecode(frames_to_timecode(start_frame, source_timeline))
    # Note: DaVinci API doesn't have direct SetInPoint/SetOutPoint in all versions
    # This is a manual step instruction

    print(f"   ℹ️  Manual step required:")
    print(f"   1. Set IN point at: {frames_to_timecode(start_frame, source_timeline)}")
    print(f"   2. Set OUT point at: {frames_to_timecode(end_frame, source_timeline)}")
    print(f"   3. Timeline > Duplicate Timeline")
    print(f"   4. Name it: {timeline_name}")

    return True

def frames_to_timecode(frame, timeline):
    """Convert frame number to timecode string"""
    fps = float(timeline.GetSetting('timelineFrameRate'))

    total_seconds = frame / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    frames = int(frame % fps)

    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames:02d}"

def analyze_segments(markers, timeline):
    """Analyze marker-based segments and prepare for duplication"""

    segments = []
    timeline_end = timeline.GetEndFrame()

    print("\n" + "="*70)
    print("SEGMENT ANALYSIS")
    print("="*70)

    for i, marker in enumerate(markers):
        segment_num = CONFIG['starting_segment_number'] + i
        segment_name = marker['name'].replace(' ', '_')
        start_frame = marker['frame'] - CONFIG['frame_padding']

        # Determine end frame (next marker or timeline end)
        if i < len(markers) - 1:
            end_frame = markers[i + 1]['frame'] - CONFIG['frame_padding']
        else:
            end_frame = timeline_end

        duration = end_frame - start_frame
        duration_sec = duration / float(timeline.GetSetting('timelineFrameRate'))

        segment = {
            'num': segment_num,
            'name': segment_name,
            'start': start_frame,
            'end': end_frame,
            'duration_frames': duration,
            'duration_sec': duration_sec,
        }

        segments.append(segment)

        # Display
        print(f"\nSegment {segment_num}: {segment_name}")
        print(f"  Start: {frames_to_timecode(start_frame, timeline)} (frame {start_frame})")
        print(f"  End:   {frames_to_timecode(end_frame, timeline)} (frame {end_frame})")
        print(f"  Duration: {duration_sec:.1f} seconds ({duration} frames)")

    return segments

def create_segments_workflow(project, timeline, segments):
    """Guide user through segment creation"""

    print("\n" + "="*70)
    print("SEGMENT CREATION WORKFLOW")
    print("="*70)

    print("\nDaVinci Resolve API has limited timeline duplication support.")
    print("Follow these steps for each segment:\n")

    for segment in segments:
        track_type = CONFIG['segment_track_type']
        timeline_name = f"{segment['num']}.{track_type}_{segment['name']}"

        print(f"\n{'─'*70}")
        print(f"Segment {segment['num']}: {segment['name']}")
        print(f"{'─'*70}")
        print(f"Timeline name: {timeline_name}")
        print(f"\nSteps:")
        print(f"  1. In timeline, press I at timecode: {frames_to_timecode(segment['start'], timeline)}")
        print(f"  2. Press O at timecode: {frames_to_timecode(segment['end'], timeline)}")
        print(f"  3. Go to Timeline menu > Duplicate Timeline")
        print(f"  4. Name the new timeline: {timeline_name}")
        print(f"  5. Press Enter")

    print("\n" + "="*70)
    print(f"Total segments to create: {len(segments)}")
    print("="*70)

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def show_duplication_guide():
    """Show guide for duplicating timeline before adding markers"""
    print("\n" + "="*70)
    print("STEP 0: DUPLICATE YOUR MASTER TIMELINE FIRST (RECOMMENDED)")
    print("="*70)

    print("\n🎯 WHY: Preserve your original master as backup\n")

    print("How to duplicate your timeline:")
    print("─" * 70)
    print("\nMethod 1: From Timeline List")
    print("  1. Go to Media Pool (Cmd+Shift+1)")
    print("  2. Find your Master timeline in the list")
    print("  3. Right-click on it")
    print("  4. Select 'Duplicate Timeline'")
    print("  5. Name it: 'Master_Segmented' or 'Master_Working'")
    print("  6. Open this new duplicated timeline")
    print("  7. Now add markers and make edits on this copy\n")

    print("Method 2: From Active Timeline")
    print("  1. Make sure your Master timeline is active")
    print("  2. Go to Timeline menu > Duplicate Timeline")
    print("  3. Name it: 'Master_Segmented'")
    print("  4. Click OK")
    print("  5. The duplicate opens automatically\n")

    print("Method 3: Copy Clips to New Tracks (Alternative)")
    print("  1. Select all clips in timeline (Cmd+A)")
    print("  2. Copy them (Cmd+C)")
    print("  3. Right-click track header > Add Track > Add Video Track")
    print("  4. Select new track (V2)")
    print("  5. Paste clips (Cmd+V)")
    print("  6. Clips appear on V2 layer")
    print("  7. V1 remains as backup reference\n")

    print("─" * 70)
    print("After duplicating, you can safely:")
    print("  • Add markers for segments")
    print("  • Delete duplicate takes")
    print("  • Remove filler words")
    print("  • Cut out unwanted sections")
    print("\nYour original Master timeline stays pristine!")
    print("="*70)

def main():
    print("\n" + "="*70)
    print("DAVINCI RESOLVE - CREATE SEGMENTS FROM MARKERS")
    print("="*70)

    # Connect to Resolve
    print("\n📡 Connecting to DaVinci Resolve...")
    resolve = get_resolve()
    if not resolve:
        return False

    project_manager = resolve.GetProjectManager()
    project = project_manager.GetCurrentProject()

    if not project:
        print("❌ No project is open!")
        return False

    print(f"✅ Connected to project: {project.GetName()}")

    # Show duplication guide first
    show_duplication_guide()

    # Get master timeline
    print(f"\n🎬 Looking for current timeline...")
    timeline = get_master_timeline(project)

    if not timeline:
        print("❌ Could not find master timeline!")
        return False

    print(f"✅ Found timeline: {timeline.GetName()}")
    print(f"   Duration: {timeline.GetEndFrame()} frames")
    print(f"   Frame rate: {timeline.GetSetting('timelineFrameRate')} fps")

    # Get markers
    print(f"\n🔖 Reading markers...")
    markers = get_markers_from_timeline(timeline)

    if not markers:
        return False

    print(f"✅ Found {len(markers)} markers")

    # Analyze segments
    segments = analyze_segments(markers, timeline)

    # Provide workflow instructions
    create_segments_workflow(project, timeline, segments)

    print("\n✅ Analysis complete!")
    print("\nNext steps:")
    print("  1. Follow the manual steps above to create each segment timeline")
    print("  2. After creating segments, you can run Step2c to handle duplicates")
    print("  3. Then use Step2d to remove filler words")

    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("\n✅ Script completed successfully!")
        else:
            print("\n❌ Script encountered errors")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
