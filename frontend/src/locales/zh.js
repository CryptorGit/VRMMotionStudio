export default {
  meta: { name: 'Chinese' },

  languages: {
    en: '英语',
    ja: '日语',
    ko: '韩语',
    zh: '中文',
    ru: '俄语',
    fr: '法语',
    es: '西班牙语',
    de: '德语',
    it: '意大利语'
  },

  brand: {
    title: 'VRM Motion Studio',
    beta: '测试版',
    betaAria: '测试版本'
  },

  menu: {
    import: '导入',
    importAudio: '导入音频',
    export: '导出',
    captureImage: '捕获图像',
    captureVideo: '捕获视频',
    clearCache: '清除缓存',
    captions: '字幕',
    timelineImport: '导入时间线',
    timelineExport: '导出时间线'
  },

  menuTooltips: {
    import: '加载3D模型',
    importAudio: '加载MP3音频文件',
    export: '导出当前姿势',
    captureImage: '渲染并保存图像',
    captureVideo: '渲染并保存视频',
    clearCache: '重置已加载的模型和设置',
    captionsOn: '关闭字幕',
    captionsOff: '打开字幕',
    timelineImport: '导入已保存的时间线',
    timelineExport: '保存当前时间线',
    timelineExportDisabled: '没有可保存的时间线'
  },

  menuControls: {
    lighting: '照明',
    display: '显示',
    physics: '物理',
    morph: '变形目标',
    models: '模型',
    autoRestore: '自动恢复时间线'
  },

  common: {
    on: '开',
    off: '关',
    reset: '重置',
    delete: '删除'
  },

  viewport: {
    mode: '模式',
    viewMode: '视图模式',
    cameraMode: '相机模式',
    undo: '撤销',
    redo: '重做',
    renderCam: '渲染相机',
    cameraHint: '左键拖动：平移 | 右键拖动：倾斜 | 滚轮：缩放',
    trackerHint: '左键拖动：移动 | Shift：微调',
    roll: '滚转',
    area: '视口区域',
    modeToggle: '切换视图模式'
  },

  tabs: {
    lighting: '照明',
    lightingDesc: '调整照明和环境',
    model: '模型',
    modelDesc: '显示和管理模型',
    display: '显示',
    displayDesc: '管理骨骼和追踪器显示',
    trackers: '追踪器',
    trackersDesc: '虚拟追踪器设置',
    bones: '骨骼',
    bonesDesc: '手指控制',
    keys: '关键帧',
    keysDesc: '关键帧详情和缓动',
    audio: '音频',
    audioDesc: '音频设置',
    camera: '相机',
    cameraDesc: '渲染相机和输出设置',
    morph: '变形',
    morphDesc: '表情/形状键控制'
  },

  model: {
    lookAtEnabled: '启用 LookAt',
    noModels: '未加载模型'
  },

  display: {
    grid: '显示网格',
    lightMarker: '显示光源标记',
    markerColor: '标记颜色',
    bones: '骨骼',
    extendedBones: '扩展骨骼',
    colliderNodes: '碰撞器节点',
    nonDeformingBones: '非变形骨骼',
    highlightConstraint: '突出显示约束',
    physicalBones: '物理骨骼',
    otherBones: '其他骨骼',
    boneDotSize: '骨骼点大小',
    boneLabelScale: '骨骼标签缩放',
    boneNames: '显示骨骼名称',
    outline: '轮廓',
    outlineWidth: '轮廓宽度',
    outlineColor: '轮廓颜色',
    outlineSettings: 'VRM轮廓设置',
    targetModel: '目标模型',
    reset: '重置',
    load: '加载'
  },

  lightingPanel: {
    ambientColor: '环境色',
    ambientIntensity: '环境强度',
    directionalTitle: '方向光',
    directionalDescription: '使用角度调整位置和方向',
    color: '颜色',
    intensity: '强度',
    positionX: '位置 X',
    positionY: '位置 Y',
    positionZ: '位置 Z',
    azimuth: '方位角 (°)',
    elevation: '仰角 (°)'
  },

  tracker: {
    enable: '启用追踪器',
    loadModelFirst: '请先加载模型',
    resetPosition: '重置位置',
    resetRotation: '重置旋转',
    resetPositionTitle: '重置到初始位置',
    resetRotationTitle: '重置到初始旋转',
    display: '显示追踪器',
    showLabels: '显示标签',
    trackerSize: '追踪器大小',
    labelSize: '标签大小',
    showAxes: '显示旋转轴',
    axesLength: '轴长度',
    forearmTwist: '前臂扭转共享',
    settings: '设置',
    settingsTitle: (name) => `${name}设置`,
    position: '位置',
    rotation: '旋转',
    rotationOrder: '旋转顺序',
    rotationAxisDefault: '默认旋转轴',
    axisScaleX: '缩放 X',
    axisScaleY: '缩放 Y',
    axisScaleZ: '缩放 Z',
    positionX: '位置 X',
    positionY: '位置 Y',
    positionZ: '位置 Z',
    pitch: '俯仰',
    yaw: '偏航',
    roll: '滚转',
    selectedTracker: '选定的追踪器',
    orientation: '方向'
  },

  physics: {
    springBoneEnabled: '启用 SpringBone'
  },

  finger: {
    selectModel: '选择模型',
    leftHand: '左手',
    rightHand: '右手',
    resetAll: '重置所有手指',
    handAxisTitle: '手部旋转轴',
    handAxisLeft: '左手',
    handAxisRight: '右手',
    axisMixed: '混合',
    axisThumbAuto: 'Y+ (自动)',
    axisZPlusAuto: 'Z+ (自动)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: '拇指',
    leftIndex: '食指',
    leftMiddle: '中指',
    leftRing: '无名指',
    leftLittle: '小指',
    rightThumb: '拇指',
    rightIndex: '食指',
    rightMiddle: '中指',
    rightRing: '无名指',
    rightLittle: '小指'
  },

  keys: {
    selected: '已选择',
    items: '项',
    multiSelect: '多选',
    selectPrompt: '选择关键帧以编辑其设置',
    noSelection: '未选择关键帧。在时间线中选择关键帧。',
    multiSelectHint: '提示：按住 Shift 键选择多个关键帧。',
    selectModel: '选择模型',
    allModels: '所有模型',
    selectModelHint: '选择模型以编辑特定追踪器的曲线。',
    targetTracker: '目标追踪器',
    allDefault: '全部（默认曲线）'
  },

  audio: {
    title: '音频',
    noDuration: '未加载音频。通过菜单导入MP3。',
    filename: '文件名',
    duration: '时长',
    sampleRate: '采样率',
    channels: '声道',
    remove: '删除音频',
    mono: '单声道',
    stereo: '立体声'
  },

  camera: {
    resolution: '分辨率',
    width: '宽度',
    height: '高度',
    presets: '预设',
    customPreset: '自定义',
    presetFhd: '1920 × 1080 (FHD)',
    presetQhd: '2560 × 1440 (QHD)',
    presetUhd: '3840 × 2160 (4K UHD)',
    presetSquare: '1080 × 1080 (正方形)',
    presetHd: '1280 × 720 (HD)',
    parameters: '参数',
    fovVertical: '垂直视野',
    near: '近裁剪面',
    far: '远裁剪面',
    wheelSensitivity: '滚轮灵敏度',
    translateSensitivity: '平移灵敏度',
    rotateSensitivity: '旋转灵敏度',
    showHelper: '显示渲染相机辅助器'
  },

  morph: {
    reload: '重新加载'
  },

  timeline: {
    area: '时间线区域'
  },

  timelinePanel: {
    title: '时间线',
    jumpStart: '跳到开头',
    jumpEnd: '跳到结尾',
    play: '播放',
    pause: '暂停',
    addAll: '为所有追踪器添加关键帧',
    addKey: '添加关键帧',
    trackersHeader: '追踪器'
  },

  timelineEditor: {
    loop: '循环',
    loopTooltip: '切换循环播放',
    fit: '适应范围',
    fitTooltip: '显示整个时间线',
    addKey: '添加关键帧',
    addKeyTooltip: '在当前帧添加关键帧',
    copy: '复制',
    copyTooltip: '复制选定的关键帧',
    paste: '粘贴',
    pasteTooltip: '在当前位置粘贴关键帧',
    delete: '删除',
    deleteTooltip: '删除选定的关键帧',
    jumpStartLabel: '开始',
    jumpStartTooltip: '跳到起始帧',
    play: '播放',
    playTooltip: '播放',
    pause: '暂停',
    pauseTooltip: '暂停',
    jumpEndLabel: '结束',
    jumpEndTooltip: '跳到结束帧',
    rangeStartLabel: '开始',
    rangeEndLabel: '结束',
    clear: '清除',
    clearTooltip: '清除时间线'
  },

  timelineCurveEditor: {
    title: '缓动曲线',
    reset: '重置',
    empty: '选择两个或更多关键帧以编辑曲线。',
    handleLabel: '曲线控制点',
    inLabel: '入',
    outLabel: '出'
  },

  statusBar: {
    placeholder: '此处显示附加信息',
    frame: '帧 {current}/{end} ({fps}fps)',
    cacheStandard: '缓存：标准存储',
    cacheGuardPersisted: '已持久化',
    cacheGuardVolatile: '未持久化',
    cacheUsage: '缓存 {usage} ({guard})',
    cacheUsageDetailed: '缓存 {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: '缓存：已保存。',
    cacheFailed: '缓存：保存失败。请检查浏览器存储设置。',
    cacheCleared: '缓存：已清除。',
    cacheReset: '缓存：已重置缓存和时间线。',
    cachePersistenceEnabled: '缓存：已启用持久化。',
    cachePersistenceFailed: '缓存：持久化不可用。请检查浏览器存储设置。',
    modelLoaded: '模型已加载。',
    modelLoadFailed: '模型加载失败。',
    audioLoaded: '音频已加载。',
    audioLoadFailed: '音频加载失败。',
    audioLoading: '音频：加载中…',
    audioRemoved: '音频：已删除MP3。',
    imageCaptured: '图像已捕获。',
    imageExportNoRenderer: '图像导出：渲染器未初始化。',
    imageExportInProgress: '图像导出：处理中…',
    imageExportPreparing: '图像导出：准备中…',
    imageExportCancelled: '图像导出：已取消。',
    imageExportSaveFailed: '图像导出：保存失败。',
    imageExportFailed: '图像导出：失败。',
    videoCaptured: '视频已捕获。',
    videoExportNoRenderer: '视频导出：渲染器未初始化。',
    videoExportNoKeyframes: '视频导出：时间线没有关键帧。',
    videoExportInProgress: '视频导出：处理中…',
    videoExportPreparing: '视频导出：准备中…',
    videoExportSaving: '视频导出：录制完成，保存中…',
    videoExportCancelled: '视频导出：已取消。',
    videoExportSaveFailed: '视频导出：保存失败。',
    videoExportFailed: '视频导出：失败。',
    videoExportSaved: '视频导出：已保存为 {name}。',
    timelineNotReady: '时间线：未初始化。',
    timelineAddFailed: '时间线：添加关键帧失败。',
    timelineKeyAdded: '时间线：当前姿势已添加为关键帧。',
    timelineCopySelect: '时间线：选择要复制的关键帧。',
    timelineCopyFailed: '时间线：复制关键帧失败。',
    timelineCopySuccess: '时间线：已复制 {count} 个关键帧。',
    timelinePasteEmpty: '时间线：没有要粘贴的关键帧。',
    timelinePasteFailed: '时间线：粘贴关键帧失败。',
    timelinePasteSuccess: '时间线：已粘贴 {count} 个关键帧。',
    timelineLoadMissing: '时间线：加载失败（未找到输入）。',
    timelineLoadFailed: '时间线：加载失败。',
    timelineParseFailed: '时间线：JSON解析失败。',
    timelineExported: '时间线：已导出。',
    timelineExportFailed: '时间线：导出失败。',
    timelineReset: '时间线：已重置。',
    timelineResetFailed: '时间线：重置失败。',
    timelineFileLoaded: '时间线：已加载 {name}。',
    timelineTrackerMismatch: '时间线：无法导入。追踪器数量不匹配。',
    uiLayoutLoaded: 'UI：已加载 Blender 风格布局。',
    trackersReset: '追踪器：虚拟追踪器已重置。',
    errorUnknown: '发生未知错误。',
    errorRaised: '错误：{message}',
    unhandledRejection: '未处理的 Promise 拒绝。'
  },

  aria: {
    mainMenu: '主菜单',
    settingsTabs: '设置类别',
    settingsArea: '设置区域'
  }
}
