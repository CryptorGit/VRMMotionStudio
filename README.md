# MokuMokuDanceWeb

## プロジェクト概要
MokuMokuDanceWeb は、マルチプラットフォーム向けに MikuMikuDance の制作体験を提供する Web アプリケーションです。MMD 制作の手間を軽減し、直感的で効率的なクリエイティブ環境を目指します。

## ディレクトリ構成
- `frontend/` : Vite + Vue 3 によるフロントエンド
  - `src/`
  - `public/`
- `backend/` : Python と Java によるバックエンド
  - `python/`
  - `java/`
    - `src/main/java/com/mmd/controller/`
    - `src/main/java/com/mmd/service/`
    - `src/main/java/com/mmd/security/`
    - `src/main/java/com/mmd/repository/`
    - `src/main/java/com/mmd/entity/`
    - `src/main/resources/`
  - `db/`

## 起動方法
### フロントエンド
開発サーバを起動するには以下を実行します。
```bash
cd frontend
npm install
npm run dev
```
ブラウザで `http://localhost:5173` を開いてください。

### バックエンド (Python)
```bash
cd backend/python
python app.py
```

### バックエンド (Java)
このリポジトリには `gradle-wrapper.jar` を含めていません。Gradle を使用する場合は、初回に `gradle wrapper` を実行してラッパーを生成してください。
```bash
cd backend/java
# Gradle の場合 (初回のみ wrapper を生成)
gradle wrapper
./gradlew build
java -cp build/classes/java/main com.mmd.App

# Maven の場合
mvn package
java -cp target/classes com.mmd.App
```

## 基本機能（予定）
- PMX インポート
- モーフ調整
- 物理演算
- ポーズ作成・インポート
- アウトライン描画
- ライティング
- 撮影
- カメラ操作
- ノードタイムライン
- 各種エクスポート
- モーショントラッキング
- 姿勢推定

## 実装方針・技術概要
本プロジェクトでは、MikuMikuDance (MMD) の主要機能を Web ブラウザ上で再現するため、以下のようなクロスプラットフォームな最新 Web 技術を採用しています。ブラウザ上で WebGL による高速な 3D 描画を行い、モバイルを含むあらゆる環境で追加のソフトウェア無しに MMD モデルの表示・操作・アニメーションが可能です。主な技術スタックおよび機能の実装方針は次の通りです。

### 3D モデルの読み込みとレンダリング
- Three.js を基盤として使用し、MMD モデルの描画を行います。Three.js の拡張ローダーである MMDLoader（またはその TypeScript 版である three-mmd-loader）を用いて PMX 形式モデルのインポートと表示を実現します [1][2]。MMDLoader は PMX/PMD モデルだけでなく、モーションデータ（VMD）やポーズデータ（VPD）にも対応しており、モデルにボーンアニメーションや表情モーフを適用できます [1]。
- 読み込んだモデルには MMD 特有のトゥーンレンダリングやアウトライン効果も再現します。Three.js のマテリアルやシェーダを調整し、モデルの輪郭線（アウトライン）を描画することで、MMD らしい見た目をブラウザ上で再現します（必要に応じて OutlineEffect の利用も検討します）。照明については Three.js のディレクショナルライト等を用いて MMD の照明モデルを再現し、シーン全体のライティングを調整します。カメラ制御は OrbitControls による手動操作に加え、MMD の VMD カメラモーションを読み込んで自動再生することも可能にします。

### 物理演算エンジン
- キャラクターの髪やスカートの物理挙動は、Bullet ベースの Ammo.js ライブラリで実装します。Ammo.js は Bullet 物理エンジンを Emscripten で JavaScript/WebAssembly に移植したもので、オリジナル Bullet と同等の高度な物理シミュレーション機能を提供します [3]。MMD 公式と同様の剛体・ジョイントによる物理演算を Ammo.js で再現し、モーション再生時に髪や衣装が自然に揺れる挙動を実現します。
- Cannon.js などの軽量物理エンジンも選択肢として検討しました。Cannon.js は純粋な JavaScript で実装された軽量 3D 物理エンジンで、剛体の衝突やジョイントなど基本機能を備えており、Bullet に比べてサイズが小さく扱いやすい利点があります [4]。しかし MMD の物理では布や髪の挙動再現に高度な剛体ジョイントシミュレーションが必要なため、本プロジェクトでは機能が豊富な Ammo.js を主に採用します（必要に応じて Ammo.js の WebAssembly 版を利用しパフォーマンスを最適化します）。Ammo.js の利用により、Three.js + MMDLoader 環境で物理演算を簡単に統合でき、MMD モデルの物理設定を読み込んで自動適用する MMDPhysics 機能も活用します [2]。

### ポーズ作成とモデル操作 GUI
- モデルのボーン操作やモーフ調整のために、ブラウザ上にユーザーフレンドリーな GUI を構築します。パラメータ調整用に dat.GUI（または後継の lil-gui）を組み込み、スライダーやチェックボックスでモデルの各種プロパティをリアルタイムに操作できるようにします。dat.GUI は軽量で使いやすい JavaScript 製 GUI ライブラリで、Three.js を使ったシーンに対してリアルタイムに変数を操作する簡易コントローラを提供します [5]。例えば表情モーフの値をスライダーで調節したり、物理のオン/オフ切替、モデル全体の表示設定などを GUI から直感的に行えます。
- ボーンの姿勢編集については、Three.js の TransformControls を使用してシーン上で直接ボーンを回転・移動させる仕組みを検討しています。ユーザーは 3D ビュー上で操作したいボーンを選択し、ギズモをドラッグすることでポーズを作成できます。この操作により得られたボーン変形は即座にモデルに反映され、GUI 上の数値にも同期されます。
- ポーズデータの入出力にも対応予定です。MMD のポーズファイル（VPD）を読み込んでモデルに適用する機能を実装し、ワンクリックで既存ポーズを再現できます [1]。逆に、ユーザーが手動で作成したポーズを VPD 形式や JSON としてエクスポートする機能も視野に入れ、ブラウザ上での簡易モーション作成・共有を可能にします。

### モーショントラッキング・姿勢推定
- カメラ映像を用いたリアルタイムのモーショントラッキング機能を導入し、ユーザーの動きをモデルに反映できるようにします。具体的には MediaPipe や TensorFlow.js といったブラウザ対応の機械学習ライブラリを利用し、ウェブカメラ映像から人の関節位置を推定します。MediaPipe Pose などを用いることで、人間の体の主要なランドマーク（関節点）をリアルタイムに検出できます [6]。得られた 2D/3D 座標のランドマーク情報を MMD モデルのボーンにマッピングし、ユーザーのポーズに合わせてモデルが動く「簡易モーションキャプチャ」を実現します。
- 使用ライブラリとしては、軽量で高速な MediaPipe Pose (BlazePose) や、TensorFlow.js 版の MoveNet 等を検討しています。MoveNet は 17 点の関節を高精度かつ高速に検出できる最新モデルであり、リアルタイム性と精度のバランスに優れます [7]。MediaPipe/TF.js 系のライブラリはいずれも WebGL による GPU アクセラレーションと WebAssembly による高速実行を活用しており、ブラウザ上でネイティブに近いパフォーマンスで姿勢推定が可能です [8]。これらを組み合わせることで、PC・スマートフォン問わずブラウザ上でユーザーの動きを追跡し、モデルに反映させるインタラクティブな機能を提供します。

### タイムライン編集とカメラワーク
- アニメーションの再生・編集には、GUI 上にタイムライン機能を設ける方針です。各ボーンやモーフのキーフレームを時系列で管理し、再生位置をスクラブしてポーズを確認したり、キーフレームを編集できるインターフェースを HTML5 上に実装します。例えば、再生コントローラ（再生・一時停止・巻き戻し）やシークバー、キーの追加・削除ボタンなどを備え、ユーザーが直感的にモーションを編集できるようにします。タイムラインの実装には、既存の JS ライブラリも検討しつつ、必要に応じて独自開発も行います。
- カメラワークについては、MMD のカメラモーション (VMD) を適用して自動演出する機能に加え、ユーザー自身がカメラアングルを指定・アニメートできるようにします。タイムライン上でカメラの位置・注視点・FOV 等にキーを打ち、スムーズなカメラ移動や被写界深度表現などリッチな演出をブラウザ上で行えるようにします。内部的には Three.js の Camera オブジェクトを補間移動させることで実現し、UI 側ではカメラのパスを視覚化するなどの工夫を検討しています。

### 撮影・エクスポート機能
- 制作したアニメーションや静止画は、ブラウザ上から直接撮影・保存できます。スクリーンショット機能として、現在の 3D キャンバスの描画内容を画像ファイル（PNG/JPEG）としてエクスポートします。ユーザーは任意のタイミングで静止画を保存でき、SNS 共有やサムネイル作成に活用できます。
- 動画録画機能も搭載し、再生中のダンスモーションをそのまま動画ファイルとして出力可能にします。具体的には、HTML5 の <canvas> 要素からストリームを取得する captureStream() メソッドと MediaRecorder API を用いて、WebGL キャンバスの映像をリアルタイムに録画します [9]。これにより、ブラウザ上で再生している 3D アニメーションをその場で WebM 動画などに保存できます。録画した動画はユーザーがダウンロードできるようにし、MMD 動画の手軽な作成・共有を支援します。
- さらに高度なエクスポートとして、編集したモーションデータを標準フォーマットで出力することも検討します。例えば、モデル＋アニメーションを glTF 形式でエクスポートすれば、他の 3D ツールで読み込んで利用することができます。将来的には、ユーザーがブラウザで作成・調整したモーションを VMD 形式で書き出し、デスクトップ版 MMD に再インポートして仕上げる、といったワークフローもサポートできるようにする方針です。

以上のような技術スタックにより、Web ブラウザ上で MMD の豊富な機能を再現し、プラグイン不要・クロスプラットフォームで動作する使いやすいアプリケーションを目指します。本実装方針により、開発効率を高めつつもユーザーにとって馴染みのある MMD 操作性と表現力を提供していきます。

## ビジョン
いつでもどこでも MMD 制作を可能にし、キャラクターコンテンツのさらなる発展を目指します。

## 参考文献
[1] MMD file support, similar or better than the one in threejs - Feature requests - Babylon.js
https://forum.babylonjs.com/t/mmd-file-support-similar-or-better-than-the-one-in-threejs/3615

[2] GitHub - hanakla/three-mmd-loader: MMD pmd/pmx/vmd loader for Three.js
https://github.com/hanakla/three-mmd-loader

[3] GitHub - kripken/ammo.js: Direct port of the Bullet physics engine to JavaScript using Emscripten
https://github.com/kripken/ammo.js/

[4] cannon-es
https://pmndrs.github.io/cannon-es/docs/

[5] Dat.gui | Three.js Resources
https://threejsresources.com/tool/dat-gui

[6] Pose landmark detection guide for Web  |  Google AI Edge  |  Google AI for Developers
https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js

[7][8] Real-Time Human Pose Detection with TensorFlow.js in the Browser | by Rubens Zimbres | Medium
https://medium.com/@rubenszimbres/real-time-human-pose-detection-with-tensorflow-js-in-the-browser-f7202b88ae5c

[9] Record canvas stream
https://webrtc.github.io/samples/src/content/capture/canvas-record/
