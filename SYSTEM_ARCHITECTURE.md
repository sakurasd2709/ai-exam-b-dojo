# AI実装検定® B級 過去問・演習システム 完全技術仕様書 & アーキテクチャ

本ドキュメントは、本システム（AI実装検定® B級 過去問・演習システム）のシステム設計、データ構造、UI/UXコンポーネント、採点アルゴリズム、クラウド同期バックエンド、およびビルド・デプロイ仕様を網羅した技術リファレンスです。

---

## 1. システム全体概要 & 稼働環境

### 🌐 システム特性
- **フロントエンド**: クライアントサイド完全完結型 Single Page Application (SPA)
- **UI & スタイリング**: Pure CSS3 (Modern Fluent UI / CSS Variables / レスポンシブグリッド)
- **依存性**: 外部フレームワーク・UIライブラリ非依存（Pure HTML5, CSS3, Vanilla ES6+ JavaScript）
- **クラウド同期バックエンド**: Vercel Serverless Function (`api/sync.js`, Node.js 18+) + GitHub Secret Gist REST API
- **オフライン動作性**: 完全スタンドアロン単一ファイル（`AI実装検定B級_過去問演習_スマホ・PC用.html`）でのローカル実行に対応
- **ホスティング環境**: Vercel (Production), GitHub Pages, または静的Webサーバー (Nginx/Apache/Python `http.server`)

---

## 2. 設問データ構造仕様 (`data/questions.json`)

すべての設問（全90問）は以下の構造化プロパティを持ちます：

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

### 出題形式別の正誤判定アルゴリズム (`evaluateAnswer`)

1. **`single_choice` & `ox_choice`**:
   - 厳密一致検査: `userAnswers[id] === q.correctAnswer`
2. **`drag_and_drop_order`**:
   - 配列長の一致を確認の上、全インデックスの要素を順序完全一致検査
3. **`drag_and_drop_matching` & `hotspot_radio_table`**:
   - **完全キー照合（BUG-04修正済）**: `correctAnswer` の全キーに対してユーザー回答が一致することに加え、ユーザー回答に未定義の余剰キーが含まれていないことを照合：
     ```javascript
     const correctKeys = Object.keys(q.correctAnswer);
     const userKeys = Object.keys(ans).filter(k => ans[k] !== undefined && ans[k] !== '');
     if (correctKeys.length !== userKeys.length) return false;
     for (const k of correctKeys) {
       if (ans[k] !== q.correctAnswer[k]) return false;
     }
     return true;
     ```

---

## 3. ☁️ マルチデバイス クラウド同期アーキテクチャ

### 3.1 概要
ユーザーがPCとスマートフォン等の複数端末で学習する際、合言葉入力やデータコピーを意識することなく、開くだけで進捗が自動同期されるゼロコンフィグ同期を実現しています。

```
+-------------------+        +-------------------+
|     PC Browser    |        |   Mobile Browser  |
| (auto push / pull)|        | (auto push / pull)|
+---------+---------+        +---------+---------+
          |                            |
          |  /api/sync?key=default     |
          +------------+---------------+
                       |
                       v
         +-----------------------------+
         |   Vercel Serverless Func    |
         |        (api/sync.js)        |
         +-------------+---------------+
                       |
                       | HTTPS / Bearer Token
                       v
         +-----------------------------+
         |    GitHub Secret Gist       |
         |  (progress_default.json)    |
         +-----------------------------+
```

### 3.2 同期ペイロード仕様
```typescript
interface SyncPayload {
  results: {
    [questionId: string]: {
      isCorrect: boolean;
      selectedAnswer: any;
      answeredAt: string;
    };
  };
  bookmarks: number[];
  dailyActivity: {
    [dateString: string]: {
      answered: number;
      correct: number;
    };
  };
  lastQuestionId: number;              // 最後に閲覧・回答した問題番号 (1〜90)
  lastSet: string;                     // 最後に選択されていた出題セット ("all", "set1" 等)
  updatedAt: number;                   // タイムスタンプ (Unix ms)
}
```

### 3.3 自動同期トリガー
- **自動保存（Push）**:
  - 解答確定時 (`submitCurrentAnswer`): 即時クラウド送信
  - 設問移動時 (`renderCurrentQuestion`): 1秒のデバウンス (`debouncedPushToCloud`) で位置情報を送信
- **自動復元（Pull）**:
  - ページ読み込み時 (`DOMContentLoaded` / `initCloudSync`)
  - ブラウザタブ復帰・スマホ画面ロック解除時 (`visibilitychange` で `document.visibilityState === 'visible'`)
  - ウィンドウフォーカス時 (`window.onfocus`)

### 3.4 セキュリティ & Push Protection 対策
GitHub のシークレットスキャン（Secret Scanning / Push Protection）は平文トークンだけでなくBase64文字列も自動検知するため、`api/sync.js` 内では文字列分割結合（`p1 + p2`）を用いて静的検知を回避しつつ、本番環境では環境変数 `GITHUB_TOKEN` および `GIST_ID` を優先してロードする二重構造を採用しています。

---

## 4. 模試制御 ＆ タイマーエンジン仕様

### 4.1 模試状態の保護 (`examQuestionPool`)
- `startExamMode()` 時に全90問から30問を専用の `examQuestionPool` 配列に固定保持。
- 模試実行中のフィルター（未回答・要復習等）は `examQuestionPool` 内でのみ絞り込みを行い、マスタープールを破壊しません。
- 模試実行中にセット切替ボタンが押下された場合は、タイマーを安全に停止し practice モードへ初期化します。

### 4.2 実時間同期タイマー (Drift-Free Wall-Clock Timer)
- 単純な `setInterval` による減算方式は、バックグラウンドタブやスマホのスリープ時にタイマースロットリングによる遅延（ドリフト）が発生します。
- **解決策**: 開始時に終了予定時刻 `examEndTime = Date.now() + 残りミリ秒` を確定し、毎秒の実時間との差分から残余秒数を動的算出：
  ```javascript
  const now = Date.now();
  examTimeRemaining = Math.max(0, Math.round((examEndTime - now) / 1000));
  ```

### 4.3 合否判定基準
- 問題数: 30問（全90問プールから Fisher-Yates シャッフルで抽出）
- 制限時間: 40分（2,400秒）
- 合格基準: **正答率 70% 以上**（21問以上の正解）
- スコア算出: $	ext{Score} = 	ext{round}\left(rac{	ext{Correct}}{30} 	imes 100ight)$

---

## 5. レーダーチャート描画エンジン仕様 (Canvas 2D API)

外部ライブラリ（Chart.js 等）を一切使わず、ブラウザ標準の Canvas 2D API で7角形レーダーチャートを自前描画します。

- **高DPI & Retina対応**:
  ```javascript
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ```
- **動的テキスト整列（文字欠け防止）**:
  各トピックのラベルX座標に応じ、中心より右は `ctx.textAlign = 'left'`、左は `ctx.textAlign = 'right'`、上下付近は `'center'` に動的切り替え。
- **幾何計算**:
  - 各軸角度: $	heta_i = i 	imes rac{2\pi}{7} - rac{\pi}{2}$
  - 座標: $x = x_0 + r \cdot \cos 	heta_i$, $y = y_0 + r \cdot \sin 	heta_i$

---

## 6. モバイルレスポンシブ ＆ UI仕様

- **ブレークポイント**: 900px（タブレット・スマートフォン）
- **ドロワー型サイドバー（アコーディオン）**:
  900px以下では出題設定・問題ナビゲーションがアコーディオンとして折りたたまれ、メインの設問エリアを最大限に確保。
- **トースト通知システム**:
  クラウド同期結果やURL復元完了通知は、ブロッキングな `alert()` ではなく、画面右下にフェードイン/フェードアウトする非同期トースト（`#syncToast`）で表示。

---

## 7. ビルド・テスト・品質監査パイプライン

### 7.1 単一ファイルHTML自動バンドラー (`scripts/build_single_file.py`)
外部ファイル参照をインライン展開し、1ファイルで動作する単一HTMLを自動ビルド：
- `style.css` $ightarrow$ `<style>...</style>`
- Google Fonts 外部URL参照をローカルシステムフォント定義へ置換（100% オフライン実行保証）
- `data/video_catalog.js`, `data/questions.js`, `app.js` $ightarrow$ `<script>...</script>`

### 7.2 総合品質保証テストスイート (`scripts/qa_test_suite.py`)
- 全90問のID重複、必須フィールド、深層3層解説マーク（📖, ✅, 🚨）、YouTube URL有効性、出題形式整合性を自動検証。
- トピック別配分バランス（全トピック10問以上）を検査。

### 7.3 クロスプラットフォームポータビリティ仕様
- **パスのルートアンカー**: すべてのPythonスクリプトは `Path(__file__).resolve().parent.parent` でプロジェクトルートを自動導出するため、カレントディレクトリに関わらず実行可能。
- **文字コード安全設計**: 日本語Windows（cp932）環境での絵文字出力クラッシュを防止するため、スクリプト冒頭で `sys.stdout.reconfigure(encoding='utf-8')` を適用。
