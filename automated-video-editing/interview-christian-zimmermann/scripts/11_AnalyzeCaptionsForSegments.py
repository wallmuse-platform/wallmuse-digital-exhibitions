#!/usr/bin/env python3
"""
Analyze French Captions for Natural Segment Boundaries

This script reads the generated French captions and detects:
✅ New phrase/sentence starts
✅ Topic changes (based on keywords)
✅ Long pauses between captions
✅ Natural break points for segments

It suggests better marker positions based on caption analysis.

Author: Alexandre Khan @WallMuse
Date: 2026-01-05
"""

import sys
import os
import re
sys.path.append('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules')
import DaVinciResolveScript as dvr

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    # Minimum gap between captions to consider a "pause" (seconds)
    'pause_threshold': 2.0,

    # Topic transition keywords in French
    'transition_words': [
        'alors', 'donc', 'ensuite', 'maintenant', 'puis',
        'par contre', 'en fait', 'du coup', 'voilà',
        'premièrement', 'deuxièmement', 'finalement',
        'par exemple', 'notamment', 'c\'est-à-dire'
    ],

    # Question words (often start new topics)
    'question_words': [
        'pourquoi', 'comment', 'quoi', 'qui', 'quand', 'où',
        'qu\'est-ce', 'est-ce que'
    ],
}

# ============================================================================
# CAPTION ANALYSIS
# ============================================================================

def frames_to_timecode(frame, fps):
    """Convert frame to timecode"""
    total_seconds = frame / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    frames_part = int(frame % fps)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames_part:02d}"

def frames_to_seconds(frame, fps):
    """Convert frame to seconds"""
    return frame / fps

def detect_sentence_start(text):
    """Check if text starts with capital letter (new sentence)"""
    text = text.strip()
    if not text:
        return False
    # Check if starts with capital letter
    return text[0].isupper() and len(text) > 1

def detect_transition_word(text):
    """Check if text contains transition words"""
    text_lower = text.lower()
    for word in CONFIG['transition_words']:
        if text_lower.startswith(word + ' ') or ' ' + word + ' ' in text_lower:
            return word
    return None

def detect_question(text):
    """Check if text contains question markers"""
    text_lower = text.lower()

    # Check for question mark
    if '?' in text:
        return True

    # Check for question words
    for word in CONFIG['question_words']:
        if word in text_lower:
            return True

    return False

def analyze_captions(timeline):
    """Analyze subtitle track for natural break points"""

    fps = float(timeline.GetSetting('timelineFrameRate'))

    # Get subtitle track
    subtitle_track_count = timeline.GetTrackCount("subtitle")

    if subtitle_track_count == 0:
        print("❌ No subtitle tracks found!")
        return None

    print(f"✅ Found {subtitle_track_count} subtitle track(s)")

    # Get subtitle items from track 1
    subtitle_items = timeline.GetItemListInTrack("subtitle", 1)

    if not subtitle_items:
        print("❌ No subtitle items in track!")
        return None

    print(f"✅ Found {len(subtitle_items)} caption items\n")

    # Analyze each caption
    break_points = []

    for i, item in enumerate(subtitle_items):
        start_frame = item.GetStart()
        end_frame = item.GetEnd()
        duration = item.GetDuration()

        # Get text - try GetName() which sometimes contains subtitle text
        text = item.GetName()

        start_tc = frames_to_timecode(start_frame, fps)
        start_sec = frames_to_seconds(start_frame, fps)

        # Detect features
        is_sentence_start = detect_sentence_start(text)
        transition_word = detect_transition_word(text)
        is_question = detect_question(text)

        # Check pause before this caption
        pause_before = 0
        if i > 0:
            prev_item = subtitle_items[i - 1]
            prev_end_frame = prev_item.GetEnd()
            gap_frames = start_frame - prev_end_frame
            pause_before = gap_frames / fps

        # Determine if this is a good break point
        is_break_point = False
        reasons = []

        if pause_before >= CONFIG['pause_threshold']:
            is_break_point = True
            reasons.append(f"Long pause ({pause_before:.1f}s)")

        if is_sentence_start and i > 0:
            is_break_point = True
            reasons.append("New sentence")

        if transition_word:
            is_break_point = True
            reasons.append(f"Transition: '{transition_word}'")

        if is_question:
            is_break_point = True
            reasons.append("Question")

        if is_break_point:
            break_points.append({
                'frame': start_frame,
                'timecode': start_tc,
                'seconds': start_sec,
                'text': text,
                'reasons': reasons,
                'pause_before': pause_before
            })

    return break_points

def compare_with_existing_markers(timeline, break_points):
    """Compare detected break points with existing markers"""

    markers = timeline.GetMarkers()
    fps = float(timeline.GetSetting('timelineFrameRate'))

    if not markers:
        print("⚠️  No existing markers to compare")
        return

    sorted_markers = sorted(markers.keys(), key=lambda x: int(x))

    print("\n" + "="*80)
    print("COMPARISON: EXISTING MARKERS vs SUGGESTED BREAK POINTS")
    print("="*80 + "\n")

    # For each marker, find nearest break point
    for i, frame_id in enumerate(sorted_markers, 1):
        marker = markers[frame_id]
        marker_frame = int(frame_id)
        marker_name = marker.get('name', 'Unnamed')
        marker_tc = frames_to_timecode(marker_frame, fps)

        # Find closest break point
        closest_break = None
        min_distance = float('inf')

        for bp in break_points:
            distance = abs(bp['frame'] - marker_frame)
            if distance < min_distance:
                min_distance = distance
                closest_break = bp

        distance_sec = min_distance / fps

        print(f"Marker {i}: {marker_name}")
        print(f"  Current: {marker_tc}")

        if closest_break and distance_sec < 10:  # Within 10 seconds
            print(f"  Nearest break: {closest_break['timecode']} ({distance_sec:.1f}s away)")
            print(f"  Text: {closest_break['text'][:60]}...")
            print(f"  Reasons: {', '.join(closest_break['reasons'])}")

            if distance_sec > 2:
                print(f"  💡 SUGGESTION: Consider moving marker to {closest_break['timecode']}")
        else:
            print(f"  ✓ No nearby natural break point detected")

        print()

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*80)
    print("CAPTION ANALYSIS - FIND NATURAL SEGMENT BOUNDARIES")
    print("="*80)

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

    print(f"\n✅ Project: {project.GetName()}")
    print(f"✅ Timeline: {timeline.GetName()}\n")

    print("="*80)
    print("ANALYZING CAPTIONS FOR BREAK POINTS...")
    print("="*80 + "\n")

    # Analyze captions
    break_points = analyze_captions(timeline)

    if not break_points:
        print("❌ Could not analyze captions")
        return False

    print(f"\n✅ Found {len(break_points)} potential break points\n")

    # Show top 25 break points
    print("="*80)
    print("TOP NATURAL BREAK POINTS")
    print("="*80 + "\n")

    # Sort by strength (number of reasons)
    break_points.sort(key=lambda x: len(x['reasons']), reverse=True)

    for i, bp in enumerate(break_points[:25], 1):
        print(f"{i:2d}. {bp['timecode']} ({bp['seconds']:.1f}s)")
        print(f"    Text: {bp['text'][:70]}")
        print(f"    Reasons: {', '.join(bp['reasons'])}")
        if bp['pause_before'] > 0:
            print(f"    Pause before: {bp['pause_before']:.1f}s")
        print()

    # Compare with existing markers
    compare_with_existing_markers(timeline, break_points)

    # Export to file
    output_dir = os.path.expanduser("~/Documents/Blackmagic Design/DaVinci Resolve/Timeline Exports")
    os.makedirs(output_dir, exist_ok=True)

    output_file = os.path.join(output_dir, f"{timeline.GetName()}_break_points.txt")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("CAPTION ANALYSIS - NATURAL BREAK POINTS\n")
        f.write("="*80 + "\n\n")

        for i, bp in enumerate(break_points, 1):
            f.write(f"{i}. {bp['timecode']}\n")
            f.write(f"   Text: {bp['text']}\n")
            f.write(f"   Reasons: {', '.join(bp['reasons'])}\n")
            f.write(f"   Pause: {bp['pause_before']:.1f}s\n")
            f.write("\n")

    print("\n" + "="*80)
    print("EXPORT COMPLETE")
    print("="*80)
    print(f"\nBreak points saved to:")
    print(f"  {output_file}")

    print("\n✅ Analysis complete!")
    print("\nUse this information to:")
    print("  1. Adjust your marker positions to natural speech breaks")
    print("  2. Add new markers at suggested break points")
    print("  3. Create cleaner segment boundaries")

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
