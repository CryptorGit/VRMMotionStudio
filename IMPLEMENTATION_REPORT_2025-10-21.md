# Implementation Report - Multi-Language and Export Enhancements
# 実装報告 - 多言語対応とエクスポート機能の強化

Date: October 21, 2025
日付: 2025年10月21日

## Summary / 概要

This implementation adds multi-language support beyond Japanese and English, updates the export functionality to include VRM bone data as JSON time series, and enhances timeline import/export with virtual tracker validation.

本実装では、日本語と英語以外の多言語対応を追加し、エクスポート機能をVRMボーンデータのJSON時系列形式に更新し、バーチャルトラッカー検証を含むタイムラインのインポート/エクスポート機能を強化しました。

## Changes Implemented / 実装された変更

### 1. Multi-Language Support / 多言語対応

**Languages Added / 追加された言語:**
- French (フランス語)
- German (ドイツ語)
- Spanish (スペイン語)
- Italian (イタリア語)
- Russian (ロシア語)
- Korean (韓国語)
- Chinese (中国語)

**Files Modified / 変更されたファイル:**
- `frontend/src/locales/fr.js` - French translations
- `frontend/src/locales/de.js` - German translations
- `frontend/src/locales/es.js` - Spanish translations
- `frontend/src/locales/it.js` - Italian translations
- `frontend/src/locales/ru.js` - Russian translations
- `frontend/src/locales/ko.js` - Korean translations
- `frontend/src/locales/zh.js` - Chinese translations

Each language file now includes proper translations for:
各言語ファイルに以下の適切な翻訳が含まれます:
- Menu items (メニュー項目)
- Tooltips (ツールチップ)
- Common UI elements (一般的なUI要素)
- Viewport controls (ビューポートコントロール)
- Tracker settings (トラッカー設定)

### 2. Export Functionality - VRM Bone Data / エクスポート機能 - VRMボーンデータ

**File Modified / 変更されたファイル:**
- `frontend/src/composables/usePoseControls.js`

**Changes / 変更内容:**

#### Export Current Pose / 現在のポーズのエクスポート
The export now includes detailed bone information for each model:
エクスポートには各モデルの詳細なボーン情報が含まれるようになりました:

```json
{
  "version": "1.0",
  "type": "vrm-pose",
  "format": "mmd-web",
  "exporter": "StellarMotion Studio",
  "exportDate": "2025-10-21T12:00:00.000Z",
  "models": [
    {
      "index": 0,
      "name": "Model Name",
      "visible": true,
      "url": "model.vrm",
      "bones": {
        "hips": {
          "position": [0, 1, 0],
          "rotation": [0, 0, 0, 1],
          "euler": [0, 0, 0]
        },
        "spine": { ... },
        "head": { ... }
      }
    }
  ],
  "fingers": { ... }
}
```

**Bone Data Structure / ボーンデータ構造:**
- `position`: [x, y, z] coordinates in world space / ワールド空間の[x, y, z]座標
- `rotation`: [x, y, z, w] quaternion / [x, y, z, w]クォータニオン
- `euler`: [x, y, z] Euler angles in degrees / 度数法の[x, y, z]オイラー角

#### Export Motion - Time Series / モーションのエクスポート - 時系列

Motion export now includes bone data as time series for each keyframe:
モーションエクスポートには各キーフレームのボーンデータの時系列が含まれます:

```json
{
  "version": "1.0",
  "type": "vrm-motion",
  "format": "mmd-web",
  "frameRate": 60,
  "startTime": 0,
  "endTime": 5,
  "duration": 5,
  "models": [
    {
      "index": 0,
      "name": "Model Name",
      "bones": {
        "hips": [
          {
            "frame": 0,
            "time": 0,
            "position": [0, 1, 0],
            "rotation": [0, 0, 0, 1],
            "euler": [0, 0, 0]
          },
          {
            "frame": 60,
            "time": 1,
            "position": [0, 1.1, 0],
            "rotation": [0, 0.1, 0, 0.995],
            "euler": [0, 11.5, 0]
          }
        ]
      }
    }
  ]
}
```

### 3. Timeline Import/Export - Virtual Tracker Support / タイムラインのインポート/エクスポート - バーチャルトラッカー対応

**File Modified / 変更されたファイル:**
- `frontend/src/components/ThreeViewer.vue`

#### Timeline Export / タイムラインのエクスポート

Timeline export now includes virtual tracker positions and rotations:
タイムラインのエクスポートにバーチャルトラッカーの位置と回転が含まれるようになりました:

```json
{
  "version": 2,
  "frameRate": 60,
  "keyframes": [ ... ],
  "virtualTrackers": [
    {
      "key": "head",
      "label": "Head",
      "position": [0, 1.6, 0],
      "rotation": [0, 0, 0],
      "rotationOrder": "XYZ",
      "rotationAxis": { ... }
    }
  ],
  "trackerCount": 13
}
```

#### Timeline Import with Validation / 検証付きタイムラインのインポート

Timeline import now validates tracker count before allowing import:
タイムラインのインポート時にトラッカー数を検証するようになりました:

**Validation Rules / 検証ルール:**
1. If the imported timeline contains virtual tracker data / インポートされたタイムラインにバーチャルトラッカーデータが含まれている場合
2. The current tracker count must match the imported tracker count / 現在のトラッカー数がインポートされたトラッカー数と一致する必要があります
3. If counts don't match, import is rejected with error message / 数が一致しない場合、エラーメッセージとともにインポートが拒否されます

**Error Message / エラーメッセージ:**
- English: "Timeline: Cannot import. Tracker count mismatch (current: X, file: Y)."
- Japanese: "タイムライン: インポートできません。トラッカーの数が一致しません。"

### 4. New Locale Entries / 新しいロケールエントリ

**Files Modified / 変更されたファイル:**
- `frontend/src/locales/en.js`
- `frontend/src/locales/ja.js`

**New notification message / 新しい通知メッセージ:**
- `timelineTrackerMismatch` - Shown when tracker count doesn't match during import
- トラッカー数が一致しない場合にインポート時に表示

## Technical Details / 技術詳細

### Bone Data Extraction / ボーンデータの抽出

The implementation extracts bone data from VRM models using the following approach:
以下のアプローチでVRMモデルからボーンデータを抽出します:

1. Access VRM humanoid bones through `model.userData.vrm.humanoid.humanBones`
2. Extract position (Vector3) and rotation (Quaternion) from each bone node
3. Convert quaternion to Euler angles for human-readable format
4. Store data in JSON-serializable format

### Quaternion to Euler Conversion / クォータニオンからオイラー角への変換

Uses standard conversion formula:
標準的な変換式を使用:
- Roll (X-axis) / ロール（X軸）
- Pitch (Y-axis) / ピッチ（Y軸）
- Yaw (Z-axis) / ヨー（Z軸）

Results are in degrees for easier understanding.
結果は理解しやすいように度数法で表示されます。

## Usage / 使用方法

### Exporting VRM Bone Data / VRMボーンデータのエクスポート

1. Load a VRM model / VRMモデルを読み込む
2. Set up the desired pose or animation / 希望のポーズまたはアニメーションを設定
3. Click "Export" in the menu / メニューの「エクスポート」をクリック
4. Single pose: Saves current bone positions and rotations / 単一ポーズ: 現在のボーンの位置と回転を保存
5. Animation: Saves time series of bone data for all keyframes / アニメーション: すべてのキーフレームのボーンデータの時系列を保存

### Exporting Timeline with Trackers / トラッカー付きタイムラインのエクスポート

1. Create virtual trackers and animate them / バーチャルトラッカーを作成してアニメーション
2. Click "Export Timeline" / 「タイムラインを保存」をクリック
3. File includes all tracker positions, rotations, and keyframe data / ファイルにはすべてのトラッカーの位置、回転、キーフレームデータが含まれます

### Importing Timeline / タイムラインのインポート

1. Ensure the current scene has the same number of virtual trackers / 現在のシーンが同じ数のバーチャルトラッカーを持つことを確認
2. Click "Import Timeline" / 「タイムラインを読み込む」をクリック
3. Select the timeline JSON file / タイムラインJSONファイルを選択
4. System validates tracker count and imports if matching / システムがトラッカー数を検証し、一致する場合にインポート

## Language Switching / 言語の切り替え

Use the language selector in the top menu bar to switch between languages.
トップメニューバーの言語セレクターを使用して言語を切り替えます。

All UI elements update immediately when language is changed.
言語が変更されると、すべてのUI要素が即座に更新されます。

## Compatibility / 互換性

- Export format is forward-compatible / エクスポート形式は前方互換性があります
- Timeline files with tracker data are backwards-compatible (old versions ignore tracker data) / トラッカーデータを含むタイムラインファイルは後方互換性があります（古いバージョンはトラッカーデータを無視します）
- All bone data uses standard Three.js coordinate system / すべてのボーンデータは標準的なThree.js座標系を使用

## Notes / 注意事項

1. Bone data extraction requires VRM model with humanoid bones / ボーンデータの抽出にはヒューマノイドボーンを持つVRMモデルが必要です
2. Tracker count validation only applies when importing files with tracker data / トラッカー数の検証は、トラッカーデータを含むファイルをインポートする場合にのみ適用されます
3. Euler angles use XYZ rotation order / オイラー角はXYZ回転順序を使用します
4. Language files fall back to English for untranslated strings / 言語ファイルは未翻訳の文字列に対して英語にフォールバックします

## Testing Recommendations / テストの推奨事項

1. Test export with single pose and verify bone data / 単一ポーズでエクスポートをテストし、ボーンデータを検証
2. Test export with animation and verify time series / アニメーションでエクスポートをテストし、時系列を検証
3. Test timeline import with matching tracker count / 一致するトラッカー数でタイムラインのインポートをテスト
4. Test timeline import with mismatched tracker count (should fail) / 不一致のトラッカー数でタイムラインのインポートをテスト（失敗するはず）
5. Test language switching across all supported languages / すべてのサポートされている言語で言語の切り替えをテスト
6. Verify all UI elements are properly translated / すべてのUI要素が適切に翻訳されていることを確認

## Future Enhancements / 今後の機能強化

- Import VRM bone data to apply poses / VRMボーンデータをインポートしてポーズを適用
- Support for morphing (blendshape) export / モーフィング（ブレンドシェイプ）エクスポートのサポート
- Additional export formats (BVH, FBX) / 追加のエクスポート形式（BVH、FBX）
- Automatic tracker matching by name / 名前による自動トラッカーマッチング

---

End of Report / 報告終了
