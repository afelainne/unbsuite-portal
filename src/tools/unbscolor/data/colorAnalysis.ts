// Banco de dados de análises de cores - Multilíngue (EN/PT/ES)
// Análises baseadas em teoria das cores e psicologia cromática

import { AnalysisResult } from '../types';
import { getAnalysisFromLookup, analysisLookupMap } from './analysisLookup';

interface ColorAnalysisEntry {
  hueRange: [number, number]; // Range de matiz HSL
  saturationRange: [number, number]; // Range de saturação
  lightnessRange: [number, number]; // Range de luminosidade
  analysis: AnalysisResult;
}

// Análises específicas por código Pantone aproximado
const pantoneAnalysis: Record<string, AnalysisResult> = {
  // AMARELOS - baseados em cores reais da biblioteca
  'Yellow': {
    description: {
      en: 'Pure Yellow (#FFE000) - solar radiance captured in pigment, the definitive yellow that illuminates any composition.',
      pt: 'Amarelo puro (#FFE000) - radiância solar capturada em pigmento, o amarelo definitivo que ilumina qualquer composição.',
      es: 'Amarillo puro (#FFE000) - radiancia solar capturada en pigmento, el amarillo definitivo que ilumina cualquier composición.'
    },
    usageTips: {
      en: ['Ideal for call-to-actions and visual emphasis', 'Excellent for signage', 'Combines perfectly with grays and blacks'],
      pt: ['Ideal para call-to-actions e destaque visual', 'Excelente em sinalização', 'Combina perfeitamente com cinzas e pretos'],
      es: ['Ideal para call-to-actions y énfasis visual', 'Excelente en señalización', 'Combina perfectamente con grises y negros']
    },
    psychology: {
      en: 'Stimulates creativity, conveys joy and instant positive energy.',
      pt: 'Estimula criatividade, transmite alegria e energia positiva instantânea.',
      es: 'Estimula la creatividad, transmite alegría y energía positiva instantánea.'
    }
  },
  '100': {
    description: {
      en: 'Canary Yellow (#FFE86C) - soft and welcoming luminosity, pastel yellow that warms without overwhelming.',
      pt: 'Canary Yellow (#FFE86C) - luminosidade suave e acolhedora, amarelo pastel que aquece sem ofuscar.',
      es: 'Amarillo Canario (#FFE86C) - luminosidad suave y acogedora, amarillo pastel que calienta sin abrumar.'
    },
    usageTips: {
      en: ['Perfect for delicate backgrounds', 'Works well on offset paper', 'Great for young and optimistic brands'],
      pt: ['Perfeito para backgrounds delicados', 'Funciona bem em papel offset', 'Ótimo para marcas jovens e otimistas'],
      es: ['Perfecto para fondos delicados', 'Funciona bien en papel offset', 'Excelente para marcas jóvenes y optimistas']
    },
    psychology: {
      en: 'Evokes gentleness, welcoming warmth and spring freshness.',
      pt: 'Evoca gentileza, acolhimento e frescor primaveril.',
      es: 'Evoca gentileza, acogimiento y frescura primaveral.'
    }
  },
  '101': {
    description: {
      en: 'Golden Yellow (#FFE863) - vibrant citrus luminosity, intense yellow that awakens the senses.',
      pt: 'Golden Yellow (#FFE863) - luminosidade cítrica vibrante, amarelo intenso que desperta os sentidos.',
      es: 'Amarillo Dorado (#FFE863) - luminosidad cítrica vibrante, amarillo intenso que despierta los sentidos.'
    },
    usageTips: {
      en: ['Emphasis in food packaging', 'High contrast with dark tones', 'Perfect for summer products'],
      pt: ['Destaque em embalagens alimentícias', 'Alto contraste com tons escuros', 'Perfeito para produtos de verão'],
      es: ['Énfasis en empaques alimenticios', 'Alto contraste con tonos oscuros', 'Perfecto para productos de verano']
    },
    psychology: {
      en: 'Activates intellect, promotes communication and enthusiasm.',
      pt: 'Ativa o intelecto, promove comunicação e entusiasmo.',
      es: 'Activa el intelecto, promueve la comunicación y el entusiasmo.'
    }
  },
  '102': {
    description: {
      en: 'Sunshine Yellow (#FFE500) - pure yellow at maximum saturation, concentrated energy in color.',
      pt: 'Sunshine Yellow (#FFE500) - amarelo puro em máxima saturação, energia concentrada em cor.',
      es: 'Amarillo Sol (#FFE500) - amarillo puro en máxima saturación, energía concentrada en color.'
    },
    usageTips: {
      en: ['Excellent for safety signage', 'Maximum impact in print', 'Use strategically to avoid fatigue'],
      pt: ['Excelente para sinalização de segurança', 'Impacto máximo em impressão', 'Use estrategicamente para não cansar'],
      es: ['Excelente para señalización de seguridad', 'Impacto máximo en impresión', 'Use estratégicamente para no fatigar']
    },
    psychology: {
      en: 'Conveys confidence, power and instant vitality.',
      pt: 'Transmite confiança, poder e vitalidade instantânea.',
      es: 'Transmite confianza, poder y vitalidad instantánea.'
    }
  },
  '103': {
    description: {
      en: 'Saffron (#D5AA00) - earthy golden tone reminiscent of oriental spices and ripe wheat fields.',
      pt: 'Saffron (#D5AA00) - dourado terroso que remete a especiarias orientais e campos de trigo maduros.',
      es: 'Azafrán (#D5AA00) - dorado terroso que remite a especias orientales y campos de trigo maduros.'
    },
    usageTips: {
      en: ['Premium cosmetics', 'Elegant stationery', 'Harmonizes perfectly with browns'],
      pt: ['Premium em cosméticos', 'Elegante em papelaria', 'Harmoniza perfeitamente com marrons'],
      es: ['Premium en cosméticos', 'Elegante en papelería', 'Armoniza perfectamente con marrones']
    },
    psychology: {
      en: 'Suggests abundance, maturity and natural sophistication.',
      pt: 'Sugere abundância, maturidade e sofisticação natural.',
      es: 'Sugiere abundancia, madurez y sofisticación natural.'
    }
  },
  '104': {
    description: {
      en: 'Mustard (#BC9700) - refined mustard with ochre notes, a yellow that tells ancient stories.',
      pt: 'Mustard (#BC9700) - mostarda refinada com notas ocres, um amarelo que conta histórias antigas.',
      es: 'Mostaza (#BC9700) - mostaza refinada con notas ocre, un amarillo que cuenta historias antiguas.'
    },
    usageTips: {
      en: ['Vintage and retro design', 'Fall/winter fashion', 'Perfect for artisanal brands'],
      pt: ['Design vintage e retrô', 'Moda outono/inverno', 'Perfeito para marcas artesanais'],
      es: ['Diseño vintage y retro', 'Moda otoño/invierno', 'Perfecto para marcas artesanales']
    },
    psychology: {
      en: 'Evokes nostalgia, authenticity and comforting warmth.',
      pt: 'Evoca nostalgia, autenticidade e calor reconfortante.',
      es: 'Evoca nostalgia, autenticidad y calor reconfortante.'
    }
  },
  '105': {
    description: {
      en: 'Bronze Gold (#92792A) - deep golden with bronze notes, discreet luxury in every application.',
      pt: 'Bronze Gold (#92792A) - dourado profundo com notas de bronze, luxo discreto em cada aplicação.',
      es: 'Oro Bronce (#92792A) - dorado profundo con notas de bronce, lujo discreto en cada aplicación.'
    },
    usageTips: {
      en: ['Premium beverage labels', 'Hot stamping on packaging', 'Details on leather and wood'],
      pt: ['Rótulos premium de bebidas', 'Hot stamping em embalagens', 'Detalhes em couro e madeira'],
      es: ['Etiquetas premium de bebidas', 'Hot stamping en empaques', 'Detalles en cuero y madera']
    },
    psychology: {
      en: 'Communicates prestige, tradition and enduring value.',
      pt: 'Comunica prestígio, tradição e valor duradouro.',
      es: 'Comunica prestigio, tradición y valor duradero.'
    }
  },
  '106': {
    description: {
      en: 'Bright Canary (#FFE750) - vibrant canary yellow, pure joy and spontaneous energy in every application.',
      pt: 'Canário Brilhante (#FFE750) - amarelo canário vibrante, alegria pura e energia espontânea em cada aplicação.',
      es: 'Canario Brillante (#FFE750) - amarillo canario vibrante, alegría pura y energía espontánea en cada aplicación.'
    },
    usageTips: {
      en: ['Toys and children\'s products', 'Promotional marketing', 'Safety signage'],
      pt: ['Brinquedos e infantil', 'Marketing promocional', 'Sinalização de segurança'],
      es: ['Juguetes e infantil', 'Marketing promocional', 'Señalización de seguridad']
    },
    psychology: {
      en: 'Inspires happiness, spontaneity and playful fun.',
      pt: 'Inspira felicidade, espontaneidade e diversão.',
      es: 'Inspira felicidad, espontaneidad y diversión.'
    }
  },
  '107': {
    description: {
      en: 'Zenith Yellow (#FFDF20) - sun at its peak, absolute clarity that illuminates any composition.',
      pt: 'Amarelo Zênite (#FFDF20) - sol em seu zênite, claridade absoluta que ilumina qualquer composição.',
      es: 'Amarillo Cenit (#FFDF20) - sol en su cenit, claridad absoluta que ilumina cualquier composición.'
    },
    usageTips: {
      en: ['Impactful logos', 'Shelf emphasis', 'Digital and print'],
      pt: ['Logotipos impactantes', 'Destaque em prateleiras', 'Digital e impresso'],
      es: ['Logotipos impactantes', 'Énfasis en estantes', 'Digital e impreso']
    },
    psychology: {
      en: 'Attracts immediate attention, contagious optimism.',
      pt: 'Atrai atenção imediata, otimismo contagiante.',
      es: 'Atrae atención inmediata, optimismo contagioso.'
    }
  },
  '108': {
    description: {
      en: 'Cadmium Yellow (#FFD800) - artist\'s cadmium, intense saturation that dominates visual space.',
      pt: 'Amarelo Cádmio (#FFD800) - cádmio de artista, saturação intensa que domina o espaço visual.',
      es: 'Amarillo Cadmio (#FFD800) - cadmio de artista, saturación intensa que domina el espacio visual.'
    },
    usageTips: {
      en: ['Art and graphic design', 'Posters and billboards', 'Streetwear fashion'],
      pt: ['Arte e design gráfico', 'Posters e cartazes', 'Moda streetwear'],
      es: ['Arte y diseño gráfico', 'Pósters y carteles', 'Moda urbana']
    },
    psychology: {
      en: 'Expresses boldness, individuality and creative energy.',
      pt: 'Expressa ousadia, individualidade e energia criativa.',
      es: 'Expresa audacia, individualidad y energía creativa.'
    }
  },
  '109': {
    description: {
      en: 'Sunflower Gold (#FFCB00) - sunflower in full bloom, nature captured in chromatic spectrum.',
      pt: 'Ouro Girassol (#FFCB00) - girassol em plena floração, natureza capturada em espectro cromático.',
      es: 'Oro Girasol (#FFCB00) - girasol en plena floración, naturaleza capturada en espectro cromático.'
    },
    usageTips: {
      en: ['Natural products', 'Organic foods', 'Sustainable branding'],
      pt: ['Produtos naturais', 'Alimentos orgânicos', 'Branding sustentável'],
      es: ['Productos naturales', 'Alimentos orgánicos', 'Branding sostenible']
    },
    psychology: {
      en: 'Connects with nature, growth and vitality.',
      pt: 'Conecta com natureza, crescimento e vitalidade.',
      es: 'Conecta con la naturaleza, crecimiento y vitalidad.'
    }
  },
  '110': {
    description: {
      en: 'Antique Gold (#EBA800) - ancient gold with patina, wealth that transcends passing trends.',
      pt: 'Ouro Antigo (#EBA800) - ouro com pátina, riqueza que transcende modismos passageiros.',
      es: 'Oro Antiguo (#EBA800) - oro con pátina, riqueza que trasciende modas pasajeras.'
    },
    usageTips: {
      en: ['Jewelry and luxury', 'Special packaging', 'Invitations and certificates'],
      pt: ['Joalheria e luxo', 'Embalagens especiais', 'Convites e certificados'],
      es: ['Joyería y lujo', 'Empaques especiales', 'Invitaciones y certificados']
    },
    psychology: {
      en: 'Symbolizes achievement, excellence and timeless value.',
      pt: 'Simboliza conquista, excelência e valor atemporal.',
      es: 'Simboliza logro, excelencia y valor atemporal.'
    }
  },
  '111': {
    description: {
      en: 'Amber Gold (#BE8B00) - deep amber, concentrated richness in intense saturation.',
      pt: 'Ouro Âmbar (#BE8B00) - âmbar profundo, riqueza concentrada em saturação intensa.',
      es: 'Oro Ámbar (#BE8B00) - ámbar profundo, riqueza concentrada en saturación intensa.'
    },
    usageTips: {
      en: ['Premium spirits', 'Autumn collections', 'Heritage brands'],
      pt: ['Destilados premium', 'Coleções outono', 'Marcas tradicionais'],
      es: ['Destilados premium', 'Colecciones otoño', 'Marcas tradicionales']
    },
    psychology: {
      en: 'Evokes warmth, tradition and refined taste.',
      pt: 'Evoca calor, tradição e gosto refinado.',
      es: 'Evoca calidez, tradición y gusto refinado.'
    }
  },
  '112': {
    description: {
      en: 'Bronze (#A98009) - deep bronze, earthy elegance with metallic sophistication.',
      pt: 'Bronze (#A98009) - bronze profundo, elegância terrosa com sofisticação metálica.',
      es: 'Bronce (#A98009) - bronce profundo, elegancia terrosa con sofisticación metálica.'
    },
    usageTips: {
      en: ['Craft beer', 'Artisanal products', 'Masculine luxury'],
      pt: ['Cerveja artesanal', 'Produtos artesanais', 'Luxo masculino'],
      es: ['Cerveza artesanal', 'Productos artesanales', 'Lujo masculino']
    },
    psychology: {
      en: 'Communicates authenticity, craftsmanship and enduring quality.',
      pt: 'Comunica autenticidade, artesanato e qualidade duradoura.',
      es: 'Comunica autenticidad, artesanía y calidad duradera.'
    }
  },
  '113': {
    description: {
      en: 'Buttercup (#FFDF66) - soft buttercup yellow, gentle warmth without overwhelming brightness.',
      pt: 'Ranúnculo (#FFDF66) - amarelo ranúnculo suave, calor gentil sem brilho excessivo.',
      es: 'Ranúnculo (#FFDF66) - amarillo ranúnculo suave, calidez gentil sin brillo excesivo.'
    },
    usageTips: {
      en: ['Spring collections', 'Gentle branding', 'Children\'s books'],
      pt: ['Coleções primavera', 'Branding gentil', 'Livros infantis'],
      es: ['Colecciones primavera', 'Branding gentil', 'Libros infantiles']
    },
    psychology: {
      en: 'Conveys gentleness, comfort and approachability.',
      pt: 'Transmite gentileza, conforto e acessibilidade.',
      es: 'Transmite gentileza, comodidad y accesibilidad.'
    }
  },
  '114': {
    description: {
      en: 'Lemon Chiffon (#FDDD5B) - lemon chiffon, airy lightness with citric freshness.',
      pt: 'Chiffon Limão (#FDDD5B) - chiffon de limão, leveza aérea com frescor cítrico.',
      es: 'Chifón Limón (#FDDD5B) - chifón de limón, ligereza aérea con frescor cítrico.'
    },
    usageTips: {
      en: ['Summer fashion', 'Citrus products', 'Light and fresh branding'],
      pt: ['Moda verão', 'Produtos cítricos', 'Branding leve e fresco'],
      es: ['Moda verano', 'Productos cítricos', 'Branding ligero y fresco']
    },
    psychology: {
      en: 'Evokes freshness, lightness and joyful energy.',
      pt: 'Evoca frescor, leveza e energia alegre.',
      es: 'Evoca frescura, ligereza y energía alegre.'
    }
  },
  '115': {
    description: {
      en: 'Golden Poppy (#FFD848) - golden poppy, California sunshine captured in pigment.',
      pt: 'Papoula Dourada (#FFD848) - papoula dourada, sol californiano capturado em pigmento.',
      es: 'Amapola Dorada (#FFD848) - amapola dorada, sol californiano capturado en pigmento.'
    },
    usageTips: {
      en: ['Surf and beach brands', 'West coast aesthetics', 'Outdoor products'],
      pt: ['Marcas surf e praia', 'Estética costa oeste', 'Produtos outdoor'],
      es: ['Marcas surf y playa', 'Estética costa oeste', 'Productos outdoor']
    },
    psychology: {
      en: 'Communicates adventure, freedom and sunny disposition.',
      pt: 'Comunica aventura, liberdade e disposição solar.',
      es: 'Comunica aventura, libertad y disposición solar.'
    }
  },
  '116': {
    description: {
      en: 'Dandelion (#FCCC23) - dandelion yellow, cheerful and impossible to ignore.',
      pt: 'Dente-de-leão (#FCCC23) - amarelo dente-de-leão, alegre e impossível de ignorar.',
      es: 'Diente de León (#FCCC23) - amarillo diente de león, alegre e imposible de ignorar.'
    },
    usageTips: {
      en: ['Children\'s products', 'Happy branding', 'Seasonal promotions'],
      pt: ['Produtos infantis', 'Branding alegre', 'Promoções sazonais'],
      es: ['Productos infantiles', 'Branding alegre', 'Promociones estacionales']
    },
    psychology: {
      en: 'Inspires playfulness, optimism and carefree joy.',
      pt: 'Inspira ludicidade, otimismo e alegria despreocupada.',
      es: 'Inspira ludismo, optimismo y alegría despreocupada.'
    }
  },
  '117': {
    description: {
      en: 'Honey Gold (#D89A08) - honey gold, viscous richness with natural sweetness.',
      pt: 'Ouro Mel (#D89A08) - ouro mel, riqueza viscosa com doçura natural.',
      es: 'Oro Miel (#D89A08) - oro miel, riqueza viscosa con dulzura natural.'
    },
    usageTips: {
      en: ['Natural honey', 'Organic products', 'Warm autumn palettes'],
      pt: ['Mel natural', 'Produtos orgânicos', 'Paletas outono quente'],
      es: ['Miel natural', 'Productos orgánicos', 'Paletas otoño cálido']
    },
    psychology: {
      en: 'Evokes warmth, nourishment and natural goodness.',
      pt: 'Evoca calor, nutrição e bondade natural.',
      es: 'Evoca calidez, nutrición y bondad natural.'
    }
  },
  '118': {
    description: {
      en: 'Ochre (#BF880B) - earthy ochre, ancient pigment with timeless appeal.',
      pt: 'Ocre (#BF880B) - ocre terroso, pigmento ancestral com apelo atemporal.',
      es: 'Ocre (#BF880B) - ocre terroso, pigmento ancestral con atractivo atemporal.'
    },
    usageTips: {
      en: ['Rustic design', 'Heritage brands', 'Earthy aesthetics'],
      pt: ['Design rústico', 'Marcas tradicionais', 'Estética terrosa'],
      es: ['Diseño rústico', 'Marcas tradicionales', 'Estética terrosa']
    },
    psychology: {
      en: 'Suggests groundedness, authenticity and ancient wisdom.',
      pt: 'Sugere enraizamento, autenticidade e sabedoria ancestral.',
      es: 'Sugiere arraigo, autenticidad y sabiduría ancestral.'
    }
  },
  '119': {
    description: {
      en: 'Brass (#98782E) - aged brass, metallic warmth with vintage character.',
      pt: 'Latão (#98782E) - latão envelhecido, calor metálico com caráter vintage.',
      es: 'Latón (#98782E) - latón envejecido, calidez metálica con carácter vintage.'
    },
    usageTips: {
      en: ['Vintage hardware', 'Retro design', 'Industrial chic'],
      pt: ['Hardware vintage', 'Design retrô', 'Industrial chic'],
      es: ['Hardware vintage', 'Diseño retro', 'Industrial chic']
    },
    psychology: {
      en: 'Communicates nostalgia, craftsmanship and lasting quality.',
      pt: 'Comunica nostalgia, artesanato e qualidade duradoura.',
      es: 'Comunica nostalgia, artesanía y calidad duradera.'
    }
  },
  '120': {
    description: {
      en: 'Buttercream (#FCD86E) - soft buttercream yellow, sweetness in visual form.',
      pt: 'Amarelo Manteiga (#FCD86E) - amarelo manteiga suave, doçura em forma visual.',
      es: 'Amarillo Mantequilla (#FCD86E) - amarillo mantequilla suave, dulzura en forma visual.'
    },
    usageTips: {
      en: ['Bakery branding', 'Children products', 'Spring campaigns'],
      pt: ['Branding de confeitaria', 'Produtos infantis', 'Campanhas de primavera'],
      es: ['Branding de pastelería', 'Productos infantiles', 'Campañas de primavera']
    },
    psychology: {
      en: 'Evokes warmth, happiness and gentle optimism.',
      pt: 'Evoca calor, felicidade e otimismo gentil.',
      es: 'Evoca calidez, felicidad y optimismo gentil.'
    }
  },
  '130': {
    description: {
      en: 'Marigold (#F6A61B) - vibrant marigold orange, festival color that celebrates life.',
      pt: 'Calêndula (#F6A61B) - laranja calêndula vibrante, cor de festival que celebra a vida.',
      es: 'Caléndula (#F6A61B) - naranja caléndula vibrante, color de festival que celebra la vida.'
    },
    usageTips: {
      en: ['Festival branding', 'Sports teams', 'Energy products'],
      pt: ['Branding de festivais', 'Times esportivos', 'Produtos energéticos'],
      es: ['Branding de festivales', 'Equipos deportivos', 'Productos energéticos']
    },
    psychology: {
      en: 'Communicates enthusiasm, celebration and joyful energy.',
      pt: 'Comunica entusiasmo, celebração e energia alegre.',
      es: 'Comunica entusiasmo, celebración y energía alegre.'
    }
  },
  '140': {
    description: {
      en: 'Burnt Umber (#80541B) - deep burnt umber, earth\'s richest brown with warmth.',
      pt: 'Terra Queimada (#80541B) - terra queimada profunda, o marrom mais rico da terra com calor.',
      es: 'Tierra Quemada (#80541B) - tierra quemada profunda, el marrón más rico de la tierra con calidez.'
    },
    usageTips: {
      en: ['Artisan products', 'Autumn collections', 'Natural cosmetics'],
      pt: ['Produtos artesanais', 'Coleções de outono', 'Cosméticos naturais'],
      es: ['Productos artesanales', 'Colecciones de otoño', 'Cosméticos naturales']
    },
    psychology: {
      en: 'Suggests earthiness, authenticity and grounded stability.',
      pt: 'Sugere terrosidade, autenticidade e estabilidade enraizada.',
      es: 'Sugiere terrosidad, autenticidad y estabilidad arraigada.'
    }
  },
  '150': {
    description: {
      en: 'Apricot (#F4AA56) - ripe apricot, summer fruit captured in color.',
      pt: 'Damasco (#F4AA56) - damasco maduro, fruta de verão capturada em cor.',
      es: 'Albaricoque (#F4AA56) - albaricoque maduro, fruta de verano capturada en color.'
    },
    usageTips: {
      en: ['Food packaging', 'Summer fashion', 'Beach resorts'],
      pt: ['Embalagens de alimentos', 'Moda verão', 'Resorts de praia'],
      es: ['Embalajes de alimentos', 'Moda verano', 'Resorts de playa']
    },
    psychology: {
      en: 'Evokes warmth, sweetness and summer nostalgia.',
      pt: 'Evoca calor, doçura e nostalgia de verão.',
      es: 'Evoca calidez, dulzura y nostalgia de verano.'
    }
  },
  '160': {
    description: {
      en: 'Cinnamon (#AB581F) - warm cinnamon spice, aromatic visual experience.',
      pt: 'Canela (#AB581F) - especiaria canela quente, experiência visual aromática.',
      es: 'Canela (#AB581F) - especia canela cálida, experiencia visual aromática.'
    },
    usageTips: {
      en: ['Spice brands', 'Fall collections', 'Cozy interiors'],
      pt: ['Marcas de especiarias', 'Coleções de outono', 'Interiores aconchegantes'],
      es: ['Marcas de especias', 'Colecciones de otoño', 'Interiores acogedores']
    },
    psychology: {
      en: 'Communicates warmth, comfort and inviting coziness.',
      pt: 'Comunica calor, conforto e aconchego convidativo.',
      es: 'Comunica calidez, confort y acogedor confort.'
    }
  },
  '170': {
    description: {
      en: 'Coral Peach (#EC8672) - soft coral peach, tropical sunset in gentle tones.',
      pt: 'Coral Pêssego (#EC8672) - coral pêssego suave, pôr do sol tropical em tons gentis.',
      es: 'Coral Melocotón (#EC8672) - coral melocotón suave, atardecer tropical en tonos gentiles.'
    },
    usageTips: {
      en: ['Beauty products', 'Resort wear', 'Tropical branding'],
      pt: ['Produtos de beleza', 'Resort wear', 'Branding tropical'],
      es: ['Productos de belleza', 'Resort wear', 'Branding tropical']
    },
    psychology: {
      en: 'Suggests freshness, femininity and tropical warmth.',
      pt: 'Sugere frescor, feminilidade e calor tropical.',
      es: 'Sugiere frescura, feminidad y calidez tropical.'
    }
  },
  
  // LARANJAS
  'Orange': {
    description: {
      en: 'Citric energy that pulses with vitality, tropical warmth in pigment form.',
      pt: 'Energia cítrica que pulsa com vitalidade, calor tropical em pigmento.',
      es: 'Energía cítrica que pulsa con vitalidad, calidez tropical en pigmento.'
    },
    usageTips: {
      en: ['Food & beverage', 'Sports and fitness', 'Digital call-to-action'],
      pt: ['Food & beverage', 'Esportes e fitness', 'Call-to-action digital'],
      es: ['Food & beverage', 'Deportes y fitness', 'Call-to-action digital']
    },
    psychology: {
      en: 'Stimulates appetite, enthusiasm and social interaction.',
      pt: 'Estimula apetite, entusiasmo e interação social.',
      es: 'Estimula apetito, entusiasmo e interacción social.'
    }
  },
  '021': {
    description: {
      en: 'The definitive orange, vibrant and unmistakable in any application.',
      pt: 'O laranja definitivo, vibrante e inconfundível em qualquer aplicação.',
      es: 'El naranja definitivo, vibrante e inconfundible en cualquier aplicación.'
    },
    usageTips: {
      en: ['Alert signage', 'Safety uniforms', 'Aggressive marketing'],
      pt: ['Sinalização de alerta', 'Uniformes de segurança', 'Marketing agressivo'],
      es: ['Señalización de alerta', 'Uniformes de seguridad', 'Marketing agresivo']
    },
    psychology: {
      en: 'Communicates urgency, energy and determination.',
      pt: 'Comunica urgência, energia e determinação.',
      es: 'Comunica urgencia, energía y determinación.'
    }
  },
  '1505': {
    description: {
      en: 'Succulent tangerine, citric freshness that awakens all senses.',
      pt: 'Tangerina suculenta, frescor cítrico que desperta todos os sentidos.',
      es: 'Mandarina suculenta, frescor cítrico que despierta todos los sentidos.'
    },
    usageTips: {
      en: ['Beverages and juices', 'Summer and beach', 'Refreshing products'],
      pt: ['Bebidas e sucos', 'Verão e praia', 'Produtos refrescantes'],
      es: ['Bebidas y jugos', 'Verano y playa', 'Productos refrescantes']
    },
    psychology: {
      en: 'Evokes refreshment, youth and playful fun.',
      pt: 'Evoca refrescância, juventude e diversão.',
      es: 'Evoca frescura, juventud y diversión.'
    }
  },
  '1585': {
    description: {
      en: 'Electric orange with neon intensity, impossible to ignore.',
      pt: 'Laranja elétrico com intensidade neon, impossível de ignorar.',
      es: 'Naranja eléctrico con intensidad neón, imposible de ignorar.'
    },
    usageTips: {
      en: ['Extreme sports', 'Festivals and events', 'Youth technology'],
      pt: ['Esportes radicais', 'Festivais e eventos', 'Tecnologia jovem'],
      es: ['Deportes extremos', 'Festivales y eventos', 'Tecnología joven']
    },
    psychology: {
      en: 'Conveys adrenaline, modernity and boldness.',
      pt: 'Transmite adrenalina, modernidade e ousadia.',
      es: 'Transmite adrenalina, modernidad y audacia.'
    }
  },
  '1645': {
    description: {
      en: 'Sun-ripened peach, visual sweetness that welcomes gently.',
      pt: 'Pêssego amadurecido ao sol, doçura visual que acolhe gentilmente.',
      es: 'Melocotón madurado al sol, dulzura visual que acoge gentilmente.'
    },
    usageTips: {
      en: ['Cosmetics and skincare', 'Women\'s fashion', 'Residential decor'],
      pt: ['Cosméticos e skincare', 'Moda feminina', 'Decoração residencial'],
      es: ['Cosméticos y skincare', 'Moda femenina', 'Decoración residencial']
    },
    psychology: {
      en: 'Suggests delicacy, care and soft femininity.',
      pt: 'Sugere delicadeza, cuidado e feminilidade suave.',
      es: 'Sugiere delicadeza, cuidado y feminidad suave.'
    }
  },
  '1665': {
    description: {
      en: 'Red-orange burning like ember, passion at maximum temperature.',
      pt: 'Vermelho-laranja que queima como brasa, paixão em temperatura máxima.',
      es: 'Rojo-naranja que quema como brasa, pasión a temperatura máxima.'
    },
    usageTips: {
      en: ['Spicy gastronomy', 'Combat sports', 'Bold brands'],
      pt: ['Gastronomia picante', 'Esportes de combate', 'Marcas ousadas'],
      es: ['Gastronomía picante', 'Deportes de combate', 'Marcas audaces']
    },
    psychology: {
      en: 'Expresses intensity, courage and determination.',
      pt: 'Expressa intensidade, coragem e determinação.',
      es: 'Expresa intensidad, coraje y determinación.'
    }
  },
  
  // VERMELHOS
  'Red': {
    description: {
      en: 'Passion distilled into pure color, the red that moves mountains.',
      pt: 'Paixão destilada em cor pura, o vermelho que move montanhas.',
      es: 'Pasión destilada en color puro, el rojo que mueve montañas.'
    },
    usageTips: {
      en: ['Fashion and luxury', 'Premium food', 'Emphasis in any media'],
      pt: ['Moda e luxo', 'Alimentação premium', 'Destaque em qualquer mídia'],
      es: ['Moda y lujo', 'Alimentación premium', 'Énfasis en cualquier medio']
    },
    psychology: {
      en: 'Evokes passion, power and irresistible desire.',
      pt: 'Evoca paixão, poder e desejo irresistível.',
      es: 'Evoca pasión, poder y deseo irresistible.'
    }
  },
  '185': {
    description: {
      en: 'Crimson Red (#E42B44) - the iconic red, instantly recognizable and universally impactful.',
      pt: 'Crimson Red (#E42B44) - o vermelho icônico, instantaneamente reconhecível e universalmente impactante.',
      es: 'Rojo Carmesí (#E42B44) - el rojo icónico, instantáneamente reconocible y universalmente impactante.'
    },
    usageTips: {
      en: ['Global and corporate branding', 'Food & beverage', 'Promotions and sales requiring attention'],
      pt: ['Branding global e corporativo', 'Food & beverage', 'Promoções e vendas que exigem atenção'],
      es: ['Branding global y corporativo', 'Food & beverage', 'Promociones y ventas que requieren atención']
    },
    psychology: {
      en: 'Activates immediate desire, stimulates purchase impulse and creates urgency.',
      pt: 'Ativa desejo imediato, estimula impulso de compra e cria urgência.',
      es: 'Activa el deseo inmediato, estimula el impulso de compra y crea urgencia.'
    }
  },
  '186': {
    description: {
      en: 'Ruby Red (#D52746) - deep royal crimson, the color of royalty and established power.',
      pt: 'Ruby Red (#D52746) - carmesim real profundo, a cor da realeza e do poder estabelecido.',
      es: 'Rojo Rubí (#D52746) - carmesí real profundo, el color de la realeza y el poder establecido.'
    },
    usageTips: {
      en: ['Premium institutional', 'Wines and luxury gastronomy', 'High fashion'],
      pt: ['Institucional premium', 'Vinhos e gastronomia de luxo', 'Moda de alta costura'],
      es: ['Institucional premium', 'Vinos y gastronomía de lujo', 'Alta costura']
    },
    psychology: {
      en: 'Communicates authority, tradition and enduring prestige.',
      pt: 'Comunica autoridade, tradição e prestígio duradouro.',
      es: 'Comunica autoridad, tradición y prestigio duradero.'
    }
  },
  '187': {
    description: {
      en: 'Deep red like velvet, tactile luxury in visual form.',
      pt: 'Vermelho profundo como veludo, luxo tátil em forma visual.',
      es: 'Rojo profundo como terciopelo, lujo táctil en forma visual.'
    },
    usageTips: {
      en: ['Theater and entertainment', 'Fine chocolates', 'Exclusive invitations'],
      pt: ['Teatro e entretenimento', 'Chocolates finos', 'Convites exclusivos'],
      es: ['Teatro y entretenimiento', 'Chocolates finos', 'Invitaciones exclusivas']
    },
    psychology: {
      en: 'Suggests opulence, romance and sophistication.',
      pt: 'Sugere opulência, romance e sofisticação.',
      es: 'Sugiere opulencia, romance y sofisticación.'
    }
  },
  '188': {
    description: {
      en: 'Burgundy Wine (#7A2839) - deep burgundy, wine cellar sophistication.',
      pt: 'Vinho Borgonha (#7A2839) - borgonha profundo, sofisticação de adega.',
      es: 'Vino Borgoña (#7A2839) - borgoña profundo, sofisticación de bodega.'
    },
    usageTips: {
      en: ['Wine labels', 'Luxury fashion', 'Fine dining'],
      pt: ['Rótulos de vinho', 'Moda de luxo', 'Gastronomia refinada'],
      es: ['Etiquetas de vino', 'Moda de lujo', 'Gastronomía refinada']
    },
    psychology: {
      en: 'Evokes richness, maturity and refined taste.',
      pt: 'Evoca riqueza, maturidade e gosto refinado.',
      es: 'Evoca riqueza, madurez y gusto refinado.'
    }
  },
  '192': {
    description: {
      en: 'Hot Pink Red (#E4284C) - electric pink-red, energy that cannot be ignored.',
      pt: 'Rosa-Vermelho Quente (#E4284C) - rosa-vermelho elétrico, energia impossível de ignorar.',
      es: 'Rosa-Rojo Caliente (#E4284C) - rosa-rojo eléctrico, energía imposible de ignorar.'
    },
    usageTips: {
      en: ['Youth marketing', 'Bold fashion', 'Attention-grabbing campaigns'],
      pt: ['Marketing jovem', 'Moda ousada', 'Campanhas de impacto'],
      es: ['Marketing joven', 'Moda audaz', 'Campañas de impacto']
    },
    psychology: {
      en: 'Communicates boldness, confidence and youthful energy.',
      pt: 'Comunica ousadia, confiança e energia jovem.',
      es: 'Comunica audacia, confianza y energía juvenil.'
    }
  },
  '194': {
    description: {
      en: 'Berry Red (#A5324B) - deep berry red, fruit-inspired richness.',
      pt: 'Vermelho Cereja (#A5324B) - vermelho cereja profundo, riqueza inspirada em frutas.',
      es: 'Rojo Cereza (#A5324B) - rojo cereza profundo, riqueza inspirada en frutas.'
    },
    usageTips: {
      en: ['Fruit products', 'Autumn fashion', 'Gourmet branding'],
      pt: ['Produtos de frutas', 'Moda outono', 'Branding gourmet'],
      es: ['Productos de frutas', 'Moda otoño', 'Branding gourmet']
    },
    psychology: {
      en: 'Suggests naturalness, indulgence and earthy sophistication.',
      pt: 'Sugere naturalidade, indulgência e sofisticação terrosa.',
      es: 'Sugiere naturalidad, indulgencia y sofisticación terrosa.'
    }
  },
  '199': {
    description: {
      en: 'Pink-red vibrant, feminine with attitude and personality.',
      pt: 'Rosa-vermelho vibrante, feminino com atitude e personalidade.',
      es: 'Rosa-rojo vibrante, femenino con actitud y personalidad.'
    },
    usageTips: {
      en: ['Cosmetics', 'Contemporary fashion', 'Feminine branding'],
      pt: ['Cosméticos', 'Moda contemporânea', 'Branding feminino'],
      es: ['Cosméticos', 'Moda contemporánea', 'Branding femenino']
    },
    psychology: {
      en: 'Expresses confidence, modern femininity.',
      pt: 'Expressa confiança, feminilidade moderna.',
      es: 'Expresa confianza, feminidad moderna.'
    }
  },
  '200': {
    description: {
      en: 'Bright cherry red, visual sweetness with a touch of seduction.',
      pt: 'Vermelho cereja brilhante, doçura visual com um toque de sedução.',
      es: 'Rojo cereza brillante, dulzura visual con un toque de seducción.'
    },
    usageTips: {
      en: ['Confectionery', 'Lips and makeup', 'Pop design'],
      pt: ['Confeitaria', 'Lábios e maquiagem', 'Design pop'],
      es: ['Confitería', 'Labios y maquillaje', 'Diseño pop']
    },
    psychology: {
      en: 'Evokes temptation, pleasure and indulgence.',
      pt: 'Evoca tentação, prazer e indulgência.',
      es: 'Evoca tentación, placer e indulgencia.'
    }
  },
  '201': {
    description: {
      en: 'Elegant burgundy, wine aged in French oak barrels.',
      pt: 'Bordô elegante, vinho envelhecido em carvalho francês.',
      es: 'Burdeos elegante, vino envejecido en roble francés.'
    },
    usageTips: {
      en: ['Wineries', 'Law and advocacy', 'Exclusive clubs'],
      pt: ['Vinícolas', 'Advocacia e direito', 'Clubes exclusivos'],
      es: ['Bodegas', 'Abogacía y derecho', 'Clubes exclusivos']
    },
    psychology: {
      en: 'Conveys maturity, wisdom and refinement.',
      pt: 'Transmite maturidade, sabedoria e refinamento.',
      es: 'Transmite madurez, sabiduría y refinamiento.'
    }
  },
  '202': {
    description: {
      en: 'Sophisticated marsala, earthy and contemporary in equal measure.',
      pt: 'Marsala sofisticado, terroso e contemporâneo em igual medida.',
      es: 'Marsala sofisticado, terroso y contemporáneo en igual medida.'
    },
    usageTips: {
      en: ['Fall fashion', 'Cozy interiors', 'Artisanal gastronomy'],
      pt: ['Moda outono', 'Interiores acolhedores', 'Gastronomia artesanal'],
      es: ['Moda otoño', 'Interiores acogedores', 'Gastronomía artesanal']
    },
    psychology: {
      en: 'Suggests authenticity, human warmth and connection.',
      pt: 'Sugere autenticidade, calor humano e conexão.',
      es: 'Sugiere autenticidad, calidez humana y conexión.'
    }
  },
  '1788': {
    description: {
      en: 'Vibrant coral red, tropical energy meets urban sophistication.',
      pt: 'Vermelho coral vibrante, energia tropical encontra sofisticação urbana.',
      es: 'Rojo coral vibrante, energía tropical encuentra sofisticación urbana.'
    },
    usageTips: {
      en: ['Resorts and summer', 'Tropical design', 'Modern decor'],
      pt: ['Resort e verão', 'Design tropical', 'Decoração moderna'],
      es: ['Resort y verano', 'Diseño tropical', 'Decoración moderna']
    },
    psychology: {
      en: 'Communicates liveliness, optimism and adventure.',
      pt: 'Comunica vivacidade, otimismo e aventura.',
      es: 'Comunica vivacidad, optimismo y aventura.'
    }
  },
  '1797': {
    description: {
      en: 'Ripe tomato red, appetizing naturalness in every application.',
      pt: 'Vermelho tomate maduro, naturalidade apetitosa em cada aplicação.',
      es: 'Rojo tomate maduro, naturalidad apetitosa en cada aplicación.'
    },
    usageTips: {
      en: ['Organic and natural', 'Italian restaurants', 'Fresh products'],
      pt: ['Orgânicos e naturais', 'Restaurantes italianos', 'Produtos frescos'],
      es: ['Orgánicos y naturales', 'Restaurantes italianos', 'Productos frescos']
    },
    psychology: {
      en: 'Evokes freshness, health and authenticity.',
      pt: 'Evoca frescor, saúde e autenticidade.',
      es: 'Evoca frescura, salud y autenticidad.'
    }
  },
  
  // ROSAS E MAGENTAS
  'Magenta': {
    description: {
      en: 'Electrifying and impossible to ignore, magenta is chromatic rebellion.',
      pt: 'Eletrizante e impossível de ignorar, magenta é rebeldia cromática.',
      es: 'Electrizante e imposible de ignorar, magenta es rebeldía cromática.'
    },
    usageTips: {
      en: ['Avant-garde fashion', 'Contemporary art', 'Tech and innovation'],
      pt: ['Moda vanguarda', 'Arte contemporânea', 'Tech e inovação'],
      es: ['Moda vanguardista', 'Arte contemporáneo', 'Tech e innovación']
    },
    psychology: {
      en: 'Expresses originality, creativity and nonconformity.',
      pt: 'Expressa originalidade, criatividade e não-conformismo.',
      es: 'Expresa originalidad, creatividad y no-conformidad.'
    }
  },
  'Rhodamine Red': {
    description: {
      en: 'Shocking pink that defies conventions, feminine without being delicate.',
      pt: 'Rosa choque que desafia convenções, feminino sem ser delicado.',
      es: 'Rosa choque que desafía convenciones, femenino sin ser delicado.'
    },
    usageTips: {
      en: ['Bold cosmetics', 'Streetwear', 'Disruptive marketing'],
      pt: ['Cosméticos ousados', 'Streetwear', 'Marketing disruptivo'],
      es: ['Cosméticos audaces', 'Streetwear', 'Marketing disruptivo']
    },
    psychology: {
      en: 'Conveys feminine power, independence and boldness.',
      pt: 'Transmite poder feminino, independência e ousadia.',
      es: 'Transmite poder femenino, independencia y audacia.'
    }
  },
  '213': {
    description: {
      en: 'Baby pink with personality, delicacy that is not fragility.',
      pt: 'Rosa bebê com personalidade, delicadeza que não é fragilidade.',
      es: 'Rosa bebé con personalidad, delicadeza que no es fragilidad.'
    },
    usageTips: {
      en: ['Children products', 'Spa and wellness', 'Delicate packaging'],
      pt: ['Produtos infantis', 'Spa e wellness', 'Embalagens delicadas'],
      es: ['Productos infantiles', 'Spa y wellness', 'Embalajes delicados']
    },
    psychology: {
      en: 'Evokes tenderness, care and innocence.',
      pt: 'Evoca ternura, cuidado e inocência.',
      es: 'Evoca ternura, cuidado e inocencia.'
    }
  },
  '214': {
    description: {
      en: 'Magenta Fuchsia (#D81F6B) - hot magenta, vibrant femininity with bold attitude.',
      pt: 'Magenta Fúcsia (#D81F6B) - magenta quente, feminilidade vibrante com atitude ousada.',
      es: 'Magenta Fucsia (#D81F6B) - magenta caliente, feminidad vibrante con actitud audaz.'
    },
    usageTips: {
      en: ['Bold fashion', 'Cosmetics', 'Youth branding'],
      pt: ['Moda ousada', 'Cosméticos', 'Branding jovem'],
      es: ['Moda audaz', 'Cosméticos', 'Branding joven']
    },
    psychology: {
      en: 'Communicates confidence, boldness and modern femininity.',
      pt: 'Comunica confiança, ousadia e feminilidade moderna.',
      es: 'Comunica confianza, audacia y feminidad moderna.'
    }
  },
  '215': {
    description: {
      en: 'Hot Pink (#B4215B) - vibrant bubble gum pink, pop culture in color form.',
      pt: 'Rosa Chiclete (#B4215B) - rosa chiclete vibrante, pop culture em forma de cor.',
      es: 'Rosa Chicle (#B4215B) - rosa chicle vibrante, pop culture en forma de color.'
    },
    usageTips: {
      en: ['Teen fashion', 'Fun accessories', 'Social media brands'],
      pt: ['Moda teen', 'Acessórios fun', 'Marcas de social media'],
      es: ['Moda teen', 'Accesorios divertidos', 'Marcas de redes sociales']
    },
    psychology: {
      en: 'Communicates fun, youth and casualness.',
      pt: 'Comunica diversão, juventude e descontração.',
      es: 'Comunica diversión, juventud y desenfado.'
    }
  },
  '219': {
    description: {
      en: 'Vibrant Fuchsia (#E33187) - intense fuchsia, glamour that makes no apologies.',
      pt: 'Fúcsia Vibrante (#E33187) - fúcsia intenso, glamour que não pede desculpas.',
      es: 'Fucsia Vibrante (#E33187) - fucsia intenso, glamour que no pide disculpas.'
    },
    usageTips: {
      en: ['Evening fashion', 'Nightlife and entertainment', 'Bold beauty'],
      pt: ['Moda noturna', 'Clubes e entretenimento', 'Beleza bold'],
      es: ['Moda nocturna', 'Clubes y entretenimiento', 'Belleza atrevida']
    },
    psychology: {
      en: 'Expresses glamour, sensuality and confidence.',
      pt: 'Expressa glamour, sensualidade e confiança.',
      es: 'Expresa glamour, sensualidad y confianza.'
    }
  },
  '225': {
    description: {
      en: 'Raspberry Pink (#E03D8D) - raspberry pink, sweet tartness in visual form.',
      pt: 'Rosa Framboesa (#E03D8D) - rosa framboesa, acidez doce em forma visual.',
      es: 'Rosa Frambuesa (#E03D8D) - rosa frambuesa, acidez dulce en forma visual.'
    },
    usageTips: {
      en: ['Fruit products', 'Summer fashion', 'Youth cosmetics'],
      pt: ['Produtos de frutas', 'Moda verão', 'Cosméticos jovens'],
      es: ['Productos de frutas', 'Moda verano', 'Cosméticos jóvenes']
    },
    psychology: {
      en: 'Evokes freshness, energy and youthful vitality.',
      pt: 'Evoca frescor, energia e vitalidade jovem.',
      es: 'Evoca frescura, energía y vitalidad juvenil.'
    }
  },
  '226': {
    description: {
      en: 'Shocking Pink (#DE177E) - Schiaparelli shocking pink, art and fashion in constant dialogue.',
      pt: 'Rosa Shocking (#DE177E) - rosa shocking de Schiaparelli, arte e moda em diálogo constante.',
      es: 'Rosa Shocking (#DE177E) - rosa shocking de Schiaparelli, arte y moda en diálogo constante.'
    },
    usageTips: {
      en: ['Haute couture', 'Art galleries', 'Designer fashion'],
      pt: ['Alta costura', 'Galerias de arte', 'Design de autor'],
      es: ['Alta costura', 'Galerías de arte', 'Diseño de autor']
    },
    psychology: {
      en: 'Symbolizes avant-garde, limitless creativity.',
      pt: 'Simboliza vanguarda, criatividade sem limites.',
      es: 'Simboliza vanguardia, creatividad sin límites.'
    }
  },
  '230': {
    description: {
      en: 'Soft Pink (#EBA4C4) - soft ballerina pink, grace in pastel form.',
      pt: 'Rosa Suave (#EBA4C4) - rosa bailarina suave, graça em forma pastel.',
      es: 'Rosa Suave (#EBA4C4) - rosa bailarina suave, gracia en forma pastel.'
    },
    usageTips: {
      en: ['Ballet and dance', 'Romantic fashion', 'Beauty products'],
      pt: ['Ballet e dança', 'Moda romântica', 'Produtos de beleza'],
      es: ['Ballet y danza', 'Moda romántica', 'Productos de belleza']
    },
    psychology: {
      en: 'Suggests grace, femininity and romantic delicacy.',
      pt: 'Sugere graça, feminilidade e delicadeza romântica.',
      es: 'Sugiere gracia, feminidad y delicadeza romántica.'
    }
  },
  
  // ROXOS E VIOLETAS
  'Violet': {
    description: {
      en: 'Violet (#3B2D80) - mystery and majesty united, violet is the color of dreamers.',
      pt: 'Violeta (#3B2D80) - mistério e majestade unidos, violeta é a cor dos sonhadores.',
      es: 'Violeta (#3B2D80) - misterio y majestad unidos, violeta es el color de los soñadores.'
    },
    usageTips: {
      en: ['Spirituality', 'Premium products', 'Innovative technology'],
      pt: ['Espiritualidade', 'Produtos premium', 'Tecnologia inovadora'],
      es: ['Espiritualidad', 'Productos premium', 'Tecnología innovadora']
    },
    psychology: {
      en: 'Evokes mystery, intuition and transformation.',
      pt: 'Evoca mistério, intuição e transformação.',
      es: 'Evoca misterio, intuición y transformación.'
    }
  },
  'Purple': {
    description: {
      en: 'Purple (#AA4B94) - royal purple, the color that dressed emperors and inspires leaders.',
      pt: 'Púrpura (#AA4B94) - púrpura real, a cor que vestiu imperadores e inspira líderes.',
      es: 'Púrpura (#AA4B94) - púrpura real, el color que vistió emperadores e inspira líderes.'
    },
    usageTips: {
      en: ['Luxury branding', 'Premium education', 'Exclusive services'],
      pt: ['Branding de luxo', 'Educação premium', 'Serviços exclusivos'],
      es: ['Branding de lujo', 'Educación premium', 'Servicios exclusivos']
    },
    psychology: {
      en: 'Conveys wisdom, nobility and vision.',
      pt: 'Transmite sabedoria, nobreza e visão.',
      es: 'Transmite sabiduría, nobleza y visión.'
    }
  },
  '2562': {
    description: {
      en: 'Lavender (#CEA0C4) - soft like Provence fields, aromatic serenity.',
      pt: 'Lavanda (#CEA0C4) - suave como campos da Provence, serenidade aromática.',
      es: 'Lavanda (#CEA0C4) - suave como campos de Provenza, serenidad aromática.'
    },
    usageTips: {
      en: ['Aromatherapy', 'Relaxing products', 'Spa and wellness'],
      pt: ['Aromaterapia', 'Produtos relaxantes', 'Spa e bem-estar'],
      es: ['Aromaterapia', 'Productos relajantes', 'Spa y bienestar']
    },
    psychology: {
      en: 'Suggests calm, balance and inner peace.',
      pt: 'Sugere calma, equilíbrio e paz interior.',
      es: 'Sugiere calma, equilibrio y paz interior.'
    }
  },
  '2563': {
    description: {
      en: 'Lilac (#BC8AB9) - dreamy lilac, between pink and purple, charming ambiguity.',
      pt: 'Lilás (#BC8AB9) - lilás sonhador, entre o rosa e o roxo, ambiguidade encantadora.',
      es: 'Lila (#BC8AB9) - lila soñador, entre el rosa y el morado, ambigüedad encantadora.'
    },
    usageTips: {
      en: ['Feminine products', 'Kids and babies', 'Romantic design'],
      pt: ['Produtos femininos', 'Crianças e bebês', 'Design romântico'],
      es: ['Productos femeninos', 'Niños y bebés', 'Diseño romántico']
    },
    psychology: {
      en: 'Evokes imagination, gentleness and romanticism.',
      pt: 'Evoca imaginação, gentileza e romantismo.',
      es: 'Evoca imaginación, gentileza y romanticismo.'
    }
  },
  '2582': {
    description: {
      en: 'Amethyst (#9E5C9B) - polished amethyst, mineral luxury translated into visual experience.',
      pt: 'Ametista (#9E5C9B) - ametista polida, luxo mineral traduzido em experiência visual.',
      es: 'Amatista (#9E5C9B) - amatista pulida, lujo mineral traducido en experiencia visual.'
    },
    usageTips: {
      en: ['Jewelry', 'Premium cosmetics', 'Special packaging'],
      pt: ['Joalheria', 'Cosméticos premium', 'Embalagens especiais'],
      es: ['Joyería', 'Cosméticos premium', 'Embalajes especiales']
    },
    psychology: {
      en: 'Communicates rarity, value and sophistication.',
      pt: 'Comunica raridade, valor e sofisticação.',
      es: 'Comunica rareza, valor y sofisticación.'
    }
  },
  '2587': {
    description: {
      en: 'Deep Violet (#6B3E9B) - deep violet like twilight sky, contemplative and profound.',
      pt: 'Violeta Profundo (#6B3E9B) - violeta profundo como o céu no crepúsculo, contemplativo e profundo.',
      es: 'Violeta Profundo (#6B3E9B) - violeta profundo como el cielo al crepúsculo, contemplativo y profundo.'
    },
    usageTips: {
      en: ['Meditation and yoga', 'Books and literature', 'Contemplative art'],
      pt: ['Meditação e yoga', 'Livros e literatura', 'Arte contemplativa'],
      es: ['Meditación y yoga', 'Libros y literatura', 'Arte contemplativa']
    },
    psychology: {
      en: 'Inspires introspection, wisdom and spirituality.',
      pt: 'Inspira introspecção, sabedoria e espiritualidade.',
      es: 'Inspira introspección, sabiduría y espiritualidad.'
    }
  },
  '2593': {
    description: {
      en: 'Vibrant Purple (#8F408C) - vibrant purple, power and passion in chromatic harmony.',
      pt: 'Púrpura Vibrante (#8F408C) - púrpura vibrante, poder e paixão em harmonia cromática.',
      es: 'Púrpura Vibrante (#8F408C) - púrpura vibrante, poder y pasión en armonía cromática.'
    },
    usageTips: {
      en: ['Special events', 'Premium brands', 'Impactful design'],
      pt: ['Eventos especiais', 'Marcas premium', 'Design impactante'],
      es: ['Eventos especiales', 'Marcas premium', 'Diseño impactante']
    },
    psychology: {
      en: 'Expresses ambition, creativity and leadership.',
      pt: 'Expressa ambição, criatividade e liderança.',
      es: 'Expresa ambición, creatividad y liderazgo.'
    }
  },
  '2597': {
    description: 'Roxo profundo como vinho do Porto, complexidade em cada nuance.',
    usageTips: ['Vinhos e destilados', 'Clubes privados', 'Arte e cultura'],
    psychology: 'Sugere profundidade, mistério e sofisticação.'
  },
  '2607': {
    description: 'Beringela madura, natureza e sofisticação em união perfeita.',
    usageTips: ['Gastronomia gourmet', 'Moda inverno', 'Interiores elegantes'],
    psychology: 'Evoca riqueza natural, elegância e maturidade.'
  },
  '2617': {
    description: 'Ameixa escura, doçura contida em profundidade enigmática.',
    usageTips: ['Chocolates finos', 'Moda de luxo', 'Perfumaria'],
    psychology: 'Transmite sensualidade, mistério e refinamento.'
  },
  '2627': {
    description: 'Violeta noturno, a cor das estrelas distantes e sonhos profundos.',
    usageTips: ['Astronomia e ciência', 'Produtos noturnos', 'Tech futurista'],
    psychology: 'Inspira curiosidade, exploração e imaginação.'
  },
  
  // AZUIS
  'Blue': {
    description: {
      en: 'Infinite as sky and sea, blue is trust in chromatic form.',
      pt: 'Infinito como céu e mar, azul é confiança em forma cromática.',
      es: 'Infinito como cielo y mar, azul es confianza en forma cromática.'
    },
    usageTips: {
      en: ['Corporate', 'Technology', 'Health and wellness'],
      pt: ['Corporativo', 'Tecnologia', 'Saúde e bem-estar'],
      es: ['Corporativo', 'Tecnología', 'Salud y bienestar']
    },
    psychology: {
      en: 'Conveys trust, stability and professionalism.',
      pt: 'Transmite confiança, estabilidade e profissionalismo.',
      es: 'Transmite confianza, estabilidad y profesionalismo.'
    }
  },
  'Process Blue': {
    description: {
      en: 'Pure Cyan (#008BC6) - the technical base of CMYK chromatic reproduction, technological and precise blue.',
      pt: 'Cyan puro (#008BC6) - a base técnica da reprodução cromática CMYK, azul tecnológico e preciso.',
      es: 'Cian puro (#008BC6) - la base técnica de la reproducción cromática CMYK, azul tecnológico y preciso.'
    },
    usageTips: {
      en: ['Professional graphic design', 'High-quality CMYK printing', 'Technical and scientific signage'],
      pt: ['Design gráfico profissional', 'Impressão CMYK de alta qualidade', 'Sinalização técnica e científica'],
      es: ['Diseño gráfico profesional', 'Impresión CMYK de alta calidad', 'Señalización técnica y científica']
    },
    psychology: {
      en: 'Communicates technical precision, objective clarity and professional reliability.',
      pt: 'Comunica precisão técnica, clareza objetiva e confiabilidade profissional.',
      es: 'Comunica precisión técnica, claridad objetiva y confiabilidad profesional.'
    }
  },
  'Reflex Blue': {
    description: {
      en: 'Reflex Blue (#09387B) - the bluest blue, intensity that defines the very concept of blue.',
      pt: 'Reflex Blue (#09387B) - o azul mais azul, intensidade que define o próprio conceito de azul.',
      es: 'Reflex Blue (#09387B) - el azul más azul, intensidad que define el concepto mismo de azul.'
    },
    usageTips: {
      en: ['Corporate identity', 'Official documents', 'Uniforms'],
      pt: ['Identidade corporativa', 'Documentos oficiais', 'Uniformes'],
      es: ['Identidad corporativa', 'Documentos oficiales', 'Uniformes']
    },
    psychology: {
      en: 'Evokes authority, tradition and credibility.',
      pt: 'Evoca autoridade, tradição e credibilidade.',
      es: 'Evoca autoridad, tradición y credibilidad.'
    }
  },
  '279': {
    description: 'Azul céu de verão, otimismo em sua expressão mais refrescante.',
    usageTips: ['Viagens e turismo', 'Produtos de verão', 'Branding positivo'],
    psychology: 'Sugere liberdade, possibilidades e frescor.'
  },
  '280': {
    description: 'Azul marinho clássico, elegância atemporal que nunca decepciona.',
    usageTips: ['Moda clássica', 'Náutico', 'Corporativo tradicional'],
    psychology: 'Transmite seriedade, confiabilidade e tradição.'
  },
  '281': {
    description: 'Navy profundo como o oceano à meia-noite, mistério aquático.',
    usageTips: ['Luxo masculino', 'Esportes náuticos', 'Uniformes premium'],
    psychology: 'Evoca profundidade, estabilidade e força silenciosa.'
  },
  '282': {
    description: 'Azul noturno, quase preto, sofisticação em sua forma mais discreta.',
    usageTips: ['Moda formal', 'Tecnologia premium', 'Design minimalista'],
    psychology: 'Comunica elegância, discrição e poder.'
  },
  '283': {
    description: 'Azul bebê sereno, calma que acalenta e reconforta.',
    usageTips: ['Produtos infantis', 'Healthcare', 'Bem-estar'],
    psychology: 'Sugere paz, proteção e cuidado.'
  },
  '284': {
    description: 'Azul piscina tropical, convite irresistível para mergulhar.',
    usageTips: ['Resorts e spas', 'Produtos de limpeza', 'Verão e praia'],
    psychology: 'Evoca refrescância, limpeza e pureza.'
  },
  '285': {
    description: 'Azul corporate moderno, LinkedIn em forma de Pantone.',
    usageTips: ['Tech companies', 'Finanças', 'Consultoria'],
    psychology: 'Transmite inovação, confiança e profissionalismo.'
  },
  '286': {
    description: {
      en: 'Royal Blue (#00488E) - deep royal blue, democratic nobility and excellence accessible to all.',
      pt: 'Royal Blue (#00488E) - azul real profundo, nobreza democrática e excelência acessível a todos.',
      es: 'Azul Real (#00488E) - azul real profundo, nobleza democrática y excelencia accesible para todos.'
    },
    usageTips: {
      en: ['Sports and teams', 'Corporate events', 'Solid institutional branding'],
      pt: ['Esportes e equipes', 'Eventos corporativos', 'Branding institucional sólido'],
      es: ['Deportes y equipos', 'Eventos corporativos', 'Branding institucional sólido']
    },
    psychology: {
      en: 'Communicates excellence, pride, achievement and team spirit.',
      pt: 'Comunica excelência, orgulho, conquista e espírito de equipe.',
      es: 'Comunica excelencia, orgullo, logro y espíritu de equipo.'
    }
  },
  '287': {
    description: {
      en: 'Intense Cobalt (#004485) - hypnotic blue with mesmerizing depth.',
      pt: 'Cobalto Intenso (#004485) - azul que hipnotiza com sua profundidade.',
      es: 'Cobalto Intenso (#004485) - azul que hipnotiza con su profundidad.'
    },
    usageTips: {
      en: ['Art and design', 'Premium ceramics', 'Statement fashion'],
      pt: ['Arte e design', 'Cerâmica premium', 'Moda statement'],
      es: ['Arte y diseño', 'Cerámica premium', 'Moda statement']
    },
    psychology: {
      en: 'Expresses intensity, passion and creativity.',
      pt: 'Expressa intensidade, paixão e criatividade.',
      es: 'Expresa intensidad, pasión y creatividad.'
    }
  },
  '288': {
    description: {
      en: 'Presidential Blue, serene authority that inspires respect.',
      pt: 'Azul presidente, autoridade serena que inspira respeito.',
      es: 'Azul presidencial, autoridad serena que inspira respeto.'
    },
    usageTips: {
      en: ['Government and institutions', 'Banks', 'Insurance companies'],
      pt: ['Governo e instituições', 'Bancos', 'Seguradoras'],
      es: ['Gobierno e instituciones', 'Bancos', 'Aseguradoras']
    },
    psychology: {
      en: 'Evokes leadership, integrity and stability.',
      pt: 'Evoca liderança, integridade e estabilidade.',
      es: 'Evoca liderazgo, integridad y estabilidad.'
    }
  },
  '289': {
    description: {
      en: 'Midnight Blue, elegance emerging from darkness.',
      pt: 'Midnight blue, elegância que emerge da escuridão.',
      es: 'Azul medianoche, elegancia que emerge de la oscuridad.'
    },
    usageTips: {
      en: ['Evening events', 'Gala fashion', 'Luxury automobiles'],
      pt: ['Eventos noturnos', 'Moda de gala', 'Automóveis de luxo'],
      es: ['Eventos nocturnos', 'Moda de gala', 'Automóviles de lujo']
    },
    psychology: {
      en: 'Suggests sophistication, exclusivity and mystery.',
      pt: 'Sugere sofisticação, exclusividade e mistério.',
      es: 'Sugiere sofisticación, exclusividad y misterio.'
    }
  },
  '290': {
    description: {
      en: 'Crystalline ice blue, mineral purity in liquid state.',
      pt: 'Azul gelo cristalino, pureza mineral em estado líquido.',
      es: 'Azul hielo cristalino, pureza mineral en estado líquido.'
    },
    usageTips: {
      en: ['Water and beverages', 'Cleaning products', 'Clean technology'],
      pt: ['Água e bebidas', 'Produtos de limpeza', 'Tecnologia clean'],
      es: ['Agua y bebidas', 'Productos de limpieza', 'Tecnología limpia']
    },
    psychology: {
      en: 'Conveys purity, freshness and transparency.',
      pt: 'Transmite pureza, frescor e transparência.',
      es: 'Transmite pureza, frescura y transparencia.'
    }
  },
  '291': {
    description: {
      en: 'Sky Blue (#92CEEA) - soft sky blue, freedom and endless possibilities.',
      pt: 'Azul Céu (#92CEEA) - azul céu suave, liberdade e possibilidades infinitas.',
      es: 'Azul Cielo (#92CEEA) - azul cielo suave, libertad y posibilidades infinitas.'
    },
    usageTips: {
      en: ['Travel and tourism', 'Summer collections', 'Wellness brands'],
      pt: ['Viagens e turismo', 'Coleções de verão', 'Marcas wellness'],
      es: ['Viajes y turismo', 'Colecciones de verano', 'Marcas wellness']
    },
    psychology: {
      en: 'Evokes freedom, serenity and optimistic outlook.',
      pt: 'Evoca liberdade, serenidade e perspectiva otimista.',
      es: 'Evoca libertad, serenidad y perspectiva optimista.'
    }
  },
  '300': {
    description: {
      en: 'Cerulean Blue (#006DB4) - brilliant cerulean, the blue Pantone crowned millennium color.',
      pt: 'Azul Cerulean (#006DB4) - cerulean brilhante, o azul que Pantone coroou cor do milênio.',
      es: 'Azul Cerulean (#006DB4) - cerulean brillante, el azul que Pantone coronó color del milenio.'
    },
    usageTips: {
      en: ['Contemporary design', 'Tech and innovation', 'Casual fashion'],
      pt: ['Design contemporâneo', 'Tech e inovação', 'Moda casual'],
      es: ['Diseño contemporáneo', 'Tech e innovación', 'Moda casual']
    },
    psychology: {
      en: 'Communicates optimism, modernity and future vision.',
      pt: 'Comunica otimismo, modernidade e visão de futuro.',
      es: 'Comunica optimismo, modernidad y visión de futuro.'
    }
  },
  '301': {
    description: {
      en: 'Petrol Blue (#005389) - sophisticated petrol blue, refined industrial depth.',
      pt: 'Azul Petróleo (#005389) - azul petróleo sofisticado, profundidade industrial refinada.',
      es: 'Azul Petróleo (#005389) - azul petróleo sofisticado, profundidad industrial refinada.'
    },
    usageTips: {
      en: ['Industry and engineering', 'Menswear', 'Automotive design'],
      pt: ['Indústria e engenharia', 'Moda masculina', 'Design automotivo'],
      es: ['Industria e ingeniería', 'Moda masculina', 'Diseño automotriz']
    },
    psychology: {
      en: 'Evokes strength, reliability and competence.',
      pt: 'Evoca força, confiabilidade e competência.',
      es: 'Evoca fuerza, confiabilidad y competencia.'
    }
  },
  '305': {
    description: {
      en: 'Aqua Splash (#60C7E3) - vibrant aqua, tropical ocean energy.',
      pt: 'Aqua Vibrante (#60C7E3) - aqua vibrante, energia do oceano tropical.',
      es: 'Aqua Vibrante (#60C7E3) - aqua vibrante, energía del océano tropical.'
    },
    usageTips: {
      en: ['Beach resorts', 'Water sports', 'Summer branding'],
      pt: ['Resorts de praia', 'Esportes aquáticos', 'Branding de verão'],
      es: ['Resorts de playa', 'Deportes acuáticos', 'Branding de verano']
    },
    psychology: {
      en: 'Communicates refreshment, vitality and tropical joy.',
      pt: 'Comunica refrescamento, vitalidade e alegria tropical.',
      es: 'Comunica refrescamiento, vitalidad y alegría tropical.'
    }
  },
  '310': {
    description: {
      en: 'Turquoise (#7DCCDD) - serene turquoise, balance of sea and sky.',
      pt: 'Turquesa (#7DCCDD) - turquesa serena, equilíbrio entre mar e céu.',
      es: 'Turquesa (#7DCCDD) - turquesa serena, equilibrio entre mar y cielo.'
    },
    usageTips: {
      en: ['Spa and wellness', 'Coastal brands', 'Mindfulness products'],
      pt: ['Spa e wellness', 'Marcas costeiras', 'Produtos mindfulness'],
      es: ['Spa y wellness', 'Marcas costeras', 'Productos mindfulness']
    },
    psychology: {
      en: 'Suggests tranquility, balance and emotional healing.',
      pt: 'Sugere tranquilidade, equilíbrio e cura emocional.',
      es: 'Sugiere tranquilidad, equilibrio y curación emocional.'
    }
  },
  '302': {
    description: 'Teal profundo, onde azul encontra verde em mistério aquático.',
    usageTips: ['Decoração de interiores', 'Moda inverno', 'Design premium'],
    psychology: 'Sugere equilíbrio, sofisticação e unicidade.'
  },
  '3005': {
    description: 'Azure vibrante, digitalização do próprio conceito de azul.',
    usageTips: ['UI/UX design', 'Apps e software', 'Startups tech'],
    psychology: 'Transmite inovação, acessibilidade e modernidade.'
  },
  '3015': {
    description: 'Azul oceano Atlântico, vastidão contida em matiz único.',
    usageTips: ['Turismo costeiro', 'Frutos do mar', 'Esportes aquáticos'],
    psychology: 'Evoca aventura, liberdade e conexão com natureza.'
  },
  
  // VERDES
  'Green': {
    description: {
      en: 'Green (#00A17C) - nature distilled into color, green is life in its essence.',
      pt: 'Verde (#00A17C) - natureza destilada em cor, verde é vida em sua essência.',
      es: 'Verde (#00A17C) - naturaleza destilada en color, verde es vida en su esencia.'
    },
    usageTips: {
      en: ['Sustainability', 'Health and organics', 'Finance'],
      pt: ['Sustentabilidade', 'Saúde e orgânicos', 'Finanças'],
      es: ['Sostenibilidad', 'Salud y orgánicos', 'Finanzas']
    },
    psychology: {
      en: 'Conveys growth, harmony and renewal.',
      pt: 'Transmite crescimento, harmonia e renovação.',
      es: 'Transmite crecimiento, armonía y renovación.'
    }
  },
  '347': {
    description: {
      en: 'Flag Green (#009954) - vibrant flag green, nature at its most alive.',
      pt: 'Verde Bandeira (#009954) - verde bandeira vibrante, natureza em seu estado mais vivo.',
      es: 'Verde Bandera (#009954) - verde bandera vibrante, naturaleza en su estado más vivo.'
    },
    usageTips: {
      en: ['Environment', 'Agriculture', 'Natural products'],
      pt: ['Meio ambiente', 'Agricultura', 'Produtos naturais'],
      es: ['Medio ambiente', 'Agricultura', 'Productos naturales']
    },
    psychology: {
      en: 'Communicates vitality, freshness and ecological awareness.',
      pt: 'Comunica vitalidade, frescor e consciência ecológica.',
      es: 'Comunica vitalidad, frescura y conciencia ecológica.'
    }
  },
  '348': {
    description: {
      en: 'Forest Green (#008648) - dense forest green, mystery of virgin forest in pigment.',
      pt: 'Verde Floresta (#008648) - verde floresta densa, mistério da mata virgem em pigmento.',
      es: 'Verde Bosque (#008648) - verde bosque denso, misterio del bosque virgen en pigmento.'
    },
    usageTips: {
      en: ['Ecotourism', 'Forest products', 'Organic design'],
      pt: ['Ecoturismo', 'Produtos florestais', 'Design orgânico'],
      es: ['Ecoturismo', 'Productos forestales', 'Diseño orgánico']
    },
    psychology: {
      en: 'Evokes mystery, depth and ancestral connection.',
      pt: 'Evoca mistério, profundidade e conexão ancestral.',
      es: 'Evoca misterio, profundidad y conexión ancestral.'
    }
  },
  '349': {
    description: {
      en: 'Evergreen Pine (#156E40) - perennial pine green, stability that crosses seasons.',
      pt: 'Verde Pinheiro (#156E40) - verde pinheiro perene, estabilidade que atravessa estações.',
      es: 'Verde Pino (#156E40) - verde pino perenne, estabilidad que atraviesa estaciones.'
    },
    usageTips: {
      en: ['Christmas and holidays', 'Outdoor and camping', 'Tradition'],
      pt: ['Natal e festas', 'Outdoors e camping', 'Tradição'],
      es: ['Navidad y fiestas', 'Outdoor y camping', 'Tradición']
    },
    psychology: {
      en: 'Suggests permanence, tradition and resilience.',
      pt: 'Sugere permanência, tradição e resistência.',
      es: 'Sugiere permanencia, tradición y resistencia.'
    }
  },
  '350': {
    description: {
      en: 'Moss Green (#305337) - soft moss green, nature in its most contemplative form.',
      pt: 'Verde Musgo (#305337) - verde musgo suave, natureza em sua forma mais contemplativa.',
      es: 'Verde Musgo (#305337) - verde musgo suave, naturaleza en su forma más contemplativa.'
    },
    usageTips: {
      en: ['Gardens and landscaping', 'Wellness', 'Natural design'],
      pt: ['Jardins e paisagismo', 'Wellness', 'Design natural'],
      es: ['Jardines y paisajismo', 'Wellness', 'Diseño natural']
    },
    psychology: {
      en: 'Conveys calm, contemplation and natural peace.',
      pt: 'Transmite calma, contemplação e paz natural.',
      es: 'Transmite calma, contemplación y paz natural.'
    }
  },
  '351': {
    description: {
      en: 'Mint Green (#AFD3AF) - refreshing mint, freshness that awakens the senses.',
      pt: 'Verde Menta (#AFD3AF) - verde menta refrescante, frescor que desperta os sentidos.',
      es: 'Verde Menta (#AFD3AF) - verde menta refrescante, frescura que despierta los sentidos.'
    },
    usageTips: {
      en: ['Hygiene products', 'Gums and candies', 'Clean design'],
      pt: ['Produtos de higiene', 'Chicletes e balas', 'Design clean'],
      es: ['Productos de higiene', 'Chicles y caramelos', 'Diseño limpio']
    },
    psychology: {
      en: 'Communicates cleanliness, freshness and vitality.',
      pt: 'Comunica limpeza, frescor e vitalidade.',
      es: 'Comunica limpieza, frescura y vitalidad.'
    }
  },
  '352': {
    description: {
      en: 'Seafoam (#A3CFA9) - delicate seafoam, where sea and earth meet softly.',
      pt: 'Seafoam (#A3CFA9) - seafoam delicado, onde mar e terra se encontram suavemente.',
      es: 'Espuma de Mar (#A3CFA9) - espuma de mar delicada, donde mar y tierra se encuentran suavemente.'
    },
    usageTips: {
      en: ['Spa and relaxation', 'Coastal decoration', 'Resort fashion'],
      pt: ['Spa e relaxamento', 'Decoração costeira', 'Moda resort'],
      es: ['Spa y relajación', 'Decoración costera', 'Moda resort']
    },
    psychology: {
      en: 'Evokes serenity, balance and refreshment.',
      pt: 'Evoca serenidade, equilíbrio e refrescância.',
      es: 'Evoca serenidad, equilibrio y refrescancia.'
    }
  },
  '353': {
    description: {
      en: 'Aqua Green (#9DCDA3) - crystalline aqua green, purity of mountain spring.',
      pt: 'Verde Água (#9DCDA3) - verde água cristalino, pureza de nascente de montanha.',
      es: 'Verde Agua (#9DCDA3) - verde agua cristalino, pureza de manantial de montaña.'
    },
    usageTips: {
      en: ['Mineral water', 'Skincare', 'Premium products'],
      pt: ['Água mineral', 'Skincare', 'Produtos premium'],
      es: ['Agua mineral', 'Skincare', 'Productos premium']
    },
    psychology: {
      en: 'Suggests purity, rejuvenation and clarity.',
      pt: 'Sugere pureza, rejuvenescimento e clareza.',
      es: 'Sugiere pureza, rejuvenecimiento y claridad.'
    }
  },
  '354': {
    description: {
      en: 'Lime Green (#1BA445) - energetic lime green, visual citrus that awakens.',
      pt: 'Verde Limão (#1BA445) - verde limão energético, citrus visual que desperta.',
      es: 'Verde Limón (#1BA445) - verde limón energético, cítrico visual que despierta.'
    },
    usageTips: {
      en: ['Energy drinks', 'Sports', 'Youth design'],
      pt: ['Bebidas energéticas', 'Esportes', 'Design jovem'],
      es: ['Bebidas energéticas', 'Deportes', 'Diseño joven']
    },
    psychology: {
      en: 'Conveys energy, vitality and enthusiasm.',
      pt: 'Transmite energia, vitalidade e entusiasmo.',
      es: 'Transmite energía, vitalidad y entusiasmo.'
    }
  },
  '355': {
    description: {
      en: 'Kelly Green (#009F40) - Irish kelly green, luck and tradition in vibrant green.',
      pt: 'Kelly Green (#009F40) - kelly green irlandês, sorte e tradição em verde vibrante.',
      es: 'Kelly Green (#009F40) - kelly green irlandés, suerte y tradición en verde vibrante.'
    },
    usageTips: {
      en: ['Irish culture', 'Sports', 'Natural products'],
      pt: ['Cultura irlandesa', 'Esportes', 'Produtos naturais'],
      es: ['Cultura irlandesa', 'Deportes', 'Productos naturales']
    },
    psychology: {
      en: 'Communicates luck, prosperity and joy.',
      pt: 'Comunica sorte, prosperidade e alegria.',
      es: 'Comunica suerte, prosperidad y alegría.'
    }
  },
  '356': {
    description: {
      en: 'Emerald Green (#00813A) - deep emerald green, rare jewel translated into color.',
      pt: 'Verde Esmeralda (#00813A) - verde esmeralda profundo, joia rara traduzida em cor.',
      es: 'Verde Esmeralda (#00813A) - verde esmeralda profundo, joya rara traducida en color.'
    },
    usageTips: {
      en: ['Jewelry', 'Luxury fashion', 'Sophisticated interiors'],
      pt: ['Joalheria', 'Moda de luxo', 'Interiores sofisticados'],
      es: ['Joyería', 'Moda de lujo', 'Interiores sofisticados']
    },
    psychology: {
      en: 'Evokes wealth, luxury and mystery.',
      pt: 'Evoca riqueza, luxo e mistério.',
      es: 'Evoca riqueza, lujo y misterio.'
    }
  },
  '357': {
    description: {
      en: 'Bottle Green (#2C5932) - classic bottle green, elegance that aged with time.',
      pt: 'Verde Garrafa (#2C5932) - verde garrafa clássico, elegância que amadureceu com o tempo.',
      es: 'Verde Botella (#2C5932) - verde botella clásico, elegancia que maduró con el tiempo.'
    },
    usageTips: {
      en: ['Wine and spirits', 'Classic fashion', 'Vintage design'],
      pt: ['Vinhos e destilados', 'Moda clássica', 'Design vintage'],
      es: ['Vinos y destilados', 'Moda clásica', 'Diseño vintage']
    },
    psychology: {
      en: 'Suggests tradition, maturity and refinement.',
      pt: 'Sugere tradição, maturidade e refinamento.',
      es: 'Sugiere tradición, madurez y refinamiento.'
    }
  },
  '360': {
    description: {
      en: 'Grass Green (#7AB85D) - fresh grass green, spring meadow vitality.',
      pt: 'Verde Grama (#7AB85D) - verde grama fresco, vitalidade de prado primaveril.',
      es: 'Verde Césped (#7AB85D) - verde césped fresco, vitalidad de prado primaveral.'
    },
    usageTips: {
      en: ['Lawn care', 'Organic food', 'Spring campaigns'],
      pt: ['Cuidados com gramão', 'Alimentos orgânicos', 'Campanhas de primavera'],
      es: ['Cuidado de césped', 'Alimentos orgánicos', 'Campañas de primavera']
    },
    psychology: {
      en: 'Communicates growth, freshness and natural vitality.',
      pt: 'Comunica crescimento, frescor e vitalidade natural.',
      es: 'Comunica crecimiento, frescura y vitalidad natural.'
    }
  },
  '370': {
    description: {
      en: 'Olive Green (#708F21) - rich olive green, Mediterranean heritage in color.',
      pt: 'Verde Oliva (#708F21) - verde oliva rico, herança mediterrânea em cor.',
      es: 'Verde Oliva (#708F21) - verde oliva rico, herencia mediterránea en color.'
    },
    usageTips: {
      en: ['Olive oil brands', 'Mediterranean cuisine', 'Military heritage'],
      pt: ['Marcas de azeite', 'Culinária mediterrânea', 'Herança militar'],
      es: ['Marcas de aceite de oliva', 'Cocina mediterránea', 'Herencia militar']
    },
    psychology: {
      en: 'Suggests earthiness, heritage and enduring strength.',
      pt: 'Sugere terrosidade, herança e força duradoura.',
      es: 'Sugiere terrosidad, herencia y fuerza duradera.'
    }
  },
  
  // MARRONS E BEGES
  'Warm Gray': {
    description: {
      en: 'Warm Gray - welcoming neutral, sophistication that doesn\'t compete for attention.',
      pt: 'Cinza Quente - neutro acolhedor, sofisticação que não compete por atenção.',
      es: 'Gris Cálido - neutral acogedor, sofisticación que no compite por atención.'
    },
    usageTips: {
      en: ['Backgrounds', 'Secondary text', 'Minimalist design'],
      pt: ['Backgrounds', 'Textos secundários', 'Design minimalista'],
      es: ['Fondos', 'Textos secundarios', 'Diseño minimalista']
    },
    psychology: {
      en: 'Conveys balance, neutrality and discreet elegance.',
      pt: 'Transmite equilíbrio, neutralidade e elegância discreta.',
      es: 'Transmite equilibrio, neutralidad y elegancia discreta.'
    }
  },
  'Warm Gray 1': {
    description: {
      en: 'Warm Gray 1 (#DAD4C9) - softest warm neutral, paper white with soul.',
      pt: 'Warm Gray 1 (#DAD4C9) - neutro quente mais suave, branco de papel com alma.',
      es: 'Warm Gray 1 (#DAD4C9) - neutral cálido más suave, blanco papel con alma.'
    },
    usageTips: {
      en: ['Elegant backgrounds', 'Premium stationery', 'Soft contrast'],
      pt: ['Backgrounds elegantes', 'Papelaria premium', 'Contraste suave'],
      es: ['Fondos elegantes', 'Papelería premium', 'Contraste suave']
    },
    psychology: {
      en: 'Suggests warmth, sophistication and subtle refinement.',
      pt: 'Sugere calor, sofisticação e refinamento sutil.',
      es: 'Sugiere calidez, sofisticación y refinamiento sutil.'
    }
  },
  'Warm Gray 2': {
    description: {
      en: 'Warm Gray 2 (#CDC4B8) - soft taupe, natural elegance.',
      pt: 'Warm Gray 2 (#CDC4B8) - taupe suave, elegância natural.',
      es: 'Warm Gray 2 (#CDC4B8) - taupe suave, elegancia natural.'
    },
    usageTips: {
      en: ['Interior design', 'Fashion neutrals', 'Organic branding'],
      pt: ['Design de interiores', 'Neutros de moda', 'Branding orgânico'],
      es: ['Diseño de interiores', 'Neutrales de moda', 'Branding orgánico']
    },
    psychology: {
      en: 'Evokes comfort, naturalness and understated style.',
      pt: 'Evoca conforto, naturalidade e estilo discreto.',
      es: 'Evoca confort, naturalidad y estilo discreto.'
    }
  },
  'Warm Gray 5': {
    description: {
      en: 'Warm Gray 5 (#ABA196) - balanced medium gray, versatile foundation.',
      pt: 'Warm Gray 5 (#ABA196) - cinza médio equilibrado, base versátil.',
      es: 'Warm Gray 5 (#ABA196) - gris medio equilibrado, base versátil.'
    },
    usageTips: {
      en: ['Corporate neutrals', 'UI backgrounds', 'Print media'],
      pt: ['Neutros corporativos', 'Backgrounds de UI', 'Mídia impressa'],
      es: ['Neutrales corporativos', 'Fondos de UI', 'Medios impresos']
    },
    psychology: {
      en: 'Communicates balance, professionalism and reliability.',
      pt: 'Comunica equilíbrio, profissionalismo e confiabilidade.',
      es: 'Comunica equilibrio, profesionalismo y confiabilidad.'
    }
  },
  'Warm Gray 11': {
    description: {
      en: 'Warm Gray 11 (#746961) - deep warm charcoal, grounded sophistication.',
      pt: 'Warm Gray 11 (#746961) - carvão quente profundo, sofisticação enraizada.',
      es: 'Warm Gray 11 (#746961) - carbón cálido profundo, sofisticación arraigada.'
    },
    usageTips: {
      en: ['Text and typography', 'Luxury shadows', 'Architectural details'],
      pt: ['Texto e tipografia', 'Sombras de luxo', 'Detalhes arquitetônicos'],
      es: ['Texto y tipografía', 'Sombras de lujo', 'Detalles arquitectónicos']
    },
    psychology: {
      en: 'Suggests substance, gravitas and refined depth.',
      pt: 'Sugere substância, gravitas e profundidade refinada.',
      es: 'Sugiere sustancia, gravitas y profundidad refinada.'
    }
  },
  'Cool Gray': {
    description: {
      en: 'Cool Gray - modern gray with elegant coolness, technology in color form.',
      pt: 'Cinza Frio - cinza moderno com frieza elegante, tecnologia em forma de cor.',
      es: 'Gris Frío - gris moderno con frialdad elegante, tecnología en forma de color.'
    },
    usageTips: {
      en: ['Tech and gadgets', 'Modern architecture', 'Industrial design'],
      pt: ['Tech e gadgets', 'Arquitetura moderna', 'Design industrial'],
      es: ['Tech y gadgets', 'Arquitectura moderna', 'Diseño industrial']
    },
    psychology: {
      en: 'Communicates modernity, efficiency and sophistication.',
      pt: 'Comunica modernidade, eficiência e sofisticação.',
      es: 'Comunica modernidad, eficiencia y sofisticación.'
    }
  },
  'Cool Gray 1': {
    description: {
      en: 'Cool Gray 1 (#DBDAD4) - lightest cool neutral, cloud white precision.',
      pt: 'Cool Gray 1 (#DBDAD4) - neutro frio mais claro, precisão de branco nuvem.',
      es: 'Cool Gray 1 (#DBDAD4) - neutral frío más claro, precisión de blanco nube.'
    },
    usageTips: {
      en: ['Tech backgrounds', 'Minimal UI', 'Modern interiors'],
      pt: ['Backgrounds tech', 'UI minimal', 'Interiores modernos'],
      es: ['Fondos tech', 'UI minimal', 'Interiores modernos']
    },
    psychology: {
      en: 'Suggests clarity, precision and modern simplicity.',
      pt: 'Sugere clareza, precisão e simplicidade moderna.',
      es: 'Sugiere claridad, precisión y simplicidad moderna.'
    }
  },
  'Cool Gray 5': {
    description: {
      en: 'Cool Gray 5 (#B1B2B0) - mid-tone cool gray, industrial elegance.',
      pt: 'Cool Gray 5 (#B1B2B0) - cinza frio médio, elegância industrial.',
      es: 'Cool Gray 5 (#B1B2B0) - gris frío medio, elegancia industrial.'
    },
    usageTips: {
      en: ['Product design', 'Automotive', 'Technology brands'],
      pt: ['Design de produto', 'Automotivo', 'Marcas de tecnologia'],
      es: ['Diseño de producto', 'Automotriz', 'Marcas de tecnología']
    },
    psychology: {
      en: 'Evokes efficiency, modernity and sleek design.',
      pt: 'Evoca eficiência, modernidade e design elegante.',
      es: 'Evoca eficiencia, modernidad y diseño elegante.'
    }
  },
  'Cool Gray 11': {
    description: {
      en: 'Cool Gray 11 (#555E5F) - deepest cool gray, steel sophistication.',
      pt: 'Cool Gray 11 (#555E5F) - cinza frio mais profundo, sofisticação de aço.',
      es: 'Cool Gray 11 (#555E5F) - gris frío más profundo, sofisticación de acero.'
    },
    usageTips: {
      en: ['Heavy typography', 'Tech interfaces', 'Industrial applications'],
      pt: ['Tipografia pesada', 'Interfaces tech', 'Aplicações industriais'],
      es: ['Tipografía pesada', 'Interfaces tech', 'Aplicaciones industriales']
    },
    psychology: {
      en: 'Communicates strength, precision and modern authority.',
      pt: 'Comunica força, precisão e autoridade moderna.',
      es: 'Comunica fuerza, precisión y autoridad moderna.'
    }
  },
  'Black': {
    description: {
      en: 'Black (#3C332A) - absence of light, presence of elegance. The ultimate powerful neutral.',
      pt: 'Preto (#3C332A) - ausência de luz, presença de elegância. O definitivo neutro poderoso.',
      es: 'Negro (#3C332A) - ausencia de luz, presencia de elegancia. El definitivo neutral poderoso.'
    },
    usageTips: {
      en: ['Luxury and premium', 'Typography', 'Timeless fashion'],
      pt: ['Luxo e premium', 'Tipografia', 'Moda atemporal'],
      es: ['Lujo y premium', 'Tipografía', 'Moda atemporal']
    },
    psychology: {
      en: 'Evokes power, mystery and absolute sophistication.',
      pt: 'Evoca poder, mistério e sofisticação absoluta.',
      es: 'Evoca poder, misterio y sofisticación absoluta.'
    }
  },
  'Black 2': {
    description: {
      en: 'Warm Black (#3C3427) - black with warmth, sophistication with soul.',
      pt: 'Preto Quente (#3C3427) - preto com calor, sofisticação com alma.',
      es: 'Negro Cálido (#3C3427) - negro con calidez, sofisticación con alma.'
    },
    usageTips: {
      en: ['Editorial design', 'Luxury packaging', 'Premium textiles'],
      pt: ['Design editorial', 'Embalagens de luxo', 'Têxteis premium'],
      es: ['Diseño editorial', 'Embalajes de lujo', 'Textiles premium']
    },
    psychology: {
      en: 'Suggests depth, warmth and refined elegance.',
      pt: 'Sugere profundidade, calor e elegância refinada.',
      es: 'Sugiere profundidad, calidez y elegancia refinada.'
    }
  },
  'Black 3': {
    description: {
      en: 'Forest Black (#292C27) - nature\'s darkest hour, organic sophistication.',
      pt: 'Preto Floresta (#292C27) - a hora mais escura da natureza, sofisticação orgânica.',
      es: 'Negro Bosque (#292C27) - la hora más oscura de la naturaleza, sofisticación orgánica.'
    },
    usageTips: {
      en: ['Outdoor brands', 'Natural products', 'Organic luxury'],
      pt: ['Marcas outdoor', 'Produtos naturais', 'Luxo orgânico'],
      es: ['Marcas outdoor', 'Productos naturales', 'Lujo orgánico']
    },
    psychology: {
      en: 'Evokes grounding, natural depth and authenticity.',
      pt: 'Evoca enraizamento, profundidade natural e autenticidade.',
      es: 'Evoca enraizamiento, profundidad natural y autenticidad.'
    }
  },
  'Black 4': {
    description: {
      en: 'Espresso Black (#392C25) - rich as morning coffee, awakening elegance.',
      pt: 'Preto Espresso (#392C25) - rico como café da manhã, elegância despertadora.',
      es: 'Negro Espresso (#392C25) - rico como café de la mañana, elegancia despertadora.'
    },
    usageTips: {
      en: ['Coffee branding', 'Chocolate', 'Gourmet food'],
      pt: ['Branding de café', 'Chocolate', 'Food gourmet'],
      es: ['Branding de café', 'Chocolate', 'Food gourmet']
    },
    psychology: {
      en: 'Communicates richness, warmth and indulgence.',
      pt: 'Comunica riqueza, calor e indulgência.',
      es: 'Comunica riqueza, calidez e indulgencia.'
    }
  },
  'Black 5': {
    description: {
      en: 'Burgundy Black (#452F33) - wine-dark mystery, luxury in shadow.',
      pt: 'Preto Borgonha (#452F33) - mistério escuro de vinho, luxo na sombra.',
      es: 'Negro Borgoña (#452F33) - misterio oscuro de vino, lujo en la sombra.'
    },
    usageTips: {
      en: ['Wine and spirits', 'Luxury fashion', 'Premium events'],
      pt: ['Vinhos e destilados', 'Moda de luxo', 'Eventos premium'],
      es: ['Vinos y destilados', 'Moda de lujo', 'Eventos premium']
    },
    psychology: {
      en: 'Suggests opulence, mystery and refined taste.',
      pt: 'Sugere opulência, mistério e gosto refinado.',
      es: 'Sugiere opulencia, misterio y gusto refinado.'
    }
  },
  'Black 6': {
    description: {
      en: 'Navy Black (#131F28) - midnight ocean, depth beyond measure.',
      pt: 'Preto Naval (#131F28) - oceano à meia-noite, profundidade além da medida.',
      es: 'Negro Naval (#131F28) - océano a medianoche, profundidad sin medida.'
    },
    usageTips: {
      en: ['Maritime brands', 'Corporate authority', 'Premium menswear'],
      pt: ['Marcas marítimas', 'Autoridade corporativa', 'Moda masculina premium'],
      es: ['Marcas marítimas', 'Autoridad corporativa', 'Moda masculina premium']
    },
    psychology: {
      en: 'Evokes depth, authority and quiet strength.',
      pt: 'Evoca profundidade, autoridade e força silenciosa.',
      es: 'Evoca profundidad, autoridad y fuerza silenciosa.'
    }
  },
  'Black 7': {
    description: {
      en: 'Charcoal Black (#463F38) - artist\'s charcoal, creative darkness.',
      pt: 'Preto Carvão (#463F38) - carvão de artista, escuridão criativa.',
      es: 'Negro Carbón (#463F38) - carbón de artista, oscuridad creativa.'
    },
    usageTips: {
      en: ['Art and design', 'Architecture', 'Urban fashion'],
      pt: ['Arte e design', 'Arquitetura', 'Moda urbana'],
      es: ['Arte y diseño', 'Arquitectura', 'Moda urbana']
    },
    psychology: {
      en: 'Communicates creativity, urban edge and sophistication.',
      pt: 'Comunica criatividade, estilo urbano e sofisticação.',
      es: 'Comunica creatividad, estilo urbano y sofisticación.'
    }
  },
  '412': {
    description: 'Espresso intenso, café em sua forma mais concentrada.',
    usageTips: ['Cafeterias', 'Chocolates', 'Design gourmet'],
    psychology: 'Sugere intensidade, energia e sofisticação.'
  },
  '4625': {
    description: 'Chocolate amargo premium, indulgência para paladares refinados.',
    usageTips: ['Confeitaria de luxo', 'Moda inverno', 'Interiores acolhedores'],
    psychology: 'Transmite conforto, indulgência e calor.'
  },
  '4635': {
    description: 'Caramelo dourado, doçura visual que aquece o olhar.',
    usageTips: ['Sobremesas', 'Moda outono', 'Design acolhedor'],
    psychology: 'Evoca doçura, nostalgia e aconchego.'
  },
  '4645': {
    description: 'Terracota ancestral, terra moldada por mãos artesãs.',
    usageTips: ['Artesanato', 'Decoração rústica', 'Produtos naturais'],
    psychology: 'Comunica autenticidade, tradição e conexão com terra.'
  },
  '4655': {
    description: 'Canela aromática, especiaria traduzida em experiência visual.',
    usageTips: ['Padarias artesanais', 'Outono e inverno', 'Produtos aromáticos'],
    psychology: 'Sugere calor, aconchego e sabores tradicionais.'
  },
  '4665': {
    description: 'Bege areia quente, praia deserta ao pôr do sol.',
    usageTips: ['Resorts de praia', 'Moda natural', 'Cosméticos nude'],
    psychology: 'Transmite relaxamento, naturalidade e paz.'
  },
  '4675': {
    description: 'Nude universal, a cor da pele humana em sua diversidade.',
    usageTips: ['Moda íntima', 'Cosméticos inclusivos', 'Design humano'],
    psychology: 'Evoca humanidade, inclusão e naturalidade.'
  },
  '4685': {
    description: 'Pêssego suave, delicadeza frutada em tom sereno.',
    usageTips: ['Skincare', 'Moda feminina', 'Design delicado'],
    psychology: 'Comunica suavidade, cuidado e feminilidade.'
  },
  '4695': {
    description: 'Salmon rosado, frescor do oceano em matiz acolhedor.',
    usageTips: ['Gastronomia', 'Moda verão', 'Design costeiro'],
    psychology: 'Sugere frescor, vitalidade e elegância natural.'
  },
  '4705': {
    description: 'Rose gold contemporâneo, luxo millennial em forma de cor.',
    usageTips: ['Tech accessories', 'Joalheria moderna', 'Design instagramável'],
    psychology: 'Transmite modernidade, luxo acessível e feminilidade.'
  },
  '4715': {
    description: 'Copper metalizado, industrial encontra artesanal.',
    usageTips: ['Cervejarias artesanais', 'Design industrial', 'Interiores modernos'],
    psychology: 'Evoca autenticidade, craft e qualidade artesanal.'
  },
  '4725': {
    description: 'Bronze antigo, metal que conta histórias de eras passadas.',
    usageTips: ['Museus e história', 'Troféus e prêmios', 'Design clássico'],
    psychology: 'Comunica tradição, conquista e valor duradouro.'
  },
  
  // BRANCOS E OFF-WHITES
  'White': {
    description: 'Pureza absoluta, tela em branco para todas as possibilidades.',
    usageTips: ['Minimalismo', 'Saúde e higiene', 'Espaços negativos'],
    psychology: 'Transmite pureza, clareza e infinitas possibilidades.'
  },
  '7527': {
    description: 'Off-white acolhedor, branco que abraça em vez de ofuscar.',
    usageTips: ['Interiores', 'Papelaria premium', 'Moda clean'],
    psychology: 'Sugere calma, sofisticação e conforto visual.'
  },
  '7528': {
    description: 'Marfim nobre, elegância orgânica em tom atemporal.',
    usageTips: ['Convites de casamento', 'Moda nupcial', 'Design clássico'],
    psychology: 'Evoca elegância, tradição e pureza refinada.'
  },
  '7529': {
    description: 'Creme suave, doçura visual que acolhe sem esforço.',
    usageTips: ['Cosméticos', 'Confeitaria', 'Design feminino'],
    psychology: 'Comunica suavidade, nutrição e cuidado.'
  },
  '7530': {
    description: 'Linho natural, textura traduzida em cor orgânica.',
    usageTips: ['Têxteis naturais', 'Decoração rústica', 'Produtos eco'],
    psychology: 'Transmite naturalidade, sustentabilidade e autenticidade.'
  },
  '7531': {
    description: 'Pérola luminoso, luxo do mar capturado em superfície.',
    usageTips: ['Joalheria', 'Moda de luxo', 'Cosméticos premium'],
    psychology: 'Sugere preciosidade, elegância e refinamento.'
  },
  
  // CINZAS
  '421': {
    description: 'Cinza prata moderno, tecnologia em forma neutra.',
    usageTips: ['Tech products', 'Automóveis', 'Design futurista'],
    psychology: 'Comunica modernidade, inovação e sofisticação.'
  },
  '422': {
    description: 'Cinza médio equilibrado, neutralidade em perfeita harmonia.',
    usageTips: ['Backgrounds', 'UI design', 'Textos secundários'],
    psychology: 'Transmite equilíbrio, profissionalismo e versatilidade.'
  },
  '423': {
    description: 'Cinza grafite sofisticado, carvão refinado em matiz elegante.',
    usageTips: ['Moda masculina', 'Design editorial', 'Arquitetura'],
    psychology: 'Evoca seriedade, estabilidade e força silenciosa.'
  },
  '424': {
    description: 'Cinza tempestade dramático, tensão atmosférica em cor.',
    usageTips: ['Design dramático', 'Fotografia', 'Moda dark'],
    psychology: 'Sugere drama, intensidade e profundidade.'
  },
  '425': {
    description: 'Cinza chumbo industrial, força bruta refinada em matiz.',
    usageTips: ['Indústria', 'Design masculino', 'Arquitetura urbana'],
    psychology: 'Comunica força, durabilidade e solidez.'
  },
  '426': {
    description: 'Antracite profundo, quase preto mas com alma de cinza.',
    usageTips: ['Moda formal', 'Tecnologia premium', 'Design minimalista'],
    psychology: 'Transmite elegância, mistério e sofisticação.'
  },
  '427': {
    description: 'Cinza claro aéreo, névoa matinal em forma de cor.',
    usageTips: ['Backgrounds suaves', 'Design clean', 'Wellness'],
    psychology: 'Evoca leveza, serenidade e abertura.'
  },
  '428': {
    description: 'Prata lunar, reflexo de luar em superfície metálica.',
    usageTips: ['Joalheria', 'Cosméticos', 'Design noturno'],
    psychology: 'Sugere mistério, feminilidade e elegância noturna.'
  },
  '429': {
    description: 'Cinza névoa suave, paisagem onírica em tom silencioso.',
    usageTips: ['Arte e fotografia', 'Design meditativo', 'Wellness'],
    psychology: 'Comunica introspecção, calma e contemplação.'
  },
  '430': {
    description: 'Cinza concreto urbano, arquitetura da cidade em matiz.',
    usageTips: ['Real estate', 'Arquitetura', 'Design urbano'],
    psychology: 'Transmite solidez, modernidade e urbanidade.'
  },
  
  // PRETOS ESPECIAIS (mantidos em seção anterior)
};

// Análises baseadas em faixa de cores (fallback quando não há match Pantone)
const hueBasedAnalysis: ColorAnalysisEntry[] = [
  // Vermelhos (0-15, 345-360)
  {
    hueRange: [0, 15],
    saturationRange: [50, 100],
    lightnessRange: [30, 70],
    analysis: {
      description: {
        en: 'Vibrant red that pulses with vital energy and burning passion.',
        pt: 'Vermelho vibrante que pulsa com energia vital e paixão ardente.',
        es: 'Rojo vibrante que pulsa con energía vital y pasión ardiente.'
      },
      usageTips: {
        en: ['Emphasis in CTAs', 'Food and restaurants', 'Fashion and beauty'],
        pt: ['Destaque em CTAs', 'Alimentação e restaurantes', 'Moda e beleza'],
        es: ['Énfasis en CTAs', 'Alimentación y restaurantes', 'Moda y belleza']
      },
      psychology: {
        en: 'Evokes passion, urgency and vital energy.',
        pt: 'Evoca paixão, urgência e energia vital.',
        es: 'Evoca pasión, urgencia y energía vital.'
      }
    }
  },
  {
    hueRange: [345, 360],
    saturationRange: [50, 100],
    lightnessRange: [30, 70],
    analysis: {
      description: {
        en: 'Deep crimson with notes of romance and sophistication.',
        pt: 'Carmesim profundo com notas de romance e sofisticação.',
        es: 'Carmesí profundo con notas de romance y sofisticación.'
      },
      usageTips: {
        en: ['Luxury and premium', 'Valentine\'s and romance', 'Wines and gastronomy'],
        pt: ['Luxo e premium', 'Valentines e romance', 'Vinhos e gastronomia'],
        es: ['Lujo y premium', 'San Valentín y romance', 'Vinos y gastronomía']
      },
      psychology: {
        en: 'Conveys romance, power and desire.',
        pt: 'Transmite romance, poder e desejo.',
        es: 'Transmite romance, poder y deseo.'
      }
    }
  },
  // Laranjas (15-45)
  {
    hueRange: [15, 45],
    saturationRange: [50, 100],
    lightnessRange: [40, 80],
    analysis: {
      description: {
        en: 'Energetic orange that radiates warmth and contagious enthusiasm.',
        pt: 'Laranja energético que irradia calor e entusiasmo contagiante.',
        es: 'Naranja energético que irradia calor y entusiasmo contagioso.'
      },
      usageTips: {
        en: ['Sports and fitness', 'Food and beverages', 'Promotional marketing'],
        pt: ['Esportes e fitness', 'Alimentação e bebidas', 'Marketing promocional'],
        es: ['Deportes y fitness', 'Alimentación y bebidas', 'Marketing promocional']
      },
      psychology: {
        en: 'Stimulates creativity, enthusiasm and socialization.',
        pt: 'Estimula criatividade, entusiasmo e socialização.',
        es: 'Estimula creatividad, entusiasmo y socialización.'
      }
    }
  },
  // Amarelos (45-75)
  {
    hueRange: [45, 75],
    saturationRange: [50, 100],
    lightnessRange: [50, 90],
    analysis: {
      description: {
        en: 'Luminous yellow that captures the essence of sun and optimism.',
        pt: 'Amarelo luminoso que captura a essência do sol e otimismo.',
        es: 'Amarillo luminoso que captura la esencia del sol y optimismo.'
      },
      usageTips: {
        en: ['Visual emphasis', 'Children\'s products', 'Signage'],
        pt: ['Destaque visual', 'Produtos infantis', 'Sinalização'],
        es: ['Énfasis visual', 'Productos infantiles', 'Señalización']
      },
      psychology: {
        en: 'Inspires joy, creativity and mental clarity.',
        pt: 'Inspira alegria, criatividade e clareza mental.',
        es: 'Inspira alegría, creatividad y claridad mental.'
      }
    }
  },
  // Verde-amarelados (75-105)
  {
    hueRange: [75, 105],
    saturationRange: [30, 100],
    lightnessRange: [30, 70],
    analysis: {
      description: {
        en: 'Vibrant lime green with youthful energy and natural freshness.',
        pt: 'Verde-limão vibrante com energia jovem e frescor natural.',
        es: 'Verde lima vibrante con energía juvenil y frescura natural.'
      },
      usageTips: {
        en: ['Natural products', 'Green technology', 'Youthful design'],
        pt: ['Produtos naturais', 'Tecnologia verde', 'Design jovem'],
        es: ['Productos naturales', 'Tecnología verde', 'Diseño joven']
      },
      psychology: {
        en: 'Communicates freshness, innovation and vitality.',
        pt: 'Comunica frescor, inovação e vitalidade.',
        es: 'Comunica frescura, innovación y vitalidad.'
      }
    }
  },
  // Verdes (105-165)
  {
    hueRange: [105, 165],
    saturationRange: [30, 100],
    lightnessRange: [25, 75],
    analysis: {
      description: {
        en: 'Harmonious green that connects with nature and growth.',
        pt: 'Verde harmonioso que conecta com a natureza e crescimento.',
        es: 'Verde armonioso que conecta con la naturaleza y crecimiento.'
      },
      usageTips: {
        en: ['Sustainability', 'Health and wellness', 'Finance and growth'],
        pt: ['Sustentabilidade', 'Saúde e bem-estar', 'Finanças e crescimento'],
        es: ['Sostenibilidad', 'Salud y bienestar', 'Finanzas y crecimiento']
      },
      psychology: {
        en: 'Evokes balance, renewal and prosperity.',
        pt: 'Evoca equilíbrio, renovação e prosperidade.',
        es: 'Evoca equilibrio, renovación y prosperidad.'
      }
    }
  },
  // Cianos (165-195)
  {
    hueRange: [165, 195],
    saturationRange: [30, 100],
    lightnessRange: [30, 70],
    analysis: {
      description: {
        en: 'Refreshing cyan that evokes crystalline waters and clarity.',
        pt: 'Ciano refrescante que evoca águas cristalinas e clareza.',
        es: 'Cian refrescante que evoca aguas cristalinas y claridad.'
      },
      usageTips: {
        en: ['Technology', 'Cleaning products', 'Spas and wellness'],
        pt: ['Tecnologia', 'Produtos de limpeza', 'Spas e wellness'],
        es: ['Tecnología', 'Productos de limpieza', 'Spas y wellness']
      },
      psychology: {
        en: 'Conveys clarity, freshness and innovation.',
        pt: 'Transmite clareza, frescor e inovação.',
        es: 'Transmite claridad, frescura e innovación.'
      }
    }
  },
  // Azuis (195-255)
  {
    hueRange: [195, 255],
    saturationRange: [30, 100],
    lightnessRange: [25, 75],
    analysis: {
      description: {
        en: 'Reliable blue that inspires security and professionalism.',
        pt: 'Azul confiável que inspira segurança e profissionalismo.',
        es: 'Azul confiable que inspira seguridad y profesionalismo.'
      },
      usageTips: {
        en: ['Corporate and finance', 'Technology', 'Healthcare'],
        pt: ['Corporativo e finanças', 'Tecnologia', 'Healthcare'],
        es: ['Corporativo y finanzas', 'Tecnología', 'Healthcare']
      },
      psychology: {
        en: 'Evokes trust, stability and competence.',
        pt: 'Evoca confiança, estabilidade e competência.',
        es: 'Evoca confianza, estabilidad y competencia.'
      }
    }
  },
  // Azuis-violeta (255-285)
  {
    hueRange: [255, 285],
    saturationRange: [30, 100],
    lightnessRange: [25, 70],
    analysis: {
      description: {
        en: 'Mysterious indigo that connects intuition and creativity.',
        pt: 'Índigo misterioso que conecta intuição e criatividade.',
        es: 'Índigo misterioso que conecta intuición y creatividad.'
      },
      usageTips: {
        en: ['Spirituality', 'Creativity', 'Premium products'],
        pt: ['Espiritualidade', 'Criatividade', 'Produtos premium'],
        es: ['Espiritualidad', 'Creatividad', 'Productos premium']
      },
      psychology: {
        en: 'Inspires intuition, wisdom and depth.',
        pt: 'Inspira intuição, sabedoria e profundidade.',
        es: 'Inspira intuición, sabiduría y profundidad.'
      }
    }
  },
  // Roxos (285-315)
  {
    hueRange: [285, 315],
    saturationRange: [30, 100],
    lightnessRange: [25, 70],
    analysis: {
      description: {
        en: 'Majestic purple that evokes royalty and transformation.',
        pt: 'Roxo majestoso que evoca realeza e transformação.',
        es: 'Púrpura majestuoso que evoca realeza y transformación.'
      },
      usageTips: {
        en: ['Luxury and premium', 'Beauty and cosmetics', 'Spirituality'],
        pt: ['Luxo e premium', 'Beleza e cosméticos', 'Espiritualidade'],
        es: ['Lujo y premium', 'Belleza y cosméticos', 'Espiritualidad']
      },
      psychology: {
        en: 'Communicates nobility, mystery and creativity.',
        pt: 'Comunica nobreza, mistério e criatividade.',
        es: 'Comunica nobleza, misterio y creatividad.'
      }
    }
  },
  // Magentas/Rosas (315-345)
  {
    hueRange: [315, 345],
    saturationRange: [30, 100],
    lightnessRange: [30, 80],
    analysis: {
      description: {
        en: 'Vibrant magenta-pink that expresses confidence and modernity.',
        pt: 'Magenta-rosa vibrante que expressa confiança e modernidade.',
        es: 'Magenta-rosa vibrante que expresa confianza y modernidad.'
      },
      usageTips: {
        en: ['Feminine products', 'Bold cosmetics', 'Contemporary design'],
        pt: ['Produtos femininos', 'Cosméticos bold', 'Design contemporâneo'],
        es: ['Productos femeninos', 'Cosméticos atrevidos', 'Diseño contemporáneo']
      },
      psychology: {
        en: 'Evokes feminine power, individuality and passion.',
        pt: 'Evoca poder feminino, individualidade e paixão.',
        es: 'Evoca poder femenino, individualidad y pasión.'
      }
    }
  },
  // Neutros escuros (qualquer matiz, baixa saturação, baixa luminosidade)
  {
    hueRange: [0, 360],
    saturationRange: [0, 30],
    lightnessRange: [0, 30],
    analysis: {
      description: {
        en: 'Dark neutral that conveys sophistication and timeless elegance.',
        pt: 'Neutro escuro que transmite sofisticação e elegância atemporal.',
        es: 'Neutro oscuro que transmite sofisticación y elegancia atemporal.'
      },
      usageTips: {
        en: ['Luxury and premium', 'Typography', 'Minimalist design'],
        pt: ['Luxo e premium', 'Tipografia', 'Design minimalista'],
        es: ['Lujo y premium', 'Tipografía', 'Diseño minimalista']
      },
      psychology: {
        en: 'Evokes authority, mystery and sophistication.',
        pt: 'Evoca autoridade, mistério e sofisticação.',
        es: 'Evoca autoridad, misterio y sofisticación.'
      }
    }
  },
  // Neutros médios (cinzas)
  {
    hueRange: [0, 360],
    saturationRange: [0, 15],
    lightnessRange: [25, 75],
    analysis: {
      description: {
        en: 'Balanced gray that offers sophisticated neutrality.',
        pt: 'Cinza equilibrado que oferece neutralidade sofisticada.',
        es: 'Gris equilibrado que ofrece neutralidad sofisticada.'
      },
      usageTips: {
        en: ['Backgrounds', 'Secondary texts', 'Minimalist design'],
        pt: ['Backgrounds', 'Textos secundários', 'Design minimalista'],
        es: ['Fondos', 'Textos secundarios', 'Diseño minimalista']
      },
      psychology: {
        en: 'Conveys balance, professionalism and versatility.',
        pt: 'Transmite equilíbrio, profissionalismo e versatilidade.',
        es: 'Transmite equilibrio, profesionalismo y versatilidad.'
      }
    }
  },
  // Neutros claros (off-whites)
  {
    hueRange: [0, 360],
    saturationRange: [0, 20],
    lightnessRange: [75, 100],
    analysis: {
      description: {
        en: 'Serene white that opens space for infinite possibilities.',
        pt: 'Branco sereno que abre espaço para possibilidades infinitas.',
        es: 'Blanco sereno que abre espacio para posibilidades infinitas.'
      },
      usageTips: {
        en: ['Minimalism', 'Negative spaces', 'Clean design'],
        pt: ['Minimalismo', 'Espaços negativos', 'Design clean'],
        es: ['Minimalismo', 'Espacios negativos', 'Diseño limpio']
      },
      psychology: {
        en: 'Suggests purity, clarity and new beginnings.',
        pt: 'Sugere pureza, clareza e novos começos.',
        es: 'Sugiere pureza, claridad y nuevos comienzos.'
      }
    }
  }
];

// Função auxiliar para extrair código Pantone do nome
const extractPantoneCode = (pantoneName: string): string => {
  // Remove prefixos e sufixos comuns
  let code = pantoneName
    .replace(/PANTONE\s*/gi, '')
    .replace(/\s*(C|U|CP|UP|CVU|CVP|CVC|UVC|TCX|TPX|TPG|TN)$/gi, '')
    .replace(/\s*(Coated|Uncoated|Bridge|Solid)$/gi, '')
    .trim();
  
  return code;
};

// Função para converter hex para HSL
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

// Função principal de análise
export const getColorAnalysis = (hex: string, pantoneName?: string): AnalysisResult => {
  // Primeiro, tenta encontrar análise por código Pantone
  if (pantoneName) {
    const code = extractPantoneCode(pantoneName);
    const analysisFromJson = getAnalysisFromLookup(code);
    if (analysisFromJson) {
      return analysisFromJson;
    }
    // Busca parcial no JSON (ex.: "185" em "185 C")
    for (const key of Object.keys(analysisLookupMap)) {
      if (code && (code.includes(key) || key.includes(code))) {
        return analysisLookupMap[key];
      }
    }
    
    // Verifica matches diretos
    if (pantoneAnalysis[code]) {
      return pantoneAnalysis[code];
    }
    
    // Verifica matches parciais (ex: "185" em "185 C")
    for (const key of Object.keys(pantoneAnalysis)) {
      if (code.includes(key) || key.includes(code)) {
        return pantoneAnalysis[key];
      }
    }
  }
  
  // Fallback: análise baseada em HSL
  const hsl = hexToHSL(hex);
  
  // Encontra a análise baseada em faixa de cores
  for (const entry of hueBasedAnalysis) {
    const hueInRange = (hsl.h >= entry.hueRange[0] && hsl.h <= entry.hueRange[1]) ||
                       (entry.hueRange[0] > entry.hueRange[1] && (hsl.h >= entry.hueRange[0] || hsl.h <= entry.hueRange[1]));
    const satInRange = hsl.s >= entry.saturationRange[0] && hsl.s <= entry.saturationRange[1];
    const lightInRange = hsl.l >= entry.lightnessRange[0] && hsl.l <= entry.lightnessRange[1];
    
    if (hueInRange && satInRange && lightInRange) {
      return entry.analysis;
    }
  }
  
  // Fallback final
  return {
    description: {
      en: 'A unique color with its own personality and versatile potential.',
      pt: 'Uma cor única com personalidade própria e potencial versátil.',
      es: 'Un color único con personalidad propia y potencial versátil.'
    },
    usageTips: {
      en: ['Try in different contexts', 'Combine with neutrals', 'Test in print and digital'],
      pt: ['Experimente em diferentes contextos', 'Combine com neutros', 'Teste em impressão e digital'],
      es: ['Pruebe en diferentes contextos', 'Combine con neutros', 'Pruebe en impresión y digital']
    },
    psychology: {
      en: 'Conveys unique characteristics of this specific tonality.',
      pt: 'Transmite características únicas desta tonalidade específica.',
      es: 'Transmite características únicas de esta tonalidad específica.'
    }
  };
};

export default getColorAnalysis;
