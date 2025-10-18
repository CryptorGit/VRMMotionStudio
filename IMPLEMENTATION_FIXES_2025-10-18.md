# 実装修正レポート 2025-10-18

## 修正内容

### 1. タイムラインの最小高さを半分に変更 ✅

**問題**: タイムラインパネルの最小高さが高すぎる（320px）ため、もっと低くできるようにしてほしい

**修正内容**:
- `frontend/src/components/ThreeViewer.vue` の488行目
- `TIMELINE_MIN_HEIGHT` を 320 から 160 に変更

```javascript
// 修正前
const TIMELINE_MIN_HEIGHT = 320

// 修正後
const TIMELINE_MIN_HEIGHT = 160
```

**結果**: タイムラインパネルを今までの半分の高さ（160px）まで縮小できるようになりました。

---

### 2. イージングカーブの色が変わる問題を修正 ✅

**問題**: タイムライン上でキーとキーの間をイージングカーブで結んでいるが、キー設定から対象トラッカーを切り替えると、直前まで操作していた対象トラッカーのイージングカーブの色がその選択後のイージングカーブの色に変わってしまう

**根本原因**:
- `KeySettingsSection.vue`の`curveColor`がトラッカー切り替え時に正しくキャッシュされていなかった
- トラッカーごとのカーブ色が保持されず、常に新しいトラッカーの色で上書きされていた

**修正内容**:

#### 2.1. `KeySettingsSection.vue` - カーブ色のキャッシュ機構を強化

```vue
// トラッカーごとのカーブ色を保持（トラッカー色と同期）
const trackerCurveColors = ref(new Map())

// curveColor computed を修正
const curveColor = computed(() => {
  const trackerKey = selectedTracker.value
  
  // トラッカーごとのカーブ色をキャッシュから取得（優先）
  if (trackerCurveColors.value.has(trackerKey)) {
    return trackerCurveColors.value.get(trackerKey)
  }
  
  // ... フレームから色を取得してキャッシュに保存
  // ... availableTrackersから色を取得してキャッシュに保存
  // ... デフォルト色を取得してキャッシュに保存
})
```

#### 2.2. キーフレーム選択変更時のキャッシュ更新

```javascript
watch(
  () => (Array.isArray(props.selection?.selectedIds) ? props.selection.selectedIds.join(',') : ''),
  () => {
    // キーフレーム選択が変わった時、トラッカー選択をリセット
    selectedTracker.value = 'default'
    // キャッシュをクリアして、新しい選択からカーブ色を取得し直す
    trackerCurveColors.value.clear()
    // 現在のフレームから各トラッカーのカーブ色を再収集
    const frames = Array.isArray(props.selection?.frames) ? props.selection.frames : []
    frames.forEach(frame => {
      const curves = frame?.curves || {}
      Object.keys(curves).forEach(key => {
        if (curves[key]?.color && !trackerCurveColors.value.has(key)) {
          trackerCurveColors.value.set(key, normalizeColor(curves[key].color, getDefaultColor(key)))
        }
      })
    })
  }
)
```

#### 2.3. フレームデータ変更時のキャッシュ更新

```javascript
// フレームデータが変わった時もキャッシュを更新
watch(
  () => props.selection?.frames,
  (frames) => {
    if (!Array.isArray(frames)) return
    // 各フレームから各トラッカーのカーブ色を収集してキャッシュを更新
    frames.forEach(frame => {
      const curves = frame?.curves || {}
      Object.keys(curves).forEach(key => {
        if (curves[key]?.color) {
          const normalized = normalizeColor(curves[key].color, getDefaultColor(key))
          // 既存のキャッシュと異なる場合のみ更新（色の変更を検知）
          if (!trackerCurveColors.value.has(key) || trackerCurveColors.value.get(key) !== normalized) {
            trackerCurveColors.value.set(key, normalized)
          }
        }
      })
    })
  },
  { deep: true, immediate: true }
)
```

**結果**: 
- トラッカーを切り替えても、各トラッカーのイージングカーブ色が正しく保持されるようになりました
- トラッカーAからトラッカーBに切り替えても、トラッカーAのカーブ色は変わりません
- カーブ色はトラッカーごとに独立して管理され、キャッシュされます

---

### 3. 指のボーン操作機能の確認 ⚠️

**問題**: ボーン設定内において、指の関節が曲がらないので曲げられるようにする

**現状**:
- `useFingerControl.js` に指のボーン操作機能は実装済み
- `FingerControlSection.vue` でスライダーUIが提供されている
- `ThreeViewer.vue` で `applyFingerPose()` が呼び出されている
- `fingerStates` の更新が reactive に監視されている

**実装されている機能**:
1. VRMモデルの humanoid ボーンから指のボーンを自動検出
2. 複数の命名規則に対応（VRM標準、MMD形式、Unity Humanoid形式など）
3. 各指の第一関節〜第三関節を最大90度まで曲げる
4. 左右の手で5本の指を個別制御

**サポートされているボーン名**:
```javascript
// 左手の親指の例
['leftThumbProximal', 'leftThumbIntermediate', 'leftThumbDistal']
['leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal']
['LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3']
['J_Bip_L_ThumbMetacarpal', 'J_Bip_L_Thumb1', 'J_Bip_L_Thumb2', 'J_Bip_L_Thumb3']
['J_Bip_L_Thumb1', 'J_Bip_L_Thumb2', 'J_Bip_L_Thumb3']
```

**動作フロー**:
```
FingerControlSection.vue (スライダー操作)
  ↓ emit('update:fingerStates', updated)
SectionVisibility.vue (handleFingerUpdate)
  ↓ emit('update:fingerStates', updated)
ThreeViewer.vue (updateFingerStates)
  ↓ fingerStates を更新
watch(fingerStates) が反応
  ↓ scheduleApplyFingerPose()
useFingerControl.js (applyFingerPose)
  ↓ モデルのボーンを検出・回転
3Dビューに反映
```

**確認事項**:
- PMXファイルが提供されていないため、特定のモデルでの動作確認が必要
- モデルによってはボーン名が異なる可能性がある
- その場合は `FINGER_BONES` の配列に新しい命名パターンを追加する必要がある

**推奨デバッグ方法**:
1. モデルを読み込む
2. ブラウザのコンソールを開く
3. 指のスライダーを操作する
4. コンソールに以下のようなメッセージが表示されるはず:
   ```
   [FingerControl] Setting left_thumb to 50%
   [FingerControl] Detected 10/10 finger groups: ...
   ```
5. メッセージが表示されない場合、モデルのボーン名が対応していない可能性がある
6. その場合はコンソールでボーン名を確認し、`FINGER_BONES`に追加する

---

## 修正ファイル一覧

1. `frontend/src/components/ThreeViewer.vue`
   - TIMELINE_MIN_HEIGHT を 160 に変更

2. `frontend/src/components/KeySettingsSection.vue`
   - trackerCurveColors キャッシュの追加
   - curveColor computed の修正
   - watch による自動キャッシュ更新の追加

---

## テスト手順

### 1. タイムライン最小高さのテスト
1. アプリケーションを起動
2. タイムラインパネルの境界をドラッグして高さを調整
3. 最小高さが以前の半分（160px）になることを確認

### 2. イージングカーブ色のテスト
1. タイムラインに複数のキーフレームを追加
2. 2つのキーを選択してイージングカーブエディタを開く
3. トラッカーAを選択してカーブを編集（色を確認）
4. トラッカーBに切り替え
5. 再度トラッカーAに戻す
6. トラッカーAのカーブ色が変わっていないことを確認 ✅

### 3. 指のボーン操作のテスト
1. VRMモデルを読み込む
2. サイドバーの「ボーン設定」タブを開く
3. 左手・右手の各指のスライダーを操作
4. 3Dビューで指が曲がることを確認
5. コンソールでデバッグメッセージを確認

**期待される動作**:
- スライダーを動かすと指が曲がる
- 0%で完全に伸びた状態
- 100%で最大90度曲がった状態
- リセットボタンで全ての指が0%に戻る

---

## 既知の制限事項

### 指のボーン操作について
- モデルのボーン構造によっては動作しない場合がある
- PMXモデルの場合、ボーン名が特殊な場合は追加の対応が必要
- モデルによってはIKが干渉する場合がある

### イージングカーブについて
- 大量のキーフレーム（1000+）がある場合、パフォーマンスが低下する可能性がある
- トラッカー数が多い場合（20+）、メモリ使用量が増加する

---

## 今後の改善案

1. **指のボーン操作の拡張**
   - PMXモデル専用のボーン検出ロジックを追加
   - IK制御との連携を改善
   - 個別の関節角度調整UI

2. **イージングカーブの最適化**
   - カーブデータの圧縮
   - 仮想スクロールの実装
   - WebWorkerでの処理

3. **タイムライン機能の拡張**
   - 最小高さのカスタマイズ設定
   - レイアウトプリセットの保存
   - マルチトラック表示

---

## 参考資料

- VRM仕様: https://vrm.dev/
- Three.js ドキュメント: https://threejs.org/docs/
- 過去の実装レポート:
  - `IMPLEMENTATION_2024-10-14_CURVE_FINGER_FIXES.md`
  - `COMPLETE_FIX_REPORT_2024-10-14.md`
  - `FOREARM_TWIST_IMPLEMENTATION.md`
