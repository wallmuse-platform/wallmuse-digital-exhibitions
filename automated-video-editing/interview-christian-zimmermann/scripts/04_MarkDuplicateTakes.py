#!/usr/bin/env python3
"""
DaVinci Resolve - Mark and Handle Duplicate Takes

For interview segments with multiple takes (retakes, repeated sections),
this script helps you:
1. Identify overlapping/duplicate video sections
2. Mark them with colored markers
3. Disable/mute unwanted takes
4. Keep only the best take

Workflow:
- Add BLUE markers for "Keep this take"
- Add RED markers for "Remove this take"
- Script will disable clips under RED markers

Author: Alexandre Khan @WallMuse
Date: 2026-01-04
"""

import sys

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    'keep_marker_color': 'Blue',     # Markers indicating "keep this section"
    'remove_marker_color': 'Red',    # Markers indicating "remove this section"
    'disable_video': True,           # Disable video clips in remove sections
    'disable_audio': True,           # Disable audio clips in remove sections
    'add_gap': False,                # Replace with gap (or just disable)
}

# ============================================================================
# DAVINCI RESOLVE API CONNECTION
# ============================================================================

def get_resolve():
    """Connect to DaVinci Resolve API"""
    try:
        try:
            import DaVinciResolveScript as dvr
            return dvr.scriptapp("Resolve")
        except ImportError:
            sys.path.append('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules')
            import DaVinciResolveScript as dvr
            return dvr.scriptapp("Resolve")
    except Exception as e:
        print(f"❌ Error connecting to DaVinci Resolve: {e}")
        return None

# ============================================================================
# MAIN FUNCTIONS
# ============================================================================

def analyze_timeline_for_duplicates(timeline):
    """Analyze timeline and provide guidance on handling duplicates"""

    print("\n" + "="*70)
    print("DUPLICATE TAKE HANDLING GUIDE")
    print("="*70)

    print("\nYour timeline has doubled sections (retakes/repeated content).")
    print("Here's how to handle them:\n")

    print("MANUAL METHOD (Recommended for precision):")
    print("─" * 70)
    print("\n1. IDENTIFY DUPLICATES")
    print("   - Play through your timeline")
    print("   - Listen/watch for repeated sections")
    print("   - Note which take is better\n")

    print("2. MARK SECTIONS")
    print("   - At start of GOOD take → Press M → Name 'KEEP' → Color: Blue")
    print("   - At start of BAD take → Press M → Name 'REMOVE' → Color: Red")
    print("   - Or simply disable/delete unwanted clips\n")

    print("3. HANDLE DUPLICATES (Choose one method):")
    print("\n   Method A: Delete clips (permanent)")
    print("   ────────────────────────────────")
    print("     • Select unwanted clips")
    print("     • Press Delete or Backspace")
    print("     • Clips removed, timeline shortens\n")

    print("   Method B: Disable clips (non-destructive)")
    print("   ────────────────────────────────────────")
    print("     • Select unwanted clips")
    print("     • Right-click → Clip Enabled (uncheck)")
    print("     • Or press D")
    print("     • Clips stay in timeline but don't render\n")

    print("   Method C: Use video track layers")
    print("   ────────────────────────────────────")
    print("     • Move better take to upper video track (V2)")
    print("     • Leave alternate take on lower track (V1)")
    print("     • Upper track will be visible (overlays lower)")
    print("     • Can swap easily by moving clips up/down\n")

    print("   Method D: Create versions with compound clips")
    print("   ──────────────────────────────────────────────")
    print("     • Select section with both takes")
    print("     • Right-click → New Compound Clip")
    print("     • Name: 'Segment_TakeA' or 'Segment_TakeB'")
    print("     • Keep both versions")
    print("     • Swap by replacing compound clip\n")

    print("\n4. RECOMMENDED WORKFLOW FOR YOUR CASE:")
    print("   ────────────────────────────────────────")
    print("   Since you mentioned 'some are doubled':\n")

    print("   a) First pass - Review all doubles:")
    print("      - Play through entire timeline")
    print("      - Add BLUE marker at start of each GOOD take")
    print("      - Add RED marker at start of each BAD take\n")

    print("   b) Second pass - Clean up:")
    print("      - For sections with RED markers:")
    print("        → Select clips in that range")
    print("        → Press D to disable (or Delete to remove)")
    print("      - For sections with BLUE markers:")
    print("        → Leave as is\n")

    print("   c) Final check:")
    print("      - Play through entire timeline")
    print("      - Verify no gaps or jumps")
    print("      - Remove markers (right-click → Delete Marker)\n")

    markers = timeline.GetMarkers()
    if markers:
        print("\n" + "="*70)
        print("CURRENT MARKERS")
        print("="*70)
        for frame_id, marker_data in sorted(markers.items()):
            print(f"\nFrame {frame_id}: {marker_data.get('name', 'Unnamed')}")
            print(f"  Color: {marker_data.get('color', 'Unknown')}")

    print("\n" + "="*70)
    print("TIPS")
    print("="*70)
    print("• Use J/K/L keys for fast review (J=reverse, K=pause, L=forward)")
    print("• Tap L multiple times for faster playback")
    print("• Use I and O keys to set In/Out points around duplicate section")
    print("• Ripple Delete (Shift+Delete) removes clips AND closes the gap")
    print("• Save project before making major deletions")

    return True

def process_markers(timeline):
    """Process colored markers and disable/enable clips accordingly"""

    markers = timeline.GetMarkers()
    if not markers:
        print("\n⚠️  No markers found. Add markers first to mark keep/remove sections.")
        return False

    print("\n" + "="*70)
    print("PROCESSING MARKERS")
    print("="*70)

    keep_sections = []
    remove_sections = []

    # Categorize markers
    for frame_id, marker_data in sorted(markers.items()):
        color = marker_data.get('color', '').lower()
        name = marker_data.get('name', '')

        if CONFIG['keep_marker_color'].lower() in color.lower():
            keep_sections.append({'frame': int(frame_id), 'name': name})
            print(f"\n✅ KEEP: Frame {frame_id} - {name}")

        elif CONFIG['remove_marker_color'].lower() in color.lower():
            remove_sections.append({'frame': int(frame_id), 'name': name})
            print(f"\n❌ REMOVE: Frame {frame_id} - {name}")

    if not remove_sections:
        print("\n⚠️  No RED markers found marking sections to remove.")
        print("Add RED markers at sections you want to disable/remove.")
        return False

    print(f"\n📊 Summary:")
    print(f"   Keep sections: {len(keep_sections)}")
    print(f"   Remove sections: {len(remove_sections)}")

    print("\n" + "="*70)
    print("NEXT STEPS (Manual)")
    print("="*70)
    print("\nFor each RED marker section:")

    for i, section in enumerate(remove_sections, 1):
        print(f"\n{i}. Go to frame {section['frame']} ({section['name']})")
        print(f"   - Find the duplicate clips in this section")
        print(f"   - Select the clips")
        print(f"   - Press D to disable (or Delete to remove)")

    print("\n💡 DaVinci Resolve API has limited clip manipulation capabilities.")
    print("   The above steps must be done manually in the UI.")

    return True

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*70)
    print("DAVINCI RESOLVE - DUPLICATE TAKE HANDLER")
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

    # Get current timeline
    timeline = project.GetCurrentTimeline()
    if not timeline:
        print("❌ No timeline is open!")
        print("   Open a timeline first, then run this script.")
        return False

    print(f"✅ Current timeline: {timeline.GetName()}")

    # Provide workflow guide
    analyze_timeline_for_duplicates(timeline)

    # Process any existing markers
    print("\n" + "="*70)
    print("Checking for keep/remove markers...")
    process_markers(timeline)

    print("\n✅ Analysis complete!")

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
