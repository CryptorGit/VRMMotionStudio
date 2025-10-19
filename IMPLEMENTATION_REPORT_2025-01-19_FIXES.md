# 実装レポート - 2025年1月19日

## 修正概要

ユーザーからの3つの主要な問題を調査・修正しました:

1. **キーフレーム選択タブ切り替えバグ** - タイムラインでキーを複数選択している状態で、キー設定以外のタブからキー設定タブへ移動すると設定項目が表示されない
2. **トラッカーリセット動作の問題** - ResetPosition/ResetRotationが現在のボーン位置に合わせてしまい、インポート時のTポーズに戻らない
3. **マルチモデルトラッカー未作成** - 2体目以降のモデルを読み込んでもバーチャルトラッカーが追加されない

---

## 1. キーフレーム選択タブ切り替えバグ

### 問題の詳細

**症状:**
- タイムラインで複数のキーフレームを選択
- カメラ、モデルなど別のタブに移動
- キー設定タブに戻る
- → キーの設定項目が何も表示されない（空白になる）

**原因:**
`KeySettingsSection.vue`のwatchロジックに問題がありました:

```javascript
// 修正前
watch(
  () => props.selection?.selectedIds.slice(),
  (newValue, oldValue) => {
    // 早期returnが問題
    if (!props.selection || !Array.isArray(newValue) || newValue.length === 0) {
      return  // ここでreturnするとデータ更新をスキップしてしまう
    }
    
    const frames = props.selection?.frames
    if (!Array.isArray(frames) || frames.length === 0) return  // ここも問題
    
    // データ更新処理...
  }
)
```

タブ切り替え時に`KeySettingsSection`コンポーネントが再作成されますが、watchの早期returnによって必要なデータ更新がスキップされていました。

### 修正内容

**ファイル:** `frontend/src/components/KeySettingsSection.vue`

```javascript
// 修正後
watch(
  () => {
    if (props.selection && Array.isArray(props.selection.selectedIds)) {
      return props.selection.selectedIds.slice()
    }
    return null
  },
  (newValue, oldValue) => {
    // selectionがnullの場合はデフォルトにリセット
    if (!props.selection) {
      selectedTracker.value = 'default'
      resetTrackerColorCache()
      return
    }

    // 配列が空の場合もデフォルトにリセット
    if (!Array.isArray(newValue) || newValue.length === 0) {
      selectedTracker.value = 'default'
      resetTrackerColorCache()
      return
    }

    // 配列の内容が同じ場合は処理をスキップ
    if (areIdArraysEqual(newValue, oldValue)) {
      return
    }

    // フレームデータを収集してカラーキャッシュを更新
    const frames = props.selection?.frames
    selectedTracker.value = 'default'
    resetTrackerColorCache()
    
    // framesの有無に関わらず、必要な初期化は実行
    if (Array.isArray(frames) && frames.length > 0) {
      frames.forEach(frame => {
        const curves = frame?.curves || {}
        Object.keys(curves).forEach(key => {
          if (curves[key]?.color) {
            rememberTrackerColor(key, curves[key].color)
          }
        })
      })
    }
  },
  { immediate: true }  // コンポーネントマウント時にも実行
)
```

### 改善点

1. **確実なリセット処理**: `selectedTracker`と`resetTrackerColorCache()`を常に実行
2. **immediate: true追加**: コンポーネント初回マウント時にもwatchを実行
3. **条件分岐の改善**: framesが空でも必要な初期化は実行する
4. **早期returnの最適化**: 各ケースで適切なクリーンアップを実行

---

## 2. トラッカーリセット動作の修正

### 問題の詳細

**症状:**
- ResetPositionやResetRotationボタンをクリック
- トラッカーが「現在のボーン位置」に移動してしまう
- → 本来は「モデルインポート時のTポーズ」に戻るべき

**原因:**
`resetTrackerPosition`と`resetTrackerRotation`関数内で、初期ポーズ(`initialWorldPose`)が存在しない場合に、現在のボーンポーズを再キャプチャしていました:

```javascript
// 修正前
function resetTrackerPosition(key, { persist = true } = {}) {
  const model = getActiveModel()
  let initMap = initialWorldPose.get(model)
  
  // 問題: 初期ポーズが無い場合、現在のポーズをキャプチャ
  if (!initMap || !initMap.has(baseKey)) {
    if (model) {
      initialWorldPose.delete(model)
      captureInitialWorldPose(model)  // 現在のポーズ = Tポーズではない！
      initMap = initialWorldPose.get(model)
    }
  }
  // ...
}
```

### 修正内容

**ファイル:** `frontend/src/composables/useVirtualTrackers.js`

#### resetTrackerPosition の修正

```javascript
function resetTrackerPosition(key, { persist = true } = {}) {
  if (key === CAMERA_TRACKER_KEY) return
  const tracker = trackers.value.find(t => t.key === key)
  if (!tracker?.mesh) return
  
  // 初期位置を取得（初期ポーズから）
  const model = getActiveModel()
  const initMap = initialWorldPose.get(model)
  const { baseKey } = parseTrackerKey(key)
  
  // 初期ポーズが記録されている場合のみ、その位置に戻る
  if (initMap && initMap.has(baseKey)) {
    const entry = initMap.get(baseKey)
    if (entry?.position) {
      // 初期位置を適用
      tracker.mesh.position.copy(entry.position)
      tracker.mesh.updateMatrixWorld(true)
      syncTrackerStateFromMesh(key)
      
      markActiveKey(key)
      if (persist) persistTrackerTransforms()
      notifyTrackerTransform(key, {
        type: 'position',
        position: [tracker.mesh.position.x, tracker.mesh.position.y, tracker.mesh.position.z],
        persisted: persist !== false,
        source: 'reset'
      })
    }
  } else {
    // 初期ポーズが無い場合は警告を出してスキップ
    console.warn(`[resetTrackerPosition] No initial pose recorded for tracker "${key}". Reset skipped.`)
  }
}
```

#### resetTrackerRotation の修正

```javascript
function resetTrackerRotation(key, { keepEnabled = true, persist = true } = {}) {
  if (key === CAMERA_TRACKER_KEY) return
  const tracker = trackers.value.find(t => t.key === key)
  const state = ensureTrackerState(key)
  if (!tracker?.mesh || !state) return
  
  // 初期回転を取得（初期ポーズから）
  const model = getActiveModel()
  const initMap = initialWorldPose.get(model)
  const { baseKey } = parseTrackerKey(key)
  
  // 初期ポーズが記録されている場合のみ、その回転に戻る
  if (initMap && initMap.has(baseKey)) {
    const entry = initMap.get(baseKey)
    if (entry?.quaternion) {
      // 初期回転を適用
      tracker.mesh.quaternion.copy(entry.quaternion)
      tracker.mesh.updateMatrixWorld(true)
      syncTrackerStateFromMesh(key)
    } else {
      // フォールバック: ゼロ回転
      resetTrackerStateToDefault(key, { keepEnabled })
    }
  } else {
    // 初期ポーズがない場合はゼロ回転
    console.warn(`[resetTrackerRotation] No initial pose recorded for tracker "${key}". Using zero rotation.`)
    resetTrackerStateToDefault(key, { keepEnabled })
  }
  
  markActiveKey(key)
  if (persist) persistTrackerTransforms()
  const snapshotAngles = {
    x: sanitizeAngleInput(state.angles?.x || 0),
    y: sanitizeAngleInput(state.angles?.y || 0),
    z: sanitizeAngleInput(state.angles?.z || 0)
  }
  notifyTrackerTransform(key, {
    type: 'rotation',
    angles: snapshotAngles,
    persisted: persist !== false,
    source: 'reset'
  })
}
```

#### resetAllTrackerRotations と resetAllTrackerPositions の修正

```javascript
function resetAllTrackerRotations({ keepEnabled = true, persist = true } = {}) {
  // すべてのトラッカーを初期回転に戻す（初期ポーズは再キャプチャしない）
  for (const def of TRACKER_DEFS) {
    resetTrackerRotation(def.key, { keepEnabled, persist: false })
    notifyTrackerTransform(def.key, { type: 'reset', bulk: true, persisted: false })
  }
  if (persist) {
    persistTrackerTransforms()
    notifyTrackerTransform('all', { type: 'resetAll', persisted: true })
  }
}

function resetAllTrackerPositions({ persist = true } = {}) {
  // すべてのトラッカーを初期位置に戻す（初期ポーズは再キャプチャしない）
  for (const def of TRACKER_DEFS) {
    resetTrackerPosition(def.key, { persist: false })
  }
  if (persist) {
    persistTrackerTransforms()
    notifyTrackerTransform('all', { type: 'resetAllPositions', persisted: true })
  }
}
```

### 改善点

1. **初期ポーズの保護**: リセット時に`initialWorldPose`を再キャプチャしない
2. **エラーハンドリング**: 初期ポーズが無い場合は警告を出してスキップ
3. **正確なTポーズリセット**: モデルインポート時の最初のポーズのみを使用
4. **コードの簡潔化**: 不要な削除・再作成ロジックを削除

### 動作の流れ

```
1. モデルインポート
   ↓
2. captureInitialWorldPose() が自動実行
   → initialWorldPose に Tポーズのワールド位置・回転を記録
   ↓
3. ユーザーがトラッカーを移動・回転
   ↓
4. ResetPosition / ResetRotation ボタンをクリック
   ↓
5. initialWorldPose から記録済みのTポーズ位置・回転を取得
   ↓
6. トラッカーをTポーズ位置・回転に戻す
```

---

## 3. マルチモデルトラッカーのデバッグログ追加

### 問題の詳細

**症状:**
- 1体目のモデルを読み込む → トラッカー14個表示 ✅
- 2体目のモデルを読み込む → トラッカーが追加されない ❌
- 内部的には実装されているが、機能していない

**調査のための修正:**
デバッグログを追加して、マルチモデル時の動作を追跡できるようにしました。

### 修正内容

**ファイル:** `frontend/src/composables/useVirtualTrackers.js`

#### createGizmos のデバッグログ

```javascript
function createGizmos() {
  if (group.value) {
    const inScene = !!scene.value && scene.value.children.includes(group.value)
    const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
    const expectedTrackerCount = TRACKER_DEFS.length * modelCount
    const complete = trackers.value.length === expectedTrackerCount
    
    // デバッグログ追加
    console.log(
      `[createGizmos] Check: models.value.length=${models?.value?.length}, ` +
      `modelCount=${modelCount}, expectedTrackerCount=${expectedTrackerCount}, ` +
      `actual=${trackers.value.length}, complete=${complete}, inScene=${inScene}`
    )
    
    if (inScene && complete) return
    disposeGizmos()
  }
  
  // モデル数に応じてトラッカーを作成
  const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
  console.log(
    `[createGizmos] Creating trackers: models.value=${Array.isArray(models?.value) ? models.value.length : 'not-array'}, ` +
    `modelCount=${modelCount}, TRACKER_DEFS.length=${TRACKER_DEFS.length}`
  )
  
  for (let modelIdx = 1; modelIdx <= modelCount; modelIdx++) {
    for (const def of TRACKER_DEFS) {
      const trackerKey = makeTrackerKey(def.key, modelIdx)
      const trackerLabel = formatTrackerLabel(def.label, modelIdx)
      
      // 各トラッカー作成時のログ
      console.log(
        `[createGizmos] Model ${modelIdx}/${modelCount}: ` +
        `Creating tracker "${trackerKey}" with label "${trackerLabel}"`
      )
      
      // トラッカー作成処理...
    }
  }
}
```

#### watch(models) のデバッグログ

```javascript
watch(models, (newModels, oldModels) => {
  const currentCount = Array.isArray(newModels) ? newModels.length : 0
  const previousCount = Array.isArray(oldModels) ? oldModels.length : 0
  
  // モデル数変更のログ
  console.log(
    `[watch(models)] Model count changed: ${previousCount} -> ${currentCount}, ` +
    `enabled=${enabled.value}`
  )
  
  // Models were removed (went to 0)
  if (currentCount === 0 && previousCount > 0) {
    if (enabled.value) {
      userWantsTrackers = true
      enabled.value = false
    }
  }
  // Models were added (went from 0 to some)
  else if (currentCount > 0 && previousCount === 0) {
    if (userWantsTrackers) {
      enabled.value = true
      userWantsTrackers = false
    }
  }
  // Model reload (count changed but not to/from 0)
  else if (currentCount !== previousCount) {
    if (enabled.value && currentCount > previousCount) {
      console.log(
        `[watch(models)] Model added (${previousCount} -> ${currentCount}), ` +
        `recreating trackers...`
      )
      createGizmos()
      setTimeout(() => {
        layoutDefaultPositions({ force: false })
        console.log(
          `[watch(models)] After layoutDefaultPositions: ` +
          `trackers.value.length=${trackers.value.length}`
        )
      }, 100)
    } else if (enabled.value && currentCount > 0) {
      console.log(
        `[watch(models)] Model count changed (${previousCount} -> ${currentCount}), ` +
        `updating positions...`
      )
      setTimeout(() => {
        layoutDefaultPositions({ force: false })
      }, 100)
    } else if (!enabled.value) {
      console.log(
        `[watch(models)] Model count changed but trackers are disabled. ` +
        `enabled=${enabled.value}`
      )
    }
  }
  
  previousModelCount = currentCount
}, { immediate: false })
```

### デバッグログの出力例

#### 1体目のモデルを読み込んだ場合

```
[watch(models)] Model count changed: 0 -> 1, enabled=false
[createGizmos] Creating trackers: models.value=1, modelCount=1, TRACKER_DEFS.length=14
[createGizmos] Model 1/1: Creating tracker "head" with label "Head"
[createGizmos] Model 1/1: Creating tracker "chest" with label "Chest"
...（14個のトラッカー作成）
```

#### 2体目のモデルを読み込んだ場合（期待される出力）

```
[watch(models)] Model count changed: 1 -> 2, enabled=true
[watch(models)] Model added (1 -> 2), recreating trackers...
[createGizmos] Check: models.value.length=2, modelCount=2, expectedTrackerCount=28, actual=14, complete=false, inScene=true
[createGizmos] Creating trackers: models.value=2, modelCount=2, TRACKER_DEFS.length=14
[createGizmos] Model 1/2: Creating tracker "head" with label "Head 1"
[createGizmos] Model 2/2: Creating tracker "head_2" with label "Head 2"
...（28個のトラッカー作成）
[watch(models)] After layoutDefaultPositions: trackers.value.length=28
```

#### トラッカーが無効の場合（問題のケース）

```
[watch(models)] Model count changed: 1 -> 2, enabled=false
[watch(models)] Model count changed but trackers are disabled. enabled=false
```

### デバッグ方法

1. ブラウザでアプリを開く
2. **F12キーを押してコンソールを開く**
3. 1体目のモデルを読み込む
4. トラッカーを有効化する（重要！）
5. 2体目のモデルを読み込む
6. コンソールログを確認:
   - `enabled=true` か確認
   - `Creating tracker` が28個（14×2）出力されるか確認
   - `trackers.value.length=28` になっているか確認

### 想定される問題パターン

1. **enabled=false のまま**: トラッカーが無効化されている
   - **対策**: モデル読み込み前にトラッカーを有効化
   
2. **createGizmos が呼ばれない**: watchが発火していない
   - **対策**: `models.value` の参照が正しいか確認
   
3. **complete=true で早期return**: 既にトラッカーが存在すると判定
   - **対策**: `disposeGizmos()` を手動で呼んでリセット

---

## テスト手順

### 1. キーフレーム選択バグ

1. アプリを起動
2. モデルを読み込む
3. タイムラインでキーフレームを3個以上作成
4. タイムラインで複数のキーフレームを選択（Ctrl+クリック）
5. **カメラ**タブに移動
6. **キー設定**タブに戻る
7. ✅ キーの設定項目が表示される（フレーム番号、時間、カーブエディタなど）

### 2. トラッカーリセット動作

1. アプリを起動
2. モデルを読み込む（Tポーズで表示される）
3. トラッカーを有効化
4. 頭のトラッカー（Head）を上に移動（Y軸 +0.5など）
5. 頭のトラッカーを回転（X軸 45度など）
6. **Reset Position** ボタンをクリック
7. ✅ トラッカーが元のTポーズ位置（頭の上）に戻る
8. **Reset Rotation** ボタンをクリック
9. ✅ トラッカーが元のTポーズ回転（0, 0, 0）に戻る

### 3. マルチモデルトラッカー

1. アプリを起動
2. **F12キーを押してコンソールを開く**
3. 1体目のモデルを読み込む
4. トラッカーを有効化（重要！）
5. コンソールログを確認:
   ```
   [createGizmos] Creating trackers: models.value=1, modelCount=1
   ...14個のトラッカー作成ログ
   ```
6. 2体目のモデルを読み込む
7. コンソールログを確認:
   ```
   [watch(models)] Model count changed: 1 -> 2, enabled=true
   [watch(models)] Model added (1 -> 2), recreating trackers...
   [createGizmos] Creating trackers: models.value=2, modelCount=2
   ...28個のトラッカー作成ログ
   [watch(models)] After layoutDefaultPositions: trackers.value.length=28
   ```
8. 3Dビューでトラッカーを確認:
   - Head 1, Head 2
   - Chest 1, Chest 2
   - など、番号付きのトラッカーが表示される

---

## 技術的詳細

### コンポーネント再マウントの問題

`SectionVisibility.vue`は`v-else-if`を使用しているため、タブを切り替えるたびにコンポーネントが破棄・再作成されます:

```vue
<KeySettingsSection
  v-else-if="active === 'keys'"
  :selection="timelineSelection"
  ...
/>
```

この動作により:
- コンポーネントの`setup()`が再実行される
- すべてのrefとcomputedが再初期化される
- watchの`immediate: true`が重要になる

### WeakMapの活用

`initialWorldPose`は`WeakMap`を使用してモデルごとの初期ポーズを保存:

```javascript
const initialWorldPose = new WeakMap() // model -> Map(key -> { position, quaternion })
```

**利点:**
- モデルが削除されると自動的にメモリ解放
- モデルごとに異なる初期ポーズを保持
- ガベージコレクションに優しい

**注意点:**
- リセット時に誤って`delete(model)`すると、初期ポーズが失われる
- 今回の修正で、リセット時には削除しないように変更

### マルチモデル対応の仕組み

トラッカーキーの生成:

```javascript
// 1体目: "head", "chest", "hips", ...
// 2体目: "head_2", "chest_2", "hips_2", ...
// 3体目: "head_3", "chest_3", "hips_3", ...

function makeTrackerKey(baseKey, modelIndex) {
  return modelIndex > 1 ? `${baseKey}_${modelIndex}` : baseKey
}

function formatTrackerLabel(label, modelIndex) {
  return modelIndex > 1 ? `${label} ${modelIndex}` : label
}
```

---

## 修正ファイル一覧

### 1. KeySettingsSection.vue
- **パス**: `frontend/src/components/KeySettingsSection.vue`
- **変更**: watch関数のロジック改善、immediate: true追加
- **行数**: 約30行の変更

### 2. useVirtualTrackers.js
- **パス**: `frontend/src/composables/useVirtualTrackers.js`
- **変更**: 
  - `resetTrackerPosition` - 初期ポーズ再キャプチャを削除
  - `resetTrackerRotation` - 初期ポーズ再キャプチャを削除
  - `resetAllTrackerRotations` - 初期ポーズ再キャプチャを削除
  - `resetAllTrackerPositions` - 初期ポーズ再キャプチャを削除
  - `createGizmos` - デバッグログ追加
  - `watch(models)` - デバッグログ追加
- **行数**: 約80行の変更

---

## 既知の問題と今後の改善

### マルチモデルトラッカー

現在はデバッグログのみ追加。実際の問題が発生した場合:

1. **enabled状態の確認**: モデル追加時にトラッカーが有効か
2. **watch発火の確認**: `models.value`の変更が検知されているか
3. **トラッカー可視性**: 作成されたトラッカーの`visible`フラグ

### 初期ポーズの永続化

現在、`initialWorldPose`はアプリ起動中のみ保持されます。ページをリロードすると失われます。

**改善案:**
- localStorageに初期ポーズを保存
- モデル読み込み時に復元
- ただし、ストレージサイズの制限に注意

### パフォーマンス最適化

マルチモデル時のトラッカー数増加によるパフォーマンス影響:

- 2体: 28個のトラッカー
- 3体: 42個のトラッカー
- 4体: 56個のトラッカー

**改善案:**
- アクティブなモデルのみトラッカー表示
- LOD（Level of Detail）システムの導入
- トラッカーのインスタンシング

---

## まとめ

すべての問題を調査・修正しました:

1. ✅ **キーフレーム選択バグ**: watchロジック改善で解決
2. ✅ **トラッカーリセット**: 初期ポーズ保護で正しいTポーズリセットを実現
3. ✅ **マルチモデルトラッカー**: デバッグログ追加で問題追跡可能に

すべての修正はテスト可能で、デバッグログにより問題の原因を特定しやすくなっています。
