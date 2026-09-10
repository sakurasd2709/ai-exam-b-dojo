# AI実装検定® B級 過去問・演習システム 完全技術仕様書 & アーキテクチャ

本ドキュメントは、本システム（AI実装検定® B級 過去問・演習システム）のシステム設計、データ構造、UI/UXコンポーネント、採点アルゴリズム、ビルド・デプロイ手順を網羅した技術リファレンスです。

---

## 1. システム全体概要 & 稼働環境

### 🌐 システム特性
- **アーキテクチャ**: クライアントサイド完全完結型 Single Page Application (SPA)
- **依存性**: 外部フレームワーク非依存（Pure HTML5, CSS3, Vanilla ES6+ JavaScript）
- **オフライン動作性**: 完全スタンドアロン単一ファイル（`AI実装検定B級_過去問演習_スマホ・PC用.html`）での実行に対応
- **ホスティング**: Vercel, GitHub Pages, または静的Webサーバー (Nginx/Apache/Python http.server)

---

## 2. 設問データ構造仕様 (`data/questions.json`)

すべての設問は以下の構造化プロパティを持ちます：

```typescript
interface Question {
  id: number;                          // 設問固有連番 (1〜90)
  topic: string;                       // トピック表示名 ("第1講: モデルの設計と活用までの流れ" 等)
  topicId: number;                     // トピック番号 (1〜7)
  questionNumber: number;              // トピック内設問番号 (1〜14)
  type: QuestionType;                  // 出題形式
  questionText: string;                // 設問本文
  options?: string[];                  // 選択肢の配列 (single_choice, ox_choice, drag_and_drop_order)
  correctAnswer: any;                  // 正解データ
  explanation: string;                 // 深層3層構造化解説 (📖基本解説、✅正解ポイント、🚨誤答分析)
  videoReference: {                    // 対応するYouTube公式講義情報
    title: string;
    videoId: string;
    url: string;
  };
  matchingPairs?: MatchingPair[];      // マッチング形式用
  tableStatements?: TableStatement[];  // Hotspot形式用
}

type QuestionType = 
  | 'single_choice'          // 単一選択 (4択等)
  | 'ox_choice'              // ○×チェック (2択)
  | 'drag_and_drop_order'    // 順序並べ替え
  | 'drag_and_drop_matching' // マッチング
  | 'hotspot_radio_table';   // Yes/No 判定テーブル
```

### 出題形式別の正誤判定アルゴリズム

1. **`single_choice` & `ox_choice`**:
   - `userAnswers[id] === q.correctAnswer`
2. **`drag_and_drop_order`**:
   - ユーザーが並べ替えた配列の各要素と正解配列の各要素をインデックス順に全一致検査
3. **`drag_and_drop_matching`**:
   - 正解辞書の各キー（ターゲットラベル）に対して、選択された値が完全一致するか判定
4. **`hotspot_radio_table`**:
   - 各ステートメント（`statement_0`, `statement_1`...）のYes/No選択結果を全行完全一致判定

---

## 3. レーダーチャート描画エンジン仕様 (Canvas API)

- 外部ライブラリ（Chart.js等）を一切使わず、ブラウザ標準の `HTML5 Canvas 2D Context` で高精度な7角形レーダーチャートを自前描画。
- **計算式**:
  - 各軸の角度: $\theta_i = i \times \frac{2\pi}{7} - \frac{\pi}{2}$
  - 座標計算: $x = x_0 + r \cdot \cos \theta_i$, $y = y_0 + r \cdot \sin \theta_i$
  - 各分野の習熟度 $val \in [0.0, 1.0]$（正答率）に応じたポリゴン描画と半透明グラデーション塗りつぶし

---

## 4. 本番再現模試 (30問 / 40分) 仕様

- **試験条件**:
  - 問題数: 30問（全90問プールから Fisher-Yates シャッフルによりランダム抽出）
  - 制限時間: 40分（2,400秒）
  - カウントダウンタイマーが連動し、0秒到達時に自動終了＆一括採点
- **合否判定基準**:
  - 正答率 **70%以上**（21問以上の正解で合格判定）
  - スコア算出: $\text{Score} = \text{round}\left(\frac{\text{Correct}}{30} \times 100\right)$

---

## 5. ビルド＆デプロイパイプライン

### 1. 単一ファイルHTML自動バンドラー (`scripts/build_single_file.py`)
外部ファイル参照をインライン展開し、1ファイルで動作する単一HTMLをビルドします：
- `style.css` $\rightarrow$ `<style>...</style>`
- `data/video_catalog.js`, `data/questions.js`, `app.js` $\rightarrow$ `<script>...</script>`

### 2. 品質監査ゲート (`scripts/qa_test_suite.py`)
- 全90問のID重複、必須プロパティ、3層解説マーク、URL有効性、出題形式整合性を機械的に検証。
- 1問でも不備があればビルドエラーとして検知。
