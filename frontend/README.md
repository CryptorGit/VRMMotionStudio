# フロントエンド

[Vite](https://vite.dev/) + [Vue 3](https://vuejs.org/) 製。

## 開発
```powershell
npm install
npm run dev
```
ブラウザで http://localhost:5173 を開いてください。

バックエンド API は Vite 開発サーバが `http://localhost:8080` にプロキシします（`vite.config.js`）。

## ビルド/プレビュー
```powershell
npm run build
npm run preview
```
出力は `dist/` に生成されます。

## テスト
```powershell
npm test
```

## 使い方（VRM）
- 画面左上のメニューから「インポート」で `.vrm` を読み込み（ドラッグ&ドロップ可）。
- 「設定」でライト、SpringBone、LookAt、骨可視（SkeletonHelper）を切替。
- 「モーフ編集」で Expressions（A/I/U/E/O, Joy 等）や検出されたカスタム表情を調整。
