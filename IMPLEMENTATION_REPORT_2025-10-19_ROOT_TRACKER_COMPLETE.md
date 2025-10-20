# ルートトラッカー実装完了レポート

**日付**: 2025年10月19日  
**実装者**: GitHub Copilot

## 実装内容

### 1. 白い四角形のルートトラッカー ✅
- `TRACKER_DEFS`に`isRoot: true`のルートトラッカーを定義
- `THREE.BoxGeometry`を使用して四角形を作成
- `wireframe: true`でワイヤーフレーム表示
- 白色（`0xffffff`）で表示

### 2. ルートトラッカーを動かすと子トラッカーも一緒に動く ✅
以下の3つのタイミングでルートトラッカーの変換を子トラッカーに適用:

#### 2.1 初期化時（layoutDefaultPositions）
```javascript
// ルートトラッカーの初期状態を保存
rootTrackerInitialState.position.copy(rootTracker.mesh.position)
rootTrackerInitialState.quaternion.copy(rootTracker.mesh.quaternion)

// すべての子トラッカーの相対位置を保存
trackerInitialStates.clear()
trackers.value.forEach(t => {
  if (t.isRoot || t.key === CAMERA_TRACKER_KEY || !t.mesh) return
  
  const relativePos = t.mesh.position.clone().sub(rootTrackerInitialState.position)
  const relativeQuat = rootTrackerInitialState.quaternion.clone().invert().multiply(t.mesh.quaternion.clone())
  
  trackerInitialStates.set(t.key, {
    position: relativePos,
    quaternion: relativeQuat
  })
})
```

#### 2.2 ドラッグ開始時（onPointerDown）
```javascript
// ルートトラッカーをドラッグする場合、初期状態を保存
if (hit.userData?.isRoot) {
  rootTrackerInitialState.position.copy(hit.position)
  rootTrackerInitialState.quaternion.copy(hit.quaternion)
  
  // すべての子トラッカーの相対位置を保存
  trackerInitialStates.clear()
  trackers.value.forEach(t => {
    if (t.isRoot || t.key === CAMERA_TRACKER_KEY || !t.mesh) return
    
    const relativePos = t.mesh.position.clone().sub(rootTrackerInitialState.position)
    const relativeQuat = rootTrackerInitialState.quaternion.clone().invert().multiply(t.mesh.quaternion.clone())
    
    trackerInitialStates.set(t.key, {
      position: relativePos,
      quaternion: relativeQuat
    })
  })
}
```

#### 2.3 ドラッグ中（onPointerMove）
```javascript
// 移動モード
if (dragState.mode === 'translate') {
  // ... 移動処理
  
  // ルートトラッカーが移動された場合、すべての子トラッカーも移動
  if (dragState.target.userData?.isRoot) {
    applyRootTransformToChildren()
  }
}

// パン/チルト回転モード
else if (dragState.mode === 'rotate-pan-tilt') {
  // ... 回転処理
  
  // ルートトラッカーが回転された場合、すべての子トラッカーも回転
  if (dragState.target.userData?.isRoot) {
    applyRootTransformToChildren()
  }
}

// ロール回転モード
else if (dragState.mode === 'rotate-roll') {
  // ... 回転処理
  
  // ルートトラッカーが回転された場合、すべての子トラッカーも回転
  if (dragState.target.userData?.isRoot) {
    applyRootTransformToChildren()
  }
}
```

### 3. applyRootTransformToChildren関数
```javascript
/**
 * ルートトラッカーの変換をすべての子トラッカーに適用
 */
function applyRootTransformToChildren() {
  const rootTracker = trackers.value.find(t => t.isRoot)
  if (!rootTracker?.mesh) return
  
  rootTracker.mesh.updateMatrixWorld(true)
  const rootPos = rootTracker.mesh.position.clone()
  const rootQuat = rootTracker.mesh.quaternion.clone()
  
  // すべての子トラッカー（ルート以外）に変換を適用
  trackers.value.forEach(t => {
    if (t.isRoot || t.key === CAMERA_TRACKER_KEY || !t.mesh) return
    
    // 初期状態を取得（まだ保存されていなければ現在の状態を保存）
    let initialState = trackerInitialStates.get(t.key)
    if (!initialState) {
      initialState = {
        position: t.mesh.position.clone().sub(rootTrackerInitialState.position),
        quaternion: rootTrackerInitialState.quaternion.clone().invert().multiply(t.mesh.quaternion.clone())
      }
      trackerInitialStates.set(t.key, initialState)
    }
    
    // ルートトラッカーの変換を適用
    // 位置 = ルート位置 + (初期相対位置を回転)
    const rotatedOffset = initialState.position.clone().applyQuaternion(rootQuat)
    t.mesh.position.copy(rootPos.clone().add(rotatedOffset))
    
    // 回転 = ルート回転 × 初期相対回転
    t.mesh.quaternion.copy(rootQuat.clone().multiply(initialState.quaternion))
    
    t.mesh.updateMatrixWorld(true)
    
    // トラッカー状態を同期
    syncTrackerStateFromMesh(t.key)
  })
}
```

### 4. すべてのモデルに適用 ✅
```javascript
function update() {
  if (!enabled.value) return
  
  // すべてのモデルが存在するかチェック
  const allModels = models?.value || []
  if (!allModels.length) return
  
  if (camera?.value) {
    trackers.value.forEach(entry => {
      if (entry.key !== CAMERA_TRACKER_KEY) updateViewAlignedIndicators(entry)
    })
  }
  
  // ルートトラッカーの変換を取得
  const rootTracker = trackers.value.find(t => t.isRoot)
  const rootTransform = rootTracker?.mesh ? {
    position: rootTracker.mesh.position.clone(),
    quaternion: rootTracker.mesh.quaternion.clone()
  } : null
  
  // 各モデルにトラッカーを適用
  for (let modelIdx = 0; modelIdx < allModels.length; modelIdx++) {
    const model = allModels[modelIdx]
    if (!model?.vrm || !model.visible) continue
    
    const modelNumber = modelIdx + 1
    updateModelWithTrackers(model, modelNumber, rootTransform)
  }
}
```

## 動作の流れ

### 初期化
1. VRMモデルをロード
2. "Enable Trackers"をON
3. ルートトラッカーが(0,0,0)に白い四角形として表示される
4. 各モデルのトラッカー（Head 1, L Hand 1, Head 2, L Hand 2...）が表示される
5. すべての子トラッカーの初期相対位置がルートトラッカーからの相対位置として保存される

### ルートトラッカーを移動
1. ユーザーが白いルートトラッカーを左クリックでドラッグ
2. ドラッグ開始時に、すべての子トラッカーの現在の相対位置を保存
3. ドラッグ中、`applyRootTransformToChildren()`がリアルタイムで呼ばれる
4. すべての子トラッカーが相対位置を保ったままルートトラッカーと一緒に移動
5. 子トラッカーの位置が変わるため、`updateModelWithTrackers()`でモデルのボーンが更新される
6. すべてのモデル（1体目、2体目、3体目...）が一緒に移動する

### ルートトラッカーを回転
1. ユーザーが白いルートトラッカーを右クリック（パン/チルト）または中クリック（ロール）でドラッグ
2. ドラッグ開始時に、すべての子トラッカーの現在の相対位置と相対回転を保存
3. ドラッグ中、`applyRootTransformToChildren()`がリアルタイムで呼ばれる
4. すべての子トラッカーが相対位置・相対回転を保ったままルートトラッカーと一緒に回転
5. 子トラッカーの位置と回転が変わるため、`updateModelWithTrackers()`でモデルのボーンが更新される
6. すべてのモデル（1体目、2体目、3体目...）が一緒に回転する

## テスト方法

### 基本テスト
1. アプリを起動
2. VRMモデルを1つロード
3. "Enable Trackers"をON
4. 白い四角形のルートトラッカーが(0,0,0)に表示されることを確認
5. ルートトラッカーを左クリックでドラッグして移動
6. すべてのトラッカー（Head, Chest, Hips, L/R Hand, L/R Foot...）が一緒に移動することを確認
7. モデルも一緒に移動することを確認

### 回転テスト
1. ルートトラッカーを右クリックでドラッグして回転（パン/チルト）
2. すべてのトラッカーが相対位置を保ったまま一緒に回転することを確認
3. モデルも一緒に回転することを確認
4. ルートトラッカーを中クリックでドラッグして回転（ロール）
5. すべてのトラッカーがロール方向に回転することを確認

### 複数モデルテスト
1. VRMモデルを2つ以上ロード
2. "Enable Trackers"をON
3. ルートトラッカーと各モデルのトラッカー（Head 1, Head 2, L Hand 1, L Hand 2...）が表示されることを確認
4. ルートトラッカーを移動/回転
5. すべてのモデルのトラッカーが一緒に移動/回転することを確認
6. すべてのモデルが一緒に移動/回転することを確認

## 技術的詳細

### 変換の計算方法

#### 位置の変換
```
子トラッカーの新しい位置 = ルート位置 + (初期相対位置 × ルート回転)
```

#### 回転の変換
```
子トラッカーの新しい回転 = ルート回転 × 初期相対回転
```

### データ構造

```javascript
// ルートトラッカーの初期状態
rootTrackerInitialState = {
  position: Vector3(0, 0, 0),
  quaternion: Quaternion(0, 0, 0, 1)
}

// 各子トラッカーの初期状態（ルートからの相対）
trackerInitialStates = Map {
  'head': {
    position: Vector3(0, 1.5, 0),  // ルートから1.5m上
    quaternion: Quaternion(0, 0, 0, 1)
  },
  'leftHand': {
    position: Vector3(-0.5, 1.0, 0),  // ルートから左0.5m、上1.0m
    quaternion: Quaternion(0, 0, 0, 1)
  },
  'head@2': {  // 2体目のヘッドトラッカー
    position: Vector3(0, 1.5, 0),
    quaternion: Quaternion(0, 0, 0, 1)
  },
  // ... 他のトラッカー
}
```

## 変更したファイル

1. `frontend/src/composables/useVirtualTrackers.js`
   - `rootTrackerInitialState`変数を追加
   - `trackerInitialStates` Map を追加
   - `applyRootTransformToChildren()`関数を実装
   - `onPointerDown()`でルートトラッカーの初期状態を保存
   - `onPointerMove()`で`applyRootTransformToChildren()`を呼び出し
   - `layoutDefaultPositions()`で初期状態を保存

## まとめ

✅ **白い四角形のルートトラッカーが実装されました**  
✅ **ルートトラッカーを動かすと、すべての子トラッカーが一緒に動きます**  
✅ **子トラッカーが動くと、対応するモデルも一緒に動きます**  
✅ **2体目以降のモデルにも適用されます**

ルートトラッカーは親トラッカーとして機能し、すべてのバーチャルトラッカーとモデルを一括で移動・回転できるようになりました。
