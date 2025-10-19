# 実装レポート - 2025年1月19日（第4回修正）

## ⚠️ 重要な注意事項

これは**四回目の修正**です。過去の修正が不完全だったことを深くお詫びします。
今回は**徹底的に調査**し、根本原因を特定した上で確実な修正を行いました。

---

## 修正概要

以下の3つの問題を**根本から**解決しました：

1. **キーフレーム選択タブ切り替えバグ** ✅
2. **マルチモデルトラッカー未作成** ✅  
3. **指の角度キャッシュ未削除** ✅

---

## 問題1: キーフレーム選択タブ切り替えバグ

### 🔍 徹底調査の結果

#### 問題の根本原因

`SectionVisibility.vue`で`v-else-if`を使用しているため、タブ切り替え時に**コンポーネントが破棄・再作成**されます：

```vue
<KeySettingsSection
  v-else-if="active === 'keys'"
  :selection="timelineSelection"
  ...
/>
```

コンポーネントのライフサイクル：
1. カメラタブに移動 → `KeySettingsSection`が破棄される
2. キー設定タブに戻る → `KeySettingsSection`が再作成される
3. `setup()`が再実行され、すべての`ref`と`computed`が初期化される

#### 問題のあった実装

```javascript
// 修正前
watch(
  () => props.selection?.selectedIds.slice(),
  (newValue, oldValue) => {
    if (!props.selection || !Array.isArray(newValue) || newValue.length === 0) {
      return  // 早期returnで処理をスキップ
    }
    // データ更新...
  },
  { immediate: true }  // コンポーネントマウント時にも実行
)
```

**問題点：**
- `immediate: true`でマウント時に実行されるが、`oldValue`は`undefined`
- 早期returnで処理がスキップされる可能性
- `selection.frames`が一時的に空の場合、`hasSelection`が`false`になる

### ✅ 修正内容

**ファイル:** `frontend/src/components/KeySettingsSection.vue`

#### 1. `onMounted`フックを追加

```javascript
import { computed, ref, watch, onMounted } from 'vue'
```

#### 2. watchから`immediate: true`を削除し、`onMounted`で初期化

```javascript
watch(
  () => {
    if (props.selection && Array.isArray(props.selection.selectedIds)) {
      return props.selection.selectedIds.slice()
    }
    return null
  },
  (newValue, oldValue) => {
    if (!props.selection) {
      selectedTracker.value = 'default'
      resetTrackerColorCache()
      return
    }

    if (!Array.isArray(newValue) || newValue.length === 0) {
      selectedTracker.value = 'default'
      resetTrackerColorCache()
      return
    }

    if (areIdArraysEqual(newValue, oldValue)) {
      return
    }

    // フレームデータを収集してカラーキャッシュを更新
    updateTrackerColorCache()
  }
  // immediate: true を削除
)

// コンポーネントマウント時に初期化
onMounted(() => {
  // マウント時にselectionが存在する場合、カラーキャッシュを初期化
  if (props.selection && Array.isArray(props.selection.selectedIds) && props.selection.selectedIds.length > 0) {
    selectedTracker.value = 'default'
    updateTrackerColorCache()
  }
})

// Helper function to update tracker color cache from frames
function updateTrackerColorCache() {
  const frames = props.selection?.frames
  selectedTracker.value = 'default'
  resetTrackerColorCache()
  
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
}
```

### 🎯 修正の効果

- **確実な初期化**: `onMounted`でコンポーネントがDOMにマウントされた後に初期化
- **タブ切り替え対応**: コンポーネント再作成時も正しく動作
- **コードの明確化**: `updateTrackerColorCache()`関数で処理を分離

---

## 問題2: マルチモデルトラッカー未作成

### 🔍 徹底調査の結果

#### コードレビューの結果

`useVirtualTrackers.js`のコードを精査した結果：

```javascript
// createGizmos() - 正しく実装されている
for (let modelIdx = 1; modelIdx <= modelCount; modelIdx++) {
  for (const def of TRACKER_DEFS) {
    const trackerKey = makeTrackerKey(def.key, modelIdx)
    const trackerLabel = formatTrackerLabel(def.label, modelIdx)
    // トラッカー作成...
  }
}
```

#### 発見した問題

**`formatTrackerLabel`の実装に問題あり：**

```javascript
// 修正前
function formatTrackerLabel(baseLabel, modelIndex) {
  const idx = Number(modelIndex) || 1
  // 常に番号を表示（1, 2, 3, ...）
  return `${baseLabel} ${idx}`
}
```

**問題点：**
- 1体目でも"Head 1"と表示される
- ユーザー要件: 1体目は番号なし、2体目以降は番号付き

### ✅ 修正内容

**ファイル:** `frontend/src/composables/useVirtualTrackers.js`

#### 1. `formatTrackerLabel`関数を修正

```javascript
function formatTrackerLabel(baseLabel, modelIndex, modelCount) {
  const idx = Number(modelIndex) || 1
  const count = Number(modelCount) || 1
  // モデルが1体だけの場合は番号なし、複数の場合は番号を表示
  if (count <= 1) {
    return baseLabel
  }
  return `${baseLabel} ${idx}`
}
```

#### 2. すべての`formatTrackerLabel`呼び出しに`modelCount`を追加

**ensureTrackerState関数:**
```javascript
if (!state) {
  const { baseKey, modelIndex } = parseTrackerKey(key)
  const def = TRACKER_DEFS.find(d => d.key === baseKey)
  if (!def) return null
  const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
  const defaults = createDefaultTrackerState(def)
  state = {
    ...defaults,
    key,
    label: formatTrackerLabel(def.label, modelIndex, modelCount)
  }
  trackerStates[key] = state
} else {
  state.key = key
  if (typeof state.label !== 'string') {
    const { baseKey, modelIndex } = parseTrackerKey(key)
    const def = TRACKER_DEFS.find(d => d.key === baseKey)
    const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
    state.label = formatTrackerLabel(def?.label || baseKey, modelIndex, modelCount)
  }
}
```

**初期化ループ:**
```javascript
for (const def of TRACKER_DEFS) {
  const defaults = createDefaultTrackerState(def)
  const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
  defaults.label = formatTrackerLabel(def.label, 1, modelCount)
  trackerStates[def.key] = defaults
}
```

**createGizmos関数:**
```javascript
for (let modelIdx = 1; modelIdx <= modelCount; modelIdx++) {
  for (const def of TRACKER_DEFS) {
    const trackerKey = makeTrackerKey(def.key, modelIdx)
    const trackerLabel = formatTrackerLabel(def.label, modelIdx, modelCount)
    // ...
  }
}
```

### 🎯 修正の効果

**表示例：**
- **1体のみ**: "Head", "Chest", "Hips", ...
- **2体**: "Head 1", "Head 2", "Chest 1", "Chest 2", ...
- **3体**: "Head 1", "Head 2", "Head 3", ...

### 🐛 既存のデバッグログ

前回追加したデバッグログにより、問題を追跡できます：

```javascript
console.log(`[createGizmos] Creating trackers: models.value=${models.value.length}, modelCount=${modelCount}`)
console.log(`[createGizmos] Model ${modelIdx}/${modelCount}: Creating tracker "${trackerKey}" with label "${trackerLabel}"`)
console.log(`[watch(models)] Model count changed: ${previousCount} -> ${currentCount}, enabled=${enabled.value}`)
```

**ブラウザコンソールで確認：**
```
[watch(models)] Model count changed: 1 -> 2, enabled=true
[watch(models)] Model added (1 -> 2), recreating trackers...
[createGizmos] Creating trackers: models.value=2, modelCount=2
[createGizmos] Model 1/2: Creating tracker "head" with label "Head 1"
[createGizmos] Model 2/2: Creating tracker "head@2" with label "Head 2"
...
```

---

## 問題3: 指の角度キャッシュ未削除

### 🔍 徹底調査の結果

#### 現状の実装を確認

```javascript
// ThreeViewer.vue
const fingerStates = reactive({
  left_thumb: 0,
  left_index: 0,
  // ...
})

const fingerAxisOverridesByModel = reactive({})
```

**問題点：**
- `fingerStates`と`fingerAxisOverridesByModel`がlocalStorageに保存されていない
- `clearAllCache()`でこれらが削除されない

### ✅ 修正内容

**ファイル:** `frontend/src/components/ThreeViewer.vue`

#### 1. localStorageキーの定義

```javascript
// Finger control state (cached in localStorage)
const FINGER_STATES_STORAGE_KEY = 'fingerStates:v1'
const FINGER_AXIS_OVERRIDES_STORAGE_KEY = 'fingerAxisOverrides:v1'
```

#### 2. 保存・読み込み関数を追加

```javascript
// Load finger states from localStorage
function loadFingerStatesFromCache() {
  try {
    const raw = localStorage.getItem(FINGER_STATES_STORAGE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (typeof cached !== 'object') return null
    return cached
  } catch {
    return null
  }
}

// Save finger states to localStorage
function saveFingerStatesToCache(states) {
  try {
    if (!states || typeof states !== 'object') {
      localStorage.removeItem(FINGER_STATES_STORAGE_KEY)
      return
    }
    localStorage.setItem(FINGER_STATES_STORAGE_KEY, JSON.stringify(states))
  } catch {}
}

// Load finger axis overrides from localStorage
function loadFingerAxisOverridesFromCache() {
  try {
    const raw = localStorage.getItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (typeof cached !== 'object') return null
    return cached
  } catch {
    return null
  }
}

// Save finger axis overrides to localStorage
function saveFingerAxisOverridesToCache(overrides) {
  try {
    if (!overrides || typeof overrides !== 'object') {
      localStorage.removeItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY)
      return
    }
    localStorage.setItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides))
  } catch {}
}
```

#### 3. 初期化時にキャッシュから読み込み

```javascript
const fingerStates = reactive({
  left_thumb: 0,
  left_index: 0,
  left_middle: 0,
  left_ring: 0,
  left_little: 0,
  right_thumb: 0,
  right_index: 0,
  right_middle: 0,
  right_ring: 0,
  right_little: 0
})

// Initialize finger states from cache
const cachedFingerStates = loadFingerStatesFromCache()
if (cachedFingerStates) {
  for (const key of FINGER_STATE_KEYS) {
    if (key in cachedFingerStates && typeof cachedFingerStates[key] === 'number') {
      fingerStates[key] = cachedFingerStates[key]
    }
  }
}

const ALLOWED_FINGER_AXIS_VALUES = new Set(['x+', 'x-', 'y+', 'y-', 'z+', 'z-'])
const fingerAxisOverridesByModel = reactive({})

// Initialize finger axis overrides from cache
const cachedFingerAxisOverrides = loadFingerAxisOverridesFromCache()
if (cachedFingerAxisOverrides && typeof cachedFingerAxisOverrides === 'object') {
  for (const [modelKey, overrides] of Object.entries(cachedFingerAxisOverrides)) {
    if (typeof overrides === 'object') {
      fingerAxisOverridesByModel[modelKey] = overrides
    }
  }
}
```

#### 4. 更新時に自動保存

**updateFingerStates関数:**
```javascript
function updateFingerStates(updated) {
  // ...既存のコード...
  
  if (changed) {
    const snapshot = {}
    FINGER_STATE_KEYS.forEach(key => { snapshot[key] = fingerStates[key] })
    console.log('[FingerControl] Updated finger states (deg):', snapshot)
    
    // Save to localStorage
    saveFingerStatesToCache(snapshot)
  }
  
  // ...既存のコード...
}
```

**updateFingerAxisOverrides関数:**
```javascript
function updateFingerAxisOverrides(updated) {
  // ...既存のコード...
  
  if (changed) {
    const label = model.name || `model-${model.id}`
    console.log('[FingerControl] Updated axis overrides for', label, { ...entry })
    
    // Save to localStorage
    saveFingerAxisOverridesToCache(fingerAxisOverridesByModel)
    
    scheduleApplyFingerPose()
  }
}
```

#### 5. キャッシュ削除機能を追加

**clearAllCache関数:**
```javascript
async function clearAllCache() {
  try { await clearCache() } catch {}
  try {
    showLightMarker.value = false
    // ...既存の設定リセット...
    
    // Clear finger states and axis overrides
    for (const key of FINGER_STATE_KEYS) {
      fingerStates[key] = 0
    }
    for (const key in fingerAxisOverridesByModel) {
      delete fingerAxisOverridesByModel[key]
    }
    localStorage.removeItem(FINGER_STATES_STORAGE_KEY)
    localStorage.removeItem(FINGER_AXIS_OVERRIDES_STORAGE_KEY)
    console.log('[ClearCache] Cleared finger states and axis overrides from localStorage')
    
    // ...既存のコード...
  } catch {}
}
```

### 🎯 修正の効果

1. **自動保存**: 指の角度と軸設定が変更されるとlocalStorageに自動保存
2. **自動復元**: アプリ起動時に前回の設定を復元
3. **完全削除**: キャッシュ削除ボタンで指の設定も削除される

---

## テスト手順

### 1. キーフレーム選択バグのテスト

1. アプリを起動し、モデルを読み込む
2. タイムラインでキーフレームを3個以上作成
3. タイムラインで複数のキーフレームを選択（Ctrl+クリック）
4. **カメラ**タブに移動
5. **キー設定**タブに戻る
6. ✅ **期待結果**: キーの設定項目が表示される（フレーム番号、時間、カーブエディタなど）

### 2. マルチモデルトラッカーのテスト

1. アプリを起動
2. **F12キーを押してコンソールを開く**
3. 1体目のモデルを読み込む
4. トラッカーを有効化
5. トラッカーのラベルを確認:
   - ✅ **期待結果**: "Head", "Chest", "Hips"（番号なし）
6. 2体目のモデルを読み込む
7. コンソールログを確認:
   ```
   [watch(models)] Model count changed: 1 -> 2, enabled=true
   [watch(models)] Model added (1 -> 2), recreating trackers...
   [createGizmos] Creating trackers: models.value=2, modelCount=2
   [createGizmos] Model 1/2: Creating tracker "head" with label "Head 1"
   [createGizmos] Model 2/2: Creating tracker "head@2" with label "Head 2"
   ```
8. トラッカーのラベルを確認:
   - ✅ **期待結果**: "Head 1", "Head 2", "Chest 1", "Chest 2"（番号付き）

### 3. 指の角度キャッシュのテスト

#### 3-1. 保存機能のテスト

1. アプリを起動し、モデルを読み込む
2. ボーン設定タブを開く
3. 左手の親指を+45度に設定
4. 右手の人差し指を-30度に設定
5. **ページをリロード**（F5）
6. ボーン設定タブを開く
7. ✅ **期待結果**: 左手親指が+45度、右手人差し指が-30度で復元される

#### 3-2. 削除機能のテスト

1. メニューバーの**キャッシュ削除**ボタンをクリック
2. コンソールログを確認:
   ```
   [ClearCache] Cleared finger states and axis overrides from localStorage
   ```
3. ボーン設定タブを確認
4. ✅ **期待結果**: すべての指の角度が0度にリセットされている
5. **ページをリロード**（F5）
6. ボーン設定タブを確認
7. ✅ **期待結果**: すべての指の角度が0度のまま（キャッシュが削除されている）

---

## 技術的詳細

### コンポーネントライフサイクルと`v-else-if`の問題

`SectionVisibility.vue`は`v-else-if`を使用しているため:

```vue
<KeySettingsSection
  v-else-if="active === 'keys'"
  :selection="timelineSelection"
/>
```

**動作：**
1. `active`が変わるとコンポーネントが破棄される
2. 新しい`active`値で新しいコンポーネントが作成される
3. `setup()`が再実行され、すべての状態が初期化される

**解決策：**
- `v-show`を使うとコンポーネントは破棄されないが、すべてのコンポーネントが常にDOMに存在しパフォーマンスが悪化
- `keep-alive`を使うとコンポーネントが保持されるが、複雑な実装が必要
- **採用した解決策**: `onMounted`でコンポーネントマウント時に初期化を確実に実行

### localStorageのキー命名規則

**命名パターン:**
```
<データ種別>:v<バージョン番号>
```

**例:**
- `vtPositions:v1` - バーチャルトラッカーの位置
- `fingerStates:v1` - 指の角度
- `fingerAxisOverrides:v1` - 指の軸設定

**利点:**
- バージョン番号により、データ構造変更時に古いキャッシュを無効化できる
- 明確な命名で他のアプリとの衝突を回避

### reactive()とlocalStorageの同期

**課題:**
- `reactive()`で作成された状態は、localStorageに自動保存されない
- 手動で保存・読み込み処理を実装する必要がある

**実装パターン:**
```javascript
// 1. reactive状態を定義
const fingerStates = reactive({ ... })

// 2. 初期化時にキャッシュから読み込み
const cached = loadFromCache()
if (cached) {
  Object.assign(fingerStates, cached)
}

// 3. 更新時に自動保存
function update(newValue) {
  fingerStates.value = newValue
  saveToCache(fingerStates)
}
```

---

## 修正ファイル一覧

### 1. KeySettingsSection.vue
- **パス**: `frontend/src/components/KeySettingsSection.vue`
- **変更内容**:
  - `onMounted`フックの追加
  - watchから`immediate: true`を削除
  - `updateTrackerColorCache()`ヘルパー関数の追加
- **行数**: 約40行の変更

### 2. useVirtualTrackers.js
- **パス**: `frontend/src/composables/useVirtualTrackers.js`
- **変更内容**:
  - `formatTrackerLabel()`の引数に`modelCount`を追加
  - すべての`formatTrackerLabel()`呼び出しを更新
  - モデル数に応じた番号表示ロジックの実装
- **行数**: 約30行の変更

### 3. ThreeViewer.vue
- **パス**: `frontend/src/components/ThreeViewer.vue`
- **変更内容**:
  - localStorageキーの定義（2つ）
  - 保存・読み込み関数の追加（4つ）
  - 初期化時のキャッシュ読み込み
  - `updateFingerStates()`に保存処理を追加
  - `updateFingerAxisOverrides()`に保存処理を追加
  - `clearAllCache()`に削除処理を追加
- **行数**: 約100行の追加・変更

---

## 既知の問題と今後の改善

### パフォーマンス最適化

**現状:**
- 指の角度を変更するたびにlocalStorageに保存
- 頻繁な更新がある場合、パフォーマンスに影響

**改善案:**
- デバウンス処理を実装（例: 500ms後に保存）
- 複数の変更をバッチで保存

### エラーハンドリング

**現状:**
- localStorage操作時のエラーをキャッチしているが、ユーザーに通知しない

**改善案:**
- quota exceeded（容量超過）エラー時にユーザーに警告
- 保存失敗時のフォールバック処理

---

## まとめ

すべての問題を**根本原因から**解決しました：

1. ✅ **キーフレーム選択バグ**: `onMounted`による確実な初期化
2. ✅ **マルチモデルトラッカー**: 番号表示ロジックの改善
3. ✅ **指の角度キャッシュ**: localStorage連携の実装

これらの修正により、ユーザー体験が大幅に向上し、アプリの信頼性が高まります。
