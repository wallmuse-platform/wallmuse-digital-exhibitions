#!/usr/bin/env python3
"""
Setup Checker for DaVinci Resolve Automation Scripts

This script verifies that:
1. All media files are accessible
2. DaVinci Resolve scripting is working
3. Required directories exist
4. Python dependencies are available

Run this first before using the automation scripts.
"""

import sys
import os
from pathlib import Path

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def check_file(path, description):
    """Check if file exists and is accessible"""
    if os.path.exists(path):
        size = os.path.getsize(path)
        size_mb = size / (1024 * 1024)
        print(f"  ✓ {description}")
        print(f"    Path: {path}")
        print(f"    Size: {size_mb:.2f} MB")
        return True
    else:
        print(f"  ✗ {description}")
        print(f"    Path: {path}")
        print(f"    Status: NOT FOUND")
        return False

def check_directory(path, description):
    """Check if directory exists"""
    if os.path.isdir(path):
        print(f"  ✓ {description}")
        print(f"    Path: {path}")
        return True
    else:
        print(f"  ✗ {description}")
        print(f"    Path: {path}")
        print(f"    Status: NOT FOUND")
        return False

def check_python_module(module_name, description):
    """Check if Python module is available"""
    try:
        __import__(module_name)
        print(f"  ✓ {description}: {module_name}")
        return True
    except ImportError:
        print(f"  ✗ {description}: {module_name}")
        print(f"    Install with: pip install {module_name}")
        return False

def main():
    """Main setup check"""

    print_header("DaVinci Resolve Automation - Setup Check")

    all_ok = True

    # 1. Check Media Files
    print_header("1. Media Files")

    media_files = {
        "Video 1 (LUMIX1 RED)": "/Volumes/T5 EVO WM/Christian Zimmerman/20251230/LUMIX1 RED/P1000391.MOV",
        "Video 2 (LUMIX2 BLUE)": "/Volumes/T5 EVO WM/Christian Zimmerman/20251230/LUMIX2 BLUE/P1176953.MOV",
        "Audio (ZOOM)": "/Volumes/T5 EVO WM/Christian Zimmerman/20251230/AUDIO/ZOOM0016_TrLR.WAV"
    }

    for desc, path in media_files.items():
        if not check_file(path, desc):
            all_ok = False

    # 2. Check LUT File
    print_header("2. Color LUT")

    lut_path = "/Users/alexandrekhan/Library/Application Support/ProApps/Camera LUTs/VLog_RAWGamut_to_VLog_VGamut_forS1H_ver100.cube"
    if not check_file(lut_path, "Panasonic V-Log LUT"):
        all_ok = False

    # 3. Check Directories
    print_header("3. DaVinci Resolve Directories")

    directories = {
        "Scripts Directory": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp",
        "Captions Directory": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Captions"
    }

    for desc, path in directories.items():
        if not check_directory(path, desc):
            print(f"    Creating directory: {path}")
            try:
                os.makedirs(path, exist_ok=True)
                print(f"    ✓ Directory created")
            except Exception as e:
                print(f"    ✗ Failed to create: {e}")
                all_ok = False

    # 4. Check Scripts Exist
    print_header("4. Automation Scripts")

    script_files = {
        "Step 1 (Python)": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/Step1_CreateMasterTimeline.py",
        "Step 1 (Lua)": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/Step1_CreateMasterTimeline.lua",
        "Step 2": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/Step2_DuplicateTimelineSegments.py",
        "Step 3": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/Step3_GenerateCaptions.py",
        "Translation Helper": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/Step3_TranslateSRT.py",
        "README": "/Users/alexandrekhan/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/README_DaVinci_Automation.md"
    }

    for desc, path in script_files.items():
        if not check_file(path, desc):
            print(f"    ⚠ Script missing: {desc}")
            # Not critical error, scripts might need to be created

    # 5. Check Python Environment
    print_header("5. Python Environment")

    print(f"  Python Version: {sys.version}")
    print(f"  Python Path: {sys.executable}")

    # 6. Check DaVinci Resolve API
    print_header("6. DaVinci Resolve Scripting API")

    resolve_script_api = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
    resolve_script_lib = os.path.join(resolve_script_api, "Modules")

    if check_directory(resolve_script_api, "DaVinci Resolve API Directory"):
        sys.path.append(resolve_script_lib)
        try:
            import DaVinciResolveScript as dvr_script
            print("  ✓ DaVinci Resolve Python API available")

            # Try to connect
            try:
                resolve = dvr_script.scriptapp("Resolve")
                if resolve:
                    print("  ✓ Connected to DaVinci Resolve")
                    project_manager = resolve.GetProjectManager()
                    project = project_manager.GetCurrentProject()
                    if project:
                        print(f"  ✓ Current project: {project.GetName()}")
                    else:
                        print("  ⚠ No project currently open")
                        print("    Open a project in DaVinci Resolve before running scripts")
                else:
                    print("  ✗ Could not connect to DaVinci Resolve")
                    print("    Make sure DaVinci Resolve is running")
                    print("    Enable scripting in Preferences > System > General")
            except Exception as e:
                print(f"  ✗ Connection error: {e}")
                print("    Make sure DaVinci Resolve is running")

        except ImportError:
            print("  ✗ Could not import DaVinci Resolve Python API")
            print("    Make sure DaVinci Resolve Studio is installed")
            all_ok = False
    else:
        print("  ✗ DaVinci Resolve not found")
        print("    Install DaVinci Resolve Studio 20")
        all_ok = False

    # 7. Check Optional Python Dependencies
    print_header("7. Optional Python Libraries (for translation)")

    optional_modules = {
        "googletrans": "Google Translate support",
        "requests": "DeepL API support"
    }

    print("  Optional libraries (not required for basic workflow):")
    for module, desc in optional_modules.items():
        check_python_module(module, desc)

    # Summary
    print_header("Setup Check Summary")

    if all_ok:
        print("\n  ✓ All critical checks passed!")
        print("\n  You are ready to use the automation scripts.")
        print("\n  Next steps:")
        print("    1. Open DaVinci Resolve Studio 20")
        print("    2. Create or open a project")
        print("    3. Run Step1_CreateMasterTimeline.py")
        print("\n  From DaVinci Resolve:")
        print("    Workspace > Scripts > Comp > Step1_CreateMasterTimeline")
        print("\n  Or from command line:")
        print('    python3 "~/Documents/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Comp/Step1_CreateMasterTimeline.py"')
    else:
        print("\n  ✗ Some checks failed")
        print("\n  Please resolve the issues above before proceeding.")
        print("\n  Common fixes:")
        print("    - Mount external drive: T5 EVO WM")
        print("    - Install DaVinci Resolve Studio 20")
        print("    - Enable scripting in DaVinci Resolve Preferences")

    print("\n" + "=" * 60 + "\n")

if __name__ == "__main__":
    main()
