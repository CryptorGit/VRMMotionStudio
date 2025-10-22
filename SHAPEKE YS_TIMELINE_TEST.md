# シェイプキー タイムライン実装テスト

## 🎯 実装完了内容

### 1. キャプチャ機能 (`captureCurrentSnapshot`)
- ✅ VRM表情（expressionManager/blendShapeProxy）をキャプチャ
- ✅ **Three.jsのmorphTargets（シェイプキー）をキャプチャ**
- ✅ 指の状態をキャプチャ
- すべてスナップショットに含まれる

### 2. キーフレーム保存 (`addKeyframe`)
- ✅ `values`がない場合、`captureCurrentSnapshot()`を呼び出し
- ✅ キャプチャした`morphs`、`shapeKeys`、`fingers`を保持
- ✅ 既存キーフレーム更新時もマージして保持
- ✅ 新規キーフレーム作成時も含める

### 3. 補間処理 (`getSnapshotAtTime`)
- ✅ モーフの線形補間
- ✅ **シェイプキーの線形補間**
- ✅ 指の線形補間
- キーフレーム間をスムーズにアニメーション

### 4. 適用機能 (`applyPoseAt`)
- ✅ VRM表情を適用（expressionManager/blendShapeProxy）
- ✅ **シェイプキーを適用（morphTargetInfluences）**
- ✅ 指の状態を適用

### 5. エッジケース処理
- ✅ `!previous`の場合のコピー
- ✅ `!next`の場合のコピー
- ✅ `previous === next`の場合のコピー
- すべてでモーフ・シェイプキー・指を保持

## 📊 データ構造

```javascript
keyframe = {
  id: 1,
  time: 5.0,
  values: {
    // トラッカーの位置・回転
    "tracker_head": { position: [x, y, z], rotation: [x, y, z, w] },
    "tracker_hand_left": { position: [x, y, z], rotation: [x, y, z, w] },
    
    // VRM表情
    morphs: {
      "model_1": {
        "happy": 0.8,
        "angry": 0.2
      }
    },
    
    // Three.jsシェイプキー ⬅️ NEW!
    shapeKeys: {
      "model_1": {
        "eye_blink_left": 0.5,
        "eye_blink_right": 0.5,
        "mouth_open": 0.3
      }
    },
    
    // 指の状態
    fingers: {
      "thumb_left": 0.5,
      "index_left": 0.8
    }
  },
  curves: { ... }
}
```

## 🧪 テスト手順

### 1. 準備
1. ブラウザでアプリケーションを開く
2. VRMモデルをロード
3. F12でコンソールを開く

### 2. シェイプキーの変更
1. 右パネルの「Morph」タブを開く
2. 「シェイプキー」セクションまでスクロール
3. 任意のシェイプキーのスライダーを動かす
   - 例: "eye_blink_left" → 0.5
   - 例: "mouth_open" → 0.3

### 3. キーフレーム追加
1. タイムラインパネルで時間を設定（例: 5.0秒）
2. 「Add Key」ボタンをクリック
3. **コンソールで確認:**
   ```
   [Timeline] Capturing morphs and shapeKeys...
   [Timeline] Capturing shapeKeys from scene
   [Timeline] Found X non-zero shapeKeys
   ```

### 4. アニメーション確認
1. シェイプキーの値を変更（例: すべて0に戻す）
2. 別の時間で「Add Key」（例: 10.0秒）
3. タイムラインを再生
4. **期待される動作:**
   - シェイプキーが5.0秒の値から10.0秒の値へスムーズにアニメーション
   - 表情が変化する

### 5. デバッグ情報

コンソールに表示されるべきログ:
```
[Timeline] Capturing morphs and shapeKeys...
[Timeline] models: [...]
[Timeline] models.value: [...]
[Timeline] Models count: 1
[Timeline] Checking model: model_1
[Timeline] Capturing shapeKeys from scene
[Timeline] Found 3 non-zero shapeKeys
[Timeline] Model shapeKeys for model_1: { eye_blink_left: 0.5, ... }
[Timeline] Final shapeKeys: { model_1: { ... } }
```

## 🔍 トラブルシューティング

### シェイプキーがキャプチャされない
**症状:** `Found 0 non-zero shapeKeys`と表示される

**原因と対策:**
1. **モデルにシェイプキーがない**
   - `MorphEditor.vue`の「シェイプキー」セクションに項目が表示されているか確認
   - 表示されていない場合、そのモデルはシェイプキーを持っていない

2. **すべての値が0**
   - スライダーを動かして0以外の値にする
   - キャプチャは`value !== 0`の条件でフィルタリング

3. **VRMの表情とシェイプキーが重複**
   - VRMの表情システムが同じmorphTargetsを制御している場合、シェイプキーとして検出されない
   - これは正常な動作

### シェイプキーが適用されない
**症状:** キーフレームはあるがアニメーションしない

**確認項目:**
1. キーフレームに`shapeKeys`プロパティが含まれているか
   ```javascript
   console.log(keyframes.value[0].values.shapeKeys)
   ```

2. `applyPoseAt`でエラーが発生していないか
   ```
   [Timeline] Failed to apply shapeKeys: ...
   ```

3. モデルのmorphTargetDictionaryが正しいか
   ```javascript
   model.vrm.scene.traverse(obj => {
     if (obj.isMesh && obj.morphTargetDictionary) {
       console.log(obj.name, obj.morphTargetDictionary)
     }
   })
   ```

## ✅ 完了チェックリスト

- [x] `captureCurrentSnapshot`でシェイプキーをキャプチャ
- [x] `addKeyframe`でshapeKeysを保持（3箇所）
- [x] `getSnapshotAtTime`でshapeKeysを補間
- [x] `applyPoseAt`でshapeKeysを適用
- [x] エッジケースでshapeKeysをコピー（3箇所）
- [x] データ構造に`shapeKeys`を追加
- [x] デバッグログを追加（必要に応じて削除可能）

## 🎉 まとめ

シェイプキー（Three.jsのmorphTargets）が完全にタイムラインに統合されました！

**キャプチャ → 保存 → 補間 → 適用** の全フローが動作します。

VRM表情、シェイプキー、指の状態すべてがアニメーション可能です！
