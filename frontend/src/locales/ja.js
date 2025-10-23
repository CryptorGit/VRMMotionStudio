import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'Japanese' }
messages.languages = {
  en: '英語',
  ja: '日本語',
  ko: '韓国語',
  zh: '中国語',
  ru: 'ロシア語',
  fr: 'フランス語',
  es: 'スペイン語',
  de: 'ドイツ語',
  it: 'イタリア語'
}

// 日本語固有の翻訳
messages.brand = {
  title: 'StellarMotion Studio',
  beta: 'ベータ',
  betaAria: 'ベータ版'
}

messages.menu = {
  import: 'インポート',
  importAudio: '音声を読み込む',
  export: 'エクスポート',
  captureImage: '画像キャプチャ',
  captureVideo: 'ビデオキャプチャ',
  clearCache: 'キャッシュをクリア',
  exportProject: 'プロジェクトを保存',
  importProject: 'プロジェクトを読み込む',
  captions: 'キャプション',
  timelineImport: 'タイムラインを読み込む',
  timelineExport: 'タイムラインを保存'
}

messages.menuTooltips = {
  import: '3Dモデルを読み込む',
  importAudio: 'MP3音声ファイルを読み込む',
  export: '現在のポーズをエクスポート',
  captureImage: '画像をレンダリングして保存',
  captureVideo: 'ビデオをレンダリングして保存',
  clearCache: '読み込んだモデルと設定をリセット',
  exportProject: 'キャッシュをプロジェクトファイルとして保存',
  importProject: 'プロジェクトファイルからキャッシュを復元',
  captionsOn: 'キャプションをオフにする',
  captionsOff: 'キャプションをオンにする',
  timelineImport: '保存したタイムラインを読み込む',
  timelineExport: '現在のタイムラインを保存',
  timelineExportDisabled: '保存可能なタイムラインがありません'
}

messages.common = {
  on: 'オン',
  off: 'オフ',
  reset: 'リセット',
  delete: '削除'
}

messages.viewport = {
  mode: 'モード',
  viewMode: 'ビューモード',
  cameraMode: 'カメラモード',
  undo: '元に戻す',
  redo: 'やり直す',
  renderCam: 'レンダーカメラ',
  cameraHint: '左ドラッグ: パン | 右ドラッグ: チルト | ホイール: ドリー',
  trackerHint: '左ドラッグ: 移動 | Shift: 微調整',
  roll: 'ロール',
  area: 'ビューポートエリア',
  modeToggle: 'ビューモード切替'
}

messages.tabs = {
  lighting: 'ライティング',
  lightingDesc: 'ライトと環境光を調整',
  model: 'モデル',
  modelDesc: 'モデルの表示と管理',
  display: '表示',
  displayDesc: 'ボーンとトラッカーの表示管理',
  trackers: 'トラッカー',
  trackersDesc: 'バーチャルトラッカー設定',
  bones: 'ボーン',
  bonesDesc: '指のコントロール',
  keys: 'キー',
  keysDesc: 'キーフレームの詳細とイージング',
  audio: '音声',
  audioDesc: '音声設定',
  camera: 'カメラ',
  cameraDesc: 'レンダーカメラと出力設定',
  morph: 'モーフ',
  morphDesc: '表情 / シェイプキーコントロール'
}

messages.tracker = {
  enable: 'トラッカーを有効化',
  loadModelFirst: '先にモデルを読み込んでください',
  resetPosition: '位置をリセット',
  resetRotation: '回転をリセット',
  resetPositionTitle: '初期位置にリセット',
  resetRotationTitle: '初期回転にリセット',
  display: 'トラッカーを表示',
  showLabels: 'ラベルを表示',
  trackerSize: 'トラッカーサイズ',
  labelSize: 'ラベルサイズ',
  showAxes: '回転軸を表示',
  axesLength: '軸の長さ',
  forearmTwist: '前腕ツイスト配分',
  settings: '設定',
  settingsTitle: (name) => `${name}の設定`,
  position: '位置',
  rotation: '回転',
  rotationOrder: '回転順序',
  rotationAxisDefault: 'デフォルト回転軸',
  axisScaleX: 'スケール X',
  axisScaleY: 'スケール Y',
  axisScaleZ: 'スケール Z',
  positionX: '位置 X',
  positionY: '位置 Y',
  positionZ: '位置 Z',
  pitch: 'ピッチ',
  yaw: 'ヨー',
  roll: 'ロール',
  selectedTracker: '選択中のトラッカー',
  orientation: '向き'
}

messages.finger = {
  selectModel: 'モデルを選択',
  leftHand: '左手',
  rightHand: '右手',
  resetAll: 'すべてリセット',
  handAxisTitle: '手の回転軸',
  handAxisLeft: '左手',
  handAxisRight: '右手',
  axisMixed: '混合',
  axisThumbAuto: 'Y+ (自動)',
  axisZPlusAuto: 'Z+ (自動)',
  axisXPlus: 'X+',
  axisXMinus: 'X-',
  axisYPlus: 'Y+',
  axisYMinus: 'Y-',
  axisZPlus: 'Z+',
  axisZMinus: 'Z-',
  leftThumb: '親指',
  leftIndex: '人差し指',
  leftMiddle: '中指',
  leftRing: '薬指',
  leftLittle: '小指',
  rightThumb: '親指',
  rightIndex: '人差し指',
  rightMiddle: '中指',
  rightRing: '薬指',
  rightLittle: '小指'
}

messages.audio = {
  title: '音声',
  noDuration: '音声が読み込まれていません。メニューからMP3をインポートしてください。',
  filename: 'ファイル名',
  duration: '長さ',
  sampleRate: 'サンプルレート',
  channels: 'チャンネル',
  remove: '音声を削除',
  mono: 'モノラル',
  stereo: 'ステレオ'
}

messages.timeline = {
  area: 'タイムラインエリア'
}

messages.timelinePanel = {
  title: 'タイムライン',
  jumpStart: '先頭へジャンプ',
  jumpEnd: '末尾へジャンプ',
  play: '再生',
  pause: '一時停止',
  addAll: 'すべてのトラッカーのキーを追加',
  addKey: 'キーフレームを追加',
  trackersHeader: 'トラッカー'
}

messages.statusBar = {
  placeholder: '追加情報がここに表示されます',
  frame: 'フレーム {current}/{end} ({fps}fps)',
  cacheStandard: 'キャッシュ: 標準ストレージ',
  cacheGuardPersisted: '永続化済み',
  cacheGuardVolatile: '未永続化',
  cacheUsage: 'キャッシュ {usage} ({guard})',
  cacheUsageDetailed: 'キャッシュ {usage} / {quota} ({guard} {percent}%)'
}

messages.aria = {
  mainMenu: 'メインメニュー',
  settingsTabs: '設定カテゴリ',
  settingsArea: '設定エリア'
}

// 追加の翻訳
messages.model = {
  lookAtEnabled: 'LookAtを有効化',
  noModels: 'モデルが読み込まれていません'
}

messages.display = {
  grid: 'グリッドを表示',
  lightMarker: 'ライトマーカーを表示',
  markerColor: 'マーカーの色',
  bones: 'ボーン',
  extendedBones: '拡張ボーン',
  colliderNodes: 'コライダーノード',
  nonDeformingBones: '非変形ボーン',
  highlightConstraint: '制約を強調',
  physicalBones: '物理ボーン',
  otherBones: 'その他のボーン',
  boneDotSize: 'ボーンドットサイズ',
  boneLabelScale: 'ボーンラベルスケール',
  boneNames: 'ボーン名を表示',
  outline: 'アウトライン',
  outlineWidth: 'アウトライン幅',
  outlineColor: 'アウトラインの色',
  outlineSettings: 'VRMアウトライン設定',
  targetModel: '対象モデル',
  reset: 'リセット',
  load: '読み込む'
}

messages.lightingPanel = {
  ambientColor: '環境光の色',
  ambientIntensity: '環境光の強度',
  directionalTitle: 'ディレクショナルライト',
  directionalDescription: '角度で位置と向きを調整',
  color: '色',
  intensity: '強度',
  positionX: '位置 X',
  positionY: '位置 Y',
  positionZ: '位置 Z',
  azimuth: '方位角 (°)',
  elevation: '仰角 (°)'
}

messages.physics = {
  springBoneEnabled: 'スプリングボーンを有効化'
}

messages.keys = {
  selected: '選択中',
  items: '項目',
  multiSelect: '複数選択',
  selectPrompt: 'キーフレームを選択して設定を編集',
  noSelection: 'キーフレームが選択されていません。タイムラインでキーを選択してください。',
  multiSelectHint: 'ヒント: Shiftキーを押しながら複数のキーを選択できます。',
  selectModel: 'モデルを選択',
  allModels: 'すべてのモデル',
  selectModelHint: 'モデルを選択するとトラッカー別のカーブを編集できます。',
  targetTracker: '対象トラッカー',
  allDefault: 'すべて (デフォルトカーブ)'
}

messages.camera = {
  resolution: '解像度',
  width: '幅',
  height: '高さ',
  presets: 'プリセット',
  customPreset: 'カスタム',
  presetFhd: '1920 × 1080 (FHD)',
  presetQhd: '2560 × 1440 (QHD)',
  presetUhd: '3840 × 2160 (4K UHD)',
  presetSquare: '1080 × 1080 (正方形)',
  presetHd: '1280 × 720 (HD)',
  parameters: 'パラメータ',
  fovVertical: '垂直視野角',
  near: 'ニアクリップ',
  far: 'ファークリップ',
  wheelSensitivity: 'ホイール感度',
  translateSensitivity: 'パン感度',
  rotateSensitivity: 'オービット感度',
  showHelper: 'レンダーカメラヘルパーを表示'
}

messages.morph = {
  reload: '再読み込み'
}

messages.timelineEditor = {
  loop: 'ループ',
  loopTooltip: 'ループ再生を切り替え',
  fit: '範囲をフィット',
  fitTooltip: 'タイムライン全体を表示',
  addKey: 'キー追加',
  addKeyTooltip: '現在のフレームにキーフレームを追加',
  copy: 'コピー',
  copyTooltip: '選択したキーフレームをコピー',
  paste: '貼り付け',
  pasteTooltip: '現在の位置にキーフレームを貼り付け',
  delete: '削除',
  deleteTooltip: '選択したキーフレームを削除',
  jumpStartLabel: '開始',
  jumpStartTooltip: '開始フレームへジャンプ',
  play: '再生',
  playTooltip: '再生',
  pause: '一時停止',
  pauseTooltip: '一時停止',
  jumpEndLabel: '終了',
  jumpEndTooltip: '終了フレームへジャンプ',
  rangeStartLabel: '開始',
  rangeEndLabel: '終了',
  clear: 'クリア',
  clearTooltip: 'タイムラインをクリア'
}

messages.timelineCurveEditor = {
  title: 'イージングカーブ',
  reset: 'リセット',
  empty: '2つ以上のキーを選択してカーブを編集してください。',
  handleLabel: 'カーブコントロールポイント',
  inLabel: 'イン',
  outLabel: 'アウト'
}

messages.notifications = {
  cacheSaved: 'キャッシュ: 保存されました。',
  cacheFailed: 'キャッシュ: 保存に失敗しました。ブラウザのストレージ設定を確認してください。',
  cacheCleared: 'キャッシュ: クリアされました。',
  cacheReset: 'キャッシュ: キャッシュとタイムラインをリセットしました。',
  cachePersistenceEnabled: 'キャッシュ: 永続化が有効になりました。',
  cachePersistenceFailed: 'キャッシュ: 永続化が利用できません。ブラウザのストレージ設定を確認してください。',
  projectExported: 'プロジェクト: エクスポートしました。',
  projectExportFailed: 'プロジェクト: エクスポートに失敗しました。',
  projectUploadedToServer: 'プロジェクト: サーバーにアップロードしました。',
  projectImporting: 'プロジェクト: インポート中…',
  projectImported: 'プロジェクト: インポートしました。',
  projectImportFailed: 'プロジェクト: インポートに失敗しました。',
  projectImportEmpty: 'プロジェクト: モデルが見つかりませんでした。',
  modelLoaded: 'モデルが読み込まれました。',
  modelLoadFailed: 'モデルの読み込みに失敗しました。',
  audioLoaded: '音声が読み込まれました。',
  audioLoadFailed: '音声の読み込みに失敗しました。',
  audioLoading: '音声: 読み込み中…',
  audioRemoved: '音声: MP3を削除しました。',
  imageCaptured: '画像をキャプチャしました。',
  imageExportNoRenderer: '画像エクスポート: レンダラーが初期化されていません。',
  imageExportInProgress: '画像エクスポート: 処理中…',
  imageExportPreparing: '画像エクスポート: 準備中…',
  imageExportCancelled: '画像エクスポート: キャンセルされました。',
  imageExportSaveFailed: '画像エクスポート: 保存に失敗しました。',
  imageExportFailed: '画像エクスポート: 失敗しました。',
  videoCaptured: 'ビデオをキャプチャしました。',
  videoExportNoRenderer: 'ビデオエクスポート: レンダラーが初期化されていません。',
  videoExportNoKeyframes: 'ビデオエクスポート: タイムラインにキーフレームがありません。',
  videoExportInProgress: 'ビデオエクスポート: 処理中…',
  videoExportPreparing: 'ビデオエクスポート: 準備中…',
  videoExportSaving: 'ビデオエクスポート: 録画完了、保存中…',
  videoExportCancelled: 'ビデオエクスポート: キャンセルされました。',
  videoExportSaveFailed: 'ビデオエクスポート: 保存に失敗しました。',
  videoExportFailed: 'ビデオエクスポート: 失敗しました。',
  videoExportSaved: 'ビデオエクスポート: {name}として保存しました。',
  timelineNotReady: 'タイムライン: 初期化されていません。',
  timelineAddFailed: 'タイムライン: キーフレームの追加に失敗しました。',
  timelineKeyAdded: 'タイムライン: 現在のポーズをキーフレームとして追加しました。',
  timelineCopySelect: 'タイムライン: コピーするキーを選択してください。',
  timelineCopyFailed: 'タイムライン: キーフレームのコピーに失敗しました。',
  timelineCopySuccess: 'タイムライン: {count}個のキーフレームをコピーしました。',
  timelinePasteEmpty: 'タイムライン: 貼り付けるキーフレームがありません。',
  timelinePasteFailed: 'タイムライン: キーフレームの貼り付けに失敗しました。',
  timelinePasteSuccess: 'タイムライン: {count}個のキーフレームを貼り付けました。',
  timelineLoadMissing: 'タイムライン: 読み込みに失敗しました（入力が見つかりません）。',
  timelineLoadFailed: 'タイムライン: 読み込みに失敗しました。',
  timelineParseFailed: 'タイムライン: JSONのパースに失敗しました。',
  timelineExported: 'タイムライン: エクスポートしました。',
  timelineExportFailed: 'タイムライン: エクスポートに失敗しました。',
  timelineReset: 'タイムライン: リセットしました。',
  timelineResetFailed: 'タイムライン: リセットに失敗しました。',
  timelineFileLoaded: 'タイムライン: {name}を読み込みました。',
  timelineTrackerMismatch: 'タイムライン: インポートできません。トラッカーの数が一致しません。',
  uiLayoutLoaded: 'UI: Blenderスタイルのレイアウトを読み込みました。',
  trackersReset: 'トラッカー: バーチャルトラッカーをリセットしました。',
  errorUnknown: '不明なエラーが発生しました。',
  errorRaised: 'エラー: {message}',
  unhandledRejection: '未処理のPromise拒否。'
}

export default messages
