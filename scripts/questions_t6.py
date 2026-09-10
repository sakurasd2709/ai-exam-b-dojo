# scripts/questions_t6.py
import json

t6 = [
  {
    "id": 67,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 1,
    "type": "ox_choice",
    "questionText": "【第6講 まとめ○×チェック 1/3】\n最適解への収束が保証されているアルゴリズムであれば無条件に用いても問題ない。",
    "options": ["◯（正しい）", "✕（誤り）"],
    "correctAnswer": "✕（誤り）",
    "explanation": "📖 【基本解説・設問の背景】\n- 「解ける」と「使える」の境界（計算時間の現実性）に関する設問です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 理論上いつか必ず最適解に収束するアルゴリズムであっても、収束までに数百年・数千年かかるような莫大な計算量（指数時間計算量など）を要する場合、現実のシステムでは使えません。計算量オーダーを評価し実用時間内で終了するか見極める必要があるため、記述は誤り（✕）です。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- 「◯（正しい）」: 理論上の収束性と現実的な計算時間は別問題です。",
    "videoReference": {
      "title": "【6-2】「解ける」と「使える」の境界 [第6講:計算量の基礎]",
      "videoId": "TawvG4UpcKo",
      "url": "https://www.youtube.com/watch?v=TawvG4UpcKo"
    }
  },
  {
    "id": 68,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 2,
    "type": "ox_choice",
    "questionText": "【第6講 まとめ○×チェック 2/3】\nアルゴリズム実行時に必要となる一時的な記憶容量は時間計算量として見積もられる。",
    "options": ["◯（正しい）", "✕（誤り）"],
    "correctAnswer": "✕（誤り）",
    "explanation": "📖 【基本解説・設問の背景】\n- 「時間計算量」と「空間計算量」の区別に関する設問です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 処理にかかるステップ数・時間は「時間計算量（Time Complexity）」、消費するメモリ等の記憶容量は「空間計算量（Space Complexity）」として見積もられます。したがって記述は誤り（✕）です。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- 「◯（正しい）」: 時間と空間（メモリ）は明確に区別される2大評価基準です。",
    "videoReference": {
      "title": "【6-3】アルゴリズムの評価基準（の一例） [第6講:計算量の基礎]",
      "videoId": "dV1kUwxgo3E",
      "url": "https://www.youtube.com/watch?v=dV1kUwxgo3E"
    }
  },
  {
    "id": 69,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 3,
    "type": "ox_choice",
    "questionText": "【第6講 まとめ○×チェック 3/3】\n計算量オーダーは四則演算の回数と一致するように記述されるのが一般的である。",
    "options": ["◯（正しい）", "✕（誤り）"],
    "correctAnswer": "✕（誤り）",
    "explanation": "📖 【基本解説・設問の背景】\n- ランダウの記号（O記法）の本質的な表記ルールに関する設問です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- オーダー記法 O(n) は、正確な四則演算の回数をそのまま書くのではなく、入力サイズ n が無限大に近づく際の「漸近的な増加速度（最も次数の高い項の傾向）」を定数係数を無視して表す記法です。演算回数と一致させるものではないため、記述は誤り（✕）です。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- 「◯（正しい）」: 定数係数や低次の項を削ぎ落として本質的なスケール性を表現するのがオーダー記法です。",
    "videoReference": {
      "title": "【6-4】ざっくりオーダー記法その1とその2 [第6講:計算量の基礎]",
      "videoId": "QIDLt3NPG18",
      "url": "https://www.youtube.com/watch?v=QIDLt3NPG18"
    }
  },
  {
    "id": 70,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 4,
    "type": "single_choice",
    "questionText": "入力サイズ n の増加に伴い、計算ステップ数が指数関数的（O(2^n) など）に爆発し、問題の規模が少し大きくなっただけで現実的に計算が終わらなくなってしまう現象を表す用語はどれか？",
    "options": [
      "A. 組合せ爆発（Combinatorial Explosion）",
      "B. 勾配消失（Vanishing Gradient）",
      "C. 次元削減（Dimensionality Reduction）",
      "D. 過学習（Overfitting）"
    ],
    "correctAnswer": "A. 組合せ爆発（Combinatorial Explosion）",
    "explanation": "📖 【基本解説・設問の背景】\n- 講義【6-2】「解ける」と「使える」の境界で解説される重要概念です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 選択肢の数や組合せが天文学的な数値に膨れ上がる現象を「組合せ爆発」と呼びます（Aが正解）。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- **B**: ニューラルネットワークの深層で勾配がゼロに近づく現象です。\n- **C**: 特徴量の数を減らす前処理手法です。\n- **D**: 訓練データに過剰適合する現象です。",
    "videoReference": {
      "title": "【6-2】「解ける」と「使える」の境界 [第6講:計算量の基礎]",
      "videoId": "TawvG4UpcKo",
      "url": "https://www.youtube.com/watch?v=TawvG4UpcKo"
    }
  },
  {
    "id": 71,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 5,
    "type": "single_choice",
    "questionText": "あるアルゴリズムの計算ステップ数が式 f(n) = 5n^2 + 100n + 500 で与えられるとき、ランダウのO記法による時間計算量オーダーとして正しいものはどれか？",
    "options": [
      "A. O(n^2)",
      "B. O(5n^2)",
      "C. O(n)",
      "D. O(n^3)"
    ],
    "correctAnswer": "A. O(n^2)",
    "explanation": "📖 【基本解説・設問の背景】\n- 講義【6-4】で解説される「ざっくりオーダー記法」のルール適用問題です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- ランダウの記号では、入力 n が十分大きいときの影響度に着目し、①最も次数の高い支配項（5n^2）だけを残し、②定数倍の係数（5）を無視（1とする）します。したがって O(n^2) が正解です（Aが正解）。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- **B**: 定数係数の5は表記から落とします。\n- **C**: 低次の項 100n では n が大きいときの増加を過小評価してしまいます。\n- **D**: 存在しない3次のオーダーです。",
    "videoReference": {
      "title": "【6-4】ざっくりオーダー記法その1とその2 [第6講:計算量の基礎]",
      "videoId": "QIDLt3NPG18",
      "url": "https://www.youtube.com/watch?v=QIDLt3NPG18"
    }
  },
  {
    "id": 72,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 6,
    "type": "single_choice",
    "questionText": "データ数 n のサイズがどれほど大きくなっても、必要な処理時間が常に一定（変化しない）である「定数時間」アルゴリズムの計算量オーダー表記はどれか？",
    "options": [
      "A. O(1)",
      "B. O(n)",
      "C. O(0)",
      "D. O(log n)"
    ],
    "correctAnswer": "A. O(1)",
    "explanation": "📖 【基本解説・設問の背景】\n- 定数時間計算量の表記と性質です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 入力サイズ n に依存せず、1回（または決まった一定回数）のステップで完了する操作（配列のインデックス参照など）は O(1) と記述されます（Aが正解）。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- **B**: データ数に比例して時間が増える線形時間です。\n- **C**: O(0) というオーダー表記は通常用いられません。\n- **D**: データが増えると緩やかに対数的に時間が増加するオーダーです。",
    "videoReference": {
      "title": "【6-4】ざっくりオーダー記法その1とその2 [第6講:計算量の基礎]",
      "videoId": "QIDLt3NPG18",
      "url": "https://www.youtube.com/watch?v=QIDLt3NPG18"
    }
  },
  {
    "id": 73,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 7,
    "type": "single_choice",
    "questionText": "ソート済みの n 個のデータから目的の値を探索する際、探索範囲を毎回半分に絞り込んでいく「二分探索（バイナリサーチ）」の時間計算量オーダーはどれか？",
    "options": [
      "A. O(log n)",
      "B. O(n)",
      "C. O(n^2)",
      "D. O(1)"
    ],
    "correctAnswer": "A. O(log n)",
    "explanation": "📖 【基本解説・設問の背景】\n- 講義【6-5】で解説される対数時間オーダー O(log n) の代表例です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 毎回候補が半分になるため、データ数が1000倍になっても探索回数は約10回しか増えません。このアルゴリズムの計算量は O(log n) です（Aが正解）。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- **B**: 先頭から1つずつ探す線形探索の計算量です。\n- **C**: 2重ループの計算量です。\n- **D**: 探索を行わずに直接アクセスできる場合の計算量です。",
    "videoReference": {
      "title": "【6-5】ざっくりオーダー記法その3 [第6講:計算量の基礎]",
      "videoId": "NFhvS3j6ehY",
      "url": "https://www.youtube.com/watch?v=NFhvS3j6ehY"
    }
  },
  {
    "id": 74,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 8,
    "type": "drag_and_drop_order",
    "questionText": "入力サイズ n が十分に大きいときの処理速度が「速い順（計算量の増加が小さい順）」に正しく並べ替えなさい。",
    "options": [
      "O(1) [定数時間]",
      "O(log n) [対数時間]",
      "O(n) [線形時間]",
      "O(n^2) [2乗時間]",
      "O(2^n) [指数時間]"
    ],
    "correctAnswer": [
      "O(1) [定数時間]",
      "O(log n) [対数時間]",
      "O(n) [線形時間]",
      "O(n^2) [2乗時間]",
      "O(2^n) [指数時間]"
    ],
    "explanation": "📖 【基本解説・設問の背景】\n- 計算量オーダーの大小関係の完全整理です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 増加の緩やかさ（速度が速い順）は：\n  $$O(1) < O(\\log n) < O(n) < O(n^2) < O(2^n)$$\n  となります。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- O(2^n) は入力が数十程度でも天文学的な時間となる最も遅いオーダーです。",
    "videoReference": {
      "title": "【6-5】ざっくりオーダー記法その3 [第6講:計算量の基礎]",
      "videoId": "NFhvS3j6ehY",
      "url": "https://www.youtube.com/watch?v=NFhvS3j6ehY"
    }
  },
  {
    "id": 75,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 9,
    "type": "single_choice",
    "questionText": "配列の要素数が n 個あるとき、外側で n 回、内側で n 回実行される二重ループ処理の典型的な時間計算量オーダーはどれか？",
    "options": [
      "A. O(n^2)",
      "B. O(2n)",
      "C. O(n)",
      "D. O(log n)"
    ],
    "correctAnswer": "A. O(n^2)",
    "explanation": "📖 【基本解説・設問の背景】\n- 多重ループと計算量オーダーの関係です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- n 回のループの中にさらに n 回のループがある場合、実行回数は $n \\times n = n^2$ 回に比例するため、O(n^2) となります（Aが正解）。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- **B, C**: 連続して2回ループする場合は $n + n = 2n \\rightarrow O(n)$ ですが、入れ子（二重）の場合は積になります。\n- **D**: 分割統治法のオーダーです。",
    "videoReference": {
      "title": "【6-4】ざっくりオーダー記法その1とその2 [第6講:計算量の基礎]",
      "videoId": "QIDLt3NPG18",
      "url": "https://www.youtube.com/watch?v=QIDLt3NPG18"
    }
  },
  {
    "id": 76,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 10,
    "type": "single_choice",
    "questionText": "長さ n のリストの先頭から末尾まで1要素ずつチェックしていく「線形探索」の時間計算量オーダーとして正しいものはどれか？",
    "options": [
      "A. O(n)",
      "B. O(1)",
      "C. O(log n)",
      "D. O(n!)"
    ],
    "correctAnswer": "A. O(n)",
    "explanation": "📖 【基本解説・設問の背景】\n- 最も基本的な探索アルゴリズムの計算量です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 最悪の場合、末尾まで n 回調べる必要があるため、時間計算量は O(n)（線形時間）となります（Aが正解）。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- **B, C**: より高速なアクセス・探索手法のオーダーです。\n- **D**: 巡回セールスマン問題の全探索などの階乗オーダーです。",
    "videoReference": {
      "title": "【6-4】ざっくりオーダー記法その1とその2 [第6講:計算量の基礎]",
      "videoId": "QIDLt3NPG18",
      "url": "https://www.youtube.com/watch?v=QIDLt3NPG18"
    }
  },
  {
    "id": 77,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 11,
    "type": "drag_and_drop_matching",
    "questionText": "各計算量オーダーと、その代表的な具体例のペアを完成させなさい。",
    "matchingPairs": [
      {
        "targetLabel": "O(1):",
        "options": ["配列のインデックス指定による直接アクセス", "ソート済み配列に対する二分探索", "全要素を先頭から順に調べる線形探索"],
        "correctAnswer": "配列のインデックス指定による直接アクセス"
      },
      {
        "targetLabel": "O(log n):",
        "options": ["配列のインデックス指定による直接アクセス", "ソート済み配列に対する二分探索", "全要素を先頭から順に調べる線形探索"],
        "correctAnswer": "ソート済み配列に対する二分探索"
      },
      {
        "targetLabel": "O(n):",
        "options": ["配列のインデックス指定による直接アクセス", "ソート済み配列に対する二分探索", "全要素を先頭から順に調べる線形探索"],
        "correctAnswer": "全要素を先頭から順に調べる線形探索"
      }
    ],
    "correctAnswer": {
      "O(1):": "配列のインデックス指定による直接アクセス",
      "O(log n):": "ソート済み配列に対する二分探索",
      "O(n):": "全要素を先頭から順に調べる線形探索"
    },
    "explanation": "📖 【基本解説・設問の背景】\n- オーダー記法と身近なプログラミング処理の対応付けです。\n\n✅ 【正解のポイント・仕様上の根拠】\n- O(1) は一発参照、O(log n) は二分探索、O(n) は全走査です。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- 各アルゴリズムの動作原理と計算量の関係を定着させましょう。",
    "videoReference": {
      "title": "【6-5】ざっくりオーダー記法その3 [第6講:計算量の基礎]",
      "videoId": "NFhvS3j6ehY",
      "url": "https://www.youtube.com/watch?v=NFhvS3j6ehY"
    }
  },
  {
    "id": 78,
    "topic": "第6講: 計算量の基礎",
    "topicId": 6,
    "questionNumber": 12,
    "type": "single_choice",
    "questionText": "アルゴリズムの計算量を評価する主な目的として、最も適切なものはどれか？",
    "options": [
      "A. データの規模が大きくなったときに、実行時間やメモリ使用量がどれくらい増加するかを予測・比較するため",
      "B. ソースコードの行数をできるだけ短くしてファイルの容量を削減するため",
      "C. プログラミング言語ごとのコンパイルエラーを自動的に修正するため",
      "D. サーバーの電気代の請求金額を1円単位で正確に計算するため"
    ],
    "correctAnswer": "A. データの規模が大きくなったときに、実行時間やメモリ使用量がどれくらい増加するかを予測・比較するため",
    "explanation": "📖 【基本解説・設問の背景】\n- 計算量理論を学ぶ本質的な意義についての設問です。\n\n✅ 【正解のポイント・仕様上の根拠】\n- 入力データが増加した際のスケーラビリティ（拡張性・処理の破綻の有無）を事前評価するために計算量を見積もります（Aが正解）。\n\n🚨 【なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）】\n- **B, C, D**: 計算量評価の目的ではありません。",
    "videoReference": {
      "title": "【6-3】アルゴリズムの評価基準（の一例） [第6講:計算量の基礎]",
      "videoId": "dV1kUwxgo3E",
      "url": "https://www.youtube.com/watch?v=dV1kUwxgo3E"
    }
  }
]

with open("scripts/t6.json", "w", encoding="utf-8") as f:
    json.dump(t6, f, ensure_ascii=False, indent=2)
print("Saved scripts/t6.json (12 questions)")
