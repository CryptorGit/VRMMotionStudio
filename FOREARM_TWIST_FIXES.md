# 前腕ツイスト分配と手首トラッカー動作の修正

## 修正日
2025年10月8日

## 修正内容

### 1. 前腕ツイスト分配の実装 ✅

**問題**: 手首トラッカーを回転させても、前腕（肘から手首）と手首ボーンにRoll回転が分配されていなかった。

**解決策**:
- `distributeHandTrackerRotation`関数を完全に再設計
- トラッカーの回転をSwing（向きの変更）とTwist（Roll回転）に分解
- Twist成分を以下の比率で分配:
  - **前腕: 70%** (`forearmTwistShareRatio = 0.7`)
  - **手首: 30%** (`1 - forearmTwistShareRatio = 0.3`)

**実装の詳細**:
```javascript
// トラッカー回転と現在の手首回転の差分を計算
const deltaQ = currentHandWorldQ.clone().invert().multiply(trackerWorldQ)

// 前腕軸（肘→手首）を基準にTwistとSwingを分解
const twistAngle = angle * dotProduct
const twistQ = new THREE.Quaternion().setFromAxisAngle(forearmAxis, twistAngle)
const swingQ = deltaQ.clone().multiply(invTwistQ)

// Twistを前腕と手首に分配
const forearmTwistAngle = twistAngle * forearmTwistShareRatio  // 70%
const handTwistAngle = twistAngle * (1 - forearmTwistShareRatio)  // 30%
```

### 2. 手首トラッカーの回転操作を有効化 ✅

**問題**: 手首のバーチャルトラッカーがマウス右クリックやホイールクリックで回転しなくなっていた。

**解決策**:
- `onPointerDown`関数を修正
- 手首トラッカーの回転モード（右クリック/中クリック）を有効化
- 移動モード時のみ`activateHandTranslationLock`を呼び出すように変更

**修正前**:
```javascript
// 回転モード時に手首のロックを解除していた
else {
  if (trackerKey === 'leftHand' || trackerKey === 'rightHand') {
    releaseHandTranslationLock(trackerKey)  // ❌ これが問題
  }
  // ...
}
```

**修正後**:
```javascript
if (mode === 'translate') {
  // 移動モード時のみロックを有効化
  if (trackerKey === 'leftHand' || trackerKey === 'rightHand') {
    activateHandTranslationLock(trackerKey)
    dragState.translationLockKey = trackerKey
  }
} else {
  // 回転モード時: ロック関連の処理は不要
  // （回転処理で自動的に分配される）
}
```

### 3. 手首トラッカー移動時の動作改善 ✅

**問題**: 
- 手首トラッカーを移動させると、手首の絶対位置が固定されている状態
- Tポーズから手首トラッカーを真上に動かすと、指先の方向はX軸（横）のまま変わらない
- 理想: 指先の方向もY軸（上）を向いてほしい

**解決策**:
- `activateHandTranslationLock`を拡張し、追加情報を保存:
  - 肩から手首への方向ベクトル
  - 手首のワールド向き（Forward方向）
- `applyHandTranslationConstraint`を拡張し、腕の動きに応じて手首の向きも回転

**実装の詳細**:
```javascript
// activateHandTranslationLock で保存
lock.shoulderToHandDirection = shoulderToHand  // 肩→手首の方向
lock.handForwardDirection = handForward        // 手首の向き

// applyHandTranslationConstraint で適用
// 肩→手首の方向が変わった場合、その回転を手首の向きにも適用
const armRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle)
const rotatedHandForward = lockState.handForwardDirection.clone().applyQuaternion(armRotation)
```

**動作例**:
- **Tポーズ（腕が横）**: 肩→手首の方向 = (1, 0, 0)、手首の向き = (1, 0, 0)
- **真上に移動**: 肩→手首の方向 = (0, 1, 0)、手首の向きも90度回転 → (0, 1, 0)
- **結果**: 指先も上を向く ✅

### 4. トランスレーションロック時の回転分配処理

**実装**:
- `distributeHandTrackerRotation`関数内で、トランスレーションロックが有効な場合は早期リターン
- これにより、移動モード中は`applyHandTranslationConstraint`のみが適用され、手首の角度が保持される

```javascript
function distributeHandTrackerRotation(lower, hand, trackerKey, lockState) {
  if (!lower || !hand || !trackerIsIndividuallyEnabled(trackerKey)) return
  
  try {
    const tracker = trackers.value.find(t => t.key === trackerKey)
    if (!tracker?.mesh) return
    
    // トランスレーションロック有効時: 早期リターン
    if (lockState?.active && lockState.relative) {
      // applyHandTranslationConstraint で処理されるため、ここでは何もしない
      return
    }
    
    // 以降、回転分配処理...
  }
}
```

## 使用方法

### 前腕ツイスト分配比率の調整

デフォルトでは前腕70%、手首30%ですが、`setForearmTwistShareRatio`関数で調整可能:

```javascript
// 前腕100%、手首0%
virtualTrackers.setForearmTwistShareRatio(1.0)

// 前腕50%、手首50%
virtualTrackers.setForearmTwistShareRatio(0.5)

// 前腕70%、手首30%（デフォルト）
virtualTrackers.setForearmTwistShareRatio(0.7)
```

### 手首トラッカーの操作

1. **移動**: 左クリックドラッグ
   - 手首の角度は固定（前腕からの相対角度を保持）
   - 腕全体が移動し、手首の向きも連動して回転

2. **パン/チルト回転**: 右クリックドラッグ
   - 横ドラッグ: パン（Y軸周り）
   - 縦ドラッグ: チルト（カメラX軸周り）
   - Roll成分は前腕と手首に分配

3. **ロール回転**: 中クリック（ホイールクリック）ドラッグ
   - 横ドラッグ: ロール（カメラZ軸周り）
   - Roll角度の70%が前腕、30%が手首に分配

## テスト手順

### 前腕ツイスト分配のテスト

1. モデルをTポーズにする
2. 右手首トラッカーを中クリック（ホイールクリック）
3. 左右にドラッグしてRoll回転
4. **期待結果**:
   - 前腕（肘から手首）が70%回転
   - 手首ボーンが30%回転
   - 合計で手首トラッカーの回転と一致

### 手首トラッカー移動のテスト

1. モデルをTポーズにする（腕が横に伸びている）
2. 右手首トラッカーを左クリックで選択
3. 真上（Y軸正方向）にドラッグ
4. **期待結果**:
   - 腕が上に上がる
   - 指先の方向も上（Y軸正方向）を向く
   - 手首の角度（前腕からの相対角度）は保持される

### 手首トラッカー回転のテスト

1. モデルをTポーズにする
2. 右手首トラッカーを右クリック
3. 上下左右にドラッグ
4. **期待結果**:
   - パン/チルト回転が適用される
   - Roll成分が前腕と手首に分配される

5. 次に中クリック（ホイールクリック）
6. 左右にドラッグ
7. **期待結果**:
   - ロール回転が適用される
   - Roll角度の70%が前腕、30%が手首に分配される

## 技術的な詳細

### Quaternion分解アルゴリズム

回転Quaternionを軸周りのTwist成分と、それ以外のSwing成分に分解:

```javascript
// Quaternionから軸角表現に変換
const qw = THREE.MathUtils.clamp(deltaQ.w, -1, 1)
let angle = 2 * Math.acos(qw)
let s = Math.sqrt(Math.max(0, 1 - qw * qw))
let axis = new THREE.Vector3(1, 0, 0)

if (s >= 1e-6) {
  axis.set(deltaQ.x / s, deltaQ.y / s, deltaQ.z / s)
  axis.normalize()
}

// 前腕軸との内積でTwist成分を計算
const dotProduct = axis.dot(forearmAxis)
const twistAngle = angle * dotProduct

// Twist Quaternion
const twistQ = new THREE.Quaternion().setFromAxisAngle(forearmAxis, twistAngle)

// Swing Quaternion (deltaQ から twist を除去)
const invTwistQ = twistQ.clone().invert()
const swingQ = deltaQ.clone().multiply(invTwistQ)
```

### 腕の向き追従アルゴリズム

手首トラッカー移動時に、肩から手首への方向の変化を検出し、その回転を手首の向きに適用:

```javascript
// 保存された方向と現在の方向の差分から回転を計算
const savedDir = lockState.shoulderToHandDirection
const currentDir = currentShoulderToHand
const rotationAxis = new THREE.Vector3().crossVectors(savedDir, currentDir)
const angle = Math.acos(THREE.MathUtils.clamp(savedDir.dot(currentDir), -1, 1))

// 手首の向きに同じ回転を適用
const armRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle)
const rotatedHandForward = lockState.handForwardDirection.clone().applyQuaternion(armRotation)
```

## 既知の制限事項

1. **IKとの競合**: 手首トラッカーを極端な位置に移動させると、IKの制約により予期しない動作をする可能性があります。

2. **肘トラッカーとの相互作用**: 肘トラッカーを同時に使用する場合、手首の向き追従が期待通りに動作しない可能性があります。

3. **極端な回転**: 前腕軸とほぼ平行な方向への回転は、数値的な不安定性により正しく分解されない場合があります。

## 今後の改善案

1. より高度なIKソルバー（FABRIK等）の実装
2. 肘トラッカーとの連携強化
3. ユーザーごとの前腕ツイスト分配比率の保存
4. アニメーションキーフレームへの対応

## 関連ファイル

- `frontend/src/composables/useVirtualTrackers.js` - メイン実装
- `FOREARM_TWIST_IMPLEMENTATION.md` - 実装詳細ドキュメント
- `docs/virtual-trackers.md` - ユーザードキュメント
