#!/usr/bin/env python3
"""
Split SRT File by Timeline Markers

This script:
1. Reads your full timeline SRT file (Master_FR.srt)
2. Reads marker positions from your timeline
3. Splits the SRT into 18 separate files, one per segment
4. Names them: 1.2_Intro_FR.srt, 2.2_Phrase1_v2_FR.srt, etc.

Usage:
    python3 SplitSRTByMarkers.py <input_srt_file>

Example:
    python3 SplitSRTByMarkers.py ~/Documents/Master_FR.srt

Author: Alexandre Khan @WallMuse
Date: 2026-01-05
"""

import sys
import os
import re
sys.path.append('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules')
import DaVinciResolveScript as dvr

def parse_srt_timecode(tc_str):
    """Convert SRT timecode (00:01:23,456) to seconds"""
    # Format: HH:MM:SS,mmm
    match = re.match(r'(\d+):(\d+):(\d+),(\d+)', tc_str)
    if match:
        hours, minutes, seconds, milliseconds = map(int, match.groups())
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000.0
    return 0

def seconds_to_srt_timecode(seconds):
    """Convert seconds to SRT timecode (00:01:23,456)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def frames_to_seconds(frame, fps):
    """Convert frame number to seconds"""
    return frame / fps

def read_srt_file(filepath):
    """Read SRT file and parse into subtitle entries"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by double newlines to get individual subtitle blocks
    blocks = re.split(r'\n\n+', content.strip())

    subtitles = []
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            # Line 1: sequence number
            # Line 2: timecode
            # Line 3+: subtitle text
            try:
                seq_num = int(lines[0])
                timecode_line = lines[1]
                text = '\n'.join(lines[2:])

                # Parse timecode: "00:01:23,456 --> 00:01:25,789"
                match = re.match(r'([\d:,]+)\s*-->\s*([\d:,]+)', timecode_line)
                if match:
                    start_tc, end_tc = match.groups()
                    start_sec = parse_srt_timecode(start_tc)
                    end_sec = parse_srt_timecode(end_tc)

                    subtitles.append({
                        'seq': seq_num,
                        'start': start_sec,
                        'end': end_sec,
                        'text': text
                    })
            except (ValueError, IndexError):
                continue

    return subtitles

def write_srt_segment(subtitles, output_file, start_time, end_time):
    """Write subtitles within time range to new SRT file"""
    segment_subs = []

    for sub in subtitles:
        # Include subtitle if it overlaps with segment
        if sub['end'] >= start_time and sub['start'] <= end_time:
            # Adjust timecodes to be relative to segment start
            adjusted_start = max(0, sub['start'] - start_time)
            adjusted_end = min(sub['end'] - start_time, end_time - start_time)

            segment_subs.append({
                'start': adjusted_start,
                'end': adjusted_end,
                'text': sub['text']
            })

    if not segment_subs:
        print(f"    ⚠️  No subtitles in this time range")
        return False

    # Write SRT file
    with open(output_file, 'w', encoding='utf-8') as f:
        for i, sub in enumerate(segment_subs, 1):
            start_tc = seconds_to_srt_timecode(sub['start'])
            end_tc = seconds_to_srt_timecode(sub['end'])

            f.write(f"{i}\n")
            f.write(f"{start_tc} --> {end_tc}\n")
            f.write(f"{sub['text']}\n\n")

    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 SplitSRTByMarkers.py <input_srt_file>")
        print("\nExample:")
        print("  python3 SplitSRTByMarkers.py ~/Documents/Master_FR.srt")
        return False

    input_srt = sys.argv[1]

    if not os.path.exists(input_srt):
        print(f"❌ File not found: {input_srt}")
        return False

    print("\n" + "="*80)
    print("SPLIT SRT FILE BY TIMELINE MARKERS")
    print("="*80)
    print(f"\n📄 Input SRT: {input_srt}")

    # Read SRT file
    print("\n📖 Reading SRT file...")
    subtitles = read_srt_file(input_srt)
    print(f"✅ Found {len(subtitles)} subtitle entries")

    if not subtitles:
        print("❌ No valid subtitles found in SRT file!")
        return False

    # Get timeline markers
    print("\n🔗 Connecting to DaVinci Resolve...")
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

    print(f"✅ Timeline: {timeline.GetName()}")

    # Get markers
    markers = timeline.GetMarkers()
    if not markers:
        print("❌ No markers found in timeline!")
        return False

    fps = float(timeline.GetSetting('timelineFrameRate'))
    sorted_markers = sorted(markers.keys(), key=lambda x: int(x))

    print(f"✅ Found {len(sorted_markers)} markers")

    # Create output directory
    output_dir = os.path.dirname(input_srt)
    segments_dir = os.path.join(output_dir, "segments")
    os.makedirs(segments_dir, exist_ok=True)

    print(f"\n📁 Output directory: {segments_dir}")
    print("\n" + "="*80)
    print("SPLITTING SRT INTO SEGMENTS")
    print("="*80 + "\n")

    # Process each segment
    segments_created = 0

    for i, frame_id in enumerate(sorted_markers, 1):
        marker = markers[frame_id]
        start_frame = int(frame_id)
        name = marker.get('name', f'Segment{i}')

        # Find end frame (next marker or timeline end)
        if i < len(sorted_markers):
            end_frame = int(sorted_markers[i])
        else:
            end_frame = timeline.GetEndFrame()

        # Convert to seconds
        start_sec = frames_to_seconds(start_frame, fps)
        end_sec = frames_to_seconds(end_frame, fps)
        duration = end_sec - start_sec

        # Create filename
        safe_name = name.replace(' ', '_').replace('/', '_')
        output_file = os.path.join(segments_dir, f"{i}.2_{safe_name}_FR.srt")

        print(f"{i:2d}. {name}")
        print(f"    Time: {start_sec:.1f}s → {end_sec:.1f}s ({duration:.1f}s)")

        # Write segment SRT
        success = write_srt_segment(subtitles, output_file, start_sec, end_sec)

        if success:
            print(f"    ✅ Created: {os.path.basename(output_file)}")
            segments_created += 1

        print()

    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\n✅ Successfully created {segments_created}/{len(sorted_markers)} segment files")
    print(f"\n📁 Location: {segments_dir}")
    print("\nNext steps:")
    print("  1. Review segment SRT files")
    print("  2. Translate each to English using translation script")
    print("  3. Import translated SRTs back into DaVinci")

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
