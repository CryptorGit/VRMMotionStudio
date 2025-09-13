## VRM 移行 TODO（PMX/PMD/VPD 廃止）

目的: PMX/PMD/VPD や MMD 固有構造への依存を撤廃し、VRM のみを公式サポートする。three.js + GLTFLoader + @pixiv/three-vrm を基盤に再設計する。

---

### 1. 依存関係・ビルド設定の更新

- 追加: @pixiv/three-vrm
- 維持: three（現状 ^0.164.1）
- 削除: mmd-parser, ammo.js（three-examples の ammo.wasm も不使用へ）
- Vite 設定に `.vrm` アセットを追加
  - `frontend/vite.config.js`
  - `export default defineConfig({ assetsInclude: ['**/*.vrm'], ... })`
- Git LFS 対象を `.pmx` → `.vrm` へ変更
  - `.gitattributes:1`

### 2. ローダー/アセット導線（MMDLoader → VRM）

- MMDLoader を廃止し、GLTFLoader + VRMLoaderPlugin へ置換
  - 変更: `frontend/src/utils/createLoader.js`
  - 例: `const loader = new GLTFLoader(manager); loader.register(p => new VRMLoaderPlugin(p));`
- ビューワのファイル選択を `.vrm` のみに限定
  - 変更: `frontend/src/components/ThreeViewer.vue` の `<input accept="...">`
- 複数ファイル/相対パス解決の補助ロジックを簡素化（VRM は単一ファイル）
  - 対象: `frontend/src/composables/useModelOperations.js`（fileMap / setURLModifier / modelSpecificFiles 周辺）

### 3. 表示/シーン追加（SkinnedMesh 前提 → VRM）

- 読み込み完了で VRM を取得してシーンへ
  - `const vrm = gltf.userData.vrm; scene.add(vrm.scene);`
- 毎フレーム更新に `vrm.update(delta)` を組み込む
  - 対象: `frontend/src/composables/useRenderLoop.js` or `useRenderer.js`
- SkinnedMesh 探索や `geometry.userData.MMD.*` 前提の後処理を撤廃
  - 対象: `useModelOperations.js`（applyMmdRotationOrder / ensureLocalAxes / skeletonHelper などの MMD 前提分岐を整理）

### 4. 物理演算（Ammo/MMDAnimationHelper → VRMSpringBone）

- `useAmmoInit.js` を削除（Ammo/MMDAnimationHelper 初期化を全廃）
  - 呼び出し元の削除: `frontend/src/components/ThreeViewer.vue`
- SpringBone を `vrm.update(delta)` によって更新（基本追加処理不要）
- UI の「物理演算」トグルを SpringBone ON/OFF に読み替え
  - 対象: `SettingsSidebar.vue`, `ModelSection.vue`

### 5. モーフ/表情（morphTargetInfluences → VRMExpressionManager）

- `MorphEditor.vue` を VRM 表情に対応
  - `vrm.expressionManager` を使用し、`VRMExpressionPresetName`（A/I/U/E/O, Neutral, Joy など）を UI と同期
  - `expressionManager.setValue('A', value)` → `expressionManager.update()`
- `morphNameMapping.js` を VRM 前提に再設計（プリセット優先 + カスタム名対応）

### 6. IK/付与（MMD 固有 → 再設計 or 簡略化）

- `frontend/src/utils/ik.js` の MMD IK / 付与（grant）前提ロジックを撤廃
  - `geometry.userData.MMD.*` を参照する経路は削除
- 短期: IK トラッカー UI を無効化、または Humanoid の手首/足首等を直接ギズモ操作
- 中期: VRM 骨格向けのシンプル 2-Bone IK/CCD を独立実装（必要に応じて）

### 7. レンダリング（OutlineEffect → MToon/VRM）

- `OutlineEffect` の使用を中止（MToon のアウトラインと干渉）
  - 変更: `frontend/src/composables/useThreeViewerInit.js` を `renderer.render(scene, camera)` に切替
  - `effect` 変数の除去（互換層が必要なら暫定対応の後、クリーンアップ）

### 8. キャッシュ（複数→単一ファイル化）

- `useModelCache.js` は流用可だが、モデルごと 1 ファイル想定に合わせて簡素化（任意）

### 9. UI/UX の更新

- メニュー: 「インポート」→ `.vrm` のみ、「エクスポート（VPD）」は一旦非表示
  - 対象: `frontend/src/components/MenuControls.vue`, `ThreeViewer.vue`
- サイドバー: 「IKボーン表示」「物理演算」など MMD 文言を VRM 用語へ
  - 例: SpringBone, LookAt, Expression
- モデル一覧: `bonesVisible`/`boneNameVisible` などの MMD 前提 UI を再検討（必要なら SkeletonHelper の最小限表示のみ残す）

### 10. ドキュメント/サンプル

- `README.md` の PMX/PMD/Ammo/MMDLoader 前提の記述を three-vrm 前提に全面更新
- サンプルアセット: `docs/*.vrm` の入手手順と LFS 設定を記載
- `frontend/README.md`（存在する場合）も更新

### 11. バックエンド

- 現状 MMD/PMX 依存は無し（確認済）。API の変更は不要

### 12. 動作確認（スモークテスト）

- VRM の表示（`vrm.scene` が正しく追加される）
- `vrm.update(delta)` による SpringBone の挙動確認
- Expression スライダー（A/I/U/E/O, Joy 等）が反映される
- UI の保存/復元（ライト設定、モデル可視）
- モデルキャッシュ/復元（単一 `.vrm`）

### 13. 段階的移行の進め方（推奨）

1) 依存関係と Vite/`.gitattributes` 更新（three-vrm 導入）
2) ローダー差し替え（`.vrm` 読込 → `vrm.scene` 表示、`vrm.update` 組込み）
3) Ammo/MMDAnimationHelper/OutlineEffect を撤去
4) MMD ユーザーデータ依存コード（`geometry.userData.MMD.*`）の削除
5) 表情 UI を VRM Expressions へ切替
6) UI 文言整理と不要機能の一時無効化（VPD/IK）
7) ドキュメント更新とサンプル差し替え

---

### 変更対象ファイル（主）

- ローダー
  - `frontend/src/utils/createLoader.js`
- ビューワ/入力
  - `frontend/src/components/ThreeViewer.vue`（`<input accept>`）
- モデルロード/操作
  - `frontend/src/composables/useModelOperations.js`
- 物理/初期化（削除）
  - `frontend/src/composables/useAmmoInit.js`
  - `frontend/src/components/ThreeViewer.vue`（useAmmoInit 呼び出し削除）
- ポーズ（削除/後日 VRM Pose）
  - `frontend/src/composables/usePoseControls.js`
- IK/付与（再設計）
  - `frontend/src/utils/ik.js`
- レンダリング
  - `frontend/src/composables/useThreeViewerInit.js`（OutlineEffect 除去）
- UI
  - `frontend/src/components/MenuControls.vue`
  - `frontend/src/components/SettingsSidebar.vue`
  - `frontend/src/components/ModelSection.vue`
  - `frontend/src/components/ModelList.vue`
- ビルド/設定
  - `frontend/vite.config.js`
  - `frontend/package.json`
  - `.gitattributes`
  - `README.md`

---

### 参考（旧 MMD TODO 項目の扱い）

- （再評価）ボーンマーカーの選択状態に応じた色切り替え
- （再評価）IK従属ボーンの橙色ハイライト
- （削除）表示枠情報に基づくボーン表示制御（PMX 依存）
- （削除/再設計）ボーン名表示から物理ボーンを除外する設定（MMD 物理の概念に依存）

必要に応じて、VRM Humanoid ベースの最小限の骨可視化（SkeletonHelper）と、表情・SpringBone の操作 UI を優先実装する。

