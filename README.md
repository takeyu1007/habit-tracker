# Habit Tracker

やめたい習慣を断ってからの経過時間を、リアルタイムで記録する個人用の習慣トラッカーです。

**アプリ:** https://takeyu1007.github.io/habit-tracker/

- データは端末内（ブラウザ）にのみ保存され、外部に送信されません
- インストール不要。URL を開いて「ホーム画面に追加」するとアプリとして使えます

## ホーム画面への追加方法

### iPhone / iPad（Safari）
1. Safari で上記 URL を開く
2. 画面下（iPad は上）の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」→「追加」

> ホーム画面に追加せずブラウザで使い続けると、しばらく開かなかった場合にデータが消えることがあります。必ず追加して使ってください。

### Android（Chrome）
1. Chrome で上記 URL を開く
2. 画面上部の案内の「インストール」、またはメニュー（︙）→「ホーム画面に追加」

### Mac
- Safari: メニュー「ファイル」→「Dock に追加」
- Chrome: アドレスバー右端のインストールアイコン

## 開発

ビルド不要・依存パッケージなしです。

```bash
npm test          # テスト（Node.js 20 以上）
npm run serve     # http://localhost:8080 でローカル確認（Python 3）
```

- 仕様: [SPEC.md](./SPEC.md)
- 開発ルール: [GEMINI.md](./GEMINI.md)

## ライセンス表記
- フォント [Outfit](https://github.com/Outfitio/Outfit-Fonts) — SIL Open Font License 1.1（[fonts/OFL.txt](./fonts/OFL.txt)）
