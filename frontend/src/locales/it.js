export default {
  meta: { name: 'Italian' },

  languages: {
    en: 'Inglese',
    ja: 'Giapponese',
    ko: 'Coreano',
    zh: 'Cinese',
    ru: 'Russo',
    fr: 'Francese',
    es: 'Spagnolo',
    de: 'Tedesco',
    it: 'Italiano'
  },

  brand: {
    title: 'VRM Motion Studio',
    beta: 'BETA',
    betaAria: 'Versione beta'
  },

  menu: {
    import: 'Importa',
    importAudio: 'Importa audio',
    export: 'Esporta',
    captureImage: 'Cattura immagine',
    captureVideo: 'Cattura video',
    clearCache: 'Cancella cache',
    exportProject: 'Esporta progetto',
    importProject: 'Importa progetto',
    captions: 'Sottotitoli',
    timelineImport: 'Importa timeline',
    timelineExport: 'Esporta timeline'
  },

  menuTooltips: {
    import: 'Carica un modello 3D',
    importAudio: 'Carica un file audio MP3',
    export: 'Esporta la posa corrente',
    captureImage: 'Renderizza e salva un immagine',
    captureVideo: 'Renderizza e salva un video',
    clearCache: 'Reimposta modelli e impostazioni caricati',
    exportProject: 'Salva cache come file progetto',
    importProject: 'Ripristina cache da file progetto',
    captionsOn: 'Disattiva sottotitoli',
    captionsOff: 'Attiva sottotitoli',
    timelineImport: 'Importa una timeline salvata',
    timelineExport: 'Salva la timeline corrente',
    timelineExportDisabled: 'Nessuna timeline disponibile da salvare'
  },

  menuControls: {
    lighting: 'Illuminazione',
    display: 'Visualizzazione',
    physics: 'Fisica',
    morph: 'Obiettivi morph',
    models: 'Modelli',
    autoRestore: 'Ripristina automaticamente timeline'
  },

  common: {
    on: 'Attivo',
    off: 'Disattivo',
    reset: 'Reimposta',
    delete: 'Rimuovi'
  },

  viewport: {
    mode: 'Modalità',
    viewMode: 'Modalità visualizzazione',
    cameraMode: 'Modalità camera',
    undo: 'Annulla',
    redo: 'Ripeti',
    renderCam: 'Camera render',
    cameraHint: 'Trascina sinistro: Panoramica | Trascina destro: Inclinazione | Rotella: Zoom',
    trackerHint: 'Trascina sinistro: Sposta | Shift: Regolazione fine',
    roll: 'Rollio',
    area: 'Area viewport',
    modeToggle: 'Alterna modalità visualizzazione'
  },

  tabs: {
    lighting: 'Illuminazione',
    lightingDesc: 'Regola illuminazione e ambiente',
    model: 'Modello',
    modelDesc: 'Visualizza e gestisci modelli',
    display: 'Visualizzazione',
    displayDesc: 'Gestisci visualizzazione ossa e tracker',
    trackers: 'Tracker',
    trackersDesc: 'Impostazioni tracker virtuali',
    bones: 'Ossa',
    bonesDesc: 'Controlli dita',
    keys: 'Chiavi',
    keysDesc: 'Dettagli fotogramma chiave ed easing',
    audio: 'Audio',
    audioDesc: 'Impostazioni audio',
    camera: 'Camera',
    cameraDesc: 'Impostazioni camera render e output',
    morph: 'Morph',
    morphDesc: 'Controllo espressioni / chiavi forma'
  },

  model: {
    lookAtEnabled: 'Attiva LookAt',
    noModels: 'Nessun modello caricato'
  },

  display: {
    grid: 'Mostra griglia',
    lightMarker: 'Mostra marcatore luce',
    markerColor: 'Colore marcatore',
    bones: 'Ossa',
    extendedBones: 'Ossa estese',
    colliderNodes: 'Nodi collisione',
    nonDeformingBones: 'Ossa non deformanti',
    highlightConstraint: 'Evidenzia vincolo',
    physicalBones: 'Ossa fisiche',
    otherBones: 'Altre ossa',
    boneDotSize: 'Dimensione punto osso',
    boneLabelScale: 'Scala etichetta osso',
    boneNames: 'Mostra nomi ossa',
    outline: 'Contorno',
    outlineWidth: 'Larghezza contorno',
    outlineColor: 'Colore contorno',
    outlineSettings: 'Impostazioni contorno VRM',
    targetModel: 'Modello target',
    reset: 'Reimposta',
    load: 'Carica'
  },

  lightingPanel: {
    ambientColor: 'Colore ambiente',
    ambientIntensity: 'Intensità ambiente',
    directionalTitle: 'Luce direzionale',
    directionalDescription: 'Regola posizione e orientamento con angoli',
    color: 'Colore',
    intensity: 'Intensità',
    positionX: 'Posizione X',
    positionY: 'Posizione Y',
    positionZ: 'Posizione Z',
    azimuth: 'Azimut ()',
    elevation: 'Elevazione ()'
  },

  tracker: {
    enable: 'Attiva tracker',
    loadModelFirst: 'Carica prima un modello',
    resetPosition: 'Reimposta posizione',
    resetRotation: 'Reimposta rotazione',
    resetPositionTitle: 'Reimposta a posizione iniziale',
    resetRotationTitle: 'Reimposta a rotazione iniziale',
    display: 'Mostra tracker',
    showLabels: 'Mostra etichette',
    trackerSize: 'Dimensione tracker',
    labelSize: 'Dimensione etichetta',
    showAxes: 'Mostra assi rotazione',
    axesLength: 'Lunghezza assi',
    forearmTwist: 'Condivisione torsione avambraccio',
    settings: 'Impostazioni',
    settingsTitle: (name) => `Impostazioni ${name}`,
    position: 'Posizione',
    rotation: 'Rotazione',
    rotationOrder: 'Ordine rotazione',
    rotationAxisDefault: 'Asse rotazione predefinito',
    axisScaleX: 'Scala X',
    axisScaleY: 'Scala Y',
    axisScaleZ: 'Scala Z',
    positionX: 'Posizione X',
    positionY: 'Posizione Y',
    positionZ: 'Posizione Z',
    pitch: 'Beccheggio',
    yaw: 'Imbardata',
    roll: 'Rollio',
    selectedTracker: 'Tracker selezionato',
    orientation: 'Orientamento'
  },

  physics: {
    springBoneEnabled: 'Attiva SpringBone'
  },

  finger: {
    selectModel: 'Seleziona modello',
    leftHand: 'Mano sinistra',
    rightHand: 'Mano destra',
    resetAll: 'Reimposta tutte le dita',
    handAxisTitle: 'Asse rotazione mano',
    handAxisLeft: 'Mano sinistra',
    handAxisRight: 'Mano destra',
    axisMixed: 'Misto',
    axisThumbAuto: 'Y+ (auto)',
    axisZPlusAuto: 'Z+ (auto)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: 'Pollice',
    leftIndex: 'Indice',
    leftMiddle: 'Medio',
    leftRing: 'Anulare',
    leftLittle: 'Mignolo',
    rightThumb: 'Pollice',
    rightIndex: 'Indice',
    rightMiddle: 'Medio',
    rightRing: 'Anulare',
    rightLittle: 'Mignolo'
  },

  keys: {
    selected: 'Selezionato',
    items: 'elementi',
    multiSelect: 'multiplo',
    selectPrompt: 'Seleziona fotogrammi chiave per modificare le impostazioni',
    noSelection: 'Nessun fotogramma chiave selezionato. Scegli chiavi nella timeline.',
    multiSelectHint: 'Suggerimento: Tieni premuto Shift per selezionare più chiavi.',
    selectModel: 'Seleziona modello',
    allModels: 'Tutti i modelli',
    selectModelHint: 'Seleziona un modello per modificare curve specifiche del tracker.',
    targetTracker: 'Tracker target',
    allDefault: 'Tutti (curve predefinite)'
  },

  audio: {
    title: 'Audio',
    noDuration: 'Nessun audio caricato. Importa un MP3 tramite il menu.',
    filename: 'Nome file',
    duration: 'Durata',
    sampleRate: 'Frequenza campionamento',
    channels: 'Canali',
    remove: 'Rimuovi audio',
    mono: 'Mono',
    stereo: 'Stereo'
  },

  camera: {
    resolution: 'Risoluzione',
    width: 'Larghezza',
    height: 'Altezza',
    presets: 'Preimpostazioni',
    customPreset: 'Personalizzato',
    presetFhd: '1920  1080 (FHD)',
    presetQhd: '2560  1440 (QHD)',
    presetUhd: '3840  2160 (4K UHD)',
    presetSquare: '1080  1080 (Quadrato)',
    presetHd: '1280  720 (HD)',
    parameters: 'Parametri',
    fovVertical: 'FOV verticale',
    near: 'Clip vicino',
    far: 'Clip lontano',
    wheelSensitivity: 'Sensibilità rotella',
    translateSensitivity: 'Sensibilità panoramica',
    rotateSensitivity: 'Sensibilità orbita',
    showHelper: 'Mostra helper camera render'
  },

  morph: {
    reload: 'Ricarica'
  },

  timeline: {
    area: 'Area timeline'
  },

  timelinePanel: {
    title: 'Timeline',
    jumpStart: 'Salta all inizio',
    jumpEnd: 'Salta alla fine',
    play: 'Riproduci',
    pause: 'Pausa',
    addAll: 'Aggiungi chiavi per tutti i tracker',
    addKey: 'Aggiungi fotogramma chiave',
    trackersHeader: 'Tracker'
  },

  timelineEditor: {
    loop: 'Ciclo',
    loopTooltip: 'Alterna riproduzione ciclica',
    fit: 'Adatta intervallo',
    fitTooltip: 'Mostra l intera timeline',
    addKey: 'Aggiungi chiave',
    addKeyTooltip: 'Aggiungi fotogramma chiave al fotogramma corrente',
    copy: 'Copia',
    copyTooltip: 'Copia fotogrammi chiave selezionati',
    paste: 'Incolla',
    pasteTooltip: 'Incolla fotogrammi chiave alla posizione corrente',
    delete: 'Elimina',
    deleteTooltip: 'Elimina fotogrammi chiave selezionati',
    jumpStartLabel: 'Inizio',
    jumpStartTooltip: 'Salta al fotogramma iniziale',
    play: 'Riproduci',
    playTooltip: 'Riproduci',
    pause: 'Pausa',
    pauseTooltip: 'Pausa',
    jumpEndLabel: 'Fine',
    jumpEndTooltip: 'Salta al fotogramma finale',
    rangeStartLabel: 'Inizio',
    rangeEndLabel: 'Fine',
    clear: 'Cancella',
    clearTooltip: 'Cancella la timeline'
  },

  timelineCurveEditor: {
    title: 'Curva easing',
    reset: 'Reimposta',
    empty: 'Seleziona due o più chiavi per modificare la curva.',
    handleLabel: 'Punto controllo curva',
    inLabel: 'Ingresso',
    outLabel: 'Uscita'
  },

  statusBar: {
    placeholder: 'Qui appaiono informazioni aggiuntive',
    frame: 'Fotogramma {current}/{end} ({fps}fps)',
    cacheStandard: 'Cache: Archiviazione standard',
    cacheGuardPersisted: 'Persistito',
    cacheGuardVolatile: 'Non persistito',
    cacheUsage: 'Cache {usage} ({guard})',
    cacheUsageDetailed: 'Cache {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: 'Cache: Salvata.',
    cacheFailed: 'Cache: Salvataggio fallito. Controlla le impostazioni di archiviazione del browser.',
    cacheCleared: 'Cache: Cancellata.',
    cacheReset: 'Cache: Reimpostata cache e timeline.',
    cachePersistenceEnabled: 'Cache: Persistenza attivata.',
    cachePersistenceFailed: 'Cache: Persistenza non disponibile. Controlla le impostazioni di archiviazione del browser.',
    modelLoaded: 'Modello caricato.',
    modelLoadFailed: 'Caricamento modello fallito.',
    audioLoaded: 'Audio caricato.',
    audioLoadFailed: 'Caricamento audio fallito.',
    audioLoading: 'Audio: Caricamento',
    audioRemoved: 'Audio: MP3 rimosso.',
    imageCaptured: 'Immagine catturata.',
    imageExportNoRenderer: 'Esportazione immagine: Renderer non inizializzato.',
    imageExportInProgress: 'Esportazione immagine: Elaborazione',
    imageExportPreparing: 'Esportazione immagine: Preparazione',
    imageExportCancelled: 'Esportazione immagine: Annullata.',
    imageExportSaveFailed: 'Esportazione immagine: Salvataggio fallito.',
    imageExportFailed: 'Esportazione immagine: Fallita.',
    videoCaptured: 'Video catturato.',
    videoExportNoRenderer: 'Esportazione video: Renderer non inizializzato.',
    videoExportNoKeyframes: 'Esportazione video: La timeline non ha fotogrammi chiave.',
    videoExportInProgress: 'Esportazione video: Elaborazione',
    videoExportPreparing: 'Esportazione video: Preparazione',
    videoExportSaving: 'Esportazione video: Registrazione completata, salvataggio',
    videoExportCancelled: 'Esportazione video: Annullata.',
    videoExportSaveFailed: 'Esportazione video: Salvataggio fallito.',
    videoExportFailed: 'Esportazione video: Fallita.',
    videoExportSaved: 'Esportazione video: Salvato come {name}.',
    timelineNotReady: 'Timeline: Non inizializzata.',
    timelineAddFailed: 'Timeline: Aggiunta fotogramma chiave fallita.',
    timelineKeyAdded: 'Timeline: Posa corrente aggiunta come fotogramma chiave.',
    timelineCopySelect: 'Timeline: Seleziona chiavi da copiare.',
    timelineCopyFailed: 'Timeline: Copia fotogrammi chiave fallita.',
    timelineCopySuccess: 'Timeline: {count} fotogramma/i chiave copiato/i.',
    timelinePasteEmpty: 'Timeline: Nessun fotogramma chiave da incollare.',
    timelinePasteFailed: 'Timeline: Incollatura fotogrammi chiave fallita.',
    timelinePasteSuccess: 'Timeline: {count} fotogramma/i chiave incollato/i.',
    timelineLoadMissing: 'Timeline: Caricamento fallito (input non trovato).',
    timelineLoadFailed: 'Timeline: Caricamento fallito.',
    timelineParseFailed: 'Timeline: Analisi JSON fallita.',
    timelineExported: 'Timeline: Esportata.',
    timelineExportFailed: 'Timeline: Esportazione fallita.',
    timelineReset: 'Timeline: Reimpostata.',
    timelineResetFailed: 'Timeline: Reimpostazione fallita.',
    timelineFileLoaded: 'Timeline: {name} caricata.',
    timelineTrackerMismatch: 'Timeline: Impossibile importare. Il numero di tracker non corrisponde.',
    uiLayoutLoaded: 'UI: Layout stile Blender caricato.',
    trackersReset: 'Tracker: Tracker virtuali reimpostati.',
    errorUnknown: 'Si è verificato un errore sconosciuto.',
    errorRaised: 'Errore: {message}',
    unhandledRejection: 'Rifiuto promessa non gestito.'
  },

  aria: {
    mainMenu: 'Menu principale',
    settingsTabs: 'Categorie impostazioni',
    settingsArea: 'Area impostazioni'
  }
}
