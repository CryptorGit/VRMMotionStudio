export default {
  meta: { name: 'German' },

  languages: {
    en: 'Englisch',
    ja: 'Japanisch',
    ko: 'Koreanisch',
    zh: 'Chinesisch',
    ru: 'Russisch',
    fr: 'Französisch',
    es: 'Spanisch',
    de: 'Deutsch',
    it: 'Italienisch'
  },

  brand: {
    title: 'StellarMotion Studio',
    beta: 'BETA',
    betaAria: 'Beta-Version'
  },

  menu: {
    import: 'Importieren',
    importAudio: 'Audio importieren',
    export: 'Exportieren',
    captureImage: 'Bild aufnehmen',
    captureVideo: 'Video aufnehmen',
    clearCache: 'Cache leeren',
    exportProject: 'Projekt exportieren',
    importProject: 'Projekt importieren',
    captions: 'Untertitel',
    timelineImport: 'Timeline importieren',
    timelineExport: 'Timeline exportieren'
  },

  menuTooltips: {
    import: '3D-Modell laden',
    importAudio: 'MP3-Audiodatei laden',
    export: 'Aktuelle Pose exportieren',
    captureImage: 'Bild rendern und speichern',
    captureVideo: 'Video rendern und speichern',
    clearCache: 'Geladene Modelle und Einstellungen zurücksetzen',
    exportProject: 'Cache als Projektdatei speichern',
    importProject: 'Cache aus Projektdatei wiederherstellen',
    captionsOn: 'Untertitel ausschalten',
    captionsOff: 'Untertitel einschalten',
    timelineImport: 'Gespeicherte Timeline laden',
    timelineExport: 'Aktuelle Timeline speichern',
    timelineExportDisabled: 'Keine Timeline zum Speichern verfügbar'
  },

  menuControls: {
    lighting: 'Beleuchtung',
    display: 'Anzeige',
    physics: 'Physik',
    morph: 'Morph-Ziele',
    models: 'Modelle',
    autoRestore: 'Timeline automatisch wiederherstellen'
  },

  common: {
    on: 'Ein',
    off: 'Aus',
    reset: 'Zurücksetzen',
    delete: 'Entfernen'
  },

  viewport: {
    mode: 'Modus',
    viewMode: 'Ansichtsmodus',
    cameraMode: 'Kamera-Modus',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    renderCam: 'RenderCam',
    cameraHint: 'Linke Taste: Verschieben | Rechte Taste: Neigen | Rad: Zoomen',
    trackerHint: 'Linke Taste: Bewegen | Shift: Feineinstellung',
    roll: 'Rollen',
    area: 'Viewport-Bereich',
    modeToggle: 'Ansichtsmodus umschalten'
  },

  tabs: {
    lighting: 'Beleuchtung',
    lightingDesc: 'Beleuchtung und Umgebung anpassen',
    model: 'Modell',
    modelDesc: 'Modelle anzeigen und verwalten',
    display: 'Anzeige',
    displayDesc: 'Knochen- und Tracker-Anzeige verwalten',
    trackers: 'Tracker',
    trackersDesc: 'Virtuelle Tracker-Einstellungen',
    bones: 'Knochen',
    bonesDesc: 'Fingersteuerung',
    keys: 'Schlüssel',
    keysDesc: 'Keyframe-Details und Easing',
    audio: 'Audio',
    audioDesc: 'Audio-Einstellungen',
    camera: 'Kamera',
    cameraDesc: 'Render-Kamera und Ausgabeeinstellungen',
    morph: 'Morph',
    morphDesc: 'Ausdrucks- / Shape-Key-Steuerung'
  },

  model: {
    lookAtEnabled: 'LookAt aktivieren',
    noModels: 'Keine Modelle geladen'
  },

  display: {
    grid: 'Raster anzeigen',
    lightMarker: 'Licht-Marker anzeigen',
    markerColor: 'Marker-Farbe',
    bones: 'Knochen',
    extendedBones: 'Erweiterte Knochen',
    colliderNodes: 'Kollisions-Knoten',
    nonDeformingBones: 'Nicht-verformende Knochen',
    highlightConstraint: 'Beschränkung hervorheben',
    physicalBones: 'Physikalische Knochen',
    otherBones: 'Andere Knochen',
    boneDotSize: 'Knochenpunkt-Größe',
    boneLabelScale: 'Knochen-Label-Skalierung',
    boneNames: 'Knochennamen anzeigen',
    outline: 'Umriss',
    outlineWidth: 'Umriss-Breite',
    outlineColor: 'Umriss-Farbe',
    outlineSettings: 'VRM-Umriss-Einstellungen',
    targetModel: 'Zielmodell',
    reset: 'Zurücksetzen',
    load: 'Laden'
  },

  lightingPanel: {
    ambientColor: 'Umgebungsfarbe',
    ambientIntensity: 'Umgebungsintensität',
    directionalTitle: 'Gerichtetes Licht',
    directionalDescription: 'Position und Ausrichtung mit Winkeln anpassen',
    color: 'Farbe',
    intensity: 'Intensität',
    positionX: 'Position X',
    positionY: 'Position Y',
    positionZ: 'Position Z',
    azimuth: 'Azimut (°)',
    elevation: 'Elevation (°)'
  },

  tracker: {
    enable: 'Tracker aktivieren',
    loadModelFirst: 'Bitte laden Sie zuerst ein Modell',
    resetPosition: 'Position zurücksetzen',
    resetRotation: 'Rotation zurücksetzen',
    resetPositionTitle: 'Auf Ausgangsposition zurücksetzen',
    resetRotationTitle: 'Auf Ausgangsrotation zurücksetzen',
    display: 'Tracker anzeigen',
    showLabels: 'Labels anzeigen',
    trackerSize: 'Tracker-Größe',
    labelSize: 'Label-Größe',
    showAxes: 'Rotationsachsen anzeigen',
    axesLength: 'Achsenlänge',
    forearmTwist: 'Unterarm-Twist-Anteil',
    settings: 'Einstellungen',
    settingsTitle: (name) => `${name} Einstellungen`,
    position: 'Position',
    rotation: 'Rotation',
    rotationOrder: 'Rotationsreihenfolge',
    rotationAxisDefault: 'Standard-Rotationsachse',
    axisScaleX: 'Skalierung X',
    axisScaleY: 'Skalierung Y',
    axisScaleZ: 'Skalierung Z',
    positionX: 'Position X',
    positionY: 'Position Y',
    positionZ: 'Position Z',
    pitch: 'Pitch',
    yaw: 'Yaw',
    roll: 'Roll',
    selectedTracker: 'Ausgewählter Tracker',
    orientation: 'Ausrichtung'
  },

  physics: {
    springBoneEnabled: 'SpringBone aktivieren'
  },

  finger: {
    selectModel: 'Modell auswählen',
    leftHand: 'Linke Hand',
    rightHand: 'Rechte Hand',
    resetAll: 'Alle Finger zurücksetzen',
    handAxisTitle: 'Hand-Rotationsachse',
    handAxisLeft: 'Linke Hand',
    handAxisRight: 'Rechte Hand',
    axisMixed: 'Gemischt',
    axisThumbAuto: 'Y+ (auto)',
    axisZPlusAuto: 'Z+ (auto)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: 'Daumen',
    leftIndex: 'Zeigefinger',
    leftMiddle: 'Mittelfinger',
    leftRing: 'Ringfinger',
    leftLittle: 'Kleiner Finger',
    rightThumb: 'Daumen',
    rightIndex: 'Zeigefinger',
    rightMiddle: 'Mittelfinger',
    rightRing: 'Ringfinger',
    rightLittle: 'Kleiner Finger'
  },

  keys: {
    selected: 'Ausgewählt',
    items: 'Elemente',
    multiSelect: 'mehrfach',
    selectPrompt: 'Keyframes auswählen, um ihre Einstellungen zu bearbeiten',
    noSelection: 'Keine Keyframes ausgewählt. Wählen Sie Schlüssel in der Timeline.',
    multiSelectHint: 'Tipp: Shift gedrückt halten, um mehrere Schlüssel auszuwählen.',
    selectModel: 'Modell auswählen',
    allModels: 'Alle Modelle',
    selectModelHint: 'Wählen Sie ein Modell aus, um tracker-spezifische Kurven zu bearbeiten.',
    targetTracker: 'Ziel-Tracker',
    allDefault: 'Alle (Standardkurven)'
  },

  audio: {
    title: 'Audio',
    noDuration: 'Kein Audio geladen. Importieren Sie eine MP3 über das Menü.',
    filename: 'Dateiname',
    duration: 'Dauer',
    sampleRate: 'Sample-Rate',
    channels: 'Kanäle',
    remove: 'Audio entfernen',
    mono: 'Mono',
    stereo: 'Stereo'
  },

  camera: {
    resolution: 'Auflösung',
    width: 'Breite',
    height: 'Höhe',
    presets: 'Voreinstellungen',
    customPreset: 'Benutzerdefiniert',
    presetFhd: '1920 × 1080 (FHD)',
    presetQhd: '2560 × 1440 (QHD)',
    presetUhd: '3840 × 2160 (4K UHD)',
    presetSquare: '1080 × 1080 (Quadratisch)',
    presetHd: '1280 × 720 (HD)',
    parameters: 'Parameter',
    fovVertical: 'Vertikales FOV',
    near: 'Naher Clip',
    far: 'Ferner Clip',
    wheelSensitivity: 'Rad-Empfindlichkeit',
    translateSensitivity: 'Verschiebe-Empfindlichkeit',
    rotateSensitivity: 'Rotations-Empfindlichkeit',
    showHelper: 'Render-Kamera-Helfer anzeigen'
  },

  morph: {
    reload: 'Neu laden'
  },

  timeline: {
    area: 'Timeline-Bereich'
  },

  timelinePanel: {
    title: 'Timeline',
    jumpStart: 'Zum Anfang springen',
    jumpEnd: 'Zum Ende springen',
    play: 'Abspielen',
    pause: 'Pausieren',
    addAll: 'Schlüssel für alle Tracker hinzufügen',
    addKey: 'Keyframe hinzufügen',
    trackersHeader: 'Tracker'
  },

  timelineEditor: {
    loop: 'Schleife',
    loopTooltip: 'Schleifen-Wiedergabe umschalten',
    fit: 'Bereich anpassen',
    fitTooltip: 'Gesamte Timeline anzeigen',
    addKey: 'Schlüssel hinzufügen',
    addKeyTooltip: 'Keyframe am aktuellen Frame hinzufügen',
    copy: 'Kopieren',
    copyTooltip: 'Ausgewählte Keyframes kopieren',
    paste: 'Einfügen',
    pasteTooltip: 'Keyframes an aktueller Position einfügen',
    delete: 'Löschen',
    deleteTooltip: 'Ausgewählte Keyframes löschen',
    jumpStartLabel: 'Start',
    jumpStartTooltip: 'Zum Start-Frame springen',
    play: 'Abspielen',
    playTooltip: 'Abspielen',
    pause: 'Pausieren',
    pauseTooltip: 'Pausieren',
    jumpEndLabel: 'Ende',
    jumpEndTooltip: 'Zum End-Frame springen',
    rangeStartLabel: 'Start',
    rangeEndLabel: 'Ende',
    clear: 'Leeren',
    clearTooltip: 'Timeline leeren'
  },

  timelineCurveEditor: {
    title: 'Easing-Kurve',
    reset: 'Zurücksetzen',
    empty: 'Wählen Sie zwei oder mehr Schlüssel aus, um die Kurve zu bearbeiten.',
    handleLabel: 'Kurven-Kontrollpunkt',
    inLabel: 'Eingang',
    outLabel: 'Ausgang'
  },

  statusBar: {
    placeholder: 'Zusätzliche Informationen erscheinen hier',
    frame: 'Frame {current}/{end} ({fps}fps)',
    cacheStandard: 'Cache: Standard-Speicher',
    cacheGuardPersisted: 'Persistiert',
    cacheGuardVolatile: 'Nicht persistiert',
    cacheUsage: 'Cache {usage} ({guard})',
    cacheUsageDetailed: 'Cache {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: 'Cache: Gespeichert.',
    cacheFailed: 'Cache: Speichern fehlgeschlagen. Prüfen Sie die Browser-Speichereinstellungen.',
    cacheCleared: 'Cache: Geleert.',
    cacheReset: 'Cache: Cache und Timeline zurückgesetzt.',
    cachePersistenceEnabled: 'Cache: Persistenz aktiviert.',
    cachePersistenceFailed: 'Cache: Persistenz nicht verfügbar. Prüfen Sie die Browser-Speichereinstellungen.',
    projectExported: 'Projekt: Erfolgreich exportiert.',
    projectExportFailed: 'Projekt: Export fehlgeschlagen.',
    projectImporting: 'Projekt: Wird importiert…',
    projectImported: 'Projekt: Erfolgreich importiert.',
    projectImportFailed: 'Projekt: Import fehlgeschlagen.',
    projectImportEmpty: 'Projekt: Keine Modelle in der Projektdatei gefunden.',
    modelLoaded: 'Modell geladen.',
    modelLoadFailed: 'Fehler beim Laden des Modells.',
    audioLoaded: 'Audio geladen.',
    audioLoadFailed: 'Fehler beim Laden des Audios.',
    audioLoading: 'Audio: Wird geladen…',
    audioRemoved: 'Audio: MP3 entfernt.',
    imageCaptured: 'Bild aufgenommen.',
    imageExportNoRenderer: 'Bildexport: Renderer nicht initialisiert.',
    imageExportInProgress: 'Bildexport: Wird verarbeitet…',
    imageExportPreparing: 'Bildexport: Wird vorbereitet…',
    imageExportCancelled: 'Bildexport: Abgebrochen.',
    imageExportSaveFailed: 'Bildexport: Speichern fehlgeschlagen.',
    imageExportFailed: 'Bildexport: Fehlgeschlagen.',
    videoCaptured: 'Video aufgenommen.',
    videoExportNoRenderer: 'Videoexport: Renderer nicht initialisiert.',
    videoExportNoKeyframes: 'Videoexport: Timeline hat keine Keyframes.',
    videoExportInProgress: 'Videoexport: Wird verarbeitet…',
    videoExportPreparing: 'Videoexport: Wird vorbereitet…',
    videoExportSaving: 'Videoexport: Aufnahme abgeschlossen, wird gespeichert…',
    videoExportCancelled: 'Videoexport: Abgebrochen.',
    videoExportSaveFailed: 'Videoexport: Speichern fehlgeschlagen.',
    videoExportFailed: 'Videoexport: Fehlgeschlagen.',
    videoExportSaved: 'Videoexport: Als {name} gespeichert.',
    timelineNotReady: 'Timeline: Nicht initialisiert.',
    timelineAddFailed: 'Timeline: Keyframe konnte nicht hinzugefügt werden.',
    timelineKeyAdded: 'Timeline: Aktuelle Pose als Keyframe hinzugefügt.',
    timelineCopySelect: 'Timeline: Wählen Sie Schlüssel zum Kopieren aus.',
    timelineCopyFailed: 'Timeline: Keyframes konnten nicht kopiert werden.',
    timelineCopySuccess: 'Timeline: {count} Keyframe(s) kopiert.',
    timelinePasteEmpty: 'Timeline: Keine Keyframes zum Einfügen.',
    timelinePasteFailed: 'Timeline: Keyframes konnten nicht eingefügt werden.',
    timelinePasteSuccess: 'Timeline: {count} Keyframe(s) eingefügt.',
    timelineLoadMissing: 'Timeline: Laden fehlgeschlagen (Eingabe nicht gefunden).',
    timelineLoadFailed: 'Timeline: Laden fehlgeschlagen.',
    timelineParseFailed: 'Timeline: JSON-Parsing fehlgeschlagen.',
    timelineExported: 'Timeline: Exportiert.',
    timelineExportFailed: 'Timeline: Export fehlgeschlagen.',
    timelineReset: 'Timeline: Zurückgesetzt.',
    timelineResetFailed: 'Timeline: Zurücksetzen fehlgeschlagen.',
    timelineFileLoaded: 'Timeline: {name} geladen.',
    timelineTrackerMismatch: 'Timeline: Import nicht möglich. Tracker-Anzahl stimmt nicht überein.',
    uiLayoutLoaded: 'UI: Blender-ähnliches Layout geladen.',
    trackersReset: 'Tracker: Virtuelle Tracker zurückgesetzt.',
    errorUnknown: 'Unbekannter Fehler aufgetreten.',
    errorRaised: 'Fehler: {message}',
    unhandledRejection: 'Nicht behandelte Promise-Ablehnung.'
  },

  aria: {
    mainMenu: 'Hauptmenü',
    settingsTabs: 'Einstellungskategorien',
    settingsArea: 'Einstellungsbereich'
  }
}
