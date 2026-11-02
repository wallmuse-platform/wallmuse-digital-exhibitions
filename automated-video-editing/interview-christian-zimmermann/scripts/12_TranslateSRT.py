#!/usr/bin/env python3
"""
Step 3 Helper: Translate SRT Subtitle Files
French to English translation for subtitle files

This script translates French SRT files to English.
Requires internet connection and optional API keys for best results.

Methods:
1. DeepL API (recommended - most accurate for FR→EN)
2. Google Translate (free, no API key needed)
3. Manual translation template

Usage:
    python3 Step3_TranslateSRT.py input_FR.srt output_EN.srt
"""

import sys
import re
from pathlib import Path

def parse_srt(srt_content):
    """Parse SRT subtitle file into segments"""
    # SRT format:
    # 1
    # 00:00:00,000 --> 00:00:02,000
    # Subtitle text
    # (blank line)

    segments = []
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3})\n((?:.*\n)*?)(?=\n\d+\n|\n*$)'

    matches = re.finditer(pattern, srt_content, re.MULTILINE)

    for match in matches:
        segment_num = match.group(1)
        timestamp = match.group(2)
        text = match.group(3).strip()

        segments.append({
            'num': segment_num,
            'timestamp': timestamp,
            'text': text
        })

    return segments

def write_srt(segments, output_path):
    """Write segments back to SRT format"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(segments):
            f.write(f"{segment['num']}\n")
            f.write(f"{segment['timestamp']}\n")
            f.write(f"{segment['text']}\n")
            if i < len(segments) - 1:
                f.write("\n")

def translate_with_deepl(text, source_lang="FR", target_lang="EN"):
    """Translate using DeepL API (requires API key)"""
    try:
        import requests
    except ImportError:
        print("Error: requests library not installed")
        print("Install with: pip install requests")
        return None

    # DeepL API key should be set in environment or config
    api_key = os.getenv('DEEPL_API_KEY')

    if not api_key:
        print("DeepL API key not found")
        print("Set DEEPL_API_KEY environment variable")
        print("Get free API key at: https://www.deepl.com/pro-api")
        return None

    url = "https://api-free.deepl.com/v2/translate"

    params = {
        'auth_key': api_key,
        'text': text,
        'source_lang': source_lang,
        'target_lang': target_lang
    }

    try:
        response = requests.post(url, data=params)
        response.raise_for_status()
        result = response.json()
        return result['translations'][0]['text']
    except Exception as e:
        print(f"DeepL translation error: {e}")
        return None

def translate_with_google(text, source_lang="fr", target_lang="en"):
    """Translate using googletrans library (free, no API key)"""
    try:
        from googletrans import Translator
    except ImportError:
        print("Error: googletrans library not installed")
        print("Install with: pip install googletrans==4.0.0-rc1")
        return None

    try:
        translator = Translator()
        result = translator.translate(text, src=source_lang, dest=target_lang)
        return result.text
    except Exception as e:
        print(f"Google translation error: {e}")
        return None

def translate_srt_file(input_path, output_path, method="google"):
    """Translate SRT file from French to English"""

    print(f"Translating: {input_path}")
    print(f"Output: {output_path}")
    print(f"Method: {method}\n")

    # Read input file
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {input_path}")
        return False

    # Parse SRT
    segments = parse_srt(srt_content)
    print(f"Found {len(segments)} subtitle segments\n")

    if len(segments) == 0:
        print("No segments found in SRT file")
        return False

    # Translate each segment
    translated_segments = []

    for i, segment in enumerate(segments, 1):
        print(f"[{i}/{len(segments)}] Translating: {segment['text'][:50]}...")

        if method == "deepl":
            translated_text = translate_with_deepl(segment['text'])
        elif method == "google":
            translated_text = translate_with_google(segment['text'])
        else:
            translated_text = f"[TRANSLATE: {segment['text']}]"

        if translated_text:
            print(f"           → {translated_text[:50]}...")
            translated_segments.append({
                'num': segment['num'],
                'timestamp': segment['timestamp'],
                'text': translated_text
            })
        else:
            print(f"           → Translation failed, keeping original")
            translated_segments.append(segment)

    # Write output
    write_srt(translated_segments, output_path)
    print(f"\n✓ Translation complete: {output_path}")

    return True

def create_translation_template(input_path, output_path):
    """Create a manual translation template"""

    print(f"Creating translation template from: {input_path}")

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {input_path}")
        return False

    segments = parse_srt(srt_content)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# Manual Translation Template\n")
        f.write("# Original: French | Translation: English\n")
        f.write("# After translating, remove # comments and save as .srt\n\n")

        for segment in segments:
            f.write(f"# Segment {segment['num']}\n")
            f.write(f"# {segment['timestamp']}\n")
            f.write(f"# FR: {segment['text']}\n")
            f.write(f"# EN: [TRANSLATE HERE]\n\n")

    print(f"✓ Template created: {output_path}")
    print("Edit the file and translate each EN: line")

    return True

def main():
    """Main function"""

    print("=== SRT Translation Tool ===\n")

    if len(sys.argv) < 3:
        print("Usage:")
        print("  python3 Step3_TranslateSRT.py input_FR.srt output_EN.srt [method]")
        print("\nMethods:")
        print("  google   - Google Translate (free, no API key)")
        print("  deepl    - DeepL API (requires API key, most accurate)")
        print("  template - Create manual translation template")
        print("\nExample:")
        print("  python3 Step3_TranslateSRT.py 1.2_Intro_FR.srt 1.2_Intro_EN.srt google")
        return

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    method = sys.argv[3] if len(sys.argv) > 3 else "google"

    if not Path(input_path).exists():
        print(f"Error: Input file not found: {input_path}")
        return

    if method == "template":
        create_translation_template(input_path, output_path)
    else:
        translate_srt_file(input_path, output_path, method)

if __name__ == "__main__":
    main()
