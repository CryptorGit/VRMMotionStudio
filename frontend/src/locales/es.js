export default {
  meta: { name: 'Spanish' },

  languages: {
    en: 'Inglés',
    ja: 'Japonés',
    ko: 'Coreano',
    zh: 'Chino',
    ru: 'Ruso',
    fr: 'Francés',
    es: 'Español',
    de: 'Alemán',
    it: 'Italiano'
  },

  brand: {
    title: 'VRM Motion Studio',
    beta: 'BETA',
    betaAria: 'Versión beta'
  },

  menu: {
    import: 'Importar',
    importAudio: 'Importar audio',
    export: 'Exportar',
    captureImage: 'Capturar imagen',
    captureVideo: 'Capturar vídeo',
    clearCache: 'Limpiar caché',
    exportProject: 'Exportar proyecto',
    importProject: 'Importar proyecto',
    captions: 'Subtítulos',
    timelineImport: 'Importar línea de tiempo',
    timelineExport: 'Exportar línea de tiempo'
  },

  menuTooltips: {
    import: 'Cargar un modelo 3D',
    importAudio: 'Cargar un archivo de audio MP3',
    export: 'Exportar la pose actual',
    captureImage: 'Renderizar y guardar una imagen',
    captureVideo: 'Renderizar y guardar un vídeo',
    clearCache: 'Restablecer modelos y configuraciones cargadas',
    exportProject: 'Guardar caché como archivo de proyecto',
    importProject: 'Restaurar caché desde archivo de proyecto',
    captionsOn: 'Desactivar subtítulos',
    captionsOff: 'Activar subtítulos',
    timelineImport: 'Importar una línea de tiempo guardada',
    timelineExport: 'Guardar la línea de tiempo actual',
    timelineExportDisabled: 'No hay línea de tiempo disponible para guardar'
  },

  menuControls: {
    lighting: 'Iluminación',
    display: 'Visualización',
    physics: 'Física',
    morph: 'Objetivos de morfología',
    models: 'Modelos',
    autoRestore: 'Restaurar línea de tiempo automáticamente'
  },

  common: {
    on: 'Activado',
    off: 'Desactivado',
    reset: 'Restablecer',
    delete: 'Eliminar'
  },

  viewport: {
    mode: 'Modo',
    viewMode: 'Modo Vista',
    cameraMode: 'Modo Cámara',
    undo: 'Deshacer',
    redo: 'Rehacer',
    renderCam: 'Cámara de renderizado',
    cameraHint: 'Arrastrar izquierda: Panorámica | Arrastrar derecha: Inclinación | Rueda: Desplazamiento',
    trackerHint: 'Arrastrar izquierda: Mover | Shift: Ajuste fino',
    roll: 'Balanceo',
    area: 'Área de vista',
    modeToggle: 'Cambiar modo de vista'
  },

  tabs: {
    lighting: 'Iluminación',
    lightingDesc: 'Ajustar iluminación y ambiente',
    model: 'Modelo',
    modelDesc: 'Mostrar y gestionar modelos',
    display: 'Visualización',
    displayDesc: 'Gestionar visualización de huesos y trackers',
    trackers: 'Trackers',
    trackersDesc: 'Configuración de trackers virtuales',
    bones: 'Huesos',
    bonesDesc: 'Controles de dedos',
    keys: 'Claves',
    keysDesc: 'Detalles y suavizado de fotogramas clave',
    audio: 'Audio',
    audioDesc: 'Configuración de audio',
    camera: 'Cámara',
    cameraDesc: 'Configuración de cámara de renderizado y salida',
    morph: 'Morfología',
    morphDesc: 'Control de expresión / forma clave'
  },

  model: {
    lookAtEnabled: 'Activar LookAt',
    noModels: 'No hay modelos cargados'
  },

  display: {
    grid: 'Mostrar cuadrícula',
    lightMarker: 'Mostrar marcador de luz',
    markerColor: 'Color del marcador',
    bones: 'Huesos',
    extendedBones: 'Huesos extendidos',
    colliderNodes: 'Nodos de colisión',
    nonDeformingBones: 'Huesos no deformables',
    highlightConstraint: 'Resaltar restricción',
    physicalBones: 'Huesos físicos',
    otherBones: 'Otros huesos',
    boneDotSize: 'Tamaño de punto de hueso',
    boneLabelScale: 'Escala de etiqueta de hueso',
    boneNames: 'Mostrar nombres de huesos',
    outline: 'Contorno',
    outlineWidth: 'Ancho de contorno',
    outlineColor: 'Color de contorno',
    outlineSettings: 'Configuración de contorno VRM',
    targetModel: 'Modelo objetivo',
    reset: 'Restablecer',
    load: 'Cargar'
  },

  lightingPanel: {
    ambientColor: 'Color ambiental',
    ambientIntensity: 'Intensidad ambiental',
    directionalTitle: 'Luz direccional',
    directionalDescription: 'Ajustar posición y orientación con ángulos',
    color: 'Color',
    intensity: 'Intensidad',
    positionX: 'Posición X',
    positionY: 'Posición Y',
    positionZ: 'Posición Z',
    azimuth: 'Azimut (°)',
    elevation: 'Elevación (°)'
  },

  tracker: {
    enable: 'Activar trackers',
    loadModelFirst: 'Por favor, cargue primero un modelo',
    resetPosition: 'Restablecer posición',
    resetRotation: 'Restablecer rotación',
    resetPositionTitle: 'Restablecer a posición inicial',
    resetRotationTitle: 'Restablecer a rotación inicial',
    display: 'Mostrar trackers',
    showLabels: 'Mostrar etiquetas',
    trackerSize: 'Tamaño del tracker',
    labelSize: 'Tamaño de etiqueta',
    showAxes: 'Mostrar ejes de rotación',
    axesLength: 'Longitud de ejes',
    forearmTwist: 'Compartir torsión del antebrazo',
    settings: 'Configuración',
    settingsTitle: (name) => `Configuración de ${name}`,
    position: 'Posición',
    rotation: 'Rotación',
    rotationOrder: 'Orden de rotación',
    rotationAxisDefault: 'Eje de rotación predeterminado',
    axisScaleX: 'Escala X',
    axisScaleY: 'Escala Y',
    axisScaleZ: 'Escala Z',
    positionX: 'Posición X',
    positionY: 'Posición Y',
    positionZ: 'Posición Z',
    pitch: 'Cabeceo',
    yaw: 'Guiñada',
    roll: 'Balanceo',
    selectedTracker: 'Tracker seleccionado',
    orientation: 'Orientación'
  },

  physics: {
    springBoneEnabled: 'Activar SpringBone'
  },

  finger: {
    selectModel: 'Seleccionar modelo',
    leftHand: 'Mano izquierda',
    rightHand: 'Mano derecha',
    resetAll: 'Restablecer todos los dedos',
    handAxisTitle: 'Eje de rotación de la mano',
    handAxisLeft: 'Mano izquierda',
    handAxisRight: 'Mano derecha',
    axisMixed: 'Mixto',
    axisThumbAuto: 'Y+ (auto)',
    axisZPlusAuto: 'Z+ (auto)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: 'Pulgar',
    leftIndex: 'Índice',
    leftMiddle: 'Medio',
    leftRing: 'Anular',
    leftLittle: 'Meñique',
    rightThumb: 'Pulgar',
    rightIndex: 'Índice',
    rightMiddle: 'Medio',
    rightRing: 'Anular',
    rightLittle: 'Meñique'
  },

  keys: {
    selected: 'Seleccionado',
    items: 'elementos',
    multiSelect: 'múltiple',
    selectPrompt: 'Seleccione fotogramas clave para editar su configuración',
    noSelection: 'No hay fotogramas clave seleccionados. Elija claves en la línea de tiempo.',
    multiSelectHint: 'Consejo: Mantenga Shift para seleccionar varias claves.',
    selectModel: 'Seleccionar modelo',
    allModels: 'Todos los modelos',
    selectModelHint: 'Seleccione un modelo para editar curvas específicas del tracker.',
    targetTracker: 'Tracker objetivo',
    allDefault: 'Todos (curvas predeterminadas)'
  },

  audio: {
    title: 'Audio',
    noDuration: 'No hay audio cargado. Importe un MP3 a través del menú.',
    filename: 'Nombre de archivo',
    duration: 'Duración',
    sampleRate: 'Frecuencia de muestreo',
    channels: 'Canales',
    remove: 'Eliminar audio',
    mono: 'Mono',
    stereo: 'Estéreo'
  },

  camera: {
    resolution: 'Resolución',
    width: 'Ancho',
    height: 'Alto',
    presets: 'Preajustes',
    customPreset: 'Personalizado',
    presetFhd: '1920 × 1080 (FHD)',
    presetQhd: '2560 × 1440 (QHD)',
    presetUhd: '3840 × 2160 (4K UHD)',
    presetSquare: '1080 × 1080 (Cuadrado)',
    presetHd: '1280 × 720 (HD)',
    parameters: 'Parámetros',
    fovVertical: 'FOV vertical',
    near: 'Recorte cercano',
    far: 'Recorte lejano',
    wheelSensitivity: 'Sensibilidad de rueda',
    translateSensitivity: 'Sensibilidad de panorámica',
    rotateSensitivity: 'Sensibilidad de órbita',
    showHelper: 'Mostrar ayudante de cámara de renderizado'
  },

  morph: {
    reload: 'Recargar'
  },

  timeline: {
    area: 'Área de línea de tiempo'
  },

  timelinePanel: {
    title: 'Línea de tiempo',
    jumpStart: 'Saltar al principio',
    jumpEnd: 'Saltar al final',
    play: 'Reproducir',
    pause: 'Pausar',
    addAll: 'Agregar claves para todos los trackers',
    addKey: 'Agregar fotograma clave',
    trackersHeader: 'Trackers'
  },

  timelineEditor: {
    loop: 'Bucle',
    loopTooltip: 'Alternar reproducción en bucle',
    fit: 'Ajustar rango',
    fitTooltip: 'Mostrar toda la línea de tiempo',
    addKey: 'Agregar clave',
    addKeyTooltip: 'Agregar fotograma clave en el fotograma actual',
    copy: 'Copiar',
    copyTooltip: 'Copiar fotogramas clave seleccionados',
    paste: 'Pegar',
    pasteTooltip: 'Pegar fotogramas clave en la posición actual',
    delete: 'Eliminar',
    deleteTooltip: 'Eliminar fotogramas clave seleccionados',
    jumpStartLabel: 'Inicio',
    jumpStartTooltip: 'Saltar al fotograma inicial',
    play: 'Reproducir',
    playTooltip: 'Reproducir',
    pause: 'Pausar',
    pauseTooltip: 'Pausar',
    jumpEndLabel: 'Final',
    jumpEndTooltip: 'Saltar al fotograma final',
    rangeStartLabel: 'Inicio',
    rangeEndLabel: 'Final',
    clear: 'Limpiar',
    clearTooltip: 'Limpiar la línea de tiempo'
  },

  timelineCurveEditor: {
    title: 'Curva de suavizado',
    reset: 'Restablecer',
    empty: 'Seleccione dos o más claves para editar la curva.',
    handleLabel: 'Punto de control de curva',
    inLabel: 'Entrada',
    outLabel: 'Salida'
  },

  statusBar: {
    placeholder: 'Aquí aparece información adicional',
    frame: 'Fotograma {current}/{end} ({fps}fps)',
    cacheStandard: 'Caché: Almacenamiento estándar',
    cacheGuardPersisted: 'Persistido',
    cacheGuardVolatile: 'No persistido',
    cacheUsage: 'Caché {usage} ({guard})',
    cacheUsageDetailed: 'Caché {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: 'Caché: Guardado.',
    cacheFailed: 'Caché: Error al guardar. Verifique la configuración de almacenamiento del navegador.',
    cacheCleared: 'Caché: Limpiado.',
    cacheReset: 'Caché: Restablecido caché y línea de tiempo.',
    cachePersistenceEnabled: 'Caché: Persistencia activada.',
    cachePersistenceFailed: 'Caché: Persistencia no disponible. Verifique la configuración de almacenamiento del navegador.',
    modelLoaded: 'Modelo cargado.',
    modelLoadFailed: 'Error al cargar el modelo.',
    audioLoaded: 'Audio cargado.',
    audioLoadFailed: 'Error al cargar el audio.',
    audioLoading: 'Audio: Cargando…',
    audioRemoved: 'Audio: MP3 eliminado.',
    imageCaptured: 'Imagen capturada.',
    imageExportNoRenderer: 'Exportación de imagen: Renderizador no inicializado.',
    imageExportInProgress: 'Exportación de imagen: Procesando…',
    imageExportPreparing: 'Exportación de imagen: Preparando…',
    imageExportCancelled: 'Exportación de imagen: Cancelada.',
    imageExportSaveFailed: 'Exportación de imagen: Error al guardar.',
    imageExportFailed: 'Exportación de imagen: Error.',
    videoCaptured: 'Vídeo capturado.',
    videoExportNoRenderer: 'Exportación de vídeo: Renderizador no inicializado.',
    videoExportNoKeyframes: 'Exportación de vídeo: La línea de tiempo no tiene fotogramas clave.',
    videoExportInProgress: 'Exportación de vídeo: Procesando…',
    videoExportPreparing: 'Exportación de vídeo: Preparando…',
    videoExportSaving: 'Exportación de vídeo: Grabación finalizada, guardando…',
    videoExportCancelled: 'Exportación de vídeo: Cancelada.',
    videoExportSaveFailed: 'Exportación de vídeo: Error al guardar.',
    videoExportFailed: 'Exportación de vídeo: Error.',
    videoExportSaved: 'Exportación de vídeo: Guardado como {name}.',
    timelineNotReady: 'Línea de tiempo: No inicializada.',
    timelineAddFailed: 'Línea de tiempo: Error al agregar fotograma clave.',
    timelineKeyAdded: 'Línea de tiempo: Pose actual agregada como fotograma clave.',
    timelineCopySelect: 'Línea de tiempo: Seleccione claves para copiar.',
    timelineCopyFailed: 'Línea de tiempo: Error al copiar fotogramas clave.',
    timelineCopySuccess: 'Línea de tiempo: {count} fotograma(s) clave copiado(s).',
    timelinePasteEmpty: 'Línea de tiempo: No hay fotogramas clave para pegar.',
    timelinePasteFailed: 'Línea de tiempo: Error al pegar fotogramas clave.',
    timelinePasteSuccess: 'Línea de tiempo: {count} fotograma(s) clave pegado(s).',
    timelineLoadMissing: 'Línea de tiempo: Error al cargar (entrada no encontrada).',
    timelineLoadFailed: 'Línea de tiempo: Error al cargar.',
    timelineParseFailed: 'Línea de tiempo: Error al analizar JSON.',
    timelineExported: 'Línea de tiempo: Exportada.',
    timelineExportFailed: 'Línea de tiempo: Error en la exportación.',
    timelineReset: 'Línea de tiempo: Restablecida.',
    timelineResetFailed: 'Línea de tiempo: Error al restablecer.',
    timelineFileLoaded: 'Línea de tiempo: {name} cargada.',
    timelineTrackerMismatch: 'Línea de tiempo: No se puede importar. El número de trackers no coincide.',
    uiLayoutLoaded: 'UI: Diseño estilo Blender cargado.',
    trackersReset: 'Trackers: Trackers virtuales restablecidos.',
    errorUnknown: 'Ocurrió un error desconocido.',
    errorRaised: 'Error: {message}',
    unhandledRejection: 'Rechazo de promesa no manejado.'
  },

  aria: {
    mainMenu: 'Menú principal',
    settingsTabs: 'Categorías de configuración',
    settingsArea: 'Área de configuración'
  }
}
