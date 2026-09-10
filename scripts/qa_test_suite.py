# scripts/qa_test_suite.py
import json
import sys

def run_qa_suite():
    print("=" * 60)
    print("🔍 AI実装検定B級 演習システム 総合QAテストスイート開始")
    print("=" * 60)

    # 1. Load Questions Data
    with open("data/questions.json", "r", encoding="utf-8") as f:
        questions = json.load(f)

    print(f"\n[Test 1] 設問総数検証: 全 {len(questions)} 問")
    assert len(questions) == 90, f"Expected 90 questions, got {len(questions)}"
    print("  -> PASS: 90問が正常にロードされました。")

    # 2. Sequential ID and Required Fields Check
    print("\n[Test 2] 必須フィールド・ID連番検証")
    req_fields = ["id", "topic", "topicId", "questionNumber", "type", "questionText", "correctAnswer", "explanation", "videoReference"]
    
    seen_ids = set()
    for idx, q in enumerate(questions, 1):
        assert q["id"] == idx, f"Question ID mismatch: expected {idx}, got {q['id']}"
        assert q["id"] not in seen_ids, f"Duplicate ID: {q['id']}"
        seen_ids.add(q["id"])

        for fld in req_fields:
            assert fld in q, f"Q{q['id']} is missing field: {fld}"

        # Explanation 3-layer check
        exp = q["explanation"]
        assert "📖" in exp, f"Q{q['id']} missing basic explanation (📖)"
        assert "✅" in exp, f"Q{q['id']} missing correct points (✅)"
        assert "🚨" in exp, f"Q{q['id']} missing wrong option analysis (🚨)"

        # Video reference check
        vr = q["videoReference"]
        assert "videoId" in vr and len(vr["videoId"]) > 0, f"Q{q['id']} missing videoId"
        assert "url" in vr and "youtube.com" in vr["url"], f"Q{q['id']} invalid youtube url"

    print("  -> PASS: 全90問のID連番、必須フィールド、深層3層解説、YouTube連携URLの完全性を確認しました。")

    # 3. Topic Distribution Check
    print("\n[Test 3] トピック別出題バランス検証")
    topic_counts = {}
    for q in questions:
        t = q["topicId"]
        topic_counts[t] = topic_counts.get(t, 0) + 1

    for t in range(1, 8):
        count = topic_counts.get(t, 0)
        print(f"  - トピック{t}: {count}問")
        assert count >= 10, f"Topic {t} has too few questions: {count}"

    print("  -> PASS: 全7大トピックすべてに十分な問題数が配分されています。")

    # 4. Evaluation Simulation (Single choice, OX, Order, Matching, Hotspot)
    print("\n[Test 4] 出題形式別 正誤判定シミュレーション")
    type_counts = {}
    for q in questions:
        qtype = q["type"]
        type_counts[qtype] = type_counts.get(qtype, 0) + 1

        if qtype in ["single_choice", "ox_choice"]:
            # Check answer exists in options
            assert q["correctAnswer"] in q["options"], f"Q{q['id']}: correctAnswer '{q['correctAnswer']}' not in options"
        elif qtype == "drag_and_drop_order":
            assert isinstance(q["correctAnswer"], list), f"Q{q['id']}: order correctAnswer must be list"
            assert len(q["correctAnswer"]) == len(q["options"]), f"Q{q['id']}: order options and answer length mismatch"
        elif qtype == "drag_and_drop_matching":
            assert isinstance(q["correctAnswer"], dict), f"Q{q['id']}: matching correctAnswer must be dict"
        elif qtype == "hotspot_radio_table":
            assert isinstance(q["correctAnswer"], dict), f"Q{q['id']}: hotspot correctAnswer must be dict"

    for t, c in type_counts.items():
        print(f"  - 形式 '{t}': {c}問")

    print("  -> PASS: 全形式の正誤判定データ構造が正常に整合しています。")

    # 5. Video Catalog Check
    print("\n[Test 5] 公式動画カタログ (全41講) 完全性検証")
    with open("data/video_catalog.json", "r", encoding="utf-8") as f:
        catalog = json.load(f)
    assert len(catalog) == 41, f"Expected 41 videos, got {len(catalog)}"
    print(f"  -> PASS: 全41講義のメタデータが正常に登録されています。")

    print("\n" + "=" * 60)
    print("🎯 全自動テストスイート: ALL 5/5 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        run_qa_suite()
    except AssertionError as e:
        print(f"\n❌ QAテスト失敗: {e}")
        sys.exit(1)
