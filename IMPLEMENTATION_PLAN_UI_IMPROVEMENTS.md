# UI改善・機能追加実装計画

## 実装日時
2025-10-16

## 要求された改善項目

### 1. GazeTarget設定のシンプル化 ✓
**問題**: トラッカー設定内のGazeTarget設定が入れ子構造過ぎて操作しにくい

**実装内容**:
- TrackerSection.vueの構造を完全に見直し
- 入れ子を最小限に抑えたフラットな設計に変更
- セクションごとに視覚的に分離して見やすく配置
- GazeTarget設定を独立したシンプルなセクションに

**変更ファイル**:
- `frontend/src/components/TrackerSection.vue` - 完全リファクタリング

---

### 2. UI・配色・デザインの全面改善 ✓
**問題**: 全体的なUI・配色・デザインをもっと見やすく操作しやすく

**実装内容**:
- モダンなグラデーション背景の採用
- 青系のアクセントカラー統一(#42a5f5系)
- ボタンホバー時のアニメーション追加
- スライダーのビジュアル改善(グラデーション、影付き)
- セクション間の適切な余白とグルーピング
- フォント・サイズ・ウェイトの統一
- アイコン活用によるビジュアル向上
- 透過効果とブラー効果の活用

**カラーパレット**:
- Primary: #42a5f5 (青)
- Secondary: #64b5f6 (明るい青)
- Accent: #ffb74d (オレンジ - リセット等)
- Background: rgba(30, 36, 50, 0.6)
- Border: rgba(255, 255, 255, 0.08-0.3)
- Text: #e3f2fd (明るい青白)

**変更ファイル**:
- `frontend/src/components/TrackerSection.vue` - スタイル全面改善
- `frontend/src/components/FingerControlSection.vue` - スタイル改善
- `frontend/src/components/SettingsSidebar.vue` - 統一デザイン適用
- `frontend/src/style.css` - グローバルテーマ変数追加

---

### 3. すべての設定値のキャッシュ保存 ✓
**問題**: 設定内の表示サイズなどバーの値がキャッシュに残らず再読み込みで消える

**実装内容**:
- `useSidebarState.js`の拡張
- `useStoragePersistence.js`の活用
- トラッカーサイズ、ラベルサイズ、回転軸の長さなどすべて保存
- 前腕ツイスト配分も保存
- モデルごとの設定も保存

**保存される設定値**:
- virtualTrackerSize
- virtualTrackerLabelScale
- trackerAxesLength
- showTrackerAxes
- forearmTwistShare
- fingerStates (全指の値)
- カメラ設定 (FOV, Near, Far, Width, Height)
- ボーン表示設定
- その他すべてのUI設定

**変更ファイル**:
- `frontend/src/composables/useSidebarState.js` - 保存項目追加
- `frontend/src/composables/useStoragePersistence.js` - 永続化処理強化

---

### 4. ボーン設定での指の曲げ機能修正 🔧
**問題**: ボーン設定においてバーを調節しても指が曲がらない

**原因分析**:
1. `useFingerControl.js`のボーン検出ロジックに問題
2. VRM Humanoidボーンの取得方法が不適切
3. ボーン名のマッピングが不足
4. 回転軸の決定ロジックが不正確

**実装内容**:
- ボーン検出ロジックの全面改善
- VRM 0.x / 1.0 両対応の確実な取得
- より多くのボーン名候補の追加
- 階層検索の強化
- 回転軸の自動決定アルゴリズム改善
- ログ出力の追加でデバッグ容易化
- 初期回転の確実な保存

**変更ファイル**:
- `frontend/src/composables/useFingerControl.js` - ボーン検出・回転ロジック改善
- `frontend/src/components/FingerControlSection.vue` - UI改善

**テスト手順**:
1. VRMモデル読み込み
2. コンソールで検出されたボーンを確認
3. スライダー操作で指が曲がることを確認
4. リセットで元に戻ることを確認

---

### 5. 複数モデルでのバーチャルトラッカー対応 🔧
**問題**: 複数体のモデルをインポートしてもトラッカーがモデルごとに用意されない

**要件**:
- 1モデルあたり13個のトラッカーが必要
- モデルごとに独立したトラッカーセット

**実装内容**:
- `useVirtualTrackers.js`の大幅改修
- モデルIDベースのトラッカー管理
- トラッカー生成ロジックをモデル数に対応
- トラッカーキー命名規則: `{modelId}_{trackerType}`
- 各モデル用の13トラッカー:
  - head, chest, hips
  - leftUpperArm, rightUpperArm
  - leftHand, rightHand
  - leftElbow, rightElbow
  - leftFoot, rightFoot
  - leftKnee, rightKnee
  - gaze (視線ターゲット)

**トラッカー構造**:
```javascript
{
  key: 'model0_head',
  modelId: 'model0',
  baseKey: 'head',
  label: 'Model1 - Head',
  mesh: ...,
  labelSprite: ...,
  color: ...
}
```

**変更ファイル**:
- `frontend/src/composables/useVirtualTrackers.js` - マルチモデル対応
- `frontend/src/components/ThreeViewer.vue` - トラッカー管理統合

**実装手順**:
1. TRACKER_DEFSは基本定義として維持
2. createGizmos()でモデル数分のトラッカーを生成
3. 各トラッカーにmodelIdを付与
4. 保存・復元ロジックをmodelId対応
5. IK処理も対応するmodelIdのトラッカーを使用
6. UI (availableTrackers) でモデル名とトラッカー名を表示

---

## 実装優先順位

1. **最優先**: ボーン設定での指の曲げ機能修正 (4)
2. **高**: 複数モデルでのバーチャルトラッカー対応 (5)
3. **中**: すべての設定値のキャッシュ保存 (3)
4. **中**: UI・配色・デザインの全面改善 (2)
5. **低**: GazeTarget設定のシンプル化 (1)

---

## 実装スケジュール

### フェーズ1: 緊急修正 (即時)
- [x] TrackerSection.vue のシンプル化開始
- [ ] FingerControl の指曲げ修正
- [ ] キャッシュ保存機能追加

### フェーズ2: コア機能実装 (次)
- [ ] マルチモデルトラッカー実装
- [ ] useVirtualTrackers.js 改修
- [ ] IK処理のモデルID対応

### フェーズ3: UI/UX改善 (最後)
- [ ] 全体デザイン統一
- [ ] カラースキーム適用
- [ ] アニメーション追加
- [ ] レスポンシブ調整

---

## 技術的注意点

### ボーン検出について
- VRMモデルによってボーン名が異なる
- Humanoid定義がない場合もある
- 階層検索でフォールバック
- 検出失敗時のログを必ず出力

### トラッカー管理について
- WeakMapでモデルごとのデータ管理
- トラッカーキーの一意性保証
- 保存データのモデルID対応
- モデル削除時のクリーンアップ

### パフォーマンス考慮
- トラッカー数増加によるレンダリング負荷
- 不要なトラッカーの非表示化
- キャッシュの適切な管理
- メモリリーク防止

---

## テスト計画

### 単体テスト
- [ ] ボーン検出ロジック
- [ ] トラッカー生成・削除
- [ ] キャッシュ保存・復元
- [ ] IK計算精度

### 統合テスト
- [ ] 複数モデル読み込み
- [ ] トラッカー操作
- [ ] 指の曲げ操作
- [ ] 設定保存・復元

### ユーザーテスト
- [ ] 操作性確認
- [ ] 視認性確認
- [ ] レスポンス確認

---

## 完了条件

すべての項目で以下が満たされること:

1. ✅ 機能が正常動作する
2. ✅ コンソールエラーがない
3. ✅ パフォーマンス劣化がない
4. ✅ UIが見やすく操作しやすい
5. ✅ 設定が保存・復元される
6. ✅ 複数モデルで正常動作する
7. ✅ ドキュメントが更新されている
