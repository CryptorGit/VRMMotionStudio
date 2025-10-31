# Virtual Trackers / バーチャルトラッカー

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## 🎯 English

### Overview

The Virtual Tracker system provides an 11-point tracker interface for posing VRM models in 3D space. Instead of using physical motion capture hardware, users can manipulate colored spheres in the viewport to control the model's pose.

### Tracker Points

The system includes the following 11 tracker points:

| Tracker | Color | Body Part | Function |
|---------|-------|-----------|----------|
| Head | Red | Head | Controls head position and rotation |
| Chest | Orange | Upper torso | Controls chest/spine rotation |
| Hips | Yellow | Pelvis | Controls root position (translates entire model) |
| LeftHand | Cyan | Left wrist | Controls left arm IK target |
| RightHand | Magenta | Right wrist | Controls right arm IK target |
| LeftElbow | Light Blue | Left elbow | Pole vector for left arm IK |
| RightElbow | Pink | Right elbow | Pole vector for right arm IK |
| LeftFoot | Green | Left ankle | Controls left leg IK target |
| RightFoot | Lime | Right ankle | Controls right leg IK target |
| LeftKnee | Dark Green | Left knee | Pole vector for left leg IK |
| RightKnee | Yellow-Green | Right knee | Pole vector for right leg IK |

### Features

#### 1. Visual Representation
- Each tracker is displayed as a colored sphere in the 3D viewport
- Tracker size is adjustable via the settings panel
- Optional labels display tracker names above each sphere
- Label size can be customized

#### 2. Drag-and-Drop Interaction
- **Left-click and drag** any tracker to reposition it
- Camera controls are temporarily disabled during dragging
- Trackers can be moved freely in 3D space
- Real-time IK updates show pose changes immediately

#### 3. Position Persistence
- Tracker positions are automatically saved per-model in browser localStorage
- Positions are restored when reloading the same model
- Each VRM model has its own set of saved tracker positions

#### 4. Reset Functionality
- "Reset Positions" button aligns all trackers to the current bone positions
- Useful for starting fresh or fixing tracker drift

#### 5. Settings Persistence
- Tracker visibility toggle state is saved
- Label visibility toggle state is saved
- Tracker size slider value is saved
- Label size slider value is saved
- All settings restore on next session

### User Interface

#### Tracker Section (Sidebar)

Located in the Settings sidebar:

```
☑ Virtual Trackers          [Toggle visibility]
☑ Show Tracker Labels       [Toggle labels]
Tracker Size: [====|====]   [Slider: 0.05-0.3]
Label Size: [====|====]     [Slider: 0.5-2.0]
[Reset Positions] [Button]
```

**Controls:**
- **Virtual Trackers Checkbox**: Show/hide all tracker spheres
- **Show Tracker Labels Checkbox**: Show/hide tracker name labels
- **Tracker Size Slider**: Adjust sphere radius (default: 0.15)
- **Label Size Slider**: Adjust label font size (default: 1.0)
- **Reset Positions Button**: Reset all trackers to current bone positions

### How It Works

#### Inverse Kinematics (IK)

The tracker system uses a simplified 2-bone IK solver to update the VRM model's bone rotations:

1. **Hips Tracker**: 
   - Directly translates the model's root position
   - Moves the entire avatar to match the tracker

2. **Chest & Head Trackers**:
   - Calculate direction from parent bone to tracker
   - Apply rotation to make the bone point toward the tracker

3. **Arm & Leg Trackers (Hand, Elbow, Foot, Knee)**:
   - Use 2-bone IK with pole vectors
   - **Target** (Hand/Foot): End effector position
   - **Pole** (Elbow/Knee): Controls bend direction
   - Solves for upper and lower bone rotations

#### Implementation Details

**File**: `frontend/src/composables/useVirtualTrackers.js`

**Key Functions:**
- `createTrackers()`: Creates 11 Three.js mesh spheres with unique colors
- `updateTrackerPositions()`: Positions trackers at current bone locations
- `setupDragControls()`: Enables drag-and-drop with raycasting
- `updateModelFromTrackers()`: Applies IK to update bone rotations
- `saveTrackerPositions()`: Saves positions to localStorage
- `loadTrackerPositions()`: Restores positions from localStorage

**Storage Key Format**:
```javascript
`trackerPositions_${modelName}`
```

### Usage Example

#### Basic Workflow

1. **Load a VRM Model**
   - Import VRM via file picker or drag & drop
   - Model appears in the viewport

2. **Enable Virtual Trackers**
   - Open Settings sidebar
   - Check "Virtual Trackers"
   - 11 colored spheres appear at bone positions

3. **Adjust Initial Positions**
   - Click "Reset Positions" to align trackers with bones
   - Verify all trackers are visible

4. **Pose the Model**
   - Left-click and drag any tracker sphere
   - The model's corresponding body part follows
   - Use elbow/knee trackers to control bend direction

5. **Fine-tune**
   - Adjust tracker/label sizes as needed
   - Toggle labels on/off for cleaner view

6. **Save Pose**
   - Positions auto-save on drag release
   - Reload model later to restore pose

### Advanced Tips

#### Realistic Posing

- **Use Pole Vectors**: Position elbow/knee trackers to control natural arm/leg bending
- **Chest First**: Adjust chest/hips before positioning hands/feet
- **Symmetry**: For balanced poses, mirror left/right tracker positions

#### Troubleshooting

| Issue | Solution |
|-------|----------|
| Trackers not visible | Check "Virtual Trackers" checkbox is enabled |
| Trackers at wrong positions | Click "Reset Positions" button |
| Can't drag trackers | Ensure left mouse button is used (not right or middle) |
| Model not following tracker | Check if VRM has standard humanoid bone structure |
| Trackers disappear on model change | Expected behavior - each model has separate trackers |

### Cache Deletion Impact

When using the "Clear Cache" menu option, the following data is deleted:

- ✅ Saved tracker positions for all models
- ✅ Tracker visibility settings
- ✅ Label visibility settings
- ✅ Tracker size settings
- ✅ Label size settings

After cache deletion, all settings reset to defaults on next launch.

### Technical Limitations

- **Simplified IK**: The IK solver is optimized for real-time editing, not production-quality animation
- **2-Bone Only**: Only supports 2-bone chains (upper/lower arm, upper/lower leg)
- **No Collision**: Trackers can intersect geometry and each other
- **No Constraints**: No rotation limits or angle constraints
- **Humanoid Only**: Requires VRM models with standard humanoid bone mapping

### Future Enhancements

Potential improvements (not yet implemented):

- Full-body IK with more bones
- Rotation handles for direct bone rotation control
- Pose presets (T-pose, A-pose, etc.)
- Animation recording from tracker movements
- Multi-model tracker systems
- Constraint system (rotation limits, look-at, etc.)

---

<a name="japanese"></a>
## 🎯 日本語

### 概要

バーチャルトラッカーシステムは、3D空間でVRMモデルをポージングするための11点トラッカーインターフェースを提供します。物理的なモーションキャプチャハードウェアを使用する代わりに、ユーザーはビューポート内の色付き球を操作してモデルのポーズを制御できます。

### トラッカーポイント

システムには以下の11のトラッカーポイントが含まれます:

| トラッカー | 色 | 身体部位 | 機能 |
|-----------|---|---------|------|
| Head（頭） | 赤 | 頭部 | 頭の位置と回転を制御 |
| Chest（胸） | オレンジ | 上半身 | 胸/脊椎の回転を制御 |
| Hips（腰） | 黄 | 骨盤 | ルート位置を制御（モデル全体を移動） |
| LeftHand（左手） | シアン | 左手首 | 左腕IKターゲットを制御 |
| RightHand（右手） | マゼンタ | 右手首 | 右腕IKターゲットを制御 |
| LeftElbow（左肘） | ライトブルー | 左肘 | 左腕IKのポールベクター |
| RightElbow（右肘） | ピンク | 右肘 | 右腕IKのポールベクター |
| LeftFoot（左足） | 緑 | 左足首 | 左脚IKターゲットを制御 |
| RightFoot（右足） | ライム | 右足首 | 右脚IKターゲットを制御 |
| LeftKnee（左膝） | ダークグリーン | 左膝 | 左脚IKのポールベクター |
| RightKnee（右膝） | イエローグリーン | 右膝 | 右脚IKのポールベクター |

### 機能

#### 1. 視覚表現
- 各トラッカーは3Dビューポート内に色付き球として表示
- トラッカーサイズは設定パネルで調整可能
- オプションのラベルで各球の上にトラッカー名を表示
- ラベルサイズはカスタマイズ可能

#### 2. ドラッグ&ドロップ操作
- **左クリックしてドラッグ**でトラッカーを移動
- ドラッグ中はカメラ操作が一時的に無効化
- トラッカーは3D空間内で自由に移動可能
- リアルタイムIK更新でポーズ変更がすぐに反映

#### 3. 位置の永続化
- トラッカー位置はブラウザのlocalStorageにモデルごとに自動保存
- 同じモデルを再読み込みすると位置が復元
- 各VRMモデルは独自の保存されたトラッカー位置を持つ

#### 4. リセット機能
- 「位置リセット」ボタンで全トラッカーを現在のボーン位置に整列
- 最初からやり直す場合やトラッカーのズレを修正する際に便利

#### 5. 設定の永続化
- トラッカー表示トグル状態が保存される
- ラベル表示トグル状態が保存される
- トラッカーサイズスライダー値が保存される
- ラベルサイズスライダー値が保存される
- すべての設定が次回セッションで復元される

### ユーザーインターフェース

#### トラッカーセクション（サイドバー）

設定サイドバー内に配置:

```
☑ バーチャルトラッカー      [表示切替]
☑ トラッカー名表示          [ラベル切替]
トラッカーサイズ: [====|====] [スライダー: 0.05-0.3]
ラベルサイズ: [====|====]     [スライダー: 0.5-2.0]
[位置リセット] [ボタン]
```

**コントロール:**
- **バーチャルトラッカーチェックボックス**: すべてのトラッカー球の表示/非表示
- **トラッカー名表示チェックボックス**: トラッカー名ラベルの表示/非表示
- **トラッカーサイズスライダー**: 球の半径を調整（デフォルト: 0.15）
- **ラベルサイズスライダー**: ラベルのフォントサイズを調整（デフォルト: 1.0）
- **位置リセットボタン**: すべてのトラッカーを現在のボーン位置にリセット

### 仕組み

#### インバースキネマティクス（IK）

トラッカーシステムは、VRMモデルのボーン回転を更新するために簡易的な2ボーンIKソルバーを使用:

1. **Hipsトラッカー**: 
   - モデルのルート位置を直接平行移動
   - アバター全体をトラッカーに合わせて移動

2. **ChestとHeadトラッカー**:
   - 親ボーンからトラッカーへの方向を計算
   - ボーンがトラッカーに向くように回転を適用

3. **ArmとLegトラッカー（Hand、Elbow、Foot、Knee）**:
   - ポールベクター付き2ボーンIKを使用
   - **ターゲット**（Hand/Foot）: エンドエフェクター位置
   - **ポール**（Elbow/Knee）: 曲がる方向を制御
   - 上部と下部のボーン回転を解決

#### 実装詳細

**ファイル**: `frontend/src/composables/useVirtualTrackers.js`

**主要関数:**
- `createTrackers()`: 独自の色を持つ11個のThree.jsメッシュ球を作成
- `updateTrackerPositions()`: 現在のボーン位置にトラッカーを配置
- `setupDragControls()`: レイキャスティングでドラッグ&ドロップを有効化
- `updateModelFromTrackers()`: IKを適用してボーン回転を更新
- `saveTrackerPositions()`: 位置をlocalStorageに保存
- `loadTrackerPositions()`: localStorageから位置を復元

**ストレージキー形式**:
```javascript
`trackerPositions_${modelName}`
```

### 使用例

#### 基本ワークフロー

1. **VRMモデルの読み込み**
   - ファイルピッカーまたはドラッグ&ドロップでVRMをインポート
   - モデルがビューポートに表示される

2. **バーチャルトラッカーの有効化**
   - 設定サイドバーを開く
   - 「バーチャルトラッカー」をチェック
   - ボーン位置に11個の色付き球が表示される

3. **初期位置の調整**
   - 「位置リセット」をクリックしてトラッカーをボーンに整列
   - すべてのトラッカーが見えることを確認

4. **モデルのポージング**
   - 任意のトラッカー球を左クリックしてドラッグ
   - モデルの対応する身体部位が追従
   - 肘/膝トラッカーを使用して曲がる方向を制御

5. **微調整**
   - 必要に応じてトラッカー/ラベルサイズを調整
   - より見やすくするためにラベルのオン/オフを切り替え

6. **ポーズの保存**
   - ドラッグリリース時に位置が自動保存
   - 後でモデルを再読み込みしてポーズを復元

### 高度なヒント

#### リアルなポージング

- **ポールベクターの使用**: 肘/膝トラッカーを配置して自然な腕/脚の曲がりを制御
- **胸を先に**: 手/足を配置する前に胸/腰を調整
- **対称性**: バランスの取れたポーズには、左右のトラッカー位置を鏡像配置

#### トラブルシューティング

| 問題 | 解決方法 |
|-----|---------|
| トラッカーが見えない | 「バーチャルトラッカー」チェックボックスが有効か確認 |
| トラッカーが間違った位置 | 「位置リセット」ボタンをクリック |
| トラッカーをドラッグできない | 左マウスボタンを使用しているか確認（右または中ボタンではない） |
| モデルがトラッカーに追従しない | VRMが標準的なヒューマノイドボーン構造を持っているか確認 |
| モデル変更時にトラッカーが消える | 期待される動作 - 各モデルは個別のトラッカーを持つ |

### キャッシュ削除の影響

「キャッシュ削除」メニューオプションを使用すると、以下のデータが削除されます:

- ✅ すべてのモデルの保存されたトラッカー位置
- ✅ トラッカー表示設定
- ✅ ラベル表示設定
- ✅ トラッカーサイズ設定
- ✅ ラベルサイズ設定

キャッシュ削除後、すべての設定は次回起動時にデフォルトにリセットされます。

### 技術的制限

- **簡易IK**: IKソルバーはリアルタイム編集用に最適化されており、プロダクション品質のアニメーションではありません
- **2ボーンのみ**: 2ボーンチェーン（上腕/前腕、大腿/下腿）のみサポート
- **衝突なし**: トラッカーはジオメトリや他のトラッカーと交差可能
- **制約なし**: 回転制限や角度制約なし
- **ヒューマノイドのみ**: 標準的なヒューマノイドボーンマッピングを持つVRMモデルが必要

### 今後の改善

潜在的な改善点（まだ実装されていません）:

- より多くのボーンを使用したフルボディIK
- 直接ボーン回転制御用の回転ハンドル
- ポーズプリセット（Tポーズ、Aポーズなど）
- トラッカー動きからのアニメーション記録
- マルチモデルトラッカーシステム
- 制約システム（回転制限、look-atなど）
