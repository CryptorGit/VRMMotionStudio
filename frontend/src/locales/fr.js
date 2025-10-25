export default {
  meta: { name: 'French' },

  languages: {
    en: 'Anglais',
    ja: 'Japonais',
    ko: 'Coréen',
    zh: 'Chinois',
    ru: 'Russe',
    fr: 'Français',
    es: 'Espagnol',
    de: 'Allemand',
    it: 'Italien'
  },

  brand: {
    title: 'VRM Motion Studio',
    beta: 'BÊTA',
    betaAria: 'Version bêta'
  },

  menu: {
    import: 'Importer',
    importAudio: 'Importer audio',
    export: 'Exporter',
    captureImage: 'Capturer image',
    captureVideo: 'Capturer vidéo',
    clearCache: 'Vider le cache',
    captions: 'Légendes',
    timelineImport: 'Importer timeline',
    timelineExport: 'Exporter timeline'
  },

  menuTooltips: {
    import: 'Charger un modèle 3D',
    importAudio: 'Charger un fichier audio MP3',
    export: 'Exporter la pose actuelle',
    captureImage: 'Rendre et sauvegarder une image',
    captureVideo: 'Rendre et sauvegarder une vidéo',
    clearCache: 'Réinitialiser les modèles et paramètres chargés',
    captionsOn: 'Désactiver les légendes',
    captionsOff: 'Activer les légendes',
    timelineImport: 'Importer une timeline sauvegardée',
    timelineExport: 'Sauvegarder la timeline actuelle',
    timelineExportDisabled: 'Aucune timeline disponible à sauvegarder'
  },

  menuControls: {
    lighting: 'Éclairage',
    display: 'Affichage',
    physics: 'Physique',
    morph: 'Cibles de morphing',
    models: 'Modèles',
    autoRestore: 'Restauration automatique de la timeline'
  },

  common: {
    on: 'Activé',
    off: 'Désactivé',
    reset: 'Réinitialiser',
    delete: 'Supprimer'
  },

  viewport: {
    mode: 'Mode',
    viewMode: 'Mode Vue',
    cameraMode: 'Mode Caméra',
    undo: 'Annuler',
    redo: 'Rétablir',
    renderCam: 'Caméra de rendu',
    cameraHint: 'Glisser gauche: Panoramique | Glisser droite: Inclinaison | Molette: Déplacement',
    trackerHint: 'Glisser gauche: Déplacer | Shift: Ajustement fin',
    roll: 'Roulis',
    area: 'Zone de vue',
    modeToggle: 'Basculer le mode de vue'
  },

  tabs: {
    lighting: 'Éclairage',
    lightingDesc: 'Ajuster l\'éclairage et l\'ambiance',
    model: 'Modèle',
    modelDesc: 'Afficher et gérer les modèles',
    display: 'Affichage',
    displayDesc: 'Gérer l\'affichage des os et des trackers',
    trackers: 'Trackers',
    trackersDesc: 'Paramètres des trackers virtuels',
    bones: 'Os',
    bonesDesc: 'Contrôles des doigts',
    keys: 'Clés',
    keysDesc: 'Détails des images-clés et easing',
    audio: 'Audio',
    audioDesc: 'Paramètres audio',
    camera: 'Caméra',
    cameraDesc: 'Paramètres de la caméra et de la sortie',
    morph: 'Morph',
    morphDesc: 'Contrôle des expressions / shape-keys'
  },

  model: {
    lookAtEnabled: 'Activer LookAt',
    noModels: 'Aucun modèle chargé'
  },

  display: {
    grid: 'Afficher la grille',
    lightMarker: 'Afficher le marqueur de lumière',
    markerColor: 'Couleur du marqueur',
    bones: 'Os',
    extendedBones: 'Os étendus',
    colliderNodes: 'Nœuds de collision',
    nonDeformingBones: 'Os non déformants',
    highlightConstraint: 'Mettre en évidence les contraintes',
    physicalBones: 'Os physiques',
    otherBones: 'Autres os',
    boneDotSize: 'Taille du point d\'os',
    boneLabelScale: 'Échelle d\'étiquette d\'os',
    boneNames: 'Afficher les noms des os',
    outline: 'Contour',
    outlineWidth: 'Largeur du contour',
    outlineColor: 'Couleur du contour',
    outlineSettings: 'Paramètres du contour VRM',
    targetModel: 'Modèle cible',
    reset: 'Réinitialiser',
    load: 'Charger'
  },

  lightingPanel: {
    ambientColor: 'Couleur ambiante',
    ambientIntensity: 'Intensité ambiante',
    directionalTitle: 'Lumière directionnelle',
    directionalDescription: 'Ajuster la position et l\'orientation avec des angles',
    color: 'Couleur',
    intensity: 'Intensité',
    positionX: 'Position X',
    positionY: 'Position Y',
    positionZ: 'Position Z',
    azimuth: 'Azimut (°)',
    elevation: 'Élévation (°)'
  },

  tracker: {
    enable: 'Activer les trackers',
    loadModelFirst: 'Veuillez d\'abord charger un modèle',
    resetPosition: 'Réinitialiser la position',
    resetRotation: 'Réinitialiser la rotation',
    resetPositionTitle: 'Réinitialiser à la position initiale',
    resetRotationTitle: 'Réinitialiser à la rotation initiale',
    display: 'Afficher les trackers',
    showLabels: 'Afficher les étiquettes',
    trackerSize: 'Taille du tracker',
    labelSize: 'Taille de l\'étiquette',
    showAxes: 'Afficher les axes de rotation',
    axesLength: 'Longueur des axes',
    forearmTwist: 'Partage de torsion de l\'avant-bras',
    settings: 'Paramètres',
    settingsTitle: (name) => `Paramètres de ${name}`,
    position: 'Position',
    rotation: 'Rotation',
    rotationOrder: 'Ordre de rotation',
    rotationAxisDefault: 'Axe de rotation par défaut',
    axisScaleX: 'Échelle X',
    axisScaleY: 'Échelle Y',
    axisScaleZ: 'Échelle Z',
    positionX: 'Position X',
    positionY: 'Position Y',
    positionZ: 'Position Z',
    pitch: 'Tangage',
    yaw: 'Lacet',
    roll: 'Roulis',
    selectedTracker: 'Tracker sélectionné',
    orientation: 'Orientation'
  },

  physics: {
    springBoneEnabled: 'Activer SpringBone'
  },

  finger: {
    selectModel: 'Sélectionner un modèle',
    leftHand: 'Main gauche',
    rightHand: 'Main droite',
    resetAll: 'Réinitialiser tous les doigts',
    handAxisTitle: 'Axe de rotation de la main',
    handAxisLeft: 'Main gauche',
    handAxisRight: 'Main droite',
    axisMixed: 'Mixte',
    axisThumbAuto: 'Y+ (auto)',
    axisZPlusAuto: 'Z+ (auto)',
    axisXPlus: 'X+',
    axisXMinus: 'X-',
    axisYPlus: 'Y+',
    axisYMinus: 'Y-',
    axisZPlus: 'Z+',
    axisZMinus: 'Z-',
    leftThumb: 'Pouce',
    leftIndex: 'Index',
    leftMiddle: 'Majeur',
    leftRing: 'Annulaire',
    leftLittle: 'Auriculaire',
    rightThumb: 'Pouce',
    rightIndex: 'Index',
    rightMiddle: 'Majeur',
    rightRing: 'Annulaire',
    rightLittle: 'Auriculaire'
  },

  keys: {
    selected: 'Sélectionné',
    items: 'éléments',
    multiSelect: 'multi',
    selectPrompt: 'Sélectionnez des images-clés pour modifier leurs paramètres',
    noSelection: 'Aucune image-clé sélectionnée. Choisissez des clés dans la timeline.',
    multiSelectHint: 'Astuce: Maintenez Shift pour sélectionner plusieurs clés.',
    selectModel: 'Sélectionner un modèle',
    allModels: 'Tous les modèles',
    selectModelHint: 'Sélectionnez un modèle pour modifier les courbes spécifiques au tracker.',
    targetTracker: 'Tracker cible',
    allDefault: 'Tous (courbes par défaut)'
  },

  audio: {
    title: 'Audio',
    noDuration: 'Aucun audio chargé. Importez un MP3 via le menu.',
    filename: 'Nom du fichier',
    duration: 'Durée',
    sampleRate: 'Taux d\'échantillonnage',
    channels: 'Canaux',
    remove: 'Supprimer l\'audio',
    mono: 'Mono',
    stereo: 'Stéréo'
  },

  camera: {
    resolution: 'Résolution',
    width: 'Largeur',
    height: 'Hauteur',
    presets: 'Préréglages',
    customPreset: 'Personnalisé',
    presetFhd: '1920 × 1080 (FHD)',
    presetQhd: '2560 × 1440 (QHD)',
    presetUhd: '3840 × 2160 (4K UHD)',
    presetSquare: '1080 × 1080 (Carré)',
    presetHd: '1280 × 720 (HD)',
    parameters: 'Paramètres',
    fovVertical: 'FOV vertical',
    near: 'Plan proche',
    far: 'Plan éloigné',
    wheelSensitivity: 'Sensibilité de la molette',
    translateSensitivity: 'Sensibilité du panoramique',
    rotateSensitivity: 'Sensibilité de l\'orbite',
    showHelper: 'Afficher l\'assistant de caméra de rendu'
  },

  morph: {
    reload: 'Recharger'
  },

  timeline: {
    area: 'Zone de timeline'
  },

  timelinePanel: {
    title: 'Timeline',
    jumpStart: 'Aller au début',
    jumpEnd: 'Aller à la fin',
    play: 'Lire',
    pause: 'Pause',
    addAll: 'Ajouter des clés pour tous les trackers',
    addKey: 'Ajouter une image-clé',
    trackersHeader: 'Trackers'
  },

  timelineEditor: {
    loop: 'Boucle',
    loopTooltip: 'Activer/désactiver la lecture en boucle',
    fit: 'Ajuster la plage',
    fitTooltip: 'Afficher toute la timeline',
    addKey: 'Ajouter une clé',
    addKeyTooltip: 'Ajouter une image-clé à l\'image actuelle',
    copy: 'Copier',
    copyTooltip: 'Copier les images-clés sélectionnées',
    paste: 'Coller',
    pasteTooltip: 'Coller les images-clés à la position actuelle',
    delete: 'Supprimer',
    deleteTooltip: 'Supprimer les images-clés sélectionnées',
    jumpStartLabel: 'Début',
    jumpStartTooltip: 'Aller à l\'image de début',
    play: 'Lire',
    playTooltip: 'Lire',
    pause: 'Pause',
    pauseTooltip: 'Pause',
    jumpEndLabel: 'Fin',
    jumpEndTooltip: 'Aller à l\'image de fin',
    rangeStartLabel: 'Début',
    rangeEndLabel: 'Fin',
    clear: 'Effacer',
    clearTooltip: 'Effacer la timeline'
  },

  timelineCurveEditor: {
    title: 'Courbe d\'easing',
    reset: 'Réinitialiser',
    empty: 'Sélectionnez deux clés ou plus pour modifier la courbe.',
    handleLabel: 'Point de contrôle de la courbe',
    inLabel: 'Entrée',
    outLabel: 'Sortie'
  },

  statusBar: {
    placeholder: 'Des informations supplémentaires apparaissent ici',
    frame: 'Image {current}/{end} ({fps}fps)',
    cacheStandard: 'Cache: Stockage standard',
    cacheGuardPersisted: 'Persisté',
    cacheGuardVolatile: 'Non persisté',
    cacheUsage: 'Cache {usage} ({guard})',
    cacheUsageDetailed: 'Cache {usage} / {quota} ({guard} {percent}%)'
  },

  notifications: {
    cacheSaved: 'Cache: Sauvegardé.',
    cacheFailed: 'Cache: Échec de la sauvegarde. Vérifiez les paramètres de stockage du navigateur.',
    cacheCleared: 'Cache: Effacé.',
    cacheReset: 'Cache: Cache et timeline réinitialisés.',
    cachePersistenceEnabled: 'Cache: Persistance activée.',
    cachePersistenceFailed: 'Cache: Persistance non disponible. Vérifiez les paramètres de stockage du navigateur.',
    modelLoaded: 'Modèle chargé.',
    modelLoadFailed: 'Échec du chargement du modèle.',
    audioLoaded: 'Audio chargé.',
    audioLoadFailed: 'Échec du chargement de l\'audio.',
    audioLoading: 'Audio: Chargement en cours…',
    audioRemoved: 'Audio: MP3 supprimé.',
    imageCaptured: 'Image capturée.',
    imageExportNoRenderer: 'Export d\'image: Rendu non initialisé.',
    imageExportInProgress: 'Export d\'image: Traitement en cours…',
    imageExportPreparing: 'Export d\'image: Préparation en cours…',
    imageExportCancelled: 'Export d\'image: Annulé.',
    imageExportSaveFailed: 'Export d\'image: Échec de la sauvegarde.',
    imageExportFailed: 'Export d\'image: Échec.',
    videoCaptured: 'Vidéo capturée.',
    videoExportNoRenderer: 'Export vidéo: Rendu non initialisé.',
    videoExportNoKeyframes: 'Export vidéo: La timeline n\'a pas d\'images-clés.',
    videoExportInProgress: 'Export vidéo: Traitement en cours…',
    videoExportPreparing: 'Export vidéo: Préparation en cours…',
    videoExportSaving: 'Export vidéo: Enregistrement terminé, sauvegarde en cours…',
    videoExportCancelled: 'Export vidéo: Annulé.',
    videoExportSaveFailed: 'Export vidéo: Échec de la sauvegarde.',
    videoExportFailed: 'Export vidéo: Échec.',
    videoExportSaved: 'Export vidéo: Sauvegardé en tant que {name}.',
    timelineNotReady: 'Timeline: Non initialisée.',
    timelineAddFailed: 'Timeline: Échec de l\'ajout d\'une image-clé.',
    timelineKeyAdded: 'Timeline: Pose actuelle ajoutée en tant qu\'image-clé.',
    timelineCopySelect: 'Timeline: Sélectionnez des clés à copier.',
    timelineCopyFailed: 'Timeline: Échec de la copie des images-clés.',
    timelineCopySuccess: 'Timeline: {count} image(s)-clé(s) copiée(s).',
    timelinePasteEmpty: 'Timeline: Aucune image-clé à coller.',
    timelinePasteFailed: 'Timeline: Échec du collage des images-clés.',
    timelinePasteSuccess: 'Timeline: {count} image(s)-clé(s) collée(s).',
    timelineLoadMissing: 'Timeline: Échec du chargement (entrée introuvable).',
    timelineLoadFailed: 'Timeline: Échec du chargement.',
    timelineParseFailed: 'Timeline: Échec de l\'analyse JSON.',
    timelineExported: 'Timeline: Exportée.',
    timelineExportFailed: 'Timeline: Échec de l\'export.',
    timelineReset: 'Timeline: Réinitialisée.',
    timelineResetFailed: 'Timeline: Échec de la réinitialisation.',
    timelineFileLoaded: 'Timeline: {name} chargée.',
    timelineTrackerMismatch: 'Timeline: Impossible d\'importer. Le nombre de trackers ne correspond pas.',
    uiLayoutLoaded: 'UI: Disposition de style Blender chargée.',
    trackersReset: 'Trackers: Trackers virtuels réinitialisés.',
    errorUnknown: 'Erreur inconnue.',
    errorRaised: 'Erreur: {message}',
    unhandledRejection: 'Rejet de promesse non géré.'
  },

  aria: {
    mainMenu: 'Menu principal',
    settingsTabs: 'Catégories de paramètres',
    settingsArea: 'Zone de paramètres'
  }
}
