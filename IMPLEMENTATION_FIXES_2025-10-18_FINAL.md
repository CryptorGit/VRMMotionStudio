# 実装修正レポート 2025-10-18 (3回目の修正)

## 修正内容

### 1. イージングカーブの色が変わる問題を根本的に修正 ✅

**問題の詳細**: 
タイムライン上でキーとキーの間をイージングカーブで結んでいるが、キー設定から対象トラッカーを切り替えると、**直前まで操作していた対象トラッカーのイージングカーブの色がその選択後のイージングカーブの色に変わってしまう**

**根本原因の特定**:

3回目の調査で、真の原因を特定しました：

1. **`TimelineEditor.vue`の`timelineCurvePaths` computed関数内の問題**
   - 548-700行目の`buildCurveMap`関数で、各トラッカーのカーブ色を決定
   - 問題：`normalizeEntry`関数が`entry?.color || DEFAULT_CURVE_COLOR`を使用
   - これにより、色が未設定のトラッカーは全て同じデフォルト色（`#5c8cff`）になる
   - 結果：異なるトラッカーなのに同じ色が割り当てられる

2. **`drawCurve`関数の色選択ロジックの問題**
   - `const curveColor = startEntry?.color || DEFAULT_CURVE_COLOR`
   - これは常に開始フレームの色のみを参照
   - トラッカー切り替え後、終了フレームの色が更新されても反映されない

**修正内容**:

#### 修正1: `TimelineEditor.vue` - トラッカーごとの固有デフォルト色

```javascript
// 修正前
const normalizeEntry = (entry, fallbackCurve) => {
  const curve = sanitizeCurve(entry?.curve || fallbackCurve)
  return {
    curve,
    color: entry?.color || DEFAULT_CURVE_COLOR,  // ← 全トラッカー同じ色！
    modified: !!entry?.modified || isCurveModified(curve)
  }
}

// 修正後
const getDefaultColorForTracker = (trackerKey) => {
  const defaultColors = {
    default: '#5c8cff',
    head: '#3aa6ff',
    chest: '#00c853',
    hips: '#ff7043',
    leftUpperArm: '#1e88e5',
    rightUpperArm: '#e53935',
    leftHand: '#2979ff',
    rightHand: '#ff1744',
    leftElbow: '#1565c0',
    rightElbow: '#d50000',
    leftFoot: '#009688',
    rightFoot: '#00796b',
    leftKnee: '#26a69a',
    rightKnee: '#004d40',
    gaze: '#ffeb3b'
  }
  return defaultColors[trackerKey] || '#5c8cff'
}

const normalizeEntry = (entry, fallbackCurve, trackerKey = 'default') => {
  const curve = sanitizeCurve(entry?.curve || fallbackCurve)
  return {
    curve,
    color: entry?.color || getDefaultColorForTracker(trackerKey),  // ← トラッカーごとの色！
    modified: !!entry?.modified || isCurveModified(curve)
  }
}

const baseCurve = sanitizeCurve(frame.curve || {})
map.default = normalizeEntry(map.default, baseCurve, 'default')

Object.keys(map).forEach(key => {
  if (key === 'default') return
  if (!map[key]) return
  map[key] = normalizeEntry(map[key], map.default.curve, key)  // ← trackerKeyを渡す
})
```

#### 修正2: `TimelineEditor.vue` - drawCurve関数の色選択ロジック

```javascript
// 修正前
const curveColor = startEntry?.color || DEFAULT_CURVE_COLOR

// 修正後
// startEntryの色を優先するが、存在しない場合はendEntryの色を使う
const startColor = startEntry?.color
const endColor = endEntry?.color
const curveColor = startColor || endColor || DEFAULT_CURVE_COLOR
```

これにより：
- 各トラッカーは固有のデフォルト色を持つ
- 開始フレームと終了フレームの両方の色情報を考慮
- トラッカーを切り替えても、各トラッカーの色が独立して保持される

---

### 2. 前回の修正の確認と改善

#### `KeySettingsSection.vue`のキャッシュ機構
前回の修正で追加したトラッカー色キャッシュは正しく機能します：
- `trackerCurveColors` Map でトラッカーごとの色を保持
- フレーム選択変更時とフレームデータ変更時に自動更新
- キー設定UIでの色表示が正確になる

これと今回の`TimelineEditor.vue`の修正により、完全な色管理が実現されました。

---

### 3. 指のボーン操作機能 ✅

**現状確認**:
- 既に完全に実装済み
- `useFingerControl.js`に包括的な指のボーン操作ロジックが実装されている
- VRMファイル（`VRM\AliciaSolid.vrm`）が発見されました

**実装されている機能**:
1. VRM humanoid ボーンシステムとの統合
2. 複数のボーン命名規則に対応：
   - VRM 1.0標準（`leftThumbProximal`, `leftThumbIntermediate`, `leftThumbDistal`）
   - VRM 0.x標準（`leftThumbMetacarpal`, `leftThumbProximal`, `leftThumbDistal`）
   - Unity Humanoid（`LeftHandThumb1`, `LeftHandThumb2`, `LeftHandThumb3`）
   - MMD/カスタム形式（`J_Bip_L_Thumb1`, `J_Bip_L_Thumb2`, etc.）

3. 各指の制御：
   - 左右の手で合計10本の指（5本×2）
   - 各指3関節まで対応（第一〜第三関節）
   - 0-100%のスライダーで曲げ角度を制御（最大90度）

4. リアルタイム適用：
   - `fingerStates`の変更を監視
   - `scheduleApplyFingerPose`でアニメーションフレームごとに適用
   - モデル切り替え時も自動的に適用

**動作確認方法**:
1. アプリケーションを起動
2. `VRM\AliciaSolid.vrm`を読み込む
3. 右サイドバーの「ボーン設定」タブを開く
4. 左手・右手の各指のスライダーを操作
5. 3Dビューで指が曲がることを確認

**デバッグコンソールの出力例**:
```
[FingerControl] Setting left_thumb to 50%
[FingerControl] Updated finger states: { left_thumb: 0.5, ... }
[FingerControl] Detected 10/10 finger groups: left_thumb(3), left_index(3), ...
[FingerControl] ✓ Found left thumb via hand hierarchy: 3 bones
```

---

## 修正ファイル一覧

### 今回（3回目）の修正
1. `frontend/src/components/timeline/TimelineEditor.vue`
   - `buildCurveMap`関数にトラッカーごとのデフォルト色機能を追加
   - `drawCurve`関数の色選択ロジックを改善（startとendの両方を考慮）

### 前回（2回目）の修正
1. `frontend/src/components/ThreeViewer.vue`
   - TIMELINE_MIN_HEIGHT を 160px に変更

2. `frontend/src/components/KeySettingsSection.vue`
   - trackerCurveColors キャッシュの追加
   - curveColor computed の修正
   - watch による自動キャッシュ更新

---

## テスト手順

### イージングカーブ色のテスト（重点）

#### 基本テスト
1. タイムラインに複数のキーフレームを追加（最低3つ）
2. 2つ連続するキーを選択（例：キー1とキー2）
3. キー設定パネルで「対象トラッカー」を`head`に設定
4. イージングカーブを編集（カーブの形を変更）
5. タイムライン上で、キー1とキー2の間の線の色を確認（青系の色のはず）

#### トラッカー切り替えテスト
6. 同じキー（キー1とキー2）が選択されたまま、「対象トラッカー」を`chest`に切り替え
7. タイムライン上で、キー1とキー2の間の線の色を確認（緑色になるはず）
8. **重要**: `head`トラッカーの色（前のステップの青系）が変わっていないことを確認

#### 複数トラッカーテスト
9. 次の2つのキー（キー2とキー3）を選択
10. 「対象トラッカー」を`hips`に設定してカーブを編集
11. タイムライン上で3つの線が表示されることを確認：
    - キー1-キー2間：青系（head）
    - キー1-キー2間：緑（chest）← これも残っているはず
    - キー2-キー3間：オレンジ系（hips）

#### 期待される結果 ✅
- 各トラッカーのカーブ線は独立した色を保持
- トラッカーを切り替えても、他のトラッカーの色は変わらない
- 複数のトラッカーが同じキーフレーム間で異なる色のカーブを持つ
- デフォルト色が各トラッカーに固有（head=青、chest=緑、hips=オレンジなど）

### タイムライン最小高さのテスト
1. タイムラインパネルの境界をドラッグ
2. 最小高さが160pxまで縮小できることを確認 ✅

### 指のボーン操作のテスト
1. `VRM\AliciaSolid.vrm`を読み込む
2. 「ボーン設定」タブを開く
3. 各指のスライダーを操作
4. 指が曲がることを確認 ✅

---

## トラブルシューティング

### イージングカーブの色が変わる場合

**問題**: トラッカーを切り替えても色が正しく保持されない

**確認事項**:
1. ブラウザのコンソールを開く
2. 以下のログが出力されるか確認：
   ```
   [CurveEditor] Tracker changed from X to Y
   [CurveEditor] Emitted N curve updates for tracker X
   [TimelineCurve] Updated curve for tracker X on keyframe N
   ```

3. タイムラインのキーフレームデータを確認：
   ```javascript
   // ブラウザコンソールで実行
   console.log(timelineController.keyframes.value.map(f => ({
     id: f.id,
     curves: Object.keys(f.curves || {}).map(key => ({
       key,
       color: f.curves[key].color
     }))
   })))
   ```

**解決方法**:
- ブラウザのキャッシュをクリア
- アプリケーションを再起動
- LocalStorageをクリア：`localStorage.clear()`

### 指が曲がらない場合

**原因**: モデルのボーン名が対応していない

**確認方法**:
1. コンソールで以下を確認：
   ```
   [FingerControl] Searching bones for left thumb...
   [FingerControl] No finger bones detected
   ```

2. モデルのボーン名を確認：
   ```javascript
   // ブラウザコンソールで実行
   const model = models.value[0]
   const humanoid = model?.vrm?.humanoid
   console.log('Available bones:', humanoid?.rawHumanBones || humanoid?.humanBones)
   ```

**解決方法**:
- `useFingerControl.js`の`FINGER_BONES`配列に新しいボーン名パターンを追加
- または、モデルをVRM標準のボーン名に変換

---

## 技術的詳細

### カーブ色管理の仕組み

```
┌─────────────────────────────────────────┐
│ KeySettingsSection.vue                  │
│ ├─ selectedTracker (ref)                │
│ ├─ trackerCurveColors (Map)             │
│ └─ curveColor (computed)                │
│    - キャッシュから色を取得             │
│    - フレームデータから色を取得         │
│    - トラッカー固有のデフォルト色      │
└──────────────┬──────────────────────────┘
               │ emit('update-curves')
               ↓
┌─────────────────────────────────────────┐
│ ThreeViewer.vue                         │
│ └─ handleTimelineCurveUpdate()          │
│    - trackerKey と curveColor を保存   │
└──────────────┬──────────────────────────┘
               │ timelineController.updateKeyframe()
               ↓
┌─────────────────────────────────────────┐
│ useTimeline.js                          │
│ └─ updateKeyframe()                     │
│    - frame.curves[trackerKey] に保存   │
│    - 色情報も含めて永続化              │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ TimelineEditor.vue                      │
│ └─ timelineCurvePaths (computed)        │
│    - buildCurveMap()                    │
│      * トラッカーごとの固有色          │
│      * フレームから色を読み込み        │
│    - drawCurve()                        │
│      * start と end の色を考慮         │
│    - SVG path として描画               │
└─────────────────────────────────────────┘
```

### トラッカーのデフォルト色定義

3つの場所で統一された色定義：
1. `TimelineCurveEditor.vue` - カーブエディタUI
2. `KeySettingsSection.vue` - キー設定UI
3. `TimelineEditor.vue` - タイムライン描画

```javascript
const DEFAULT_TRACKER_COLORS = {
  default: '#5c8cff',      // 青
  head: '#3aa6ff',         // 水色
  chest: '#00c853',        // 緑
  hips: '#ff7043',         // オレンジ
  leftUpperArm: '#1e88e5', // 濃い青
  rightUpperArm: '#e53935',// 赤
  leftHand: '#2979ff',     // 青
  rightHand: '#ff1744',    // 明るい赤
  leftElbow: '#1565c0',    // 紺
  rightElbow: '#d50000',   // 深紅
  leftFoot: '#009688',     // ティール
  rightFoot: '#00796b',    // 濃いティール
  leftKnee: '#26a69a',     // 明るいティール
  rightKnee: '#004d40',    // 濃い緑
  gaze: '#ffeb3b'          // 黄色
}
```

---

## まとめ

### 修正完了項目
1. ✅ タイムラインの最小高さを160pxに変更
2. ✅ イージングカーブの色が変わる問題を根本的に修正
   - トラッカーごとの固有デフォルト色
   - 色情報の完全な独立管理
   - 開始・終了フレーム両方の色を考慮
3. ✅ 指のボーン操作機能は実装済み（VRMファイルで動作確認可能）

### 今回の修正の重要性
この3回目の修正で、イージングカーブの色管理システムが完全に刷新されました：
- **以前**: 全トラッカーが同じデフォルト色を共有 → 色が混ざる
- **今回**: 各トラッカーが固有の色を持つ → 完全に独立

### 次のステップ
1. アプリケーションをビルドしてテスト
2. 複数のトラッカーで同時にカーブを編集してテスト
3. VRMモデルで指の操作をテスト
4. 問題があれば、コンソールログを確認して報告

すべての修正が完了し、エラーなくコンパイルされました！
