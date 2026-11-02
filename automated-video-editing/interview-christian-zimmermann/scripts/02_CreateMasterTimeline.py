#!/usr/bin/env python3
"""
Step 1: Create Master Timeline
DaVinci Resolve Studio 20 - Modular Automation Script

This script:
1. Creates a new timeline
2. Imports 2 video files + 1 audio file
3. Adds clips to timeline
4. Prepares for sync and color grading

Usage: Run from Fusion > Scripts > Comp menu or from command line
"""

import sys
import os
from datetime import datetime

# DaVinci Resolve API paths
resolve_script_api = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
resolve_script_lib = os.path.join(resolve_script_api, "Modules")

sys.path.append(resolve_script_lib)

try:
    import DaVinciResolveScript as dvr_script
except ImportError:
    print("Error: Could not import DaVinci Resolve Python API")
    print("Make sure DaVinci Resolve is installed and scripting API is enabled")
    sys.exit(1)

# Configuration
CONFIG = {
    # File paths
    "video1": "/Volumes/T5 EVO WM/Christian Zimmerman/20251230/LUMIX1 RED/P1000391.MOV",
    "video2": "/Volumes/T5 EVO WM/Christian Zimmerman/20251230/LUMIX2 BLUE/P1176953.MOV",
    "audio": "/Volumes/T5 EVO WM/Christian Zimmerman/20251230/AUDIO/ZOOM0016_TrLR.WAV",

    # LUT path
    "lut_path": "/Users/alexandrekhan/Library/Application Support/ProApps/Camera LUTs/VLog_RAWGamut_to_VLog_VGamut_forS1H_ver100.cube",

    # Timeline settings
    "timeline_name": f"Master_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
    "timeline_framerate": "25",
    "timeline_resolution": "1920x1080"
}

def check_file_exists(file_path):
    """Check if file exists"""
    if os.path.exists(file_path):
        print(f"✓ File found: {os.path.basename(file_path)}")
        return True
    else:
        print(f"✗ File not found: {file_path}")
        return False

def create_master_timeline():
    """Main function to create master timeline"""

    print("=== Step 1: Creating Master Timeline ===")
    print(f"Timeline name: {CONFIG['timeline_name']}\n")

    # Step 0: Check if files exist
    print("[0/6] Checking media files...")
    files_ok = True
    files_ok &= check_file_exists(CONFIG["video1"])
    files_ok &= check_file_exists(CONFIG["video2"])
    files_ok &= check_file_exists(CONFIG["audio"])
    files_ok &= check_file_exists(CONFIG["lut_path"])

    if not files_ok:
        print("\n✗ Some files are missing. Please check paths.")
        return None

    # Get Resolve instance
    resolve = dvr_script.scriptapp("Resolve")
    if not resolve:
        print("✗ Could not connect to DaVinci Resolve")
        print("Make sure DaVinci Resolve is running")
        return None

    # Get current project
    project_manager = resolve.GetProjectManager()
    project = project_manager.GetCurrentProject()

    if not project:
        print("✗ No project open. Please open a project first.")
        return None

    print(f"✓ Connected to project: {project.GetName()}\n")

    media_pool = project.GetMediaPool()

    # Step 1: Import media files
    print("[1/6] Importing media files...")

    imported_clips = []
    media_files = [
        CONFIG["video1"],
        CONFIG["video2"],
        CONFIG["audio"]
    ]

    for media_file in media_files:
        clips = media_pool.ImportMedia([media_file])
        if clips:
            print(f"✓ Imported: {os.path.basename(media_file)}")
            imported_clips.extend(clips)
        else:
            print(f"✗ Failed to import: {os.path.basename(media_file)}")

    if len(imported_clips) < 3:
        print("✗ Could not import all media files")
        return None

    # Step 2: Create timeline
    print("\n[2/6] Creating timeline...")
    media_pool.SetCurrentFolder(media_pool.GetRootFolder())

    timeline = media_pool.CreateEmptyTimeline(CONFIG["timeline_name"])
    if timeline:
        print(f"✓ Timeline created: {CONFIG['timeline_name']}")
        project.SetCurrentTimeline(timeline)
    else:
        print("✗ Failed to create timeline")
        return None

    # Step 3: Get clips from media pool
    print("\n[3/6] Retrieving clips from media pool...")
    root_folder = media_pool.GetRootFolder()
    clips = root_folder.GetClipList()

    video1_clip = None
    video2_clip = None
    audio_clip = None

    # Find clips by name
    for clip in clips:
        clip_name = clip.GetName()
        if "P1000391" in clip_name:
            video1_clip = clip
            print(f"✓ Found Video 1 (LUMIX1 RED): {clip_name}")
        elif "P1176953" in clip_name:
            video2_clip = clip
            print(f"✓ Found Video 2 (LUMIX2 BLUE): {clip_name}")
        elif "ZOOM0016" in clip_name:
            audio_clip = clip
            print(f"✓ Found Audio: {clip_name}")

    # Step 4: Add clips to timeline
    print("\n[4/6] Adding clips to timeline...")

    if video1_clip and video2_clip and audio_clip:
        # Add clips to timeline
        clips_to_add = [video1_clip, video2_clip, audio_clip]
        result = media_pool.AppendToTimeline(clips_to_add)

        if result:
            print("✓ All clips added to timeline")
        else:
            print("✗ Failed to add clips to timeline")
            return None
    else:
        print("✗ Could not find all clips")
        if not video1_clip:
            print("  Missing: P1000391.MOV")
        if not video2_clip:
            print("  Missing: P1176953.MOV")
        if not audio_clip:
            print("  Missing: ZOOM0016_TrLR.WAV")
        return None

    # Step 5: Instructions for sync
    print("\n[5/6] Ready for audio sync...")
    print("MANUAL STEP - Auto-sync clips by waveform:")
    print("  1. In timeline, select all video clips (Cmd+A or Ctrl+A)")
    print("  2. Right-click > Auto Align Clips > Based on Waveform")
    print("  3. This will sync both camera angles to the audio recorder")

    # Step 6: Instructions for LUT and color
    print("\n[6/6] Ready for color grading...")
    print("MANUAL STEPS:")
    print("\nA. Disable video audio tracks:")
    print("  1. Select video clips in timeline")
    print("  2. Clip Attributes (Cmd+Shift+A) > Audio tab")
    print("  3. Disable embedded audio or mute")

    print("\nB. Apply Panasonic V-Log LUT:")
    print(f"  LUT: {CONFIG['lut_path']}")
    print("  1. Go to Color page")
    print("  2. Select both video clips")
    print("  3. In the node graph, right-click first node > 3D LUT")
    print("  4. Browse to and select the V-Log LUT")

    print("\nC. Match exposure between cameras:")
    print("  Camera 1 (P1000391 - RED) appears darker:")
    print("  - Increase Lift (shadows) by ~0.02-0.05")
    print("  - Increase Gamma (midtones) by ~1.05-1.10")
    print("  - Or use Primaries > Offset to brighten overall")
    print("\n  Camera 2 (P1176953 - BLUE) is the reference")
    print("  - Apply LUT only, minimal adjustment needed")

    # Summary
    print("\n=== Step 1 Complete ===")
    print(f"Timeline '{CONFIG['timeline_name']}' created successfully")
    print("\nWorkflow summary:")
    print("  ✓ Media imported")
    print("  ✓ Timeline created")
    print("  ✓ Clips added to timeline")
    print("  → Next: Sync clips by waveform (manual)")
    print("  → Next: Disable video audio (manual)")
    print("  → Next: Apply V-Log LUT (manual)")
    print("  → Next: Match camera exposure (manual)")
    print("\nSave project before proceeding to Step 2!")

    return timeline

if __name__ == "__main__":
    try:
        timeline = create_master_timeline()
        if timeline:
            print("\n✓ Script completed successfully")
            sys.exit(0)
        else:
            print("\n✗ Script failed")
            sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
