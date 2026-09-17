import json
import collections

# Load JSON data with proper UTF-8 encoding
with open(r'C:\Users\usER\.local\share\opencode\tool-output\tool_0a65d54d5001IujjZhS0onsor6', 'r', encoding='utf-8') as f:
    data = json.load(f)
verses = [v['text_uthmani'] for v in data['verses']]

# Write verses to file
with open('quran_uthmani.txt', 'w', encoding='utf-8') as f:
    for verse in verses:
        f.write(verse + '\n')

# Simple Frequency Analysis
all_chars = ''.join(verses)
counts = collections.Counter(all_chars)
total = sum(counts.values())

with open('analysis_output.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total characters: {total}\n")
    out.write("Top 10 most frequent characters:\n")
    for char, count in counts.most_common(10):
        out.write(f"{char}: {count} ({count/total:.2%})\n")

    # Check for Alif (ا) frequency
    alif_count = counts.get('ا', 0)
    out.write(f"\nAlif (ا) count: {alif_count}\n")
    out.write(f"Alif percentage: {alif_count/total:.2%}\n")

print("Analysis complete. Output written to analysis_output.txt")
