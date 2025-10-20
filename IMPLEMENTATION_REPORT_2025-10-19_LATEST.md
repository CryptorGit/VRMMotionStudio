# Implementation Report: Virtual Tracker Improvements - 2025-10-19 (Latest)

## 概要

以下の改善を実装しました：

1. ✅ **Enable Trackers ON時の自動トラッカー追加**: モデルをインポート時にトラッカーがONなら自動で追加
2. ✅ **ルートトラッカーの追加**: すべてのバーチャルトラッカーの親トラッカーとして機能
3. ✅ **Thumbの回転軸をY+に変更**: 現在Z+になっているのをY+に修正
4. ✅ **追加モデルのIK適用**: 2つ目以降のモデルにもバーチャルトラッカーのIKを適用

## 実装内容

### 1. Enable Trackers ON時の自動トラッカー追加

**変更ファイル**: `frontend/src/composables/useVirtualTrackers.js`

モデル数が変化した際に、`enabled.value`がtrueなら自動的にトラッカーを再作成するように修正しました。

```javascript
// watch(models)内の改善
else if (currentCount !== previousCount && currentCount > 0) {
  // トラッカーが有効な場合、自動的に再作成
  if (enabled.value) {
    console.log(`[watch(models)] Model count changed, recreating trackers automatically...`)
    createGizmos()
    setTimeout(() => {
      layoutDefaultPositions({ force: false })
    }, 100)
  }
}
```

### 2. ルートトラッカーの追加

**変更ファイル**: `frontend/src/composables/useVirtualTrackers.js`

#### TRACKER_DEFSに追加
```javascript
export const TRACKER_DEFS = [
  { key: 'root', label: 'Root', color: 0xffffff, isRoot: true },  // 白色の四角形
  // ... 既存のトラッカー定義
]
```

#### createGizmos()関数の修正
- ルートトラッカーは1つだけ作成（モデル数に依存しない）
- 四角形のワイヤーフレームジオメトリを使用
- 初期位置は(0, 0, 0)
- 通常のトラッカーはモデルごとに作成（ルートを除く）

#### 期待される動作（今後の実装）
- ルートトラッカーを移動・回転すると、すべてのトラッカーが連動
- トラッカーの変換はモデルのボーンにも反映される

**注意**: ルートトラッカーの親子関係による連動機能は、追加の実装が必要です。現在はルートトラッカーが表示されるのみです。

### 3. Thumbの回転軸をY+に変更

**変更ファイル**: `frontend/src/components/ThreeViewer.vue`

デフォルトの指の回転軸設定を変更しました：

```javascript
function createDefaultFingerAxisOverrides() {
  const defaults = {}
  for (const key of FINGER_STATE_KEYS) {
    // Thumbはy+、それ以外はz+
    defaults[key] = key.includes('thumb') ? 'y+' : 'z+'
  }
  return defaults
}
```

これにより、親指（Thumb）は初期設定でY+軸回転、その他の指はZ+軸回転になります。

### 4. 追加モデルのIK適用

**変更ファイル**: `frontend/src/composables/useVirtualTrackers.js`

`update()`関数を大幅に改善しました：

#### Before (1つのモデルのみ処理)
```javascript
function update() {
  if (!enabled.value) return
  const model = getActiveModel()  // アクティブモデルのみ
  if (!model?.vrm) return
  // ... モデル1つに対する処理
}
```

#### After (すべてのモデルを処理)
```javascript
function update() {
  if (!enabled.value) return
  const allModels = models?.value || []
  if (!allModels.length) return
  
  // 各モデルにトラッカーを適用
  for (let modelIdx = 0; modelIdx < allModels.length; modelIdx++) {
    const model = allModels[modelIdx]
    if (!model?.vrm || !model.visible) continue
    
    const modelNumber = modelIdx + 1
    updateModelWithTrackers(model, modelNumber)
  }
}

function updateModelWithTrackers(model, modelNumber) {
  const getTrackerKey = (baseKey) => makeTrackerKey(baseKey, modelNumber)
  
  // 各トラッカーをモデル番号に応じたキーで取得
  // 例: getTrackerKey('head') → 'head' (model 1) or 'head@2' (model 2)
  
  // ... すべてのIK処理に対してモデル固有のトラッカーキーを使用
}
```

すべてのトラッカーキー参照を`getTrackerKey()`を使用するように更新し、各モデルに対応するトラッカーを正しく取得できるようにしました。

## テスト方法

1. **Enable Trackers ON時の自動追加**:
   - モデルを1つ読み込む
   - Virtual Trackersを有効化
   - 2つ目のモデルを読み込む
   - → トラッカーが自動的に追加されることを確認

2. **ルートトラッカー**:
   - トラッカーを有効化
   - 白い四角形のワイヤーフレームが(0,0,0)に表示されることを確認

3. **Thumbの回転軸**:
   - Finger Controlセクションを開く
   - 左右の親指の回転軸が"Y+"になっていることを確認
   - 他の指は"Z+"のままであることを確認

4. **追加モデルのIK**:
   - 2つのモデルを読み込む
   - トラッカーを有効化
   - 各モデルに対応するトラッカーを動かす
   - → それぞれのモデルのボーンが正しく動くことを確認

## 既知の制限事項

1. **ルートトラッカーの連動機能**: ルートトラッカーを動かしても、他のトラッカーは連動しません。この機能を実装するには、`update()`関数内でルートトラッカーの変換を子トラッカーに適用する追加ロジックが必要です。

2. **パフォーマンス**: 複数モデル×複数トラッカーの処理により、パフォーマンスへの影響が予想されます。必要に応じて最適化が必要です。

## 次のステップ

ルートトラッカーの完全な実装には、以下が必要です：

1. ルートトラッカーの変換監視
2. 相対位置・回転の計算と保存
3. 子トラッカーへの変換適用
4. モデルボーンへの反映

これらは別のPRで実装することを推奨します。
