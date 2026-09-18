export type Language = 'en' | 'pt' | 'es';

export interface Translations {
  // Common
  settings: string;
  language: string;
  close: string;
  copy: string;
  download: string;
  add: string;
  remove: string;
  save: string;
  cancel: string;
  
  // Navigation
  matcher: string;
  contrastPalette: string;
  generatedPalettes: string;
  printGuide: string;
  
  // Settings Panel
  visibleColorModels: string;
  hexadecimal: string;
  rgbStandard: string;
  hslWeb: string;
  hsbHsv: string;
  cieLabHighPrec: string;
  cmykProcess: string;
  refBridgeC: string;
  refBridgeU: string;
  refSolidC: string;
  refSolidU: string;
  mixedFormatSyntax: string;
  changesAppliedRealtime: string;
  
  // Color Input
  color: string;
  inputColor: string;
  
  // Match Section
  matchCie2000: string;
  input: string;
  deltaE00: string;
  outOfGamut: string;
  actions: string;
  randomizeColor: string;
  analyzeWithAi: string;
  thinking: string;
  aiResult: string;
  mood: string;
  
  // Batch Mode
  batchOn: string;
  batchOff: string;
  multiSlotMatchAnalysis: string;
  copyAllSlotsData: string;
  nearbyAlternatives: string;
  selectSlotColor: string;
  downloadSlot: string;
  
  // Nearby references
  nearbyRefs: string;
  
  // InfoGrid
  red: string;
  green: string;
  blue: string;
  cyan: string;
  magenta: string;
  yellow: string;
  keyBlack: string;
  hue: string;
  saturation: string;
  lightness: string;
  aiAnalysis: string;
  
  // PaletteBuilder
  shadeCount: string;
  tintCount: string;
  darkenIntensity: string;
  lightenIntensity: string;
  hueRotateShade: string;
  hueRotateTint: string;
  saturationShade: string;
  saturationTint: string;
  useRefMatch: string;
  showBatchPalettes: string;
  selectBatchColor: string;
  baseColor: string;
  exportPalette: string;
  paletteContrast: string;
  accessiblePairs: string;
  
  // ColorGuide
  cmykMixer: string;
  totalInk: string;
  manualCmykPreview: string;
  contrastChecker: string;
  foreground: string;
  background: string;
  contrastRatio: string;
  wcagAA: string;
  wcagAAA: string;
  pass: string;
  fail: string;
  accessibleSuggestions: string;
  darkSuggestions: string;
  lightSuggestions: string;
  monochromaticVariations: string;
  hueVariation: string;
  substrateSimulation: string;
  coated: string;
  uncoated: string;
  dotGain10: string;
  dotGain20: string;
  recycledPaper: string;
  lowDensity: string;
  colorBlindnessSimulation: string;
  protanopia: string;
  deuteranopia: string;
  tritanopia: string;
  achromatopsia: string;
  separationGuide: string;
  spotColor: string;
  processColor: string;
  refGuide: string;
  useSpotWhen: string;
  useProcessWhen: string;
  accessibleVariations: string;
  totalVariations: string;
  
  // GeneratedPalettes
  paletteColors: string;
  addColor: string;
  showCodes: string;
  hideCodes: string;
  previewStyles: string;
  classic: string;
  vertical: string;
  grid: string;
  cards: string;
  downloadPalette: string;
  exportAco: string;
  exportAse: string;
  exportCsv: string;
  customCombinations: string;
  squares: string;
  circles: string;
  sunset: string;
  bars: string;
  backgroundStyle: string;
  blackBg: string;
  whiteBg: string;
  grayBg: string;
  shuffleCombinations: string;
  colorDetails: string;
  locked: string;
  unlocked: string;
  showVariationCodesOn: string;
  showVariationCodesOff: string;
  
  // PaletteGenerator
  extractFromImage: string;
  extracting: string;
  dragDropImage: string;
  
  // Similarity Grid
  similarityTitle: string;
  
  // Footer
  poweredBy: string;
  
  // Language names
  english: string;
  portuguese: string;
  spanish: string;
  
  // ColorGuide extra
  spotColor2: string;
  clickToEdit: string;
  paletteColorsLabel: string;
  active: string;
  substrates: string;
  simulatedPaperDotGain: string;
  original: string;
  digitalD65: string;
  coatedPaper: string;
  uncoatedPaper: string;
  mediumGain: string;
  heavyGain: string;
  grayBase: string;
  legibilityStandards: string;
  contrastAnalysis: string;
  preview: string;
  legibleText: string;
  neutralMatchMatrix: string;
  varyTones: string;
  darkUi: string;
  surface: string;
  paletteContrastTest: string;
  testsBetweenColors: string;
  textOnBackground: string;
  productionCheck: string;
  trappingRegistration: string;
  trapTest: string;
  resolution: string;
  lpiHalftone: string;
  gamut: string;
  colorSpaceGamut: string;
  printSimulationTests: string;
  visualPrintTests: string;
  bleedTest: string;
  bleedArea: string;
  safeArea: string;
  bleed3mm: string;
  cutLine: string;
  overprintTest: string;
  colorOverlay: string;
  gradientTest: string;
  bandingCheck: string;
  observeBanding: string;
  minimumText: string;
  textLegibility: string;
  bodyText: string;
  footnotes: string;
  minimumReadLimit: string;
  microPrint: string;
  highResRequired: string;
  adjacencyTest: string;
  neighboringColors: string;
  colorBehavior: string;
  reversalTest: string;
  positiveNegative: string;
  positive: string;
  negative: string;
  knockoutApplication: string;
  screenAngles: string;
  cmykPlateAngles: string;
  standardAngles: string;
  metamerismTest: string;
  lightingSimulation: string;
  colorsChangeLight: string;
  blackTest: string;
  richBlackVsPure: string;
  pureBlack: string;
  richBlack: string;
  comparisonOnColor: string;
  richBlackDense: string;
  tintRamp: string;
  densityScale: string;
  tintUniformity: string;
  hairlineTest: string;
  fineLines: string;
  linesPrintFail: string;
  registrationMarks: string;
  alignCmykPlates: string;
  textKnockout: string;
  knockoutVsOverprint: string;
  knockoutDesc: string;
  overprintDesc: string;
  smallBlackText: string;
  knockoutRemoves: string;
  colorBars: string;
  controlBars: string;
  densityRegistration: string;
  technicalIntegrity: string;
  totalInkCoverage: string;
  ticTacDesc: string;
  status: string;
  highRisk: string;
  idealDrying: string;
  highCoverage: string;
  safeCoverage: string;
  knowledgeBase: string;
  printColorEducation: string;
  subtractiveTheory: string;
  subtractiveDesc: string;
  offsetVsDigital: string;
  offsetVsDigitalDesc: string;
  dotGainTitle: string;
  dotGainDesc: string;
  spotRefColors: string;
  spotRefDesc: string;
  metamerism: string;
  metamerismDesc: string;
  varnishLamination: string;
  varnishLaminationDesc: string;
  coucheVsOffset: string;
  coucheVsOffsetDesc: string;
  trapping: string;
  trappingDesc: string;
  gcrUcr: string;
  gcrUcrDesc: string;
  lineature: string;
  lineatureDesc: string;
  colorGamut: string;
  colorGamutDesc: string;
  weightVsThickness: string;
  weightVsThicknessDesc: string;
  
  // PaletteBuilder extra
  batchPalette: string;
  colors: string;
  hideBatch: string;
  showBatch: string;
  clickToUseAsBase: string;
  shades: string;
  tints: string;
  count: string;
  step: string;
  randomize: string;
  
  // GeneratedPalettes extra
  processing: string;
  exact: string;
  randomizeColors: string;
  suggestHarmony: string;
  uploadSvg: string;
  basePosition: string;
  none: string;
  above: string;
  center: string;
  below: string;
  contrast: string;
  variations: string;

  // UI headings & helpers
  masterColorReference: string;
  digitalVsPrint: string;
  technicalBreakdown: string;
  cmykSeparationLogic: string;
  colorChannelsLabel: string;
  harmonyComplementary: string;
  harmonyAnalogWarm: string;
  harmonyAnalogCool: string;
  harmonyTriadic: string;
  harmonySplitComplementary: string;
  harmonyTetradic: string;
  overprintSimulationNote: string;
  lightingD65: string;
  lightingTungsten: string;
  lightingFluorescent: string;
  reducedDensity: string;
  knockoutLabel: string;
  overprintLabel: string;
  textLabel: string;
  copiedToClipboard: string;
  slotLabel: string;
  colorCardAria: string;
  baseBadge: string;
  // Library Manager
  selectLibrary: string;
  standardLibrary: string;
  uploadedLibraries: string;
  uploadAcb: string;
  loading: string;
  noValidColors: string;
  parseFailed: string;
  cannotExportStandard: string;
  warning: string;
  allBlackWarning: string;
  copyJsonCode: string;
  deleteLibrary: string;
  verifyColorsNote: string;

  // GeneratedPalettes UI
  addColorPlaceholder: string;
  addColorButton: string;
  preview1Title: string;
  preview1Subtitle: string;
  templateLabel: string;
  splitLabel: string;
  variationsLabel: string;
  baseColorPositionLabel: string;
  basePositionNone: string;
  basePositionAbove: string;
  basePositionCenter: string;
  basePositionBelow: string;
  showCodesOn: string;
  showCodesOff: string;
  
  // PaletteGenerator
  processingImage: string;
  uploadImageSvg: string;
  
  // GeneratedPalettes - Previews extras
  preview2Title: string;
  preview2Subtitle: string;
  preview3Title: string;
  preview3Subtitle: string;
  preview4Title: string;
  preview4Subtitle: string;
  
  // GeneratedPalettes - Albers controls
  shuffleAlbers: string;
  albersNote: string;
  
  // GeneratedPalettes - Export
  exportColorSheet: string;
  exportToAco: string;
  exportToAse: string;
  exportToCsv: string;
  
  // GeneratedPalettes - Color management
  removeColorAria: string;
  lockWeightAria: string;
  unlockWeightAria: string;
  colorNameAria: string;
  colorHexAria: string;
  colorWeightAria: string;
  
  // GeneratedPalettes - Albers editing
  externalColorLabel: string;
  internalColorLabel: string;
  resetCombo: string;
  availableCombinations: string;
  backgroundLabel: string;
  cardsLabel: string;
  
  // ColorSheetExport
  colorGuidePreview: string;
  printSavePdfHint: string;
  closeButton: string;
  printSavePdf: string;
  
  // GeneratedPalettes - Template options
  templateSquares: string;
  templateCircles: string;
  templateSunset: string;
  templateBars: string;
  backgroundBlack: string;
  backgroundWhite: string;
  backgroundGray: string;

  // Card templates (Multi-Slot)
  cardTemplateLabel: string;
  cardTemplateClassic: string;
  cardTemplateCompact: string;
  cardTemplateEditorial: string;
  cardTemplateSwatch: string;
  cardTemplateMinimal: string;
  cardTemplateMono: string;

  // Palette Magic
  paletteMagic: string;
  contextBrand: string;
  contextPoster: string;
  contextUI: string;
  contextEditorial: string;
  contextPackaging: string;
  contrastScore: string;
  harmonyScore: string;
  paletteScore: string;
  trendPalettes: string;
  userPalettes: string;
  expandPalette: string;
  generateMagic: string;
  applyPalette: string;
  harmonyPalettes: string;
  allContexts: string;
  wcagValidated: string;
  copyPalette: string;
  baseColors: string;
  noBaseColors: string;
  slots: string;
  lockColor: string;
  unlockColor: string;

  // Feedback
  copyFailed: string;
  downloaded: string;

  // Accessibility card
  accessibility: string;
  onWhite: string;
  onBlack: string;
  normalText: string;
  largeText: string;
  apcaLc: string;
  bestTextColor: string;
  customBackground: string;
  suggestAccessibleColor: string;
  suggestion: string;
  applySuggestion: string;
  alreadyAccessible: string;
  noAccessibleColor: string;

  // Tonal scale
  tonalScale: string;
  tonalScaleHint: string;
  baseStep: string;
  exportScale: string;

  // Palette export
  exportPaletteMenu: string;
  exportFormatCss: string;
  exportFormatTailwind: string;
  exportFormatTailwind3: string;
  exportFormatTailwind4: string;
  exportFormatDtcg: string;
  exportFormatAse: string;
  exportFormatGpl: string;

  // Color vision simulation
  colorVision: string;
  visionNormal: string;
  simulation: string;

  // Shell & navigation
  sections: string;
  referenceLibraries: string;
  referencePlaceholder: string;

  // Shared actions & short labels
  apply: string;
  paste: string;
  extract: string;
  shuffle: string;
  totalLabel: string;
  refShort: string;
  downloadAll: string;
  customSuffix: string;

  // SVG import
  pasteSvgCode: string;
  pasteSvgPlaceholder: string;
  noColorsFound: string;

  // Generated palettes controls
  paletteExportLabel: string;
  suggestCombination: string;
  mustBe100: string;
  dragToReorder: string;
  hideVariations: string;
  showVariations: string;
  layersLabel: string;
  fullContrast: string;
  lockSlot: string;
  unlockSlot: string;
  middleColorLabel: string;

  // Palette sheet templates
  templateStripes: string;
  templateSwatches: string;
  templateGradient: string;
  templateMosaic: string;
  templateSplitScreen: string;
  templateColumns: string;
  templateDots: string;
  templateEditorial: string;

  // Albers templates
  templateRings: string;
  templateDiamonds: string;
  templateFrames: string;
  templateSplit: string;
  templateTargets: string;
  templateTriangles: string;

  // Palette Magic
  paletteMagicIntro: string;
  sourceColors: string;
  clickASlot: string;
  deselect: string;
  selectToInject: string;
  extractFromImageTitle: string;
  contextLabel: string;
  colorInjectedLocked: string;
  contrastPairs: string;
  shuffleToGenerate: string;

  // Palette builder backgrounds
  bgDarkest: string;
  bgLightest: string;

  // Color sheet export
  brandColorGuide: string;
  generatedByTool: string;
  professionalColorStandards: string;

  // Generated palettes: builder, views, harmonies
  gpEyebrow: string;
  gpInputLabel: string;
  gpOutputLabel: string;
  gpLoadFile: string;
  gpLoadFailed: string;
  gpColorsCount: string;
  gpSumWarning: string;
  gpFixSum: string;
  gpDistribution: string;
  gpPresetEqual: string;
  gpPresetGolden: string;
  gpPresetDescending: string;
  gpPresetSource: string;
  gpPresetSourceHint: string;
  gpSortBy: string;
  gpSortWeight: string;
  gpSortLightness: string;
  gpSortHue: string;
  gpExpandCodes: string;
  gpCollapseCodes: string;
  gpNoCodes: string;
  gpReorderAria: string;
  gpHarmonyTitle: string;
  gpHarmonyHint: string;
  gpBase: string;
  gpHarmonyComplementary: string;
  gpHarmonyAnalogous: string;
  gpHarmonyTriad: string;
  gpHarmonyMonochromatic: string;
  gpAddToPalette: string;
  gpAddAll: string;
  gpAddHexAria: string;
  gpInPalette: string;
  gpNeutralBase: string;
  gpViewLabel: string;
  gpViewSheet: string;
  gpViewStrip: string;
  gpViewGrid: string;
  gpViewBars: string;
  gpViewRing: string;
  gpMoreLayouts: string;
  gpChoose: string;
  gpTemplateMainVariations: string;
  gpShowLabel: string;
  gpShowName: string;
  gpShowHex: string;
  gpShowPercent: string;
  gpShowCodes: string;
  gpVariationsToggle: string;
  gpVariationCodes: string;
  gpTonesPerSide: string;
  gpDownloadSvg: string;
  gpDownloadPng: string;
  gpSheetHint: string;
  gpCombosHint: string;
  gpWeightInPalette: string;
  gpContrastHint: string;
  gpNoPairs: string;

  // Matcher: reference reading and discoveries
  referenceCode: string;
  bestMatch: string;
  matchQuality: string;
  finishLabel: string;
  finishAll: string;
  finishCoated: string;
  finishUncoated: string;
  finishProcessCoated: string;
  finishProcessUncoated: string;
  copyCode: string;
  compareInputReference: string;
  deltaImperceptible: string;
  deltaSubtle: string;
  deltaClose: string;
  deltaVisible: string;
  deltaDifferent: string;
  rankedAlternatives: string;
  alternativesHint: string;
  noReferenceFound: string;
  variantsLabel: string;
  spotInkTip: string;
  discoveries: string;
  discoveriesHint: string;
  whatThisColorIs: string;
  familyLabel: string;
  temperatureLabel: string;
  neighboursTitle: string;
  neighboursHint: string;
  neighbourLighter: string;
  neighbourDarker: string;
  neighbourWarmer: string;
  neighbourCooler: string;
  otherFinishesTitle: string;
  otherFinishesHint: string;
  harmonyTitle: string;
  harmonyHint: string;
  harmonyComplement: string;
  harmonyAnalogousA: string;
  harmonyAnalogousB: string;
  harmonyTriadicA: string;
  harmonyTriadicB: string;
  pressTitle: string;
  pressWithinProcess: string;
  pressBeyondProcess: string;
  pressHeavyInk: string;
  pressInkOk: string;
  pressEstimate: string;
  chromaOverflowLabel: string;
  usageTitle: string;
  familyRed: string;
  familyOrange: string;
  familyYellow: string;
  familyLime: string;
  familyGreen: string;
  familyTeal: string;
  familyCyan: string;
  familyBlue: string;
  familyIndigo: string;
  familyViolet: string;
  familyMagenta: string;
  familyPink: string;
  familyNeutral: string;
  tempWarm: string;
  tempCool: string;
  tempTemperate: string;
  satGray: string;
  satMuted: string;
  satBalanced: string;
  satVivid: string;
  lightVeryDark: string;
  lightDark: string;
  lightMedium: string;
  lightLight: string;
  lightVeryLight: string;
  nameModLighter: string;
  nameModDarker: string;
  nameModWarmer: string;
  nameModCooler: string;
  nameModVivid: string;
  nameModMuted: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    settings: 'Settings',
    language: 'Language',
    close: 'Close',
    copy: 'Copy',
    download: 'Download',
    add: 'Add',
    remove: 'Remove',
    save: 'Save',
    cancel: 'Cancel',
    
    // Navigation
    matcher: 'Matcher',
    contrastPalette: 'Contrasts & palette',
    generatedPalettes: 'Generated palettes',
    printGuide: 'Print guide',
    
    // Settings Panel
    visibleColorModels: 'Visible color models',
    hexadecimal: 'Hexadecimal',
    rgbStandard: 'RGB (standard)',
    hslWeb: 'HSL (web)',
    hsbHsv: 'HSB / HSV',
    cieLabHighPrec: 'CIE Lab (high prec)',
    cmykProcess: 'CMYK (process)',
    refBridgeC: 'Process CP (coated)',
    refBridgeU: 'Process UP (uncoated)',
    refSolidC: 'Solid C (coated)',
    refSolidU: 'Solid U (uncoated)',
    mixedFormatSyntax: 'Mixed format syntax',
    changesAppliedRealtime: 'Changes are applied in real-time to active sessions.',
    
    // Color Input
    color: 'Color',
    inputColor: 'Input color',
    
    // Match Section
    matchCie2000: 'Match (CIE2000)',
    input: 'Input',
    deltaE00: 'Delta E 00',
    outOfGamut: 'Out of gamut',
    actions: 'Actions',
    randomizeColor: 'Randomize color',
    analyzeWithAi: 'Search reference',
    thinking: 'Searching...',
    aiResult: 'Search result',
    mood: 'Mood',
    
    // Batch Mode
    batchOn: 'Batch on',
    batchOff: 'Batch off',
    multiSlotMatchAnalysis: 'Multi-slot match analysis',
    copyAllSlotsData: 'Copy all slots data',
    nearbyAlternatives: 'Nearby alternatives',
    selectSlotColor: 'Select slot color',
    downloadSlot: 'Download slot',
    
    // Nearby references
    nearbyRefs: 'Nearby matches (ΔE 00)',
    
    // InfoGrid
    red: 'Red',
    green: 'Green',
    blue: 'Blue',
    cyan: 'Cyan',
    magenta: 'Magenta',
    yellow: 'Yellow',
    keyBlack: 'Key (black)',
    hue: 'Hue',
    saturation: 'Saturation',
    lightness: 'Lightness',
    aiAnalysis: 'Color analysis',
    
    // PaletteBuilder
    shadeCount: 'Shade count',
    tintCount: 'Tint count',
    darkenIntensity: 'Darken intensity',
    lightenIntensity: 'Lighten intensity',
    hueRotateShade: 'Hue rotate (shade)',
    hueRotateTint: 'Hue rotate (tint)',
    saturationShade: 'Saturation (shade)',
    saturationTint: 'Saturation (tint)',
    useRefMatch: 'Use reference match',
    showBatchPalettes: 'Show batch palettes',
    selectBatchColor: 'Select batch color',
    baseColor: 'Base color',
    exportPalette: 'Export palette',
    paletteContrast: 'Palette contrast',
    accessiblePairs: 'Accessible pairs',
    
    // ColorGuide
    cmykMixer: 'CMYK mixer',
    totalInk: 'Total ink',
    manualCmykPreview: 'Manual CMYK preview',
    contrastChecker: 'Contrast checker',
    foreground: 'Foreground',
    background: 'Background',
    contrastRatio: 'Contrast ratio',
    wcagAA: 'WCAG AA',
    wcagAAA: 'WCAG AAA',
    pass: 'Pass',
    fail: 'Fail',
    accessibleSuggestions: 'Accessible suggestions',
    darkSuggestions: 'Dark suggestions',
    lightSuggestions: 'Light suggestions',
    monochromaticVariations: 'Monochromatic variations',
    hueVariation: 'Hue variation',
    substrateSimulation: 'Substrate simulation',
    coated: 'Coated',
    uncoated: 'Uncoated',
    dotGain10: 'Dot gain 10%',
    dotGain20: 'Dot gain 20%',
    recycledPaper: 'Recycled paper',
    lowDensity: 'Low density',
    colorBlindnessSimulation: 'Color blindness simulation',
    protanopia: 'Protanopia',
    deuteranopia: 'Deuteranopia',
    tritanopia: 'Tritanopia',
    achromatopsia: 'Achromatopsia',
    separationGuide: 'Separation guide',
    spotColor: 'Spot color',
    processColor: 'Process color',
    refGuide: 'Reference guide',
    useSpotWhen: 'Use spot colors when brand consistency is critical',
    useProcessWhen: 'Use process colors for complex images and gradients',
    accessibleVariations: 'Accessible variations',
    totalVariations: 'Total variations',
    
    // GeneratedPalettes
    paletteColors: 'Palette colors',
    addColor: 'Add color',
    showCodes: 'Show codes',
    hideCodes: 'Hide codes',
    previewStyles: 'Preview styles',
    classic: 'Classic',
    vertical: 'Vertical',
    grid: 'Grid',
    cards: 'Cards',
    downloadPalette: 'Download palette',
    exportAco: 'Export ACO',
    exportAse: 'Export ASE',
    exportCsv: 'Export CSV',
    customCombinations: 'Custom combinations',
    squares: 'Squares',
    circles: 'Circles',
    sunset: 'Sunset',
    bars: 'Bars',
    backgroundStyle: 'Background style',
    blackBg: 'Black',
    whiteBg: 'White',
    grayBg: 'Gray',
    shuffleCombinations: 'Shuffle combinations',
    colorDetails: 'Color details',
    locked: 'Locked',
    unlocked: 'Unlocked',
    
    // PaletteGenerator
    extractFromImage: 'Extract from image',
    extracting: 'Extracting...',
    dragDropImage: 'Drag & drop an image or click to upload',
    
    // Similarity Grid
    similarityTitle: 'Similarity grid',
    
    // Footer
    poweredBy: 'Powered by UNBSERVED',
    
    // Language names
    english: 'English',
    portuguese: 'Português',
    spanish: 'Español',
    
    // ColorGuide extra
    spotColor2: 'Spot color',
    clickToEdit: 'Click to edit color',
    paletteColorsLabel: 'Palette colors',
    active: 'active',
    substrates: 'Substrates',
    simulatedPaperDotGain: 'Simulated paper & dot gain',
    original: 'Original',
    digitalD65: 'Digital D65',
    coatedPaper: 'Coated / 150g',
    uncoatedPaper: 'Uncoated paper',
    mediumGain: 'Medium gain',
    heavyGain: 'Heavy gain',
    grayBase: 'Gray base',
    legibilityStandards: 'Legibility standards',
    contrastAnalysis: 'Contrast analysis',
    preview: 'Preview',
    legibleText: 'Legible text on background',
    neutralMatchMatrix: 'Neutral match matrix',
    varyTones: 'Vary tones',
    darkUi: 'Dark UI',
    surface: 'Surface',
    paletteContrastTest: 'Palette contrast',
    testsBetweenColors: 'Tests between palette colors',
    textOnBackground: 'Text on background',
    productionCheck: 'Production check',
    trappingRegistration: 'Trapping & registration',
    trapTest: 'Trap test',
    resolution: 'Resolution',
    lpiHalftone: 'LPI halftone screen',
    gamut: 'Gamut',
    colorSpaceGamut: 'Color space gamut',
    printSimulationTests: 'Print simulation tests',
    visualPrintTests: 'Visual print tests',
    bleedTest: 'Bleed test',
    bleedArea: 'Bleed area',
    safeArea: 'Safe area',
    bleed3mm: 'Bleed 3mm',
    cutLine: 'Cut',
    overprintTest: 'Overprint test',
    colorOverlay: 'Color overlay',
    gradientTest: 'Gradient test',
    bandingCheck: 'Banding check',
    observeBanding: 'Check for visible "bands" in gradient',
    minimumText: 'Minimum text',
    textLegibility: 'Text legibility',
    bodyText: 'Body text 14pt',
    footnotes: 'Footnotes 10pt',
    minimumReadLimit: 'Minimum read limit 7pt',
    microPrint: 'Micro print / legal notices 5pt',
    highResRequired: 'Below 6pt requires high resolution',
    adjacencyTest: 'Adjacency test',
    neighboringColors: 'Neighboring colors',
    colorBehavior: 'How color behaves next to others',
    reversalTest: 'Reversal test',
    positiveNegative: 'Positive / negative',
    positive: 'Positive',
    negative: 'Negative',
    knockoutApplication: 'Knockout and inverted application test',
    screenAngles: 'Screen angles',
    cmykPlateAngles: 'CMYK plate angles',
    standardAngles: 'Standard angles avoid moiré',
    metamerismTest: 'Metamerism test',
    lightingSimulation: 'Lighting simulation',
    colorsChangeLight: 'Colors change under different lights',
    blackTest: 'Black test',
    richBlackVsPure: 'Rich black vs pure black',
    pureBlack: 'Pure black',
    richBlack: 'Rich black',
    comparisonOnColor: 'Comparison on your color',
    richBlackDense: 'Rich black is denser but dries slowly',
    tintRamp: 'Tint ramp',
    densityScale: 'Density scale',
    tintUniformity: 'Check if tint gradient maintains uniformity',
    hairlineTest: 'Hairline test',
    fineLines: 'Fine lines',
    linesPrintFail: 'Lines below 0.5pt may fail in print',
    registrationMarks: 'Registration marks',
    alignCmykPlates: 'Used to align CMYK plates on press',
    textKnockout: 'Text knockout',
    knockoutVsOverprint: 'Knockout vs overprint',
    knockoutDesc: 'Background color is "removed" under text',
    overprintDesc: 'Text is printed over color',
    smallBlackText: 'Small black text should use overprint to avoid registration issues',
    knockoutRemoves: 'Knockout removes color; overprint overlays',
    colorBars: 'Color bars',
    controlBars: 'Control bars',
    densityRegistration: 'Bars used to verify density and registration',
    technicalIntegrity: 'Technical integrity',
    totalInkCoverage: 'Total ink coverage (TIC / TAC)',
    ticTacDesc: 'The sum of C, M, Y and K percentages should not exceed physical paper limits. Excess ink load results in offsetting and long drying times.',
    status: 'Status',
    highRisk: 'High risk',
    idealDrying: 'Ideal drying',
    highCoverage: 'High coverage',
    safeCoverage: 'Safe coverage',
    knowledgeBase: 'Knowledge base',
    printColorEducation: 'Print & color education',
    subtractiveTheory: 'Subtractive theory',
    subtractiveDesc: 'Unlike screens (RGB), which add light to create white, CMYK printing is subtractive: inks act as filters blocking parts of the light spectrum. More ink = closer to black.',
    offsetVsDigital: 'Offset vs digital',
    offsetVsDigitalDesc: 'Offset uses metal plates and thick liquid inks, ideal for large runs and exact spot inks. Digital uses toner or inkjet, faster for small quantities but with limited gamut.',
    dotGainTitle: 'Dot gain',
    dotGainDesc: 'Dot gain occurs when ink drop expands hitting paper fibers. Porous papers (offset/newsprint) suffer more dot gain, which can darken the final image if not compensated.',
    spotRefColors: 'Spot (reference colors)',
    spotRefDesc: 'Pre-mixed colors by manufacturer. Unlike CMYK (which tries to match colors with 4 inks), a spot ink is a single pigment applied directly, guaranteeing logo fidelity.',
    metamerism: 'Metamerism',
    metamerismDesc: 'Phenomenon where two colors appear identical under one light (e.g., office) but different under another (e.g., sunlight). Always check physical proofs under real conditions.',
    varnishLamination: 'Varnish & lamination',
    varnishLaminationDesc: 'Finishes protect ink and alter color perception. Matte lamination tends to "flatten" contrast, while gloss varnish saturates colors and deepens blacks.',
    coucheVsOffset: 'Coated vs uncoated',
    coucheVsOffsetDesc: 'Coated paper has a coating layer preventing excessive ink absorption, keeping colors vibrant. Uncoated is porous, absorbing ink resulting in softer, natural colors.',
    trapping: 'Trapping (overlap)',
    trappingDesc: 'Registration compensation technique where adjacent colors slightly overlap. Prevents "white gaps" if there is slight plate misalignment on press.',
    gcrUcr: 'GCR and UCR',
    gcrUcrDesc: 'Pre-press techniques replacing parts of CMY colors with K (black) channel. Saves expensive ink, improves drying, and ensures greater shadow color stability.',
    lineature: 'Lineature (LPI)',
    lineatureDesc: 'Defines screen density. Luxury magazines use 175-200 LPI (invisible dots), while newspapers use 85-100 LPI (dots visible to naked eye). Directly affects image detail.',
    colorGamut: 'Color gamut',
    colorGamutDesc: 'Total range of colors a system can reproduce. RGB (screens) has much larger gamut than CMYK (print). Neon or electric blue colors often "fade" on paper.',
    weightVsThickness: 'Weight vs thickness',
    weightVsThicknessDesc: 'Weight is mass (g/m²). Thickness (microns) is volume. Same weight papers can have different thicknesses due to fiber density, affecting printed material "feel".',
    
    // PaletteBuilder extra
    batchPalette: 'Batch palette',
    colors: 'colors',
    hideBatch: 'Hide batch',
    showBatch: 'Show batch',
    clickToUseAsBase: 'Click a color to use as contrast palette base',
    shades: 'Shades',
    tints: 'Tints',
    count: 'Count',
    step: 'Step',
    randomize: 'Randomize',
    
    // GeneratedPalettes extra
    processing: 'Processing...',
    exact: 'Exact',
    randomizeColors: 'Randomize colors',
    suggestHarmony: 'Suggest harmony',
    uploadSvg: 'Upload SVG',
    basePosition: 'Base position',
    none: 'None',
    above: 'Above',
    center: 'Center',
    below: 'Below',
    contrast: 'Contrast',
    variations: 'Variations',

    // UI headings & helpers
    masterColorReference: 'Master color reference',
    digitalVsPrint: 'Digital vs print simulation',
    technicalBreakdown: 'Technical breakdown',
    cmykSeparationLogic: 'CMYK separation logic',
    colorChannelsLabel: 'Color channels',
    harmonyComplementary: 'Complementary',
    harmonyAnalogWarm: 'Analogous (warm)',
    harmonyAnalogCool: 'Analogous (cool)',
    harmonyTriadic: 'Triadic',
    harmonySplitComplementary: 'Split complementary',
    harmonyTetradic: 'Tetradic',
    overprintSimulationNote: 'Simulates overprint using mix-blend-multiply',
    lightingD65: 'D65 daylight',
    lightingTungsten: 'Tungsten',
    lightingFluorescent: 'Fluorescent',
    reducedDensity: '-5% density',
    knockoutLabel: 'Knockout',
    overprintLabel: 'Overprint',
    textLabel: 'Text',
    copiedToClipboard: 'Copied to clipboard!',
    slotLabel: 'Slot',
    colorCardAria: 'color card',
    baseBadge: 'Base',
    // Library Manager
    selectLibrary: 'Select library',
    standardLibrary: 'System A (standard)',
    uploadedLibraries: 'My uploaded libraries',
    uploadAcb: 'Upload .ACB',
    loading: 'Loading...',
    noValidColors: 'No valid colors found in file.',
    parseFailed: 'Failed to parse .acb file',
    cannotExportStandard: 'Cannot export standard library code.',
    warning: 'Warning:',
    allBlackWarning: 'All colors parsed as black (#000000). The file format might be incompatible. Please remove this library and try again.',
    copyJsonCode: 'Copy JSON code',
    deleteLibrary: 'Delete library',
    verifyColorsNote: 'Please verify colors are correct (not all black) before exporting.',

    // GeneratedPalettes UI
    addColorPlaceholder: 'Add color (e.g., #FF5500)',
    addColorButton: 'Add',
    preview1Title: 'Preview 1',
    preview1Subtitle: 'Color sheet',
    templateLabel: 'Template',
    splitLabel: 'Split',
    variationsLabel: 'Variations',
    baseColorPositionLabel: 'Base color',
    basePositionNone: 'None',
    basePositionAbove: 'Above',
    basePositionCenter: 'Center',
    basePositionBelow: 'Below',
    showVariationCodesOn: 'Hide variation codes',
    showVariationCodesOff: 'Show variation codes',
    showCodesOn: 'Hide codes (view 1)',
    showCodesOff: 'Show codes (view 1)',
    
    // PaletteGenerator
    processingImage: 'Processing...',
    uploadImageSvg: 'Image / SVG',
    
    // GeneratedPalettes - Previews extras
    preview2Title: 'Albers interaction squares',
    preview2Subtitle: 'Simultaneous contrast study inspired by Josef Albers',
    preview3Title: 'Custom combinations',
    preview3Subtitle: 'Geometric arrangements with your palette',
    preview4Title: 'Contrast pairs',
    preview4Subtitle: 'Text & background accessible combinations (WCAG)',
    
    // GeneratedPalettes - Albers controls
    shuffleAlbers: 'Shuffle',
    albersNote: 'Each square shows how the inner color appears to change on different backgrounds',
    
    // GeneratedPalettes - Export
    exportColorSheet: 'Color sheet',
    exportToAco: 'Export ACO',
    exportToAse: 'Export ASE',
    exportToCsv: 'Export CSV',
    
    // GeneratedPalettes - Color management
    removeColorAria: 'Remove color',
    lockWeightAria: 'Lock weight',
    unlockWeightAria: 'Unlock weight',
    colorNameAria: 'Color name',
    colorHexAria: 'Color hex code',
    colorWeightAria: 'Color weight percentage',
    
    // GeneratedPalettes - Albers editing
    externalColorLabel: 'Ext',
    internalColorLabel: 'Int',
    resetCombo: 'Reset',
    availableCombinations: 'available combinations',
    backgroundLabel: 'Background',
    cardsLabel: 'Cards',
    
    // ColorSheetExport
    colorGuidePreview: 'Color guide preview',
    printSavePdfHint: 'Use your browser\'s "Print" function to save as PDF',
    closeButton: 'Close',
    printSavePdf: 'Print / save PDF',
    
    // GeneratedPalettes - Template options
    templateSquares: 'Squares',
    templateCircles: 'Circles',
    templateSunset: 'Sunset',
    templateBars: 'Bars',
    cardTemplateLabel: 'Card template',
    cardTemplateClassic: 'Classic',
    cardTemplateCompact: 'Compact',
    cardTemplateEditorial: 'Editorial',
    cardTemplateSwatch: 'Swatch',
    cardTemplateMinimal: 'Minimal',
    cardTemplateMono: 'Mono',
    backgroundBlack: 'Black',
    backgroundWhite: 'White',
    backgroundGray: 'Gray',

    // Palette Magic
    paletteMagic: 'Palette Magic',
    contextBrand: 'Brand identity',
    contextPoster: 'Poster',
    contextUI: 'UI / layout',
    contextEditorial: 'Editorial',
    contextPackaging: 'Packaging',
    contrastScore: 'Contrast',
    harmonyScore: 'Harmony',
    paletteScore: 'Score',
    trendPalettes: 'Trend palettes',
    userPalettes: 'Your palettes',
    expandPalette: 'Expand',
    generateMagic: 'Generate',
    applyPalette: 'Apply',
    harmonyPalettes: 'Harmony palettes',
    allContexts: 'All',
    wcagValidated: 'WCAG validated',
    copyPalette: 'Copy palette',
    baseColors: 'Base colors',
    noBaseColors: 'Add colors via SVG upload or hex input to generate palettes',
    slots: 'Slots',
    lockColor: 'Lock',
    unlockColor: 'Unlock',

    copyFailed: 'Could not copy to clipboard',
    downloaded: 'Downloaded',

    accessibility: 'Accessibility',
    onWhite: 'On white',
    onBlack: 'On black',
    normalText: 'Normal text',
    largeText: 'Large text',
    apcaLc: 'APCA Lc',
    bestTextColor: 'Best text color',
    customBackground: 'Custom background',
    suggestAccessibleColor: 'Suggest accessible color',
    suggestion: 'Suggestion',
    applySuggestion: 'Apply',
    alreadyAccessible: 'Already meets AA on this background',
    noAccessibleColor: 'No accessible variation found',

    tonalScale: 'Tonal scale',
    tonalScaleHint: 'Click a swatch to apply it',
    baseStep: 'Base',
    exportScale: 'Export scale',

    exportPaletteMenu: 'Export palette',
    exportFormatCss: 'CSS variables',
    exportFormatTailwind: 'Tailwind',
    exportFormatTailwind3: 'Tailwind v3 config',
    exportFormatTailwind4: 'Tailwind v4 theme',
    exportFormatDtcg: 'Design tokens (JSON)',
    exportFormatAse: 'Adobe swatches (ASE)',
    exportFormatGpl: 'GIMP palette (GPL)',

    colorVision: 'Color vision',
    visionNormal: 'Normal',
    simulation: 'Simulation',

    // Shell & navigation
    sections: 'Sections',
    referenceLibraries: 'Reference libraries',
    referencePlaceholder: 'Reference',

    // Shared actions & short labels
    apply: 'Apply',
    paste: 'Paste',
    extract: 'Extract',
    shuffle: 'Shuffle',
    totalLabel: 'Total',
    refShort: 'Ref',
    downloadAll: 'All',
    customSuffix: 'custom',

    // SVG import
    pasteSvgCode: 'Paste SVG code',
    pasteSvgPlaceholder: 'Paste SVG code…',
    noColorsFound: 'No colors found',

    // Generated palettes controls
    paletteExportLabel: 'Palette export',
    suggestCombination: 'Suggest combination',
    mustBe100: '(must be 100%)',
    dragToReorder: 'Drag to reorder',
    hideVariations: 'Hide variations',
    showVariations: 'Show variations',
    layersLabel: 'Layers',
    fullContrast: 'Full contrast',
    lockSlot: 'Lock slot',
    unlockSlot: 'Unlock slot',
    middleColorLabel: 'Mid',

    // Palette sheet templates
    templateStripes: 'Stripes',
    templateSwatches: 'Swatches',
    templateGradient: 'Gradient',
    templateMosaic: 'Mosaic',
    templateSplitScreen: 'Split screen',
    templateColumns: 'Columns',
    templateDots: 'Dots',
    templateEditorial: 'Editorial',

    // Albers templates
    templateRings: 'Rings',
    templateDiamonds: 'Diamonds',
    templateFrames: 'Frames',
    templateSplit: 'Split',
    templateTargets: 'Targets',
    templateTriangles: 'Triangles',

    // Palette Magic
    paletteMagicIntro: 'Curated palettes with lock and shuffle. Freeze the colors you keep, regenerate the rest.',
    sourceColors: 'Source',
    clickASlot: 'Click a slot',
    deselect: 'Deselect',
    selectToInject: 'Select to inject into a slot',
    extractFromImageTitle: 'Extract palette from image (JPG/PNG/WEBP)',
    contextLabel: 'Context',
    colorInjectedLocked: 'Color injected and locked',
    contrastPairs: 'Contrast pairs',
    shuffleToGenerate: 'Shuffle to generate palettes.',

    // Palette builder backgrounds
    bgDarkest: 'Darkest',
    bgLightest: 'Lightest',

    // Color sheet export
    brandColorGuide: 'Brand color guide',
    generatedByTool: 'Generated by UNBSCOLOR',
    professionalColorStandards: 'Professional color standards',

    // Generated palettes
    gpEyebrow: 'Palette builder',
    gpInputLabel: 'Input',
    gpOutputLabel: 'Output',
    gpLoadFile: 'Load SVG or image',
    gpLoadFailed: 'Could not read this file',
    gpColorsCount: '{n} colors',
    gpSumWarning: 'Weights add up to {n}%. They need to add up to 100%.',
    gpFixSum: 'Adjust to 100%',
    gpDistribution: 'Distribution',
    gpPresetEqual: 'Equal',
    gpPresetGolden: 'Golden ratio',
    gpPresetDescending: 'Descending',
    gpPresetSource: 'From the image',
    gpPresetSourceHint: 'Load an SVG or image to use its proportions',
    gpSortBy: 'Sort by',
    gpSortWeight: 'Weight',
    gpSortLightness: 'Lightness',
    gpSortHue: 'Hue',
    gpExpandCodes: 'Show codes for this color',
    gpCollapseCodes: 'Hide codes for this color',
    gpNoCodes: 'No codes chosen in settings',
    gpReorderAria: 'Reorder: drag, or use the arrow keys',
    gpHarmonyTitle: 'Colors from a base',
    gpHarmonyHint: 'Pick a palette color and a relationship, then add the results.',
    gpBase: 'Base',
    gpHarmonyComplementary: 'Complementary',
    gpHarmonyAnalogous: 'Analogous',
    gpHarmonyTriad: 'Triad',
    gpHarmonyMonochromatic: 'Monochromatic',
    gpAddToPalette: 'Add to palette',
    gpAddAll: 'Add all',
    gpAddHexAria: 'Add {hex} to the palette',
    gpInPalette: 'Already in the palette',
    gpNeutralBase: 'This base is neutral, so hue relationships repeat it. Try monochromatic.',
    gpViewLabel: 'View',
    gpViewSheet: 'Sheet',
    gpViewStrip: 'Strip',
    gpViewGrid: 'Grid',
    gpViewBars: 'Bars',
    gpViewRing: 'Ring',
    gpMoreLayouts: 'More layouts',
    gpChoose: 'Choose…',
    gpTemplateMainVariations: 'Main colors and tones',
    gpShowLabel: 'Show',
    gpShowName: 'Name',
    gpShowHex: 'Hex',
    gpShowPercent: 'Percentage',
    gpShowCodes: 'Codes',
    gpVariationsToggle: 'Tints and shades',
    gpVariationCodes: 'Tone codes',
    gpTonesPerSide: 'Tones per side',
    gpDownloadSvg: 'Download SVG',
    gpDownloadPng: 'Download PNG',
    gpSheetHint: 'Each block is sized by its color\'s weight.',
    gpCombosHint: 'Click a square to edit its colors; drag to reorder.',
    gpWeightInPalette: 'Weight of each color in the palette',
    gpContrastHint: 'Pairs from your palette with at least 3:1.',
    gpNoPairs: 'No pair reaches 3:1 yet.',

    // Matcher: reference reading and discoveries
    referenceCode: 'Reference',
    bestMatch: 'Best match',
    matchQuality: 'How close it is',
    finishLabel: 'Finish',
    finishAll: 'All finishes',
    finishCoated: 'Coated',
    finishUncoated: 'Uncoated',
    finishProcessCoated: 'Process simulation, coated',
    finishProcessUncoated: 'Process simulation, uncoated',
    copyCode: 'Copy code',
    compareInputReference: 'Your color against the reference',
    deltaImperceptible: 'Imperceptible difference',
    deltaSubtle: 'Subtle, only side by side',
    deltaClose: 'Close, safe on press',
    deltaVisible: 'Visible difference',
    deltaDifferent: 'Another color',
    rankedAlternatives: 'Ranked alternatives',
    alternativesHint: 'One row per reference, with each finish and its distance.',
    noReferenceFound: 'No reference within reach with these finishes.',
    variantsLabel: 'Finishes',
    spotInkTip: 'A special ink gets closer here than four-color process.',
    discoveries: 'Discoveries',
    discoveriesHint: 'What the search found around this color.',
    whatThisColorIs: 'What this color is',
    familyLabel: 'Family',
    temperatureLabel: 'Temperature',
    neighboursTitle: 'Neighbours in the book',
    neighboursHint: 'The same color, one step to each side.',
    neighbourLighter: 'Lighter',
    neighbourDarker: 'Darker',
    neighbourWarmer: 'Warmer',
    neighbourCooler: 'Cooler',
    otherFinishesTitle: 'The same reference in other finishes',
    otherFinishesHint: 'Paper changes the ink: same code, another color.',
    harmonyTitle: 'Harmonic partners',
    harmonyHint: 'Each partner comes with its closest reference.',
    harmonyComplement: 'Complement',
    harmonyAnalogousA: 'Analogous −30°',
    harmonyAnalogousB: 'Analogous +30°',
    harmonyTriadicA: 'Triad +120°',
    harmonyTriadicB: 'Triad +240°',
    pressTitle: 'On press',
    pressWithinProcess: 'Four-color process reaches this color.',
    pressBeyondProcess: 'Beyond the reach of four-color process.',
    pressHeavyInk: 'Total ink above 300%: talk to the printer.',
    pressInkOk: 'Total ink within the usual limit.',
    pressEstimate: 'Estimate for coated stock.',
    chromaOverflowLabel: 'Chroma beyond reach',
    usageTitle: 'Notes for this reference',
    familyRed: 'Red',
    familyOrange: 'Orange',
    familyYellow: 'Yellow',
    familyLime: 'Yellow-green',
    familyGreen: 'Green',
    familyTeal: 'Blue-green',
    familyCyan: 'Cyan',
    familyBlue: 'Blue',
    familyIndigo: 'Indigo',
    familyViolet: 'Violet',
    familyMagenta: 'Magenta',
    familyPink: 'Pink',
    familyNeutral: 'Neutral',
    tempWarm: 'Warm',
    tempCool: 'Cool',
    tempTemperate: 'Neutral',
    satGray: 'Grayish',
    satMuted: 'Muted',
    satBalanced: 'Balanced',
    satVivid: 'Vivid',
    lightVeryDark: 'Very dark',
    lightDark: 'Dark',
    lightMedium: 'Medium',
    lightLight: 'Light',
    lightVeryLight: 'Very light',
    nameModLighter: 'light',
    nameModDarker: 'dark',
    nameModWarmer: 'warm',
    nameModCooler: 'cool',
    nameModVivid: 'vivid',
    nameModMuted: 'muted',
  },
  
  pt: {
    // Common
    settings: 'Configurações',
    language: 'Idioma',
    close: 'Fechar',
    copy: 'Copiar',
    download: 'Baixar',
    add: 'Adicionar',
    remove: 'Remover',
    save: 'Salvar',
    cancel: 'Cancelar',
    
    // Navigation
    matcher: 'Matcher',
    contrastPalette: 'Contrastes & paleta',
    generatedPalettes: 'Paletas geradas',
    printGuide: 'Guia de impressão',
    
    // Settings Panel
    visibleColorModels: 'Modelos de cor visíveis',
    hexadecimal: 'Hexadecimal',
    rgbStandard: 'RGB (padrão)',
    hslWeb: 'HSL (web)',
    hsbHsv: 'HSB / HSV',
    cieLabHighPrec: 'CIE Lab (alta prec)',
    cmykProcess: 'CMYK (processo)',
    refBridgeC: 'Escala CP (revestido)',
    refBridgeU: 'Escala UP (não revestido)',
    refSolidC: 'Sólida C (revestido)',
    refSolidU: 'Sólida U (não revestido)',
    mixedFormatSyntax: 'Sintaxe de formato misto',
    changesAppliedRealtime: 'As alterações são aplicadas em tempo real nas sessões ativas.',
    
    // Color Input
    color: 'Cor',
    inputColor: 'Cor de entrada',
    
    // Match Section
    matchCie2000: 'Match (CIE2000)',
    input: 'Entrada',
    deltaE00: 'Delta E 00',
    outOfGamut: 'Fora do gamut',
    actions: 'Ações',
    randomizeColor: 'Cor aleatória',
    analyzeWithAi: 'Buscar referência',
    thinking: 'Buscando...',
    aiResult: 'Resultado da busca',
    mood: 'Humor',
    
    // Batch Mode
    batchOn: 'Lote ativo',
    batchOff: 'Lote inativo',
    multiSlotMatchAnalysis: 'Análise de match multi-slot',
    copyAllSlotsData: 'Copiar dados de todos os slots',
    nearbyAlternatives: 'Alternativas próximas',
    selectSlotColor: 'Selecionar cor do slot',
    downloadSlot: 'Baixar slot',
    
    // Nearby references
    nearbyRefs: 'Referências próximas (ΔE 00)',
    
    // InfoGrid
    red: 'Vermelho',
    green: 'Verde',
    blue: 'Azul',
    cyan: 'Ciano',
    magenta: 'Magenta',
    yellow: 'Amarelo',
    keyBlack: 'Preto (K)',
    hue: 'Matiz',
    saturation: 'Saturação',
    lightness: 'Luminosidade',
    aiAnalysis: 'Análise de cor',
    
    // PaletteBuilder
    shadeCount: 'Quantidade de tons escuros',
    tintCount: 'Quantidade de tons claros',
    darkenIntensity: 'Intensidade de escurecimento',
    lightenIntensity: 'Intensidade de clareamento',
    hueRotateShade: 'Rotação de matiz (escuro)',
    hueRotateTint: 'Rotação de matiz (claro)',
    saturationShade: 'Saturação (escuro)',
    saturationTint: 'Saturação (claro)',
    useRefMatch: 'Usar match de referência',
    showBatchPalettes: 'Mostrar paletas em lote',
    selectBatchColor: 'Selecionar cor do lote',
    baseColor: 'Cor base',
    exportPalette: 'Exportar paleta',
    paletteContrast: 'Contraste da paleta',
    accessiblePairs: 'Pares acessíveis',
    
    // ColorGuide
    cmykMixer: 'Mixer CMYK',
    totalInk: 'Total de tinta',
    manualCmykPreview: 'Preview CMYK manual',
    contrastChecker: 'Verificador de contraste',
    foreground: 'Primeiro plano',
    background: 'Fundo',
    contrastRatio: 'Taxa de contraste',
    wcagAA: 'WCAG AA',
    wcagAAA: 'WCAG AAA',
    pass: 'Passa',
    fail: 'Falha',
    accessibleSuggestions: 'Sugestões acessíveis',
    darkSuggestions: 'Sugestões escuras',
    lightSuggestions: 'Sugestões claras',
    monochromaticVariations: 'Variações monocromáticas',
    hueVariation: 'Variação de matiz',
    substrateSimulation: 'Simulação de substrato',
    coated: 'Couché',
    uncoated: 'Offset',
    dotGain10: 'Ganho de ponto 10%',
    dotGain20: 'Ganho de ponto 20%',
    recycledPaper: 'Papel reciclado',
    lowDensity: 'Baixa densidade',
    colorBlindnessSimulation: 'Simulação de daltonismo',
    protanopia: 'Protanopia',
    deuteranopia: 'Deuteranopia',
    tritanopia: 'Tritanopia',
    achromatopsia: 'Acromatopsia',
    separationGuide: 'Guia de separação',
    spotColor: 'Cor spot',
    processColor: 'Cor processo',
    refGuide: 'Guia de referência',
    useSpotWhen: 'Use cores spot quando a consistência da marca é crítica',
    useProcessWhen: 'Use cores processo para imagens complexas e gradientes',
    accessibleVariations: 'Variações acessíveis',
    totalVariations: 'Total de variações',
    
    // GeneratedPalettes
    paletteColors: 'Cores da paleta',
    addColor: 'Adicionar cor',
    showCodes: 'Mostrar códigos',
    hideCodes: 'Ocultar códigos',
    previewStyles: 'Estilos de preview',
    classic: 'Clássico',
    vertical: 'Vertical',
    grid: 'Grade',
    cards: 'Cartões',
    downloadPalette: 'Baixar paleta',
    exportAco: 'Exportar ACO',
    exportAse: 'Exportar ASE',
    exportCsv: 'Exportar CSV',
    customCombinations: 'Combinações customizadas',
    squares: 'Quadrados',
    circles: 'Círculos',
    sunset: 'Por do sol',
    bars: 'Barras',
    backgroundStyle: 'Estilo de fundo',
    blackBg: 'Preto',
    whiteBg: 'Branco',
    grayBg: 'Cinza',
    shuffleCombinations: 'Embaralhar combinações',
    colorDetails: 'Detalhes da cor',
    locked: 'Travado',
    unlocked: 'Destravado',
    
    // PaletteGenerator
    extractFromImage: 'Extrair de imagem',
    extracting: 'Extraindo...',
    dragDropImage: 'Arraste e solte uma imagem ou clique para enviar',
    
    // Similarity Grid
    similarityTitle: 'Grade de similaridade',
    
    // Footer
    poweredBy: 'Desenvolvido por UNBSERVED',
    
    // Language names
    english: 'English',
    portuguese: 'Português',
    spanish: 'Español',
    
    // ColorGuide extra
    spotColor2: 'Cor spot',
    clickToEdit: 'Clique para editar a cor',
    paletteColorsLabel: 'Cores da paleta',
    active: 'ativa',
    substrates: 'Substratos',
    simulatedPaperDotGain: 'Simulação de papel e ganho de ponto',
    original: 'Original',
    digitalD65: 'Digital D65',
    coatedPaper: 'Couché / 150g',
    uncoatedPaper: 'Papel offset',
    mediumGain: 'Ganho médio',
    heavyGain: 'Ganho alto',
    grayBase: 'Base cinza',
    legibilityStandards: 'Padrões de legibilidade',
    contrastAnalysis: 'Análise de contraste',
    preview: 'Preview',
    legibleText: 'Texto legível sobre fundo',
    neutralMatchMatrix: 'Matriz de match neutro',
    varyTones: 'Variar tons',
    darkUi: 'UI escura',
    surface: 'Superfície',
    paletteContrastTest: 'Contraste da paleta',
    testsBetweenColors: 'Testes entre cores da paleta',
    textOnBackground: 'Texto sobre fundo',
    productionCheck: 'Verificação de produção',
    trappingRegistration: 'Trapping e registro',
    trapTest: 'Teste de trap',
    resolution: 'Resolução',
    lpiHalftone: 'Retícula LPI',
    gamut: 'Gamut',
    colorSpaceGamut: 'Gamut de espaço de cor',
    printSimulationTests: 'Testes de simulação de impressão',
    visualPrintTests: 'Testes visuais de impressão',
    bleedTest: 'Teste de sangria',
    bleedArea: 'Área de sangria',
    safeArea: 'Área segura',
    bleed3mm: 'Sangria 3mm',
    cutLine: 'Corte',
    overprintTest: 'Teste de overprint',
    colorOverlay: 'Sobreposição de cores',
    gradientTest: 'Teste de gradiente',
    bandingCheck: 'Verificação de banding',
    observeBanding: 'Observe se há "faixas" visíveis no degradê',
    minimumText: 'Texto mínimo',
    textLegibility: 'Legibilidade de texto',
    bodyText: 'Texto 14pt - corpo normal',
    footnotes: 'Texto 10pt - notas de rodapé',
    minimumReadLimit: 'Texto 7pt - limite mínimo para leitura',
    microPrint: 'Texto 5pt - micro impressão / avisos legais',
    highResRequired: 'Abaixo de 6pt requer alta resolução',
    adjacencyTest: 'Teste de adjacência',
    neighboringColors: 'Cores vizinhas',
    colorBehavior: 'Como a cor se comporta ao lado de outras',
    reversalTest: 'Teste de inversão',
    positiveNegative: 'Positivo / negativo',
    positive: 'Positivo',
    negative: 'Negativo',
    knockoutApplication: 'Teste de vazado e aplicação invertida',
    screenAngles: 'Ângulos de retícula',
    cmykPlateAngles: 'Ângulos de chapas CMYK',
    standardAngles: 'Ângulos padrão evitam moiré',
    metamerismTest: 'Teste de metamerismo',
    lightingSimulation: 'Simulação de iluminação',
    colorsChangeLight: 'Cores mudam sob diferentes luzes',
    blackTest: 'Teste de preto',
    richBlackVsPure: 'Rich black vs pure black',
    pureBlack: 'Pure black',
    richBlack: 'Rich black',
    comparisonOnColor: 'Comparação sobre sua cor',
    richBlackDense: 'Rich black é mais denso mas seca lento',
    tintRamp: 'Rampa de tons',
    densityScale: 'Escala de densidades',
    tintUniformity: 'Verifica se degradê de tints mantém uniformidade',
    hairlineTest: 'Teste de hairline',
    fineLines: 'Linhas finas',
    linesPrintFail: 'Linhas abaixo de 0.5pt podem falhar na impressão',
    registrationMarks: 'Marcas de registro',
    alignCmykPlates: 'Usadas para alinhar chapas CMYK na impressora',
    textKnockout: 'Vazado de texto',
    knockoutVsOverprint: 'Vazado vs sobreposto',
    knockoutDesc: 'A cor de fundo é "removida" sob o texto',
    overprintDesc: 'O texto é impresso sobre a cor',
    smallBlackText: 'Texto preto pequeno deve usar overprint para evitar problemas de registro',
    knockoutRemoves: 'Knockout remove cor; overprint sobrepõe',
    colorBars: 'Barras de cor',
    controlBars: 'Barras de controle',
    densityRegistration: 'Barras usadas para verificar densidade e registro',
    technicalIntegrity: 'Integridade técnica',
    totalInkCoverage: 'Cobertura total de tinta (TIC / TAC)',
    ticTacDesc: 'A soma das porcentagens de C, M, Y e K não deve exceder os limites físicos do papel. O excesso de carga de tinta resulta em decalque e longos tempos de secagem.',
    status: 'Status',
    highRisk: 'Alto risco',
    idealDrying: 'Secagem ideal',
    highCoverage: 'Cobertura alta',
    safeCoverage: 'Cobertura segura',
    knowledgeBase: 'Base de conhecimento',
    printColorEducation: 'Didática de impressão e cor',
    subtractiveTheory: 'Teoria subtrativa',
    subtractiveDesc: 'Ao contrário das telas (RGB), que somam luz para criar branco, a impressão CMYK é subtrativa: as tintas agem como filtros que bloqueiam partes do espectro luminoso. Quanto mais tinta, mais perto do preto.',
    offsetVsDigital: 'Offset vs digital',
    offsetVsDigitalDesc: 'O offset usa chapas metálicas e tintas líquidas pastosas, ideal para grandes tiragens e cores spot exatas. O digital usa toner ou jato de tinta, sendo mais rápido para pequenas quantidades mas com gamut limitado.',
    dotGainTitle: 'Ganho de ponto',
    dotGainDesc: 'Dot gain ocorre quando a gota de tinta expande ao atingir as fibras do papel. Papéis porosos (offset/jornal) sofrem mais ganho de ponto, o que pode escurecer a imagem final se não compensado.',
    spotRefColors: 'Spot (cores de referência)',
    spotRefDesc: 'São cores pré-misturadas pelo fabricante. Diferente do CMYK (que usa 4 tintas), uma cor spot é uma tinta única aplicada diretamente, garantindo fidelidade total em logotipos.',
    metamerism: 'Metamerismo',
    metamerismDesc: 'É o fenômeno onde duas cores parecem idênticas sob uma luz (ex: escritório) mas diferentes sob outra (ex: luz do sol). Sempre verifique provas físicas em condições reais de uso.',
    varnishLamination: 'Verniz e laminação',
    varnishLaminationDesc: 'Acabamentos protegem a tinta e alteram a percepção da cor. A laminação fosca tende a achatar o contraste, enquanto o verniz brilho satura as cores e aprofunda os pretos.',
    coucheVsOffset: 'Couché vs offset',
    coucheVsOffsetDesc: 'O papel couché tem uma camada de revestimento que impede a absorção excessiva da tinta, mantendo as cores vibrantes. O offset é poroso, absorvendo a tinta e resultando em cores mais suaves e naturais.',
    trapping: 'Trapping (sobreposição)',
    trappingDesc: 'Técnica de compensação de registro onde cores adjacentes são ligeiramente sobrepostas. Isso evita frestas brancas se houver um pequeno desalinhamento das chapas na impressora.',
    gcrUcr: 'GCR e UCR',
    gcrUcrDesc: 'Técnicas de pré-impressão que substituem partes das cores CMY pelo canal K (preto). Isso economiza tinta cara, melhora a secagem e garante maior estabilidade de cor nas sombras.',
    lineature: 'Lineatura (LPI)',
    lineatureDesc: 'Define a densidade da retícula. Revistas de luxo usam 175-200 LPI (pontos invisíveis), enquanto jornais usam 85-100 LPI (pontos visíveis a olho nu). Afeta diretamente o detalhamento da imagem.',
    colorGamut: 'Gamut de cor',
    colorGamutDesc: 'É o alcance total de cores que um sistema pode reproduzir. O RGB (telas) tem um gamut muito maior que o CMYK (impressão). Por isso, cores neon ou azuis elétricos muitas vezes apagam no papel.',
    weightVsThickness: 'Gramatura vs espessura',
    weightVsThicknessDesc: 'Gramatura é o peso (g/m²). Espessura (micras) é o volume. Papéis de mesma gramatura podem ter espessuras diferentes devido à densidade das fibras, afetando a "mão" do material impresso.',
    
    // PaletteBuilder extra
    batchPalette: 'Paleta do batch',
    colors: 'cores',
    hideBatch: 'Ocultar batch',
    showBatch: 'Mostrar batch',
    clickToUseAsBase: 'Clique em uma cor para usar como base da paleta de contrastes',
    shades: 'Tons escuros',
    tints: 'Tons claros',
    count: 'Qtd',
    step: 'Passo',
    randomize: 'Aleatório',
    
    // GeneratedPalettes extra
    processing: 'Processando...',
    exact: 'Exato',
    randomizeColors: 'Cores aleatórias',
    suggestHarmony: 'Sugerir harmonia',
    uploadSvg: 'Carregar SVG',
    basePosition: 'Posição da base',
    none: 'Nenhum',
    above: 'Acima',
    center: 'Centro',
    below: 'Abaixo',
    contrast: 'Contraste',
    variations: 'Variações',

    // UI headings & helpers
    masterColorReference: 'Referência de cor mestre',
    digitalVsPrint: 'Simulação digital vs impressão',
    technicalBreakdown: 'Análise técnica',
    cmykSeparationLogic: 'Lógica de separação CMYK',
    colorChannelsLabel: 'Canais de cor',
    harmonyComplementary: 'Complementar',
    harmonyAnalogWarm: 'Análogo quente',
    harmonyAnalogCool: 'Análogo frio',
    harmonyTriadic: 'Triádico',
    harmonySplitComplementary: 'Complementar dividido',
    harmonyTetradic: 'Tetrádico',
    overprintSimulationNote: 'Simula overprint com mix-blend-multiply',
    lightingD65: 'Luz do dia D65',
    lightingTungsten: 'Tungstênio',
    lightingFluorescent: 'Fluorescente',
    reducedDensity: '-5% de densidade',
    knockoutLabel: 'Knockout',
    overprintLabel: 'Overprint',
    textLabel: 'Texto',
    copiedToClipboard: 'Copiado para a área de transferência!',
    slotLabel: 'Slot',
    colorCardAria: 'cartão de cor',
    baseBadge: 'Base',
    // Library Manager
    selectLibrary: 'Selecionar biblioteca',
    standardLibrary: 'Sistema A (padrão)',
    uploadedLibraries: 'Minhas bibliotecas enviadas',
    uploadAcb: 'Enviar .ACB',
    loading: 'Carregando...',
    noValidColors: 'Nenhuma cor válida encontrada no arquivo.',
    parseFailed: 'Falha ao analisar o arquivo .acb',
    cannotExportStandard: 'Não é possível exportar a biblioteca padrão.',
    warning: 'Aviso:',
    allBlackWarning: 'Todas as cores foram lidas como preto (#000000). O arquivo pode ser incompatível. Remova esta biblioteca e tente novamente.',
    copyJsonCode: 'Copiar código JSON',
    deleteLibrary: 'Excluir biblioteca',
    verifyColorsNote: 'Verifique se as cores estão corretas (não todas pretas) antes de exportar.',

    // GeneratedPalettes UI
    addColorPlaceholder: 'Adicionar cor (ex: #FF5500)',
    addColorButton: 'Adicionar',
    preview1Title: 'Preview 1',
    preview1Subtitle: 'Folha de cores',
    templateLabel: 'Template',
    splitLabel: 'Divisão',
    variationsLabel: 'Variações',
    baseColorPositionLabel: 'Cor base',
    basePositionNone: 'Sem',
    basePositionAbove: 'Acima',
    basePositionCenter: 'Centro',
    basePositionBelow: 'Abaixo',
    showVariationCodesOn: 'Ocultar códigos das variações',
    showVariationCodesOff: 'Mostrar códigos das variações',
    showCodesOn: 'Ocultar códigos (tela 1)',
    showCodesOff: 'Mostrar códigos (tela 1)',
    
    // PaletteGenerator
    processingImage: 'Processando...',
    uploadImageSvg: 'Imagem / SVG',
    
    // GeneratedPalettes - Previews extras
    preview2Title: 'Quadrados de interação Albers',
    preview2Subtitle: 'Estudo de contraste simultâneo inspirado em Josef Albers',
    preview3Title: 'Combinações personalizadas',
    preview3Subtitle: 'Arranjos geométricos com sua paleta',
    preview4Title: 'Pares de contraste',
    preview4Subtitle: 'Combinações acessíveis de texto e fundo (WCAG)',
    
    // GeneratedPalettes - Albers controls
    shuffleAlbers: 'Embaralhar',
    albersNote: 'Cada quadrado mostra como a cor interna parece mudar em diferentes fundos',
    
    // GeneratedPalettes - Export
    exportColorSheet: 'Folha de cores',
    exportToAco: 'Exportar ACO',
    exportToAse: 'Exportar ASE',
    exportToCsv: 'Exportar CSV',
    
    // GeneratedPalettes - Color management
    removeColorAria: 'Remover cor',
    lockWeightAria: 'Travar peso',
    unlockWeightAria: 'Destravar peso',
    colorNameAria: 'Nome da cor',
    colorHexAria: 'Código hex da cor',
    colorWeightAria: 'Porcentagem do peso da cor',
    
    // GeneratedPalettes - Albers editing
    externalColorLabel: 'Ext',
    internalColorLabel: 'Int',
    resetCombo: 'Resetar',
    availableCombinations: 'combinações disponíveis',
    backgroundLabel: 'Fundo',
    cardsLabel: 'Cartões',
    
    // ColorSheetExport
    colorGuidePreview: 'Prévia do guia de cores',
    printSavePdfHint: 'Use a função "Imprimir" do navegador para salvar como PDF',
    closeButton: 'Fechar',
    cardTemplateLabel: 'Modelo do card',
    cardTemplateClassic: 'Clássico',
    cardTemplateCompact: 'Compacto',
    cardTemplateEditorial: 'Editorial',
    cardTemplateSwatch: 'Amostra',
    cardTemplateMinimal: 'Mínimo',
    cardTemplateMono: 'Mono',
    printSavePdf: 'Imprimir / salvar PDF',
    
    // GeneratedPalettes - Template options
    templateSquares: 'Quadrados',
    templateCircles: 'Círculos',
    templateSunset: 'Pôr do sol',
    templateBars: 'Barras',
    backgroundBlack: 'Preto',
    backgroundWhite: 'Branco',
    backgroundGray: 'Cinza',

    // Palette Magic
    paletteMagic: 'Palette Magic',
    contextBrand: 'Identidade de marca',
    contextPoster: 'Cartaz',
    contextUI: 'UI / layout',
    contextEditorial: 'Editorial',
    contextPackaging: 'Embalagem',
    contrastScore: 'Contraste',
    harmonyScore: 'Harmonia',
    paletteScore: 'Pontuação',
    trendPalettes: 'Paletas em tendência',
    userPalettes: 'Suas paletas',
    expandPalette: 'Expandir',
    generateMagic: 'Gerar',
    applyPalette: 'Aplicar',
    harmonyPalettes: 'Paletas de harmonia',
    allContexts: 'Todos',
    wcagValidated: 'Validado WCAG',
    copyPalette: 'Copiar paleta',
    baseColors: 'Cores base',
    noBaseColors: 'Adicione cores via upload de SVG ou entrada hex para gerar paletas',
    slots: 'Slots',
    lockColor: 'Travar',
    unlockColor: 'Destravar',

    copyFailed: 'Não foi possível copiar',
    downloaded: 'Arquivo baixado',

    accessibility: 'Acessibilidade',
    onWhite: 'Sobre branco',
    onBlack: 'Sobre preto',
    normalText: 'Texto normal',
    largeText: 'Texto grande',
    apcaLc: 'APCA Lc',
    bestTextColor: 'Melhor cor de texto',
    customBackground: 'Fundo personalizado',
    suggestAccessibleColor: 'Sugerir cor acessível',
    suggestion: 'Sugestão',
    applySuggestion: 'Aplicar',
    alreadyAccessible: 'Já atende AA neste fundo',
    noAccessibleColor: 'Nenhuma variação acessível encontrada',

    tonalScale: 'Escala tonal',
    tonalScaleHint: 'Clique numa amostra para aplicá-la',
    baseStep: 'Base',
    exportScale: 'Exportar escala',

    exportPaletteMenu: 'Exportar paleta',
    exportFormatCss: 'Variáveis CSS',
    exportFormatTailwind: 'Tailwind',
    exportFormatTailwind3: 'Config Tailwind v3',
    exportFormatTailwind4: 'Tema Tailwind v4',
    exportFormatDtcg: 'Design tokens (JSON)',
    exportFormatAse: 'Amostras Adobe (ASE)',
    exportFormatGpl: 'Paleta GIMP (GPL)',

    colorVision: 'Visão de cores',
    visionNormal: 'Normal',
    simulation: 'Simulação',

    // Shell & navigation
    sections: 'Seções',
    referenceLibraries: 'Bibliotecas de referência',
    referencePlaceholder: 'Referência',

    // Shared actions & short labels
    apply: 'Aplicar',
    paste: 'Colar',
    extract: 'Extrair',
    shuffle: 'Embaralhar',
    totalLabel: 'Total',
    refShort: 'Ref',
    downloadAll: 'Todos',
    customSuffix: 'personalizada',

    // SVG import
    pasteSvgCode: 'Colar código SVG',
    pasteSvgPlaceholder: 'Cole o código SVG…',
    noColorsFound: 'Nenhuma cor encontrada',

    // Generated palettes controls
    paletteExportLabel: 'Exportação de paleta',
    suggestCombination: 'Sugerir combinação',
    mustBe100: '(deve ser 100%)',
    dragToReorder: 'Arrastar para reordenar',
    hideVariations: 'Ocultar variações',
    showVariations: 'Mostrar variações',
    layersLabel: 'Camadas',
    fullContrast: 'Contraste máximo',
    lockSlot: 'Travar slot',
    unlockSlot: 'Destravar slot',
    middleColorLabel: 'Meio',

    // Palette sheet templates
    templateStripes: 'Listras',
    templateSwatches: 'Amostras',
    templateGradient: 'Degradê',
    templateMosaic: 'Mosaico',
    templateSplitScreen: 'Tela dividida',
    templateColumns: 'Colunas',
    templateDots: 'Pontos',
    templateEditorial: 'Editorial',

    // Albers templates
    templateRings: 'Anéis',
    templateDiamonds: 'Losangos',
    templateFrames: 'Molduras',
    templateSplit: 'Divisão',
    templateTargets: 'Alvos',
    templateTriangles: 'Triângulos',

    // Palette Magic
    paletteMagicIntro: 'Paletas curadas com trava e embaralhamento. Congele as cores que quer manter e gere o resto de novo.',
    sourceColors: 'Origem',
    clickASlot: 'Clique num slot',
    deselect: 'Desselecionar',
    selectToInject: 'Selecionar para inserir num slot',
    extractFromImageTitle: 'Extrair paleta da imagem (JPG/PNG/WEBP)',
    contextLabel: 'Contexto',
    colorInjectedLocked: 'Cor inserida e travada',
    contrastPairs: 'Pares de contraste',
    shuffleToGenerate: 'Embaralhe para gerar paletas.',

    // Palette builder backgrounds
    bgDarkest: 'Mais escuro',
    bgLightest: 'Mais claro',

    // Color sheet export
    brandColorGuide: 'Guia de cores da marca',
    generatedByTool: 'Gerado por UNBSCOLOR',
    professionalColorStandards: 'Padrões profissionais de cor',

    // Generated palettes
    gpEyebrow: 'Construtor de paleta',
    gpInputLabel: 'Entrada',
    gpOutputLabel: 'Saída',
    gpLoadFile: 'Carregar SVG ou imagem',
    gpLoadFailed: 'Não foi possível ler este arquivo',
    gpColorsCount: '{n} cores',
    gpSumWarning: 'Os pesos somam {n}%. Precisam somar 100%.',
    gpFixSum: 'Ajustar para 100%',
    gpDistribution: 'Distribuição',
    gpPresetEqual: 'Igual',
    gpPresetGolden: 'Proporção áurea',
    gpPresetDescending: 'Decrescente',
    gpPresetSource: 'Da imagem',
    gpPresetSourceHint: 'Carregue um SVG ou uma imagem para usar as proporções dele',
    gpSortBy: 'Ordenar por',
    gpSortWeight: 'Peso',
    gpSortLightness: 'Luminosidade',
    gpSortHue: 'Matiz',
    gpExpandCodes: 'Mostrar códigos desta cor',
    gpCollapseCodes: 'Ocultar códigos desta cor',
    gpNoCodes: 'Nenhum código escolhido nas configurações',
    gpReorderAria: 'Reordenar: arraste ou use as setas',
    gpHarmonyTitle: 'Cores a partir da base',
    gpHarmonyHint: 'Escolha uma cor da paleta e uma relação, depois adicione o resultado.',
    gpBase: 'Base',
    gpHarmonyComplementary: 'Complementar',
    gpHarmonyAnalogous: 'Análogas',
    gpHarmonyTriad: 'Tríade',
    gpHarmonyMonochromatic: 'Monocromática',
    gpAddToPalette: 'Adicionar à paleta',
    gpAddAll: 'Adicionar todas',
    gpAddHexAria: 'Adicionar {hex} à paleta',
    gpInPalette: 'Já está na paleta',
    gpNeutralBase: 'Esta base é neutra, então as relações de matiz a repetem. Experimente monocromática.',
    gpViewLabel: 'Visualização',
    gpViewSheet: 'Folha',
    gpViewStrip: 'Faixa',
    gpViewGrid: 'Grade',
    gpViewBars: 'Barras',
    gpViewRing: 'Anel',
    gpMoreLayouts: 'Mais modelos',
    gpChoose: 'Escolher…',
    gpTemplateMainVariations: 'Principais e tons',
    gpShowLabel: 'Mostrar',
    gpShowName: 'Nome',
    gpShowHex: 'Hex',
    gpShowPercent: 'Porcentagem',
    gpShowCodes: 'Códigos',
    gpVariationsToggle: 'Tons claros e escuros',
    gpVariationCodes: 'Códigos dos tons',
    gpTonesPerSide: 'Tons por lado',
    gpDownloadSvg: 'Baixar SVG',
    gpDownloadPng: 'Baixar PNG',
    gpSheetHint: 'O tamanho de cada bloco segue o peso da cor.',
    gpCombosHint: 'Clique num quadrado para editar as cores; arraste para reordenar.',
    gpWeightInPalette: 'Peso de cada cor na paleta',
    gpContrastHint: 'Pares da sua paleta com pelo menos 3:1.',
    gpNoPairs: 'Nenhum par chega a 3:1 ainda.',

    // Matcher: reference reading and discoveries
    referenceCode: 'Referência',
    bestMatch: 'Melhor correspondência',
    matchQuality: 'Quão perto está',
    finishLabel: 'Acabamento',
    finishAll: 'Todos os acabamentos',
    finishCoated: 'Revestido',
    finishUncoated: 'Não revestido',
    finishProcessCoated: 'Simulação em escala, revestido',
    finishProcessUncoated: 'Simulação em escala, não revestido',
    copyCode: 'Copiar código',
    compareInputReference: 'Sua cor diante da referência',
    deltaImperceptible: 'Diferença imperceptível',
    deltaSubtle: 'Sutil, só lado a lado',
    deltaClose: 'Próxima, segura na impressão',
    deltaVisible: 'Diferença visível',
    deltaDifferent: 'Outra cor',
    rankedAlternatives: 'Alternativas por proximidade',
    alternativesHint: 'Uma linha por referência, com cada acabamento e sua distância.',
    noReferenceFound: 'Nenhuma referência ao alcance com esses acabamentos.',
    variantsLabel: 'Acabamentos',
    spotInkTip: 'Aqui uma tinta especial chega mais perto que a escala.',
    discoveries: 'Descobertas',
    discoveriesHint: 'O que a busca encontrou em volta desta cor.',
    whatThisColorIs: 'O que é esta cor',
    familyLabel: 'Família',
    temperatureLabel: 'Temperatura',
    neighboursTitle: 'Vizinhas na biblioteca',
    neighboursHint: 'A mesma cor, um passo para cada lado.',
    neighbourLighter: 'Mais clara',
    neighbourDarker: 'Mais escura',
    neighbourWarmer: 'Mais quente',
    neighbourCooler: 'Mais fria',
    otherFinishesTitle: 'A mesma referência em outros acabamentos',
    otherFinishesHint: 'O papel muda a tinta: mesmo código, outra cor.',
    harmonyTitle: 'Parceiras harmônicas',
    harmonyHint: 'Cada parceira vem com a referência mais próxima.',
    harmonyComplement: 'Complementar',
    harmonyAnalogousA: 'Análoga −30°',
    harmonyAnalogousB: 'Análoga +30°',
    harmonyTriadicA: 'Tríade +120°',
    harmonyTriadicB: 'Tríade +240°',
    pressTitle: 'Na impressão',
    pressWithinProcess: 'A escala CMYK alcança esta cor.',
    pressBeyondProcess: 'Além do alcance da escala CMYK.',
    pressHeavyInk: 'Tinta total acima de 300%: fale com a gráfica.',
    pressInkOk: 'Tinta total dentro do limite usual.',
    pressEstimate: 'Estimativa para papel revestido.',
    chromaOverflowLabel: 'Croma além do alcance',
    usageTitle: 'Notas desta referência',
    familyRed: 'Vermelho',
    familyOrange: 'Laranja',
    familyYellow: 'Amarelo',
    familyLime: 'Verde-amarelado',
    familyGreen: 'Verde',
    familyTeal: 'Verde-azulado',
    familyCyan: 'Ciano',
    familyBlue: 'Azul',
    familyIndigo: 'Índigo',
    familyViolet: 'Violeta',
    familyMagenta: 'Magenta',
    familyPink: 'Rosa',
    familyNeutral: 'Neutra',
    tempWarm: 'Quente',
    tempCool: 'Fria',
    tempTemperate: 'Neutra',
    satGray: 'Acinzentada',
    satMuted: 'Suave',
    satBalanced: 'Equilibrada',
    satVivid: 'Vibrante',
    lightVeryDark: 'Muito escura',
    lightDark: 'Escura',
    lightMedium: 'Média',
    lightLight: 'Clara',
    lightVeryLight: 'Muito clara',
    nameModLighter: 'claro',
    nameModDarker: 'escuro',
    nameModWarmer: 'quente',
    nameModCooler: 'frio',
    nameModVivid: 'vivo',
    nameModMuted: 'suave',
  },
  
  es: {
    // Common
    settings: 'Configuración',
    language: 'Idioma',
    close: 'Cerrar',
    copy: 'Copiar',
    download: 'Descargar',
    add: 'Añadir',
    remove: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    
    // Navigation
    matcher: 'Matcher',
    contrastPalette: 'Contrastes y paleta',
    generatedPalettes: 'Paletas generadas',
    printGuide: 'Guía de impresión',
    
    // Settings Panel
    visibleColorModels: 'Modelos de color visibles',
    hexadecimal: 'Hexadecimal',
    rgbStandard: 'RGB (estándar)',
    hslWeb: 'HSL (web)',
    hsbHsv: 'HSB / HSV',
    cieLabHighPrec: 'CIE Lab (alta prec)',
    cmykProcess: 'CMYK (proceso)',
    refBridgeC: 'Cuatricromía CP (estucado)',
    refBridgeU: 'Cuatricromía UP (no estucado)',
    refSolidC: 'Sólida C (estucado)',
    refSolidU: 'Sólida U (no estucado)',
    mixedFormatSyntax: 'Sintaxis de formato mixto',
    changesAppliedRealtime: 'Los cambios se aplican en tiempo real a las sesiones activas.',
    
    // Color Input
    color: 'Color',
    inputColor: 'Color de entrada',
    
    // Match Section
    matchCie2000: 'Match (CIE2000)',
    input: 'Entrada',
    deltaE00: 'Delta E 00',
    outOfGamut: 'Fuera de gama',
    actions: 'Acciones',
    randomizeColor: 'Color aleatorio',
    analyzeWithAi: 'Buscar referencia',
    thinking: 'Buscando...',
    aiResult: 'Resultado de la búsqueda',
    mood: 'Ánimo',
    
    // Batch Mode
    batchOn: 'Lote activo',
    batchOff: 'Lote inactivo',
    multiSlotMatchAnalysis: 'Análisis de match multi-slot',
    copyAllSlotsData: 'Copiar datos de todos los slots',
    nearbyAlternatives: 'Alternativas cercanas',
    selectSlotColor: 'Seleccionar color del slot',
    downloadSlot: 'Descargar slot',
    
    // Nearby references
    nearbyRefs: 'Referencias cercanas (ΔE 00)',
    
    // InfoGrid
    red: 'Rojo',
    green: 'Verde',
    blue: 'Azul',
    cyan: 'Cian',
    magenta: 'Magenta',
    yellow: 'Amarillo',
    keyBlack: 'Negro (K)',
    hue: 'Matiz',
    saturation: 'Saturación',
    lightness: 'Luminosidad',
    aiAnalysis: 'Análisis de color',
    
    // PaletteBuilder
    shadeCount: 'Cantidad de tonos oscuros',
    tintCount: 'Cantidad de tonos claros',
    darkenIntensity: 'Intensidad de oscurecimiento',
    lightenIntensity: 'Intensidad de aclaramiento',
    hueRotateShade: 'Rotación de matiz (oscuro)',
    hueRotateTint: 'Rotación de matiz (claro)',
    saturationShade: 'Saturación (oscuro)',
    saturationTint: 'Saturación (claro)',
    useRefMatch: 'Usar match de referencia',
    showBatchPalettes: 'Mostrar paletas en lote',
    selectBatchColor: 'Seleccionar color del lote',
    baseColor: 'Color base',
    exportPalette: 'Exportar paleta',
    paletteContrast: 'Contraste de la paleta',
    accessiblePairs: 'Pares accesibles',
    
    // ColorGuide
    cmykMixer: 'Mezclador CMYK',
    totalInk: 'Tinta total',
    manualCmykPreview: 'Vista previa CMYK manual',
    contrastChecker: 'Comprobador de contraste',
    foreground: 'Primer plano',
    background: 'Fondo',
    contrastRatio: 'Relación de contraste',
    wcagAA: 'WCAG AA',
    wcagAAA: 'WCAG AAA',
    pass: 'Pasa',
    fail: 'Falla',
    accessibleSuggestions: 'Sugerencias accesibles',
    darkSuggestions: 'Sugerencias oscuras',
    lightSuggestions: 'Sugerencias claras',
    monochromaticVariations: 'Variaciones monocromáticas',
    hueVariation: 'Variación de matiz',
    substrateSimulation: 'Simulación de sustrato',
    coated: 'Estucado',
    uncoated: 'No estucado',
    dotGain10: 'Ganancia de punto 10%',
    dotGain20: 'Ganancia de punto 20%',
    recycledPaper: 'Papel reciclado',
    lowDensity: 'Baja densidad',
    colorBlindnessSimulation: 'Simulación de daltonismo',
    protanopia: 'Protanopia',
    deuteranopia: 'Deuteranopia',
    tritanopia: 'Tritanopia',
    achromatopsia: 'Acromatopsia',
    separationGuide: 'Guía de separación',
    spotColor: 'Tinta plana',
    processColor: 'Cuatricromía',
    refGuide: 'Guía de referencia',
    useSpotWhen: 'Usa tintas planas cuando la consistencia de marca sea crítica',
    useProcessWhen: 'Usa cuatricromía para imágenes complejas y degradados',
    accessibleVariations: 'Variaciones accesibles',
    totalVariations: 'Total de variaciones',
    
    // GeneratedPalettes
    paletteColors: 'Colores de la paleta',
    addColor: 'Añadir color',
    showCodes: 'Mostrar códigos',
    hideCodes: 'Ocultar códigos',
    previewStyles: 'Estilos de vista previa',
    classic: 'Clásico',
    vertical: 'Vertical',
    grid: 'Cuadrícula',
    cards: 'Tarjetas',
    downloadPalette: 'Descargar paleta',
    exportAco: 'Exportar ACO',
    exportAse: 'Exportar ASE',
    exportCsv: 'Exportar CSV',
    customCombinations: 'Combinaciones personalizadas',
    squares: 'Cuadrados',
    circles: 'Círculos',
    sunset: 'Atardecer',
    bars: 'Barras',
    backgroundStyle: 'Estilo de fondo',
    blackBg: 'Negro',
    whiteBg: 'Blanco',
    grayBg: 'Gris',
    shuffleCombinations: 'Mezclar combinaciones',
    colorDetails: 'Detalles del color',
    locked: 'Bloqueado',
    unlocked: 'Desbloqueado',
    
    // PaletteGenerator
    extractFromImage: 'Extraer de imagen',
    extracting: 'Extrayendo...',
    dragDropImage: 'Arrastra y suelta una imagen o haz clic para subir',
    
    // Similarity Grid
    similarityTitle: 'Cuadrícula de similitud',
    
    // Footer
    poweredBy: 'Desarrollado por UNBSERVED',
    
    // Language names
    english: 'English',
    portuguese: 'Português',
    spanish: 'Español',
    
    // ColorGuide extra
    spotColor2: 'Tinta plana',
    clickToEdit: 'Haz clic para editar el color',
    paletteColorsLabel: 'Colores de la paleta',
    active: 'activo',
    substrates: 'Sustratos',
    simulatedPaperDotGain: 'Simulación de papel y ganancia de punto',
    original: 'Original',
    digitalD65: 'Digital D65',
    coatedPaper: 'Estucado / 150g',
    uncoatedPaper: 'Papel no estucado',
    mediumGain: 'Ganancia media',
    heavyGain: 'Ganancia alta',
    grayBase: 'Base gris',
    legibilityStandards: 'Estándares de legibilidad',
    contrastAnalysis: 'Análisis de contraste',
    preview: 'Vista previa',
    legibleText: 'Texto legible sobre fondo',
    neutralMatchMatrix: 'Matriz de coincidencia neutra',
    varyTones: 'Variar tonos',
    darkUi: 'UI oscura',
    surface: 'Superficie',
    paletteContrastTest: 'Contraste de la paleta',
    testsBetweenColors: 'Pruebas entre colores de la paleta',
    textOnBackground: 'Texto sobre fondo',
    productionCheck: 'Verificación de producción',
    trappingRegistration: 'Trapping y registro',
    trapTest: 'Prueba de trap',
    resolution: 'Resolución',
    lpiHalftone: 'Trama LPI',
    gamut: 'Gama',
    colorSpaceGamut: 'Gama del espacio de color',
    printSimulationTests: 'Pruebas de simulación de impresión',
    visualPrintTests: 'Pruebas visuales de impresión',
    bleedTest: 'Prueba de sangrado',
    bleedArea: 'Área de Sangrado',
    safeArea: 'Área segura',
    bleed3mm: 'Sangrado 3mm',
    cutLine: 'Línea de corte',
    overprintTest: 'Prueba de sobreimpresión',
    colorOverlay: 'Superposición de colores',
    gradientTest: 'Prueba de gradiente',
    bandingCheck: 'Verificación de banding',
    observeBanding: 'Observa si hay "bandas" visibles en el degradado',
    minimumText: 'Texto mínimo',
    textLegibility: 'Legibilidad de texto',
    bodyText: 'Texto 14pt - cuerpo normal',
    footnotes: 'Texto 10pt - notas al pie',
    minimumReadLimit: 'Texto 7pt - límite mínimo de lectura',
    microPrint: 'Texto 5pt - micro impresión / avisos legales',
    highResRequired: 'Por debajo de 6pt requiere alta resolución',
    adjacencyTest: 'Prueba de adyacencia',
    neighboringColors: 'Colores vecinos',
    colorBehavior: 'Cómo se comporta el color junto a otros',
    reversalTest: 'Prueba de inversión',
    positiveNegative: 'Positivo / negativo',
    positive: 'Positivo',
    negative: 'Negativo',
    knockoutApplication: 'Prueba de calado y aplicación invertida',
    screenAngles: 'Ángulos de trama',
    cmykPlateAngles: 'Ángulos de placas CMYK',
    standardAngles: 'Los ángulos estándar evitan el moiré',
    metamerismTest: 'Prueba de metamerismo',
    lightingSimulation: 'Simulación de iluminación',
    colorsChangeLight: 'Los colores cambian bajo diferentes luces',
    blackTest: 'Prueba de negro',
    richBlackVsPure: 'Rich black vs pure black',
    pureBlack: 'Pure black',
    richBlack: 'Rich black',
    comparisonOnColor: 'Comparación sobre tu color',
    richBlackDense: 'Rich black es más denso pero seca lento',
    tintRamp: 'Rampa de tonos',
    densityScale: 'Escala de densidades',
    tintUniformity: 'Comprueba si el degradado de tonos mantiene la uniformidad',
    hairlineTest: 'Prueba de líneas finas',
    fineLines: 'Líneas finas',
    linesPrintFail: 'Líneas por debajo de 0.5pt pueden fallar en impresión',
    registrationMarks: 'Marcas de registro',
    alignCmykPlates: 'Usadas para alinear placas CMYK en la prensa',
    textKnockout: 'Calado de texto',
    knockoutVsOverprint: 'Calado vs sobreimpreso',
    knockoutDesc: 'El color de fondo se "elimina" bajo el texto',
    overprintDesc: 'El texto se imprime sobre el color',
    smallBlackText: 'El texto negro pequeño debe ir en sobreimpresión para evitar problemas de registro',
    knockoutRemoves: 'El calado elimina color; la sobreimpresión lo superpone',
    colorBars: 'Barras de color',
    controlBars: 'Barras de control',
    densityRegistration: 'Barras usadas para verificar densidad y registro',
    technicalIntegrity: 'Integridad técnica',
    totalInkCoverage: 'Cobertura total de tinta (TIC / TAC)',
    ticTacDesc: 'La suma de los porcentajes de C, M, Y y K no debe superar los límites físicos del papel. El exceso de carga de tinta provoca repinte y tiempos de secado muy largos.',
    status: 'Estado',
    highRisk: 'Alto riesgo',
    idealDrying: 'Secado ideal',
    highCoverage: 'Cobertura alta',
    safeCoverage: 'Cobertura segura',
    knowledgeBase: 'Base de conocimiento',
    printColorEducation: 'Didáctica de impresión y color',
    subtractiveTheory: 'Teoría sustractiva',
    subtractiveDesc: 'A diferencia de las pantallas (RGB), que suman luz para crear blanco, la impresión CMYK es sustractiva: las tintas actúan como filtros que bloquean partes del espectro luminoso. Más tinta = más cerca del negro.',
    offsetVsDigital: 'Offset vs digital',
    offsetVsDigitalDesc: 'El offset usa placas metálicas y tintas líquidas pastosas; es ideal para grandes tiradas y tintas planas exactas. El digital usa tóner o inyección de tinta: más rápido para cantidades pequeñas, pero con una gama limitada.',
    dotGainTitle: 'Ganancia de Punto',
    dotGainDesc: 'La ganancia de punto ocurre cuando la gota de tinta se expande al tocar las fibras del papel. Papeles porosos (offset/periódico) sufren más ganancia, lo que puede oscurecer la imagen final si no se compensa.',
    spotRefColors: 'Tintas planas (colores de referencia)',
    spotRefDesc: 'Son colores premezclados por el fabricante. A diferencia de la cuatricromía (que usa 4 tintas), una tinta plana es un solo pigmento aplicado directamente, lo que garantiza fidelidad total en logotipos.',
    metamerism: 'Metamerismo',
    metamerismDesc: 'Es el fenómeno por el que dos colores parecen idénticos bajo una luz (ej: oficina) pero distintos bajo otra (ej: luz del sol). Comprueba siempre pruebas físicas en condiciones reales de uso.',
    varnishLamination: 'Barniz y laminación',
    varnishLaminationDesc: 'Los acabados protegen la tinta y alteran la percepción del color. La laminación mate tiende a aplanar el contraste, mientras el barniz brillante satura los colores y profundiza los negros.',
    coucheVsOffset: 'Estucado vs no estucado',
    coucheVsOffsetDesc: 'El papel estucado tiene una capa de recubrimiento que impide la absorción excesiva de tinta y mantiene los colores vibrantes. El papel no estucado es poroso: absorbe la tinta y da colores más suaves y naturales.',
    trapping: 'Trapping (superposición)',
    trappingDesc: 'Técnica de compensación de registro donde colores adyacentes se superponen ligeramente. Evita huecos blancos si hay un pequeño desalineamiento de las placas en la prensa.',
    gcrUcr: 'GCR y UCR',
    gcrUcrDesc: 'Técnicas de preimpresión que sustituyen partes de los colores CMY por el canal K (negro). Ahorra tinta cara, mejora el secado y garantiza mayor estabilidad de color en las sombras.',
    lineature: 'Lineatura (LPI)',
    lineatureDesc: 'Define la densidad de la trama. Revistas de lujo usan 175-200 LPI (puntos invisibles), mientras periódicos usan 85-100 LPI (puntos visibles a simple vista). Afecta directamente el detalle de la imagen.',
    colorGamut: 'Gama de color',
    colorGamutDesc: 'Es el alcance total de colores que un sistema puede reproducir. El RGB (pantallas) tiene una gama mucho mayor que el CMYK (impresión). Por eso los colores neón o los azules eléctricos muchas veces se apagan en el papel.',
    weightVsThickness: 'Gramaje vs espesor',
    weightVsThicknessDesc: 'Gramaje es el peso (g/m²). Espesor (micras) es el volumen. Papeles del mismo gramaje pueden tener espesores diferentes debido a la densidad de las fibras, afectando la "mano" del material impreso.',
    
    // PaletteBuilder extra
    batchPalette: 'Paleta del lote',
    colors: 'colores',
    hideBatch: 'Ocultar lote',
    showBatch: 'Mostrar lote',
    clickToUseAsBase: 'Haz clic en un color para usarlo como base de la paleta de contrastes',
    shades: 'Tonos oscuros',
    tints: 'Tonos claros',
    count: 'Cant',
    step: 'Paso',
    randomize: 'Aleatorio',
    
    // GeneratedPalettes extra
    processing: 'Procesando...',
    exact: 'Exacto',
    randomizeColors: 'Colores aleatorios',
    suggestHarmony: 'Sugerir armonía',
    uploadSvg: 'Cargar SVG',
    basePosition: 'Posición de base',
    none: 'Ninguno',
    above: 'Arriba',
    center: 'Centro',
    below: 'Abajo',
    contrast: 'Contraste',
    variations: 'Variaciones',

    // UI headings & helpers
    masterColorReference: 'Referencia de color maestro',
    digitalVsPrint: 'Simulación digital vs impresión',
    technicalBreakdown: 'Desglose técnico',
    cmykSeparationLogic: 'Lógica de separación CMYK',
    colorChannelsLabel: 'Canales de color',
    harmonyComplementary: 'Complementario',
    harmonyAnalogWarm: 'Análogo cálido',
    harmonyAnalogCool: 'Análogo frío',
    harmonyTriadic: 'Triádico',
    harmonySplitComplementary: 'Complementario dividido',
    harmonyTetradic: 'Tetrádico',
    overprintSimulationNote: 'Simula sobreimpresión con mix-blend-multiply',
    lightingD65: 'Luz de día D65',
    lightingTungsten: 'Tungsteno',
    lightingFluorescent: 'Fluorescente',
    reducedDensity: '-5% de densidad',
    knockoutLabel: 'Calado',
    overprintLabel: 'Sobreimpreso',
    textLabel: 'Texto',
    copiedToClipboard: '¡Copiado al portapapeles!',
    slotLabel: 'Slot',
    colorCardAria: 'tarjeta de color',
    baseBadge: 'Base',
    // Library Manager
    selectLibrary: 'Seleccionar biblioteca',
    standardLibrary: 'Sistema A (estándar)',
    uploadedLibraries: 'Mis bibliotecas cargadas',
    uploadAcb: 'Cargar .ACB',
    loading: 'Cargando...',
    noValidColors: 'No se encontraron colores válidos en el archivo.',
    parseFailed: 'Error al analizar el archivo .acb',
    cannotExportStandard: 'No se puede exportar la biblioteca estándar.',
    warning: 'Advertencia:',
    allBlackWarning: 'Todos los colores se leyeron como negro (#000000). El archivo puede ser incompatible. Elimina esta biblioteca e inténtalo de nuevo.',
    copyJsonCode: 'Copiar código JSON',
    deleteLibrary: 'Eliminar biblioteca',
    verifyColorsNote: 'Comprueba que los colores sean correctos (no todos negros) antes de exportar.',

    // GeneratedPalettes UI
    addColorPlaceholder: 'Añade un color (ej: #FF5500)',
    addColorButton: 'Añadir',
    preview1Title: 'Vista previa 1',
    preview1Subtitle: 'Hoja de colores',
    templateLabel: 'Plantilla',
    splitLabel: 'División',
    variationsLabel: 'Variaciones',
    baseColorPositionLabel: 'Color base',
    basePositionNone: 'Ninguno',
    basePositionAbove: 'Arriba',
    basePositionCenter: 'Centro',
    basePositionBelow: 'Abajo',
    showVariationCodesOn: 'Ocultar códigos de variaciones',
    showVariationCodesOff: 'Mostrar códigos de variaciones',
    showCodesOn: 'Ocultar códigos (vista 1)',
    showCodesOff: 'Mostrar códigos (vista 1)',
    
    // PaletteGenerator
    processingImage: 'Procesando...',
    uploadImageSvg: 'Imagen / SVG',
    
    // GeneratedPalettes - Previews extras
    preview2Title: 'Cuadrados de interacción Albers',
    preview2Subtitle: 'Estudio de contraste simultáneo inspirado en Josef Albers',
    preview3Title: 'Combinaciones personalizadas',
    preview3Subtitle: 'Arreglos geométricos con tu paleta',
    preview4Title: 'Pares de contraste',
    preview4Subtitle: 'Combinaciones accesibles de texto y fondo (WCAG)',
    
    // GeneratedPalettes - Albers controls
    shuffleAlbers: 'Mezclar',
    albersNote: 'Cada cuadrado muestra cómo el color interno parece cambiar en diferentes fondos',
    
    // GeneratedPalettes - Export
    exportColorSheet: 'Hoja de colores',
    exportToAco: 'Exportar ACO',
    exportToAse: 'Exportar ASE',
    exportToCsv: 'Exportar CSV',
    
    // GeneratedPalettes - Color management
    removeColorAria: 'Eliminar color',
    lockWeightAria: 'Bloquear peso',
    unlockWeightAria: 'Desbloquear peso',
    colorNameAria: 'Nombre del color',
    colorHexAria: 'Código hex del color',
    colorWeightAria: 'Porcentaje del peso del color',
    
    // GeneratedPalettes - Albers editing
    externalColorLabel: 'Ext',
    internalColorLabel: 'Int',
    resetCombo: 'Restablecer',
    availableCombinations: 'combinaciones disponibles',
    cardTemplateLabel: 'Plantilla de tarjeta',
    cardTemplateClassic: 'Clásico',
    cardTemplateCompact: 'Compacto',
    cardTemplateEditorial: 'Editorial',
    cardTemplateSwatch: 'Muestra',
    cardTemplateMinimal: 'Mínimo',
    cardTemplateMono: 'Mono',
    backgroundLabel: 'Fondo',
    cardsLabel: 'Tarjetas',
    
    // ColorSheetExport
    colorGuidePreview: 'Vista previa de guía de colores',
    printSavePdfHint: 'Usa la función "Imprimir" de tu navegador para guardar como PDF',
    closeButton: 'Cerrar',
    printSavePdf: 'Imprimir / guardar PDF',
    
    // GeneratedPalettes - Template options
    templateSquares: 'Cuadrados',
    templateCircles: 'Círculos',
    templateSunset: 'Atardecer',
    templateBars: 'Barras',
    backgroundBlack: 'Negro',
    backgroundWhite: 'Blanco',
    backgroundGray: 'Gris',

    // Palette Magic
    paletteMagic: 'Palette Magic',
    contextBrand: 'Identidad de marca',
    contextPoster: 'Cartel',
    contextUI: 'UI / layout',
    contextEditorial: 'Editorial',
    contextPackaging: 'Empaque',
    contrastScore: 'Contraste',
    harmonyScore: 'Armonía',
    paletteScore: 'Puntuación',
    trendPalettes: 'Paletas en tendencia',
    userPalettes: 'Tus paletas',
    expandPalette: 'Expandir',
    generateMagic: 'Generar',
    applyPalette: 'Aplicar',
    harmonyPalettes: 'Paletas de armonía',
    allContexts: 'Todos',
    wcagValidated: 'Validado WCAG',
    copyPalette: 'Copiar paleta',
    baseColors: 'Colores base',
    noBaseColors: 'Añade colores cargando un SVG o escribiendo un hex para generar paletas',
    slots: 'Slots',
    lockColor: 'Bloquear',
    unlockColor: 'Desbloquear',

    copyFailed: 'No se pudo copiar',
    downloaded: 'Archivo descargado',

    accessibility: 'Accesibilidad',
    onWhite: 'Sobre blanco',
    onBlack: 'Sobre negro',
    normalText: 'Texto normal',
    largeText: 'Texto grande',
    apcaLc: 'APCA Lc',
    bestTextColor: 'Mejor color de texto',
    customBackground: 'Fondo personalizado',
    suggestAccessibleColor: 'Sugerir color accesible',
    suggestion: 'Sugerencia',
    applySuggestion: 'Aplicar',
    alreadyAccessible: 'Ya cumple AA en este fondo',
    noAccessibleColor: 'No se encontró una variación accesible',

    tonalScale: 'Escala tonal',
    tonalScaleHint: 'Haz clic en una muestra para aplicarla',
    baseStep: 'Base',
    exportScale: 'Exportar escala',

    exportPaletteMenu: 'Exportar paleta',
    exportFormatCss: 'Variables CSS',
    exportFormatTailwind: 'Tailwind',
    exportFormatTailwind3: 'Configuración de Tailwind v3',
    exportFormatTailwind4: 'Tema Tailwind v4',
    exportFormatDtcg: 'Design tokens (JSON)',
    exportFormatAse: 'Muestras de Adobe (ASE)',
    exportFormatGpl: 'Paleta de GIMP (GPL)',

    colorVision: 'Visión del color',
    visionNormal: 'Normal',
    simulation: 'Simulación',

    // Shell & navigation
    sections: 'Secciones',
    referenceLibraries: 'Bibliotecas de referencia',
    referencePlaceholder: 'Referencia',

    // Shared actions & short labels
    apply: 'Aplicar',
    paste: 'Pegar',
    extract: 'Extraer',
    shuffle: 'Mezclar',
    totalLabel: 'Total',
    refShort: 'Ref',
    downloadAll: 'Todas',
    customSuffix: 'personalizada',

    // SVG import
    pasteSvgCode: 'Pegar código SVG',
    pasteSvgPlaceholder: 'Pega el código SVG…',
    noColorsFound: 'No se encontraron colores',

    // Generated palettes controls
    paletteExportLabel: 'Exportación de paleta',
    suggestCombination: 'Sugerir combinación',
    mustBe100: '(debe ser 100%)',
    dragToReorder: 'Arrastra para reordenar',
    hideVariations: 'Ocultar variaciones',
    showVariations: 'Mostrar variaciones',
    layersLabel: 'Capas',
    fullContrast: 'Contraste máximo',
    lockSlot: 'Bloquear slot',
    unlockSlot: 'Desbloquear slot',
    middleColorLabel: 'Medio',

    // Palette sheet templates
    templateStripes: 'Franjas',
    templateSwatches: 'Muestras',
    templateGradient: 'Degradado',
    templateMosaic: 'Mosaico',
    templateSplitScreen: 'Pantalla dividida',
    templateColumns: 'Columnas',
    templateDots: 'Puntos',
    templateEditorial: 'Editorial',

    // Albers templates
    templateRings: 'Anillos',
    templateDiamonds: 'Rombos',
    templateFrames: 'Marcos',
    templateSplit: 'División',
    templateTargets: 'Dianas',
    templateTriangles: 'Triángulos',

    // Palette Magic
    paletteMagicIntro: 'Paletas curadas con bloqueo y mezcla. Fija los colores que quieras conservar y regenera el resto.',
    sourceColors: 'Origen',
    clickASlot: 'Haz clic en un slot',
    deselect: 'Deseleccionar',
    selectToInject: 'Selecciona para insertar en un slot',
    extractFromImageTitle: 'Extraer paleta de la imagen (JPG/PNG/WEBP)',
    contextLabel: 'Contexto',
    colorInjectedLocked: 'Color insertado y bloqueado',
    contrastPairs: 'Pares de contraste',
    shuffleToGenerate: 'Mezcla para generar paletas.',

    // Palette builder backgrounds
    bgDarkest: 'Más oscuro',
    bgLightest: 'Más claro',

    // Color sheet export
    brandColorGuide: 'Guía de colores de marca',
    generatedByTool: 'Generado por UNBSCOLOR',
    professionalColorStandards: 'Estándares profesionales de color',

    // Generated palettes
    gpEyebrow: 'Constructor de paletas',
    gpInputLabel: 'Entrada',
    gpOutputLabel: 'Salida',
    gpLoadFile: 'Cargar SVG o imagen',
    gpLoadFailed: 'No se pudo leer este archivo',
    gpColorsCount: '{n} colores',
    gpSumWarning: 'Los pesos suman {n}%. Deben sumar 100%.',
    gpFixSum: 'Ajustar a 100%',
    gpDistribution: 'Distribución',
    gpPresetEqual: 'Igual',
    gpPresetGolden: 'Proporción áurea',
    gpPresetDescending: 'Decreciente',
    gpPresetSource: 'De la imagen',
    gpPresetSourceHint: 'Carga un SVG o una imagen para usar sus proporciones',
    gpSortBy: 'Ordenar por',
    gpSortWeight: 'Peso',
    gpSortLightness: 'Luminosidad',
    gpSortHue: 'Matiz',
    gpExpandCodes: 'Mostrar códigos de este color',
    gpCollapseCodes: 'Ocultar códigos de este color',
    gpNoCodes: 'Ningún código elegido en la configuración',
    gpReorderAria: 'Reordenar: arrastra o usa las flechas',
    gpHarmonyTitle: 'Colores a partir de la base',
    gpHarmonyHint: 'Elige un color de la paleta y una relación, luego añade el resultado.',
    gpBase: 'Base',
    gpHarmonyComplementary: 'Complementario',
    gpHarmonyAnalogous: 'Análogos',
    gpHarmonyTriad: 'Tríada',
    gpHarmonyMonochromatic: 'Monocromático',
    gpAddToPalette: 'Añadir a la paleta',
    gpAddAll: 'Añadir todos',
    gpAddHexAria: 'Añadir {hex} a la paleta',
    gpInPalette: 'Ya está en la paleta',
    gpNeutralBase: 'Esta base es neutra, así que las relaciones de matiz la repiten. Prueba monocromático.',
    gpViewLabel: 'Vista',
    gpViewSheet: 'Hoja',
    gpViewStrip: 'Tira',
    gpViewGrid: 'Cuadrícula',
    gpViewBars: 'Barras',
    gpViewRing: 'Anillo',
    gpMoreLayouts: 'Más modelos',
    gpChoose: 'Elegir…',
    gpTemplateMainVariations: 'Principales y tonos',
    gpShowLabel: 'Mostrar',
    gpShowName: 'Nombre',
    gpShowHex: 'Hex',
    gpShowPercent: 'Porcentaje',
    gpShowCodes: 'Códigos',
    gpVariationsToggle: 'Tonos claros y oscuros',
    gpVariationCodes: 'Códigos de los tonos',
    gpTonesPerSide: 'Tonos por lado',
    gpDownloadSvg: 'Descargar SVG',
    gpDownloadPng: 'Descargar PNG',
    gpSheetHint: 'El tamaño de cada bloque sigue el peso del color.',
    gpCombosHint: 'Haz clic en un cuadrado para editar sus colores; arrástralo para reordenar.',
    gpWeightInPalette: 'Peso de cada color en la paleta',
    gpContrastHint: 'Pares de tu paleta con al menos 3:1.',
    gpNoPairs: 'Ningún par llega a 3:1 todavía.',

    // Matcher: reference reading and discoveries
    referenceCode: 'Referencia',
    bestMatch: 'Mejor coincidencia',
    matchQuality: 'Qué tan cerca está',
    finishLabel: 'Acabado',
    finishAll: 'Todos los acabados',
    finishCoated: 'Estucado',
    finishUncoated: 'No estucado',
    finishProcessCoated: 'Simulación en cuatricromía, estucado',
    finishProcessUncoated: 'Simulación en cuatricromía, no estucado',
    copyCode: 'Copiar código',
    compareInputReference: 'Tu color frente a la referencia',
    deltaImperceptible: 'Diferencia imperceptible',
    deltaSubtle: 'Sutil, solo lado a lado',
    deltaClose: 'Cercana, segura en imprenta',
    deltaVisible: 'Diferencia visible',
    deltaDifferent: 'Otro color',
    rankedAlternatives: 'Alternativas por cercanía',
    alternativesHint: 'Una fila por referencia, con cada acabado y su distancia.',
    noReferenceFound: 'Ninguna referencia al alcance con estos acabados.',
    variantsLabel: 'Acabados',
    spotInkTip: 'Aquí una tinta especial llega más cerca que la cuatricromía.',
    discoveries: 'Descubrimientos',
    discoveriesHint: 'Lo que la búsqueda encontró alrededor de este color.',
    whatThisColorIs: 'Qué es este color',
    familyLabel: 'Familia',
    temperatureLabel: 'Temperatura',
    neighboursTitle: 'Vecinas en la biblioteca',
    neighboursHint: 'El mismo color, un paso hacia cada lado.',
    neighbourLighter: 'Más clara',
    neighbourDarker: 'Más oscura',
    neighbourWarmer: 'Más cálida',
    neighbourCooler: 'Más fría',
    otherFinishesTitle: 'La misma referencia en otros acabados',
    otherFinishesHint: 'El papel cambia la tinta: mismo código, otro color.',
    harmonyTitle: 'Compañeras armónicas',
    harmonyHint: 'Cada compañera llega con su referencia más cercana.',
    harmonyComplement: 'Complementario',
    harmonyAnalogousA: 'Análogo −30°',
    harmonyAnalogousB: 'Análogo +30°',
    harmonyTriadicA: 'Tríada +120°',
    harmonyTriadicB: 'Tríada +240°',
    pressTitle: 'En imprenta',
    pressWithinProcess: 'La cuatricromía alcanza este color.',
    pressBeyondProcess: 'Más allá del alcance de la cuatricromía.',
    pressHeavyInk: 'Tinta total sobre 300%: consulta a la imprenta.',
    pressInkOk: 'Tinta total dentro del límite habitual.',
    pressEstimate: 'Estimación para papel estucado.',
    chromaOverflowLabel: 'Croma fuera de alcance',
    usageTitle: 'Notas de esta referencia',
    familyRed: 'Rojo',
    familyOrange: 'Naranja',
    familyYellow: 'Amarillo',
    familyLime: 'Verde amarillento',
    familyGreen: 'Verde',
    familyTeal: 'Verde azulado',
    familyCyan: 'Cian',
    familyBlue: 'Azul',
    familyIndigo: 'Índigo',
    familyViolet: 'Violeta',
    familyMagenta: 'Magenta',
    familyPink: 'Rosa',
    familyNeutral: 'Neutra',
    tempWarm: 'Cálido',
    tempCool: 'Frío',
    tempTemperate: 'Neutro',
    satGray: 'Grisácea',
    satMuted: 'Apagada',
    satBalanced: 'Equilibrada',
    satVivid: 'Vívida',
    lightVeryDark: 'Muy oscura',
    lightDark: 'Oscura',
    lightMedium: 'Media',
    lightLight: 'Clara',
    lightVeryLight: 'Muy clara',
    nameModLighter: 'claro',
    nameModDarker: 'oscuro',
    nameModWarmer: 'cálido',
    nameModCooler: 'frío',
    nameModVivid: 'vivo',
    nameModMuted: 'apagado',
  },
};

export const getTranslation = (lang: Language): Translations => {
  return translations[lang] || translations.en;
};
