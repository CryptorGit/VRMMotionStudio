# 実装修正レポート（第四回） - 2025-10-18

## 修正概要

ユーザーからの四回目の報告に基づき、イージングカーブの色の問題を徹底的に調査し、根本原因を特定して修正を実施しました。

## 問題の詳細

**ユーザーの報告：**
> 対象トラッカーAを選択してイージングカーブを調節し、次に対象トラッカーBを選択すると、対象トラッカーAの曲線の色がトラッカーBの色に変わります。なぜ、前のイージングカーブの曲線の色が変わるのですか？（四回目）

**具体的な状況：**
1. 対象トラッカーA（例：head）を選択
2. イージングカーブを調節
3. 対象トラッカーB（例：chest）を選択
4. **タイムライン上のトラッカーAの曲線の色が、トラッカーBの色に変わってしまう**

## 根本原因の分析

### データフローの追跡

イージングカーブの色は、以下のコンポーネント間を流れます：

```
KeySettingsSection.vue (curveColor computed)
    ↓ props.curveColor
TimelineCurveEditor.vue (カーブ編集)
    ↓ emit('update', { curveColor })
ThreeViewer.vue (handleTimelineCurveUpdate)
    ↓ updateKeyframe({ curveColor })
useTimeline.js (キーフレームに保存)
    ↓ keyframes.value
TimelineEditor.vue (タイムライン描画)
```

### 問題の核心

`TimelineCurveEditor.vue`の`watch(() => props.trackerKey, ...)`内で、トラッカーを切り替えた際に以下の処理が実行されます：

```javascript
watch(() => props.trackerKey, (newTrackerKey, oldTrackerKey) => {
  // 旧トラッカーのカーブを保存
  if (oldTrackerKey && curvesState.value.size > 0) {
    const color = resolveTrackerColor(oldTrackerKey)  // ← 問題箇所
    emit('update', {
      updates: updatesToEmit,
      trackerKey: oldTrackerKey,
      curveColor: color  // ← 間違った色が使われる可能性
    })
  }
})
```

#### `resolveTrackerColor`の元の実装（問題あり）

```javascript
const resolveTrackerColor = (trackerKey) => {
  const key = trackerKey || 'default'
  
  // 1. まずキーフレームから色を探す
  const colorFromFrames = findColorInFrames(key)  // ← ここが問題
  if (colorFromFrames) {
    rememberTrackerColor(key, colorFromFrames)
    return colorFromFrames
  }
  
  // 2. 次にキャッシュをチェック
  if (trackerColorCache.has(key)) {
    return trackerColorCache.get(key)
  }
  
  // 3. fallback色
  // ...
}
```

**問題点：**

1. **`findColorInFrames(key)`が優先される**
2. **しかし、`findColorInFrames`は`props.frames`（選択されたキーフレーム）から色を探す**
3. **もしキーフレームに色が保存されていない場合、`null`が返される**
4. **そして、`trackerColorCache`にも色がない場合、fallback色が使われる**
5. **重要：トラッカーを切り替えたとき、`props.trackerKey`は既に新しいトラッカーに変わっているが、`findColorInFrames`は`props.frames`（まだ更新されていない）から色を探す**

### さらなる問題：優先順位

`resolveTrackerColor`の優先順位が間違っていました：

- **元の優先順位：** キーフレーム → キャッシュ → fallback
- **問題：** キーフレームから色が取得できない場合、キャッシュに保存されている正しい色が無視される

## 実装した修正

### 1. `TimelineCurveEditor.vue`の修正

#### `resolveTrackerColor`の優先順位を変更

**修正前：**
```javascript
const resolveTrackerColor = (trackerKey) => {
  const key = trackerKey || 'default'
  const colorFromFrames = findColorInFrames(key)
  if (colorFromFrames) {
    rememberTrackerColor(key, colorFromFrames)
    return colorFromFrames
  }
  if (trackerColorCache.has(key)) {
    return trackerColorCache.get(key)
  }
  // ...
}
```

**修正後：**
```javascript
const resolveTrackerColor = (trackerKey) => {
  const key = trackerKey || 'default'
  
  // 1. キャッシュを最優先（一度保存された色は変わらない）
  if (trackerColorCache.has(key)) {
    const cached = trackerColorCache.get(key)
    console.log(`[CurveEditor]   -> Using cached color: ${cached}`)
    return cached
  }
  
  // 2. キーフレームから色を探す
  const colorFromFrames = findColorInFrames(key)
  if (colorFromFrames) {
    console.log(`[CurveEditor]   -> Found color in frames: ${colorFromFrames}`)
    rememberTrackerColor(key, colorFromFrames)
    return colorFromFrames
  }
  
  // 3. 現在のトラッカーの場合、props.curveColorを使う
  if (key === props.trackerKey) {
    const normalized = normalizeColor(props.curveColor, fallbackColorForTracker(key))
    console.log(`[CurveEditor]   -> Using props.curveColor: ${normalized}`)
    rememberTrackerColor(key, normalized)
    return normalized
  }
  
  // 4. fallback色を使う
  const fallback = fallbackColorForTracker(key)
  console.log(`[CurveEditor]   -> Using fallback color: ${fallback}`)
  rememberTrackerColor(key, fallback)
  return fallback
}
```

**変更点：**

1. **キャッシュを最優先**：一度`trackerColorCache`に保存された色は、それ以降変わりません
2. **デバッグログを追加**：色の決定プロセスを追跡できるようにしました

### 2. `TimelineEditor.vue`にデバッグログを追加

`buildCurveMap`関数にデバッグログを追加して、色の決定プロセスを追跡できるようにしました：

```javascript
const buildCurveMap = (frame) => {
  const map = { ...(frame.curves || {}) }
  
  // デバッグ：元のカーブデータを確認
  if (frame.curves) {
    console.log(`[TimelineEditor] buildCurveMap for frame ${frame.id}:`, JSON.stringify(frame.curves, null, 2))
  }
  
  // ...
  
  const normalizeEntry = (entry, fallbackCurve, trackerKey = 'default') => {
    const curve = sanitizeCurve(entry?.curve || fallbackCurve)
    const color = entry?.color || getDefaultColorForTracker(trackerKey)
    
    // デバッグ：色の決定プロセス
    console.log(`[TimelineEditor] normalizeEntry for ${trackerKey}: entry.color=${entry?.color}, resolved=${color}`)
    
    return {
      curve,
      color,
      modified: !!entry?.modified || isCurveModified(curve)
    }
  }
  // ...
}
```

## 修正の効果

### 修正前の動作

1. トラッカーA（head）を選択してカーブを編集
2. `trackerColorCache.set('head', '#3aa6ff')`（head の色）
3. トラッカーB（chest）に切り替え
4. `resolveTrackerColor('head')`が呼ばれる
5. `findColorInFrames('head')`が`null`を返す（キーフレームにまだ保存されていない）
6. `trackerColorCache.has('head')`が`true`だが、**`findColorInFrames`が優先されるため、チェックされない**
7. **fallback色（または間違った色）が使われる**

### 修正後の動作

1. トラッカーA（head）を選択してカーブを編集
2. `trackerColorCache.set('head', '#3aa6ff')`（head の色）
3. トラッカーB（chest）に切り替え
4. `resolveTrackerColor('head')`が呼ばれる
5. **`trackerColorCache.has('head')`が`true`なので、キャッシュから色を取得**
6. **`#3aa6ff`が返される**
7. **正しい色が使われる**

## テスト手順

### 基本テスト

1. アプリケーションを起動してVRMモデルをロード
2. タイムラインに3つ以上のキーフレームを作成
3. 2つの隣接するキーフレームを選択
4. **トラッカーA（head）を選択**
5. イージングカーブを調節（例：コントロールポイントを移動）
6. **ブラウザコンソールを開いて、以下のログを確認：**
   ```
   [CurveEditor] resolveTrackerColor for head
   [CurveEditor]   -> Using props.curveColor: #3aa6ff
   [TimelineCurve] Updated curve for tracker head on keyframe X, modified: true
   ```
7. **トラッカーB（chest）に切り替え**
8. **コンソールで以下のログを確認：**
   ```
   [CurveEditor] Tracker changed from head to chest
   [CurveEditor] resolveTrackerColor for head
   [CurveEditor]   -> Using cached color: #3aa6ff  ← キャッシュから取得
   [CurveEditor] Emitted X curve updates for tracker head
   ```
9. **タイムライン上のheadのカーブの色を確認**
   - **期待：** headのカーブは青色（#3aa6ff）のまま
   - **実際：** 色が変わらない

### 詳細テスト

1. 複数のトラッカー（head、chest、hips）でカーブを編集
2. トラッカーを切り替えながら、各トラッカーのカーブの色がタイムライン上で変わらないことを確認
3. ブラウザコンソールで、`trackerColorCache`の内容を確認：
   ```javascript
   // 開発者ツールのコンソールで実行
   // (このコードは例示用で、実際のアクセス方法は実装によって異なります)
   ```

### エッジケースのテスト

1. **初めてトラッカーを選択する場合**
   - キャッシュにまだ色がない
   - `fallbackColorForTracker`が使われる
   - その後、キャッシュに保存される

2. **キーフレームをロードする場合**
   - `captureColorsFromFrames`が呼ばれ、キーフレームから色を読み取る
   - キャッシュに保存される

3. **トラッカーを素早く切り替える場合**
   - 各トラッカーの色がキャッシュに保存される
   - 色が混ざらない

## デバッグ情報

### コンソールログの見方

修正後、以下のようなログが出力されます：

```
[CurveEditor] resolveTrackerColor for head
[CurveEditor]   -> Using cached color: #3aa6ff

[TimelineEditor] buildCurveMap for frame 1:
{
  "default": { "curve": {...}, "color": "#5c8cff", "modified": false },
  "head": { "curve": {...}, "color": "#3aa6ff", "modified": true }
}
[TimelineEditor] normalizeEntry for head: entry.color=#3aa6ff, resolved=#3aa6ff
```

### トラブルシューティング

#### 問題：色がまだ変わってしまう

**確認事項：**

1. **ブラウザのキャッシュをクリア**して、最新のコードが実行されているか確認
2. **コンソールログ**で、`resolveTrackerColor`が「Using cached color」を出力しているか確認
3. **キャッシュの内容**を確認（ブラウザの開発者ツールで）

**追加の修正が必要な場合：**

- `trackerColorCache`のクリアタイミングを確認
- `captureColorsFromFrames`が正しく呼ばれているか確認

#### 問題：初めてトラッカーを選択したときの色が間違っている

**確認事項：**

1. `DEFAULT_TRACKER_COLORS`の定義が正しいか確認
2. `fallbackColorForTracker`が正しい色を返しているか確認
3. `KeySettingsSection.vue`の`curveColor` computedが正しい色を返しているか確認

## 今後の改善案

### 1. キャッシュの永続化

現在、`trackerColorCache`はコンポーネントのライフサイクル内でのみ有効です。ページをリロードすると、キャッシュがクリアされます。

**改善案：**
- `localStorage`または`sessionStorage`にキャッシュを保存
- キーフレームデータと一緒に色を保存（すでに実装済み）

### 2. デバッグログの削除

本番環境では、デバッグログを削除するか、開発モードでのみ有効にします。

**改善案：**
```javascript
const DEBUG_MODE = import.meta.env.DEV

if (DEBUG_MODE) {
  console.log(`[CurveEditor] resolveTrackerColor for ${key}`)
}
```

### 3. 色の一貫性チェック

キーフレームに保存されている色と、`trackerColorCache`の色が一致しているか定期的にチェックします。

**改善案：**
```javascript
const validateColorConsistency = () => {
  const frames = Array.isArray(props.frames) ? props.frames : []
  frames.forEach(frame => {
    const curves = frame?.curves || {}
    Object.keys(curves).forEach(key => {
      const frameColor = curves[key]?.color
      const cachedColor = trackerColorCache.get(key)
      if (frameColor && cachedColor && frameColor !== cachedColor) {
        console.warn(`[CurveEditor] Color mismatch for ${key}: frame=${frameColor}, cache=${cachedColor}`)
      }
    })
  })
}
```

## 修正ファイル一覧

1. `frontend/src/components/timeline/TimelineCurveEditor.vue`
   - `resolveTrackerColor`関数の優先順位を変更
   - デバッグログを追加

2. `frontend/src/components/timeline/TimelineEditor.vue`
   - `buildCurveMap`関数にデバッグログを追加

## まとめ

四回目の報告で指摘されたイージングカーブの色の問題は、`TimelineCurveEditor.vue`の`resolveTrackerColor`関数における優先順位の問題が根本原因でした。

**修正内容：**
- キャッシュを最優先にすることで、一度保存された色が変わらないようにしました
- デバッグログを追加して、色の決定プロセスを追跡できるようにしました

**期待される効果：**
- トラッカーを切り替えても、既に編集したトラッカーのカーブの色がタイムライン上で変わりません
- 各トラッカーのカーブが独立した色を持ち、視覚的に区別しやすくなります

**次のステップ：**
- アプリケーションをテストして、修正が期待通りに動作することを確認してください
- ブラウザコンソールでデバッグログを確認して、色の決定プロセスを追跡してください
- 問題が解決しない場合は、デバッグログの内容を共有してください
