## VRM 移行 TODO（PMX/PMD/VPD 廃止）

目的: PMX/PMD/VPD や MMD 固有構造への依存を撤廃し、VRM のみを公式サポートする。three.js + GLTFLoader + @pixiv/three-vrm を基盤に再設計する。

---

### 1. 依存関係・ビルド設定の更新

- [x] 追加: @pixiv/three-vrm
- [x] 維持: three（現状 ^0.164.1）
- [x] 削除: mmd-parser, ammo.js（three-examples の ammo.wasm も不使用へ）
- [x] Vite 設定に `.vrm` アセットを追加（frontend/vite.config.js）
- [x] Git LFS 対象を `.pmx` → `.vrm` へ変更（.gitattributes）
- [x] Node.js 20.19+ へ更新（Vite要件）※ `frontend/package.json` に `engines` を追加。実行環境の Node 更新は各自で対応。

### 2. ローダー/アセット導線（MMDLoader → VRM）

- [x] MMDLoader を廃止し、GLTFLoader + VRMLoaderPlugin へ置換（frontend/src/utils/createLoader.js）
- [x] ビューワのファイル選択を `.vrm` のみに限定（frontend/src/components/ThreeViewer.vue）
- [x] 複数ファイル/相対パス解決の補助ロジックを簡素化（frontend/src/composables/useModelOperations.js）

### 3. 表示/シーン追加（SkinnedMesh 前提 → VRM）

- [x] 読み込み完了で VRM を取得してシーンへ（useModelOperations.js）
- [x] 毎フレーム更新に `vrm.update(delta)` を組み込み（utils/rendering.js）
- [x] SkinnedMesh/`geometry.userData.MMD.*` 前提の後処理を撤廃（useModelOperations.js をVRM専用に再実装）

### 4. 物理演算（Ammo/MMDAnimationHelper → VRMSpringBone）

- [x] `useAmmoInit.js` を削除（呼び出しも撤去）
- [x] SpringBone は `vrm.update(delta)` に統合（追加処理不要）
- [x] 旧「物理演算」UIは撤去（ModelSection/SettingsSidebar から削除）

### 5. モーフ/表情（morphTargetInfluences → VRMExpressionManager）

- [x] `MorphEditor.vue` を VRM 表情に対応（VRMExpressionPresetName）
- [x] カスタム表情（非プリセット）のUI追加（ベストエフォートで抽出）

### 6. IK/付与（MMD 固有 → 再設計 or 簡略化）

- [x] `frontend/src/utils/ik.js` を削除（関連の useIk* も削除）
- [x] 旧 IK UI/マーカー関連の呼び出しを撤去
- [x] VRM 骨格向けの簡易IK（現状の範囲では不要のためクローズ）

### 7. レンダリング（OutlineEffect → MToon/VRM）

- [x] `OutlineEffect` の使用を中止（useThreeViewerInit.js）
- [x] `effect` 参照の完全撤去（互換レイヤの片付け）

### 8. キャッシュ（複数→単一ファイル化）

- [x] 現行キャッシュを VRM 単一ファイルに適用（流用）
- [x] 必要に応じてシンプル化（任意・現状維持で十分と判断）

### 9. UI/UX の更新

- [x] メニュー: インポートは `.vrm` のみに（ThreeViewer.vue）
- [x] 旧 MMD UI（IKボーン表示/物理演算トグル）を撤去（ModelSection/SettingsSidebar）
- [x] SpringBone/LookAt など VRM前提 UI の追加
- [x] モデル骨可視（SkeletonHelper）最小UIの追加（任意）

### 10. ドキュメント/サンプル

- [x] `README.md` を three-vrm 前提に更新（VRMセクション追加・文言更新）
- [x] サンプル: `docs/*.vrm` の入手手順と LFS 設定を記載
- [x] `frontend/README.md`（存在する場合）更新

### 11. バックエンド

- [x] 現状 MMD/PMX 依存は無し（確認済）

### 12. 動作確認（スモークテスト）

- [ ] VRM の表示（`vrm.scene` が正しく追加される）
- [ ] `vrm.update(delta)` による SpringBone の挙動確認
- [ ] Expression スライダー（A/I/U/E/O, Joy 等）が反映される
- [ ] UI の保存/復元（ライト設定、モデル可視）
- [ ] モデルキャッシュ/復元（単一 `.vrm`）

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
- 物理/初期化（削除済み）
  - `frontend/src/composables/useAmmoInit.js`
  - `frontend/src/components/ThreeViewer.vue`（useAmmoInit 呼び出し削除）
- ポーズ（削除/後日 VRM Pose）
  - `frontend/src/composables/usePoseControls.js`
- IK/付与（削除済み/要再設計）
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

---

メモ: 旧 IK/Ammo/OutlineEffect のコード片は削除済み。`temp_*.txt` などの一時ファイルも掃除済み。`.env.example` を追加し、`.env` は ignore 済み。
