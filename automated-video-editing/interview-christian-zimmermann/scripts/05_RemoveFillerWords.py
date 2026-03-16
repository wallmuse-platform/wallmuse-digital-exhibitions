#!/usr/bin/env python3
"""
DaVinci Resolve - Remove Filler Words (uggg, errr, umm, etc.)

This script helps identify and remove vocal filler words and hesitations
from interview footage.

Methods supported:
1. Using transcription to find filler words
2. Manual marking with colored markers
3. Waveform-based detection (visual guide)

Author: Alexandre Khan @WallMuse
Date: 2026-01-04
"""

import sys
import re

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    # Filler words to detect (French interview)
    'filler_words_french': [
        'euh', 'heu', 'bah', 'ben', 'hein', 'quoi', 'voilà', 'donc',
        'en fait', 'du coup', 'genre'
    ],

    # Filler words (English)
    'filler_words_english': [
        'um', 'uh', 'umm', 'uhh', 'err', 'ah', 'like', 'you know',
        'sort of', 'kind of', 'I mean'
    ],

    # Vocal hesitations (language-independent)
    'vocal_hesitations': [
        'uggg', 'errr', 'mmm', 'hmm', 'ahh', 'ohh'
    ],

    # Marker color for filler words
    'filler_marker_color': 'Yellow',

    # Processing options
    'ripple_delete': True,  # Close gaps after deletion
    'safety_frames': 3,     # Keep N frames before/after for natural flow
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
# FILLER WORD DETECTION
# ============================================================================

def analyze_subtitle_for_fillers(subtitle_text, language='french'):
    """Analyze subtitle text and identify filler words"""

    if language == 'french':
        fillers = CONFIG['filler_words_french'] + CONFIG['vocal_hesitations']
    else:
        fillers = CONFIG['filler_words_english'] + CONFIG['vocal_hesitations']

    found_fillers = []

    # Normalize text
    text_lower = subtitle_text.lower()

    # Search for each filler
    for filler in fillers:
        # Word boundary search
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.finditer(pattern, text_lower, re.IGNORECASE)

        for match in matches:
            found_fillers.append({
                'word': filler,
                'position': match.start(),
                'text': match.group()
            })

    return found_fillers

def detect_fillers_in_timeline(timeline):
    """Detect filler words from timeline subtitles/transcription"""

    print("\n" + "="*70)
    print("FILLER WORD DETECTION FROM SUBTITLES")
    print("="*70)

    # Check if timeline has subtitle track
    # Note: DaVinci API has limited subtitle access
    print("\n⚠️  DaVinci Resolve API doesn't provide direct subtitle text access.")
    print("Use one of these methods instead:\n")

    print("METHOD 1: Using Transcription (Recommended)")
    print("─" * 70)
    print("1. Open Edit Index (Shift+Cmd+E)")
    print("2. Go to Subtitles tab")
    print("3. Review transcription for filler words:")
    print("   French: euh, heu, bah, ben, en fait, du coup")
    print("   Vocal: uggg, errr, mmm, ahh")
    print("4. Click on each filler word subtitle")
    print("5. Note the timecode")
    print("6. Add YELLOW marker at that timecode")
    print("7. Name marker 'FILLER: [word]'")

    print("\n\nMETHOD 2: Export and Analyze SRT (Semi-automated)")
    print("─" * 70)
    print("1. Export subtitles: File > Export > Subtitles (SRT)")
    print("2. Run filler detection on SRT file (see below)")
    print("3. Script will show timecodes with fillers")
    print("4. Manually navigate and mark those sections")

    print("\n\nMETHOD 3: Visual/Audio Review (Manual)")
    print("─" * 70)
    print("1. Enable audio waveform display in timeline")
    print("2. Play through timeline (J/K/L keys)")
    print("3. Listen for filler words")
    print("4. When you hear one:")
    print("   • Press M to add marker")
    print("   • Name it 'FILLER: [word]'")
    print("   • Change color to Yellow")
    print("5. Continue through entire timeline")

    return True

def analyze_srt_file(srt_path):
    """Analyze exported SRT file for filler words"""

    print("\n" + "="*70)
    print("SRT FILE ANALYSIS")
    print("="*70)

    try:
        with open(srt_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ File not found: {srt_path}")
        return False
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False

    # Parse SRT format
    # Format:
    # 1
    # 00:00:01,000 --> 00:00:04,000
    # Subtitle text here

    entries = re.split(r'\n\s*\n', content.strip())
    filler_found = []

    for entry in entries:
        lines = entry.strip().split('\n')
        if len(lines) < 3:
            continue

        # index = lines[0]
        timecode = lines[1]
        text = ' '.join(lines[2:])

        # Analyze this subtitle for fillers
        fillers = analyze_subtitle_for_fillers(text, language='french')

        if fillers:
            filler_found.append({
                'timecode': timecode,
                'text': text,
                'fillers': fillers
            })

    if not filler_found:
        print("✅ No filler words detected!")
        return True

    print(f"\n⚠️  Found {len(filler_found)} subtitle entries with filler words:\n")

    for i, entry in enumerate(filler_found, 1):
        print(f"{i}. {entry['timecode']}")
        print(f"   Text: {entry['text']}")
        print(f"   Fillers: {', '.join([f['word'] for f in entry['fillers']])}")
        print()

    print("\n" + "="*70)
    print("NEXT STEPS")
    print("="*70)
    print("\nFor each entry above:")
    print("1. Go to the timecode in DaVinci Resolve")
    print("2. Listen to confirm it's a filler you want to remove")
    print("3. Set In point before the filler word")
    print("4. Set Out point after the filler word")
    print("5. Press Delete (or Shift+Delete for ripple delete)")

    return True

# ============================================================================
# FILLER REMOVAL WORKFLOW
# ============================================================================

def filler_removal_guide(timeline):
    """Provide comprehensive guide for removing filler words"""

    print("\n" + "="*70)
    print("FILLER WORD REMOVAL WORKFLOW")
    print("="*70)

    print("\n🎯 GOAL: Remove 'uggg', 'errr', and other verbal hesitations")
    print("         while maintaining natural conversation flow\n")

    print("=" * 70)
    print("STEP 1: IDENTIFY FILLER WORDS")
    print("=" * 70)

    print("\nOption A: Listen through timeline")
    print("─" * 40)
    print("• Play timeline with audio")
    print("• Press K to pause when you hear a filler")
    print("• Press M to add yellow marker")
    print("• Name marker: 'FILLER: uggg' (or the specific filler)")
    print("• Continue playing (press L)")
    print()

    print("Option B: Use transcription")
    print("─" * 40)
    print("• Shift+Cmd+E → Subtitles tab")
    print("• Read through transcription")
    print("• Look for: euh, heu, uggg, errr, mmm, ahh")
    print("• Note timecodes")
    print("• Add markers at those locations")
    print()

    print("Option C: Visual waveform inspection")
    print("─" * 40)
    print("• Show audio waveforms (Timeline > Show Audio Waveforms)")
    print("• Look for short, isolated peaks (often filler words)")
    print("• Zoom in on suspicious areas")
    print("• Listen and confirm")
    print()

    print("\n" + "=" * 70)
    print("STEP 2: REMOVE FILLER WORDS")
    print("=" * 70)

    print("\nFor EACH filler word marker:\n")

    print("Basic Method (Leaves gaps):")
    print("─" * 40)
    print("1. Navigate to the yellow marker")
    print("2. Use J/K/L to fine-tune to the exact filler")
    print("3. Press I (in point) just BEFORE the filler")
    print("4. Press O (out point) just AFTER the filler")
    print("5. Press Delete")
    print("   → Leaves a gap in timeline")
    print()

    print("Ripple Delete Method (Closes gaps automatically):")
    print("─" * 40)
    print("1. Navigate to the yellow marker")
    print("2. Press I just before filler")
    print("3. Press O just after filler")
    print("4. Press Shift+Delete (ripple delete)")
    print("   → Removes filler AND closes the gap")
    print("   → Timeline becomes shorter")
    print("   ⚠️  This shifts all subsequent clips earlier!")
    print()

    print("Precision Method (Best for maintaining sync):")
    print("─" * 40)
    print("1. Zoom in on timeline (Cmd++ or drag zoom slider)")
    print("2. Enable snapping (N key)")
    print("3. Use Blade tool (B) to cut:")
    print("   • Just before filler word")
    print("   • Just after filler word")
    print("4. Select the clip segment with the filler")
    print("5. Press Delete to remove")
    print("6. Drag adjacent clips together to close gap")
    print("7. Or use Shift+Delete for automatic ripple")
    print()

    print("\n" + "=" * 70)
    print("STEP 3: REFINE EDITS")
    print("=" * 70)

    print("\nAfter removing fillers:\n")

    print("• Play through the edit")
    print("• Listen for unnatural cuts")
    print("• If a cut sounds harsh:")
    print("  - Add 1-2 frame handles (don't cut too tight)")
    print("  - Or add a short cross-dissolve (Cmd+T)")
    print("  - Adjust audio levels at the cut if needed")
    print()

    print("• For longer pauses:")
    print("  - Don't remove ALL silence")
    print("  - Keep natural breathing pauses (0.5-1 second)")
    print("  - Only remove awkward hesitations")
    print()

    print("\n" + "=" * 70)
    print("TIPS FOR NATURAL RESULTS")
    print("=" * 70)

    print("""
• Don't over-edit: Some natural speech patterns are okay
• Keep the speaker's rhythm: Remove obvious fillers, keep subtle ones
• Watch video too: Make sure cuts don't create awkward facial expressions
• Safety frames: Leave 2-3 frames before/after filler for smooth audio
• Use cross-dissolves: 1-2 frame audio crossfades can smooth harsh cuts
• Preview in context: Play 5 seconds before/after each edit
• Be consistent: If you remove 'euh' once, remove all instances
""")

    print("\n" + "=" * 70)
    print("KEYBOARD SHORTCUTS CHEAT SHEET")
    print("=" * 70)

    shortcuts = {
        'M': 'Add marker',
        'I': 'Mark In point',
        'O': 'Mark Out point',
        'Delete': 'Delete (leaves gap)',
        'Shift+Delete': 'Ripple delete (closes gap)',
        'B': 'Blade/Razor tool',
        'A': 'Selection tool',
        'J/K/L': 'Reverse/Pause/Forward playback',
        'Cmd+T': 'Add default transition',
        'Cmd++': 'Zoom in timeline',
        'Cmd+-': 'Zoom out timeline',
        'N': 'Toggle snapping',
        'Shift+Z': 'Fit timeline to window',
    }

    for key, action in shortcuts.items():
        print(f"  {key:15} → {action}")

    print("\n" + "=" * 70)

    return True

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*70)
    print("DAVINCI RESOLVE - FILLER WORD REMOVER")
    print("="*70)

    # Check for SRT file argument
    if len(sys.argv) > 1:
        srt_path = sys.argv[1]
        print(f"\n📄 Analyzing SRT file: {srt_path}")
        return analyze_srt_file(srt_path)

    # Connect to Resolve
    print("\n📡 Connecting to DaVinci Resolve...")
    resolve = get_resolve()
    if not resolve:
        print("\n💡 TIP: You can also run this script with an SRT file:")
        print(f"   python3 {sys.argv[0]} path/to/subtitles.srt")
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
        return False

    print(f"✅ Current timeline: {timeline.GetName()}")

    # Provide comprehensive workflow guide
    filler_removal_guide(timeline)

    # Offer subtitle detection
    print("\n" + "="*70)
    print("AUTOMATED DETECTION (Optional)")
    print("="*70)
    print("\nTo analyze exported subtitles for fillers:")
    print(f"  python3 {sys.argv[0]} /path/to/your/subtitles.srt")

    detect_fillers_in_timeline(timeline)

    print("\n✅ Guide complete!")

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
