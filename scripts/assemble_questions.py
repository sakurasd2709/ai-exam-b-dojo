# scripts/assemble_questions.py
import json
import os
import sys
from pathlib import Path

# Safe UTF-8 console output for Windows / macOS / Linux
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Project root directory anchor
PROJECT_ROOT = Path(__file__).resolve().parent.parent

parts = [
    PROJECT_ROOT / "scripts" / "t1_t2.json",
    PROJECT_ROOT / "scripts" / "t3_t4.json",
    PROJECT_ROOT / "scripts" / "t5.json",
    PROJECT_ROOT / "scripts" / "t6.json",
    PROJECT_ROOT / "scripts" / "t7.json"
]

all_questions = []
for p in parts:
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
        all_questions.extend(data)

# Sort and re-index sequentially from 1 to N
for idx, q in enumerate(all_questions, 1):
    q["id"] = idx

print(f"Total questions assembled: {len(all_questions)}")

# Write to data/questions.json
data_dir = PROJECT_ROOT / "data"
data_dir.mkdir(exist_ok=True)

with open(data_dir / "questions.json", "w", encoding="utf-8") as f:
    json.dump(all_questions, f, ensure_ascii=False, indent=2)

# Write to data/questions.js for global window usage
with open(data_dir / "questions.js", "w", encoding="utf-8") as f:
    f.write(f"window.QUESTIONS_DATA = {json.dumps(all_questions, ensure_ascii=False, indent=2)};\n")

print("Successfully generated data/questions.json and data/questions.js!")
