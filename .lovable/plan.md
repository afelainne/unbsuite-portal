
# Expandir Formatos: Mais Impressos e Redes Sociais

## Resumo

Adicionar dezenas de novos formatos ao FORMAT_PRESETS, cobrindo mais papeis de impressao e todos os formatos das redes sociais mais populares. Tambem adicionar novas categorias: **PHOTO**, **ADVERTISING** e **SCREEN**.

## Novos formatos a adicionar

### PRINT (novos)
- A7 (74x105mm), A8 (52x74mm)
- B0 (1000x1414mm), B1 (707x1000mm), B2 (500x707mm), B3 (353x500mm), B4 (250x353mm), B5 (176x250mm)
- C4 Envelope (229x324mm), C6 Envelope (114x162mm), #10 Envelope US (241.3x104.8mm)
- Executive (184.2x266.7mm), Folio (215.9x330.2mm), Ledger (431.8x279.4mm)
- Statement (139.7x215.9mm), Government Letter (203.2x266.7mm)
- Super A3/B (330x483mm)

### SOCIAL MEDIA (novos)
- Instagram Reel (285.75x507.94mm)
- Instagram Carousel (285.75x285.75mm)
- Facebook Event Cover (475.13x180.34mm)
- Facebook Story (285.75x507.94mm)
- Facebook Ad (167.64x167.64mm)
- Twitter/X In-Stream Photo (167.64x94.30mm)
- LinkedIn Post (167.64x167.64mm)
- LinkedIn Story (285.75x507.94mm)
- YouTube Channel Art (681.47x113.24mm)
- YouTube Shorts (285.75x507.94mm)
- Pinterest Story Pin (285.75x507.94mm)
- TikTok Post (285.75x507.94mm)
- Snapchat Ad (285.75x507.94mm)
- Snapchat Geofilter (285.75x507.94mm)
- Threads Post (285.75x285.75mm)
- Threads Story (285.75x507.94mm)
- WhatsApp Status (285.75x507.94mm)
- Telegram Sticker (136.53x136.53mm)
- Discord Server Icon (170.18x170.18mm)
- Twitch Banner (320.68x106.89mm)
- Twitch Overlay (508.00x285.75mm)
- Spotify Playlist Cover (80.43x80.43mm)
- BeReal Post (285.75x285.75mm)

### PHOTO (nova categoria)
- 4x6" (101.6x152.4mm)
- 5x7" (127x177.8mm)
- 8x10" (203.2x254mm)
- 11x14" (279.4x355.6mm)
- 16x20" (406.4x508mm)
- 20x30" (508x762mm)
- Square 12x12" (304.8x304.8mm)
- Passport Photo (35x45mm)
- Wallet Size (63.5x88.9mm)
- Panoramic (254x762mm)

### ADVERTISING (nova categoria)
- Flyer (148x210mm)
- Tri-Fold Brochure (297x210mm)
- Bi-Fold Brochure (420x297mm)
- Door Hanger (88.9x279.4mm)
- Rack Card (101.6x228.6mm)
- Coupon (88.9x50.8mm)
- Ticket (203.2x73.7mm)
- Event Poster (457.2x609.6mm)
- Movie Poster (685.8x1016mm)
- Menu Single (215.9x279.4mm)
- Menu Tri-Fold (279.4x431.8mm)

### SCREEN (nova categoria)
- Desktop Wallpaper HD (508x285.75mm)
- Desktop Wallpaper 4K (1016x571.5mm)
- Mobile Wallpaper (285.75x507.94mm)
- Tablet Wallpaper (271.46x361.95mm)
- Email Header (167.64x56.09mm)
- Email Banner (167.64x83.82mm)
- Web Banner Leaderboard (199.58x24.61mm)
- Web Banner Skyscraper (42.33x161.22mm)
- Web Banner Rectangle (83.82x66.15mm)
- App Icon (136.53x136.53mm)
- Favicon (4.23x4.23mm)
- Open Graph Image (317.50x166.69mm)

---

## Mudancas tecnicas

### types.ts
Adicionar `'PHOTO' | 'ADVERTISING' | 'SCREEN'` ao union type de `category`.

### constants.ts
Adicionar todos os novos presets ao array.

### Sidebar.tsx
Adicionar as novas categorias ao `CATEGORY_ORDER`:
```
['PRINT', 'EDITORIAL', 'PHOTO', 'PACKAGING', 'SIGNAGE', 'ADVERTISING', 'SOCIAL MEDIA', 'SCREEN', 'STATIONERY']
```

Nenhuma outra mudanca necessaria -- a sidebar ja agrupa e colapsa dinamicamente.
