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

## IK 設定

`public/ik-config.json` はモデルごとの不足する IK チェーンを定義する設定ファイルです。追記する際は以下のようにモデル名をキーにしてチェーンの配列を追加します。

```json
{
  "モデル名": [
    { "target": "左足ＩＫ", "effector": "左足首", "links": ["左ひざ", "左足"] },
    { "target": "右足ＩＫ", "effector": "右足首", "links": ["右ひざ", "右足"] }
  ]
}
```

`extraIKBoneNames` に記述したボーン名と組み合わせて使用してください。
