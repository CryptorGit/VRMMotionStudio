export default {
  meta: { name: 'Russian' },

  languages: {
    en: 'Английский',
    ja: 'Японский',
    ko: 'Корейский',
    zh: 'Китайский',
    ru: 'Русский',
    fr: 'Французский',
    es: 'Испанский',
    de: 'Немецкий',
    it: 'Итальянский'
  },

  brand: {
    title: 'VRM Motion Studio',
    beta: 'БЕТА',
    betaAria: 'Бета-версия'
  },

  menu: {
    import: 'Импорт',
    importAudio: 'Импорт аудио',
    export: 'Экспорт',
    captureImage: 'Захват изображения',
    captureVideo: 'Захват видео',
    clearCache: 'Очистить кэш',
    captions: 'Субтитры',
    timelineImport: 'Импорт временной шкалы',
    timelineExport: 'Экспорт временной шкалы'
  },

  menuTooltips: {
    import: 'Загрузить 3D-модель',
    importAudio: 'Загрузить аудиофайл MP3',
    export: 'Экспортировать текущую позу',
    captureImage: 'Рендерить и сохранить изображение',
    captureVideo: 'Рендерить и сохранить видео',
    clearCache: 'Сбросить загруженные модели и настройки',
    captionsOn: 'Отключить субтитры',
    captionsOff: 'Включить субтитры',
    timelineImport: 'Импортировать сохранённую временную шкалу',
    timelineExport: 'Сохранить текущую временную шкалу',
    timelineExportDisabled: 'Нет доступной временной шкалы для сохранения'
  },

  menuControls: {
    lighting: 'Освещение',
    display: 'Отображение',
    physics: 'Физика',
    morph: 'Морф-цели',
    models: 'Модели',
    autoRestore: 'Автоматически восстанавливать временную шкалу'
  },

  common: {
    on: 'Вкл',
    off: 'Выкл',
    reset: 'Сброс',
    delete: 'Удалить'
  },

  viewport: {
    mode: 'Режим',
    viewMode: 'Режим просмотра',
    cameraMode: 'Режим камеры',
    undo: 'Отменить',
    redo: 'Повторить',
    renderCam: 'Камера рендеринга',
    cameraHint: 'Левая кнопка: Панорама | Правая кнопка: Наклон | Колесо: Приближение',
    trackerHint: 'Левая кнопка: Перемещение | Shift: Точная настройка',
    roll: 'Крен',
    area: 'Область просмотра',
    modeToggle: 'Переключить режим просмотра'
  },

  tabs: {
    lighting: 'Освещение',
    lightingDesc: 'Настройка освещения и окружения',
    model: 'Модель',
    modelDesc: 'Отображение и управление моделями',
    display: 'Отображение',
    displayDesc: 'Управление отображением костей и трекеров',
    trackers: 'Трекеры',
    trackersDesc: 'Настройки виртуальных трекеров',
    bones: 'Кости',
    bonesDesc: 'Управление пальцами',
    keys: 'Ключи',
    keysDesc: 'Детали ключевых кадров и сглаживание',
    audio: 'Аудио',
    audioDesc: 'Настройки аудио',
    camera: 'Камера',
    cameraDesc: 'Настройки камеры рендеринга и вывода',
    morph: 'Морф',
    morphDesc: 'Управление выражениями / ключами формы'
  },

  model: {
    lookAtEnabled: 'Включить LookAt',
    noModels: 'Модели не загружены'
  },

  display: {
    grid: 'Показать сетку',
    lightMarker: 'Показать маркер света',
    markerColor: 'Цвет маркера',
    bones: 'Кости',
    extendedBones: 'Расширенные кости',
    colliderNodes: 'Узлы коллайдера',
    nonDeformingBones: 'Недеформируемые кости',
    highlightConstraint: 'Выделить ограничение',
    physicalBones: 'Физические кости',
    otherBones: 'Другие кости',
    boneDotSize: 'Размер точки кости',
    boneLabelScale: 'Масштаб метки кости',
    boneNames: 'Показать имена костей',
    outline: 'Контур',
    outlineWidth: 'Ширина контура',
    outlineColor: 'Цвет контура',
    outlineSettings: 'Настройки контура VRM',
    targetModel: 'Целевая модель',
    reset: 'Сброс',
    load: 'Загрузить'
  },

  lightingPanel: {
    ambientColor: 'Цвет окружения',
    ambientIntensity: 'Интенсивность окружения',
    directionalTitle: 'Направленный свет',
    directionalDescription: 'Настройка положения и ориентации с помощью углов',
    color: 'Цвет',
    intensity: 'Интенсивность',
    positionX: 'Положение X',
    positionY: 'Положение Y',
    positionZ: 'Положение Z',
    azimuth: 'Азимут (°)',
    elevation: 'Высота (°)'
  },

  tracker: {
    enable: 'Включить трекеры',
    loadModelFirst: 'Пожалуйста, сначала загрузите модель',
    resetPosition: 'Сбросить положение',
    resetRotation: 'Сбросить вращение',
    resetPositionTitle: 'Сбросить на начальное положение',
    resetRotationTitle: 'Сбросить на начальное вращение',
    display: 'Показать трекеры',
    showLabels: 'Показать метки',
    trackerSize: 'Размер трекера',
    labelSize: 'Размер метки',
    showAxes: 'Показать оси вращения',
    axesLength: 'Длина осей',
    forearmTwist: 'Доля скручивания предплечья',
    settings: 'Настройки',
    settingsTitle: (name) => `Настройки ${name}`,
    position: 'Положение',
    rotation: 'Вращение',
    rotationOrder: 'Порядок вращения',
    rotationAxisDefault: 'Ось вращения по умолчанию',
    axisScaleX: 'Масштаб X',
    axisScaleY: 'Масштаб Y',
    axisScaleZ: 'Масштаб Z',
    positionX: 'Положение X',
    positionY: 'Положение Y',
    positionZ: 'Положение Z',
    pitch: 'Тангаж',
    yaw: 'Рыскание',
    roll: 'Крен',
    selectedTracker: 'Выбранный трекер',
    orientation: 'Ориентация'
  },

  physics: {
    springBoneEnabled: 'Включить SpringBone'
  },

  finger: {
    selectModel: 'Выбрать модель',
    leftHand: 'Левая рука',
    rightHand: 'Правая рука',
    resetAll: 'Сбросить все пальцы',
    handAxisTitle: 'Ось вращения руки',
    handAxisLeft: 'Левая рука',
    handAxisRight: 'Правая рука',
    axisMixed: 'Смешанная',
    axisThumbAuto: 'Y+ (авто)',
    axisZPlusAuto: 'Z+ (авто)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: 'Большой',
    leftIndex: 'Указательный',
    leftMiddle: 'Средний',
    leftRing: 'Безымянный',
    leftLittle: 'Мизинец',
    rightThumb: 'Большой',
    rightIndex: 'Указательный',
    rightMiddle: 'Средний',
    rightRing: 'Безымянный',
    rightLittle: 'Мизинец'
  },

  keys: {
    selected: 'Выбрано',
    items: 'элементы',
    multiSelect: 'множественный',
    selectPrompt: 'Выберите ключевые кадры для редактирования настроек',
    noSelection: 'Ключевые кадры не выбраны. Выберите ключи на временной шкале.',
    multiSelectHint: 'Подсказка: Удерживайте Shift для выбора нескольких ключей.',
    selectModel: 'Выбрать модель',
    allModels: 'Все модели',
    selectModelHint: 'Выберите модель для редактирования кривых трекера.',
    targetTracker: 'Целевой трекер',
    allDefault: 'Все (кривые по умолчанию)'
  },

  audio: {
    title: 'Аудио',
    noDuration: 'Аудио не загружено. Импортируйте MP3 через меню.',
    filename: 'Имя файла',
    duration: 'Продолжительность',
    sampleRate: 'Частота дискретизации',
    channels: 'Каналы',
    remove: 'Удалить аудио',
    mono: 'Моно',
    stereo: 'Стерео'
  },

  camera: {
    resolution: 'Разрешение',
    width: 'Ширина',
    height: 'Высота',
    presets: 'Предустановки',
    customPreset: 'Пользовательская',
    presetFhd: '1920 × 1080 (FHD)',
    presetQhd: '2560 × 1440 (QHD)',
    presetUhd: '3840 × 2160 (4K UHD)',
    presetSquare: '1080 × 1080 (Квадрат)',
    presetHd: '1280 × 720 (HD)',
    parameters: 'Параметры',
    fovVertical: 'Вертикальный FOV',
    near: 'Ближняя плоскость',
    far: 'Дальняя плоскость',
    wheelSensitivity: 'Чувствительность колеса',
    translateSensitivity: 'Чувствительность панорамы',
    rotateSensitivity: 'Чувствительность орбиты',
    showHelper: 'Показать помощник камеры рендеринга'
  },

  morph: {
    reload: 'Перезагрузить'
  },

  timeline: {
    area: 'Область временной шкалы'
  },

  timelinePanel: {
    title: 'Временная шкала',
    jumpStart: 'Перейти к началу',
    jumpEnd: 'Перейти к концу',
    play: 'Воспроизвести',
    pause: 'Пауза',
    addAll: 'Добавить ключи для всех трекеров',
    addKey: 'Добавить ключевой кадр',
    trackersHeader: 'Трекеры'
  },

  timelineEditor: {
    loop: 'Цикл',
    loopTooltip: 'Переключить циклическое воспроизведение',
    fit: 'Подогнать диапазон',
    fitTooltip: 'Показать всю временную шкалу',
    addKey: 'Добавить ключ',
    addKeyTooltip: 'Добавить ключевой кадр в текущем кадре',
    copy: 'Копировать',
    copyTooltip: 'Копировать выбранные ключевые кадры',
    paste: 'Вставить',
    pasteTooltip: 'Вставить ключевые кадры в текущую позицию',
    delete: 'Удалить',
    deleteTooltip: 'Удалить выбранные ключевые кадры',
    jumpStartLabel: 'Начало',
    jumpStartTooltip: 'Перейти к начальному кадру',
    play: 'Воспроизвести',
    playTooltip: 'Воспроизвести',
    pause: 'Пауза',
    pauseTooltip: 'Пауза',
    jumpEndLabel: 'Конец',
    jumpEndTooltip: 'Перейти к конечному кадру',
    rangeStartLabel: 'Начало',
    rangeEndLabel: 'Конец',
    clear: 'Очистить',
    clearTooltip: 'Очистить временную шкалу'
  },

  timelineCurveEditor: {
    title: 'Кривая сглаживания',
    reset: 'Сброс',
    empty: 'Выберите два или более ключа для редактирования кривой.',
    handleLabel: 'Контрольная точка кривой',
    inLabel: 'Вход',
    outLabel: 'Выход'
  },

  statusBar: {
    placeholder: 'Здесь появляется дополнительная информация',
    frame: 'Кадр {current}/{end} ({fps}fps)',
    cacheStandard: 'Кэш: Стандартное хранилище',
    cacheGuardPersisted: 'Сохранено',
    cacheGuardVolatile: 'Не сохранено',
    cacheUsage: 'Кэш {usage} ({guard})',
    cacheUsageDetailed: 'Кэш {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: 'Кэш: Сохранён.',
    cacheFailed: 'Кэш: Не удалось сохранить. Проверьте настройки хранилища браузера.',
    cacheCleared: 'Кэш: Очищен.',
    cacheReset: 'Кэш: Сброшены кэш и временная шкала.',
    cachePersistenceEnabled: 'Кэш: Постоянное хранение включено.',
    cachePersistenceFailed: 'Кэш: Постоянное хранение недоступно. Проверьте настройки хранилища браузера.',
    modelLoaded: 'Модель загружена.',
    modelLoadFailed: 'Не удалось загрузить модель.',
    audioLoaded: 'Аудио загружено.',
    audioLoadFailed: 'Не удалось загрузить аудио.',
    audioLoading: 'Аудио: Загрузка…',
    audioRemoved: 'Аудио: MP3 удалён.',
    imageCaptured: 'Изображение захвачено.',
    imageExportNoRenderer: 'Экспорт изображения: Рендерер не инициализирован.',
    imageExportInProgress: 'Экспорт изображения: Обработка…',
    imageExportPreparing: 'Экспорт изображения: Подготовка…',
    imageExportCancelled: 'Экспорт изображения: Отменён.',
    imageExportSaveFailed: 'Экспорт изображения: Не удалось сохранить.',
    imageExportFailed: 'Экспорт изображения: Не удалось.',
    videoCaptured: 'Видео захвачено.',
    videoExportNoRenderer: 'Экспорт видео: Рендерер не инициализирован.',
    videoExportNoKeyframes: 'Экспорт видео: На временной шкале нет ключевых кадров.',
    videoExportInProgress: 'Экспорт видео: Обработка…',
    videoExportPreparing: 'Экспорт видео: Подготовка…',
    videoExportSaving: 'Экспорт видео: Запись завершена, сохранение…',
    videoExportCancelled: 'Экспорт видео: Отменён.',
    videoExportSaveFailed: 'Экспорт видео: Не удалось сохранить.',
    videoExportFailed: 'Экспорт видео: Не удалось.',
    videoExportSaved: 'Экспорт видео: Сохранено как {name}.',
    timelineNotReady: 'Временная шкала: Не инициализирована.',
    timelineAddFailed: 'Временная шкала: Не удалось добавить ключевой кадр.',
    timelineKeyAdded: 'Временная шкала: Текущая поза добавлена как ключевой кадр.',
    timelineCopySelect: 'Временная шкала: Выберите ключи для копирования.',
    timelineCopyFailed: 'Временная шкала: Не удалось скопировать ключевые кадры.',
    timelineCopySuccess: 'Временная шкала: Скопировано {count} ключевых кадров.',
    timelinePasteEmpty: 'Временная шкала: Нет ключевых кадров для вставки.',
    timelinePasteFailed: 'Временная шкала: Не удалось вставить ключевые кадры.',
    timelinePasteSuccess: 'Временная шкала: Вставлено {count} ключевых кадров.',
    timelineLoadMissing: 'Временная шкала: Не удалось загрузить (не найден ввод).',
    timelineLoadFailed: 'Временная шкала: Не удалось загрузить.',
    timelineParseFailed: 'Временная шкала: Не удалось разобрать JSON.',
    timelineExported: 'Временная шкала: Экспортирована.',
    timelineExportFailed: 'Временная шкала: Не удалось экспортировать.',
    timelineReset: 'Временная шкала: Сброшена.',
    timelineResetFailed: 'Временная шкала: Не удалось сбросить.',
    timelineFileLoaded: 'Временная шкала: Загружен {name}.',
    timelineTrackerMismatch: 'Временная шкала: Не удаётся импортировать. Количество трекеров не совпадает.',
    uiLayoutLoaded: 'UI: Загружен макет в стиле Blender.',
    trackersReset: 'Трекеры: Виртуальные трекеры сброшены.',
    errorUnknown: 'Произошла неизвестная ошибка.',
    errorRaised: 'Ошибка: {message}',
    unhandledRejection: 'Необработанное отклонение промиса.'
  },

  aria: {
    mainMenu: 'Главное меню',
    settingsTabs: 'Категории настроек',
    settingsArea: 'Область настроек'
  }
}
