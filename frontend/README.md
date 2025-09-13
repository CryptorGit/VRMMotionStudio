# フロントエンド

[Vite](https://vite.dev/) と [Vue 3](https://vuejs.org/) を用いて構築しています。

## 開発サーバの起動
```bash
npm install
npm run dev
```
ブラウザで [http://localhost:5173](http://localhost:5173) を開いてください。

## ビルド
```bash
npm run build
```
`dist/` ディレクトリにビルド成果物が生成されます。

## 使い方（VRM）

- 画面左上のメニューから「インポート」を選び、`.vrm` ファイルを読み込みます（ドラッグ&ドロップでも可）。
- サイドバーの「設定」で以下を切り替え可能です。
  - ライトマーカー表示/色、ディレクショナルライト強度
  - SpringBone ON/OFF、LookAt ON/OFF
  - モデルの可視/非可視、ボーン可視（最小限の SkeletonHelper）
- 表情（Expressions）は「モーフ編集」からプリセット（A/I/U/E/O, Joy など）と検出されたカスタム表情をスライダで調整できます。
