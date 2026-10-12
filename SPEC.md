# Habit Tracker 仕様書

断ち切りたい悪習慣（間食、SNS、エナジードリンク等）の「やめてからの経過時間」を記録・可視化する、個人用の習慣トラッカーです。
リアルタイムカウント、節約額・取り戻した時間の換算、リセット時の振り返り日記、ご褒美（ウィッシュリスト）機能により、無理なく継続できることを目指します。

### 1. システム要件 & アーキテクチャ方針

* **想定利用者：** 開発者本人（Android）および友人数名（iOS）。将来的に iPad / Mac でも利用可能とする。
* **プラットフォーム：** SPA（Single Page Application）＋ PWA（Progressive Web App）
  * スマホのホーム画面に追加することで、ネイティブアプリ感覚で全画面起動可能。
* **配布：** GitHub Pages による URL 配布（`https://takeyu1007.github.io/habit-tracker/`）。
* **技術：** 素の HTML / CSS / JavaScript（ES Modules、ビルドなし）。JSDoc + `// @ts-check` で型チェック。将来 Vite へ移行可能な構成とする。
* **データ保持：** ブラウザの `localStorage`（サーバー代0円、外部通信なしでプライバシー完全保護）。保存データには `version` を持たせ、スキーマ変更時はマイグレーションで対応。
* **バックアップ：** JSON形式でのワンクリック設定エクスポート / インポート機能。

---

### 2. 画面構成（UIワイヤーフレーム設計）

```
[画面1: ダッシュボード（一覧画面）]
├── ヘッダー（アプリ名、新規習慣追加ボタン、データバックアップ）
├── 習慣カード一覧
│   ├── 習慣アイコン ＋ 習慣名
│   ├── 経過時間（例: 12日 04時間 18分 22秒）
│   ├── 次のマイルストーン（例: [7日] ====> (65%) ====> [14日]）
│   ├── 節約金額 & 浮いた時間バッジ（例: ¥12,400 / 18h 節約）
│   └── アクション（リセットボタン / 詳細へ）
└── 今日の名言 / モチベーションバナー

[画面2: 習慣詳細 ＆ 衝動対策画面]
├── 巨大リアルタイム・円形プログレスタイマー
├── 統計サマリー（現在 / 最長記録 / 平均記録 / 通算節約額）
├── 「やめる理由」カード（衝動が来たときの緊急チェック用）
├── ご褒美（ウィッシュリスト）進捗バー
└── 履歴タイムライン（リセット時の日記ログ一覧）

[モーダル: リセット（再発）入力]
├── リセット実行確認
├── 再発した日時（デフォルトは現在時刻、過去への修正可）
└── 振り返りメモ（「何が引き金だったか」「そのときの感情」）
```

---

### 3. データモデル定義（TypeScript型定義）

```typescript
// 1. 習慣データ
interface Habit {
  id: string;                      // 一意なID (UUIDまたはタイムスタンプ)
  title: string;                   // 習慣名（例: "エナジードリンク", "間食", "SNS徘徊"）
  icon: string;                    // アイコン（絵文字またはSVGキー）
  startedAt: string;               // 開始日時 (ISO 8601形式: "2026-10-01T08:00:00Z")
  costPerPeriod: number;           // 単価（円）
  costPeriodUnit: 'day' | 'week' | 'month'; // 費用周期
  timeSpentMinutesPerDay: number;  // 1日あたり消費していた時間（分）
  reasons: string[];               // やめたい理由リスト
  milestones: number[];            // 目標日数リスト（例: [1, 3, 7, 14, 30, 90, 180, 365]）
  createdAt: string;
}

// 2. リセット（スリップ）履歴ログ
interface ResetLog {
  id: string;
  habitId: string;
  resetAt: string;                 // 再発日時
  durationSeconds: number;         // その回で継続できた秒数
  savedAmount: number;             // その回で浮いた金額
  reasonNote: string;              // 引き金・反省メモ
}

// 3. ご褒美（ウィッシュリスト）
interface Reward {
  id: string;
  habitId: string;                 // 紐付ける習慣（全体共通でも可）
  name: string;                    // 欲しいもの（例: "欲しかった本", "高級ディナー"）
  targetAmount: number;            // 必要な金額（円）
  isClaimed: boolean;              // 達成・購入済みフラグ
}
```

---

### 4. コア計算ロジック仕様

#### (1) 経過時間の算出
```typescript
const now = new Date().getTime();
const start = new Date(habit.startedAt).getTime();
const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));

const days = Math.floor(diffSeconds / (3600 * 24));
const hours = Math.floor((diffSeconds % (3600 * 24)) / 3600);
const minutes = Math.floor((diffSeconds % 3600) / 60);
const seconds = diffSeconds % 60;
```

#### (2) 節約金額・時間の算出
* **1日あたりの節約金額 ($C_{day}$)**:
  * 日指定: $C_{day} = costPerPeriod$
  * 週指定: $C_{day} = costPerPeriod / 7$
  * 月指定: $C_{day} = costPerPeriod / 30.4375$
* **現在までの総節約金額**:
  $$\text{SavedMoney} = \left(\frac{diffSeconds}{86400}\right) \times C_{day}$$
* **現在までの取り戻した時間（分）**:
  $$\text{SavedMinutes} = \left(\frac{diffSeconds}{86400}\right) \times timeSpentMinutesPerDay$$

#### (3) 次のマイルストーン進捗率
定義されたマイルストーン配列（例: `[1, 3, 7, 14, 30, 90, 365]` 日）から、
* `prevGoal`: 現在達成済みの最大マイルストーン日数
* `nextGoal`: 次に目指すべきマイルストーン日数
* **進捗度（%）**:
  $$\text{Progress} = \frac{\text{CurrentDays} - \text{prevGoal}}{\text{nextGoal} - \text{prevGoal}} \times 100$$

---

### 5. 実装に向けたステップ推奨

1. **フェーズ1（最小動作・MVP）：**
   * 習慣の追加 / 編集 / 削除・リアルタイムカウントアップ・リセット機能。
   * ローカルストレージ自動保存（`ResetLog` は UI 未表示でも記録しておく）。
   * PWA 最小構成（実機確認に HTTPS 配信が必要なため前倒し）、iOS 対応、レスポンシブ。
2. **フェーズ2（中核機能）：**
   * 節約金額・取り戻した時間の自動計算。
   * 「やめる理由」の確認画面（パニック防止用）。
   * マイルストーン進捗表示、習慣詳細画面。
3. **フェーズ3（継続モチベーション強化）：**
   * ご褒美（ウィッシュリスト）進捗バー。
   * リセット時の振り返り日記・最長記録などの統計表示。
   * JSON エクスポート / インポート。