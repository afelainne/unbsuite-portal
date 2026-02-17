
import { FormatPreset } from './types';

export const FORMAT_PRESETS: FormatPreset[] = [
  // PRINT
  { id: 'a0', name: 'A0 POSTER', width: 841, height: 1189, category: 'PRINT' },
  { id: 'a1', name: 'A1 POSTER', width: 594, height: 841, category: 'PRINT' },
  { id: 'a2', name: 'A2 POSTER', width: 420, height: 594, category: 'PRINT' },
  { id: 'a3', name: 'A3 POSTER', width: 297, height: 420, category: 'PRINT' },
  { id: 'a3_land', name: 'A3 LANDSCAPE', width: 420, height: 297, category: 'PRINT' },
  { id: 'a4', name: 'A4 DOCUMENT', width: 210, height: 297, category: 'PRINT' },
  { id: 'a4_land', name: 'A4 LANDSCAPE', width: 297, height: 210, category: 'PRINT' },
  { id: 'a5', name: 'A5 FLYER', width: 148, height: 210, category: 'PRINT' },
  { id: 'a6', name: 'A6 POSTCARD', width: 105, height: 148, category: 'PRINT' },
  { id: 'bc_int', name: 'BUSINESS CARD (INTL)', width: 85, height: 55, category: 'PRINT' },
  { id: 'bc_us', name: 'BUSINESS CARD (US)', width: 88.9, height: 50.8, category: 'PRINT' },
  { id: 'dl_env', name: 'DL ENVELOPE', width: 220, height: 110, category: 'PRINT' },
  { id: 'c5_env', name: 'C5 ENVELOPE', width: 229, height: 162, category: 'PRINT' },
  { id: 'letter_us', name: 'LETTER (US)', width: 215.9, height: 279.4, category: 'PRINT' },
  { id: 'legal_us', name: 'LEGAL (US)', width: 215.9, height: 355.6, category: 'PRINT' },
  { id: 'tabloid_us', name: 'TABLOID (US)', width: 279.4, height: 431.8, category: 'PRINT' },
  { id: 'half_letter', name: 'HALF LETTER', width: 139.7, height: 215.9, category: 'PRINT' },

  // EDITORIAL
  { id: 'book_cover', name: 'BOOK COVER', width: 156, height: 234, category: 'EDITORIAL' },
  { id: 'pocket_book', name: 'POCKET BOOK', width: 110, height: 178, category: 'EDITORIAL' },
  { id: 'mag_spread', name: 'MAGAZINE SPREAD', width: 420, height: 297, category: 'EDITORIAL' },
  { id: 'cd_booklet', name: 'CD BOOKLET', width: 120, height: 120, category: 'EDITORIAL' },
  { id: 'vinyl_cover', name: 'VINYL COVER', width: 315, height: 315, category: 'EDITORIAL' },
  { id: 'dvd_cover', name: 'DVD COVER', width: 184, height: 273, category: 'EDITORIAL' },

  // PACKAGING
  { id: 'label', name: 'LABEL', width: 100, height: 50, category: 'PACKAGING' },
  { id: 'hang_tag', name: 'HANG TAG', width: 55, height: 90, category: 'PACKAGING' },
  { id: 'box_lid', name: 'BOX LID', width: 200, height: 200, category: 'PACKAGING' },
  { id: 'wine_label', name: 'WINE LABEL', width: 90, height: 120, category: 'PACKAGING' },
  { id: 'soap_wrap', name: 'SOAP WRAP', width: 210, height: 80, category: 'PACKAGING' },

  // SIGNAGE
  { id: 'banner', name: 'BANNER', width: 1000, height: 500, category: 'SIGNAGE' },
  { id: 'rollup', name: 'ROLL-UP', width: 850, height: 2000, category: 'SIGNAGE' },
  { id: 'billboard_4', name: 'BILLBOARD 4-SHEET', width: 1016, height: 1524, category: 'SIGNAGE' },
  { id: 'a_frame', name: 'A-FRAME', width: 600, height: 900, category: 'SIGNAGE' },
  { id: 'table_tent', name: 'TABLE TENT', width: 100, height: 210, category: 'SIGNAGE' },

  // SOCIAL MEDIA
  { id: 'ig_sq', name: 'INSTAGRAM SQUARE', width: 285.75, height: 285.75, category: 'SOCIAL MEDIA' },
  { id: 'ig_pt', name: 'INSTAGRAM PORTRAIT', width: 285.75, height: 357.18, category: 'SOCIAL MEDIA' },
  { id: 'ig_story', name: 'INSTAGRAM STORY', width: 285.75, height: 507.94, category: 'SOCIAL MEDIA' },
  { id: 'fb_cover', name: 'FACEBOOK COVER', width: 222.25, height: 82.02, category: 'SOCIAL MEDIA' },
  { id: 'fb_post', name: 'FACEBOOK POST', width: 167.64, height: 167.64, category: 'SOCIAL MEDIA' },
  { id: 'tw_header', name: 'TWITTER/X HEADER', width: 396.88, height: 132.29, category: 'SOCIAL MEDIA' },
  { id: 'tw_post', name: 'TWITTER/X POST', width: 167.64, height: 167.64, category: 'SOCIAL MEDIA' },
  { id: 'li_banner', name: 'LINKEDIN BANNER', width: 414.69, height: 108.73, category: 'SOCIAL MEDIA' },
  { id: 'yt_thumb', name: 'YOUTUBE THUMBNAIL', width: 340.36, height: 191.45, category: 'SOCIAL MEDIA' },
  { id: 'pin', name: 'PINTEREST PIN', width: 167.64, height: 251.46, category: 'SOCIAL MEDIA' },
  { id: 'tiktok', name: 'TIKTOK COVER', width: 285.75, height: 507.94, category: 'SOCIAL MEDIA' },

  // STATIONERY
  { id: 'letterhead', name: 'LETTERHEAD A4', width: 210, height: 297, category: 'STATIONERY' },
  { id: 'env_dl', name: 'ENVELOPE DL', width: 220, height: 110, category: 'STATIONERY' },
  { id: 'comp_slip', name: 'COMPLIMENT SLIP', width: 210, height: 99, category: 'STATIONERY' },
  { id: 'notecard', name: 'NOTECARD (A6)', width: 105, height: 148, category: 'STATIONERY' },
  { id: 'bookmark', name: 'BOOKMARK', width: 50, height: 150, category: 'STATIONERY' },
  { id: 'certificate', name: 'CERTIFICATE', width: 297, height: 210, category: 'STATIONERY' },
];

export const MM_TO_PX = 3.7795275591; // 96 DPI
