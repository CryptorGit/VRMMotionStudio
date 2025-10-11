# 複数モデル対応実装の進捗状況

## 完了した実装

### 1. 基本構造の更新 ✓
- `settingsTabs.js` - 「モデル」タブを追加
- `SectionVisibility.vue` - ModelSectionコンポーネントの統合、availableTrackers propの追加
- `SettingsSidebar.vue` - lookAtEnabled, availableTrackers propsの追加、新しいemitsの追加
- `ThreeViewer.vue` - availableTrackers computed propertyの追加

### 2. モデル管理機能 ✓
- `ModelSection.vue` - 既存コンポーネントを利用
- `ThreeViewer.vue` - toggle-model, remove-modelイベントハンドラーの接続

### 3. モーフ設定 ✓
- `MorphSection.vue` - モデル選択プルダウン機能が既に実装済み

### 4. キー設定 ✓
- `KeySettingsSection.vue` - トラッカー選択と色選択機能が既に実装済み
- 不要な要素（「キー設定」タイトル、スナップ/ループ、削除ボタン）は既に削除済み

### 5. VRMアウトライン設定 ✓
- `DisplaySection.vue` - モデル選択プルダウンが既に実装済み
- `ThreeViewer.vue` - resetOutlineToDefaults関数がモデルインデックスを受け取るように修正

## 残りの実装

### 1. バーチャルトラッカーのマルチモデル対応
現在の状態: 単一モデル用に実装されている
必要な実装:
- [ ] 各モデルごとにトラッカーセットを作成
- [ ] トラッカー名にモデル名を追加（例: "Head (Model1)"）
- [ ] タイムライン上で全モデルのトラッカーを統合表示
- [ ] useVirtualTrackers.jsの大幅な改修が必要

### 2. UpperArmトラッカーの位置反映修正
現在の状態: 回転と位置の両方を反映
必要な実装:
- [ ] `useVirtualTrackers.js`の`solveVRChatArmIK`関数を修正
- [ ] UpperArmトラッカーの位置のみをボーンに反映
- [ ] 回転は反映しないようにする

### 3. モデル読み込み時のアウトライン初期化
現在の状態: 自動リセット機能が部分的に実装されている
必要な実装:
- [ ] キャッシュの優先的な復元
- [ ] キャッシュがない場合のデフォルト適用
- [ ] UIへの自動反映

### 4. UI色の統一
現在の状態: 部分的に統一されている
必要な実装:
- [ ] トラッカー設定のボタン色を見直し
- [ ] テキスト色の統一
- [ ] グローバルなデザインシステムの適用

## 技術的な課題

### バーチャルトラッカーのマルチモデル対応
これは最も複雑な実装です。以下の設計が必要です:

1. **データ構造の変更**
   ```javascript
   // 現在: trackerStates = { trackerKey: state }
   // 変更後: trackerStates = { modelId_trackerKey: state }
   ```

2. **トラッカーメッシュの生成**
   - 各モデルごとに14個のトラッカー（TRACKER_DEFS）を作成
   - 合計: モデル数 × 14 個のトラッカー

3. **タイムライン統合**
   - 同一トラッカータイプ（例：すべてのHead）を1つのキーにまとめる
   - または、モデルごとに別々のキーとして扱う

4. **IK計算の更新**
   - 各トラッカーがどのモデルに属するかを追跡
   - solveVRChatArmIK等の関数に正しいモデルのボーンを渡す

## 推奨される実装順序

### 段階1: UI統一とアウトライン初期化 (低リスク)
1. UI色の統一
2. アウトライン初期化の完全実装

### 段階2: UpperArm修正 (中リスク)
1. solveVRChatArmIK関数の修正
2. テストと検証

### 段階3: マルチモデルトラッカー対応 (高リスク)
1. データ構造の設計と変更
2. トラッカー生成ロジックの更新
3. IK計算の更新
4. タイムライン統合
5. 包括的なテスト

## ポート設定変更 ✓

開発環境でのポート競合を避けるため、ポート設定を変更しました:

### 変更内容
- **バックエンド**: `8080` → `8081`
- **フロントエンド**: `5173` (変更なし)

### 変更ファイル
- `backend/java/src/main/resources/application.properties` - `server.port=8081`
- `frontend/vite.config.js` - プロキシ先を `localhost:8081` に変更
- `README.md`, `backend/README.md`, `frontend/README.md` - ドキュメント更新

詳細は `PORT_CONFIGURATION.md` を参照してください。

## 次のステップ

低リスクの実装から始めることをお勧めします:
1. UI色統一
2. アウトライン初期化の改善
3. UpperArmトラッカー修正
4. （最後に）マルチモデルトラッカー対応

マルチモデルトラッカー対応は、大規模なリファクタリングが必要なため、
別の開発サイクルで実装することを推奨します。
