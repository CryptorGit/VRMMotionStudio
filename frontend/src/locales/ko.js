export default {
  meta: { name: 'Korean' },

  languages: {
    en: '영어',
    ja: '일본어',
    ko: '한국어',
    zh: '중국어',
    ru: '러시아어',
    fr: '프랑스어',
    es: '스페인어',
    de: '독일어',
    it: '이탈리아어'
  },

  brand: {
    title: 'StellarMotion Studio',
    beta: '베타',
    betaAria: '베타 버전'
  },

  menu: {
    import: '가져오기',
    importAudio: '오디오 가져오기',
    export: '내보내기',
    captureImage: '이미지 캡처',
    captureVideo: '비디오 캡처',
    clearCache: '캐시 지우기',
    captions: '자막',
    timelineImport: '타임라인 가져오기',
    timelineExport: '타임라인 내보내기'
  },

  menuTooltips: {
    import: '3D 모델 로드',
    importAudio: 'MP3 오디오 파일 로드',
    export: '현재 포즈 내보내기',
    captureImage: '이미지 렌더링 및 저장',
    captureVideo: '비디오 렌더링 및 저장',
    clearCache: '로드된 모델 및 설정 재설정',
    captionsOn: '자막 끄기',
    captionsOff: '자막 켜기',
    timelineImport: '저장된 타임라인 가져오기',
    timelineExport: '현재 타임라인 저장',
    timelineExportDisabled: '저장할 타임라인이 없습니다'
  },

  menuControls: {
    lighting: '조명',
    display: '표시',
    physics: '물리',
    morph: '모프 타겟',
    models: '모델',
    autoRestore: '타임라인 자동 복원'
  },

  common: {
    on: '켜기',
    off: '끄기',
    reset: '재설정',
    delete: '제거'
  },

  viewport: {
    mode: '모드',
    viewMode: '뷰 모드',
    cameraMode: '카메라 모드',
    undo: '실행 취소',
    redo: '다시 실행',
    renderCam: '렌더 카메라',
    cameraHint: '왼쪽 드래그: 팬 | 오른쪽 드래그: 틸트 | 휠: 줌',
    trackerHint: '왼쪽 드래그: 이동 | Shift: 미세 조정',
    roll: '롤',
    area: '뷰포트 영역',
    modeToggle: '뷰 모드 전환'
  },

  tabs: {
    lighting: '조명',
    lightingDesc: '조명 및 앰비언트 조정',
    model: '모델',
    modelDesc: '모델 표시 및 관리',
    display: '표시',
    displayDesc: '본 및 트래커 표시 관리',
    trackers: '트래커',
    trackersDesc: '가상 트래커 설정',
    bones: '본',
    bonesDesc: '손가락 컨트롤',
    keys: '키',
    keysDesc: '키프레임 세부 정보 및 이징',
    audio: '오디오',
    audioDesc: '오디오 설정',
    camera: '카메라',
    cameraDesc: '렌더 카메라 및 출력 설정',
    morph: '모프',
    morphDesc: '표정 / 쉐이프 키 컨트롤'
  },

  model: {
    lookAtEnabled: 'LookAt 활성화',
    noModels: '로드된 모델이 없습니다'
  },

  display: {
    grid: '그리드 표시',
    lightMarker: '라이트 마커 표시',
    markerColor: '마커 색상',
    bones: '본',
    extendedBones: '확장 본',
    colliderNodes: '콜라이더 노드',
    nonDeformingBones: '비변형 본',
    highlightConstraint: '제약 강조',
    physicalBones: '물리 본',
    otherBones: '기타 본',
    boneDotSize: '본 점 크기',
    boneLabelScale: '본 레이블 스케일',
    boneNames: '본 이름 표시',
    outline: '윤곽선',
    outlineWidth: '윤곽선 너비',
    outlineColor: '윤곽선 색상',
    outlineSettings: 'VRM 윤곽선 설정',
    targetModel: '대상 모델',
    reset: '재설정',
    load: '로드'
  },

  lightingPanel: {
    ambientColor: '앰비언트 색상',
    ambientIntensity: '앰비언트 강도',
    directionalTitle: '방향성 라이트',
    directionalDescription: '각도로 위치 및 방향 조정',
    color: '색상',
    intensity: '강도',
    positionX: '위치 X',
    positionY: '위치 Y',
    positionZ: '위치 Z',
    azimuth: '방위각 (°)',
    elevation: '고도 (°)'
  },

  tracker: {
    enable: '트래커 활성화',
    loadModelFirst: '먼저 모델을 로드하세요',
    resetPosition: '위치 재설정',
    resetRotation: '회전 재설정',
    resetPositionTitle: '초기 위치로 재설정',
    resetRotationTitle: '초기 회전으로 재설정',
    display: '트래커 표시',
    showLabels: '레이블 표시',
    trackerSize: '트래커 크기',
    labelSize: '레이블 크기',
    showAxes: '회전 축 표시',
    axesLength: '축 길이',
    forearmTwist: '팔뚝 비틀림 공유',
    settings: '설정',
    settingsTitle: (name) => `${name} 설정`,
    position: '위치',
    rotation: '회전',
    rotationOrder: '회전 순서',
    rotationAxisDefault: '기본 회전 축',
    axisScaleX: '스케일 X',
    axisScaleY: '스케일 Y',
    axisScaleZ: '스케일 Z',
    positionX: '위치 X',
    positionY: '위치 Y',
    positionZ: '위치 Z',
    pitch: '피치',
    yaw: '요',
    roll: '롤',
    selectedTracker: '선택된 트래커',
    orientation: '방향'
  },

  physics: {
    springBoneEnabled: 'SpringBone 활성화'
  },

  finger: {
    selectModel: '모델 선택',
    leftHand: '왼손',
    rightHand: '오른손',
    resetAll: '모든 손가락 재설정',
    handAxisTitle: '손 회전 축',
    handAxisLeft: '왼손',
    handAxisRight: '오른손',
    axisMixed: '혼합',
    axisThumbAuto: 'Y+ (자동)',
    axisZPlusAuto: 'Z+ (자동)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: '엄지',
    leftIndex: '검지',
    leftMiddle: '중지',
    leftRing: '약지',
    leftLittle: '새끼',
    rightThumb: '엄지',
    rightIndex: '검지',
    rightMiddle: '중지',
    rightRing: '약지',
    rightLittle: '새끼'
  },

  keys: {
    selected: '선택됨',
    items: '항목',
    multiSelect: '다중',
    selectPrompt: '키프레임을 선택하여 설정을 편집하세요',
    noSelection: '키프레임이 선택되지 않았습니다. 타임라인에서 키를 선택하세요.',
    multiSelectHint: '팁: Shift를 눌러 여러 키를 선택하세요.',
    selectModel: '모델 선택',
    allModels: '모든 모델',
    selectModelHint: '트래커별 커브를 편집하려면 모델을 선택하세요.',
    targetTracker: '대상 트래커',
    allDefault: '전체 (기본 커브)'
  },

  audio: {
    title: '오디오',
    noDuration: '오디오가 로드되지 않았습니다. 메뉴에서 MP3를 가져오세요.',
    filename: '파일 이름',
    duration: '길이',
    sampleRate: '샘플 레이트',
    channels: '채널',
    remove: '오디오 제거',
    mono: '모노',
    stereo: '스테레오'
  },

  camera: {
    resolution: '해상도',
    width: '너비',
    height: '높이',
    presets: '프리셋',
    customPreset: '사용자 지정',
    presetFhd: '1920 × 1080 (FHD)',
    presetQhd: '2560 × 1440 (QHD)',
    presetUhd: '3840 × 2160 (4K UHD)',
    presetSquare: '1080 × 1080 (정사각형)',
    presetHd: '1280 × 720 (HD)',
    parameters: '매개변수',
    fovVertical: '수직 FOV',
    near: '근거리 클립',
    far: '원거리 클립',
    wheelSensitivity: '휠 감도',
    translateSensitivity: '팬 감도',
    rotateSensitivity: '오빗 감도',
    showHelper: '렌더 카메라 헬퍼 표시'
  },

  morph: {
    reload: '다시 로드'
  },

  timeline: {
    area: '타임라인 영역'
  },

  timelinePanel: {
    title: '타임라인',
    jumpStart: '시작으로 이동',
    jumpEnd: '끝으로 이동',
    play: '재생',
    pause: '일시정지',
    addAll: '모든 트래커에 키 추가',
    addKey: '키프레임 추가',
    trackersHeader: '트래커'
  },

  timelineEditor: {
    loop: '루프',
    loopTooltip: '루프 재생 토글',
    fit: '범위 맞춤',
    fitTooltip: '전체 타임라인 표시',
    addKey: '키 추가',
    addKeyTooltip: '현재 프레임에 키프레임 추가',
    copy: '복사',
    copyTooltip: '선택한 키프레임 복사',
    paste: '붙여넣기',
    pasteTooltip: '현재 위치에 키프레임 붙여넣기',
    delete: '삭제',
    deleteTooltip: '선택한 키프레임 삭제',
    jumpStartLabel: '시작',
    jumpStartTooltip: '시작 프레임으로 이동',
    play: '재생',
    playTooltip: '재생',
    pause: '일시정지',
    pauseTooltip: '일시정지',
    jumpEndLabel: '끝',
    jumpEndTooltip: '끝 프레임으로 이동',
    rangeStartLabel: '시작',
    rangeEndLabel: '끝',
    clear: '지우기',
    clearTooltip: '타임라인 지우기'
  },

  timelineCurveEditor: {
    title: '이징 커브',
    reset: '재설정',
    empty: '커브를 편집하려면 두 개 이상의 키를 선택하세요.',
    handleLabel: '커브 컨트롤 포인트',
    inLabel: '입력',
    outLabel: '출력'
  },

  statusBar: {
    placeholder: '추가 정보가 여기에 표시됩니다',
    frame: '프레임 {current}/{end} ({fps}fps)',
    cacheStandard: '캐시: 표준 저장소',
    cacheGuardPersisted: '지속됨',
    cacheGuardVolatile: '지속되지 않음',
    cacheUsage: '캐시 {usage} ({guard})',
    cacheUsageDetailed: '캐시 {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: '캐시: 저장됨.',
    cacheFailed: '캐시: 저장 실패. 브라우저 저장소 설정을 확인하세요.',
    cacheCleared: '캐시: 지워짐.',
    cacheReset: '캐시: 캐시 및 타임라인 재설정됨.',
    cachePersistenceEnabled: '캐시: 지속성 활성화됨.',
    cachePersistenceFailed: '캐시: 지속성 사용 불가. 브라우저 저장소 설정을 확인하세요.',
    modelLoaded: '모델 로드됨.',
    modelLoadFailed: '모델 로드 실패.',
    audioLoaded: '오디오 로드됨.',
    audioLoadFailed: '오디오 로드 실패.',
    audioLoading: '오디오: 로드 중…',
    audioRemoved: '오디오: MP3 제거됨.',
    imageCaptured: '이미지 캡처됨.',
    imageExportNoRenderer: '이미지 내보내기: 렌더러가 초기화되지 않음.',
    imageExportInProgress: '이미지 내보내기: 처리 중…',
    imageExportPreparing: '이미지 내보내기: 준비 중…',
    imageExportCancelled: '이미지 내보내기: 취소됨.',
    imageExportSaveFailed: '이미지 내보내기: 저장 실패.',
    imageExportFailed: '이미지 내보내기: 실패.',
    videoCaptured: '비디오 캡처됨.',
    videoExportNoRenderer: '비디오 내보내기: 렌더러가 초기화되지 않음.',
    videoExportNoKeyframes: '비디오 내보내기: 타임라인에 키프레임이 없습니다.',
    videoExportInProgress: '비디오 내보내기: 처리 중…',
    videoExportPreparing: '비디오 내보내기: 준비 중…',
    videoExportSaving: '비디오 내보내기: 녹화 완료, 저장 중…',
    videoExportCancelled: '비디오 내보내기: 취소됨.',
    videoExportSaveFailed: '비디오 내보내기: 저장 실패.',
    videoExportFailed: '비디오 내보내기: 실패.',
    videoExportSaved: '비디오 내보내기: {name}(으)로 저장됨.',
    timelineNotReady: '타임라인: 초기화되지 않음.',
    timelineAddFailed: '타임라인: 키프레임 추가 실패.',
    timelineKeyAdded: '타임라인: 현재 포즈를 키프레임으로 추가함.',
    timelineCopySelect: '타임라인: 복사할 키를 선택하세요.',
    timelineCopyFailed: '타임라인: 키프레임 복사 실패.',
    timelineCopySuccess: '타임라인: {count}개 키프레임 복사됨.',
    timelinePasteEmpty: '타임라인: 붙여넣을 키프레임이 없습니다.',
    timelinePasteFailed: '타임라인: 키프레임 붙여넣기 실패.',
    timelinePasteSuccess: '타임라인: {count}개 키프레임 붙여넣기됨.',
    timelineLoadMissing: '타임라인: 로드 실패 (입력을 찾을 수 없음).',
    timelineLoadFailed: '타임라인: 로드 실패.',
    timelineParseFailed: '타임라인: JSON 파싱 실패.',
    timelineExported: '타임라인: 내보내기됨.',
    timelineExportFailed: '타임라인: 내보내기 실패.',
    timelineReset: '타임라인: 재설정됨.',
    timelineResetFailed: '타임라인: 재설정 실패.',
    timelineFileLoaded: '타임라인: {name} 로드됨.',
    timelineTrackerMismatch: '타임라인: 가져올 수 없습니다. 트래커 수가 일치하지 않습니다.',
    uiLayoutLoaded: 'UI: Blender 스타일 레이아웃 로드됨.',
    trackersReset: '트래커: 가상 트래커 재설정됨.',
    errorUnknown: '알 수 없는 오류 발생.',
    errorRaised: '오류: {message}',
    unhandledRejection: '처리되지 않은 프로미스 거부.'
  },

  aria: {
    mainMenu: '메인 메뉴',
    settingsTabs: '설정 카테고리',
    settingsArea: '설정 영역'
  }
}
