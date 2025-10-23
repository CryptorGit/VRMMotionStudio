export default {
  meta: { name: 'English' },

  languages: {
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ru: 'Russian',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian'
  },

  brand: {
    title: 'StellarMotion Studio',
    beta: 'BETA',
    betaAria: 'Beta version'
  },

  menu: {
    import: 'Import',
    importAudio: 'Import Audio',
    export: 'Export',
    captureImage: 'Capture Image',
    captureVideo: 'Capture Video',
    clearCache: 'Clear Cache',
    exportProject: 'Export Project',
    importProject: 'Import Project',
    captions: 'Captions',
    timelineImport: 'Import Timeline',
    timelineExport: 'Export Timeline'
  },

  menuTooltips: {
    import: 'Load a 3D model',
    importAudio: 'Load an MP3 audio file',
    export: 'Export the current pose',
    captureImage: 'Render and save an image',
    captureVideo: 'Render and save a video',
    clearCache: 'Reset loaded models and settings',
    exportProject: 'Save cache as a project file',
    importProject: 'Restore cache from a project file',
    captionsOn: 'Turn captions off',
    captionsOff: 'Turn captions on',
    timelineImport: 'Import a saved timeline',
    timelineExport: 'Save the current timeline',
    timelineExportDisabled: 'No timeline is available to save'
  },

  menuControls: {
    lighting: 'Lighting',
    display: 'Display',
    physics: 'Physics',
    morph: 'Morph Targets',
    models: 'Models',
    autoRestore: 'Auto restore timeline'
  },

  common: {
    on: 'On',
    off: 'Off',
    reset: 'Reset',
    delete: 'Remove'
  },

  viewport: {
    mode: 'Mode',
    viewMode: 'View Mode',
    cameraMode: 'Camera Mode',
    undo: 'Undo',
    redo: 'Redo',
    renderCam: 'RenderCam',
    cameraHint: 'Left drag: Pan | Right drag: Tilt | Wheel: Dolly',
    trackerHint: 'Left drag: Move | Shift: Fine adjust',
    roll: 'Roll',
    area: 'Viewport area',
    modeToggle: 'Toggle view mode'
  },

  tabs: {
    lighting: 'Lighting',
    lightingDesc: 'Adjust lighting and ambient',
    model: 'Model',
    modelDesc: 'Display and manage models',
    display: 'Display',
    displayDesc: 'Manage bone and tracker display',
    trackers: 'Trackers',
    trackersDesc: 'Virtual tracker settings',
    bones: 'Bones',
    bonesDesc: 'Finger controls',
    keys: 'Keys',
    keysDesc: 'Keyframe details and easing',
    audio: 'Audio',
    audioDesc: 'Audio settings',
    camera: 'Camera',
    cameraDesc: 'Render camera and output settings',
    morph: 'Morph',
    morphDesc: 'Expression / shape-key control'
  },

  model: {
    lookAtEnabled: 'Enable LookAt',
    noModels: 'No models loaded'
  },

  display: {
    grid: 'Show Grid',
    lightMarker: 'Show Light Marker',
    markerColor: 'Marker Color',
    bones: 'Bones',
    extendedBones: 'Extended Bones',
    colliderNodes: 'Collider Nodes',
    nonDeformingBones: 'Non-Deforming Bones',
    highlightConstraint: 'Highlight Constraint',
    physicalBones: 'Physical Bones',
    otherBones: 'Other Bones',
    boneDotSize: 'Bone Dot Size',
    boneLabelScale: 'Bone Label Scale',
    boneNames: 'Show Bone Names',
    outline: 'Outline',
    outlineWidth: 'Outline Width',
    outlineColor: 'Outline Color',
    outlineSettings: 'VRM Outline Settings',
    targetModel: 'Target Model',
    reset: 'Reset',
    load: 'Load'
  },

  lightingPanel: {
    ambientColor: 'Ambient Color',
    ambientIntensity: 'Ambient Intensity',
    directionalTitle: 'Directional Light',
    directionalDescription: 'Adjust position and orientation with angles',
    color: 'Color',
    intensity: 'Intensity',
    positionX: 'Position X',
    positionY: 'Position Y',
    positionZ: 'Position Z',
    azimuth: 'Azimuth (°)',
    elevation: 'Elevation (°)'
  },

  tracker: {
    enable: 'Enable Trackers',
    loadModelFirst: 'Please load a model first',
    resetPosition: 'Reset Position',
    resetRotation: 'Reset Rotation',
    resetPositionTitle: 'Reset to initial position',
    resetRotationTitle: 'Reset to initial rotation',
    display: 'Show Trackers',
    showLabels: 'Show Labels',
    trackerSize: 'Tracker Size',
    labelSize: 'Label Size',
    showAxes: 'Show Rotation Axes',
    axesLength: 'Axes Length',
    forearmTwist: 'Forearm Twist Share',
    settings: 'Settings',
    settingsTitle: (name) => `${name} Settings`,
    position: 'Position',
    rotation: 'Rotation',
    rotationOrder: 'Rotation Order',
    rotationAxisDefault: 'Default Rotation Axis',
    axisScaleX: 'Scale X',
    axisScaleY: 'Scale Y',
    axisScaleZ: 'Scale Z',
    positionX: 'Position X',
    positionY: 'Position Y',
    positionZ: 'Position Z',
    pitch: 'Pitch',
    yaw: 'Yaw',
    roll: 'Roll',
    selectedTracker: 'Selected Tracker',
    orientation: 'Orientation'
  },

  physics: {
    springBoneEnabled: 'Enable SpringBone'
  },

  finger: {
    selectModel: 'Select Model',
    leftHand: 'Left Hand',
    rightHand: 'Right Hand',
    resetAll: 'Reset All Fingers',
    handAxisTitle: 'Hand Rotation Axis',
    handAxisLeft: 'Left hand',
    handAxisRight: 'Right hand',
    axisMixed: 'Mixed',
    axisThumbAuto: 'Y+ (auto)',
    axisZPlusAuto: 'Z+ (auto)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: 'Thumb',
    leftIndex: 'Index',
    leftMiddle: 'Middle',
    leftRing: 'Ring',
    leftLittle: 'Little',
    rightThumb: 'Thumb',
    rightIndex: 'Index',
    rightMiddle: 'Middle',
    rightRing: 'Ring',
    rightLittle: 'Little'
  },

  keys: {
    selected: 'Selected',
    items: 'items',
    multiSelect: 'multi',
    selectPrompt: 'Select keyframes to edit their settings',
    noSelection: 'No keyframes selected. Choose keys in the timeline.',
    multiSelectHint: 'Tip: Hold Shift to select multiple keys.',
    selectModel: 'Select Model',
    allModels: 'All Models',
    selectModelHint: 'Select a model to edit tracker-specific curves.',
    targetTracker: 'Target Tracker',
    allDefault: 'All (default curves)'
  },

  audio: {
    title: 'Audio',
    noDuration: 'No audio loaded. Import an MP3 via the menu.',
    filename: 'File name',
    duration: 'Duration',
    sampleRate: 'Sample rate',
    channels: 'Channels',
    remove: 'Remove Audio',
    mono: 'Mono',
    stereo: 'Stereo'
  },

  camera: {
    resolution: 'Resolution',
    width: 'Width',
    height: 'Height',
    presets: 'Presets',
    customPreset: 'Custom',
    presetFhd: '1920 × 1080 (FHD)',
    presetQhd: '2560 × 1440 (QHD)',
    presetUhd: '3840 × 2160 (4K UHD)',
    presetSquare: '1080 × 1080 (Square)',
    presetHd: '1280 × 720 (HD)',
    parameters: 'Parameters',
    fovVertical: 'Vertical FOV',
    near: 'Near Clip',
    far: 'Far Clip',
    wheelSensitivity: 'Wheel sensitivity',
    translateSensitivity: 'Pan sensitivity',
    rotateSensitivity: 'Orbit sensitivity',
    showHelper: 'Show render camera helper'
  },

  morph: {
    reload: 'Reload'
  },

  timeline: {
    area: 'Timeline area'
  },

  timelinePanel: {
    title: 'Timeline',
    jumpStart: 'Jump to beginning',
    jumpEnd: 'Jump to end',
    play: 'Play',
    pause: 'Pause',
    addAll: 'Add keys for all trackers',
    addKey: 'Add keyframe',
    trackersHeader: 'Trackers'
  },

  timelineEditor: {
    loop: 'Loop',
    loopTooltip: 'Toggle loop playback',
    fit: 'Fit Range',
    fitTooltip: 'Show the entire timeline',
    addKey: 'Add Key',
    addKeyTooltip: 'Add a keyframe at the current frame',
    copy: 'Copy',
    copyTooltip: 'Copy selected keyframes',
    paste: 'Paste',
    pasteTooltip: 'Paste keyframes at the current position',
    delete: 'Delete',
    deleteTooltip: 'Delete selected keyframes',
    jumpStartLabel: 'Start',
    jumpStartTooltip: 'Jump to the start frame',
    play: 'Play',
    playTooltip: 'Play',
    pause: 'Pause',
    pauseTooltip: 'Pause',
    jumpEndLabel: 'End',
    jumpEndTooltip: 'Jump to the end frame',
    rangeStartLabel: 'Start',
    rangeEndLabel: 'End',
    clear: 'Clear',
    clearTooltip: 'Clear the timeline'
  },

  timelineCurveEditor: {
    title: 'Easing Curve',
    reset: 'Reset',
    empty: 'Select two or more keys to edit the curve.',
    handleLabel: 'Curve control point',
    inLabel: 'In',
    outLabel: 'Out'
  },

  statusBar: {
    placeholder: 'Additional information appears here',
    frame: 'Frame {current}/{end} ({fps}fps)',
    cacheStandard: 'Cache: Standard storage',
    cacheGuardPersisted: 'Persisted',
    cacheGuardVolatile: 'Not persisted',
    cacheUsage: 'Cache {usage} ({guard})',
    cacheUsageDetailed: 'Cache {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: 'Cache: Saved.',
    cacheFailed: 'Cache: Failed to save. Check browser storage settings.',
    cacheCleared: 'Cache: Cleared.',
    cacheReset: 'Cache: Reset cache and timeline.',
    cachePersistenceEnabled: 'Cache: Persistence enabled.',
    cachePersistenceFailed: 'Cache: Persistence unavailable. Check browser storage settings.',
    projectExported: 'Project: Exported successfully.',
    projectExportFailed: 'Project: Failed to export.',
    projectUploadedToServer: 'Project: Uploaded to server.',
    projectImporting: 'Project: Importing…',
    projectImported: 'Project: Imported successfully.',
    projectImportFailed: 'Project: Failed to import.',
    projectImportEmpty: 'Project: No models found in project file.',
    modelLoaded: 'Model loaded.',
    modelLoadFailed: 'Failed to load model.',
    audioLoaded: 'Audio loaded.',
    audioLoadFailed: 'Failed to load audio.',
    audioLoading: 'Audio: Loading…',
    audioRemoved: 'Audio: Removed MP3.',
    imageCaptured: 'Image captured.',
    imageExportNoRenderer: 'Image export: Renderer not initialized.',
    imageExportInProgress: 'Image export: Processing…',
    imageExportPreparing: 'Image export: Preparing…',
    imageExportCancelled: 'Image export: Cancelled.',
    imageExportSaveFailed: 'Image export: Failed to save.',
    imageExportFailed: 'Image export: Failed.',
    videoCaptured: 'Video captured.',
    videoExportNoRenderer: 'Video export: Renderer not initialized.',
    videoExportNoKeyframes: 'Video export: Timeline has no keyframes.',
    videoExportInProgress: 'Video export: Processing…',
    videoExportPreparing: 'Video export: Preparing…',
    videoExportSaving: 'Video export: Recording finished, saving…',
    videoExportCancelled: 'Video export: Cancelled.',
    videoExportSaveFailed: 'Video export: Failed to save.',
    videoExportFailed: 'Video export: Failed.',
    videoExportSaved: 'Video export: Saved as {name}.',
    timelineNotReady: 'Timeline: Not initialized.',
    timelineAddFailed: 'Timeline: Failed to add keyframe.',
    timelineKeyAdded: 'Timeline: Added current pose as keyframe.',
    timelineCopySelect: 'Timeline: Select keys to copy.',
    timelineCopyFailed: 'Timeline: Failed to copy keyframes.',
    timelineCopySuccess: 'Timeline: Copied {count} keyframe(s).',
    timelinePasteEmpty: 'Timeline: No keyframes to paste.',
    timelinePasteFailed: 'Timeline: Failed to paste keyframes.',
    timelinePasteSuccess: 'Timeline: Pasted {count} keyframe(s).',
    timelineLoadMissing: 'Timeline: Failed to load (input not found).',
    timelineLoadFailed: 'Timeline: Failed to load.',
    timelineParseFailed: 'Timeline: Failed to parse JSON.',
    timelineExported: 'Timeline: Exported.',
    timelineExportFailed: 'Timeline: Export failed.',
    timelineReset: 'Timeline: Reset.',
    timelineResetFailed: 'Timeline: Reset failed.',
    timelineFileLoaded: 'Timeline: Loaded {name}.',
    timelineTrackerMismatch: 'Timeline: Cannot import. Tracker count does not match.',
    uiLayoutLoaded: 'UI: Loaded Blender-style layout.',
    trackersReset: 'Trackers: Virtual trackers reset.',
    errorUnknown: 'Unknown error occurred.',
    errorRaised: 'Error: {message}',
    unhandledRejection: 'Unhandled promise rejection.'
  },

  aria: {
    mainMenu: 'Main menu',
    settingsTabs: 'Settings categories',
    settingsArea: 'Settings area'
  }
}
