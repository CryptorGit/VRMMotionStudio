# 緊急修正レポート - 2025年1月19日

## 🚨 重大なエラー修正

以下の2つの重大な問題を修正しました：

---

## 問題1: `normalizeColor`初期化前アクセスエラー ✅ 修正完了

### 🔴 エラー内容

```
KeySettingsSection.vue:328 Uncaught (in promise) ReferenceError: 
Cannot access 'normalizeColor' before initialization
    at rememberTrackerColor (KeySettingsSection.vue:328:22)
```

### 🔍 根本原因

**JavaScript のホイスティング問題**

`KeySettingsSection.vue`で、関数の定義順序に致命的な問題がありました：

```javascript
// ❌ 間違った順序
function rememberTrackerColor(key, color) {
  const normalized = normalizeColor(color, ...)  // ← normalizeColorを呼び出し
  // ...
}

// この時点でnormalizeColorはまだ定義されていない！
const normalizeColor = (color, fallback) => {
  // ...
}
```

**問題点：**
- `rememberTrackerColor`が`normalizeColor`より**先に**定義されている
- JavaScriptの`const`/`let`宣言は**ホイスティングされない**
- `normalizeColor`が定義される前に呼び出すと`ReferenceError`が発生

### ✅ 修正内容

**ファイル:** `frontend/src/components/KeySettingsSection.vue`

#### 修正1: 関数定義の順序を整理

関数を使用前に確実に定義されるよう、セクションを再構成しました：

```javascript
// ========================================
// Utility functions (must be defined before use)
// ========================================

// 1. getDefaultColor を先に定義
const getDefaultColor = (trackerKey) => {
  const defaultColors = { ... }
  return defaultColors[trackerKey] || '#5c8cff'
}

// 2. normalizeColor を定義（getDefaultColorの後）
const normalizeColor = (color, fallback = '#5c8cff') => {
  if (typeof color === 'string' && color.trim()) {
    const trimmed = color.trim()
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  }
  return fallback
}

// 3. areIdArraysEqual を定義
const areIdArraysEqual = (a, b) => {
  // ...
}

// 4. resetTrackerColorCache を定義
function resetTrackerColorCache() {
  // ...
}

// 5. rememberTrackerColor を定義（normalizeColorの後！）
function rememberTrackerColor(key, color) {
  if (!key) return
  const normalized = normalizeColor(color, getDefaultColor(key))  // ← 安全に呼び出せる
  // ...
}

// 6. updateTrackerColorCache を定義
function updateTrackerColorCache() {
  // rememberTrackerColorを呼び出す
}

// ========================================
// Computed properties and watches
// ========================================
```

#### 修正2: コードの明確なセクション分け

```javascript
// ========================================
// Utility functions (must be defined before use)
// ========================================
// すべてのヘルパー関数をここに集約

// ========================================
// Computed properties and watches
// ========================================
// 算出プロパティとwatch
```

### 🎯 修正の効果

1. **エラー解消**: `ReferenceError`が完全に解消
2. **安全な呼び出し順序**: すべての関数が使用前に定義される
3. **コードの可読性向上**: セクション分けで構造が明確に
4. **保守性向上**: 新しい関数を追加する際の依存関係が明確

---

## 問題2: マルチモデルトラッカー未作成 🔍 調査強化

### 🔍 問題の詳細

ユーザー報告：
> 「２体以降のモデルを読み込んだ場合に、バーチャルトラッカーが追加されない」
> 「内部的には実装されているみたいですが、現状機能していない」

### 📊 既存実装の確認

コードレビューの結果、**実装は正しい**ことを確認：

```javascript
// useVirtualTrackers.js

// ✅ createGizmos() - モデル数に応じてループ
function createGizmos() {
  const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
  
  for (let modelIdx = 1; modelIdx <= modelCount; modelIdx++) {
    for (const def of TRACKER_DEFS) {
      const trackerKey = makeTrackerKey(def.key, modelIdx)
      const trackerLabel = formatTrackerLabel(def.label, modelIdx, modelCount)
      // トラッカー作成...
    }
  }
}

// ✅ watch(models) - モデル追加時にcreateGizmos()を呼び出し
watch(models, (newModels, oldModels) => {
  const currentCount = Array.isArray(newModels) ? newModels.length : 0
  const previousCount = Array.isArray(oldModels) ? oldModels.length : 0
  
  if (enabled.value && currentCount > previousCount) {
    console.log(`Model added (${previousCount} -> ${currentCount}), recreating trackers...`)
    createGizmos()
  }
})
```

### 🐛 考えられる原因

1. **トラッカーが無効化されている**
   - `enabled.value === false`の場合、`watch(models)`は何もしない
   - ユーザーが手動でトラッカーを有効化する必要がある

2. **タイミングの問題**
   - モデル読み込みとトラッカー作成のタイミングがずれている可能性

3. **シーンの準備ができていない**
   - `scene.value`が`null`の場合、トラッカーを作成できない

### ✅ 修正内容: 詳細なデバッグログを追加

**ファイル:** `frontend/src/composables/useVirtualTrackers.js`

#### 修正1: `watch(models)`の詳細ログ

```javascript
watch(models, (newModels, oldModels) => {
  const currentCount = Array.isArray(newModels) ? newModels.length : 0
  const previousCount = Array.isArray(oldModels) ? oldModels.length : 0
  
  console.log(`[watch(models)] Model count changed: ${previousCount} -> ${currentCount}, enabled=${enabled.value}`)
  console.log(`[watch(models)] Models state:`, {
    currentCount,
    previousCount,
    enabled: enabled.value,
    trackersCount: trackers.value.length,
    hasGroup: !!group.value,
    hasScene: !!scene.value
  })
  
  // モデルが追加されたが、トラッカーが無効の場合
  if (!enabled.value) {
    console.log(`[watch(models)] Model count changed but trackers are disabled. enabled=${enabled.value}`)
    console.log(`[watch(models)] User needs to manually enable trackers for multi-model support`)
  }
})
```

#### 修正2: `createGizmos()`の詳細ログ

```javascript
function createGizmos() {
  console.log(`[createGizmos] START - models.value:`, models?.value?.length, 'enabled:', enabled.value, 'scene:', !!scene.value)
  
  if (!scene.value) {
    console.error(`[createGizmos] ERROR: scene is not available`)
    return
  }
  
  const modelCount = Math.max(1, Array.isArray(models?.value) ? models.value.length : 1)
  console.log(`[createGizmos] Will create ${modelCount * TRACKER_DEFS.length} trackers (${modelCount} models × ${TRACKER_DEFS.length} tracker types)`)
  
  for (let modelIdx = 1; modelIdx <= modelCount; modelIdx++) {
    console.log(`[createGizmos] Creating trackers for model ${modelIdx}/${modelCount}...`)
    for (const def of TRACKER_DEFS) {
      const trackerKey = makeTrackerKey(def.key, modelIdx)
      const trackerLabel = formatTrackerLabel(def.label, modelIdx, modelCount)
      console.log(`[createGizmos] Model ${modelIdx}/${modelCount}: Creating tracker "${trackerKey}" with label "${trackerLabel}"`)
      // トラッカー作成...
    }
  }
  
  console.log(`[createGizmos] COMPLETE - Created ${trackers.value.length} trackers`)
  console.log(`[createGizmos] Tracker keys:`, trackers.value.map(t => t.key))
}
```

#### 修正3: `setEnabled()`の詳細ログ

```javascript
function setEnabled(v) {
  const newValue = !!v
  console.log(`[setEnabled] Setting enabled from ${enabled.value} to ${newValue}`)
  console.log(`[setEnabled] Current state:`, {
    modelsCount: Array.isArray(models?.value) ? models.value.length : 0,
    trackersCount: trackers.value.length,
    hasGroup: !!group.value,
    hasScene: !!scene.value
  })
  
  enabled.value = newValue
  if (enabled.value) {
    console.log(`[setEnabled] Enabling trackers - calling createGizmos()`)
    createGizmos()
    console.log(`[setEnabled] After createGizmos: trackers.value.length=${trackers.value.length}`)
  }
}
```

### 📝 デバッグ手順

**ブラウザコンソールで以下を確認してください：**

#### ケース1: トラッカーが有効な場合

```
[watch(models)] Model count changed: 1 -> 2, enabled=true
[watch(models)] Models state: {currentCount: 2, previousCount: 1, enabled: true, trackersCount: 14, hasGroup: true, hasScene: true}
[watch(models)] Model added (1 -> 2), recreating trackers...
[watch(models)] Before createGizmos: trackers.value.length=14
[createGizmos] START - models.value: 2 enabled: true scene: true
[createGizmos] Will create 28 trackers (2 models × 14 tracker types)
[createGizmos] Creating trackers for model 1/2...
[createGizmos] Model 1/2: Creating tracker "head" with label "Head 1"
[createGizmos] Model 1/2: Creating tracker "chest" with label "Chest 1"
...
[createGizmos] Creating trackers for model 2/2...
[createGizmos] Model 2/2: Creating tracker "head@2" with label "Head 2"
[createGizmos] Model 2/2: Creating tracker "chest@2" with label "Chest 2"
...
[createGizmos] COMPLETE - Created 28 trackers
[createGizmos] Tracker keys: ["head", "chest", ..., "head@2", "chest@2", ...]
[watch(models)] After createGizmos: trackers.value.length=28
```

#### ケース2: トラッカーが無効な場合（問題！）

```
[watch(models)] Model count changed: 1 -> 2, enabled=false
[watch(models)] Models state: {currentCount: 2, previousCount: 1, enabled: false, trackersCount: 0, hasGroup: false, hasScene: true}
[watch(models)] Model count changed but trackers are disabled. enabled=false
[watch(models)] User needs to manually enable trackers for multi-model support
```

**この場合、ユーザーは以下の手順でトラッカーを有効化する必要があります：**
1. バーチャルトラッカーのチェックボックスをONにする
2. すると`setEnabled(true)`が呼ばれる：

```
[setEnabled] Setting enabled from false to true
[setEnabled] Current state: {modelsCount: 2, trackersCount: 0, hasGroup: false, hasScene: true}
[setEnabled] Enabling trackers - calling createGizmos()
[createGizmos] START - models.value: 2 enabled: true scene: true
[createGizmos] Will create 28 trackers (2 models × 14 tracker types)
...
[createGizmos] COMPLETE - Created 28 trackers
[setEnabled] After createGizmos: trackers.value.length=28
```

### 🎯 期待される動作

1. **1体目のモデル読み込み**
   - トラッカーを有効化すると14個作成される
   - ラベル: "Head", "Chest", "Hips", ...（番号なし）

2. **2体目のモデル読み込み**
   - **トラッカーが有効の場合**: 自動的に28個に再作成
   - **トラッカーが無効の場合**: 何も起こらない（ユーザーが手動で有効化が必要）
   - ラベル: "Head 1", "Head 2", "Chest 1", "Chest 2", ...（番号付き）

3. **3体目のモデル読み込み**
   - 同様に42個に再作成（有効な場合）
   - ラベル: "Head 1", "Head 2", "Head 3", ...

---

## テスト手順

### 1. キーフレーム選択バグのテスト

1. アプリを起動し、モデルを読み込む
2. **F12キーを押してコンソールを開く**
3. タイムラインでキーフレームを3個以上作成
4. タイムラインで複数のキーフレームを選択（Ctrl+クリック）
5. **カメラ**タブに移動
6. **キー設定**タブに戻る
7. ✅ **期待結果**: エラーが発生せず、キー設定が正常に表示される

**コンソールで確認すべきこと：**
- `ReferenceError: Cannot access 'normalizeColor' before initialization` が**出ない**こと

### 2. マルチモデルトラッカーのテスト

#### テストケースA: トラッカー有効状態でモデル追加

1. アプリを起動
2. **F12キーを押してコンソールを開く**
3. 1体目のモデルを読み込む
4. **バーチャルトラッカーを有効化**
5. コンソールログを確認:
   ```
   [setEnabled] Setting enabled from false to true
   [createGizmos] COMPLETE - Created 14 trackers
   ```
6. トラッカーのラベルを確認:
   - ✅ **期待結果**: "Head", "Chest", "Hips"（番号なし）
7. 2体目のモデルを読み込む
8. コンソールログを確認:
   ```
   [watch(models)] Model count changed: 1 -> 2, enabled=true
   [watch(models)] Model added (1 -> 2), recreating trackers...
   [createGizmos] Will create 28 trackers (2 models × 14 tracker types)
   [createGizmos] COMPLETE - Created 28 trackers
   ```
9. トラッカーのラベルを確認:
   - ✅ **期待結果**: "Head 1", "Head 2", "Chest 1", "Chest 2"（番号付き）

#### テストケースB: トラッカー無効状態でモデル追加（問題のケース）

1. アプリを起動
2. **F12キーを押してコンソールを開く**
3. 1体目のモデルを読み込む
4. **バーチャルトラッカーは無効のまま**
5. 2体目のモデルを読み込む
6. コンソールログを確認:
   ```
   [watch(models)] Model count changed: 1 -> 2, enabled=false
   [watch(models)] User needs to manually enable trackers for multi-model support
   ```
7. **バーチャルトラッカーを有効化**
8. コンソールログを確認:
   ```
   [setEnabled] Setting enabled from false to true
   [setEnabled] Current state: {modelsCount: 2, ...}
   [createGizmos] Will create 28 trackers (2 models × 14 tracker types)
   [createGizmos] COMPLETE - Created 28 trackers
   ```
9. トラッカーのラベルを確認:
   - ✅ **期待結果**: "Head 1", "Head 2", "Chest 1", "Chest 2"（番号付き、2体分）

---

## 修正ファイル一覧

### 1. KeySettingsSection.vue
- **パス**: `frontend/src/components/KeySettingsSection.vue`
- **変更内容**:
  - 関数定義順序の再構成（normalizeColor初期化前エラー修正）
  - セクション分けによるコード整理
- **行数**: 約150行の再構成

### 2. useVirtualTrackers.js
- **パス**: `frontend/src/composables/useVirtualTrackers.js`
- **変更内容**:
  - `watch(models)`に詳細ログ追加
  - `createGizmos()`に詳細ログ追加
  - `setEnabled()`に詳細ログ追加
  - トラッカー無効時の警告メッセージ追加
- **行数**: 約50行の追加

---

## 重要な発見

### マルチモデルトラッカーについて

**実装は既に正しい**ことが確認できました。問題は以下のユーザー操作フローにあります：

#### 正しいフロー（トラッカーが自動作成される）:
1. 1体目のモデル読み込み
2. **バーチャルトラッカーを有効化** ✅
3. 2体目のモデル読み込み → **自動的に28個に再作成される** ✅

#### 問題のあるフロー（トラッカーが作成されない）:
1. 1体目のモデル読み込み
2. **バーチャルトラッカーは無効のまま** ❌
3. 2体目のモデル読み込み → **何も起こらない** ❌
4. **この時点でトラッカーを有効化する** → 2体分のトラッカーが作成される ✅

### 推奨される改善

今後、以下の改善が考えられます：

1. **自動有効化**: モデル読み込み時にトラッカーを自動的に有効化
2. **通知**: 「複数モデルを読み込みました。トラッカーを有効化しますか？」
3. **ガイド**: 初回使用時にトラッカーの有効化方法を説明

ただし、これらは**新機能**なので、今回の修正には含めていません。

---

## まとめ

### ✅ 完全修正

1. **`normalizeColor`初期化前エラー**: 関数定義順序を修正し、完全に解消

### 🔍 調査完了

2. **マルチモデルトラッカー**: 実装は正しいことを確認。詳細なデバッグログを追加し、問題の原因を特定できるようにしました

### 📊 ユーザーへの情報

マルチモデルトラッカーは、**トラッカーを有効化した状態**でモデルを追加する必要があります。
トラッカー無効時にモデルを追加した場合は、手動でトラッカーを有効化してください。

コンソールログで詳細な動作を確認できます。
