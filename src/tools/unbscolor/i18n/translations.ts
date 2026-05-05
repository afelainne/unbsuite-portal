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
  
  // Nearby Pantones
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
    contrastPalette: 'Contrasts & Palette',
    generatedPalettes: 'Generated Palettes',
    printGuide: 'Print Guide',
    
    // Settings Panel
    visibleColorModels: 'Visible Color Models',
    hexadecimal: 'Hexadecimal',
    rgbStandard: 'RGB (Standard)',
    hslWeb: 'HSL (Web)',
    hsbHsv: 'HSB / HSV',
    cieLabHighPrec: 'CIE Lab (High Prec)',
    cmykProcess: 'CMYK (Process)',
    refBridgeC: 'System A (CP)',
    refBridgeU: 'System A (UP)',
    refSolidC: 'System B (C)',
    refSolidU: 'System B (U)',
    mixedFormatSyntax: 'Mixed Format Syntax',
    changesAppliedRealtime: 'Changes are applied in real-time to active sessions.',
    
    // Color Input
    color: 'Color',
    inputColor: 'Input color',
    
    // Match Section
    matchCie2000: 'Match (CIE2000)',
    input: 'Input',
    deltaE00: 'Delta E 00',
    outOfGamut: 'OUT OF GAMUT',
    actions: 'Actions',
    randomizeColor: 'Randomize Color',
    analyzeWithAi: 'Search Reference',
    thinking: 'Searching...',
    aiResult: 'Search Result',
    mood: 'Mood',
    
    // Batch Mode
    batchOn: 'Batch ON',
    batchOff: 'Batch OFF',
    multiSlotMatchAnalysis: 'Multi-Slot Match Analysis',
    copyAllSlotsData: 'Copy All Slots Data',
    nearbyAlternatives: 'Nearby Alternatives',
    selectSlotColor: 'Select slot color',
    downloadSlot: 'Download slot',
    
    // Nearby Pantones
    nearbyRefs: 'Nearby Matches (ΔE 00)',
    
    // InfoGrid
    red: 'Red',
    green: 'Green',
    blue: 'Blue',
    cyan: 'Cyan',
    magenta: 'Magenta',
    yellow: 'Yellow',
    keyBlack: 'Key (Black)',
    hue: 'Hue',
    saturation: 'Saturation',
    lightness: 'Lightness',
    aiAnalysis: 'Color Analysis',
    
    // PaletteBuilder
    shadeCount: 'Shade Count',
    tintCount: 'Tint Count',
    darkenIntensity: 'Darken Intensity',
    lightenIntensity: 'Lighten Intensity',
    hueRotateShade: 'Hue Rotate (Shade)',
    hueRotateTint: 'Hue Rotate (Tint)',
    saturationShade: 'Saturation (Shade)',
    saturationTint: 'Saturation (Tint)',
    useRefMatch: 'Use Reference Match',
    showBatchPalettes: 'Show Batch Palettes',
    selectBatchColor: 'Select batch color',
    baseColor: 'Base Color',
    exportPalette: 'Export Palette',
    paletteContrast: 'Palette Contrast',
    accessiblePairs: 'Accessible Pairs',
    
    // ColorGuide
    cmykMixer: 'CMYK Mixer',
    totalInk: 'Total Ink',
    manualCmykPreview: 'Manual CMYK Preview',
    contrastChecker: 'Contrast Checker',
    foreground: 'Foreground',
    background: 'Background',
    contrastRatio: 'Contrast Ratio',
    wcagAA: 'WCAG AA',
    wcagAAA: 'WCAG AAA',
    pass: 'PASS',
    fail: 'FAIL',
    accessibleSuggestions: 'Accessible Suggestions',
    darkSuggestions: 'Dark Suggestions',
    lightSuggestions: 'Light Suggestions',
    monochromaticVariations: 'Monochromatic Variations',
    hueVariation: 'Hue Variation',
    substrateSimulation: 'Substrate Simulation',
    coated: 'Coated',
    uncoated: 'Uncoated',
    dotGain10: 'Dot Gain 10%',
    dotGain20: 'Dot Gain 20%',
    recycledPaper: 'Recycled Paper',
    lowDensity: 'Low Density',
    colorBlindnessSimulation: 'Color Blindness Simulation',
    protanopia: 'Protanopia',
    deuteranopia: 'Deuteranopia',
    tritanopia: 'Tritanopia',
    achromatopsia: 'Achromatopsia',
    separationGuide: 'Separation Guide',
    spotColor: 'Spot Color',
    processColor: 'Process Color',
    refGuide: 'Reference Guide',
    useSpotWhen: 'Use spot colors when brand consistency is critical',
    useProcessWhen: 'Use process colors for complex images and gradients',
    accessibleVariations: 'Accessible Variations',
    totalVariations: 'Total Variations',
    
    // GeneratedPalettes
    paletteColors: 'Palette Colors',
    addColor: 'Add Color',
    showCodes: 'Show Codes',
    hideCodes: 'Hide Codes',
    previewStyles: 'Preview Styles',
    classic: 'Classic',
    vertical: 'Vertical',
    grid: 'Grid',
    cards: 'Cards',
    downloadPalette: 'Download Palette',
    exportAco: 'Export ACO',
    exportAse: 'Export ASE',
    exportCsv: 'Export CSV',
    customCombinations: 'Custom Combinations',
    squares: 'Squares',
    circles: 'Circles',
    sunset: 'Sunset',
    bars: 'Bars',
    backgroundStyle: 'Background Style',
    blackBg: 'Black',
    whiteBg: 'White',
    grayBg: 'Gray',
    shuffleCombinations: 'Shuffle Combinations',
    colorDetails: 'Color Details',
    locked: 'Locked',
    unlocked: 'Unlocked',
    
    // PaletteGenerator
    extractFromImage: 'Extract from Image',
    extracting: 'Extracting...',
    dragDropImage: 'Drag & drop an image or click to upload',
    
    // Similarity Grid
    similarityTitle: 'Similarity Grid',
    
    // Footer
    poweredBy: 'Powered by UNBSERVED',
    
    // Language names
    english: 'English',
    portuguese: 'Português',
    spanish: 'Español',
    
    // ColorGuide extra
    spotColor2: 'SPOT COLOR',
    clickToEdit: 'Click to edit color',
    paletteColorsLabel: 'PALETTE COLORS',
    active: 'active',
    substrates: 'SUBSTRATES',
    simulatedPaperDotGain: 'Simulated Paper & Dot Gain',
    original: 'ORIGINAL',
    digitalD65: 'DIGITAL D65',
    coatedPaper: 'COATED / 150G',
    uncoatedPaper: 'UNCOATED PAPER',
    mediumGain: 'MEDIUM GAIN',
    heavyGain: 'HEAVY GAIN',
    grayBase: 'GRAY BASE',
    legibilityStandards: 'LEGIBILITY STANDARDS',
    contrastAnalysis: 'Contrast Analysis',
    preview: 'PREVIEW',
    legibleText: 'Legible text on background',
    neutralMatchMatrix: 'NEUTRAL MATCH MATRIX',
    varyTones: 'Vary Tones',
    darkUi: 'DARK UI',
    surface: 'SURFACE',
    paletteContrastTest: 'PALETTE CONTRAST',
    testsBetweenColors: 'Tests Between Palette Colors',
    textOnBackground: 'Text on background',
    productionCheck: 'PRODUCTION CHECK',
    trappingRegistration: 'Trapping & Registration',
    trapTest: 'TRAP TEST',
    resolution: 'RESOLUTION',
    lpiHalftone: 'LPI Halftone Screen',
    gamut: 'GAMUT',
    colorSpaceGamut: 'Color Space Gamut',
    printSimulationTests: 'PRINT SIMULATION TESTS',
    visualPrintTests: 'Visual Print Tests',
    bleedTest: 'BLEED TEST',
    bleedArea: 'Bleed Area',
    safeArea: 'Safe Area',
    bleed3mm: 'Bleed 3mm',
    cutLine: 'Cut',
    overprintTest: 'OVERPRINT TEST',
    colorOverlay: 'Color Overlay',
    gradientTest: 'GRADIENT TEST',
    bandingCheck: 'Banding Check',
    observeBanding: 'Check for visible "bands" in gradient',
    minimumText: 'MINIMUM TEXT',
    textLegibility: 'Text Legibility',
    bodyText: 'Body text 14pt',
    footnotes: 'Footnotes 10pt',
    minimumReadLimit: 'Minimum read limit 7pt',
    microPrint: 'Micro print / legal notices 5pt',
    highResRequired: 'Below 6pt requires high resolution',
    adjacencyTest: 'ADJACENCY TEST',
    neighboringColors: 'Neighboring Colors',
    colorBehavior: 'How color behaves next to others',
    reversalTest: 'REVERSAL TEST',
    positiveNegative: 'Positive / Negative',
    positive: 'POSITIVE',
    negative: 'NEGATIVE',
    knockoutApplication: 'Knockout and inverted application test',
    screenAngles: 'SCREEN ANGLES',
    cmykPlateAngles: 'CMYK Plate Angles',
    standardAngles: 'Standard angles avoid moiré',
    metamerismTest: 'METAMERISM TEST',
    lightingSimulation: 'Lighting Simulation',
    colorsChangeLight: 'Colors change under different lights',
    blackTest: 'BLACK TEST',
    richBlackVsPure: 'Rich Black vs Pure Black',
    pureBlack: 'Pure Black',
    richBlack: 'Rich Black',
    comparisonOnColor: 'Comparison on your color',
    richBlackDense: 'Rich Black is denser but dries slowly',
    tintRamp: 'TINT RAMP',
    densityScale: 'Density Scale',
    tintUniformity: 'Check if tint gradient maintains uniformity',
    hairlineTest: 'HAIRLINE TEST',
    fineLines: 'Fine Lines',
    linesPrintFail: 'Lines below 0.5pt may fail in print',
    registrationMarks: 'REGISTRATION MARKS',
    alignCmykPlates: 'Used to align CMYK plates on press',
    textKnockout: 'TEXT KNOCKOUT',
    knockoutVsOverprint: 'Knockout vs Overprint',
    knockoutDesc: 'Background color is "removed" under text',
    overprintDesc: 'Text is printed over color',
    smallBlackText: 'Small black text should use Overprint to avoid registration issues',
    knockoutRemoves: 'Knockout removes color; Overprint overlays',
    colorBars: 'COLOR BARS',
    controlBars: 'Control Bars',
    densityRegistration: 'Bars used to verify density and registration',
    technicalIntegrity: 'TECHNICAL INTEGRITY',
    totalInkCoverage: 'Total Ink Coverage (TIC / TAC)',
    ticTacDesc: 'The sum of C, M, Y and K percentages should not exceed physical paper limits. Excess ink load results in offsetting and long drying times.',
    status: 'STATUS',
    highRisk: 'HIGH RISK',
    idealDrying: 'IDEAL DRYING',
    highCoverage: 'HIGH COVERAGE',
    safeCoverage: 'SAFE COVERAGE',
    knowledgeBase: 'KNOWLEDGE BASE',
    printColorEducation: 'Print & Color Education',
    subtractiveTheory: 'Subtractive Theory',
    subtractiveDesc: 'Unlike screens (RGB), which add light to create white, CMYK printing is subtractive: inks act as filters blocking parts of the light spectrum. More ink = closer to black.',
    offsetVsDigital: 'Offset vs Digital',
    offsetVsDigitalDesc: 'Offset uses metal plates and thick liquid inks, ideal for large runs and exact spot inks. Digital uses toner or inkjet, faster for small quantities but with limited gamut.',
    dotGainTitle: 'Dot Gain',
    dotGainDesc: 'Dot Gain occurs when ink drop expands hitting paper fibers. Porous papers (Offset/Newsprint) suffer more dot gain, which can darken the final image if not compensated.',
    spotRefColors: 'Spot (Reference Colors)',
    spotRefDesc: 'Pre-mixed colors by manufacturer. Unlike CMYK (which tries to match colors with 4 inks), a spot ink is a single pigment applied directly, guaranteeing logo fidelity.',
    metamerism: 'Metamerism',
    metamerismDesc: 'Phenomenon where two colors appear identical under one light (e.g., office) but different under another (e.g., sunlight). Always check physical proofs under real conditions.',
    varnishLamination: 'Varnish & Lamination',
    varnishLaminationDesc: 'Finishes protect ink and alter color perception. Matte lamination tends to "flatten" contrast, while gloss varnish saturates colors and deepens blacks.',
    coucheVsOffset: 'Coated vs Uncoated',
    coucheVsOffsetDesc: 'Coated paper has a coating layer preventing excessive ink absorption, keeping colors vibrant. Uncoated is porous, absorbing ink resulting in softer, natural colors.',
    trapping: 'Trapping (Overlap)',
    trappingDesc: 'Registration compensation technique where adjacent colors slightly overlap. Prevents "white gaps" if there is slight plate misalignment on press.',
    gcrUcr: 'GCR and UCR',
    gcrUcrDesc: 'Pre-press techniques replacing parts of CMY colors with K (Black) channel. Saves expensive ink, improves drying, and ensures greater shadow color stability.',
    lineature: 'Lineature (LPI)',
    lineatureDesc: 'Defines screen density. Luxury magazines use 175-200 LPI (invisible dots), while newspapers use 85-100 LPI (dots visible to naked eye). Directly affects image detail.',
    colorGamut: 'Color Gamut',
    colorGamutDesc: 'Total range of colors a system can reproduce. RGB (screens) has much larger gamut than CMYK (print). Neon or electric blue colors often "fade" on paper.',
    weightVsThickness: 'Weight vs Thickness',
    weightVsThicknessDesc: 'Weight is mass (g/m²). Thickness (Microns) is volume. Same weight papers can have different thicknesses due to fiber density, affecting printed material "feel".',
    
    // PaletteBuilder extra
    batchPalette: 'Batch Palette',
    colors: 'colors',
    hideBatch: 'Hide Batch',
    showBatch: 'Show Batch',
    clickToUseAsBase: 'Click a color to use as contrast palette base',
    shades: 'Shades',
    tints: 'Tints',
    count: 'Count',
    step: 'Step',
    randomize: 'Randomize',
    
    // GeneratedPalettes extra
    processing: 'Processing...',
    exact: 'EXACT',
    randomizeColors: 'Randomize Colors',
    suggestHarmony: 'Suggest Harmony',
    uploadSvg: 'Upload SVG',
    basePosition: 'Base Position',
    none: 'None',
    above: 'Above',
    center: 'Center',
    below: 'Below',
    contrast: 'Contrast',
    variations: 'Variations',

    // UI headings & helpers
    masterColorReference: 'Master Color Reference',
    digitalVsPrint: 'Digital vs Print Simulation',
    technicalBreakdown: 'Technical Breakdown',
    cmykSeparationLogic: 'CMYK Separation Logic',
    colorChannelsLabel: 'Color Channels',
    harmonyComplementary: 'Complementary',
    harmonyAnalogWarm: 'Analogous (Warm)',
    harmonyAnalogCool: 'Analogous (Cool)',
    harmonyTriadic: 'Triadic',
    harmonySplitComplementary: 'Split Complementary',
    harmonyTetradic: 'Tetradic',
    overprintSimulationNote: 'Simulates overprint using mix-blend-multiply',
    lightingD65: 'D65 Daylight',
    lightingTungsten: 'Tungsten',
    lightingFluorescent: 'Fluorescent',
    reducedDensity: '-5% Density',
    knockoutLabel: 'Knockout',
    overprintLabel: 'Overprint',
    textLabel: 'Text',
    copiedToClipboard: 'Copied to clipboard!',
    slotLabel: 'Slot',
    colorCardAria: 'color card',
    baseBadge: 'BASE',
    // Library Manager
    selectLibrary: 'Select Library',
    standardLibrary: 'System A (Standard)',
    uploadedLibraries: 'My Uploaded Libraries',
    uploadAcb: 'Upload .ACB',
    loading: 'Loading...',
    noValidColors: 'No valid colors found in file.',
    parseFailed: 'Failed to parse .acb file',
    cannotExportStandard: 'Cannot export Standard Library code.',
    warning: 'WARNING:',
    allBlackWarning: 'All colors parsed as Black (#000000). The file format might be incompatible. Please remove this library and try again.',
    copyJsonCode: 'Copy JSON Code',
    deleteLibrary: 'Delete Library',
    verifyColorsNote: 'Please verify colors are correct (not all black) before exporting.',

    // GeneratedPalettes UI
    addColorPlaceholder: 'Add color (e.g., #FF5500)',
    addColorButton: '+ Add',
    preview1Title: 'PREVIEW 1',
    preview1Subtitle: 'Color Sheet',
    templateLabel: 'Template',
    splitLabel: 'Split',
    variationsLabel: 'Variations',
    baseColorPositionLabel: 'Base Color',
    basePositionNone: 'None',
    basePositionAbove: 'Above',
    basePositionCenter: 'Center',
    basePositionBelow: 'Below',
    showVariationCodesOn: 'Hide variation codes',
    showVariationCodesOff: 'Show variation codes',
    showCodesOn: 'Hide codes (View 1)',
    showCodesOff: 'Show codes (View 1)',
    
    // PaletteGenerator
    processingImage: 'Processing...',
    uploadImageSvg: 'IMAGE / SVG',
    
    // GeneratedPalettes - Previews extras
    preview2Title: '2. Albers Interaction Squares',
    preview2Subtitle: 'Simultaneous contrast study inspired by Josef Albers',
    preview3Title: '3. Custom Combinations',
    preview3Subtitle: 'Geometric arrangements with your palette',
    preview4Title: '4. Contrast Pairs',
    preview4Subtitle: 'Text & background accessible combinations (WCAG)',
    
    // GeneratedPalettes - Albers controls
    shuffleAlbers: 'Shuffle',
    albersNote: 'Each square shows how the inner color appears to change on different backgrounds',
    
    // GeneratedPalettes - Export
    exportColorSheet: 'Color Sheet',
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
    cardsLabel: 'Tarjetas',
    
    // ColorSheetExport
    colorGuidePreview: 'Color Guide Preview',
    printSavePdfHint: 'Use your browser\'s "Print" function to Save as PDF',
    closeButton: 'CLOSE',
    printSavePdf: 'PRINT / SAVE PDF',
    
    // GeneratedPalettes - Template options
    templateSquares: 'Squares',
    templateCircles: 'Circles',
    templateSunset: 'Atardecer',
    templateBars: 'Bars',
    cardTemplateLabel: 'Card Template',
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
    contextBrand: 'Brand Identity',
    contextPoster: 'Poster',
    contextUI: 'UI / Layout',
    contextEditorial: 'Editorial',
    contextPackaging: 'Packaging',
    contrastScore: 'Contrast',
    harmonyScore: 'Harmony',
    paletteScore: 'Score',
    trendPalettes: 'Trend Palettes',
    userPalettes: 'Your Palettes',
    expandPalette: 'Expand',
    generateMagic: 'Generate',
    applyPalette: 'Apply',
    harmonyPalettes: 'Harmony Palettes',
    allContexts: 'All',
    wcagValidated: 'WCAG Validated',
    copyPalette: 'Copy Palette',
    baseColors: 'Base Colors',
    noBaseColors: 'Add colors via SVG upload or hex input to generate palettes',
    slots: 'Slots',
    lockColor: 'Lock',
    unlockColor: 'Unlock',
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
    contrastPalette: 'Contrastes & Paleta',
    generatedPalettes: 'Paletas Geradas',
    printGuide: 'Guia de Impressão',
    
    // Settings Panel
    visibleColorModels: 'Modelos de Cor Visíveis',
    hexadecimal: 'Hexadecimal',
    rgbStandard: 'RGB (Padrão)',
    hslWeb: 'HSL (Web)',
    hsbHsv: 'HSB / HSV',
    cieLabHighPrec: 'CIE Lab (Alta Prec)',
    cmykProcess: 'CMYK (Processo)',
    refBridgeC: 'Sistema A (CP)',
    refBridgeU: 'Sistema A (UP)',
    refSolidC: 'Sistema B (C)',
    refSolidU: 'Sistema B (U)',
    mixedFormatSyntax: 'Sintaxe de Formato Misto',
    changesAppliedRealtime: 'As alterações são aplicadas em tempo real nas sessões ativas.',
    
    // Color Input
    color: 'Cor',
    inputColor: 'Cor de entrada',
    
    // Match Section
    matchCie2000: 'Match (CIE2000)',
    input: 'Entrada',
    deltaE00: 'Delta E 00',
    outOfGamut: 'FORA DO GAMUT',
    actions: 'Ações',
    randomizeColor: 'Cor Aleatória',
    analyzeWithAi: 'Buscar Referência',
    thinking: 'Buscando...',
    aiResult: 'Resultado da busca',
    mood: 'Humor',
    
    // Batch Mode
    batchOn: 'Lote ATIVO',
    batchOff: 'Lote INATIVO',
    multiSlotMatchAnalysis: 'Análise de Match Multi-Slot',
    copyAllSlotsData: 'Copiar Dados de Todos os Slots',
    nearbyAlternatives: 'Alternativas Próximas',
    selectSlotColor: 'Selecionar cor do slot',
    downloadSlot: 'Baixar slot',
    
    // Nearby Pantones
    nearbyRefs: 'Referências Próximas (ΔE 00)',
    
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
    shadeCount: 'Quantidade de Tons Escuros',
    tintCount: 'Quantidade de Tons Claros',
    darkenIntensity: 'Intensidade de Escurecimento',
    lightenIntensity: 'Intensidade de Clareamento',
    hueRotateShade: 'Rotação de Matiz (Escuro)',
    hueRotateTint: 'Rotação de Matiz (Claro)',
    saturationShade: 'Saturação (Escuro)',
    saturationTint: 'Saturação (Claro)',
    useRefMatch: 'Usar Match de Referência',
    showBatchPalettes: 'Mostrar Paletas em Lote',
    selectBatchColor: 'Selecionar cor do lote',
    baseColor: 'Cor Base',
    exportPalette: 'Exportar Paleta',
    paletteContrast: 'Contraste da Paleta',
    accessiblePairs: 'Pares Acessíveis',
    
    // ColorGuide
    cmykMixer: 'Mixer CMYK',
    totalInk: 'Total de Tinta',
    manualCmykPreview: 'Preview CMYK Manual',
    contrastChecker: 'Verificador de Contraste',
    foreground: 'Primeiro Plano',
    background: 'Fundo',
    contrastRatio: 'Taxa de Contraste',
    wcagAA: 'WCAG AA',
    wcagAAA: 'WCAG AAA',
    pass: 'PASSA',
    fail: 'FALHA',
    accessibleSuggestions: 'Sugestões Acessíveis',
    darkSuggestions: 'Sugestões Escuras',
    lightSuggestions: 'Sugestões Claras',
    monochromaticVariations: 'Variações Monocromáticas',
    hueVariation: 'Variação de Matiz',
    substrateSimulation: 'Simulação de Substrato',
    coated: 'Couché',
    uncoated: 'Offset',
    dotGain10: 'Ganho de Ponto 10%',
    dotGain20: 'Ganho de Ponto 20%',
    recycledPaper: 'Papel Reciclado',
    lowDensity: 'Baixa Densidade',
    colorBlindnessSimulation: 'Simulação de Daltonismo',
    protanopia: 'Protanopia',
    deuteranopia: 'Deuteranopia',
    tritanopia: 'Tritanopia',
    achromatopsia: 'Acromatopsia',
    separationGuide: 'Guia de Separação',
    spotColor: 'Cor Spot',
    processColor: 'Cor Processo',
    refGuide: 'Guia de Referência',
    useSpotWhen: 'Use cores spot quando a consistência da marca é crítica',
    useProcessWhen: 'Use cores processo para imagens complexas e gradientes',
    accessibleVariations: 'Variações Acessíveis',
    totalVariations: 'Total de Variações',
    
    // GeneratedPalettes
    paletteColors: 'Cores da Paleta',
    addColor: 'Adicionar Cor',
    showCodes: 'Mostrar Códigos',
    hideCodes: 'Ocultar Códigos',
    previewStyles: 'Estilos de Preview',
    classic: 'Clássico',
    vertical: 'Vertical',
    grid: 'Grade',
    cards: 'Cartões',
    downloadPalette: 'Baixar Paleta',
    exportAco: 'Exportar ACO',
    exportAse: 'Exportar ASE',
    exportCsv: 'Exportar CSV',
    customCombinations: 'Combinações Customizadas',
    squares: 'Quadrados',
    circles: 'Círculos',
    sunset: 'Por do Sol',
    bars: 'Barras',
    backgroundStyle: 'Estilo de Fundo',
    blackBg: 'Preto',
    whiteBg: 'Branco',
    grayBg: 'Cinza',
    shuffleCombinations: 'Embaralhar Combinações',
    colorDetails: 'Detalhes da Cor',
    locked: 'Travado',
    unlocked: 'Destravado',
    
    // PaletteGenerator
    extractFromImage: 'Extrair de Imagem',
    extracting: 'Extraindo...',
    dragDropImage: 'Arraste e solte uma imagem ou clique para enviar',
    
    // Similarity Grid
    similarityTitle: 'Grade de Similaridade',
    
    // Footer
    poweredBy: 'Desenvolvido por UNBSERVED',
    
    // Language names
    english: 'English',
    portuguese: 'Português',
    spanish: 'Español',
    
    // ColorGuide extra
    spotColor2: 'COR SPOT',
    clickToEdit: 'Clique para editar a cor',
    paletteColorsLabel: 'CORES DA PALETA',
    active: 'ativa',
    substrates: 'SUBSTRATOS',
    simulatedPaperDotGain: 'Simulação de Papel e Ganho de Ponto',
    original: 'ORIGINAL',
    digitalD65: 'DIGITAL D65',
    coatedPaper: 'COUCHÉ / 150G',
    uncoatedPaper: 'PAPEL OFFSET',
    mediumGain: 'GANHO MÉDIO',
    heavyGain: 'GANHO ALTO',
    grayBase: 'BASE CINZA',
    legibilityStandards: 'PADRÕES DE LEGIBILIDADE',
    contrastAnalysis: 'Análise de Contraste',
    preview: 'PREVIEW',
    legibleText: 'Texto legível sobre fundo',
    neutralMatchMatrix: 'MATRIZ DE MATCH NEUTRO',
    varyTones: 'Variar Tons',
    darkUi: 'UI ESCURA',
    surface: 'SUPERFÍCIE',
    paletteContrastTest: 'CONTRASTE DA PALETA',
    testsBetweenColors: 'Testes Entre Cores da Paleta',
    textOnBackground: 'Texto sobre fundo',
    productionCheck: 'VERIFICAÇÃO DE PRODUÇÃO',
    trappingRegistration: 'Trapping e Registro',
    trapTest: 'TESTE DE TRAP',
    resolution: 'RESOLUÇÃO',
    lpiHalftone: 'Retícula LPI',
    gamut: 'GAMUT',
    colorSpaceGamut: 'Gamut de Espaço de Cor',
    printSimulationTests: 'TESTES DE SIMULAÇÃO DE IMPRESSÃO',
    visualPrintTests: 'Testes Visuais de Impressão',
    bleedTest: 'TESTE DE SANGRIA',
    bleedArea: 'Área de Sangria',
    safeArea: 'Área Segura',
    bleed3mm: 'Sangria 3mm',
    cutLine: 'Corte',
    overprintTest: 'TESTE DE OVERPRINT',
    colorOverlay: 'Sobreposição de Cores',
    gradientTest: 'TESTE DE GRADIENTE',
    bandingCheck: 'Verificação de Banding',
    observeBanding: 'Observe se há "faixas" visíveis no degradê',
    minimumText: 'TEXTO MÍNIMO',
    textLegibility: 'Legibilidade de Texto',
    bodyText: 'Texto 14pt - Corpo normal',
    footnotes: 'Texto 10pt - Notas de rodapé',
    minimumReadLimit: 'Texto 7pt - Limite mínimo para leitura',
    microPrint: 'Texto 5pt - Micro impressão / avisos legais',
    highResRequired: 'Abaixo de 6pt requer alta resolução',
    adjacencyTest: 'TESTE DE ADJACÊNCIA',
    neighboringColors: 'Cores Vizinhas',
    colorBehavior: 'Como a cor se comporta ao lado de outras',
    reversalTest: 'TESTE DE INVERSÃO',
    positiveNegative: 'Positivo / Negativo',
    positive: 'POSITIVO',
    negative: 'NEGATIVO',
    knockoutApplication: 'Teste de vazado e aplicação invertida',
    screenAngles: 'ÂNGULOS DE RETÍCULA',
    cmykPlateAngles: 'Ângulos de Chapas CMYK',
    standardAngles: 'Ângulos padrão evitam moiré',
    metamerismTest: 'TESTE DE METAMERISMO',
    lightingSimulation: 'Simulação de Iluminação',
    colorsChangeLight: 'Cores mudam sob diferentes luzes',
    blackTest: 'TESTE DE PRETO',
    richBlackVsPure: 'Rich Black vs Pure Black',
    pureBlack: 'Pure Black',
    richBlack: 'Rich Black',
    comparisonOnColor: 'Comparação sobre sua cor',
    richBlackDense: 'Rich Black é mais denso mas seca lento',
    tintRamp: 'RAMPA DE TONS',
    densityScale: 'Escala de Densidades',
    tintUniformity: 'Verifica se degradê de tints mantém uniformidade',
    hairlineTest: 'TESTE DE HAIRLINE',
    fineLines: 'Linhas Finas',
    linesPrintFail: 'Linhas abaixo de 0.5pt podem falhar na impressão',
    registrationMarks: 'MARCAS DE REGISTRO',
    alignCmykPlates: 'Usadas para alinhar chapas CMYK na impressora',
    textKnockout: 'VAZADO DE TEXTO',
    knockoutVsOverprint: 'Vazado vs Sobreposto',
    knockoutDesc: 'A cor de fundo é "removida" sob o texto',
    overprintDesc: 'O texto é impresso sobre a cor',
    smallBlackText: 'Texto preto pequeno deve usar Overprint para evitar problemas de registro',
    knockoutRemoves: 'Knockout remove cor; Overprint sobrepõe',
    colorBars: 'BARRAS DE COR',
    controlBars: 'Barras de Controle',
    densityRegistration: 'Barras usadas para verificar densidade e registro',
    technicalIntegrity: 'INTEGRIDADE TÉCNICA',
    totalInkCoverage: 'Cobertura Total de Tinta (TIC / TAC)',
    ticTacDesc: 'A soma das porcentagens de C, M, Y e K não deve exceder os limites físicos do papel. O excesso de carga de tinta resulta em decalque e longos tempos de secagem.',
    status: 'STATUS',
    highRisk: 'ALTO RISCO',
    idealDrying: 'SECAGEM IDEAL',
    highCoverage: 'COBERTURA ALTA',
    safeCoverage: 'COBERTURA SEGURA',
    knowledgeBase: 'BASE DE CONHECIMENTO',
    printColorEducation: 'Didática de Impressão e Cor',
    subtractiveTheory: 'Teoria Subtrativa',
    subtractiveDesc: 'Ao contrário das telas (RGB), que somam luz para criar branco, a impressão CMYK é subtrativa: as tintas agem como filtros que bloqueiam partes do espectro luminoso. Quanto mais tinta, mais perto do preto.',
    offsetVsDigital: 'Offset vs Digital',
    offsetVsDigitalDesc: 'O Offset usa chapas metálicas e tintas líquidas pastosas, ideal para grandes tiragens e cores spot exatas. O Digital usa toner ou jato de tinta, sendo mais rápido para pequenas quantidades mas com gamut limitado.',
    dotGainTitle: 'Ganho de Ponto',
    dotGainDesc: 'Dot Gain ocorre quando a gota de tinta expande ao atingir as fibras do papel. Papéis porosos (Offset/Jornal) sofrem mais ganho de ponto, o que pode escurecer a imagem final se não compensado.',
    spotRefColors: 'Spot (Cores de Referência)',
    spotRefDesc: 'São cores pré-misturadas pelo fabricante. Diferente do CMYK (que usa 4 tintas), uma cor spot é uma tinta única aplicada diretamente, garantindo fidelidade total em logotipos.',
    metamerism: 'Metamerismo',
    metamerismDesc: 'É o fenômeno onde duas cores parecem idênticas sob uma luz (ex: escritório) mas diferentes sob outra (ex: luz do sol). Sempre verifique provas físicas em condições reais de uso.',
    varnishLamination: 'Verniz e Laminação',
    varnishLaminationDesc: 'Acabamentos protegem a tinta e alteram a percepção da cor. A laminação fosca tende a achatar o contraste, enquanto o verniz brilho satura as cores e aprofunda os pretos.',
    coucheVsOffset: 'Couché vs Offset',
    coucheVsOffsetDesc: 'O papel Couché tem uma camada de revestimento que impede a absorção excessiva da tinta, mantendo as cores vibrantes. O Offset é poroso, absorvendo a tinta e resultando em cores mais suaves e naturais.',
    trapping: 'Trapping (Sobreposição)',
    trappingDesc: 'Técnica de compensação de registro onde cores adjacentes são ligeiramente sobrepostas. Isso evita frestas brancas se houver um pequeno desalinhamento das chapas na impressora.',
    gcrUcr: 'GCR e UCR',
    gcrUcrDesc: 'Técnicas de pré-impressão que substituem partes das cores CMY pelo canal K (Preto). Isso economiza tinta cara, melhora a secagem e garante maior estabilidade de cor nas sombras.',
    lineature: 'Lineatura (LPI)',
    lineatureDesc: 'Define a densidade da retícula. Revistas de luxo usam 175-200 LPI (pontos invisíveis), enquanto jornais usam 85-100 LPI (pontos visíveis a olho nu). Afeta diretamente o detalhamento da imagem.',
    colorGamut: 'Gamut de Cor',
    colorGamutDesc: 'É o alcance total de cores que um sistema pode reproduzir. O RGB (telas) tem um gamut muito maior que o CMYK (impressão). Por isso, cores neon ou azuis elétricos muitas vezes apagam no papel.',
    weightVsThickness: 'Gramatura vs Espessura',
    weightVsThicknessDesc: 'Gramatura é o peso (g/m²). Espessura (Micras) é o volume. Papéis de mesma gramatura podem ter espessuras diferentes devido à densidade das fibras, afetando a "mão" do material impresso.',
    
    // PaletteBuilder extra
    batchPalette: 'Paleta do Batch',
    colors: 'cores',
    hideBatch: 'Ocultar Batch',
    showBatch: 'Mostrar Batch',
    clickToUseAsBase: 'Clique em uma cor para usar como base da paleta de contrastes',
    shades: 'Shades',
    tints: 'Tints',
    count: 'Qtd',
    step: 'Passo',
    randomize: 'Aleatório',
    
    // GeneratedPalettes extra
    processing: 'Processando...',
    exact: 'EXATO',
    randomizeColors: 'Cores Aleatórias',
    suggestHarmony: 'Sugerir Harmonia',
    uploadSvg: 'Carregar SVG',
    basePosition: 'Posição da Base',
    none: 'Nenhum',
    above: 'Acima',
    center: 'Centro',
    below: 'Abaixo',
    contrast: 'Contraste',
    variations: 'Variações',

    // UI headings & helpers
    masterColorReference: 'Referência de Cor Mestre',
    digitalVsPrint: 'Simulação Digital vs Impressão',
    technicalBreakdown: 'Análise Técnica',
    cmykSeparationLogic: 'Lógica de Separação CMYK',
    colorChannelsLabel: 'Canais de Cor',
    harmonyComplementary: 'Complementar',
    harmonyAnalogWarm: 'Análogo Quente',
    harmonyAnalogCool: 'Análogo Frio',
    harmonyTriadic: 'Triádico',
    harmonySplitComplementary: 'Complementar Dividido',
    harmonyTetradic: 'Tetrádico',
    overprintSimulationNote: 'Simula overprint com mix-blend-multiply',
    lightingD65: 'Luz do Dia D65',
    lightingTungsten: 'Tungstênio',
    lightingFluorescent: 'Fluorescente',
    reducedDensity: '-5% de Densidade',
    knockoutLabel: 'Knockout',
    overprintLabel: 'Overprint',
    textLabel: 'Texto',
    copiedToClipboard: 'Copiado para a área de transferência!',
    slotLabel: 'Slot',
    colorCardAria: 'cartão de cor',
    baseBadge: 'BASE',
    // Library Manager
    selectLibrary: 'Selecionar Biblioteca',
    standardLibrary: 'Sistema A (Padrão)',
    uploadedLibraries: 'Minhas Bibliotecas Enviadas',
    uploadAcb: 'Enviar .ACB',
    loading: 'Carregando...',
    noValidColors: 'Nenhuma cor válida encontrada no arquivo.',
    parseFailed: 'Falha ao analisar o arquivo .acb',
    cannotExportStandard: 'Não é possível exportar a biblioteca padrão.',
    warning: 'AVISO:',
    allBlackWarning: 'Todas as cores foram lidas como preto (#000000). O arquivo pode ser incompatível. Remova esta biblioteca e tente novamente.',
    copyJsonCode: 'Copiar código JSON',
    deleteLibrary: 'Excluir Biblioteca',
    verifyColorsNote: 'Verifique se as cores estão corretas (não todas pretas) antes de exportar.',

    // GeneratedPalettes UI
    addColorPlaceholder: 'Adicionar cor (ex: #FF5500)',
    addColorButton: '+ Adicionar',
    preview1Title: 'PREVIEW 1',
    preview1Subtitle: 'Folha de Cores',
    templateLabel: 'Template',
    splitLabel: 'Divisão',
    variationsLabel: 'Variações',
    baseColorPositionLabel: 'Cor Base',
    basePositionNone: 'Sem',
    basePositionAbove: 'Acima',
    basePositionCenter: 'Centro',
    basePositionBelow: 'Abaixo',
    showVariationCodesOn: 'Ocultar códigos das variações',
    showVariationCodesOff: 'Mostrar códigos das variações',
    showCodesOn: 'Ocultar códigos (Tela 1)',
    showCodesOff: 'Mostrar códigos (Tela 1)',
    
    // PaletteGenerator
    processingImage: 'Processando...',
    uploadImageSvg: 'IMAGEM / SVG',
    
    // GeneratedPalettes - Previews extras
    preview2Title: '2. Quadrados de Interação Albers',
    preview2Subtitle: 'Estudo de contraste simultâneo inspirado em Josef Albers',
    preview3Title: '3. Combinações Personalizadas',
    preview3Subtitle: 'Arranjos geométricos com sua paleta',
    preview4Title: '4. Pares de Contraste',
    preview4Subtitle: 'Combinações acessíveis de texto e fundo (WCAG)',
    
    // GeneratedPalettes - Albers controls
    shuffleAlbers: 'Embaralhar',
    albersNote: 'Cada quadrado mostra como a cor interna parece mudar em diferentes fundos',
    
    // GeneratedPalettes - Export
    exportColorSheet: 'Folha de Cores',
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
    colorGuidePreview: 'Prévia do Guia de Cores',
    printSavePdfHint: 'Use a função "Imprimir" do navegador para Salvar como PDF',
    closeButton: 'FECHAR',
    cardTemplateLabel: 'Modelo do Card',
    cardTemplateClassic: 'Clássico',
    cardTemplateCompact: 'Compacto',
    cardTemplateEditorial: 'Editorial',
    cardTemplateSwatch: 'Amostra',
    cardTemplateMinimal: 'Mínimo',
    cardTemplateMono: 'Mono',
    printSavePdf: 'IMPRIMIR / SALVAR PDF',
    
    // GeneratedPalettes - Template options
    templateSquares: 'Quadrados',
    templateCircles: 'Círculos',
    templateSunset: 'Pôr do Sol',
    templateBars: 'Barras',
    backgroundBlack: 'Preto',
    backgroundWhite: 'Branco',
    backgroundGray: 'Cinza',

    // Palette Magic
    paletteMagic: 'Palette Magic',
    contextBrand: 'Identidade de Marca',
    contextPoster: 'Cartaz',
    contextUI: 'UI / Layout',
    contextEditorial: 'Editorial',
    contextPackaging: 'Embalagem',
    contrastScore: 'Contraste',
    harmonyScore: 'Harmonia',
    paletteScore: 'Pontuação',
    trendPalettes: 'Paletas em Tendência',
    userPalettes: 'Suas Paletas',
    expandPalette: 'Expandir',
    generateMagic: 'Gerar',
    applyPalette: 'Aplicar',
    harmonyPalettes: 'Paletas de Harmonia',
    allContexts: 'Todos',
    wcagValidated: 'Validado WCAG',
    copyPalette: 'Copiar Paleta',
    baseColors: 'Cores Base',
    noBaseColors: 'Adicione cores via upload de SVG ou entrada hex para gerar paletas',
    slots: 'Slots',
    lockColor: 'Travar',
    unlockColor: 'Destravar',
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
    contrastPalette: 'Contrastes y Paleta',
    generatedPalettes: 'Paletas Generadas',
    printGuide: 'Guía de Impresión',
    
    // Settings Panel
    visibleColorModels: 'Modelos de Color Visibles',
    hexadecimal: 'Hexadecimal',
    rgbStandard: 'RGB (Estándar)',
    hslWeb: 'HSL (Web)',
    hsbHsv: 'HSB / HSV',
    cieLabHighPrec: 'CIE Lab (Alta Prec)',
    cmykProcess: 'CMYK (Proceso)',
    refBridgeC: 'Sistema A (CP)',
    refBridgeU: 'Sistema A (UP)',
    refSolidC: 'Sistema B (C)',
    refSolidU: 'Sistema B (U)',
    mixedFormatSyntax: 'Sintaxis de Formato Mixto',
    changesAppliedRealtime: 'Los cambios se aplican en tiempo real a las sesiones activas.',
    
    // Color Input
    color: 'Color',
    inputColor: 'Color de entrada',
    
    // Match Section
    matchCie2000: 'Match (CIE2000)',
    input: 'Entrada',
    deltaE00: 'Delta E 00',
    outOfGamut: 'FUERA DE GAMA',
    actions: 'Acciones',
    randomizeColor: 'Color Aleatorio',
    analyzeWithAi: 'Buscar Referencia',
    thinking: 'Buscando...',
    aiResult: 'Resultado de la búsqueda',
    mood: 'Estado',
    
    // Batch Mode
    batchOn: 'Lote ACTIVO',
    batchOff: 'Lote INACTIVO',
    multiSlotMatchAnalysis: 'Análisis de Match Multi-Slot',
    copyAllSlotsData: 'Copiar Datos de Todos los Slots',
    nearbyAlternatives: 'Alternativas Cercanas',
    selectSlotColor: 'Seleccionar color del slot',
    downloadSlot: 'Descargar slot',
    
    // Nearby Pantones
    nearbyRefs: 'Referencias Cercanas (ΔE 00)',
    
    // InfoGrid
    red: 'Rojo',
    green: 'Verde',
    blue: 'Azul',
    cyan: 'Cian',
    magenta: 'Magenta',
    yellow: 'Amarillo',
    keyBlack: 'Negro (K)',
    hue: 'Tono',
    saturation: 'Saturación',
    lightness: 'Luminosidad',
    aiAnalysis: 'Análisis de color',
    
    // PaletteBuilder
    shadeCount: 'Cantidad de Tonos Oscuros',
    tintCount: 'Cantidad de Tonos Claros',
    darkenIntensity: 'Intensidad de Oscurecimiento',
    lightenIntensity: 'Intensidad de Aclaramiento',
    hueRotateShade: 'Rotación de Tono (Oscuro)',
    hueRotateTint: 'Rotación de Tono (Claro)',
    saturationShade: 'Saturación (Oscuro)',
    saturationTint: 'Saturación (Claro)',
    useRefMatch: 'Usar Match de Referencia',
    showBatchPalettes: 'Mostrar Paletas en Lote',
    selectBatchColor: 'Seleccionar color del lote',
    baseColor: 'Color Base',
    exportPalette: 'Exportar Paleta',
    paletteContrast: 'Contraste de Paleta',
    accessiblePairs: 'Pares Accesibles',
    
    // ColorGuide
    cmykMixer: 'Mezclador CMYK',
    totalInk: 'Total de Tinta',
    manualCmykPreview: 'Vista Previa CMYK Manual',
    contrastChecker: 'Verificador de Contraste',
    foreground: 'Primer Plano',
    background: 'Fondo',
    contrastRatio: 'Relación de Contraste',
    wcagAA: 'WCAG AA',
    wcagAAA: 'WCAG AAA',
    pass: 'PASA',
    fail: 'FALLA',
    accessibleSuggestions: 'Sugerencias Accesibles',
    darkSuggestions: 'Sugerencias Oscuras',
    lightSuggestions: 'Sugerencias Claras',
    monochromaticVariations: 'Variaciones Monocromáticas',
    hueVariation: 'Variación de Tono',
    substrateSimulation: 'Simulación de Sustrato',
    coated: 'Estucado',
    uncoated: 'Offset',
    dotGain10: 'Ganancia de Punto 10%',
    dotGain20: 'Ganancia de Punto 20%',
    recycledPaper: 'Papel Reciclado',
    lowDensity: 'Baja Densidad',
    colorBlindnessSimulation: 'Simulación de Daltonismo',
    protanopia: 'Protanopia',
    deuteranopia: 'Deuteranopia',
    tritanopia: 'Tritanopia',
    achromatopsia: 'Acromatopsia',
    separationGuide: 'Guía de Separación',
    spotColor: 'Color Spot',
    processColor: 'Color Proceso',
    refGuide: 'Guía de Referencia',
    useSpotWhen: 'Use colores spot cuando la consistencia de marca es crítica',
    useProcessWhen: 'Use colores proceso para imágenes complejas y gradientes',
    accessibleVariations: 'Variaciones Accesibles',
    totalVariations: 'Total de Variaciones',
    
    // GeneratedPalettes
    paletteColors: 'Colores de Paleta',
    addColor: 'Añadir Color',
    showCodes: 'Mostrar Códigos',
    hideCodes: 'Ocultar Códigos',
    previewStyles: 'Estilos de Vista Previa',
    classic: 'Clásico',
    vertical: 'Vertical',
    grid: 'Cuadrícula',
    cards: 'Tarjetas',
    downloadPalette: 'Descargar Paleta',
    exportAco: 'Exportar ACO',
    exportAse: 'Exportar ASE',
    exportCsv: 'Exportar CSV',
    customCombinations: 'Combinaciones Personalizadas',
    squares: 'Cuadrados',
    circles: 'Círculos',
    sunset: 'Atardecer',
    bars: 'Barras',
    backgroundStyle: 'Estilo de Fondo',
    blackBg: 'Negro',
    whiteBg: 'Blanco',
    grayBg: 'Gris',
    shuffleCombinations: 'Mezclar Combinaciones',
    colorDetails: 'Detalles del Color',
    locked: 'Bloqueado',
    unlocked: 'Desbloqueado',
    
    // PaletteGenerator
    extractFromImage: 'Extraer de Imagen',
    extracting: 'Extrayendo...',
    dragDropImage: 'Arrastra y suelta una imagen o haz clic para subir',
    
    // Similarity Grid
    similarityTitle: 'Cuadrícula de Similitud',
    
    // Footer
    poweredBy: 'Desarrollado por UNBSERVED',
    
    // Language names
    english: 'English',
    portuguese: 'Português',
    spanish: 'Español',
    
    // ColorGuide extra
    spotColor2: 'COLOR SPOT',
    clickToEdit: 'Haz clic para editar el color',
    paletteColorsLabel: 'COLORES DE PALETA',
    active: 'activo',
    substrates: 'SUSTRATOS',
    simulatedPaperDotGain: 'Simulación de Papel y Ganancia de Punto',
    original: 'ORIGINAL',
    digitalD65: 'DIGITAL D65',
    coatedPaper: 'ESTUCADO / 150G',
    uncoatedPaper: 'PAPEL OFFSET',
    mediumGain: 'GANANCIA MEDIA',
    heavyGain: 'GANANCIA ALTA',
    grayBase: 'BASE GRIS',
    legibilityStandards: 'ESTÁNDARES DE LEGIBILIDAD',
    contrastAnalysis: 'Análisis de Contraste',
    preview: 'VISTA PREVIA',
    legibleText: 'Texto legible sobre fondo',
    neutralMatchMatrix: 'MATRIZ DE MATCH NEUTRO',
    varyTones: 'Variar Tonos',
    darkUi: 'UI OSCURA',
    surface: 'SUPERFICIE',
    paletteContrastTest: 'CONTRASTE DE PALETA',
    testsBetweenColors: 'Pruebas Entre Colores de Paleta',
    textOnBackground: 'Texto sobre fondo',
    productionCheck: 'VERIFICACIÓN DE PRODUCCIÓN',
    trappingRegistration: 'Trapping y Registro',
    trapTest: 'PRUEBA DE TRAP',
    resolution: 'RESOLUCIÓN',
    lpiHalftone: 'Trama LPI',
    gamut: 'GAMUT',
    colorSpaceGamut: 'Gamut de Espacio de Color',
    printSimulationTests: 'PRUEBAS DE SIMULACIÓN DE IMPRESIÓN',
    visualPrintTests: 'Pruebas Visuales de Impresión',
    bleedTest: 'PRUEBA DE SANGRADO',
    bleedArea: 'Área de Sangrado',
    safeArea: 'Área Segura',
    bleed3mm: 'Sangrado 3mm',
    cutLine: 'Corte',
    overprintTest: 'PRUEBA DE SOBREIMPRESIÓN',
    colorOverlay: 'Superposición de Colores',
    gradientTest: 'PRUEBA DE GRADIENTE',
    bandingCheck: 'Verificación de Banding',
    observeBanding: 'Observa si hay "bandas" visibles en el degradado',
    minimumText: 'TEXTO MÍNIMO',
    textLegibility: 'Legibilidad de Texto',
    bodyText: 'Texto 14pt - Cuerpo normal',
    footnotes: 'Texto 10pt - Notas al pie',
    minimumReadLimit: 'Texto 7pt - Límite mínimo de lectura',
    microPrint: 'Texto 5pt - Micro impresión / avisos legales',
    highResRequired: 'Por debajo de 6pt requiere alta resolución',
    adjacencyTest: 'PRUEBA DE ADYACENCIA',
    neighboringColors: 'Colores Vecinos',
    colorBehavior: 'Cómo se comporta el color junto a otros',
    reversalTest: 'PRUEBA DE INVERSIÓN',
    positiveNegative: 'Positivo / Negativo',
    positive: 'POSITIVO',
    negative: 'NEGATIVO',
    knockoutApplication: 'Prueba de calado y aplicación invertida',
    screenAngles: 'ÁNGULOS DE TRAMA',
    cmykPlateAngles: 'Ángulos de Placas CMYK',
    standardAngles: 'Los ángulos estándar evitan el moiré',
    metamerismTest: 'PRUEBA DE METAMERISMO',
    lightingSimulation: 'Simulación de Iluminación',
    colorsChangeLight: 'Los colores cambian bajo diferentes luces',
    blackTest: 'PRUEBA DE NEGRO',
    richBlackVsPure: 'Rich Black vs Pure Black',
    pureBlack: 'Pure Black',
    richBlack: 'Rich Black',
    comparisonOnColor: 'Comparación sobre tu color',
    richBlackDense: 'Rich Black es más denso pero seca lento',
    tintRamp: 'RAMPA DE TONOS',
    densityScale: 'Escala de Densidades',
    tintUniformity: 'Verifica si el degradado de tints mantiene uniformidad',
    hairlineTest: 'PRUEBA DE LÍNEAS FINAS',
    fineLines: 'Líneas Finas',
    linesPrintFail: 'Líneas por debajo de 0.5pt pueden fallar en impresión',
    registrationMarks: 'MARCAS DE REGISTRO',
    alignCmykPlates: 'Usadas para alinear placas CMYK en la prensa',
    textKnockout: 'CALADO DE TEXTO',
    knockoutVsOverprint: 'Calado vs Sobreimpreso',
    knockoutDesc: 'El color de fondo se "elimina" bajo el texto',
    overprintDesc: 'El texto se imprime sobre el color',
    smallBlackText: 'El texto negro pequeño debe usar Overprint para evitar problemas de registro',
    knockoutRemoves: 'Knockout elimina color; Overprint sobrepone',
    colorBars: 'BARRAS DE COLOR',
    controlBars: 'Barras de Control',
    densityRegistration: 'Barras usadas para verificar densidad y registro',
    technicalIntegrity: 'INTEGRIDAD TÉCNICA',
    totalInkCoverage: 'Cobertura Total de Tinta (TIC / TAC)',
    ticTacDesc: 'La suma de los porcentajes de C, M, Y y K no debe exceder los límites físicos del papel. El exceso de carga de tinta resulta en calcado y largos tiempos de secado.',
    status: 'ESTADO',
    highRisk: 'ALTO RIESGO',
    idealDrying: 'SECADO IDEAL',
    highCoverage: 'COBERTURA ALTA',
    safeCoverage: 'COBERTURA SEGURA',
    knowledgeBase: 'BASE DE CONOCIMIENTO',
    printColorEducation: 'Didáctica de Impresión y Color',
    subtractiveTheory: 'Teoría Sustractiva',
    subtractiveDesc: 'A diferencia de las pantallas (RGB), que suman luz para crear blanco, la impresión CMYK es sustractiva: las tintas actúan como filtros que bloquean partes del espectro luminoso. Más tinta = más cerca del negro.',
    offsetVsDigital: 'Offset vs Digital',
    offsetVsDigitalDesc: 'El Offset usa placas metálicas y tintas líquidas pastosas, ideal para grandes tiradas y tintas spot exactas. El Digital usa tóner o inyección de tinta, más rápido para pequeñas cantidades pero con gamut limitado.',
    dotGainTitle: 'Ganancia de Punto',
    dotGainDesc: 'La Ganancia de Punto ocurre cuando la gota de tinta se expande al tocar las fibras del papel. Papeles porosos (Offset/Periódico) sufren más ganancia, lo que puede oscurecer la imagen final si no se compensa.',
    spotRefColors: 'Spot (Colores de Referencia)',
    spotRefDesc: 'Son colores premezclados por el fabricante. A diferencia del CMYK (que usa 4 tintas), una tinta spot es un solo pigmento aplicado directamente, garantizando fidelidad total en logotipos.',
    metamerism: 'Metamerismo',
    metamerismDesc: 'Es el fenómeno donde dos colores parecen idénticos bajo una luz (ej: oficina) pero diferentes bajo otra (ej: luz del sol). Siempre verifique pruebas físicas en condiciones reales de uso.',
    varnishLamination: 'Barniz y Laminación',
    varnishLaminationDesc: 'Los acabados protegen la tinta y alteran la percepción del color. La laminación mate tiende a aplanar el contraste, mientras el barniz brillante satura los colores y profundiza los negros.',
    coucheVsOffset: 'Estucado vs Offset',
    coucheVsOffsetDesc: 'El papel Estucado tiene una capa de recubrimiento que impide la absorción excesiva de tinta, manteniendo los colores vibrantes. El Offset es poroso, absorbiendo la tinta resultando en colores más suaves y naturales.',
    trapping: 'Trapping (Superposición)',
    trappingDesc: 'Técnica de compensación de registro donde colores adyacentes se superponen ligeramente. Evita huecos blancos si hay un pequeño desalineamiento de las placas en la prensa.',
    gcrUcr: 'GCR y UCR',
    gcrUcrDesc: 'Técnicas de preimpresión que sustituyen partes de los colores CMY por el canal K (Negro). Ahorra tinta cara, mejora el secado y garantiza mayor estabilidad de color en las sombras.',
    lineature: 'Lineatura (LPI)',
    lineatureDesc: 'Define la densidad de la trama. Revistas de lujo usan 175-200 LPI (puntos invisibles), mientras periódicos usan 85-100 LPI (puntos visibles a simple vista). Afecta directamente el detalle de la imagen.',
    colorGamut: 'Gamut de Color',
    colorGamutDesc: 'Es el alcance total de colores que un sistema puede reproducir. El RGB (pantallas) tiene un gamut mucho mayor que el CMYK (impresión). Por eso, colores neón o azules eléctricos muchas veces se apagan en el papel.',
    weightVsThickness: 'Gramaje vs Espesor',
    weightVsThicknessDesc: 'Gramaje es el peso (g/m²). Espesor (Micras) es el volumen. Papeles del mismo gramaje pueden tener espesores diferentes debido a la densidad de las fibras, afectando la "mano" del material impreso.',
    
    // PaletteBuilder extra
    batchPalette: 'Paleta del Lote',
    colors: 'colores',
    hideBatch: 'Ocultar Lote',
    showBatch: 'Mostrar Lote',
    clickToUseAsBase: 'Haz clic en un color para usarlo como base de la paleta de contrastes',
    shades: 'Shades',
    tints: 'Tints',
    count: 'Cant',
    step: 'Paso',
    randomize: 'Aleatorio',
    
    // GeneratedPalettes extra
    processing: 'Procesando...',
    exact: 'EXACTO',
    randomizeColors: 'Colores Aleatorios',
    suggestHarmony: 'Sugerir Armonía',
    uploadSvg: 'Cargar SVG',
    basePosition: 'Posición de Base',
    none: 'Ninguno',
    above: 'Arriba',
    center: 'Centro',
    below: 'Abajo',
    contrast: 'Contraste',
    variations: 'Variaciones',

    // UI headings & helpers
    masterColorReference: 'Referencia de Color Maestro',
    digitalVsPrint: 'Simulación Digital vs Impresión',
    technicalBreakdown: 'Desglose Técnico',
    cmykSeparationLogic: 'Lógica de Separación CMYK',
    colorChannelsLabel: 'Canales de Color',
    harmonyComplementary: 'Complementario',
    harmonyAnalogWarm: 'Análogo Cálido',
    harmonyAnalogCool: 'Análogo Frío',
    harmonyTriadic: 'Triádico',
    harmonySplitComplementary: 'Complementario Dividido',
    harmonyTetradic: 'Tetrádico',
    overprintSimulationNote: 'Simula sobreimpresión con mix-blend-multiply',
    lightingD65: 'Luz de Día D65',
    lightingTungsten: 'Tungsteno',
    lightingFluorescent: 'Fluorescente',
    reducedDensity: '-5% de Densidad',
    knockoutLabel: 'Knockout',
    overprintLabel: 'Sobreimpreso',
    textLabel: 'Texto',
    copiedToClipboard: '¡Copiado al portapapeles!',
    slotLabel: 'Slot',
    colorCardAria: 'tarjeta de color',
    baseBadge: 'BASE',
    // Library Manager
    selectLibrary: 'Seleccionar Biblioteca',
    standardLibrary: 'Sistema A (Estándar)',
    uploadedLibraries: 'Mis Bibliotecas Cargadas',
    uploadAcb: 'Cargar .ACB',
    loading: 'Cargando...',
    noValidColors: 'No se encontraron colores válidos en el archivo.',
    parseFailed: 'Error al analizar el archivo .acb',
    cannotExportStandard: 'No es posible exportar la biblioteca estándar.',
    warning: 'ADVERTENCIA:',
    allBlackWarning: 'Todos los colores fueron leídos como negro (#000000). El archivo puede ser incompatible. Elimine esta biblioteca y vuelva a intentarlo.',
    copyJsonCode: 'Copiar código JSON',
    deleteLibrary: 'Eliminar Biblioteca',
    verifyColorsNote: 'Verifique que los colores sean correctos (no todos negros) antes de exportar.',

    // GeneratedPalettes UI
    addColorPlaceholder: 'Agregar color (ej: #FF5500)',
    addColorButton: '+ Agregar',
    preview1Title: 'PREVIEW 1',
    preview1Subtitle: 'Hoja de Colores',
    templateLabel: 'Template',
    splitLabel: 'División',
    variationsLabel: 'Variaciones',
    baseColorPositionLabel: 'Color Base',
    basePositionNone: 'Ninguno',
    basePositionAbove: 'Arriba',
    basePositionCenter: 'Centro',
    basePositionBelow: 'Abajo',
    showVariationCodesOn: 'Ocultar códigos de variaciones',
    showVariationCodesOff: 'Mostrar códigos de variaciones',
    showCodesOn: 'Ocultar códigos (Vista 1)',
    showCodesOff: 'Mostrar códigos (Vista 1)',
    
    // PaletteGenerator
    processingImage: 'Procesando...',
    uploadImageSvg: 'IMAGEN / SVG',
    
    // GeneratedPalettes - Previews extras
    preview2Title: '2. Cuadrados de Interacción Albers',
    preview2Subtitle: 'Estudio de contraste simultáneo inspirado en Josef Albers',
    preview3Title: '3. Combinaciones Personalizadas',
    preview3Subtitle: 'Arreglos geométricos con tu paleta',
    preview4Title: '4. Pares de Contraste',
    preview4Subtitle: 'Combinaciones accesibles de texto y fondo (WCAG)',
    
    // GeneratedPalettes - Albers controls
    shuffleAlbers: 'Mezclar',
    albersNote: 'Cada cuadrado muestra cómo el color interno parece cambiar en diferentes fondos',
    
    // GeneratedPalettes - Export
    exportColorSheet: 'Hoja de Colores',
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
    resetCombo: 'Resetear',
    availableCombinations: 'combinaciones disponibles',
    cardTemplateLabel: 'Plantilla del Card',
    cardTemplateClassic: 'Clásico',
    cardTemplateCompact: 'Compacto',
    cardTemplateEditorial: 'Editorial',
    cardTemplateSwatch: 'Muestra',
    cardTemplateMinimal: 'Mínimo',
    cardTemplateMono: 'Mono',
    backgroundLabel: 'Fondo',
    cardsLabel: 'Tarjetas',
    
    // ColorSheetExport
    colorGuidePreview: 'Vista Previa de Guía de Colores',
    printSavePdfHint: 'Usa la función "Imprimir" de tu navegador para Guardar como PDF',
    closeButton: 'CERRAR',
    printSavePdf: 'IMPRIMIR / GUARDAR PDF',
    
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
    contextBrand: 'Identidad de Marca',
    contextPoster: 'Cartel',
    contextUI: 'UI / Layout',
    contextEditorial: 'Editorial',
    contextPackaging: 'Empaque',
    contrastScore: 'Contraste',
    harmonyScore: 'Armonía',
    paletteScore: 'Puntuación',
    trendPalettes: 'Paletas en Tendencia',
    userPalettes: 'Tus Paletas',
    expandPalette: 'Expandir',
    generateMagic: 'Generar',
    applyPalette: 'Aplicar',
    harmonyPalettes: 'Paletas de Armonía',
    allContexts: 'Todos',
    wcagValidated: 'Validado WCAG',
    copyPalette: 'Copiar Paleta',
    baseColors: 'Colores Base',
    noBaseColors: 'Agrega colores vía carga de SVG o entrada hex para generar paletas',
    slots: 'Slots',
    lockColor: 'Bloquear',
    unlockColor: 'Desbloquear',
  },
};

export const getTranslation = (lang: Language): Translations => {
  return translations[lang] || translations.en;
};
