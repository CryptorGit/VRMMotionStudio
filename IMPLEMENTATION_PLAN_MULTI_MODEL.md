# 複数モデル対応実装計画

## 実装概要
複数のモデルを同時にインポート・管理できるようにし、各モデルに対して個別の設定を適用可能にする。

## 実装項目

### 1. モデルタブの追加 ✓
- `settingsTabs.js`に「モデル」タブを追加済み
- ModelSectionコンポーネントを使用して表示・非表示・削除機能を提供

### 2. モーフ設定のモデル選択 ✓
- `MorphSection.vue`に既にモデル選択プルダウンが実装済み
- 各モデルのモーフ情報は保持される

### 3. バーチャルトラッカーのモデル対応
- 各モデルごとにトラッカー一式を作成
- トラッカー名に対象モデル名を追加（例: `Head (Model1)`）
- タイムライン上では全モデルのトラッカーを統合して表示

### 4. VRMアウトライン設定の初期化
- モデル読み込み時に`handleResetOutlineDefaults`を自動呼び出し
- キャッシュがある場合はキャッシュを優先
- なければデフォルト設定を適用してUIに反映

### 5. UI色の統一
- トラッカー設定のボタン色を統一
- 全体のテキスト色を統一
- 一貫したデザインシステムを適用

### 6. キー設定の整理
- 「キー設定」タイトル削除
- 「フレームにスナップ」「ループ再生」削除
- 「選択したキーを削除」削除
- トラッカー選択機能追加済み ✓
- カーブ色選択機能追加済み ✓

### 7. UpperArmトラッカーの位置反映
- `useVirtualTrackers.js`で`solveVRChatArmIK`関数を修正
- UpperArmトラッカーの位置のみボーンに反映
- 回転は反映しない

### 8. VRMアウトライン設定のモデル選択
- `DisplaySection.vue`にモデル選択プルダウン追加済み ✓
- 選択したモデルのアウトライン設定を変更可能

## 実装手順

1. SettingsSidebar.vueの更新
   - lookAtEnabledとavailableTrackersのpropsを追加
   - 対応するemitsを追加

2. ThreeViewer.vueの更新
   - availableTrackers computed propertyを追加
   - lookAtEnabledをSettingsSidebarに渡す
   - toggle-modelとremove-modelイベントハンドラーを追加

3. useVirtualTrackers.jsの更新
   - モデルごとのトラッカー管理機能を追加
   - UpperArmトラッカーのIKロジックを修正

4. DisplaySection.vueの更新
   - reset-outlineイベントにモデルインデックスを含める

5. TimelineEditorの更新
   - 複数モデルのトラッカーを統合表示

## 今後の作業
- [ ] SettingsSidebar.vueのpropsとemits更新
- [ ] ThreeViewer.vueのavailableTrackers追加
- [ ] ThreeViewer.vueのモデル管理イベント追加
- [ ] useVirtualTrackers.jsのマルチモデル対応
- [ ] UpperArmトラッカーのIK修正
- [ ] モデル読み込み時のアウトライン初期化
