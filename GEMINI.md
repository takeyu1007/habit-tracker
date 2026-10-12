# Project Context: Habit Tracker

AI エージェント向けの開発ルール。実装前に必ず読むこと。仕様は [SPEC.md](./SPEC.md) を参照。

## 概要
やめたい習慣の「断ってからの経過時間」を記録する個人用 PWA。利用者は開発者本人（Android）と友人数名（iOS）。将来 iPad / Mac でも使う。
GitHub Pages で `https://takeyu1007.github.io/habit-tracker/` に公開している。

## 技術スタック
- 素の HTML / CSS / JavaScript（ES Modules）。**ビルド工程・npm 依存パッケージは追加しない**（必要になったら Vite へ移行を提案する）
- 型: JSDoc + 各ファイル先頭の `// @ts-check`
- 保存: `localStorage`（キー `habitTracker.data`）。外部通信は行わない（フォントも自前ホスト）
- テスト: `node --test`（Node 24）

## ディレクトリ構成
| パス | 役割 |
| :--- | :--- |
| `src/model.js` | 型定義（`Habit` / `ResetLog` / `Reward` / `AppData`）とファクトリ |
| `src/calc.js` | 経過時間・節約額などの計算。**純粋関数のみ（DOM・Storage 禁止）** |
| `src/format.js` | 表示用整形（DOM 非依存） |
| `src/storage.js` | 保存・読込・スキーマ移行 |
| `src/store.js` | 状態管理。**状態変更は必ずここの関数経由**（自動保存される） |
| `src/ui/*.js` | 画面部品。`src/main.js` で結線 |
| `styles/tokens.css` | デザイントークン（色・余白など）。新しい色はまずここに追加 |
| `sw.js` | Service Worker（ネットワーク優先） |
| `docs/private/` | 非公開資料。**git 管理外。内容を公開ファイルへ転記しないこと** |

## 必須ルール
1. **パスは全て相対パス**（`./src/...`）。サイトは `/habit-tracker/` 配下で配信されるため、`/` 始まりの絶対パスは壊れる。
2. **保存形式を変えたら** `storage.js` の `SCHEMA_VERSION` を上げ、`migrate()` に旧→新の変換とテストを追加する。保存済みデータを壊さないこと。
3. **ロジック変更時はテストを追加・更新**し、`npm test` が通ることを確認する。
4. **ファイルを追加・改名したら** `sw.js` の `APP_SHELL` を更新し、`CACHE_VERSION` を上げる。
5. ユーザー入力を `innerHTML` に入れる場合は必ず `escapeHtml()` を通す。
6. iOS 対応を崩さない: 入力欄の文字サイズ 16px 以上、`env(safe-area-inset-*)`、`100dvh`。
7. 他社アプリの名称・画像・文言を使わない。

## コマンド
```bash
npm test          # テスト
npm run serve     # http://localhost:8080 でローカル確認
```

## デプロイ
`main` ブランチへ push すると GitHub Pages に自動反映される（数分かかる）。
