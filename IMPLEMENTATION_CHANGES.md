# 実装変更まとめ

## 完了した機能

### 1. キー設定セクションの改善 ✅
- 「キー設定」タイトルを削除
- 「フレームにスナップ」「ループ再生」トグルを削除
- 「選択したキーを削除」ボタンを削除
- バーチャルトラッカー選択ドロップダウンを追加
- イージングカーブ色選択機能を追加
- `KeySettingsSection.vue`に`availableTrackers` propを追加

### 2. モーフ設定の改善 ✅
- モデル選択プルダウンメニューを追加
- 「更新」ボタンの左側に配置
- 選択したモデルのモーフ情報を表示
- 他のモデルのモーフ情報は保持

### 3. 表示設定の改善 ✅
- VRMアウトライン設定に対象モデル選択を追加
- モデルごとにアウトライン設定を変更可能
- スタイルの統一（色とUI要素）

### 4. モデル管理の改善 ✅
- `ModelList.vue`のスタイルを大幅に改善
- 表示・非表示チェックボックスのスタイルを統一
- 削除ボタンのスタイルを統一
- 各モデル項目のカード型デザイン

### 5. UI色の統一 ✅
- すべてのセレクト要素のスタイルを統一
- ボタンの色とホバー効果を統一
- 入力フィールドのスタイルを統一
- `TrackerSection.vue`のスタイルは既に統一済み

### 6. トラッカーリストの伝搬 ✅
- `TRACKER_DEFS`から`availableTrackers` computedを作成
- `ThreeViewer.vue` → `SettingsSidebar.vue` → `SectionVisibility.vue` → `KeySettingsSection.vue`へ伝搬
- トラッカー選択UIで使用可能

## 部分的に実装/要追加実装の機能

### 7. バーチャルトラッカーのモデルごと生成 🔄
**現状**: トラッカーは全モデル共通
**要実装**: 
- 各モデルごとに独立したトラッカーセットを作成
- トラッカーキーにモデルIDを追加（例: `head_model1`, `head_model2`）
- `useVirtualTrackers.js`の大規模リファクタリングが必要

**実装場所**: `frontend/src/composables/useVirtualTrackers.js`

```javascript
// 例: モデルごとのトラッカー生成
function createTrackersForModel(modelId) {
  return TRACKER_DEFS.map(def => ({
    ...def,
    key: `${def.key}_${modelId}`,
    label: `${def.label} (${modelName})`,
    modelId
  }))
}
```

### 8. タイムラインでの全トラッカー統合 🔄
**要実装**:
- すべてのモデルのトラッカーを1つのキーフレームにまとめる
- タイムラインエディターでの表示を統合
- キーフレームデータ構造の変更

**実装場所**: `frontend/src/composables/useTimeline.js`

### 9. VRMアウトライン初期化 🔄
**現状**: モデル読み込み時に自動リセットは実装済み
**確認ポイント**:
- `ThreeViewer.vue`の`watch(models, ...)`で`resetOutlineToDefaults()`を呼び出し済み
- 初回ロード時に正しく動作しているか確認が必要

### 10. UpperArmトラッカーの位置反映 🔄
**現状**: 回転は反映しないが、位置は反映すべき
**要実装**:
- `useVirtualTrackers.js`の`solveVRChatArmIK`関数を修正
- UpperArmトラッカーの位置を肩ボーンの制約に従って反映

**実装場所**: `frontend/src/composables/useVirtualTrackers.js`
- `solveVRChatArmIK`関数内
- UpperArmトラッカーの位置制約処理を追加

## 設定ファイルの変更

### 変更されたファイル
1. `frontend/src/components/KeySettingsSection.vue` - キー設定UI
2. `frontend/src/components/MorphSection.vue` - モーフ設定UI
3. `frontend/src/components/DisplaySection.vue` - 表示設定UI
4. `frontend/src/components/ModelList.vue` - モデルリスト
5. `frontend/src/components/SettingsSidebar.vue` - サイドバー
6. `frontend/src/components/SectionVisibility.vue` - セクション表示管理
7. `frontend/src/components/ThreeViewer.vue` - メインビューア

## 今後の実装推奨事項

### 優先度: 高
1. **モデルごとのトラッカー生成**
   - 複数モデル対応の基礎となる機能
   - `useVirtualTrackers.js`の全面的な書き換えが必要

2. **タイムライン統合**
   - すべてのトラッカーを1つのキーにまとめる
   - データ構造の設計が重要

### 優先度: 中
3. **UpperArmの位置反映修正**
   - IKソルバーの調整が必要
   - テストケースの作成

4. **アウトライン設定の詳細確認**
   - 初回ロード時の動作確認
   - キャッシュとの整合性確認

## 技術的な課題

### モデルごとのトラッカー実装の課題
1. **データ構造**: 現在のトラッカーシステムは単一モデル前提
2. **状態管理**: 複数モデルのトラッカー状態を効率的に管理
3. **パフォーマンス**: モデル数×トラッカー数の計算負荷
4. **UI/UX**: どのモデルのどのトラッカーを操作しているか明確に

### タイムライン統合の課題
1. **キーフレーム構造**: モデル×トラッカーの組み合わせを表現
2. **互換性**: 既存のタイムラインデータとの互換性
3. **エクスポート**: JSON形式での適切な表現

## 推奨される次のステップ

1. モデルごとのトラッカー生成機能の詳細設計
2. タイムラインデータ構造の再設計
3. UpperArm位置反映のテスト実装
4. 統合テストの実施
