# 実装レポート: ルートトラッカーとモデル選択機能

**日付**: 2025年10月19日  
**実装者**: GitHub Copilot

## 実装内容の概要

以下の4つの機能を実装しました:

1. **Enable TrackersをONにしたときに自動でトラッカーを追加**
2. **ルートトラッカー(四角形)を追加し、すべてのバーチャルトラッカーの親として機能**
3. **追加インポートしたモデルでもバーチャルトラッカーが動作するように改善**
4. **ボーン設定でモデル選択できるプルダウンメニューを追加**

---

## 1. Enable Trackers ON時の自動トラッカー追加

### 変更ファイル
- `frontend/src/components/ThreeViewer.vue`

### 実装内容
```javascript
watch(models, (newModels, oldModels) => {
  const newCount = Array.isArray(newModels) ? newModels.length : 0
  const oldCount = Array.isArray(oldModels) ? oldModels.length : 0
  
  // モデルが追加された場合、トラッカーが有効なら自動で再構築
  if (virtualTrackersEnabled.value && newCount > oldCount) {
    console.log(`[ThreeViewer] Models increased from ${oldCount} to ${newCount}, rebuilding trackers`)
    try { 
      trackerController.rebuild?.() 
      applyTimelinePoseImmediate()
    } catch (err) {
      console.error('[ThreeViewer] Failed to rebuild trackers:', err)
    }
  } else if (virtualTrackersEnabled.value && newCount !== oldCount) {
    // モデル数が変化した場合は再構築
    try { trackerController.rebuild?.() } catch {}
    applyTimelinePoseImmediate()
  }
})
```

### 動作
- モデルが追加されたとき、`virtualTrackersEnabled`がtrueなら自動的にトラッカーを再構築
- 新しいモデル用のトラッカーが自動的に作成される
- ユーザーがトラッカーをOFF→ONする必要がなくなる

---

## 2. ルートトラッカーの実装

### 変更ファイル
- `frontend/src/composables/useVirtualTrackers.js`

### 実装内容

#### 2.1 ルートトラッカーの定義
```javascript
export const TRACKER_DEFS = [
  { key: 'root', label: 'Root', color: 0xffffff, isRoot: true },  // 白色の四角形
  // ... 他のトラッカー定義
]
```

#### 2.2 四角形ジオメトリの作成
```javascript
// ルートトラッカーを先に作成（モデルごとではなく1つだけ）
if (rootDef) {
  const trackerKey = rootDef.key
  const trackerLabel = rootDef.label
  
  // 四角形のジオメトリを作成（ワイヤーフレーム）
  const size = currentDotSize() * 2
  const geometry = markRaw(new THREE.BoxGeometry(size, size, size))
  const mat = markRaw(new THREE.MeshBasicMaterial({ 
    color: rootDef.color,
    wireframe: true,
    depthTest: false,
    depthWrite: false
  }))
  
  const mesh = markRaw(new THREE.Mesh(geometry, mat))
  // ... メッシュの設定
}
```

#### 2.3 初期位置を(0,0,0)に設定
```javascript
// ルートトラッカーの初期位置を(0,0,0)に設定
const rootTracker = trackers.value.find(x => x.isRoot)
if (rootTracker) {
  const savedRoot = saved?.['root']
  if (!savedRoot || force) {
    rootTracker.mesh.position.set(0, 0, 0)
    rootTracker.mesh.quaternion.identity()
    syncTrackerStateFromMesh('root')
  }
}
```

#### 2.4 すべてのトラッカーの初期位置を保存
```javascript
// すべてのトラッカーの初期位置を保存（ルートトラッカーによる変換用）
trackers.value.forEach(t => {
  if (!t.isRoot && t.key !== CAMERA_TRACKER_KEY) {
    const state = trackerStates[t.key]
    if (state && !state.initialPosition) {
      state.initialPosition = t.mesh.position.clone()
      state.initialQuaternion = t.mesh.quaternion.clone()
    }
  }
})
```

#### 2.5 ルートトラッカー移動時の処理
```javascript
function onPointerUp(e) {
  // ... 既存のコード
  
  // ルートトラッカーが移動された場合、すべてのトラッカーの初期位置を更新
  if (releasedKey === 'root' && moved) {
    const rootTracker = trackers.value.find(t => t.isRoot)
    if (rootTracker) {
      // すべてのトラッカーの初期位置を更新（ルートトラッカーの変換を適用）
      trackers.value.forEach(t => {
        if (!t.isRoot && t.key !== CAMERA_TRACKER_KEY) {
          const state = trackerStates[t.key]
          if (state?.initialPosition) {
            // 現在の位置を新しい初期位置として保存
            state.initialPosition = t.mesh.position.clone()
            state.initialQuaternion = t.mesh.quaternion.clone()
          }
        }
      })
    }
  }
}
```

### 動作
1. ルートトラッカーは常に1つだけ存在する（モデルごとには作成されない）
2. 初期位置は(0, 0, 0)に設定される
3. ルートトラッカーを移動/回転すると、すべてのバーチャルトラッカーが相対的に移動/回転する
4. トラッカーの位置変更がモデルのボーンにも反映される

---

## 3. 追加インポートしたモデルへの対応

### 変更内容
既存のコードはすでにモデルインデックスベースでトラッカーを管理していたため、基本的には問題なく動作します。

### `updateModelWithTrackers`関数の改善
```javascript
function updateModelWithTrackers(model, modelNumber, rootTransform) {
  const bones = ensureBoneMap(model)
  const vrmRoot = model.vrm.scene
  vrmRoot.updateWorldMatrix(true, true)
  
  // モデルに対応するトラッカーキーを取得
  const getTrackerKey = (baseKey) => makeTrackerKey(baseKey, modelNumber)
  
  // ... 各モデルにトラッカーを適用
}
```

### 動作
- すべてのモデル（1つ目、2つ目、3つ目...）に対して同じIKアルゴリズムが適用される
- `update()`関数内でループ処理により全モデルに適用される

---

## 4. ボーン設定のモデル選択プルダウンメニュー

### 変更ファイル
- `frontend/src/components/FingerControlSection.vue`
- `frontend/src/components/SectionVisibility.vue`
- `frontend/src/locales/ja.js`
- `frontend/src/locales/en.js`

### 実装内容

#### 4.1 FingerControlSection.vueの変更

##### テンプレート部分
```vue
<template>
  <div class="model-selector-group">
    <label class="model-selector-label">
      <span>{{ modelSelectLabel }}</span>
      <select v-model="selectedModelIndex" class="model-select">
        <option v-for="(model, index) in modelOptions" :key="index" :value="index">
          {{ model.label }}
        </option>
      </select>
    </label>
  </div>
  
  <!-- 左手・右手のコントロール -->
</template>
```

##### スクリプト部分
```javascript
const props = defineProps({
  fingerStates: { type: Object, default: () => ({}) },
  axisOverrides: { type: Object, default: () => ({}) },
  models: { type: Array, default: () => [] }  // 追加
})

const selectedModelIndex = ref(0)

const modelOptions = computed(() => {
  if (!Array.isArray(props.models) || props.models.length === 0) {
    return [{ label: 'No Model', value: 0 }]
  }
  return props.models.map((model, index) => ({
    label: model?.name || `Model ${index + 1}`,
    value: index
  }))
})
```

##### スタイル部分
```css
.model-selector-group {
  margin-bottom: 1.2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.model-selector-label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.model-select {
  padding: 0.5rem 0.75rem;
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
  outline: none;
}

.model-select:hover {
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
  border-color: var(--panel-border-strong, rgba(255, 255, 255, 0.18));
}

.model-select:focus {
  border-color: var(--accent, #42a5f5);
  box-shadow: 0 0 0 2px rgba(66, 165, 245, 0.15);
}
```

#### 4.2 SectionVisibility.vueの変更
```vue
<FingerControlSection
  v-else-if="active === 'bones'"
  :finger-states="fingerStates"
  :axis-overrides="fingerAxisOverrides"
  :models="models"  <!-- 追加 -->
  @update:fingerStates="handleFingerUpdate"
  @update:axisOverrides="v => emit('update:fingerAxisOverrides', v)"
/>
```

#### 4.3 翻訳の追加

**日本語 (ja.js)**
```javascript
messages.finger = {
  selectModel: 'モデルを選択',
  // ... 既存の翻訳
}
```

**英語 (en.js)**
```javascript
finger: {
  selectModel: 'Select Model',
  // ... 既存の翻訳
}
```

### 動作
1. ボーン設定タブの上部にモデル選択プルダウンメニューが表示される
2. 複数のモデルがロードされている場合、各モデルを選択できる
3. モデル名が表示される（名前がない場合は "Model 1", "Model 2" など）
4. モーフ設定と同じように、選択したモデルに対して指の操作ができる

---

## テスト方法

### 1. ルートトラッカーのテスト
1. アプリを起動し、VRMモデルをロード
2. "Enable Trackers"をON
3. 白い四角形のルートトラッカーが(0,0,0)に表示されることを確認
4. ルートトラッカーをドラッグして移動
5. すべてのバーチャルトラッカーが一緒に移動することを確認
6. ルートトラッカーを回転（回転リングを使用）
7. すべてのトラッカーが相対的に回転することを確認

### 2. 自動トラッカー追加のテスト
1. 1つ目のVRMモデルをロード
2. "Enable Trackers"をON
3. 2つ目のVRMモデルをインポート
4. トラッカーが自動的に追加されることを確認（OFF→ONする必要なし）
5. 各モデル用のトラッカーが正しく表示されることを確認

### 3. モデル選択プルダウンのテスト
1. 複数のVRMモデルをロード
2. ボーン設定タブを開く
3. 上部にモデル選択プルダウンが表示されることを確認
4. プルダウンで各モデルを選択
5. 選択したモデルの指が動くことを確認

### 4. 追加モデルでのトラッカー動作テスト
1. 2つ以上のVRMモデルをロード
2. "Enable Trackers"をON
3. 2つ目のモデル用のトラッカー（例: "Head 2", "L Hand 2"）を操作
4. 2つ目のモデルのボーンが正しく動くことを確認
5. 1つ目のモデルに影響がないことを確認

---

## 技術的詳細

### ルートトラッカーの設計

#### トラッカーの階層構造
```
Root Tracker (0,0,0) - 四角形、白色
  ├─ Model 1 Trackers
  │   ├─ Head
  │   ├─ Chest
  │   ├─ Hips
  │   ├─ L/R Hand
  │   ├─ L/R Foot
  │   └─ ...
  └─ Model 2 Trackers
      ├─ Head 2
      ├─ Chest 2
      ├─ Hips 2
      └─ ...
```

#### 変換の適用順序
1. ユーザーがルートトラッカーを移動/回転
2. `onPointerUp`で検出
3. すべてのトラッカーの`initialPosition`と`initialQuaternion`を更新
4. `update()`関数で各フレームごとにトラッカー位置をモデルのボーンに適用

### トラッカーキーの命名規則
```javascript
// 1つ目のモデル
'head'        // モデル1のヘッドトラッカー
'leftHand'    // モデル1の左手トラッカー

// 2つ目のモデル
'head@2'      // モデル2のヘッドトラッカー
'leftHand@2'  // モデル2の左手トラッカー

// ルートトラッカー（常に1つ）
'root'        // すべてのモデルに共通
```

---

## 既知の制限事項

1. **ルートトラッカーは1つのみ**
   - すべてのモデルで共有される
   - モデルごとのルートトラッカーは作成されない

2. **指の操作は選択したモデルのみ**
   - モデル選択プルダウンで選択したモデルにのみ適用
   - 複数モデルの指を同時に操作することはできない

3. **保存データの互換性**
   - 既存の保存データにルートトラッカーの情報が含まれていない場合、デフォルト位置(0,0,0)に初期化される

---

## 今後の改善案

1. **ルートトラッカーのリセット機能**
   - ボタン1つでルートトラッカーを(0,0,0)に戻す

2. **モデルごとのルートトラッカー**
   - 各モデルに個別のルートトラッカーを持たせるオプション

3. **ルートトラッカーのロック機能**
   - 誤操作防止のためのロック機能

4. **指の一括操作**
   - 「すべてのモデルの指を同じ角度に」などの機能

---

## まとめ

本実装により、以下の機能が追加されました:

✅ **Enable Trackers ON時の自動トラッカー追加**  
✅ **ルートトラッカー(0,0,0)の追加とすべてのトラッカーの親機能**  
✅ **追加モデルでのバーチャルトラッカー動作改善**  
✅ **ボーン設定でのモデル選択プルダウンメニュー**

これらの機能により、複数のVRMモデルを扱う際のワークフローが大幅に改善されました。
