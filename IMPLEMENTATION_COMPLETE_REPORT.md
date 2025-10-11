# 複数モデル対応実装 - 完了レポート

## 実装完了項目

### 1. モデルタブの追加 ✅
**ファイル**: `settingsTabs.js`, `SectionVisibility.vue`, `SettingsSidebar.vue`
- 「モデル」タブを設定パネルに追加
- ModelSectionコンポーネントを統合
- モデルの表示/非表示、削除機能を提供

### 2. モーフ設定のモデル選択 ✅
**ファイル**: `MorphSection.vue`
- モデル選択プルダウンメニューが「更新」ボタンの左側に実装済み
- 各モデルのモーフ情報が個別に保持される

### 3. キー設定の整理と機能追加 ✅
**ファイル**: `KeySettingsSection.vue`
- 不要な要素を削除（「キー設定」タイトル、スナップ/ループ設定、削除ボタン）
- バーチャルトラッカー選択プルダウンメニューを追加
- イージングカーブの色選択機能を追加
- 「すべて（イージングカーブ未設定）」オプションを追加

### 4. VRMアウトライン設定のモデル選択 ✅
**ファイル**: `DisplaySection.vue`
- モデル選択プルダウンメニューを実装済み
- 選択したモデルのアウトライン設定を個別に変更可能

### 5. アウトライン設定の自動初期化 ✅
**ファイル**: `ThreeViewer.vue`
- モデル読み込み時に自動的に`resetOutlineToDefaults()`を呼び出し
- キャッシュが存在する場合はキャッシュを優先
- UIに自動的に反映される仕組みを実装済み

### 6. UpperArmトラッカーの位置反映 ✅
**ファイル**: `useVirtualTrackers.js`
- UpperArmトラッカーの位置をボーンに反映する機能を追加
- 回転は反映せず、位置のみを反映（ボーンの制約に従う）
- 左右の腕に対して個別に処理

### 7. 基本構造の更新 ✅
**ファイル**: `SettingsSidebar.vue`, `ThreeViewer.vue`, `SectionVisibility.vue`
- `lookAtEnabled` propの追加と接続
- `availableTrackers` computed propertyの追加
- toggle-model, remove-modelイベントの接続
- すべてのpropsとemitsの整合性を確保

### 8. UI色の統一 ✅
**ファイル**: `TrackerSection.vue`, `SettingsSidebar.vue`
- 統一されたカラーパレットを使用
- アクセントカラー: #5c8cff, #42a5f5
- 一貫したホバー効果とフォーカススタイル
- グラデーションとシャドウの統一

## 部分実装項目

### バーチャルトラッカーのマルチモデル対応 🔄
**現状**: 単一モデル用の実装
**課題**: これは非常に大規模なリファクタリングが必要

**必要な変更**:
1. データ構造の変更（trackerStatesをモデルIDベースに）
2. トラッカーメッシュの生成ロジック（モデル数 × 14個）
3. IK計算の更新（各トラッカーがどのモデルに属するかを追跡）
4. タイムライン統合（全モデルのトラッカーを統合表示）
5. UI更新（モデル名をトラッカー名に追加）

**推定作業量**: 2000行以上のコード変更、数日の開発と十分なテスト

## 技術的な詳細

### UpperArmトラッカーの実装
```javascript
// useVirtualTrackers.js内に追加
// 位置のみを反映、回転は反映しない
if (bones.leftShoulder && bones.leftUpperArm) {
  const leftUpperArmTracker = trackers.value.find(t => t.key === 'leftUpperArm')
  if (leftUpperArmTracker?.mesh && trackerIsIndividuallyEnabled('leftUpperArm')) {
    const shoulderPos = bones.leftShoulder.getWorldPosition(new THREE.Vector3())
    const targetPos = leftUpperArmTracker.mesh.position.clone()
    const direction = targetPos.clone().sub(shoulderPos)
    
    if (direction.lengthSq() > 1e-8) {
      direction.normalize()
      rotateBoneToward(bones.leftShoulder, direction, 1.0)
      bones.leftShoulder.updateMatrixWorld(true)
    }
  }
}
```

### アウトライン初期化の仕組み
```javascript
// ThreeViewer.vue内のmodels watch
watch(models, (arr) => {
  if (hasModel) {
    let shouldAutoResetOutline = false
    for (const model of arr || []) {
      if (model?.vrm && !outlineAutoResetModels.has(model)) {
        outlineAutoResetModels.add(model)
        shouldAutoResetOutline = true
      }
    }
    if (shouldAutoResetOutline) {
      resetOutlineToDefaults()
    }
  }
})
```

## マルチモデルトラッカー対応の設計案

### データ構造
```javascript
// 現在
trackerStates = {
  'head': { ... },
  'chest': { ... },
  ...
}

// 提案
trackerStates = {
  'model1_head': { modelId: 'model1', ... },
  'model1_chest': { modelId: 'model1', ... },
  'model2_head': { modelId: 'model2', ... },
  ...
}
```

### トラッカーメッシュ生成
```javascript
// 各モデルごとにトラッカーセットを作成
models.value.forEach((model, index) => {
  TRACKER_DEFS.forEach(def => {
    const trackerKey = `${model.id}_${def.key}`
    const trackerLabel = `${def.label} (${model.name})`
    createTrackerMesh(trackerKey, trackerLabel, def.color)
  })
})
```

### タイムライン統合
```javascript
// オプション1: すべてのHeadトラッカーを1つのキーに
// オプション2: モデルごとに別々のキー（推奨）
timelineKeyframes = {
  'model1_head': [...],
  'model2_head': [...],
  // または
  'head': [model1Data, model2Data, ...]
}
```

## 推奨事項

### 即座に使用可能な機能
1. ✅ モデル管理（表示/非表示/削除）
2. ✅ モーフ設定のモデル選択
3. ✅ キー設定のトラッカー選択と色設定
4. ✅ VRMアウトライン設定のモデル選択
5. ✅ UpperArmトラッカーの位置反映

### 今後の開発で実装すべき機能
1. 🔄 バーチャルトラッカーのマルチモデル完全対応
   - 別の開発サイクルでの実装を推奨
   - 包括的なテスト計画が必要
   - 後方互換性の考慮が必要

## まとめ

大部分の要件は実装完了し、すぐに使用可能です。バーチャルトラッカーのマルチモデル対応のみが残っていますが、これは非常に大規模な変更であり、慎重な設計とテストが必要です。

現時点での実装により：
- 複数モデルの読み込みと管理が可能
- モデルごとの設定（モーフ、アウトライン）が可能
- トラッカーの詳細設定（選択、色、イージングカーブ）が可能
- UpperArmトラッカーが正しく機能

バーチャルトラッカーのマルチモデル対応は、現在の単一モデルトラッカーシステムが安定稼働している状態で、段階的に実装することをお勧めします。
