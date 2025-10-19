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

export default messages
