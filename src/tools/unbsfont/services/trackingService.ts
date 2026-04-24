import { GlyphData, TrackingProfile } from "../types";

export const getSizeFactor = (profile: TrackingProfile, fontSizePt: number): number => {
  const s = profile.sizeCompensation;
  if (!s || !s.enable) return 1.0;

  const { minSize, maxSize, minFactor, maxFactor } = s;

  if (fontSizePt <= minSize) return minFactor;
  if (fontSizePt >= maxSize) return maxFactor;

  // Linear interpolation
  const t = (fontSizePt - minSize) / (maxSize - minSize);
  return minFactor + (maxFactor - minFactor) * t;
};

export const isAllCapsWord = (text: string): boolean => {
    // Simplified: check if string contains only Uppercase or Non-letters
    // A more robust check would tokenize the string.
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return false;
    return letters === letters.toUpperCase();
};

export const getTrackingBetweenGlyphs = (
  left: GlyphData,
  right: GlyphData,
  profile: TrackingProfile,
  fontSizePt: number,
  isAllCapsContext: boolean = false
): number => {
  const sizeFactor = getSizeFactor(profile, fontSizePt);

  // 1. Base Tracking
  let tracking = profile.defaultTracking;

  // 2. All Caps Bonus
  if (isAllCapsContext && profile.rules.capsLockExtraTracking !== 0) {
      // Apply only if both are letters
      if (left.isUppercase && right.isUppercase) {
          tracking += profile.rules.capsLockExtraTracking;
      }
  }

  // 3. Whitespace Rules
  if ((left.isWhitespace || right.isWhitespace)) {
    if (!profile.rules.applyToWhitespace) {
      tracking = 0;
    } else {
      tracking *= profile.rules.whitespaceFactor;
    }
  }

  // 4. Numbers Rules
  if (!profile.rules.applyToNumbers) {
    if (left.script === "numbers" || right.script === "numbers") {
      tracking = 0;
    }
  }

  // 5. Punctuation Rules
  if (left.isPunctuation || right.isPunctuation) {
    tracking *= profile.rules.punctuationFactor;
  }

  // 6. Optical Size Compensation
  tracking *= sizeFactor;

  return Math.round(tracking);
};
