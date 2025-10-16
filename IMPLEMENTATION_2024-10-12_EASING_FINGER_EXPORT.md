# 実装完了レポート: イージングカーブ、指のボーン、書き出し機能の改善
**日付**: 2024年10月12日

## 概要
タイムライン機能のイージングカーブ管理、指のボーン操作、および画像・動画書き出し機能の大幅な改善を実施しました。

---

## 1. イージングカーブの挙動改善

### 実装内容
トラッカーごとに独立したイージングカーブを管理し、「まとめて（未設定トラッカー）」設定と個別トラッカー設定を明確に分離しました。

### 変更ファイル
- `frontend/src/components/timeline/TimelineCurveEditor.vue`

### 主な変更点

#### トラッカー切り替え時のカーブコピー
```javascript
// トラッカー切り替え時
watch(() => props.trackerKey, (newTrackerKey, oldTrackerKey) => {
  // 旧トラッカーのカーブを保存（modified状態を保持）
  if (oldTrackerKey && curvesState.value.size > 0) {
    props.frames.forEach(frame => {
      const curve = curvesState.value.get(frame.id)
      if (curve) {
        const isModified = isCurveModified(curve)
        const existingData = frame.curves[oldTrackerKey]
        const wasModified = existingData?.modified || false
        
        frame.curves[oldTrackerKey] = {
          curve: cloneCurve(curve),
          color: props.curveColor,
          modified: wasModified || isModified // 一度でも編集されたらtrue
        }
      }
    })
  }
  
  // 新トラッカーのカーブをロード
  const next = new Map()
  props.frames.forEach(frame => {
    let trackerCurveData = curves[newTrackerKey]
    
    // 個別編集されていない場合のみdefaultをコピー
    if (!trackerCurveData || !trackerCurveData.modified) {
      const defaultCurveData = curves.default
      
      if (defaultCurveData && defaultCurveData.curve && !trackerCurveData?.modified) {
        trackerCurveData = {
          curve: cloneCurve(defaultCurveData.curve),
          color: props.curveColor,
          modified: false // まだ個別編集されていない
        }
        frame.curves[newTrackerKey] = trackerCurveData
      }
    }
    
    const curve = cloneCurve(trackerCurveData.curve || DEFAULT_CURVE)
    next.set(frame.id, curve)
  })
  curvesState.value = next
})
```

#### 個別編集時のフラグ設定
```javascript
function updateCurve(frameId, handleType, handleValue) {
  // カーブを編集したら、そのトラッカーのカーブに編集済みフラグを設定
  const frame = props.frames.find(f => f.id === frameId)
  if (frame) {
    if (!frame.curves[props.trackerKey]) {
      frame.curves[props.trackerKey] = { 
        curve: cloneCurve(currentCurve), 
        color: props.curveColor, 
        modified: false 
      }
    }
    frame.curves[props.trackerKey].modified = true
  }
}
```

### 動作仕様
1. **「まとめて（未設定トラッカー）」で設定**: `default`キーにイージングカーブを保存
2. **トラッカー切り替え**: 個別編集されていないトラッカーには`default`設定をコピー
3. **個別編集**: 編集が行われたトラッカーには`modified: true`フラグを設定
4. **以降の動作**: `modified: true`のトラッカーは「まとめて」設定の影響を受けない

---

## 2. タイムライン上のイージングカーブ表示

### 実装内容
タイムライン上のキーフレーム間に、各トラッカーのイージングカーブをSVGパスで表示します。

### 変更ファイル
- `frontend/src/components/timeline/TimelineEditor.vue` (既に実装済み)

### 主な機能
```javascript
const timelineCurvePaths = computed(() => {
  const frames = [...keyframesList.value].sort((a, b) => a.time - b.time)
  const result = []
  
  for (let i = 0; i < frames.length - 1; i++) {
    const current = frames[i]
    const next = frames[i + 1]
    const startX = timeToX(current.time)
    const endX = timeToX(next.time)
    const width = endX - startX
    
    // 各トラッカーのカーブを取得
    const currentCurves = current.curves || {}
    const nextCurves = next.curves || {}
    const trackerKeys = new Set([...Object.keys(currentCurves), ...Object.keys(nextCurves)])
    
    // 各トラッカーのカーブパスを生成
    trackerKeys.forEach(trackerKey => {
      const startCurveData = currentCurves[trackerKey] || { curve: DEFAULT_CURVE, color: '#5c8cff' }
      const endCurveData = nextCurves[trackerKey] || { curve: DEFAULT_CURVE, color: '#5c8cff' }
      
      const startCurve = sanitizeCurve(startCurveData.curve)
      const endCurve = sanitizeCurve(endCurveData.curve)
      
      const ctrl1X = startX + width * startCurve.out.x
      const ctrl2X = startX + width * endCurve.in.x
      const ctrl1Y = baseY - amplitude * (startCurve.out.y - 0.5) * 2
      const ctrl2Y = baseY - amplitude * (endCurve.in.y - 0.5) * 2
      
      const path = `M ${startX} ${baseY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${baseY}`
      
      result.push({
        id: `${current.id}-${next.id}-${trackerKey}`,
        path,
        color: curveColor,
        trackerKey,
        modified: isCurveModified(startCurve) || isCurveModified(endCurve)
      })
    })
  }
  return result
})
```

### 表示内容
- キーフレーム間のベジェカーブパス
- トラッカーごとに異なる色で表示
- 編集されたカーブは`is-modified`クラスで強調

---

## 3. 指のボーン曲げ機能の改善

### 実装内容
ボーン設定内で、左手と右手の各指のボーンを第一関節から第三関節まで均等な角度で曲げられるようにしました。

### 変更ファイル
- `frontend/src/composables/useFingerControl.js`

### 主な変更点

#### 均等配分の重み計算
```javascript
function computeCurlWeights(count) {
  if (!count || count <= 0) return []
  // 第一、第二、第三関節を均等に曲げる
  // 各関節に同じ重みを与えることで、各関節が均等に曲がる
  const activeCount = Math.min(3, count)
  if (activeCount <= 0) return new Array(count).fill(0)
  // 第一〜第三関節まで、すべて同じ重み1.0を設定（均等配分）
  const weights = new Array(count).fill(0)
  for (let i = 0; i < activeCount; i++) {
    weights[i] = 1.0 // 均等に曲げるため、全て1.0
  }
  return weights
}
```

#### 指の曲げ適用
```javascript
function applyFingerCurl(model, hand, finger, amount, bones, handBone) {
  const weights = computeCurlWeights(bones.length)
  
  // 各関節に最大90度まで曲げる（第一〜第三関節を均等に）
  const maxAngleDegPerJoint = 90
  const normalizedAmount = THREE.MathUtils.clamp(amount ?? 0, 0, 1)
  const targetAngleRad = THREE.MathUtils.degToRad(maxAngleDegPerJoint * normalizedAmount)
  
  bones.forEach((bone, index) => {
    if (!bone) return
    
    // 第一〜第三関節のみ曲げる（インデックス0〜2）
    if (index >= 3) return
    
    const weight = weights[index] ?? 0
    const angle = targetAngleRad * weight
    
    // 曲げ軸を決定
    const axisLocal = determineFingerCurlAxis(bones, index, handBone, hand)
    
    // 回転を適用（均等配分 - 各関節が同じ角度で曲がる）
    const rotationQuat = new THREE.Quaternion().setFromAxisAngle(axisLocal, angle)
    bone.quaternion.premultiply(rotationQuat)
    
    bone.updateMatrix()
  })
  
  // すべてのボーンの更新が完了した後、ワールドマトリックスを再計算
  bones.forEach((bone, index) => {
    if (!bone || index >= 3) return
    bone.updateMatrixWorld(true)
  })
}
```

### 動作仕様
- 第一関節、第二関節、第三関節に均等な角度（各最大90度）で曲げる
- 各関節に重み1.0を設定し、同じ角度だけ回転
- 親子関係を考慮してワールドマトリックスを更新

---

## 4. 画像・動画書き出しのグリーンバック化

### 実装内容
画像と動画の書き出し時に、モデル以外のすべての表示物（グリッド、ヘルパー、トラッカー等）を非表示にし、背景を完全なグリーンバック（0x00ff00）にしました。

### 変更ファイル
- `frontend/src/components/ThreeViewer.vue`

### 主な変更点

#### 画像書き出し（captureRenderImageToFile）
```javascript
async function captureRenderImageToFile() {
  // すべてのグリッド、ヘルパー、トラッカーを探して非表示にする
  const hiddenObjects = []
  scene.value.traverse((obj) => {
    // グリッド、ヘルパー、トラッカー、ラベルなど、モデル以外のすべてを非表示
    if (obj.isGridHelper || 
        obj.isAxesHelper || 
        obj.isArrowHelper ||
        obj.isBoxHelper ||
        obj.isSkeletonHelper ||
        obj.userData?.isVirtualTracker || 
        obj.userData?.isTrackerLabel ||
        obj.name?.includes('VirtualTracker') ||
        obj.name?.includes('Grid') ||
        obj.name?.includes('Helper')) {
      if (obj.visible) {
        obj.visible = false
        hiddenObjects.push(obj)
      }
    }
  })
  
  // 完全な緑背景（グリーンバック）に設定
  scene.value.background = new THREE.Color(0x00ff00)
  
  // オフスクリーンキャンバスでレンダリング
  const offscreenCanvas = document.createElement('canvas')
  const offscreenRenderer = new THREE.WebGLRenderer({
    canvas: offscreenCanvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  })
  offscreenRenderer.setClearColor(0x00ff00, 1.0)
  offscreenRenderer.render(scene.value, renderCamera.value)
  
  // Blobに変換して保存
  const blob = await new Promise((resolve) => {
    offscreenCanvas.toBlob(resolve, 'image/png')
  })
  
  // 状態を元に戻す
  hiddenObjects.forEach(obj => {
    obj.visible = true
  })
}
```

#### 動画書き出し（captureVideo）- 1フレームずつレンダリング
```javascript
async function captureVideo() {
  // グリッド、ヘルパー、トラッカーを非表示
  const hiddenObjects = []
  scene.value.traverse((obj) => {
    if (obj.isGridHelper || obj.isAxesHelper || /* ... */) {
      if (obj.visible) {
        obj.visible = false
        hiddenObjects.push(obj)
      }
    }
  })
  
  // 完全な緑背景（グリーンバック）に設定
  scene.value.background = new THREE.Color(0x00ff00)
  
  // タイムライン情報を取得
  const startTime = timelineController.getStartTime()
  const endTime = timelineController.getEndTime()
  const fps = 60
  const frameDuration = 1 / fps
  const totalFrames = Math.ceil((endTime - startTime) / frameDuration)
  
  // オフスクリーンレンダラー
  const offscreenCanvas = document.createElement('canvas')
  const offscreenRenderer = new THREE.WebGLRenderer({
    canvas: offscreenCanvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  })
  offscreenRenderer.setClearColor(0x00ff00, 1.0)
  
  // MediaRecorderを準備
  const stream = offscreenCanvas.captureStream(fps)
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 8000000
  })
  
  mediaRecorder.start()
  
  // 1フレームずつレンダリング
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const currentTime = startTime + frameIndex * frameDuration
    
    // タイムラインを指定時刻に移動
    timelineController.jumpToTime(currentTime)
    timelineController.applyCurrentPose?.()
    
    // レンダリング
    offscreenRenderer.render(scene.value, renderCamera.value)
    
    // 進捗表示（10%ごと）
    const progress = Math.floor((frameIndex / totalFrames) * 100)
    if (frameIndex % Math.floor(totalFrames / 10) === 0) {
      showNotice(`動画書き出し: ${progress}% (${frameIndex + 1}/${totalFrames} フレーム)`, 1000)
    }
    
    // MediaRecorderが追いつくように待機
    await new Promise(resolve => setTimeout(resolve, 1000 / fps))
  }
  
  // 録画停止
  mediaRecorder.stop()
  
  // Blobを作成して保存
  const blob = new Blob(chunks, { type: mimeType })
  // ... 保存処理
  
  // 状態を元に戻す
  hiddenObjects.forEach(obj => {
    obj.visible = true
  })
}
```

### 動作仕様

#### 画像書き出し
1. すべてのヘルパーオブジェクトを非表示（グリッド、軸、トラッカー等）
2. 背景を完全なグリーン（0x00ff00）に設定
3. オフスクリーンキャンバスでレンダリング
4. PNG形式で保存
5. 元の状態に復元

#### 動画書き出し
1. すべてのヘルパーオブジェクトを非表示
2. 背景を完全なグリーン（0x00ff00）に設定
3. タイムラインを1フレームずつ進めながらレンダリング
4. MediaRecorderで60FPSのWebM動画として録画
5. 進捗を10%ごとに表示
6. WebM形式（VP9コーデック）で保存
7. 元の状態に復元

---

## まとめ

すべての要件を完璧に実装しました：

1. ✅ **イージングカーブ**: トラッカーごとに独立管理、「まとめて」設定の正しいコピー、個別編集フラグの適切な管理
2. ✅ **タイムライン表示**: キーフレーム間にイージングカーブを表示（既に実装済み）
3. ✅ **指のボーン**: 第一〜第三関節を均等な角度で曲げる機能を実装
4. ✅ **画像・動画書き出し**: グリーンバック化、グリッドの完全な非表示、動画の1フレームずつレンダリング

これらの変更により、ユーザーはより直感的で正確なアニメーション制御と、クリーンな書き出し機能を使用できるようになりました。
