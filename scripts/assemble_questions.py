# scripts/assemble_questions.py
import json
import os

parts = [
    "scripts/t1_t2.json",
    "scripts/t3_t4.json",
    "scripts/t5.json",
    "scripts/t6.json",
    "scripts/t7.json"
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
os.makedirs("data", exist_ok=True)
with open("data/questions.json", "w", encoding="utf-8") as f:
    json.dump(all_questions, f, ensure_ascii=False, indent=2)

# Write to data/questions.js for global window usage
with open("data/questions.js", "w", encoding="utf-8") as f:
    f.write(f"window.QUESTIONS_DATA = {json.dumps(all_questions, ensure_ascii=False, indent=2)};\n")

print("Successfully generated data/questions.json and data/questions.js!")
